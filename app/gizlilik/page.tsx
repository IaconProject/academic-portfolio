import { getSeoExperienceData } from '@/lib/seo-repository';
import { buildSeoMetadata } from '@/lib/seo-metadata';
import { SeoPageShell } from '@/components/public/SeoPageShell';

export const revalidate = 300;

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
            İsteğe bağlı analitik
          </h2>
          <p className="mt-3">
            Google Analytics ve site içi ziyaret ölçümü yalnız analitik izni
            verildiğinde etkinleşir. İzin verilmediğinde analitik depolama kapalı
            kalır. Alt kısımdaki “Çerez tercihleri” bağlantısından kararınızı
            değiştirebilirsiniz.
          </p>
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
