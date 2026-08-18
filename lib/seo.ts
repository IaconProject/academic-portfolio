import {
  ArticleItem,
  ContentStatus,
  PortfolioData,
  ProjectItem,
  PublicationItem,
  SeoAuditIssue,
  SeoAuditResult,
  SeoPage,
  SeoRobotsRule,
  SeoSettings,
  SeoSitemapConfig,
  SiteLocale,
} from './types';

export const DEFAULT_SITE_URL = 'https://www.muhammedakan.com';
export const TARGET_PERSON_NAME = 'Muhammed Akan';
export const TARGET_QUERY = 'Muhammed Akan kimdir';

export const DEFAULT_ROBOTS_RULES: SeoRobotsRule[] = [
  {
    id: 'search-engines',
    name: 'Arama motorları',
    enabled: true,
    userAgents: ['*'],
    allow: ['/'],
    disallow: ['/api/'],
  },
  {
    id: 'openai-search',
    name: 'OpenAI arama ve kullanıcı istekleri',
    enabled: true,
    userAgents: ['OAI-SearchBot', 'ChatGPT-User'],
    allow: ['/'],
    disallow: ['/api/'],
  },
  {
    id: 'perplexity-search',
    name: 'Perplexity arama ve kullanıcı istekleri',
    enabled: true,
    userAgents: ['PerplexityBot', 'Perplexity-User'],
    allow: ['/'],
    disallow: ['/api/'],
  },
  {
    id: 'ai-model-access',
    name: 'İsteğe bağlı AI model erişimi',
    enabled: true,
    userAgents: ['GPTBot', 'Google-Extended'],
    allow: ['/'],
    disallow: ['/api/'],
  },
];

export const DEFAULT_SITEMAP_CONFIG: SeoSitemapConfig = {
  enabled: true,
  includePublications: true,
  includeProjects: true,
  includeArticles: true,
  additionalPaths: [],
};

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

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function normalizedRobotsPath(value: string): string | null {
  const clean = value.trim();
  if (!clean || !clean.startsWith('/') || /[\r\n]/.test(clean)) return null;
  return clean.slice(0, 300);
}

export function normalizeRobotsRules(
  rules?: unknown
): SeoRobotsRule[] {
  const source: SeoRobotsRule[] =
    Array.isArray(rules) && rules.length
      ? (rules as SeoRobotsRule[])
      : DEFAULT_ROBOTS_RULES;
  const normalized = source
    .slice(0, 20)
    .map((rule, index) => {
      const userAgents = unique(
        (Array.isArray(rule.userAgents) ? rule.userAgents : [])
          .map((value) => value.trim())
          .filter((value) => /^[A-Za-z0-9*._-]{1,120}$/.test(value))
      ).slice(0, 20);
      const allow = unique(
        (Array.isArray(rule.allow) ? rule.allow : [])
          .map(normalizedRobotsPath)
          .filter((value): value is string => Boolean(value))
      ).slice(0, 50);
      const disallow = unique(
        (Array.isArray(rule.disallow) ? rule.disallow : [])
          .map(normalizedRobotsPath)
          .filter((value): value is string => Boolean(value))
      ).slice(0, 50);
      return {
        id:
          typeof rule.id === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(rule.id)
            ? rule.id
            : `crawler-rule-${index + 1}`,
        name:
          typeof rule.name === 'string' && rule.name.trim()
            ? rule.name.trim().slice(0, 120)
            : `Tarayıcı kuralı ${index + 1}`,
        enabled: rule.enabled !== false,
        userAgents,
        allow,
        disallow,
      };
    })
    .filter((rule) => rule.userAgents.length > 0);

  return normalized.length
    ? normalized
    : DEFAULT_ROBOTS_RULES.map((rule) => ({
        ...rule,
        userAgents: [...rule.userAgents],
        allow: [...rule.allow],
        disallow: [...rule.disallow],
      }));
}

export function normalizeSitemapConfig(
  config?: unknown
): SeoSitemapConfig {
  const value =
    config && typeof config === 'object'
      ? (config as Partial<SeoSitemapConfig>)
      : undefined;
  const additionalPaths = unique(
    (Array.isArray(value?.additionalPaths) ? value.additionalPaths : [])
      .map((value) => normalizePath(value))
      .filter(
        (value) =>
          value !== '/' &&
          !value.startsWith('/admin') &&
          !value.startsWith('/api/') &&
          !['/robots.txt', '/sitemap.xml'].includes(value)
      )
  ).slice(0, 200);

  return {
    enabled: value?.enabled ?? DEFAULT_SITEMAP_CONFIG.enabled,
    includePublications:
      value?.includePublications ?? DEFAULT_SITEMAP_CONFIG.includePublications,
    includeProjects:
      value?.includeProjects ?? DEFAULT_SITEMAP_CONFIG.includeProjects,
    includeArticles:
      value?.includeArticles ?? DEFAULT_SITEMAP_CONFIG.includeArticles,
    additionalPaths,
  };
}

