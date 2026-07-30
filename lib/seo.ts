import {
  ArticleItem,
  ContentStatus,
  PortfolioData,
  ProjectItem,
  PublicationItem,
  SeoAuditIssue,
  SeoAuditResult,
  SeoPage,
  SeoSettings,
  SiteLocale,
} from './types';

export const DEFAULT_SITE_URL = 'https://www.muhammedakan.com';

export function isSeoCmsV2Enabled(): boolean {
  return process.env.SEO_CMS_V2 !== 'false';
}

export function normalizeSiteUrl(value?: string): string {
  const fallback = DEFAULT_SITE_URL;
  try {
    const url = new URL(value || fallback);
    url.protocol = 'https:';
    url.hash = '';
    url.search = '';
    return url.toString().replace(/\/+$/, '');
  } catch {
    return fallback;
  }
}

export function getSiteUrl(): string {
  return normalizeSiteUrl(
    process.env.SITE_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      DEFAULT_SITE_URL
  );
}

export function absoluteUrl(path = '/'): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getSiteUrl()}${normalizedPath === '/' ? '' : normalizedPath}`;
}

export function normalizePath(path: string): string {
  const raw = (path || '/').trim();
  if (/^https?:\/\//i.test(raw)) {
    try {
      return normalizePath(new URL(raw).pathname);
    } catch {
      return '/';
    }
  }
  const withSlash = raw.startsWith('/') ? raw : `/${raw}`;
  const clean = withSlash.replace(/\/{2,}/g, '/').replace(/\/+$/, '');
  return clean || '/';
}

const TURKISH_CHAR_MAP: Record<string, string> = {
  ç: 'c',
  Ç: 'c',
  ğ: 'g',
  Ğ: 'g',
  ı: 'i',
  İ: 'i',
  ö: 'o',
  Ö: 'o',
  ş: 's',
  Ş: 's',
  ü: 'u',
  Ü: 'u',
};

export function slugifyTurkish(value: string): string {
  return value
    .split('')
    .map((char) => TURKISH_CHAR_MAP[char] || char)
    .join('')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 100);
}

export function plainText(value?: string): string {
  return (value || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#>*_`~\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function truncateText(value: string, max = 160): string {
  const clean = plainText(value);
  if (clean.length <= max) return clean;
  const sliced = clean.slice(0, max - 1);
  const lastSpace = sliced.lastIndexOf(' ');
  return `${sliced.slice(0, lastSpace > max * 0.65 ? lastSpace : max - 1).trim()}…`;
}

export function isContentPublished(
  status?: ContentStatus,
  publishedAt?: string
): boolean {
  if (status === 'published') return true;
  if (status !== 'scheduled' || !publishedAt) return false;
  return new Date(publishedAt).getTime() <= Date.now();
}

export function publicationSlug(item: PublicationItem): string {
  return item.slug || slugifyTurkish(item.title);
}

export function projectSlug(item: ProjectItem): string {
  return item.slug || slugifyTurkish(item.title);
}

export const DEFAULT_SEO_PAGES: SeoPage[] = [
  {
    routeKey: 'home',
    path: '/',
    locale: 'tr',
    relatedKeywords: [],
    index: true,
    follow: true,
    includeInSitemap: true,
  },
  {
    routeKey: 'publications:index',
    path: '/yayinlar',
    locale: 'tr',
    title: 'Akademik Yayınlar | Muhammed Akan',
    description:
      'Muhammed Akan’ın İslam hukuku, yapay zekâ etiği, blokzincir ve dijital dönüşüm alanlarındaki akademik yayınlarını inceleyin.',
    focusKeyword: 'Muhammed Akan akademik yayınlar',
    relatedKeywords: ['İslam hukuku yayınları', 'yapay zekâ etiği'],
    searchIntent: 'academic',
    topicCluster: 'Akademik yayınlar',
    index: true,
    follow: true,
    includeInSitemap: true,
  },
  {
    routeKey: 'projects:index',
    path: '/projeler',
    locale: 'tr',
    title: 'Araştırma Projeleri | Muhammed Akan',
    description:
      'Muhammed Akan’ın yapay zekâ, İslam hukuku, akıllı sözleşmeler ve blokzincir odağındaki araştırma projeleri.',
    focusKeyword: 'Muhammed Akan araştırma projeleri',
    relatedKeywords: ['İslam hukuku projeleri', 'yapay zekâ araştırmaları'],
    searchIntent: 'academic',
    topicCluster: 'Araştırma projeleri',
    index: true,
    follow: true,
    includeInSitemap: true,
  },
  {
    routeKey: 'articles:index',
    path: '/yazilar',
    locale: 'tr',
    title: 'Akademik Yazılar ve Araştırma Notları | Muhammed Akan',
    description:
      'İslam hukuku, yapay zekâ etiği, blokzincir ve dijital fıkıh üzerine kaynaklı akademik yazılar ve araştırma notları.',
    focusKeyword: 'İslam hukuku ve yapay zekâ yazıları',
    relatedKeywords: ['yapay zekâ etiği', 'dijital fıkıh', 'blokzincir'],
    searchIntent: 'informational',
    topicCluster: 'Akademik yazılar',
    index: true,
    follow: true,
    includeInSitemap: true,
  },
  {
    routeKey: 'privacy',
    path: '/gizlilik',
    locale: 'tr',
    title: 'Gizlilik ve Çerez Tercihleri | Muhammed Akan',
    description:
      'Muhammed Akan akademik portfolyosunun gizlilik, çerez ve analitik ölçümleme açıklamaları.',
    relatedKeywords: [],
    index: false,
    follow: true,
    includeInSitemap: false,
  },
];

