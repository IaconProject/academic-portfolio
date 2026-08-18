import Link from 'next/link';
import { BookOpen, Calendar, ExternalLink } from 'lucide-react';
import { getSeoExperienceData } from '@/lib/seo-repository';
import { buildSeoMetadata } from '@/lib/seo-metadata';
import {
  absoluteUrl,
  findSeoPage,
  isContentPublished,
  publicationSlug,
} from '@/lib/seo';
import {
  SeoPageShell,
  StructuredData,
} from '@/components/public/SeoPageShell';

export const revalidate = 300;

export async function generateMetadata() {
  const data = await getSeoExperienceData();
  return buildSeoMetadata({
    data,
    routeKey: 'publications:index',
    path: '/yayinlar',
    title: 'Akademik Yayınlar',
  });
}

export default async function PublicationsArchivePage() {
  const data = await getSeoExperienceData();
  const pageSeo = findSeoPage(data.seoPages, 'publications:index');
  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: pageSeo.title || 'Akademik Yayınlar',
    description: pageSeo.description,
    url: absoluteUrl('/yayinlar'),
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: data.publications.filter((item) => (item.locale || 'tr') === 'tr').map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.title,
        url: isContentPublished(item.detailStatus, item.publishedAt)
          ? absoluteUrl(`/yayinlar/${publicationSlug(item)}`)
          : item.url || undefined,
      })),
    },
  };

  return (
    <SeoPageShell
      data={data}
      title="Akademik Yayınlar"
      description={
        pageSeo.description ||
        'İslam hukuku, yapay zekâ etiği ve dijital dönüşüm odağındaki akademik çalışmalar.'
      }
      eyebrow="Yayın Arşivi"
    >
      <StructuredData value={collectionSchema} />
      <div className="grid gap-5">
        {data.publications.filter((item) => (item.locale || 'tr') === 'tr').map((item) => {
          const hasDetail = isContentPublished(
            item.detailStatus,
            item.publishedAt
          );
          return (
            <article
              key={item.id}
              className="rounded-2xl border border-[#e2ddcf] bg-[#faf8f4] p-6 shadow-sm"
            >
              <div className="mb-3 flex flex-wrap items-center gap-3 text-xs font-semibold text-[#78716c]">
                <span className="rounded-md border border-[#ded9cb] bg-[#efece4] px-2.5 py-1 text-[#2c2825]">
                  {item.type}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {item.year}
                </span>
              </div>
              <h2 className="font-serif text-xl font-bold leading-snug">
                {hasDetail ? (
                  <Link
                    href={`/yayinlar/${publicationSlug(item)}`}
                    className="hover:underline"
                  >
                    {item.title}
                  </Link>
                ) : (
                  item.title
                )}
              </h2>
              {item.publisher && (
                <p className="mt-2 text-sm italic text-[#57534e]">
                  {item.publisher}
                </p>
              )}
              {(item.excerpt || item.content) && (
                <p className="mt-4 text-sm leading-7 text-[#57534e]">
                  {item.excerpt || item.content?.slice(0, 220)}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-4 text-xs font-bold">
                {hasDetail && (
                  <Link
                    href={`/yayinlar/${publicationSlug(item)}`}
                    className="inline-flex items-center gap-1 hover:underline"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    Detayları oku
                  </Link>
                )}
                {item.url && item.url !== '#' && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Yayın kaynağı
                  </a>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </SeoPageShell>
  );
}
