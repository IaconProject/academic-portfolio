# Visitor Analytics v2

Bu paket, eski `visitor_sessions.pages` JSONB akışının yerine idempotent,
append-only bir event collector getirir. Legacy tablolar migration sırasında
silinmez; yalnız anonim erişimleri kapatılır.

## Production ön koşulları

Vercel Production ortamında aşağıdaki değerler zorunludur:

```env
SITE_URL=https://www.muhammedakan.com
SUPABASE_SERVICE_ROLE_KEY=...
ANALYTICS_HASH_SECRET=...
ANALYTICS_V2_INGEST=true
ANALYTICS_RETENTION_DAYS=425
CRON_SECRET=...
# İsteğe bağlı: false yapılırsa ip-api zenginleştirmesi kapanır.
ANALYTICS_IP_GEO_ENABLED=true
# İsteğe bağlı: tanımlanırsa ip-api Pro HTTPS uç noktası kullanılır.
IP_API_KEY=...
```

`ANALYTICS_HASH_SECRET` ayrı ve server-only olmalıdır:

```bash
openssl rand -base64 48
```

Bu değer değiştirilirse eski ve yeni pseudonim visitor kimlikleri birbirine
bağlanmaz. Değer hiçbir zaman `NEXT_PUBLIC_` adıyla tanımlanmamalı veya Git
deposuna yazılmamalıdır.

`ANALYTICS_V2_INGEST` fail-closed çalışır: yalnız tam olarak `true` olduğunda
collector ve tarayıcı runtime'ı açılır. Preview deployment'larında değer ne
olursa olsun site içi analytics ve GA4 başlatılmaz. `analytics_ingest_health`
tablosu ve service-role erişimi doğrulanmadan da tarayıcı runtime'ı kapalı
kalır; migration sonradan uygulandığında beş saniyelik readiness cache'i
sonrasında otomatik açılır.

## Migration

1. Supabase yedeği alın.
2. Aşağıdaki migration dosyalarını bu sırayla SQL Editor'de çalıştırın:
   - `supabase/migrations/20260730190500_visitor_analytics_v2.sql`
   - `supabase/migrations/20260730193000_visitor_analytics_reporting.sql`
   - `supabase/migrations/20260730194500_visitor_analytics_operations.sql`
   - `supabase/migrations/20260801093000_analytics_device_geo.sql`
   - `supabase/migrations/20260801094500_analytics_geo_reporting_index.sql`
   - `supabase/migrations/20260801155538_analytics_technology_admin_delete.sql`
   - `supabase/migrations/20260801163723_analytics_network_geo_enrichment.sql`
   - `supabase/migrations/20260801210247_analytics_ip_geo_network.sql`
   - `supabase/migrations/20260801212029_analytics_geo_provider_health.sql`
   - `supabase/migrations/20260809090000_visitor_interaction_analytics.sql`
3. Vercel environment değerlerini ekleyin.
4. Production deployment oluşturun.
5. Admin panelinde **SEO → Performans ve Entegrasyonlar** bölümündeki
   “Consent sonrasında analitiği etkinleştir” anahtarını açıp kaydedin.
6. Admin tokenıyla sırasıyla `GET /api/analytics/health`,
   `GET /api/analytics/maintenance` ve
   `GET /api/analytics/dashboard?range=30d` yanıtlarını kontrol edin.

Migration'lar eklemelidir ve tekrar çalıştırılabilir. `visitor_sessions` ile
`visitor_logs` kaldırılmaz. Geri alma sırasında
`ANALYTICS_V2_INGEST=false` ayarlanabilir; yeni tablolar silinmemelidir.

## Collector sözleşmesi

İstemci dağıtım kesiminden sonra yalnız `/7` Instagram biyografi bağlantısında,
geçerli işleme dayanağı ve CMS ana anahtarı açıkken
`POST /api/analytics/events` çağırır. Ana sayfa, arama motoru ve blog trafiği
bu kesimden sonra birinci taraf collector'a yazılmaz; kesimden önceki eventler
raporlarda korunur. Batch en fazla 20 event ve 32 KiB'dir.

Kesim anı kodda sabit `2026-08-27T11:40:47.200Z` olarak tutulur. Bu değer,
`main` dağıtımının Vercel Production'da `READY` olduğu andır; yeni bir
dağıtımda değiştirilmemelidir.

Collector:

- event sözleşmesini doğrular;
- kesim anından sonraki canonical `/7` ve `/7/` dışındaki bütün yolları kalıcı
  yazımdan önce filtreler ve kabul edilen yolu `/7` olarak saklar;
- preview ve açık bot trafiğini ana ölçüme almaz;
- geçici IP değerini HMAC rate-limit ve konum önbellek anahtarı üretmek için
  kullanır; ham IP hiçbir tabloya yazılmaz;
- geçerli HMAC önbellek sonucu yoksa ip-api'yi 2 saniyelik timeout ve dakikada
  en fazla 40 sunucu sorgusuyla çağırır; hata veya kota durumunda event yazımı
  mevcut Vercel sinyaliyle devam eder;