export function normalizeSeoSettings(
  settings: SeoSettings,
  profileName = 'Muhammed Akan'
): Required<SeoSettings> {
  return {
    metaTitle: settings.metaTitle || `${profileName} | Akademik Portfolyo`,
    metaDescription:
      settings.metaDescription || `${profileName} akademik portfolyosu.`,
    keywords: settings.keywords || '',
    ogImageUrl: settings.ogImageUrl || absoluteUrl('/og.png'),
    canonicalUrl: getSiteUrl(),
    authorName: settings.authorName || profileName,
    siteName: settings.siteName || `${profileName} Akademik Portfolyo`,
    titleTemplate: settings.titleTemplate || `%s | ${profileName}`,
    defaultLocale: settings.defaultLocale || 'tr',
    twitterHandle: settings.twitterHandle || '',
    googleSiteVerification: settings.googleSiteVerification || '',
    bingSiteVerification: settings.bingSiteVerification || '',
    ga4MeasurementId:
      settings.ga4MeasurementId ||
      process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID ||
      '',
    gscProperty:
      settings.gscProperty ||
      process.env.GOOGLE_SEARCH_CONSOLE_PROPERTY ||
      '',
    ga4PropertyId:
      settings.ga4PropertyId || process.env.GA4_PROPERTY_ID || '',
    enableAnalytics: settings.enableAnalytics ?? false,
    allowIndexing: settings.allowIndexing ?? true,
    alternateName: settings.alternateName || '',
    orcidUrl: settings.orcidUrl || '',
    scholarUrl: settings.scholarUrl || '',
  };
}

export function findSeoPage(
  pages: SeoPage[] | undefined,
  routeKey: string,
  fallback?: Partial<SeoPage>
): SeoPage {
  const systemDefault = DEFAULT_SEO_PAGES.find((page) => page.routeKey === routeKey);
  const saved = pages?.find((page) => page.routeKey === routeKey);
  return {
    routeKey,
    path: fallback?.path || saved?.path || systemDefault?.path || '/',
    locale: (fallback?.locale || saved?.locale || systemDefault?.locale || 'tr') as SiteLocale,
    relatedKeywords:
      fallback?.relatedKeywords ||
      saved?.relatedKeywords ||
      systemDefault?.relatedKeywords ||
      [],
    index: fallback?.index ?? saved?.index ?? systemDefault?.index ?? true,
    follow: fallback?.follow ?? saved?.follow ?? systemDefault?.follow ?? true,
    includeInSitemap:
      fallback?.includeInSitemap ??
      saved?.includeInSitemap ??
      systemDefault?.includeInSitemap ??
      true,
    ...systemDefault,
    ...saved,
    ...fallback,
  };
}

