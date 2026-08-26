import type { Metadata } from 'next';
import { BlogHomeSections } from '@/components/blog/BlogHomeSections';
import { BlogJsonLd } from '@/components/blog/BlogJsonLd';
import { getBlogHomeData } from '@/lib/blog/repository';
import { blogRobots } from '@/lib/blog/seo';
import { absoluteUrl } from '@/lib/seo';

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getBlogHomeData();
  return {
    title: { absolute: settings.siteName },
    description: settings.description,
    alternates: {
      canonical: '/blog',
      types: { 'application/rss+xml': '/blog/feed.xml' },
    },
    robots: blogRobots(settings),
    openGraph: {
      type: 'website',
      locale: 'tr_TR',
      url: '/blog',
      siteName: settings.siteName,
      title: settings.siteName,
      description: settings.description,
    },
  };
}

export default async function BlogHomePage() {
  const data = await getBlogHomeData();
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${absoluteUrl('/blog')}#website`,
        url: absoluteUrl('/blog'),
        name: data.settings.siteName,
        description: data.settings.description,
        inLanguage: 'tr-TR',
        publisher: { '@id': `${absoluteUrl('/')}#person` },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${absoluteUrl('/blog/ara')}?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'Blog',
        '@id': `${absoluteUrl('/blog')}#blog`,
        url: absoluteUrl('/blog'),
        name: data.settings.siteName,
        description: data.settings.description,
        inLanguage: 'tr-TR',
        author: { '@id': `${absoluteUrl('/')}#person` },
        blogPost: data.latestPosts.slice(0, 10).map((post) => ({
          '@type': 'BlogPosting',
          headline: post.title,
          url: absoluteUrl(`/blog/${post.slug}`),
          datePublished: post.publishedAt,
        })),
      },
      {
        '@type': 'Person',
        '@id': `${absoluteUrl('/')}#person`,
        name: data.settings.authorName,
        url: absoluteUrl('/'),
      },
    ],
  };

  return (
    <main id="blog-content" className="flex-1">
      <BlogJsonLd data={graph} />
      <BlogHomeSections data={data} />
    </main>
  );
}
