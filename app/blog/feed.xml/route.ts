import { getAllPublishedBlogPosts, getBlogChrome } from '@/lib/blog/repository';
import { absoluteUrl } from '@/lib/seo';

export const revalidate = 300;

function xmlEscape(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const [{ settings }, posts] = await Promise.all([
    getBlogChrome(),
    getAllPublishedBlogPosts(),
  ]);
  const items = posts
    .map((post) => {
      const url = absoluteUrl(`/blog/${post.slug}`);
      return `<item>
  <title>${xmlEscape(post.title)}</title>
  <link>${xmlEscape(url)}</link>
  <guid isPermaLink="true">${xmlEscape(url)}</guid>
  <description>${xmlEscape(post.excerpt)}</description>
  <author>${xmlEscape(post.authorName)}</author>
  ${post.category ? `<category>${xmlEscape(post.category.name)}</category>` : ''}
  ${post.publishedAt ? `<pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>` : ''}
</item>`;
    })
    .join('\n');
  const lastBuildDate = posts[0]?.updatedAt || posts[0]?.publishedAt;
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${xmlEscape(settings.siteName)}</title>
  <link>${xmlEscape(absoluteUrl('/blog'))}</link>
  <atom:link href="${xmlEscape(absoluteUrl('/blog/feed.xml'))}" rel="self" type="application/rss+xml" />
  <description>${xmlEscape(settings.description)}</description>
  <language>tr-TR</language>
  ${lastBuildDate ? `<lastBuildDate>${new Date(lastBuildDate).toUTCString()}</lastBuildDate>` : ''}
  ${items}
</channel>
</rss>`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex',
    },
  });
}
