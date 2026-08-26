import 'server-only';

import { cache } from 'react';
import { getSeoExperienceData } from '@/lib/seo-repository';
import { isContentPublished, normalizeSeoSettings } from '@/lib/seo';
import { serverSupabase } from '@/lib/supabase/server';
import type {
  BlogArchiveQuery,
  BlogArchiveResult,
  BlogCategory,
  BlogChromeData,
  BlogHomeData,
  BlogHomeSection,
  BlogNavigationItem,
  BlogPost,
  BlogPostSummary,
  BlogSeries,
  BlogSettings,
  BlogSource,
  BlogTag,
} from './types';

const POST_SUMMARY_SELECT = `
  id,
  slug,
  locale,
  title,
  subtitle,
  excerpt,
  status,
  author_name,
  cover_image_url,
  cover_image_alt,
  is_featured,
  is_pinned,
  allow_indexing,
  published_at,
  updated_at,
  reading_minutes,
  category:blog_categories(*),
  series:blog_series(*),
  cover_asset:blog_assets(id, object_path, alt_text)
`;

const DEFAULT_SETTINGS: BlogSettings = {
  siteName: 'Muhammed Akan Blog',
  tagline: 'Blok zinciri, kripto paralar ve yapay zekâyı temelden anlayın.',
  description:
    'Bitcoin, blok zinciri, kripto paralar, yapay zekâ ve bu alanların arkasındaki teknolojiler üzerine kaynaklı ve anlaşılır yazılar.',
  locale: 'tr',
  postsPerPage: 12,
  authorName: 'Muhammed Akan',
  authorBio: '',
  socialLinks: [],
  theme: { accent: 'amber', density: 'comfortable', radius: 'soft' },
  seo: { titleTemplate: '%s | Muhammed Akan Blog', indexing: true },
  newsletter: {
    enabled: true,
    doubleOptIn: true,
    consentVersion: '2026-08-24',
  },
};

const DEFAULT_NAVIGATION: BlogNavigationItem[] = [
  {
    id: 'default-blog',
    location: 'header',
    label: 'Blog',
    href: '/blog',
    openInNewTab: false,
    sortOrder: 10,
  },
  {
    id: 'default-archive',
    location: 'header',
    label: 'Arşiv',
    href: '/blog/arsiv',
    openInNewTab: false,
    sortOrder: 20,
  },
  {
    id: 'default-series',
    location: 'header',
    label: 'Seriler',
    href: '/blog/seriler',
    openInNewTab: false,
    sortOrder: 30,
  },
  {
    id: 'default-portfolio',
    location: 'header',
    label: 'Portfolyo',
    href: '/',
    openInNewTab: false,
    sortOrder: 40,
  },
  {
    id: 'default-privacy',
    location: 'footer',
    label: 'Gizlilik',
    href: '/gizlilik',
    openInNewTab: false,
    sortOrder: 10,
  },
  {
    id: 'default-rss',
    location: 'footer',
    label: 'RSS',
    href: '/blog/feed.xml',
    openInNewTab: false,
    sortOrder: 20,
  },
];

const DEFAULT_SECTIONS: BlogHomeSection[] = [
  {
    id: 'default-hero',
    sectionType: 'hero',
    internalName: 'Ana karşılama',
    heading: 'Teknolojiyi ezberlemeden anlayın',
    subheading:
      'Blok zinciri, Bitcoin, kripto paralar ve yapay zekânın nasıl çalıştığını kaynaklarıyla keşfedin.',
    sortOrder: 10,
    config: { showSearch: true, showTopics: true },
  },
  {
    id: 'default-featured',
    sectionType: 'featured_posts',
    internalName: 'Öne çıkan yazılar',
    heading: 'Öne çıkanlar',
    subheading: 'Editörün seçtiği başlangıç yazıları.',
    sortOrder: 20,
    config: { limit: 3, layout: 'editorial' },
  },
  {
    id: 'default-latest',
    sectionType: 'latest_posts',
    internalName: 'Son yazılar',
    heading: 'Yeni yayınlananlar',
    subheading: 'En güncel açıklamalar ve araştırma notları.',
    sortOrder: 30,
    config: { limit: 6 },
  },
  {
    id: 'default-categories',
    sectionType: 'category_grid',
    internalName: 'Konu haritası',
    heading: 'Konulara göre keşfet',
    subheading: 'İlgi alanınıza göre bir öğrenme yolu seçin.',
    sortOrder: 40,
    config: { limit: 6 },
  },
  {
    id: 'default-newsletter',
    sectionType: 'newsletter',
    internalName: 'Bülten çağrısı',
    heading: 'Yeni yazıları kaçırmayın',
    subheading: 'Yeni teknik incelemeler yayınlandığında e-posta alın.',
    sortOrder: 50,
    config: { variant: 'panel' },
  },
];

