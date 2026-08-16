import { MetadataRoute } from 'next';
import { getSeoExperienceData } from '@/lib/seo-repository';
import {
  absoluteUrl,
  findSeoPage,
  isContentPublished,
  normalizeSeoSettings,
  projectSlug,
  publicationSlug,
} from '@/lib/seo';

export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await getSeoExperienceData();
  const settings = normalizeSeoSettings(data.seoSettings, data.profile.fullName);
  if (!settings.allowIndexing || !settings.sitemapConfig.enabled) return [];
  const latestDate = (values: Array<string | undefined>) => {
    const timestamps = values
      .filter(Boolean)
      .map((value) => new Date(value as string).getTime())
      .filter(Number.isFinite);
    return timestamps.length ? new Date(Math.max(...timestamps)) : undefined;
  };
  const systemRoutes = ['home', 'publications:index', 'projects:index', 'articles:index']
    .map((routeKey) => findSeoPage(data.seoPages, routeKey))
    .filter(
      (page) =>
        page.index &&
        page.includeInSitemap &&
        !page.canonicalOverride
    )
    .map((page) => ({
      url: absoluteUrl(page.path),
      lastModified:
        page.routeKey === 'home'
          ? latestDate([page.updatedAt, data.profile.updatedAt])
          : page.routeKey === 'publications:index'
            ? latestDate([
                page.updatedAt,
                ...data.publications.map((item) => item.updatedAt),
              ])
            : page.routeKey === 'projects:index'
              ? latestDate([
                  page.updatedAt,
                  ...data.projects.map((item) => item.updatedAt),
                ])
              : latestDate([
                  page.updatedAt,
                  ...(data.articles || []).map((item) => item.updatedAt),
                ]),
    }));
  const publicationRoutes = settings.sitemapConfig.includePublications
    ? data.publications
    .filter((item) =>
      (item.locale || 'tr') === 'tr' &&
      isContentPublished(item.detailStatus, item.publishedAt)
    )
    .filter((item) => {
      const page = findSeoPage(
        data.seoPages,
        `publication:${item.id}`,
        { path: `/yayinlar/${publicationSlug(item)}` }
      );
      return page.index && page.includeInSitemap && !page.canonicalOverride;
    })
    .map((item) => ({
      url: absoluteUrl(`/yayinlar/${publicationSlug(item)}`),
      lastModified: item.updatedAt ? new Date(item.updatedAt) : undefined,
    }))
    : [];
  const projectRoutes = settings.sitemapConfig.includeProjects
    ? data.projects
    .filter((item) =>
      (item.locale || 'tr') === 'tr' &&
      isContentPublished(item.detailStatus, item.publishedAt)
    )
    .filter((item) => {
      const page = findSeoPage(data.seoPages, `project:${item.id}`, {
        path: `/projeler/${projectSlug(item)}`,
      });
      return page.index && page.includeInSitemap && !page.canonicalOverride;
    })
    .map((item) => ({
      url: absoluteUrl(`/projeler/${projectSlug(item)}`),
      lastModified: item.updatedAt ? new Date(item.updatedAt) : undefined,
    }))
    : [];
  const articleRoutes = settings.sitemapConfig.includeArticles
    ? (data.articles || [])
    .filter((item) =>
      item.locale === 'tr' && isContentPublished(item.status, item.publishedAt)
    )
    .filter((item) => {
      const page = findSeoPage(data.seoPages, `article:${item.id}`, {
        path: `/yazilar/${item.slug}`,
      });
      return page.index && page.includeInSitemap && !page.canonicalOverride;
    })
    .map((item) => ({
      url: absoluteUrl(`/yazilar/${item.slug}`),
      lastModified: item.updatedAt
        ? new Date(item.updatedAt)
        : item.publishedAt
          ? new Date(item.publishedAt)
          : undefined,
    }))
    : [];
  const additionalRoutes = settings.sitemapConfig.additionalPaths.map((path) => ({
    url: absoluteUrl(path),
  }));

  const entries = [
    ...systemRoutes,
    ...publicationRoutes,
    ...projectRoutes,
    ...articleRoutes,
    ...additionalRoutes,
  ];
  return Array.from(new Map(entries.map((entry) => [entry.url, entry])).values());
}
