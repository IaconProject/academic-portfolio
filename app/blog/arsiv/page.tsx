import type { Metadata } from 'next';
import { BlogArchiveView } from '@/components/blog/BlogArchiveView';
import { BlogJsonLd } from '@/components/blog/BlogJsonLd';
import { getBlogArchive, getBlogChrome } from '@/lib/blog/repository';
import { firstParam, positivePage, type BlogSearchParams } from '@/lib/blog/query';
import { blogRobots, itemListJsonLd } from '@/lib/blog/seo';

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getBlogChrome();
  const title = 'Yazı arşivi';
  const description =
    'Blok zinciri, Bitcoin, kripto paralar ve yapay zekâ üzerine tüm kaynaklı yazıları arayın ve filtreleyin.';
  return {
    title,
    description,
    alternates: { canonical: '/blog/arsiv' },
    robots: blogRobots(settings),
    openGraph: {
      type: 'website',
      url: '/blog/arsiv',
      title,
      description,
      siteName: settings.siteName,
      locale: 'tr_TR',
    },
  };
}

export default async function BlogArchivePage({
  searchParams,
}: {
  searchParams: Promise<BlogSearchParams>;
}) {
  const params = await searchParams;
  const result = await getBlogArchive({
    q: firstParam(params.q),
    category: firstParam(params.kategori),
    tag: firstParam(params.etiket),
    series: firstParam(params.seri),
    page: positivePage(params.sayfa),
  });
  const description =
    'Teknik kavramları, konuları ve öğrenme serilerini tek arşivde keşfedin.';

  return (
    <>
      <BlogJsonLd
        data={itemListJsonLd(
          'Muhammed Akan Blog yazı arşivi',
          description,
          '/blog/arsiv',
          result.posts
        )}
      />
      <BlogArchiveView
        result={result}
        pathname="/blog/arsiv"
        eyebrow="Bilgi kütüphanesi"
        title="Yazı arşivi"
        description={description}
      />
    </>
  );
}