function record(value: unknown): Record<string, any> | undefined {
  if (Array.isArray(value)) return value[0] as Record<string, any> | undefined;
  if (value && typeof value === 'object') return value as Record<string, any>;
  return undefined;
}

function publicAssetUrl(objectPath?: string) {
  if (!objectPath || !serverSupabase) return '';
  return serverSupabase.storage.from('blog-media').getPublicUrl(objectPath).data
    .publicUrl;
}

function mapSettings(row?: Record<string, any>): BlogSettings {
  if (!row) return DEFAULT_SETTINGS;
  const socialLinks = Array.isArray(row.social_links)
    ? row.social_links.filter(
        (item: unknown) =>
          item &&
          typeof item === 'object' &&
          typeof (item as Record<string, unknown>).label === 'string' &&
          typeof (item as Record<string, unknown>).url === 'string'
      )
    : [];
  const newsletter =
    row.newsletter && typeof row.newsletter === 'object'
      ? row.newsletter
      : DEFAULT_SETTINGS.newsletter;

  return {
    siteName: row.site_name || DEFAULT_SETTINGS.siteName,
    tagline: row.tagline || DEFAULT_SETTINGS.tagline,
    description: row.description || DEFAULT_SETTINGS.description,
    locale: row.locale === 'en' ? 'en' : 'tr',
    postsPerPage: Number(row.posts_per_page) || DEFAULT_SETTINGS.postsPerPage,
    authorName: row.author_name || DEFAULT_SETTINGS.authorName,
    authorBio: row.author_bio || '',
    socialLinks,
    theme:
      row.theme && typeof row.theme === 'object'
        ? row.theme
        : DEFAULT_SETTINGS.theme,
    seo:
      row.seo && typeof row.seo === 'object' ? row.seo : DEFAULT_SETTINGS.seo,
    newsletter: {
      ...DEFAULT_SETTINGS.newsletter,
      ...newsletter,
      enabled: newsletter.enabled !== false,
      doubleOptIn: newsletter.doubleOptIn !== false,
      consentVersion:
        typeof newsletter.consentVersion === 'string'
          ? newsletter.consentVersion
          : DEFAULT_SETTINGS.newsletter.consentVersion,
    },
  };
}

function mapNavigation(row: Record<string, any>): BlogNavigationItem {
  return {
    id: row.id,
    location:
      row.location === 'legal'
        ? 'legal'
        : row.location === 'footer'
          ? 'footer'
          : 'header',
    parentId: row.parent_id || undefined,
    label: row.label,
    href: row.href,
    openInNewTab: row.open_in_new_tab ?? false,
    sortOrder: row.sort_order ?? 0,
  };
}

function mapCategory(row?: Record<string, any>): BlogCategory | undefined {
  if (!row?.id || !row.slug || !row.name) return undefined;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description || '',
    color: row.color || 'amber',
    icon: row.icon || 'folder',
    seoTitle: row.seo_title || undefined,
    seoDescription: row.seo_description || undefined,
    sortOrder: row.sort_order ?? 0,
  };
}

function mapTag(row?: Record<string, any>): BlogTag | undefined {
  if (!row?.id || !row.slug || !row.name) return undefined;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description || '',
  };
}

function mapSeries(row?: Record<string, any>): BlogSeries | undefined {
  if (!row?.id || !row.slug || !row.title) return undefined;
  const coverAsset = record(row.cover_asset);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description || '',
    coverImageUrl: publicAssetUrl(coverAsset?.object_path) || undefined,
    seoTitle: row.seo_title || undefined,
    seoDescription: row.seo_description || undefined,
    sortOrder: row.sort_order ?? 0,
    postCount: typeof row.post_count === 'number' ? row.post_count : undefined,
  };
}