- Vercel'in güvenilir edge başlıkları ve ip-api allowlist yanıtından yaklaşık
  ülke/bölge/şehir ile ISP, ağ kuruluşu, ASN ve mobil/proxy/hosting sınıfı; ham
  User-Agent'ı saklamadan kaba cihaz/tarayıcı/işletim sistemi sınıfı üretir;
- raw visitor kimliğini HMAC ile pseudonimleştirir;
- yalnız Supabase service role üzerinden atomik ingest RPC çağırır;
- tek bir event doğrulamadan geçmezse batchin tamamını reddeder;
- HTTP sözleşme/zaman/consent retlerini payload saklamadan, ayrı bir HMAC
  anahtarında dakikalık sınır uygulayarak sağlık sayaçlarına işler;
- kalıcı yazım başarısızsa `success: true` dönmez.

Raw IP, tam User-Agent ve kesin koordinat Analytics v2 tablolarına yazılmaz.
Sağlayıcının koordinatı yalnız Türkiye il sinyali eksik olduğunda bellekte
yerel il eşleştirmesi için kullanılır ve azaltılmış sonuçtan çıkarılır. Mobil
ağ cache'i 2 saat, diğer ağ cache'i 24 saat geçerlidir. Ücretsiz ip-api uç
noktası HTTPS sunmadığından `IP_API_KEY` yokken server-to-server HTTP kullanılır;
anahtar tanımlandığında Pro HTTPS uç noktasına otomatik geçilir. Ücretsiz plan
yalnız hizmet şartlarının izin verdiği kişisel/non-commercial kullanımda
etkinleştirilmelidir.

## Kimlik ve session kuralları

- Visitor ID yalnız consent sonrasında `crypto.randomUUID()` ile üretilir.
- Session ID 30 dakika hareketsizlikten sonra yenilenir.
- Sunucu aynı visitor ve client session eşleşmesini kalıcı tutar; offline
  batchlerde farklı client sessionlar birleştirilmez.
- Tab ID `sessionStorage` kapsamındadır.
- Her event benzersiz UUID taşır; retry kopya event oluşturmaz.
- Çok sekmeli kuyruk yazımları destekleyen tarayıcılarda Web Locks ile
  sıralanır; retry `Retry-After` ve jitter'lı exponential backoff kullanır.
- Query string içinden yalnız UTM allowlist alanları alınır.
- URL hash değerleri ayrı pageview sayılmaz.
- Uzun bağlantı kesintilerinde ardışık heartbeat'ler beş dakikalık güvenli
  sınıra kadar birleştirilir; kuyruk kapasitesi aşılırsa iletişim, page view,
  indirme ve dış bağlantı eventleri düşük öncelikli sinyallerden önce korunur.

## Faz 2: etkileşim ve deneyim sinyalleri

İzinli `/7` ziyaretlerinde şu tipler katı bir sözleşmeyle toplanır:

- `page_view`: canonical yol ve temizlenmiş sayfa başlığı;
- `heartbeat`: sekme görünürken sınırlı aralıklarla gerçek etkileşim süresi;
- `scroll_depth`: sayfa başına bir kez 25, 50, 75, 90 ve 100 eşikleri;
- `outbound_click`: yalnız hedef alan adı;
- `download`: yalnız güvenli site içi dosya yolu ve izinli uzantı;
- `contact_submit`: yalnız sunucu başarılı yanıt verdikten sonra, form alanları
  olmadan;
- `web_vital`: LCP, CLS, INP, FCP ve TTFB değerleri;
- `client_error`: mesaj, URL ve stack trace olmadan kaba hata sınıfı.

Eventler DOM üzerinde kullanıcı içeriğini okumaz. Hassas query parametreleri,
form değerleri, e-posta adresleri, tam dış URL'ler veya serbest metin
`properties` alanına kabul edilmez.

## Faz 3: raporlama

Raporlar tarayıcının doğrudan Supabase erişimiyle değil, yalnız admin
oturumundan çağrılabilen server API'leriyle sunulur:

- `GET /api/analytics/dashboard`: özet, zaman serisi, sayfalar, edinim,
  teknoloji, coğrafya, eventler, Core Web Vitals ve kalite metrikleri;
- `GET /api/analytics/sessions`: cursor tabanlı oturum ve sayfa yolculuğu
  incelemesi;
- `GET /api/analytics/export`: geçerli filtreleri kullanan, formül
  enjeksiyonuna karşı güvenli CSV dışa aktarımı.

Raporlama uç noktaları kesim öncesi tarihî veriyi eski kapsamıyla korur; kesim
sonrası eventleri yalnız `/7` olarak kabul eder. İstemcinin başka bir yol
göndermesi kesim sonrası kapsamı genişletemez. Tarih aralığı, saat dilimi ve
trafik sınıfı sunucuda doğrulanır. Dashboard sorguları yalnız toplu sonuç
döndürür; oturum görünümü pseudonim kimliği veya ham kişisel veri göstermez.

