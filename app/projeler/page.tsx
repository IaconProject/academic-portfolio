import Link from 'next/link';
import { Calendar, Tag } from 'lucide-react';
import { getSeoExperienceData } from '@/lib/seo-repository';
import { buildSeoMetadata } from '@/lib/seo-metadata';
import {
  absoluteUrl,
  findSeoPage,
  isContentPublished,
  projectSlug,
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
    routeKey: 'projects:index',
    path: '/projeler',
    title: 'Araştırma Projeleri',
  });
}

export default async function ProjectsArchivePage() {
  const data = await getSeoExperienceData();
  const pageSeo = findSeoPage(data.seoPages, 'projects:index');
  return (
    <SeoPageShell
      data={data}
      title="Araştırma Projeleri"
      description={pageSeo.description}
      eyebrow="Proje Arşivi"
    >
      <StructuredData
        value={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: pageSeo.title || 'Araştırma Projeleri',
          description: pageSeo.description,
          url: absoluteUrl('/projeler'),
        }}
      />
      <div className="grid gap-5">
        {data.projects.filter((item) => (item.locale || 'tr') === 'tr').map((item) => {
          const hasDetail = isContentPublished(
            item.detailStatus,
            item.publishedAt
          );
          return (
            <article
              key={item.id}
              className="rounded-2xl border border-[#e2ddcf] bg-[#faf8f4] p-6 shadow-sm"
            >
              <div className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#78716c]">
                <Calendar className="h-3.5 w-3.5" />
                {item.years}
              </div>
              <h2 className="font-serif text-xl font-bold">
                {hasDetail ? (
                  <Link
                    href={`/projeler/${projectSlug(item)}`}
                    className="hover:underline"
                  >
                    {item.title}
                  </Link>
                ) : (
                  item.title
                )}
              </h2>
              <p className="mt-3 text-sm leading-7 text-[#57534e]">
                {item.excerpt || item.description}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-md border border-[#ded9cb] bg-[#efece4] px-2.5 py-1 text-[11px] font-semibold"
                  >
                    <Tag className="h-3 w-3" />
                    {tag}
                  </span>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </SeoPageShell>
  );
}