function mapSummary(row: Record<string, any>): BlogPostSummary {
  const coverAsset = record(row.cover_asset);
  const tagLinks = Array.isArray(row.blog_post_tags)
    ? row.blog_post_tags
    : [];
  const tags = tagLinks
    .map((link: unknown) => mapTag(record(record(link)?.tag)))
    .filter((tag: BlogTag | undefined): tag is BlogTag => Boolean(tag));

  return {
    id: row.id,
    slug: row.slug,
    locale: row.locale === 'en' ? 'en' : 'tr',
    title: row.title,
    subtitle: row.subtitle || '',
    excerpt: row.excerpt || '',
    status: row.status || 'draft',
    authorName: row.author_name || DEFAULT_SETTINGS.authorName,
    coverImageUrl:
      publicAssetUrl(coverAsset?.object_path) || row.cover_image_url || '',
    coverImageAlt:
      coverAsset?.alt_text || row.cover_image_alt || row.title || '',
    category: mapCategory(record(row.category)),
    series: mapSeries(record(row.series)),
    tags,
    isFeatured: row.is_featured ?? false,
    isPinned: row.is_pinned ?? false,
    allowIndexing: row.allow_indexing ?? true,
    publishedAt: row.published_at || undefined,
    updatedAt: row.updated_at || undefined,
    readingMinutes: Math.max(1, Number(row.reading_minutes) || 1),
  };
}

function mapHomeSection(row: Record<string, any>): BlogHomeSection {
  return {
    id: row.id,
    sectionType: row.section_type,
    internalName: row.internal_name,
    heading: row.heading || '',
    subheading: row.subheading || '',
    sortOrder: row.sort_order ?? 0,
    config:
      row.config && typeof row.config === 'object' ? row.config : {},
  };
}

function publishedArticles(
  articles: Awaited<ReturnType<typeof getSeoExperienceData>>['articles']
) {
  return (articles || []).filter(
    (item) =>
      item.locale === 'tr' && isContentPublished(item.status, item.publishedAt)
  );
}

function mapLegacySummary(
  item: NonNullable<
    Awaited<ReturnType<typeof getSeoExperienceData>>['articles']
  >[number]
): BlogPostSummary {
  return {
    id: item.id,
    slug: item.slug,
    locale: item.locale,
    title: item.title,
    subtitle: '',
    excerpt: item.excerpt || '',
    status: item.status === 'scheduled' ? 'scheduled' : 'published',
    authorName: item.authorName || DEFAULT_SETTINGS.authorName,
    coverImageUrl: item.coverImageUrl || '',
    coverImageAlt: item.coverImageAlt || item.title,
    tags: [],
    isFeatured: item.isFeatured ?? false,
    isPinned: false,
    allowIndexing: true,
    publishedAt: item.publishedAt,
    updatedAt: item.updatedAt,
    readingMinutes: Math.max(
      1,
      Math.ceil((item.content || '').trim().split(/\s+/).filter(Boolean).length / 200)
    ),
  };
}

async function legacyChrome(): Promise<BlogChromeData> {
  const data = await getSeoExperienceData();
  const seo = normalizeSeoSettings(data.seoSettings, data.profile.fullName);
  return {
    settings: {
      ...DEFAULT_SETTINGS,
      siteName: 'Muhammed Akan Blog',
      description: seo.metaDescription,
      authorName: seo.authorName,
    },
    navigation: DEFAULT_NAVIGATION,
  };
}

export const getBlogChrome = cache(async (): Promise<BlogChromeData> => {
  if (!serverSupabase) return legacyChrome();
  try {
    const [settingsResult, navigationResult] = await Promise.all([
      serverSupabase.from('blog_settings').select('*').eq('id', 1).maybeSingle(),
      serverSupabase
        .from('blog_navigation_items')
        .select('*')
        .eq('is_visible', true)
        .order('sort_order'),
    ]);
    if (settingsResult.error || navigationResult.error) return legacyChrome();
    return {
      settings: mapSettings(settingsResult.data || undefined),
      navigation: navigationResult.data?.length
        ? navigationResult.data.map(mapNavigation)
        : DEFAULT_NAVIGATION,
    };
  } catch {
    return legacyChrome();
  }
});

