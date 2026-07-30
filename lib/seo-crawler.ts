import 'server-only';
import type { PortfolioData, SeoAuditIssue, SeoAuditResult } from './types';
import {
  absoluteUrl,
  getSiteUrl,
  isContentPublished,
  projectSlug,
  publicationSlug,
  scoreSeoIssues,
} from './seo';

interface CrawledPage {
  path: string;
  status: number;
  title: string;
  description: string;
  canonical: string;
  h1Count: number;
  internalLinks: string[];
}

function firstMatch(html: string, expression: RegExp): string {
  return html.match(expression)?.[1]?.trim() || '';
}

function registeredPaths(data: PortfolioData): string[] {
  return Array.from(
    new Set([
      '/',
      '/yayinlar',
      '/projeler',
      '/yazilar',
      '/gizlilik',
      ...data.publications
        .filter((item) => isContentPublished(item.detailStatus, item.publishedAt))
        .map((item) => `/yayinlar/${publicationSlug(item)}`),
      ...data.projects
        .filter((item) => isContentPublished(item.detailStatus, item.publishedAt))
        .map((item) => `/projeler/${projectSlug(item)}`),
      ...(data.articles || [])
        .filter((item) => isContentPublished(item.status, item.publishedAt))
        .map((item) => `/yazilar/${item.slug}`),
    ])
  ).slice(0, 60);
}

async function fetchText(path: string) {
  const target = new URL(path, getSiteUrl());
  if (target.origin !== new URL(getSiteUrl()).origin) {
    throw new Error('Audit yalnız kayıtlı site hostunu tarayabilir.');
  }
  return fetch(target, {
    cache: 'no-store',
    redirect: 'manual',
    headers: { 'User-Agent': 'MuhammedAkan-SEO-Audit/2.0' },
    signal: AbortSignal.timeout(8000),
  });
}

