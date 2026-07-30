import 'server-only';
import { unstable_cache } from 'next/cache';
import { getPortfolioDataServer } from './server-cms';
import { serverSupabase } from './supabase/server';
import {
  ArticleItem,
  PortfolioData,
  SeoPage,
  SeoRedirect,
} from './types';
import {
  DEFAULT_SEO_PAGES,
  isSeoCmsV2Enabled,
  slugifyTurkish,
} from './seo';

function mapArticle(row: Record<string, any>): ArticleItem {
  return {
    id: row.id,
    slug: row.slug,
    locale: row.locale || 'tr',
    translationGroupId: row.translation_group_id || undefined,
    title: row.title,
    excerpt: row.excerpt || '',
    content: row.content || '',
    coverImageUrl: row.cover_image_url || '',
    coverImageAlt: row.cover_image_alt || '',
    status: row.status || 'draft',
    authorName: row.author_name || '',
    publishedAt: row.published_at || undefined,
    updatedAt: row.updated_at || undefined,
    relatedKeywords: row.related_keywords || [],
    topicCluster: row.topic_cluster || '',
    references: row.references || [],
  };
}

function mapSeoPage(row: Record<string, any>): SeoPage {
  return {
    id: row.id,
    routeKey: row.route_key,
    path: row.path,
    locale: row.locale || 'tr',
    title: row.title || '',
    description: row.description || '',
    focusKeyword: row.focus_keyword || '',
    relatedKeywords: row.related_keywords || [],
    searchIntent: row.search_intent || undefined,
    topicCluster: row.topic_cluster || '',
    ogTitle: row.og_title || '',
    ogDescription: row.og_description || '',
    ogImageUrl: row.og_image_url || '',
    canonicalOverride: row.canonical_override || '',
    index: row.is_indexable ?? true,
    follow: row.follow_links ?? true,
    includeInSitemap: row.include_in_sitemap ?? true,
    updatedAt: row.updated_at || undefined,
  };
}

function mapRedirect(row: Record<string, any>): SeoRedirect {
  return {
    id: row.id,
    fromPath: row.from_path,
    toPath: row.to_path,
    statusCode: row.status_code === 301 ? 301 : 308,
    reason: row.reason || '',
    isActive: row.is_active ?? true,
    createdAt: row.created_at || undefined,
    updatedAt: row.updated_at || undefined,
  };
}

async function getSeoExperienceDataUncached(): Promise<PortfolioData> {
  const portfolio = hydrateLegacyContent(await getPortfolioDataServer());
  if (!serverSupabase || !isSeoCmsV2Enabled()) {
    return {
      ...portfolio,
      articles: portfolio.articles || [],
      seoPages: portfolio.seoPages || DEFAULT_SEO_PAGES,
      seoRedirects: portfolio.seoRedirects || [],
    };
  }

  try {
    const [articlesResult, pagesResult, redirectsResult, settingsResult] = await Promise.all([
      serverSupabase.from('articles').select('*').order('published_at', {
        ascending: false,
        nullsFirst: false,
      }),
      serverSupabase.from('seo_pages').select('*').order('path', {
        ascending: true,
      }),
      serverSupabase
        .from('seo_redirects')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false }),
      serverSupabase.from('seo_site_settings').select('*').limit(1).maybeSingle(),
    ]);

    const savedPages = pagesResult.data?.map(mapSeoPage) || [];
    const seoPages = [
      ...DEFAULT_SEO_PAGES.map((defaultPage) => {
        const saved = savedPages.find(
          (item) =>
            item.routeKey === defaultPage.routeKey &&
            item.locale === defaultPage.locale
        );
        return saved
          ? {
              ...defaultPage,
              ...saved,
              title: saved.title || defaultPage.title,
              description: saved.description || defaultPage.description,
              focusKeyword: saved.focusKeyword || defaultPage.focusKeyword,
              relatedKeywords: saved.relatedKeywords.length
                ? saved.relatedKeywords
                : defaultPage.relatedKeywords,
              searchIntent: saved.searchIntent || defaultPage.searchIntent,
              topicCluster: saved.topicCluster || defaultPage.topicCluster,
            }
          : defaultPage;
      }),
      ...savedPages.filter(
        (saved) =>
          !DEFAULT_SEO_PAGES.some(
            (defaultPage) =>
              defaultPage.routeKey === saved.routeKey &&
              defaultPage.locale === saved.locale
          )
      ),
    ];

    return {
      ...portfolio,
      seoSettings: settingsResult.data
        ? {
            ...portfolio.seoSettings,
            metaTitle: settingsResult.data.meta_title,
            metaDescription: settingsResult.data.meta_description,
            keywords: (settingsResult.data.focus_topics || []).join(', '),
            ogImageUrl: settingsResult.data.default_og_image_url || '',
            canonicalUrl: portfolio.seoSettings.canonicalUrl,
            authorName: settingsResult.data.author_name,
            siteName: settingsResult.data.site_name,
            titleTemplate: settingsResult.data.title_template,
            defaultLocale: settingsResult.data.default_locale || 'tr',
            twitterHandle: settingsResult.data.twitter_handle || '',
            googleSiteVerification:
              settingsResult.data.google_site_verification || '',
            bingSiteVerification:
              settingsResult.data.bing_site_verification || '',
            ga4MeasurementId: settingsResult.data.ga4_measurement_id || '',
            gscProperty: settingsResult.data.gsc_property || '',
            ga4PropertyId: settingsResult.data.ga4_property_id || '',
            enableAnalytics: settingsResult.data.enable_analytics ?? false,
            allowIndexing: settingsResult.data.allow_indexing ?? true,
            alternateName: settingsResult.data.alternate_name || '',
            orcidUrl: settingsResult.data.orcid_url || '',
            scholarUrl: settingsResult.data.scholar_url || '',
          }
        : portfolio.seoSettings,
      articles: articlesResult.data?.map(mapArticle) || [],
      seoPages,
      seoRedirects: redirectsResult.data?.map(mapRedirect) || [],
    };
  } catch {
    return {
      ...portfolio,
      articles: portfolio.articles || [],
      seoPages: portfolio.seoPages || DEFAULT_SEO_PAGES,
      seoRedirects: portfolio.seoRedirects || [],
    };
  }
}

export const getSeoExperienceData = unstable_cache(
  getSeoExperienceDataUncached,
  ['seo-experience-v2'],
  { revalidate: 300, tags: ['seo', 'portfolio-content'] }
);

export async function resolveRedirectPath(path: string): Promise<string | null> {
  const data = await getSeoExperienceData();
  const match = data.seoRedirects?.find(
    (item) => item.isActive && item.fromPath === path
  );
  return match?.toPath || null;
}

export function hydrateLegacyContent(data: PortfolioData): PortfolioData {
  return {
    ...data,
    publications: data.publications.map((item) => ({
      ...item,
      slug: item.slug || slugifyTurkish(item.title),
      locale: item.locale || 'tr',
      detailStatus: item.detailStatus || 'none',
    })),
    projects: data.projects.map((item) => ({
      ...item,
      slug: item.slug || slugifyTurkish(item.title),
      locale: item.locale || 'tr',
      detailStatus: item.detailStatus || 'none',
    })),
  };
}
