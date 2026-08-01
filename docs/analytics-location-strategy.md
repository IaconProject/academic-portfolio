# Analytics v2 konum stratejisi

## Amaç ve gizlilik sınırı

Analytics v2, tarayıcının cihaz konumu API'sini çağırmaz ve konum izni
istemez. Ham IP adresi, IP enlem/boylamı ve cihaz koordinatı analitik event,
oturum veya rapor tablolarına yazılmaz. Public IP yalnız trusted Next.js route
üzerinde geçici olarak işlenir ve azaltılmış konum/ağ sonucu saklanır.

## Sunucu tarafı sinyal sırası

1. Vercel'in güvenilir `x-vercel-ip-country` başlığı ülkeyi belirler.
2. Türkiye için `x-vercel-ip-country-region`, ISO 3166-2 il kodundan yerel il
   adına çevrilir. Şehir sinyali varsa yaklaşık şehir olarak korunur.
3. İl kodu ve şehir yoksa Vercel'in public IP için ürettiği enlem/boylam,
   yalnız istek belleğinde Türkiye il referanslarıyla karşılaştırılır. Sonuç
   sadece il olarak ve `low` güven düzeyiyle saklanır; ilçe üretilmez.
4. Next.js collector, Vercel'in platform sınırında yeniden yazdığı
   `x-vercel-forwarded-for` / `x-forwarded-for` başlığından public IP'yi yalnız
   istek ömrü için çıkarır. Lokal, özel, dokümantasyon ve multicast adresleri
   sağlayıcıya göndermez.
5. HMAC-SHA256 cache sonucu yoksa ip-api sunucu tarafından 2 saniyelik timeout
   ve dakikada en fazla 40 sorgu sınırıyla çağrılır. Ücretsiz katman HTTP,
   `IP_API_KEY` tanımlı Pro katmanı HTTPS kullanır.
6. ip-api sonucu ülke, il/bölge, şehir/ilçe, ISP, ağ kuruluşu, ASN ve
   mobil/proxy/hosting sinyallerine allowlist ile indirgenir. Türkiye il adları
   yerel plaka/isim sözlüğüyle normalleştirilir; koordinat yalnız eksik il
   sinyalini düşük güvenle tamamlamak için bellekte kullanılır.
7. Vercel ve ip-api ülkesi çelişirse Vercel ülkesi/coğrafyası korunur; ip-api
   yalnız ağ sınıflarını tamamlar. Bu sinyaller de yoksa yalnız ülke saklanır.
   Sistem bir il veya ISP uydurmaz.

Öncelik sırası, ip-api'nin açık il/şehir sinyalini ağ merkez noktası tahminine
üstün tutar. Açık bir oturum sonraki istekte daha güçlü sinyal alırsa sunucu
konum alanlarını zenginleştirir; geçmiş cihaz-konumu kayıtları yeni sistem
tarafından oluşturulmaz. Mobil cache en fazla 2, sabit ağ cache'i en fazla 24
saat yaşar.

## Güven anlamı

- `medium`: barındırma katmanının public IP için verdiği ISO bölge veya şehir.
- `low`: IP ağ merkez noktasından yerel il referanslarıyla tahmin veya yalnız
  ülke.
- `high`: yalnız geçmiş sürümlerdeki cihaz destekli kayıtlar; yeni istemci bu
  veriyi toplamaz ve cihaz konumu RPC'si kaldırılmıştır.

## Bilinen sınır

Mobil operatörlerde CGNAT ve merkezi internet çıkışları, aynı public IP'yi
birden fazla ildeki kullanıcıya kullandırabilir. Bu durumda IP tabanlı hiçbir
yöntem fiziksel ili garanti edemez. Yönetim ekranı bu nedenle düşük güvenli
tahmini ve “il belirlenemedi” durumunu açıkça gösterir.

## Operasyonel görünürlük

`analytics_geo_provider_health` yalnız ip-api istek, başarı, hata, timeout,
rate-limit, son HTTP durumu ve süre sayaçlarını tutar. IP, koordinat, HMAC cache
anahtarı veya ziyaretçi kimliği bu tabloya girmez. Admin sağlık kartı taşıma
protokolünü, aktif cache sayısını ve son sağlayıcı başarısını gösterir.

Daha yüksek kapsama gerekirse yalnız sunucuda çalışan, düzenli güncellenen ve
lisansı doğrulanmış bir çevrimdışı GeoIP veritabanı veya accuracy-radius sunan
ikinci bir sağlayıcı eklenebilir. Büyük doğruluk yarıçapında il kaydedilmemeli;
ilçe bilgisi her zaman yaklaşık public IP ağı konumu olarak sunulmalıdır.