export async function runLiveSeoAudit(
  data: PortfolioData,
  baseline: SeoAuditResult
): Promise<SeoAuditResult> {
  const issues: SeoAuditIssue[] = [...baseline.issues];
  const crawled: CrawledPage[] = [];
  const paths = registeredPaths(data);

  for (let index = 0; index < paths.length; index += 5) {
    const batch = paths.slice(index, index + 5);
    await Promise.all(
      batch.map(async (path) => {
        try {
          const response = await fetchText(path);
          if (response.status !== 200) {
            issues.push({
              code: `http-${response.status}-${path}`,
              severity: 'critical',
              category: 'indexing',
              title: 'Kayıtlı sayfa 200 dönmüyor',
              detail: `${path} HTTP ${response.status} döndürdü.`,
              path,
            });
            return;
          }
          const html = await response.text();
          const canonical = firstMatch(
            html,
            /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i
          ) || firstMatch(
            html,
            /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["'][^>]*>/i
          );
          const title = firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
          const description = firstMatch(
            html,
            /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i
          ) || firstMatch(
            html,
            /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i
          );
          const h1Count = (html.match(/<h1\b/gi) || []).length;
          const internalLinks = Array.from(
            html.matchAll(/<a\b[^>]+href=["']([^"']+)["'][^>]*>/gi)
          )
            .map((match) => match[1])
            .filter((href) => !href.startsWith('#') && !/^(mailto|tel):/i.test(href))
            .flatMap((href) => {
              try {
                const link = new URL(href, getSiteUrl());
                return link.origin === new URL(getSiteUrl()).origin
                  ? [link.pathname]
                  : [];
              } catch {
                return [];
              }
            });
          crawled.push({
            path,
            status: response.status,
            title,
            description,
            canonical,
            h1Count,
            internalLinks,
          });
          if (!canonical) {
            issues.push({
              code: `canonical-missing-${path}`,
              severity: 'critical',
              category: 'indexing',
              title: 'Canonical etiketi eksik',
              detail: `${path} sayfasında canonical bulunamadı.`,
              path,
            });
          } else {
            try {
              const canonicalUrl = new URL(canonical, getSiteUrl());
              if (canonicalUrl.origin === new URL(getSiteUrl()).origin) {
                const canonicalResponse = await fetchText(canonicalUrl.pathname);
                if (canonicalResponse.status !== 200) {
                  issues.push({
                    code: `canonical-broken-${path}`,
                    severity: 'critical',
                    category: 'indexing',
                    title: 'Canonical hedefi erişilemiyor',
                    detail: `${canonicalUrl.pathname} HTTP ${canonicalResponse.status} döndürdü.`,
                    path,
                  });
                }
              }
            } catch {
              issues.push({
                code: `canonical-invalid-${path}`,
                severity: 'critical',
                category: 'indexing',
                title: 'Canonical URL geçersiz',
                detail: `${path} için geçerli bir mutlak canonical URL üretilemedi.`,
                path,
              });
            }
          }
          if (!title || !description) {
            issues.push({
              code: `metadata-missing-${path}`,
              severity: 'critical',
              category: 'metadata',
              title: 'Zorunlu metadata eksik',
              detail: `${path} için title ve description birlikte bulunmalıdır.`,
              path,
            });
          }
          if (h1Count !== 1) {
            issues.push({
              code: `h1-${path}`,
              severity: 'warning',
              category: 'content',
              title: 'Başlık hiyerarşisi sorunlu',
              detail: `${path} sayfasında ${h1Count} adet h1 bulundu; tam olarak bir tane olmalıdır.`,
              path,
            });
          }
          const images = html.match(/<img\b[^>]*>/gi) || [];
          if (images.some((image) => !/\balt=["'][^"']+["']/i.test(image))) {
            issues.push({
              code: `image-alt-${path}`,
              severity: 'warning',
              category: 'content',
              title: 'Görsel alt metni eksik',
              detail: `${path} sayfasında boş veya eksik alt metinli görsel var.`,
              path,
            });
          }
          const schemas = Array.from(
            html.matchAll(
              /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
            )
          );
          if (schemas.some((schema) => {
            try {
              JSON.parse(schema[1]);
              return false;
            } catch {
              return true;
            }
          })) {
            issues.push({
              code: `schema-invalid-${path}`,
              severity: 'critical',
              category: 'schema',
              title: 'JSON-LD ayrıştırılamıyor',
              detail: `${path} sayfasında geçersiz JSON-LD bulundu.`,
              path,
            });
          }
        } catch (error) {
          issues.push({
            code: `crawl-failed-${path}`,
            severity: 'warning',
            category: 'performance',
            title: 'Sayfa denetlenemedi',
            detail: error instanceof Error ? error.message : `${path} alınamadı.`,
            path,
          });
        }
      })
    );
  }

  const titleOwners = new Map<string, string>();
  const descriptionOwners = new Map<string, string>();
  crawled.forEach((page) => {
    [
      [page.title, titleOwners, 'title'],
      [page.description, descriptionOwners, 'description'],
    ].forEach(([value, owners, kind]) => {
      const normalized = String(value).toLocaleLowerCase('tr-TR');
      if (!normalized) return;
      const map = owners as Map<string, string>;
      const owner = map.get(normalized);
      if (owner && owner !== page.path) {
        issues.push({
          code: `duplicate-${kind}-${page.path}`,
          severity: 'warning',
          category: 'metadata',
          title: `Tekrarlanan ${kind === 'title' ? 'başlık' : 'açıklama'}`,
          detail: `${owner} ve ${page.path} aynı ${kind} değerini kullanıyor.`,
          path: page.path,
        });
      } else {
        map.set(normalized, page.path);
      }
    });
  });

  const knownStatuses = new Map(
    crawled.map((page) => [page.path, page.status])
  );
  const discoveredInternalLinks = Array.from(
    new Set(crawled.flatMap((page) => page.internalLinks))
  ).slice(0, 80);
  for (let index = 0; index < discoveredInternalLinks.length; index += 8) {
    await Promise.all(
      discoveredInternalLinks.slice(index, index + 8).map(async (path) => {
        try {
          const status =
            knownStatuses.get(path) || (await fetchText(path)).status;
          if (status >= 400) {
            issues.push({
              code: `broken-internal-${path}`,
              severity: 'critical',
              category: 'content',
              title: 'Kırık dahili bağlantı',
              detail: `${path} bağlantısı HTTP ${status} döndürüyor.`,
              path,
            });
          }
        } catch {
          issues.push({
            code: `broken-internal-${path}`,
            severity: 'warning',
            category: 'content',
            title: 'Dahili bağlantı denetlenemedi',
            detail: `${path} bağlantısı alınamadı.`,
            path,
          });
        }
      })
    );
  }

  try {
    const sitemapResponse = await fetchText('/sitemap.xml');
    const sitemap = await sitemapResponse.text();
    crawled
      .filter((page) => page.path !== '/gizlilik')
      .forEach((page) => {
        if (!sitemap.includes(`<loc>${absoluteUrl(page.path)}</loc>`)) {
          issues.push({
            code: `sitemap-missing-${page.path}`,
            severity: 'warning',
            category: 'indexing',
            title: 'Canonical sayfa sitemap içinde değil',
            detail: `${page.path} yayınlanmış görünmesine rağmen sitemap içinde bulunamadı.`,
            path: page.path,
          });
        }
      });
  } catch {
    issues.push({
      code: 'sitemap-unavailable',
      severity: 'critical',
      category: 'indexing',
      title: 'Sitemap denetlenemedi',
      detail: '/sitemap.xml alınamadı.',
    });
  }

  const deduplicated = Array.from(
    new Map(issues.map((issue) => [issue.code, issue])).values()
  );
  const categoryScores = scoreSeoIssues(deduplicated);
  return {
    score: Object.values(categoryScores).reduce((sum, value) => sum + value, 0),
    categoryScores,
    issues: deduplicated,
    checkedAt: new Date().toISOString(),
  };
}