export function validSameAs(data: PortfolioData): string[] {
  const settings = normalizeSeoSettings(data.seoSettings, data.profile.fullName);
  const values = [
    ...(data.socialLinks || []).map((link) => link.url),
    settings.orcidUrl,
    settings.scholarUrl,
  ];
  return Array.from(
    new Set(
      values.filter((value) => {
        if (!value || value === '#') return false;
        try {
          const url = new URL(value);
          if (url.protocol !== 'https:' || url.pathname === '/') return false;
          const host = url.hostname.replace(/^www\./, '');
          if (host === 'orcid.org') {
            return /^\/\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/i.test(url.pathname);
          }
          if (host === 'scholar.google.com') {
            return url.pathname === '/citations' && Boolean(url.searchParams.get('user'));
          }
          if (host === 'linkedin.com') return url.pathname.startsWith('/in/');
          if (host === 'github.com') {
            return /^\/[^/]+\/?$/.test(url.pathname) && url.pathname !== '/features';
          }
          if (host === 'x.com' || host === 'twitter.com') {
            return /^\/[^/]+\/?$/.test(url.pathname);
          }
          return !['/about', '/explore', '/search'].includes(
            url.pathname.replace(/\/+$/, '') || '/'
          );
        } catch {
          return false;
        }
      })
    )
  );
}

export function buildHomeJsonLd(data: PortfolioData) {
  const settings = normalizeSeoSettings(data.seoSettings, data.profile.fullName);
  const pageUrl = absoluteUrl('/');
  const personId = `${pageUrl}#person`;
  const websiteId = `${pageUrl}#website`;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': websiteId,
        url: pageUrl,
        name: settings.siteName,
        inLanguage: 'tr-TR',
      },
      {
        '@type': 'ProfilePage',
        '@id': `${pageUrl}#profile`,
        url: pageUrl,
        name: settings.metaTitle,
        description: settings.metaDescription,
        dateModified: data.profile.updatedAt || undefined,
        mainEntity: { '@id': personId },
        isPartOf: { '@id': websiteId },
      },
      {
        '@type': 'Person',
        '@id': personId,
        name: data.profile.fullName,
        alternateName: settings.alternateName || undefined,
        jobTitle: data.profile.title,
        description: data.profile.bio,
        image: data.profile.avatarUrl || undefined,
        url: pageUrl,
        email: data.profile.email ? `mailto:${data.profile.email}` : undefined,
        address: data.profile.location
          ? {
              '@type': 'PostalAddress',
              addressLocality: data.profile.location,
            }
          : undefined,
        alumniOf: data.education.map((item) => ({
          '@type': 'EducationalOrganization',
          name: item.institution,
        })),
        knowsAbout: settings.keywords
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        sameAs: validSameAs(data),
      },
    ],
  };
}

export function buildBreadcrumbJsonLd(
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

export function buildPublicationJsonLd(
  item: PublicationItem,
  data: PortfolioData
) {
  const path = `/yayinlar/${publicationSlug(item)}`;
  const schemaType =
    item.type === 'Kitap Bölümü'
      ? 'Chapter'
      : item.type === 'Makale'
        ? 'ScholarlyArticle'
        : 'CreativeWork';
  const sourceUrl =
    item.doi && item.doi !== '#'
      ? /^https?:\/\//i.test(item.doi)
        ? item.doi
        : `https://doi.org/${item.doi.replace(/^doi:\s*/i, '')}`
      : item.url && item.url !== '#'
        ? item.url
        : undefined;
  return {
    '@context': 'https://schema.org',
    '@type': schemaType,
    '@id': `${absoluteUrl(path)}#work`,
    mainEntityOfPage: absoluteUrl(path),
    headline: item.title,
    name: item.title,
    description: item.excerpt || truncateText(item.content || item.title),
    datePublished: item.publishedAt || item.year,
    dateModified: item.updatedAt || item.publishedAt || undefined,
    author: {
      '@type': 'Person',
      name: data.profile.fullName,
      url: absoluteUrl('/'),
    },
    publisher: item.publisher
      ? { '@type': 'Organization', name: item.publisher }
      : undefined,
    sameAs: sourceUrl,
    image: item.coverImageUrl || undefined,
  };
}

export function buildArticleJsonLd(item: ArticleItem, data: PortfolioData) {
  const path = `/yazilar/${item.slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${absoluteUrl(path)}#article`,
    mainEntityOfPage: absoluteUrl(path),
    headline: item.title,
    description: item.excerpt,
    datePublished: item.publishedAt,
    dateModified: item.updatedAt || item.publishedAt,
    inLanguage: item.locale === 'en' ? 'en-US' : 'tr-TR',
    author: {
      '@type': 'Person',
      name: item.authorName || data.profile.fullName,
      url: absoluteUrl('/'),
    },
    image: item.coverImageUrl || undefined,
    keywords: item.relatedKeywords,
    citation: item.references,
  };
}

