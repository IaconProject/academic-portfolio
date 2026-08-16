import type { Metadata } from 'next';
import { PortfolioData, SeoPage } from './types';
import {
  absoluteUrl,
  findSeoPage,
  getSiteUrl,
  normalizeSeoSettings,
  truncateText,
} from './seo';

interface MetadataInput {
  data: PortfolioData;
  routeKey: string;
  path: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  type?: 'website' | 'article';
  publishedAt?: string;
  updatedAt?: string;
  forceNoIndex?: boolean;
}

function pageCanonical(page: SeoPage, path: string): string {
  if (page.canonicalOverride) {
    try {
      return new URL(page.canonicalOverride).toString();
    } catch {
      // Invalid overrides are ignored and surfaced by the admin audit.
    }
  }
  return absoluteUrl(path);
}

export function buildSeoMetadata({
  data,
  routeKey,
  path,
  title,
  description,
  imageUrl,
  type = 'website',
  publishedAt,
  updatedAt,
  forceNoIndex = false,
}: MetadataInput): Metadata {
  const settings = normalizeSeoSettings(data.seoSettings, data.profile.fullName);
  const page = findSeoPage(data.seoPages, routeKey, { path });
  const templatedTitle =
    title && settings.titleTemplate.includes('%s')
      ? settings.titleTemplate.replace('%s', title)
      : title;
  const resolvedTitle = page.title || templatedTitle || settings.metaTitle;
  const resolvedDescription = truncateText(
    page.description || description || settings.metaDescription,
    180
  );
  const resolvedOgTitle = page.ogTitle || resolvedTitle;
  const resolvedOgDescription = truncateText(
    page.ogDescription || resolvedDescription,
    200
  );
  const dynamicArticleImage =
    type === 'article'
      ? absoluteUrl(
          `/og.png?title=${encodeURIComponent(resolvedTitle)}&subtitle=${encodeURIComponent(
            resolvedDescription
          )}`
        )
      : '';
  const resolvedImage =
    page.ogImageUrl ||
    imageUrl ||
    dynamicArticleImage ||
    settings.ogImageUrl ||
    absoluteUrl('/og.png');
  const canonical = pageCanonical(page, path);
  const production =
    process.env.VERCEL_ENV === undefined || process.env.VERCEL_ENV === 'production';
  const index =
    production &&
    settings.allowIndexing &&
    page.index &&
    !forceNoIndex;
  const keywords = Array.from(
    new Set(
      [
        page.focusKeyword,
        ...page.relatedKeywords,
        ...settings.keywords.split(','),
      ]
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value))
    )
  );

  return {
    title: resolvedTitle,
    description: resolvedDescription,
    keywords,
    authors: [{ name: settings.authorName, url: getSiteUrl() }],
    creator: settings.authorName,
    publisher: settings.siteName,
    metadataBase: new URL(getSiteUrl()),
    alternates: {
      canonical,
    },
    verification: {
      google: settings.googleSiteVerification || undefined,
      other: settings.bingSiteVerification
        ? { 'msvalidate.01': settings.bingSiteVerification }
        : undefined,
    },
    robots: {
      index,
      follow: index && page.follow,
      nocache: !index,
      googleBot: {
        index,
        follow: index && page.follow,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    openGraph: {
      title: resolvedOgTitle,
      description: resolvedOgDescription,
      url: canonical,
      siteName: settings.siteName,
      locale: page.locale === 'en' ? 'en_US' : 'tr_TR',
      type,
      images: resolvedImage
        ? [
            {
              url: resolvedImage,
              width: 1200,
              height: 630,
              alt: resolvedOgTitle,
            },
          ]
        : [],
      ...(type === 'article'
        ? {
            publishedTime: publishedAt,
            modifiedTime: updatedAt || publishedAt,
            authors: [settings.authorName],
          }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: resolvedOgTitle,
      description: resolvedOgDescription,
      creator: settings.twitterHandle || undefined,
      images: resolvedImage ? [resolvedImage] : [],
    },
  };
}