async function fetchTaxonomy() {
  if (!serverSupabase) {
    return { categories: [], tags: [], series: [] };
  }
  const [categoriesResult, tagsResult, seriesResult] = await Promise.all([
    serverSupabase
      .from('blog_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order'),
    serverSupabase
      .from('blog_tags')
      .select('*')
      .eq('is_active', true)
      .order('name'),
    serverSupabase
      .from('blog_series')
      .select('*, cover_asset:blog_assets(object_path)')
      .eq('is_active', true)
      .order('sort_order'),
  ]);

  if (categoriesResult.error || tagsResult.error || seriesResult.error) {
    return { categories: [], tags: [], series: [] };
  }
  return {
    categories: (categoriesResult.data || [])
      .map(mapCategory)
      .filter((item): item is BlogCategory => Boolean(item)),
    tags: (tagsResult.data || [])
      .map(mapTag)
      .filter((item): item is BlogTag => Boolean(item)),
    series: (seriesResult.data || [])
      .map(mapSeries)
      .filter((item): item is BlogSeries => Boolean(item)),
  };
}

function publicPostQuery(limit: number) {
  const now = new Date().toISOString();
  return serverSupabase!
    .from('blog_posts')
    .select(POST_SUMMARY_SELECT)
    .eq('locale', 'tr')
    .or(`status.eq.published,and(status.eq.scheduled,scheduled_for.lte.${now})`)
    .lte('published_at', now)
    .order('is_pinned', { ascending: false })
    .order('is_featured', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('published_at', { ascending: false })
    .limit(limit);
}

export const getBlogHomeData = cache(async (): Promise<BlogHomeData> => {
  const chrome = await getBlogChrome();
  if (!serverSupabase) {
    const legacy = await getSeoExperienceData();
    const posts = publishedArticles(legacy.articles).map(mapLegacySummary);
    return {
      ...chrome,
      sections: DEFAULT_SECTIONS,
      featuredPosts: posts.filter((post) => post.isFeatured).slice(0, 3),
      latestPosts: posts.slice(0, 6),
      categories: [],
      series: [],
    };
  }

  try {
    const [sectionsResult, postsResult, taxonomy] = await Promise.all([
      serverSupabase
        .from('blog_home_sections')
        .select('*')
        .eq('is_enabled', true)
        .order('sort_order'),
      publicPostQuery(18),
      fetchTaxonomy(),
    ]);
    if (sectionsResult.error || postsResult.error) throw new Error('fallback');
    const posts = (postsResult.data || []).map(mapSummary);
    return {
      ...chrome,
      sections: sectionsResult.data?.length
        ? sectionsResult.data.map(mapHomeSection)
        : DEFAULT_SECTIONS,
      featuredPosts: posts.filter((post) => post.isFeatured).slice(0, 6),
      latestPosts: posts.slice(0, 12),
      ...taxonomy,
    };
  } catch {
    const legacy = await getSeoExperienceData();
    const posts = publishedArticles(legacy.articles).map(mapLegacySummary);
    return {
      ...chrome,
      sections: DEFAULT_SECTIONS,
      featuredPosts: posts.filter((post) => post.isFeatured).slice(0, 3),
      latestPosts: posts.slice(0, 6),
      categories: [],
      series: [],
    };
  }
});

export const getBlogArchive = cache(
  async (input: BlogArchiveQuery = {}): Promise<BlogArchiveResult> => {
    const chrome = await getBlogChrome();
    const q = (input.q || '').trim().slice(0, 120);
    const category = (input.category || '').trim().slice(0, 100);
    const tag = (input.tag || '').trim().slice(0, 100);
    const series = (input.series || '').trim().slice(0, 100);
    const pageSize = Math.min(
      48,
      Math.max(3, Number(input.pageSize) || chrome.settings.postsPerPage)
    );
    const requestedPage = Math.max(1, Number(input.page) || 1);

    if (!serverSupabase) {
      const legacy = await getSeoExperienceData();
      const allPosts = publishedArticles(legacy.articles)
        .map(mapLegacySummary)
        .filter((post) => {
          const haystack = `${post.title} ${post.excerpt}`.toLocaleLowerCase('tr');
          return !q || haystack.includes(q.toLocaleLowerCase('tr'));
        });
      const total = allPosts.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const page = Math.min(requestedPage, totalPages);
      return {
        posts: allPosts.slice((page - 1) * pageSize, page * pageSize),
        categories: [],
        tags: [],
        series: [],
        query: { q, category, tag, series },
        page,
        pageSize,
        total,
        totalPages,
      };
    }

    try {
      const taxonomy = await fetchTaxonomy();
      const selectedCategory = taxonomy.categories.find(
        (item) => item.slug === category
      );
      const selectedSeries = taxonomy.series.find((item) => item.slug === series);
      const selectedTag = taxonomy.tags.find((item) => item.slug === tag);
      let taggedPostIds: string[] | null = null;
      if (tag) {
        if (!selectedTag) taggedPostIds = [];
        else {
          const tagLinks = await serverSupabase
            .from('blog_post_tags')
            .select('post_id')
            .eq('tag_id', selectedTag.id);
          taggedPostIds = (tagLinks.data || []).map((item) => item.post_id);
        }
      }

      if (
        (category && !selectedCategory) ||
        (series && !selectedSeries) ||
        (taggedPostIds && taggedPostIds.length === 0)
      ) {
        return {
          posts: [],
          ...taxonomy,
          query: { q, category, tag, series },
          page: 1,
          pageSize,
          total: 0,
          totalPages: 1,
        };
      }

      const now = new Date().toISOString();
      let query = serverSupabase
        .from('blog_posts')
        .select(POST_SUMMARY_SELECT, { count: 'exact' })
        .eq('locale', 'tr')
        .or(
          `status.eq.published,and(status.eq.scheduled,scheduled_for.lte.${now})`
        )
        .lte('published_at', now);

      if (q) {
        query = query.textSearch('search_vector', q, {
          config: 'turkish',
          type: 'websearch',
        });
      }
      if (selectedCategory) query = query.eq('category_id', selectedCategory.id);
      if (selectedSeries) query = query.eq('series_id', selectedSeries.id);
      if (taggedPostIds) query = query.in('id', taggedPostIds);

      const countResult = await query;
      if (countResult.error) throw countResult.error;
      const total = countResult.count ?? 0;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const page = Math.min(requestedPage, totalPages);
      const from = (page - 1) * pageSize;

      let pageQuery = serverSupabase
        .from('blog_posts')
        .select(POST_SUMMARY_SELECT)
        .eq('locale', 'tr')
        .or(
          `status.eq.published,and(status.eq.scheduled,scheduled_for.lte.${now})`
        )
        .lte('published_at', now);
      if (q) {
        pageQuery = pageQuery.textSearch('search_vector', q, {
          config: 'turkish',
          type: 'websearch',
        });
      }
      if (selectedCategory) {
        pageQuery = pageQuery.eq('category_id', selectedCategory.id);
      }
      if (selectedSeries) pageQuery = pageQuery.eq('series_id', selectedSeries.id);
      if (taggedPostIds) pageQuery = pageQuery.in('id', taggedPostIds);

      const pageResult = await pageQuery
        .order('is_pinned', { ascending: false })
        .order('is_featured', { ascending: false })
        .order('published_at', { ascending: false })
        .range(from, from + pageSize - 1);
      if (pageResult.error) throw pageResult.error;

      return {
        posts: (pageResult.data || []).map(mapSummary),
        ...taxonomy,
        query: { q, category, tag, series },
        page,
        pageSize,
        total,
        totalPages,
      };
    } catch {
      const legacy = await getSeoExperienceData();
      const allPosts = publishedArticles(legacy.articles)
        .map(mapLegacySummary)
        .filter((post) => {
          const haystack = `${post.title} ${post.excerpt}`.toLocaleLowerCase('tr');
          return !q || haystack.includes(q.toLocaleLowerCase('tr'));
        });
      const total = allPosts.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const page = Math.min(requestedPage, totalPages);
      return {
        posts: allPosts.slice((page - 1) * pageSize, page * pageSize),
        categories: [],
        tags: [],
        series: [],
        query: { q, category, tag, series },
        page,
        pageSize,
        total,
        totalPages,
      };
    }
  }
);

function mapSource(row: Record<string, any>): BlogSource {
  return {
    id: row.id,
    citationKey: row.citation_key,
    title: row.title,
    authors: row.authors || [],
    publisher: row.publisher || '',
    publicationYear: row.publication_year || undefined,
    url: row.url || undefined,
    doi: row.doi || undefined,
    accessedAt: row.accessed_at || undefined,
    sortOrder: row.sort_order ?? 0,
  };
}

export const getBlogPostBySlug = cache(
  async (slug: string): Promise<BlogPost | null> => {
    if (!serverSupabase) {
      const legacy = await getSeoExperienceData();
      const item = publishedArticles(legacy.articles).find(
        (article) => article.slug === slug
      );
      if (!item) return null;
      const summary = mapLegacySummary(item);
      return {
        ...summary,
        contentJson: { type: 'doc', content: [] },
        contentHtml: '',
        contentText: item.content || '',
        tableOfContents: [],
        relatedKeywords: item.relatedKeywords || [],
        sources: (item.references || []).map((reference, index) => ({
          id: `legacy-${index}`,
          citationKey: `legacy-${index + 1}`,
          title: reference,
          authors: [],
          publisher: '',
          url: reference.startsWith('http') ? reference : undefined,
          sortOrder: index,
        })),
        relatedPosts: [],
        wordCount: (item.content || '').split(/\s+/).filter(Boolean).length,
      };
    }

    try {
      const now = new Date().toISOString();
      const result = await serverSupabase
        .from('blog_posts')
        .select(
          `${POST_SUMMARY_SELECT}, content_json, content_html, content_text, table_of_contents, canonical_url, seo_title, seo_description, focus_keyword, related_keywords, word_count, category_id`
        )
        .eq('locale', 'tr')
        .eq('slug', slug)
        .or(
          `status.eq.published,and(status.eq.scheduled,scheduled_for.lte.${now})`
        )
        .lte('published_at', now)
        .maybeSingle();
      if (result.error || !result.data) throw result.error || new Error('missing');

      const row = result.data as Record<string, any>;
      const [sourcesResult, tagsResult, relatedResult] = await Promise.all([
        serverSupabase
          .from('blog_post_sources')
          .select('*')
          .eq('post_id', row.id)
          .order('sort_order'),
        serverSupabase
          .from('blog_post_tags')
          .select('tag:blog_tags(*)')
          .eq('post_id', row.id),
        row.category_id
          ? serverSupabase
              .from('blog_posts')
              .select(POST_SUMMARY_SELECT)
              .eq('category_id', row.category_id)
              .neq('id', row.id)
              .eq('locale', 'tr')
              .or(
                `status.eq.published,and(status.eq.scheduled,scheduled_for.lte.${now})`
              )
              .lte('published_at', now)
              .order('published_at', { ascending: false })
              .limit(3)
          : Promise.resolve({ data: [], error: null }),
      ]);

      const summary = mapSummary({
        ...row,
        blog_post_tags: tagsResult.data || [],
      });
      return {
        ...summary,
        contentJson:
          row.content_json && typeof row.content_json === 'object'
            ? row.content_json
            : { type: 'doc', content: [] },
        contentHtml: row.content_html || '',
        contentText: row.content_text || '',
        tableOfContents: Array.isArray(row.table_of_contents)
          ? row.table_of_contents
          : [],
        canonicalUrl: row.canonical_url || undefined,
        seoTitle: row.seo_title || undefined,
        seoDescription: row.seo_description || undefined,
        focusKeyword: row.focus_keyword || undefined,
        relatedKeywords: row.related_keywords || [],
        sources: (sourcesResult.data || []).map(mapSource),
        relatedPosts: (relatedResult.data || []).map(mapSummary),
        wordCount: Number(row.word_count) || 0,
      };
    } catch {
      const legacy = await getSeoExperienceData();
      const item = publishedArticles(legacy.articles).find(
        (article) => article.slug === slug
      );
      if (!item) return null;
      const summary = mapLegacySummary(item);
      return {
        ...summary,
        contentJson: { type: 'doc', content: [] },
        contentHtml: '',
        contentText: item.content || '',
        tableOfContents: [],
        relatedKeywords: item.relatedKeywords || [],
        sources: (item.references || []).map((reference, index) => ({
          id: `legacy-${index}`,
          citationKey: `legacy-${index + 1}`,
          title: reference,
          authors: [],
          publisher: '',
          url: reference.startsWith('http') ? reference : undefined,
          sortOrder: index,
        })),
        relatedPosts: [],
        wordCount: (item.content || '').split(/\s+/).filter(Boolean).length,
      };
    }
  }
);

export const getAllPublishedBlogPosts = cache(async () => {
  const archive = await getBlogArchive({ page: 1, pageSize: 48 });
  if (archive.total <= 48 || !serverSupabase) return archive.posts;

  const pages = [archive.posts];
  for (let page = 2; page <= Math.ceil(archive.total / 48); page += 1) {
    const result = await getBlogArchive({ page, pageSize: 48 });
    pages.push(result.posts);
  }
  return pages.flat();
});
