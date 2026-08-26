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

async function tagData(slug: string, page = 1) {
  const result = await getBlogArchive({ tag: slug, page });
  const tag = result.tags.find((item) => item.slug === slug);
  return { result, tag };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const [{ tag }, { settings }] = await Promise.all([
    tagData(slug),
    getBlogChrome(),
  ]);
  if (!tag) return { robots: { index: false, follow: false } };
  const title = `${tag.name} yazıları`;
  const description =
    tag.description || `${tag.name} etiketiyle yayınlanan tüm blog yazıları.`;
  return {
    title,
    description,
    alternates: { canonical: `/blog/etiket/${tag.slug}` },
    robots: blogRobots(settings),
    openGraph: {
      type: 'website',
      url: `/blog/etiket/${tag.slug}`,
      title,
      description,
      siteName: settings.siteName,
      locale: 'tr_TR',
    },
  };
}

export default async function BlogTagPage({ params, searchParams }: PageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const { result, tag } = await tagData(slug, positivePage(query.sayfa));
  if (!tag) notFound();
  const description =
    tag.description || `${tag.name} etiketiyle ilişkilendirilmiş teknik yazılar.`;
  const path = `/blog/etiket/${tag.slug}`;

  return (
    <>
      <BlogJsonLd
        data={itemListJsonLd(tag.name, description, path, result.posts)}
      />
      <BlogJsonLd
        data={breadcrumbJsonLd([
          { name: 'Blog', path: '/blog' },
          { name: 'Etiketler', path: '/blog/arsiv' },
          { name: tag.name, path },
        ])}
      />
      <BlogArchiveView
        result={result}
        pathname={path}
        action="/blog/arsiv"
        eyebrow="Etiket"
        title={tag.name}
        description={description}
      />
    </>
  );
}
