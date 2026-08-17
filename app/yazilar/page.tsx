import { ContentArchiveExplorer } from '@/components/public/ContentArchiveExplorer';
import { SeoPageShell, StructuredData } from '@/components/public/SeoPageShell';
import { sortArchiveContent } from '@/lib/content-presentation';
import { buildSeoMetadata } from '@/lib/seo-metadata';
import { getSeoExperienceData } from '@/lib/seo-repository';
import {
  absoluteUrl,
  buildBreadcrumbJsonLd,
  findSeoPage,
  isContentPublished,
} from '@/lib/seo';

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
  const articles = sortArchiveContent(
    (data.articles || []).filter(
      (item) =>
        item.locale === 'tr' && isContentPublished(item.status, item.publishedAt)
    )
  );
  const formatter = new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const entries = articles.map((item) => ({
    id: item.id,
    title: item.title,
    excerpt: item.excerpt,
    href: `/yazilar/${item.slug}`,
    category: item.topicCluster || 'Araştırma yazısı',
    dateLabel: item.publishedAt
      ? formatter.format(new Date(item.publishedAt))
      : 'Tarih belirtilmedi',
    tags: item.relatedKeywords,
    imageUrl: item.coverImageUrl,
    imageAlt: item.coverImageAlt,
    featured: item.isFeatured,
  }));

  return (
    <SeoPageShell
      data={data}
      title={pageSeo.presentation?.heading || 'Akademik Yazılar ve Araştırma Notları'}
      description={pageSeo.presentation?.intro || pageSeo.description}
      eyebrow={pageSeo.presentation?.eyebrow || 'Yazı arşivi'}
    >
      <StructuredData
        value={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name:
            pageSeo.presentation?.heading ||
            pageSeo.title ||
            'Akademik Yazılar ve Araştırma Notları',
          description: pageSeo.description,
          url: absoluteUrl('/yazilar'),
          mainEntity: {
            '@type': 'ItemList',
            numberOfItems: articles.length,
            itemListElement: articles.map((item, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: item.title,
              url: absoluteUrl(`/yazilar/${item.slug}`),
            })),
          },
        }}
      />
      <StructuredData
        value={buildBreadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Yazılar', path: '/yazilar' },
        ])}
      />
      <ContentArchiveExplorer
        items={entries}
        searchPlaceholder="Başlık, konu veya anahtar kavram içinde ara…"
        itemLabel="yazı"
        emptyTitle="Yazılar hazırlanıyor"
        emptyDescription="İslam hukuku, yapay zekâ etiği, blokzincir ve dijital fıkıh alanlarındaki kaynaklı araştırma notları yayımlandıkça burada yer alacak."
      />
    </SeoPageShell>
  );
}
