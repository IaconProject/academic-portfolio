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

async function categoryData(slug: string, page = 1) {
  const result = await getBlogArchive({ category: slug, page });
  const category = result.categories.find((item) => item.slug === slug);
  return { result, category };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const [{ category }, { settings }] = await Promise.all([
    categoryData(slug),
    getBlogChrome(),
  ]);
  if (!category) return { robots: { index: false, follow: false } };
  const title = category.seoTitle || category.name;
  const description =
    category.seoDescription ||
    category.description ||
    `${category.name} konusundaki kaynaklı teknoloji yazıları.`;
  return {
    title,
    description,
    alternates: { canonical: `/blog/kategori/${category.slug}` },
    robots: blogRobots(settings),
    openGraph: {
      type: 'website',
      url: `/blog/kategori/${category.slug}`,
      title,
      description,
      siteName: settings.siteName,
      locale: 'tr_TR',
    },
  };
}

export default async function BlogCategoryPage({
  params,
  searchParams,
}: PageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const { result, category } = await categoryData(
    slug,
    positivePage(query.sayfa)
  );
  if (!category) notFound();
  const description =
    category.description ||
    `${category.name} alanındaki kavramları ve teknolojileri temelden açıklayan yazılar.`;
  const path = `/blog/kategori/${category.slug}`;

  return (
    <>
      <BlogJsonLd
        data={itemListJsonLd(category.name, description, path, result.posts)}
      />
      <BlogJsonLd
        data={breadcrumbJsonLd([
          { name: 'Blog', path: '/blog' },
          { name: 'Kategoriler', path: '/blog/arsiv' },
          { name: category.name, path },
        ])}
      />
      <BlogArchiveView
        result={result}
        pathname={path}
        action="/blog/arsiv"
        eyebrow="Konu dosyası"
        title={category.name}
        description={description}
      />
    </>
  );
}
