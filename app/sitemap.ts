import type { MetadataRoute } from 'next';
import {
  getAllPublishedBlogPosts,
  getBlogArchive,
  getBlogChrome,
} from '@/lib/blog/repository';
import { blogIndexingEnabled } from '@/lib/blog/seo';
import { getSeoExperienceData } from '@/lib/seo-repository';
import {
  absoluteUrl,
  findSeoPage,
  isContentPublished,
  normalizeSeoSettings,
  projectSlug,
  publicationSlug,
} from '@/lib/seo';
import { safeHttpUrl } from '@/lib/url-security';

export const revalidate = 300;

function latestDate(values: Array<string | undefined>) {
  const timestamps = values
    .filter(Boolean)
    .map((value) => new Date(value as string).getTime())
    .filter(Number.isFinite);
  return timestamps.length ? new Date(Math.max(...timestamps)) : undefined;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [data, blogChrome, blogArchive, blogPosts] = await Promise.all([
    getSeoExperienceData(),
    getBlogChrome(),
    getBlogArchive({ pageSize: 3 }),
    getAllPublishedBlogPosts(),
  ]);
  const settings = normalizeSeoSettings(data.seoSettings, data.profile.fullName);
  if (!settings.allowIndexing || !settings.sitemapConfig.enabled) return [];

  const entries: MetadataRoute.Sitemap = [];
  const systemRouteKeys = ['home', 'publications:index', 'projects:index'];
  for (const routeKey of systemRouteKeys) {
    const page = findSeoPage(data.seoPages, routeKey);
    if (!page.index || !page.includeInSitemap || page.canonicalOverride) continue;
    entries.push({
      url: absoluteUrl(page.path),
      lastModified:
        routeKey === 'home'
          ? latestDate([page.updatedAt, data.profile.updatedAt])
          : routeKey === 'publications:index'
            ? latestDate([
                page.updatedAt,
                ...data.publications.map((item) => item.updatedAt),
              ])
            : latestDate([
                page.updatedAt,
                ...data.projects.map((item) => item.updatedAt),
              ]),
      changeFrequency: routeKey === 'home' ? 'monthly' : 'weekly',
      priority: routeKey === 'home' ? 1 : 0.8,
    });
  }

  if (settings.sitemapConfig.includePublications) {
    for (const item of data.publications) {
      if (
        (item.locale || 'tr') !== 'tr' ||
        !isContentPublished(item.detailStatus, item.publishedAt)
      ) {
        continue;
      }
      const path = `/yayinlar/${publicationSlug(item)}`;
      const page = findSeoPage(data.seoPages, `publication:${item.id}`, { path });
      if (!page.index || !page.includeInSitemap || page.canonicalOverride) continue;
      entries.push({
        url: absoluteUrl(path),
        lastModified: item.updatedAt ? new Date(item.updatedAt) : undefined,
        changeFrequency: 'monthly',
        priority: 0.7,
      });
    }
  }

  if (settings.sitemapConfig.includeProjects) {
    for (const item of data.projects) {
      if (
        (item.locale || 'tr') !== 'tr' ||
        !isContentPublished(item.detailStatus, item.publishedAt)
      ) {
        continue;
      }
      const path = `/projeler/${projectSlug(item)}`;
      const page = findSeoPage(data.seoPages, `project:${item.id}`, { path });
      if (!page.index || !page.includeInSitemap || page.canonicalOverride) continue;
      entries.push({
        url: absoluteUrl(path),
        lastModified: item.updatedAt ? new Date(item.updatedAt) : undefined,
        changeFrequency: 'monthly',
        priority: 0.7,
      });
    }
  }

  if (
    settings.sitemapConfig.includeArticles &&
    blogIndexingEnabled(blogChrome.settings)
  ) {
    const latestPostDate = latestDate(
      blogPosts.flatMap((post) => [post.updatedAt, post.publishedAt])
    );
    entries.push(
      {
        url: absoluteUrl('/blog'),
        lastModified: latestPostDate,
        changeFrequency: 'weekly',
        priority: 0.9,
      },
      {
        url: absoluteUrl('/blog/arsiv'),
        lastModified: latestPostDate,
        changeFrequency: 'weekly',
        priority: 0.8,
      },
      {
        url: absoluteUrl('/blog/seriler'),
        lastModified: latestPostDate,
        changeFrequency: 'weekly',
        priority: 0.7,
      }
    );

    for (const category of blogArchive.categories) {
      entries.push({
        url: absoluteUrl(`/blog/kategori/${category.slug}`),
        lastModified: latestPostDate,
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
    for (const tag of blogArchive.tags) {
      entries.push({
        url: absoluteUrl(`/blog/etiket/${tag.slug}`),
        lastModified: latestPostDate,
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    }
    for (const series of blogArchive.series) {
      entries.push({
        url: absoluteUrl(`/blog/seri/${series.slug}`),
        lastModified: latestPostDate,
        changeFrequency: 'weekly',
        priority: 0.75,
        images: series.coverImageUrl ? [series.coverImageUrl] : undefined,
      });
    }
    for (const post of blogPosts) {
      if (!post.allowIndexing) continue;
      const cover = safeHttpUrl(post.coverImageUrl);
      entries.push({
        url: absoluteUrl(`/blog/${post.slug}`),
        lastModified: post.updatedAt
          ? new Date(post.updatedAt)
          : post.publishedAt
            ? new Date(post.publishedAt)
            : undefined,
        changeFrequency: 'monthly',
        priority: post.isFeatured ? 0.85 : 0.75,
        images: cover ? [cover] : undefined,
      });
    }
  }

  for (const path of settings.sitemapConfig.additionalPaths) {
    if (path === '/yazilar' || path.startsWith('/yazilar/')) continue;
    entries.push({ url: absoluteUrl(path) });
  }

  return Array.from(
    new Map(entries.map((entry) => [entry.url, entry])).values()
  );
}
