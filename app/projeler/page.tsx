import { ContentArchiveExplorer } from '@/components/public/ContentArchiveExplorer';
import { SeoPageShell, StructuredData } from '@/components/public/SeoPageShell';
import { sortArchiveContent } from '@/lib/content-presentation';
import { buildSeoMetadata } from '@/lib/seo-metadata';
import { getSeoExperienceData } from '@/lib/seo-repository';
import { safeHttpUrl } from '@/lib/url-security';
import {
  absoluteUrl,
  buildBreadcrumbJsonLd,
  findSeoPage,
  isContentPublished,
  projectSlug,
  truncateText,
} from '@/lib/seo';

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
  const projects = sortArchiveContent(
    data.projects.filter((item) => (item.locale || 'tr') === 'tr')
  );
  const entries = projects.map((item) => {
    const hasDetail = isContentPublished(item.detailStatus, item.publishedAt);
    return {
      id: item.id,
      title: item.title,
      excerpt: hasDetail
        ? item.excerpt || item.description || truncateText(item.content || '')
        : item.description,
      href: hasDetail ? `/projeler/${projectSlug(item)}` : undefined,
      externalUrl: safeHttpUrl(item.url),
      category: item.tags[0] || 'Araştırma projesi',
      dateLabel: item.years,
      tags: item.tags,
      imageUrl: hasDetail ? item.coverImageUrl : undefined,
      imageAlt: hasDetail ? item.coverImageAlt : undefined,
      featured: item.isFeatured,
    };
  });

  return (
    <SeoPageShell
      data={data}
      currentArchive="/projeler"
      title={pageSeo.presentation?.heading || 'Araştırma Projeleri'}
      description={pageSeo.presentation?.intro || pageSeo.description}
      eyebrow={pageSeo.presentation?.eyebrow || 'Proje arşivi'}
    >
      <StructuredData
        value={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: pageSeo.presentation?.heading || pageSeo.title || 'Araştırma Projeleri',
          description: pageSeo.description,
          url: absoluteUrl('/projeler'),
          mainEntity: {
            '@type': 'ItemList',
            numberOfItems: projects.length,
            itemListElement: projects.map((item, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: item.title,
              url: isContentPublished(item.detailStatus, item.publishedAt)
                ? absoluteUrl(`/projeler/${projectSlug(item)}`)
                : safeHttpUrl(item.url),
            })),
          },
        }}
      />
      <StructuredData
        value={buildBreadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Projeler', path: '/projeler' },
        ])}
      />
      <ContentArchiveExplorer
        items={entries}
        searchPlaceholder="Proje, konu veya etiket içinde ara…"
        itemLabel="proje"
        emptyTitle="Henüz proje kaydı bulunmuyor"
        emptyDescription="Devam eden ve tamamlanan araştırma projeleri, ilgili yayınlarıyla birlikte burada arşivlenecek."
      />
    </SeoPageShell>
  );
}
