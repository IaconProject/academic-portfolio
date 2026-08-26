import type { Metadata } from 'next';
import { absoluteUrl } from '@/lib/seo';
import type { BlogPostSummary, BlogSettings } from './types';

export function blogIndexingEnabled(settings: BlogSettings) {
  return settings.seo.indexing !== false;
}

export function blogCanonical(path: string) {
  return absoluteUrl(path);
}

export function blogRobots(
  settings: BlogSettings,
  allowIndexing = true
): Metadata['robots'] {
  const index = blogIndexingEnabled(settings) && allowIndexing;
  return {
    index,
    follow: index,
    googleBot: {
      index,
      follow: index,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  };
}

export function itemListJsonLd(
  name: string,
  description: string,
  path: string,
  posts: BlogPostSummary[]
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    description,
    url: absoluteUrl(path),
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: posts.length,
      itemListElement: posts.map((post, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: post.title,
        url: absoluteUrl(`/blog/${post.slug}`),
      })),
    },
  };
}

export function breadcrumbJsonLd(
  items: Array<{ name: string; path: string }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
