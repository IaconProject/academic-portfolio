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
      <div className="space-y-8 rounded-2xl border border-[#e2ddcf] bg-[#faf8f4] p-6 text-sm leading-7 text-[#57534e] shadow-sm md:p-9">
        <section>
          <h2 className="font-serif text-xl font-bold text-[#24211e]">
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
          <h2 className="font-serif text-xl font-bold text-[#24211e]">
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
              saat dilimi, yaklaşık ekran sınıfı, kaba cihaz/tarayıcı/işletim
              sistemi türü, sayfada görünür geçirilen süre, ulaşılan kaydırma
              eşiği, dış bağlantının yalnız alan adı, indirilen dosyanın güvenli
              yolu ve uzantısı, başarılı iletişim gönderimi, anonimleştirilmiş
              istemci hata sınıfı, Core Web Vitals değerleri ve edge
              sağlayıcının ürettiği yaklaşık ülke/bölge/şehir bilgisini
              kaydeder. Ziyaretçi ve oturumlar rastgele üretilen kimliklerle
              ölçülür; ham IP adresi, tam User-Agent, form içeriği, hata mesajı
              veya stack trace, dış bağlantının tam adresi ve kesin koordinatlar
              Analytics v2 kayıtlarında saklanmaz.
            </p>
            <p>
              Analitik tercihi veya bölgesel işleme kaydı 180 gün boyunca
              hatırlanır. Ölçüm reddedildiğinde veya izin geri çekildiğinde
              tarayıcıdaki analitik ziyaretçi/oturum
              kimlikleri ve bekleyen event kuyruğu temizlenir. Analitik
              kayıtlarına yalnız yetkili yönetim katmanı erişebilir.
            </p>
            <div className="pt-1">
              <AnalyticsPreferencesControl />
            </div>
            <p>
              Tercih veya bölgesel işleme kaydının süresi dolduğunda güncel
              bölge kuralı yeniden değerlendirilir; gerektiğinde tekrar izin
              istenir ve önceki tarayıcı ziyaretçi kimliği silinerek yenisi
              oluşturulur. Ham analitik
              eventleri ve bunlara bağlı etkin olmayan oturum/ziyaretçi
              kayıtları son aktiviteye göre en fazla {retentionDays} gün, kimlik
              içermeyen veri kalitesi kayıtları 730 gün ve yalnız günlük toplu
              sayılardan oluşan anonim özetler 1.825 gün saklanır.
            </p>
          </div>
        </section>
        <section>
          <h2 className="font-serif text-xl font-bold text-[#24211e]">
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
