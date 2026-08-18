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
  publicationSlug,
  truncateText,
} from '@/lib/seo';

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
  const publications = sortArchiveContent(
    data.publications.filter((item) => (item.locale || 'tr') === 'tr')
  );
  const entries = publications.map((item) => {
    const hasDetail = isContentPublished(item.detailStatus, item.publishedAt);
    return {
      id: item.id,
      title: item.title,
      excerpt:
        (hasDetail && (item.excerpt || truncateText(item.content || ''))) ||
        `${item.publisher || 'Akademik yayın'} tarafından ${item.year} yılında yayımlanan bibliyografik kayıt.`,
      href: hasDetail ? `/yayinlar/${publicationSlug(item)}` : undefined,
      externalUrl: safeHttpUrl(item.url),
      category: item.type || 'Yayın',
      dateLabel: item.year,
      tags: item.publisher ? [item.publisher] : [],
      imageUrl: hasDetail ? item.coverImageUrl : undefined,
      imageAlt: hasDetail ? item.coverImageAlt : undefined,
      featured: item.isFeatured,
    };
  });

  return (
    <SeoPageShell
      data={data}
      currentArchive="/yayinlar"
      title={pageSeo.presentation?.heading || 'Akademik Yayınlar'}
      description={
        pageSeo.presentation?.intro ||
        pageSeo.description ||
        'İslam hukuku, yapay zekâ etiği ve dijital dönüşüm odağındaki akademik çalışmalar.'
      }
      eyebrow={pageSeo.presentation?.eyebrow || 'Yayın arşivi'}
    >
      <StructuredData
        value={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: pageSeo.presentation?.heading || pageSeo.title || 'Akademik Yayınlar',
          description: pageSeo.description,
          url: absoluteUrl('/yayinlar'),
          mainEntity: {
            '@type': 'ItemList',
            numberOfItems: publications.length,
            itemListElement: publications.map((item, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: item.title,
              url: isContentPublished(item.detailStatus, item.publishedAt)
                ? absoluteUrl(`/yayinlar/${publicationSlug(item)}`)
                : safeHttpUrl(item.url),
            })),
          },
        }}
      />
      <StructuredData
        value={buildBreadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Yayınlar', path: '/yayinlar' },
        ])}
      />
      <ContentArchiveExplorer
        items={entries}
        searchPlaceholder="Başlık, yayın türü veya dergi içinde ara…"
        itemLabel="yayın"
        emptyTitle="Henüz yayın kaydı bulunmuyor"
        emptyDescription="Akademik yayınlar eklendikçe bibliyografik kayıtları ve erişilebilir detayları burada yayımlanacak."
      />
    </SeoPageShell>
  );
}
