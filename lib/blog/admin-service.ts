import 'server-only';

import type { BlogIdentity } from '@/lib/blog-auth';
import { prepareBlogDocument } from './document';
import type { BlogPostInput } from './admin-schema';

export async function persistBlogPost(
  identity: BlogIdentity,
  input: BlogPostInput,
  forcedId?: string
) {
  const prepared = prepareBlogDocument(input.contentHtml);
  const payload = {
    id: forcedId || input.id || '',
    locale: input.locale,
    slug: input.slug,
    title: input.title,
    subtitle: input.subtitle,
    excerpt: input.excerpt,
    content_json: input.contentJson,
    content_html: prepared.html,
    content_text: prepared.text,
    table_of_contents: prepared.tableOfContents,
    status: input.status,
    author_name: input.authorName,
    category_id: input.categoryId || '',
    series_id: input.seriesId || '',
    series_order: input.seriesOrder ?? '',
    cover_asset_id: input.coverAssetId || '',
    cover_image_url: input.coverImageUrl,
    cover_image_alt: input.coverImageAlt,
    canonical_url: input.canonicalUrl,
    seo_title: input.seoTitle,
    seo_description: input.seoDescription,
    focus_keyword: input.focusKeyword,
    related_keywords: input.relatedKeywords,
    tag_ids: input.tagIds,
    sources: input.sources.map((source, index) => ({
      citation_key: source.citationKey || `kaynak-${index + 1}`,
      title: source.title,
      authors: source.authors,
      publisher: source.publisher,
      publication_year: source.publicationYear ?? '',
      url: source.url,
      doi: source.doi,
      accessed_at: source.accessedAt,
      sort_order: index,
    })),
    is_featured: input.isFeatured,
    is_pinned: input.isPinned,
    sort_order: input.sortOrder,
    allow_indexing: input.allowIndexing,
    word_count: prepared.wordCount,
    reading_minutes: prepared.readingMinutes,
    published_at: input.publishedAt || '',
    scheduled_for: input.scheduledFor || '',
    change_summary: input.changeSummary,
  };

  const { data, error } = await identity.client.rpc('save_blog_post', {
    payload,
  });
  if (error) throw error;
  return {
    id: data as string,
    wordCount: prepared.wordCount,
    readingMinutes: prepared.readingMinutes,
    tableOfContents: prepared.tableOfContents,
  };
}
