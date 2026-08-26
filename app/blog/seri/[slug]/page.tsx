import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BlogArchiveView } from '@/components/blog/BlogArchiveView';
import { BlogJsonLd } from '@/components/blog/BlogJsonLd';
import { getBlogArchive, getBlogChrome } from '@/lib/blog/repository';
import { positivePage, type BlogSearchParams } from '@/lib/blog/query';
import {
  breadcrumbJsonLd,
  blogRobots,
  itemListJsonLd,
} from '@/lib/blog/seo';

export const revalidate = 300;

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<BlogSearchParams>;
}

async function seriesData(slug: string, page = 1) {
  const result = await getBlogArchive({ series: slug, page });
  const series = result.series.find((item) => item.slug === slug);
  return { result, series };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const [{ series }, { settings }] = await Promise.all([
    seriesData(slug),
    getBlogChrome(),
  ]);
  if (!series) return { robots: { index: false, follow: false } };
  const title = series.seoTitle || series.title;
  const description =
    series.seoDescription ||
    series.description ||
    `${series.title} öğrenme serisindeki tüm yazılar.`;
  return {
    title,
    description,
    alternates: { canonical: `/blog/seri/${series.slug}` },
    robots: blogRobots(settings),
    openGraph: {
      type: 'website',
      url: `/blog/seri/${series.slug}`,
      title,
      description,
      siteName: settings.siteName,
      locale: 'tr_TR',
      images: series.coverImageUrl ? [series.coverImageUrl] : undefined,
    },
  };
}

export default async function BlogSeriesDetailPage({
  params,
  searchParams,
}: PageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const { result, series } = await seriesData(
    slug,
    positivePage(query.sayfa)
  );
  if (!series) notFound();
  const description =
    series.description || `${series.title} öğrenme serisindeki tüm yazılar.`;
  const path = `/blog/seri/${series.slug}`;

  return (
    <>
      <BlogJsonLd
        data={itemListJsonLd(series.title, description, path, result.posts)}
      />
      <BlogJsonLd
        data={breadcrumbJsonLd([
          { name: 'Blog', path: '/blog' },
          { name: 'Seriler', path: '/blog/seriler' },
          { name: series.title, path },
        ])}
      />
      <BlogArchiveView
        result={result}
        pathname={path}
        action="/blog/arsiv"
        eyebrow="Öğrenme serisi"
        title={series.title}
        description={description}
      />
    </>
  );
}