export function buildRobotsTxt(
  settings: SeoSettings,
  options: { siteUrl?: string; production?: boolean } = {}
): string {
  const siteUrl = normalizeSiteUrl(options.siteUrl || getSiteUrl());
  if (options.production === false) {
    return ['User-Agent: *', 'Disallow: /'].join('\n');
  }

  const normalized = normalizeSeoSettings(settings);
  const blocks = normalized.robotsRules
    .filter((rule) => rule.enabled)
    .map((rule) =>
      [
        ...rule.userAgents.map((userAgent) => `User-Agent: ${userAgent}`),
        ...rule.allow.map((path) => `Allow: ${path}`),
        ...rule.disallow.map((path) => `Disallow: ${path}`),
      ].join('\n')
    )
    .filter(Boolean);

  if (!blocks.length) {
    blocks.push('User-Agent: *\nAllow: /\nDisallow: /api/');
  }
  blocks.push(`Host: ${siteUrl}`);
  if (normalized.sitemapConfig.enabled) {
    blocks.push(`Sitemap: ${siteUrl}/sitemap.xml`);
  }
  return `${blocks.join('\n\n')}\n`;
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
    title: 'Muhammed Akan Kimdir? | Akademik Biyografi',
    description:
      'Muhammed Akan kimdir? İlahiyat öğrencisi, araştırmacı ve yazılımcı Muhammed Akan’ın biyografisi; eğitimi, akademik çalışmaları, yayınları ve projeleri.',
    focusKeyword: TARGET_QUERY,
    relatedKeywords: [
      'Muhammed Akan biyografi',
      'Muhammed Akan akademik kariyeri',
      'Muhammed Akan araştırmacı',
      'Muhammed Akan yazılımcı',
    ],
    searchIntent: 'informational',
    topicCluster: 'Muhammed Akan biyografisi',
    ogTitle: 'Muhammed Akan Kimdir?',
    ogDescription:
      'Muhammed Akan’ın biyografisi, eğitimi, akademik çalışma alanları, yayınları ve araştırma projeleri.',
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
  profileName = TARGET_PERSON_NAME
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
    robotsRules: normalizeRobotsRules(settings.robotsRules),
    sitemapConfig: normalizeSitemapConfig(settings.sitemapConfig),
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
  const homePage = findSeoPage(data.seoPages, 'home');
  const pageUrl = absoluteUrl('/');
  const personId = `${pageUrl}#person`;
  const websiteId = `${pageUrl}#website`;
  const personName = settings.authorName || data.profile.fullName;
  const nameParts = personName.trim().split(/\s+/);
  const modifiedAt = [homePage.updatedAt, data.profile.updatedAt]
    .filter(Boolean)
    .sort((left, right) =>
      new Date(right as string).getTime() - new Date(left as string).getTime()
    )[0];
  const orcidIdentifier = settings.orcidUrl
    ? {
        '@type': 'PropertyValue',
        propertyID: 'ORCID',
        value: settings.orcidUrl.replace(/^https:\/\/orcid\.org\//i, ''),
        url: settings.orcidUrl,
      }
    : undefined;
  const educationOrganizations = Array.from(
    new Set(data.education.map((item) => item.institution).filter(Boolean))
  ).map((name) => ({
    '@type': 'EducationalOrganization',
    name,
  }));
  const alumniOrganizations = data.education
    .filter(
      (item) =>
        item.isCurrent === false ||
        (!item.isCurrent && !item.status.toLocaleLowerCase('tr-TR').includes('devam'))
    )
    .map((item) => item.institution)
    .filter((name, index, values) => values.indexOf(name) === index)
    .map((name) => ({ '@type': 'EducationalOrganization', name }));

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': websiteId,
        url: pageUrl,
        name: settings.siteName,
        publisher: { '@id': personId },
        inLanguage: 'tr-TR',
      },
      {
        '@type': 'ProfilePage',
        '@id': `${pageUrl}#profile`,
        url: pageUrl,
        name: homePage.title || settings.metaTitle,
        description: homePage.description || settings.metaDescription,
        dateModified: modifiedAt || undefined,
        primaryImageOfPage: data.profile.avatarUrl
          ? {
              '@type': 'ImageObject',
              contentUrl: data.profile.avatarUrl,
              caption: `${personName} profil fotoğrafı`,
            }
          : undefined,
        mainEntity: { '@id': personId },
        about: { '@id': personId },
        isPartOf: { '@id': websiteId },
        inLanguage: 'tr-TR',
      },
      {
        '@type': 'Person',
        '@id': personId,
        name: personName,
        givenName: nameParts.slice(0, -1).join(' ') || personName,
        familyName: nameParts.length > 1 ? nameParts.at(-1) : undefined,
        alternateName: settings.alternateName || undefined,
        jobTitle: data.profile.title,
        disambiguatingDescription:
          data.profile.subtitle || `${data.profile.title}; ${data.profile.location}`,
        description: data.profile.bio,
        image: data.profile.avatarUrl || undefined,
        url: pageUrl,
        mainEntityOfPage: { '@id': `${pageUrl}#profile` },
        identifier: orcidIdentifier,
        email: data.profile.email ? `mailto:${data.profile.email}` : undefined,
        homeLocation: data.profile.location
          ? {
              '@type': 'Place',
              name: data.profile.location,
            }
          : undefined,
        affiliation: educationOrganizations,
        alumniOf: alumniOrganizations.length ? alumniOrganizations : undefined,
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
      '@id': `${absoluteUrl('/')}#person`,
      name: normalizeSeoSettings(data.seoSettings, data.profile.fullName).authorName,
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
      '@id': `${absoluteUrl('/')}#person`,
      name:
        item.authorName ||
        normalizeSeoSettings(data.seoSettings, data.profile.fullName).authorName,
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
      '@id': `${absoluteUrl('/')}#person`,
      name: normalizeSeoSettings(data.seoSettings, data.profile.fullName).authorName,
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
  const homePage = findSeoPage(data.seoPages, 'home');

  // Canonical origin is deployment-owned. Legacy CMS rows may still contain an
  // older host, but normalizeSeoSettings deliberately resolves SITE_URL as the
  // only public source of truth.
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
  if (!settings.allowIndexing) {
    issues.push({
      code: 'global-noindex',
      severity: 'critical',
      category: 'indexing',
      title: 'Global indeksleme kapalı',
      detail:
        'Production sayfaları noindex üretiyor. Yayına geçmeden önce global indeksleme iznini açın.',
      path: '/',
    });
  }
  if (!settings.titleTemplate.includes('%s')) {
    issues.push({
      code: 'title-template-placeholder',
      severity: 'warning',
      category: 'metadata',
      title: 'Başlık şablonunda %s eksik',
      detail: 'Detay sayfası başlığının yerleşmesi için şablonda tam olarak %s kullanın.',
    });
  }
  const homeTargetText = [
    homePage.title,
    homePage.description,
    homePage.focusKeyword,
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('tr-TR');
  if (!homeTargetText.includes(TARGET_QUERY.toLocaleLowerCase('tr-TR'))) {
    issues.push({
      code: 'home-target-query',
      severity: 'warning',
      category: 'content',
      title: 'Ana sayfa hedef sorguyu açıkça yanıtlamıyor',
      detail: `Ana sayfa başlığı, açıklaması veya odak sorgusunda “${TARGET_QUERY}” ifadesini doğal biçimde kullanın.`,
      path: '/',
    });
  }
  if (plainText(data.profile.bio).length < 300) {
    issues.push({
      code: 'profile-biography-depth',
      severity: 'warning',
      category: 'content',
      title: 'Biyografi metni kısa',
      detail:
        'Kimlik, eğitim, çalışma alanları ve doğrulanabilir kariyer ayrıntılarını özgün bir biyografi metninde açıklayın.',
      path: '/',
    });
  }
  if (!validSameAs(data).length) {
    issues.push({
      code: 'person-same-as',
      severity: 'info',
      category: 'schema',
      title: 'Doğrulanmış kimlik bağlantısı eksik',
      detail:
        'ORCID, Google Scholar, kişisel GitHub veya LinkedIn profiliniz varsa gerçek profil URL’sini ekleyin; platform ana sayfası kullanmayın.',
      path: '/',
    });
  }
  const activeCrawlerRules = settings.robotsRules.filter((rule) => rule.enabled);
  const crawlerCanReadHome = (userAgent: string) => {
    const specific = activeCrawlerRules.filter((rule) =>
      rule.userAgents.some(
        (value) => value.toLocaleLowerCase('en-US') === userAgent.toLocaleLowerCase('en-US')
      )
    );
    const applicable = specific.length
      ? specific
      : activeCrawlerRules.filter((rule) => rule.userAgents.includes('*'));
    return (
      applicable.some((rule) => rule.allow.includes('/')) &&
      !applicable.some((rule) => rule.disallow.includes('/'))
    );
  };
  if (!crawlerCanReadHome('Googlebot') || !crawlerCanReadHome('Bingbot')) {
    issues.push({
      code: 'search-crawler-home-blocked',
      severity: 'critical',
      category: 'indexing',
      title: 'Arama motorlarının ana sayfa erişimi engelli',
      detail: 'Googlebot ve Bingbot için / yolu taranabilir olmalıdır.',
      path: '/',
    });
  }
  if (
    !crawlerCanReadHome('OAI-SearchBot') ||
    !crawlerCanReadHome('PerplexityBot')
  ) {
    issues.push({
      code: 'ai-search-crawler-home-blocked',
      severity: 'warning',
      category: 'indexing',
      title: 'AI arama botlarından biri ana sayfaya erişemiyor',
      detail:
        'ChatGPT araması için OAI-SearchBot ve Perplexity araması için PerplexityBot erişimini açın.',
      path: '/',
    });
  }
  if (!settings.sitemapConfig.enabled) {
    issues.push({
      code: 'sitemap-disabled',
      severity: 'critical',
      category: 'indexing',
      title: 'XML sitemap yayını kapalı',
      detail: 'Canonical ve indekslenebilir URL’lerin keşfi için sitemap yayınını açın.',
      path: '/sitemap.xml',
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
