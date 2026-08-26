export type BlogPostStatus =
  | 'draft'
  | 'review'
  | 'scheduled'
  | 'published'
  | 'archived';

export interface BlogSettings {
  siteName: string;
  tagline: string;
  description: string;
  locale: 'tr' | 'en';
  postsPerPage: number;
  authorName: string;
  authorBio: string;
  socialLinks: Array<{ label: string; url: string }>;
  theme: Record<string, unknown>;
  seo: Record<string, unknown>;
  newsletter: {
    enabled: boolean;
    doubleOptIn: boolean;
    consentVersion: string;
    [key: string]: unknown;
  };
}

export interface BlogNavigationItem {
  id: string;
  location: 'header' | 'footer' | 'legal';
  parentId?: string;
  label: string;
  href: string;
  openInNewTab: boolean;
  sortOrder: number;
}

export interface BlogCategory {
  id: string;
  slug: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  seoTitle?: string;
  seoDescription?: string;
  sortOrder: number;
}

export interface BlogTag {
  id: string;
  slug: string;
  name: string;
  description: string;
}

export interface BlogSeries {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverImageUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  sortOrder: number;
  postCount?: number;
}

export interface BlogSource {
  id: string;
  citationKey: string;
  title: string;
  authors: string[];
  publisher: string;
  publicationYear?: number;
  url?: string;
  doi?: string;
  accessedAt?: string;
  sortOrder: number;
}

export interface BlogPostSummary {
  id: string;
  slug: string;
  locale: 'tr' | 'en';
  title: string;
  subtitle: string;
  excerpt: string;
  status: BlogPostStatus;
  authorName: string;
  coverImageUrl: string;
  coverImageAlt: string;
  category?: BlogCategory;
  series?: BlogSeries;
  tags: BlogTag[];
  isFeatured: boolean;
  isPinned: boolean;
  allowIndexing: boolean;
  publishedAt?: string;
  updatedAt?: string;
  readingMinutes: number;
}

export interface BlogPost extends BlogPostSummary {
  contentJson: Record<string, unknown>;
  contentHtml: string;
  contentText: string;
  tableOfContents: Array<{
    id: string;
    text: string;
    level: number;
  }>;
  canonicalUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  focusKeyword?: string;
  relatedKeywords: string[];
  sources: BlogSource[];
  relatedPosts: BlogPostSummary[];
  wordCount: number;
}

export interface BlogHomeSection {
  id: string;
  sectionType:
    | 'hero'
    | 'featured_posts'
    | 'latest_posts'
    | 'category_grid'
    | 'series_spotlight'
    | 'newsletter'
    | 'rich_text';
  internalName: string;
  heading: string;
  subheading: string;
  sortOrder: number;
  config: Record<string, unknown>;
}

export interface BlogChromeData {
  settings: BlogSettings;
  navigation: BlogNavigationItem[];
}

export interface BlogHomeData extends BlogChromeData {
  sections: BlogHomeSection[];
  featuredPosts: BlogPostSummary[];
  latestPosts: BlogPostSummary[];
  categories: BlogCategory[];
  series: BlogSeries[];
}

export interface BlogArchiveQuery {
  q?: string;
  category?: string;
  tag?: string;
  series?: string;
  page?: number;
  pageSize?: number;
}

export interface BlogArchiveResult {
  posts: BlogPostSummary[];
  categories: BlogCategory[];
  tags: BlogTag[];
  series: BlogSeries[];
  query: Required<Pick<BlogArchiveQuery, 'q' | 'category' | 'tag' | 'series'>>;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
