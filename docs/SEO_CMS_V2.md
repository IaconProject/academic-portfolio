# SEO CMS v2 — işletim ve yayınlama kılavuzu

Bu sürüm canonical URL, sayfa metadata’sı, içerik yayın akışı, redirect geçmişi,
SEO denetimi, Search Console/GA4 raporları ve consent yönetimini tek sözleşmede
birleştirir. Yetkili origin yalnız sunucu ortamındaki `SITE_URL` değeridir.

## Güvenli geçiş sırası

1. Supabase projesinin veritabanı yedeğini ve geri yükleme noktasını oluşturun.
2. `supabase/migrations/20260730_seo_cms_v2.sql` migration’ını Supabase SQL
   Editor veya kurulu migration hattıyla uygulayın.
   Ardından robots/sitemap CMS’i ve hedef biyografi ayarları için
   `supabase/migrations/20260816203359_advanced_seo_crawler_controls.sql`
   migration’ını uygulayın.
3. Migration sonrasında mevcut yayın, proje ve `seo_settings` satırlarının
   korunduğunu; `seo_site_settings`, `seo_pages`, `seo_redirects`, `articles`,
   `seo_revisions` ve `seo_audit_runs` tablolarının oluştuğunu doğrulayın.
4. Vercel Production ortam değişkenlerini aşağıdaki sözleşmeye göre tanımlayın.
5. Önce `SEO_CMS_V2=false` ile teknik canonical/noindex sürümünü yayınlayabilir,
   veritabanını doğruladıktan sonra bayrağı `true` yapabilirsiniz.
6. Admin panelinde SEO denetimini çalıştırın; sitemap ve örnek URL’leri
   doğruladıktan sonra Search Console’a sitemap gönderin.

## Zorunlu ortam değişkenleri

```dotenv
SITE_URL=https://www.muhammedakan.com
NEXT_PUBLIC_SITE_URL=https://www.muhammedakan.com
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ADMIN_SESSION_SECRET=...
SEO_CMS_V2=true
```

`SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_SESSION_SECRET`,
`GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` ve diğer sırlar yalnız sunucu ortamında
kalmalıdır. CMS alanlarına, Supabase tablolarına veya tarayıcıya yazılmamalıdır.

## İsteğe bağlı Google bağlantıları

```dotenv
GOOGLE_SERVICE_ACCOUNT_EMAIL=seo-reader@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SEARCH_CONSOLE_PROPERTY=sc-domain:muhammedakan.com
GA4_PROPERTY_ID=...
```

Service account’a Search Console property ve GA4 property üzerinde yalnız
gerekli okuma yetkilerini verin. Sitemap gönderimi kullanılacaksa Search Console
yetkisi ayrıca gerekir. Kimlik bilgileri yokken panel “bağlı değil” görünür;
metadata, sitemap, schema ve içerik yayınlama çalışmaya devam eder.

## Editoryal akış

- Yeni yayın/proje kısa kayıt olarak `none`, detay çalışması olarak `draft`
  durumunda hazırlanabilir.
- Yazı ve indekslenebilir detaylarda yayın öncesinde özgün özet, ana içerik,
  geçerli slug ve görsel kullanılıyorsa alt metin zorunludur.
- `scheduled` içerikte ISO tarih zorunludur. Zamanı gelen içerik otomatik olarak
  halka açık sayfa, sitemap ve RSS kurallarına girer.
- Slug değişikliği eski yol için otomatik 308 kaydı üretir.
- Sayfa metadata değişiklikleri revizyon tablosuna snapshot olarak yazılır ve
  SEO panelinden geri yüklenebilir.
- İngilizce içerik modeli hazırdır; `/en/...` sunum şablonları açılana kadar
  İngilizce kayıtlar yalnız taslak tutulur. Böylece hatalı `hreflang` veya
  Türkçe kök altında İngilizce URL yayınlanmaz.

## Robots, sitemap ve AI arama görünürlüğü

- SEO panelindeki **İndeksleme** sekmesi robots.txt kurallarının gerçek veri
  kaynağıdır. `*`, OAI-SearchBot/ChatGPT-User, PerplexityBot/Perplexity-User ve
  isteğe bağlı GPTBot/Google-Extended grupları birbirinden bağımsız yönetilir.
  Özel bot grupları genel `*` grubunu otomatik devralmadığı için `/api/`
  engeli her özel grupta ayrıca korunur.
- Google AI Overviews ve AI Mode için ayrı bir AI schema veya `llms.txt`
  zorunluluğu yoktur. Googlebot erişimi, indekslenebilir/snippet’e uygun HTML,
  görünür ve doğrulanabilir biyografi metni ile içerikle eşleşen yapılandırılmış
  veri temel sinyallerdir.
- `/llms.txt`, AI ajanları için yardımcı ve deneysel bir canonical kaynak
  dizinidir; HTML sayfalarının veya sitemap’in yerine geçmez ve sıralama garantisi
  olarak değerlendirilmez.
- XML sitemap yalnız `index=true`, sitemap’e dahil, canonical override’ı olmayan
  sistem sayfalarını ve ilgili içerik türü etkinse yayınlanmış detay sayfalarını
  listeler. Global indeksleme veya sitemap yayını kapalıysa boş çıktı üretir.
- Ek sitemap yollarına yalnız 200 dönen, canonical, indekslenebilir site içi
  URL’ler yazılmalıdır. `changefreq` ve `priority` alanları editöre özellikle
  eklenmemiştir; güncellik gerçek `lastmod` değerleriyle aktarılır.

Ana sayfanın editoryal hedefi `Muhammed Akan kimdir` sorgusudur. Title, meta
açıklama, görünür “Muhammed Akan Kimdir?” bölümü ve `ProfilePage → Person`
grafiği aynı gerçek kişi ve aynı biyografi metniyle tutarlı tutulmalıdır. ORCID,
Google Scholar, LinkedIn ve GitHub alanlarına yalnız kişiye ait doğrulanmış profil
URL’leri girilmelidir.

## Analytics ve consent

GA4 yalnız üç koşul birlikte sağlandığında yüklenir:

1. SEO panelinde geçerli Measurement ID vardır.
2. Analitik etkinleştirilmiştir.
3. Ziyaretçi analitik izni vermiştir.

Site içi ziyaret ölçümü de aynı izne bağlıdır. Admin rotaları ölçümlenmez.
Kullanıcı “Çerez tercihleri” düğmesiyle kararını sonradan değiştirebilir.

## Rollback

`SEO_CMS_V2=false`, halka açık veri okuyucusunu eski portfolyo kaynağına
döndürür. Migration eklemelidir; eski `seo_settings` satırı silinmez. Rollback
sırasında yeni tabloları veya içerikleri silmeyin. Kod geri alındıktan sonra veri
korunur ve tekrar etkinleştirilebilir.

## Yayın sonrası kontrol

- `curl -I` ile non-www ve eski Vercel hostunun tek 308 ile `www` origin’e
  gittiğini doğrulayın.
- `/robots.txt`, `/sitemap.xml`, `/feed.xml` ve `/og.png` yanıtlarını kontrol
  edin.
- Admin ve API yanıtlarında `X-Robots-Tag` bulunduğunu doğrulayın.
- Search Console’da sitemap gönderin, birkaç URL için URL Inspection çalıştırın.
- 30/60/90 günlük tıklama, gösterim, CTR, ortalama pozisyon ve Core Web Vitals
  eğilimini SEO paneli ve Search Console üzerinden izleyin.
