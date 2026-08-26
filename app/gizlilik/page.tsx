import { getSeoExperienceData } from '@/lib/seo-repository';
import { buildSeoMetadata } from '@/lib/seo-metadata';
import { SeoPageShell } from '@/components/public/SeoPageShell';
import { AnalyticsPreferencesControl } from '@/components/public/AnalyticsPreferencesControl';

export const revalidate = 300;

function analyticsRetentionDays(): number {
  const configured = Number(process.env.ANALYTICS_RETENTION_DAYS || 425);
  return Number.isSafeInteger(configured) &&
    configured >= 30 &&
    configured <= 3650
    ? configured
    : 425;
}

export async function generateMetadata() {
  const data = await getSeoExperienceData();
  return buildSeoMetadata({
    data,
    routeKey: 'privacy',
    path: '/gizlilik',
    title: 'Gizlilik ve Çerez Tercihleri',
    forceNoIndex: true,
  });
}

export default async function PrivacyPage() {
  const data = await getSeoExperienceData();
  const retentionDays = analyticsRetentionDays();
  return (
    <SeoPageShell
      data={data}
      title="Gizlilik ve Çerez Tercihleri"
      description="Bu sayfa, akademik portfolyoda kullanılan zorunlu ve isteğe bağlı ölçümleme teknolojilerini açıklar."
      eyebrow="Gizlilik"
    >
      <div className="space-y-8 rounded-2xl border border-academic-border bg-academic-surface p-6 text-sm leading-7 text-academic-slate shadow-sm md:p-9">
        <section>
          <h2 className="font-serif text-xl font-bold text-academic-ink">
            Temel çalışma verileri
          </h2>
          <p className="mt-3">
            Site; güvenlik, iletişim formunun çalışması ve ziyaretçi
            tercihlerinin hatırlanması için gerekli teknik verileri işler.
            İletişim formunda gönderilen bilgiler yalnız mesaja yanıt vermek
            amacıyla kullanılır.
          </p>
        </section>
        <section>
          <h2 className="font-serif text-xl font-bold text-academic-ink">
            Blog ölçümü ve e-posta bülteni
          </h2>
          <div className="mt-3 space-y-3">
            <p>
              Blog yazılarında, yukarıdaki analitik tercihinin izin verdiği
              durumda yazı kimliğiyle günlük görüntüleme, 30 saniye veya yüzde
              50 kaydırma eşiğine ulaşan etkileşim, sekme görünürken geçirilen
              toplam okuma saniyesi ve yazı üzerinden başlatılan bülten kaydı
              sayılır. Bu ayrı blog özeti çerez, kalıcı ziyaretçi kimliği, ham
              IP veya tam User-Agent saklamaz. Yeniden gönderilen aynı isteğin
              iki kez sayılmaması için kullanılan rastgele event kimlikleri 48
              saat içinde temizlenir.
            </p>
            <p>
              Bültene katıldığınızda e-posta adresi, rıza metni sürümü, kayıt
              kaynağı, dil ve abonelik durumu işlenir. Kayıt isteğinin kötüye
              kullanımını sınırlamak için IP ve User-Agent yalnız ayrı gizli
              anahtarlarla HMAC-SHA256 özetine dönüştürülür; ham değerler
              veritabanına yazılmaz ve bu özetler en geç 30 gün içinde
              temizlenir. Doğrulama bağlantısı veritabanında yalnız hash olarak
              tutulur, 48 saatte geçersiz olur; 30 gün içinde doğrulanmayan
              bekleyen kayıt silinir.
            </p>
            <p>
              Onay ve bülten e-postaları Resend üzerinden gönderilir. Her
              bültende kişisel abonelikten ayrılma bağlantısı bulunur; ayrılma,
              bounce veya spam şikâyeti sonrasında yeni gönderim yapılmaz.
              Teslimat güvenliği için sağlayıcı e-posta kimliği ve teslim,
              bounce ya da şikâyet durumu en fazla 730 gün saklanır. Açılma ve
              tıklama olaylarının bu sitede kaydı varsayılan olarak kapalıdır.
              E-posta adresi aktif abonelik ve gönderim engeli kaydı sürdükçe
              tutulur; silme talepleri aşağıdaki iletişim kanallarından
              iletilebilir.
            </p>
          </div>
        </section>
        <section>
          <h2 className="font-serif text-xl font-bold text-academic-ink">
            Analitik ölçüm ve bölgesel uygulama
          </h2>
          <div className="mt-3 space-y-3">
            <p>
              Türkiye’den yapılan ziyaretlerde yalnız bu alan adına ait,
              siteler arası takip yapmayan ve site performansı ile hedef kitle
              ölçümüyle sınırlı Analytics v2 çalışır. Bu bölgesel uygulama,
              KVKK Çerez Uygulamaları Hakkında Rehberindeki birinci taraf
              analitik yaklaşımıyla sınırlandırılmıştır. Google Analytics bu
              kapsamda otomatik olarak yüklenmez.
            </p>
            <p>
              Türkiye dışındaki ziyaretlerde site içi Analytics v2 ve Google
              Analytics varsayılan olarak kapalıdır; yalnız açık analitik izni
              sonrasında etkinleşir. Ülke güvenilir biçimde belirlenemezse de
              aynı güvenli varsayılan uygulanır. Reklam depolaması hiçbir
              bölgede açılmaz.
            </p>
            <p>
              Site içi ölçüm; ziyaret edilen canonical sayfa yolu ve başlığı,
              yalnız yönlendiren alan adı, izinli UTM kampanya alanları, dil,
              saat dilimi, yaklaşık ekran sınıfı, cihaz sınıfı ve tarayıcının
              bildirebildiği ölçüde cihaz markası/modeli ile tarayıcı ve
              işletim sistemi adı/sürümü, sayfada görünür geçirilen süre,
              ulaşılan kaydırma
              eşiği, dış bağlantının yalnız alan adı, indirilen dosyanın güvenli
              yolu ve uzantısı, başarılı iletişim gönderimi, anonimleştirilmiş
              istemci hata sınıfı, Core Web Vitals değerleri ve edge
              sağlayıcının ve sunucu tarafındaki IP ağ çözümleme hizmetinin
              ürettiği yaklaşık ülke/bölge/şehir, internet servis sağlayıcısı,
              ağ kuruluşu, ASN ve mobil/sabit ağ sınıfı bilgisini kaydeder.
              Proxy veya hosting ağı sinyali varsa bu durum veri kalitesi için
              işaretlenebilir. Teknoloji bilgisi tam User-Agent veya donanım kimliği
              saklanmadan, sunucu tarafındaki ayrıştırma ve destekleyen
              tarayıcılardaki sınırlı Client Hints alanlarıyla üretilir;
              tarayıcı veya cihazın açıklamadığı model/sürüm “bilinmiyor”
              kalabilir.
            </p>
            <p>
              Site, tarayıcının cihaz konumu API’sini çağırmaz ve ziyaretçiden
              konum izni istemez. Konum, barındırma altyapısının güvenilir edge
              sinyaliyle başlatılır. Takma adlı önbellekte geçerli sonuç yoksa
              public IP adresi yalnız sunucudan ip-api konum/ağ çözümleme
              hizmetine gönderilir. Dönen ülke, bölge, şehir, ISP ve ASN
              alanları güvenli bir allowlist ile azaltılır; Türkiye il adı
              yerel referanslarla normalleştirilir. Bölge veya şehir sinyali
              yoksa sağlayıcının ağ merkez noktası yalnız il düzeyinde, düşük
              güvenli bir tahmin için yerel Türkiye il referanslarıyla
              karşılaştırılabilir. Ham IP ve koordinat bu sitenin veritabanına,
              analitik eventine veya oturumuna yazılmaz. Önbellek anahtarı gizli
              bir anahtarla HMAC-SHA256 biçiminde takma adlandırılır; mobil ağ
              sonuçları en fazla 2 saat, diğer sonuçlar en fazla 24 saat
              önbellekte tutulur. Ücretsiz ip-api katmanı sunucudan HTTP ile,
              ücretli API anahtarı tanımlandığında Pro uç noktası HTTPS ile
              çağrılır; bu çağrı hiçbir zaman ziyaretçinin tarayıcısından
              yapılmaz. Sağlayıcı isteklerinin başarı, hata, timeout, hız
              sınırı ve süre sayaçları, IP veya ziyaretçi kimliği içermeden
              operasyonel sağlık kaydı olarak tutulur. ip-api hizmetinin kendi
              geçici teknik işleme ve saklama koşulları sağlayıcının gizlilik
              politikasına tabidir; ilçe cihaz konumuymuş gibi tahmin edilmez.
            </p>
            <p>
              IP tabanlı sonuç fiziksel konum garantisi vermez. Özellikle mobil
              operatörler çok sayıda kullanıcıyı başka bir ildeki ortak ağ
              çıkışından internete bağlayabilir; bu nedenle bazı ziyaretlerde
              yalnız ülke bilinebilir veya gösterilen il operatör çıkışını
              temsil edebilir. Vercel ve ip-api aynı public ağ çıkışını farklı
              veri kümeleriyle çözümlediğinden sonuç yaklaşık bir ağ konumudur;
              GPS doğruluğu taşımaz. Yeterli sunucu sinyali yoksa sistem yanlış bir
              il üretmek yerine “il belirlenemedi” durumunu korur. Analytics v2
              event ve oturum kayıtları Google Analytics veya Yandex
              Metrica&apos;ya
              aktarılmaz; ip-api yalnız yukarıda açıklanan sunucu tarafı IP ağ
              çözümlemesi için kullanılır.
              Ziyaretçi ve oturumlar rastgele üretilen kimliklerle
              ölçülür; ham IP adresi, tam User-Agent, form içeriği, hata mesajı
              veya stack trace, dış bağlantının tam adresi ve kesin koordinatlar
              Analytics v2 kayıtlarında saklanmaz.
            </p>
            <p>
              Analitik tercihi veya bölgesel işleme kaydı 180 gün boyunca
              hatırlanır. Ölçüm reddedildiğinde veya izin geri çekildiğinde
              tarayıcıdaki analitik ziyaretçi/oturum
              kimlikleri ve bekleyen event kuyruğu temizlenir. Analitik
              kayıtlarına yalnız yetkili yönetim katmanı erişebilir. Yetkili
              yönetici, gerekli olduğunda tek bir oturumu veya açıkça seçilen
              oturumları topluca silebilir; ilişkili eventler de aynı işlemle
              kalıcı olarak kaldırılır ve boş kalan takma adlı ziyaretçi kaydı
              temizlenir.
            </p>
            <div className="pt-1">
              <AnalyticsPreferencesControl />
            </div>
            <p>
              Tercih veya bölgesel işleme kaydının süresi dolduğunda güncel
              bölge kuralı yeniden değerlendirilir; açık analitik izni gereken
              ülkelerde tercih yeniden sorulabilir ve önceki tarayıcı ziyaretçi
              kimliği silinerek yenisi
              oluşturulur. Ham analitik
              eventleri ve bunlara bağlı etkin olmayan oturum/ziyaretçi
              kayıtları son aktiviteye göre en fazla {retentionDays} gün, kimlik
              içermeyen veri kalitesi kayıtları 730 gün ve yalnız günlük toplu
              sayılardan oluşan anonim özetler 1.825 gün saklanır.
            </p>
          </div>
        </section>
        <section>
          <h2 className="font-serif text-xl font-bold text-academic-ink">
            İletişim ve talepler
          </h2>
          <p className="mt-3">
            Verilerinizle ilgili talepler için ana sayfadaki iletişim
            kanallarını kullanabilirsiniz. Bu metin, ölçümleme etkinleştirilmeden
            önce site sahibinin güncel uygulamalarına göre gözden geçirilmelidir.
          </p>
        </section>
      </div>
    </SeoPageShell>
  );
}
