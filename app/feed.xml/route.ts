import { getSeoExperienceData } from '@/lib/seo-repository';
import { absoluteUrl, isContentPublished, plainText } from '@/lib/seo';

export const revalidate = 300;

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const data = await getSeoExperienceData();
  const articles = (data.articles || []).filter((item) =>
    item.locale === 'tr' && isContentPublished(item.status, item.publishedAt)
  );
  const items = articles
    .map(
      (item) => `<item>
  <title>${xmlEscape(item.title)}</title>
  <link>${absoluteUrl(`/yazilar/${item.slug}`)}</link>
  <guid isPermaLink="true">${absoluteUrl(`/yazilar/${item.slug}`)}</guid>
  <description>${xmlEscape(item.excerpt || plainText(item.content))}</description>
  ${item.publishedAt ? `<pubDate>${new Date(item.publishedAt).toUTCString()}</pubDate>` : ''}
</item>`
    )
    .join('\n');
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>${xmlEscape(data.seoSettings.siteName || data.profile.fullName)}</title>
  <link>${absoluteUrl('/')}</link>
  <description>${xmlEscape(data.seoSettings.metaDescription)}</description>
  <language>tr-TR</language>
  ${items}
</channel>
</rss>`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
      'X-Robots-Tag': 'noindex',
    },
  });
}
