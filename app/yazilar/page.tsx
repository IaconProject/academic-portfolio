import Link from 'next/link';
import { Calendar, FileText } from 'lucide-react';
import { getSeoExperienceData } from '@/lib/seo-repository';
import { buildSeoMetadata } from '@/lib/seo-metadata';
import { absoluteUrl, findSeoPage, isContentPublished } from '@/lib/seo';
import {
  SeoPageShell,
  StructuredData,
} from '@/components/public/SeoPageShell';

export const revalidate = 300;

export async function generateMetadata() {
  const data = await getSeoExperienceData();
  return buildSeoMetadata({
    data,
    routeKey: 'articles:index',
    path: '/yazilar',
    title: 'Akademik Yazılar ve Araştırma Notları',
  });
}

export default async function ArticlesArchivePage() {
  const data = await getSeoExperienceData();
  const pageSeo = findSeoPage(data.seoPages, 'articles:index');
  const articles = (data.articles || []).filter((item) =>
    item.locale === 'tr' && isContentPublished(item.status, item.publishedAt)
  );
  return (
    <SeoPageShell
      data={data}
      title="Akademik Yazılar ve Araştırma Notları"
      description={pageSeo.description}
      eyebrow="Yazı Arşivi"
    >
      <StructuredData
        value={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: pageSeo.title,
          description: pageSeo.description,
          url: absoluteUrl('/yazilar'),
        }}
      />
      {articles.length ? (
        <div className="grid gap-5">
          {articles.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-[#e2ddcf] bg-[#faf8f4] p-6 shadow-sm"
            >
              <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-[#78716c]">
                <Calendar className="h-3.5 w-3.5" />
                {item.publishedAt
                  ? new Intl.DateTimeFormat('tr-TR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    }).format(new Date(item.publishedAt))
                  : 'Tarih belirtilmedi'}
              </p>
              <h2 className="font-serif text-xl font-bold">
                <Link href={`/yazilar/${item.slug}`} className="hover:underline">
                  {item.title}
                </Link>
              </h2>
              <p className="mt-3 text-sm leading-7 text-[#57534e]">
                {item.excerpt}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#cfc7b6] bg-[#faf8f4] p-10 text-center">
          <FileText className="mx-auto h-8 w-8 text-[#a19b8f]" />
          <h2 className="mt-4 font-serif text-xl font-bold">Yazılar hazırlanıyor</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-[#57534e]">
            İslam hukuku, yapay zekâ etiği, blokzincir ve dijital fıkıh
            alanlarındaki kaynaklı araştırma notları yayınlandıkça burada yer
            alacak.
          </p>
        </div>
      )}
    </SeoPageShell>
  );
}
