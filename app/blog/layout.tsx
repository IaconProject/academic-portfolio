import type { Metadata } from 'next';
import { IBM_Plex_Sans, Source_Serif_4 } from 'next/font/google';
import { BlogFooter } from '@/components/blog/BlogFooter';
import { BlogHeader } from '@/components/blog/BlogHeader';
import { getBlogChrome } from '@/lib/blog/repository';
import { blogRobots } from '@/lib/blog/seo';

export const revalidate = 300;

const blogSans = IBM_Plex_Sans({
  subsets: ['latin-ext'],
  display: 'swap',
  variable: '--font-blog-sans',
});

const blogSerif = Source_Serif_4({
  subsets: ['latin-ext'],
  display: 'swap',
  variable: '--font-blog-serif',
});

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getBlogChrome();
  return {
    title: {
      default: settings.siteName,
      template: `%s | ${settings.siteName}`,
    },
    description: settings.description,
    alternates: {
      canonical: '/blog',
      types: {
        'application/rss+xml': '/blog/feed.xml',
      },
    },
    robots: blogRobots(settings),
    openGraph: {
      type: 'website',
      locale: 'tr_TR',
      url: '/blog',
      siteName: settings.siteName,
      title: settings.siteName,
      description: settings.description,
      images: [{ url: '/og.png', alt: settings.siteName }],
    },
    twitter: {
      card: 'summary_large_image',
      title: settings.siteName,
      description: settings.description,
      images: ['/og.png'],
    },
  };
}

export default async function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { settings, navigation } = await getBlogChrome();

  return (
    <div
      className={`${blogSans.variable} ${blogSerif.variable} blog-shell flex min-h-screen flex-col bg-[#f6f2e9] text-stone-900 selection:bg-amber-300 selection:text-stone-950 dark:bg-[#121110] dark:text-stone-100`}
    >
      <BlogHeader settings={settings} navigation={navigation} />
      {children}
      <BlogFooter settings={settings} navigation={navigation} />
    </div>
  );
}