## Faz 4: veri kalitesi ve yaşam döngüsü

`vercel.json`, her gün 02:15 UTC'de
`GET /api/cron/analytics-maintenance` çağrısını planlar. Vercel bu isteği
`CRON_SECRET` ile yetkilendirir. Bakım işlemi:

- son sekiz günü `Europe/Istanbul` takvimine göre yeniden özetler;
- son 24 saatte geç event, istemci hatası, bot oranı, consent sürümü ve ingest
  sağlığını değerlendirir;
- eventleri varsayılan 425 günlük saklama süresinden sonra sınırlı gruplar
  hâlinde siler;
- boş oturum ve ziyaretçileri güvenli biçimde temizler;
- kalite kayıtlarını 730, kimliksiz günlük özetleri 1.825 gün saklar.
- süresi dolmuş HMAC anahtarlı IP-ağ önbelleklerini sınırlı batch ile siler.

`GET /api/analytics/maintenance` son operasyon durumunu gösterir.
`POST /api/analytics/maintenance` aynı bakım zincirini admin tarafından
manuel çalıştırır. Veritabanı fonksiyonları yalnız `service_role` tarafından
çalıştırılabilir; public, `anon` ve `authenticated` rolleri doğrudan erişemez.

## Operasyon

- CMS analitik anahtarı özel collector ve GA4 için ortak kill-switch'tir.
- Açık sekmeler çalışma durumunu 30 saniyede bir ve focus/online/pageshow
  olaylarında doğrular; doğrulanamayan durum en fazla 90 saniye sonra kapanır.
- Consent geri çekilince visitor/session/tab kimlikleri ve offline kuyruk
  temizlenir.
- Consent değişiklikleri `storage` ve `BroadcastChannel` ile diğer sekmelere
  yayılır; GA4 scripti admin rotalarında veya izin yokken yüklenmez.
- Production `/tmp` veri deposu kullanılmaz.
- Rate-limit anahtarları en fazla 48 saat tutulur ve RPC trafiği sırasında
  sınırlı gruplar halinde temizlenir; trafik olmasa da günlük bakım aynı
  sınırlı temizliği zorunlu olarak uygular.
- `GET /api/analytics/health` yalnız admin oturumuyla erişilir ve `disabled`,
  `idle`, `degraded` veya `healthy` durumunu ingest sayaçlarıyla döndürür.
  Aynı yanıt ip-api istek/başarı/hata/timeout/rate-limit sayaçlarını, etkin
  HMAC cache satırı sayısını ve HTTP/HTTPS taşıma durumunu da bildirir; bu
  operasyonel sayaçlar IP veya ziyaretçi kimliği içermez.
  Son başarılı event 24 saatten eskiyse eski başarı “healthy” sayılmaz ve
  collector yeni event bekleyen `idle` durumuna döner.
- Yönetim ekranı Analytics v2 raporlarını varsayılan görünüm olarak sunar.
  Legacy sekmesi, `visitor_sessions` oturumlarını ve daha eski
  `visitor_logs` sayfa kayıtlarını kaynak işaretli ortak bir okuma modelinde
  birleştirir; bu tarihî arşivdeki kayıtlar silinmez veya `/7` filtresiyle
  gizlenmez. Ham IP ve User-Agent değerleri tarayıcıya gönderilmez.
- `ANALYTICS_RETENTION_DAYS` yalnız 30–3650 aralığında kabul edilir; geçersiz
  değer güvenli 425 günlük varsayılana döner.
- Manuel ve zamanlanmış bakım aynı atomik, server-only RPC zincirini kullanır.
- Cron ve manuel bakım çakışmaları transaction advisory lock ile tek çalışana
  indirilir. Vercel'in `vercel-cron/1.0` çağrısı canonical host redirectinden
  muaf tutulur; route üzerindeki `CRON_SECRET` denetimi değişmez.

## Production doğrulama listesi

1. Collector kill-switch ve consent kapalıyken event isteği çıkmadığını
   doğrulayın.
2. Kesim öncesi tarih aralığında eski toplu/oturum verisinin göründüğünü,
   kesim sonrası ana sayfa ile bir blog yazısının collector'a event yazmadığını,
   ardından `/7` üzerinde `page_view`, görünür `heartbeat` ve scroll
   eşiklerinin tekilleştirildiğini kontrol edin.
3. Aynı event batch'ini yeniden göndererek duplicate sayacının arttığını,
   event toplamının artmadığını doğrulayın.
4. Dashboard toplamlarını seçili aralık için örnek sessionlarla karşılaştırın.
5. CSV'nin yalnız filtrelenmiş kayıtları ve güvenli hücreleri içerdiğini açıp
   kontrol edin.
6. Manuel bakımı çalıştırın; son rollup tarihi ve kalite kaydı yenilenmelidir.
7. Cron çalışmasını Vercel loglarından, collector/rapor hatalarını admin sağlık
   kartından takip edin.