export function buildProjectJsonLd(item: ProjectItem, data: PortfolioData) {
  const path = `/projeler/${projectSlug(item)}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    '@id': `${absoluteUrl(path)}#project`,
    mainEntityOfPage: absoluteUrl(path),
    name: item.title,
    description: item.excerpt || item.description,
    dateCreated: item.publishedAt || undefined,
    dateModified: item.updatedAt || item.publishedAt || undefined,
    creator: {
      '@type': 'Person',
      name: data.profile.fullName,
      url: absoluteUrl('/'),
    },
    image: item.coverImageUrl || undefined,
    keywords: item.tags,
    mentions: item.relatedPublicationIds
      ?.map((id) => data.publications.find((publication) => publication.id === id))
      .filter(Boolean)
      .map((publication) => ({
        '@type': 'CreativeWork',
        name: publication?.title,
        url: publication
          ? absoluteUrl(`/yayinlar/${publicationSlug(publication)}`)
          : undefined,
      })),
  };
}

export function createsRedirectLoop(
  redirects: Array<{ fromPath: string; toPath: string; isActive?: boolean }>,
  candidate?: { fromPath: string; toPath: string }
): boolean {
  const edges = new Map<string, string>();
  redirects
    .filter((item) => item.isActive !== false)
    .forEach((item) =>
      edges.set(normalizePath(item.fromPath), normalizePath(item.toPath))
    );
  if (candidate) {
    edges.set(
      normalizePath(candidate.fromPath),
      normalizePath(candidate.toPath)
    );
  }
  for (const start of Array.from(edges.keys())) {
    const seen = new Set<string>();
    let current: string | undefined = start;
    while (current && edges.has(current)) {
      if (seen.has(current)) return true;
      seen.add(current);
      current = edges.get(current);
    }
  }
  return false;
}

