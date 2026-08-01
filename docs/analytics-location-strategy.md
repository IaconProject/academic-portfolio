# Analytics v2 konum stratejisi

## Amaç ve değişmez gizlilik sınırı

Analytics v2, tarayıcının cihaz konumu API'sini çağırmaz ve konum izni
istemez. Ham IP adresi, IP enlem/boylamı ve cihaz koordinatı analitik event,
oturum veya rapor tablolarına yazılmaz. Çalışma zamanında harici bir IP
konumlandırma API'sine istek gönderilmez.

## Sunucu tarafı sinyal sırası

1. Vercel'in güvenilir `x-vercel-ip-country` başlığı ülkeyi belirler.
2. Türkiye için `x-vercel-ip-country-region`, ISO 3166-2 il kodundan yerel il
   adına çevrilir. Şehir sinyali varsa yaklaşık şehir olarak korunur.
3. İl kodu ve şehir yoksa Vercel'in public IP için ürettiği enlem/boylam,
   yalnız istek belleğinde Türkiye il referanslarıyla karşılaştırılır. Sonuç
   sadece il olarak ve `low` güven düzeyiyle saklanır; ilçe üretilmez.
4. Bu sinyaller de yoksa yalnız ülke saklanır. Sistem bir il uydurmaz.

Öncelik sırası, açık il/şehir sinyalini ağ merkez noktası tahminine üstün
tutar. Açık bir oturum sonraki istekte daha güçlü sinyal alırsa sunucu yalnız
eksik konum alanlarını zenginleştirir; geçmişte toplanmış daha güçlü kayıtları
düşürmez.

## Güven anlamı

- `medium`: barındırma katmanının public IP için verdiği ISO bölge veya şehir.
- `low`: IP ağ merkez noktasından yerel il referanslarıyla tahmin veya yalnız
  ülke.
- `high`: yalnız geçmiş sürümlerdeki cihaz destekli kayıtlar; yeni istemci bu
  veriyi toplamaz.

## Bilinen sınır

Mobil operatörlerde CGNAT ve merkezi internet çıkışları, aynı public IP'yi
birden fazla ildeki kullanıcıya kullandırabilir. Bu durumda IP tabanlı hiçbir
yöntem fiziksel ili garanti edemez. Yönetim ekranı bu nedenle düşük güvenli
tahmini ve “il belirlenemedi” durumunu açıkça gösterir.

## Gelecekteki güvenli genişleme

Daha yüksek kapsama gerekirse yalnız sunucuda çalışan, düzenli güncellenen ve
lisansı doğrulanmış bir çevrimdışı GeoIP veritabanı eklenebilir. Sonuç;
subdivision güven skoru, accuracy radius ve mobil ağ bilgisiyle filtrelenmeli;
büyük doğruluk yarıçapında il kaydedilmemelidir. Çalışma zamanında ziyaretçi
IP'sini üçüncü taraf konum API'lerine göndermek kabul edilmez.
