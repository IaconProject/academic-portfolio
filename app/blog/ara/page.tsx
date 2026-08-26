import type { Metadata } from 'next';
import { BlogArchiveView } from '@/components/blog/BlogArchiveView';
import { BlogJsonLd } from '@/components/blog/BlogJsonLd';
import { getBlogArchive, getBlogChrome } from '@/lib/blog/repository';
import { firstParam, positivePage, type BlogSearchParams } from '@/lib/blog/query';
import { itemListJsonLd } from '@/lib/blog/seo';

export const revalidate = 60;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<BlogSearchParams>;
}): Promise<Metadata> {
  const params = await searchParams;
  const q = firstParam(params.q).trim();
  const { settings } = await getBlogChrome();
  const title = q ? `“${q}” arama sonuçları` : 'Blogda ara';
  return {
    title,
    description: `${settings.siteName} içinde başlık, kavram ve teknolojilere göre arama yapın.`,
    alternates: { canonical: '/blog/ara' },
    robots: { index: false, follow: true },
    openGraph: {
      type: 'website',
      url: '/blog/ara',
      title,
      siteName: settings.siteName,
      locale: 'tr_TR',
    },
  };
}

export default async function BlogSearchPage({
  searchParams,
}: {
  searchParams: Promise<BlogSearchParams>;
}) {
  const params = await searchParams;
  const q = firstParam(params.q).trim();
  const result = await getBlogArchive({
    q,
    category: firstParam(params.kategori),
    tag: firstParam(params.etiket),
    series: firstParam(params.seri),
    page: positivePage(params.sayfa),
  });
  const title = q ? `“${q}” için sonuçlar` : 'Blogda ara';
  const description = q
    ? `${result.total} yazı eşleşti. Sonuçları kategori, etiket veya seriye göre daraltabilirsiniz.`
    : 'Bir kavram, teknoloji veya soruyla başlayın; tüm kaynaklı yazılar içinde arayalım.';

  return (
    <>
      <BlogJsonLd
        data={itemListJsonLd(title, description, '/blog/ara', result.posts)}
      />
      <BlogArchiveView
        result={result}
        pathname="/blog/ara"
        eyebrow="Tam metin arama"
        title={title}
        description={description}
      />
    </>
  );
}