export function runDataSeoAudit(data: PortfolioData): SeoAuditResult {
  const issues: SeoAuditIssue[] = [];
  const settings = normalizeSeoSettings(data.seoSettings, data.profile.fullName);

  if (settings.canonicalUrl !== getSiteUrl()) {
    issues.push({
      code: 'canonical-origin',
      severity: 'critical',
      category: 'indexing',
      title: 'Canonical alan adı uyuşmuyor',
      detail: `Canonical origin ${getSiteUrl()} olmalıdır.`,
      path: '/',
    });
  }
  if (!settings.metaTitle || settings.metaTitle.length < 20) {
    issues.push({
      code: 'home-title',
      severity: 'warning',
      category: 'metadata',
      title: 'Ana sayfa başlığı zayıf',
      detail: 'Ana sayfa başlığı kişiyi ve akademik odağı açıkça tanımlamalıdır.',
      path: '/',
    });
  }
  if (!settings.metaDescription || settings.metaDescription.length < 70) {
    issues.push({
      code: 'home-description',
      severity: 'warning',
      category: 'metadata',
      title: 'Ana sayfa açıklaması kısa',
      detail: 'Arama niyetini karşılayan özgün bir özet girin.',
      path: '/',
    });
  }
  if (!settings.ogImageUrl) {
    issues.push({
      code: 'default-og',
      severity: 'warning',
      category: 'metadata',
      title: 'Varsayılan sosyal kart eksik',
      detail: '1200×630 oranında bir sosyal paylaşım görseli ekleyin.',
    });
  }
  if (settings.ogImageUrl.startsWith('data:')) {
    issues.push({
      code: 'base64-og',
      severity: 'critical',
      category: 'performance',
      title: 'Üretimde Base64 sosyal görsel kullanılıyor',
      detail: 'Sosyal kartı optimize edilmiş, kalıcı bir görsel URL’sine taşıyın.',
    });
  }
  if (data.profile.avatarUrl?.startsWith('data:')) {
    issues.push({
      code: 'base64-avatar',
      severity: 'critical',
      category: 'performance',
      title: 'Profil görseli Base64 olarak saklanıyor',
      detail: 'Profil görselini Supabase Storage gibi kalıcı bir kaynağa yükleyin.',
      path: '/',
    });
  }
  (data.seoPages || []).forEach((page) => {
    if (page.index && !page.title) {
      issues.push({
        code: `missing-title-${page.routeKey}`,
        severity: 'warning',
        category: 'metadata',
        title: 'Sayfa SEO başlığı eksik',
        detail: `${page.path} için benzersiz bir SEO başlığı girin.`,
        path: page.path,
      });
    }
    if (page.index && !page.description) {
      issues.push({
        code: `missing-description-${page.routeKey}`,
        severity: 'warning',
        category: 'metadata',
        title: 'Sayfa meta açıklaması eksik',
        detail: `${page.path} için özgün bir meta açıklaması girin.`,
        path: page.path,
      });
    }
    if ((!page.index || page.canonicalOverride) && page.includeInSitemap) {
      issues.push({
        code: `sitemap-conflict-${page.routeKey}`,
        severity: 'critical',
        category: 'indexing',
        title: 'Sitemap ve canonical/index durumu çelişiyor',
        detail: `${page.path} sitemap dışında bırakılmalıdır.`,
        path: page.path,
      });
    }
  });
  const keywordOwners = new Map<string, string>();
  (data.seoPages || []).forEach((page) => {
    const keyword = (page.focusKeyword || '').trim().toLocaleLowerCase('tr-TR');
    if (!keyword) return;
    const owner = keywordOwners.get(keyword);
    if (owner && owner !== page.path) {
      issues.push({
        code: `cannibalization-${keyword}`,
        severity: 'warning',
        category: 'content',
        title: 'Odak sorgu çakışması',
        detail: `“${page.focusKeyword}” hem ${owner} hem ${page.path} tarafından hedefleniyor.`,
        path: page.path,
      });
    } else {
      keywordOwners.set(keyword, page.path);
    }
  });
  if (createsRedirectLoop(data.seoRedirects || [])) {
    issues.push({
      code: 'redirect-loop',
      severity: 'critical',
      category: 'indexing',
      title: 'Redirect döngüsü algılandı',
      detail: 'Redirect zincirindeki yollar birbirine geri dönüyor.',
    });
  }
  const publishedDetails = [
    ...data.publications.filter((item) =>
      isContentPublished(item.detailStatus, item.publishedAt)
    ),
    ...data.projects.filter((item) =>
      isContentPublished(item.detailStatus, item.publishedAt)
    ),
    ...(data.articles || []).filter((item) =>
      isContentPublished(item.status, item.publishedAt)
    ),
  ];
  publishedDetails.forEach((item) => {
    const body = 'content' in item ? plainText(item.content) : '';
    if (body.length < 250) {
      issues.push({
        code: `thin-${item.id}`,
        severity: 'warning',
        category: 'content',
        title: 'Yayınlanmış detay içeriği kısa',
        detail: `"${item.title}" için daha kapsamlı ve kaynaklı içerik önerilir.`,
      });
    }
    if (
      'coverImageUrl' in item &&
      item.coverImageUrl &&
      !item.coverImageAlt
    ) {
      issues.push({
        code: `missing-alt-${item.id}`,
        severity: 'warning',
        category: 'schema',
        title: 'Kapak görseli alt metni eksik',
        detail: `"${item.title}" için açıklayıcı bir görsel alt metni girin.`,
      });
    }
  });

  const categoryScores = scoreSeoIssues(issues);

  return {
    score: Object.values(categoryScores).reduce((total, value) => total + value, 0),
    categoryScores,
    issues,
    checkedAt: new Date().toISOString(),
  };
}

export function scoreSeoIssues(
  issues: SeoAuditIssue[]
): Record<SeoAuditIssue['category'], number> {
  const weights: Record<SeoAuditIssue['category'], number> = {
    indexing: 40,
    metadata: 20,
    content: 20,
    schema: 10,
    performance: 10,
  };
  return Object.fromEntries(
    Object.entries(weights).map(([category, weight]) => {
      const categoryIssues = issues.filter((issue) => issue.category === category);
      const penalty = categoryIssues.reduce((sum, issue) => {
        if (issue.severity === 'critical') return sum + weight * 0.5;
        if (issue.severity === 'warning') return sum + weight * 0.2;
        return sum + weight * 0.05;
      }, 0);
      return [category, Math.max(0, Math.round(weight - penalty))];
    })
  ) as Record<SeoAuditIssue['category'], number>;
}
