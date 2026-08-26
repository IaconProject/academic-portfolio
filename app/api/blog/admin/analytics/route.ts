import { NextRequest } from 'next/server';
import { requireBlogIdentity } from '@/lib/blog-auth';
import { blogAdminError, blogAdminJson } from '@/lib/blog/admin-api';

export const dynamic = 'force-dynamic';

const allowedRanges = new Set([7, 30, 90, 365]);

export async function GET(request: NextRequest) {
  try {
    const identity = await requireBlogIdentity({ roles: ['owner', 'editor'] });
    const requested = Number.parseInt(
      request.nextUrl.searchParams.get('days') || '30',
      10
    );
    const days = allowedRanges.has(requested) ? requested : 30;
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - days + 1);

    const rows: Array<Record<string, any>> = [];
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await identity.client
        .from('blog_post_metrics_daily')
        .select(
          'post_id, metric_date, views, engaged_views, total_read_seconds, newsletter_signups, post:blog_posts(id, title, slug)'
        )
        .gte('metric_date', since.toISOString().slice(0, 10))
        .order('metric_date', { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) throw error;
      rows.push(...((data || []) as Array<Record<string, any>>));
      if ((data || []).length < pageSize) break;
    }

    const daily = new Map<
      string,
      { date: string; views: number; engagedViews: number; readSeconds: number; signups: number }
    >();
    for (let index = 0; index < days; index += 1) {
      const date = new Date(since);
      date.setUTCDate(since.getUTCDate() + index);
      const key = date.toISOString().slice(0, 10);
      daily.set(key, {
        date: key,
        views: 0,
        engagedViews: 0,
        readSeconds: 0,
        signups: 0,
      });
    }
    const posts = new Map<
      string,
      {
        id: string;
        title: string;
        slug: string;
        views: number;
        engagedViews: number;
        readSeconds: number;
        signups: number;
      }
    >();
    rows.forEach((row) => {
      const day = daily.get(String(row.metric_date));
      const views = Number(row.views) || 0;
      const engagedViews = Number(row.engaged_views) || 0;
      const readSeconds = Number(row.total_read_seconds) || 0;
      const signups = Number(row.newsletter_signups) || 0;
      if (day) {
        day.views += views;
        day.engagedViews += engagedViews;
        day.readSeconds += readSeconds;
        day.signups += signups;
      }
      const post = Array.isArray(row.post) ? row.post[0] : row.post;
      if (!post?.id) return;
      const current = posts.get(post.id) || {
        id: post.id,
        title: post.title || 'Başlıksız',
        slug: post.slug || '',
        views: 0,
        engagedViews: 0,
        readSeconds: 0,
        signups: 0,
      };
      current.views += views;
      current.engagedViews += engagedViews;
      current.readSeconds += readSeconds;
      current.signups += signups;
      posts.set(post.id, current);
    });

    const totals = Array.from(daily.values()).reduce(
      (total, day) => ({
        views: total.views + day.views,
        engagedViews: total.engagedViews + day.engagedViews,
        readSeconds: total.readSeconds + day.readSeconds,
        signups: total.signups + day.signups,
      }),
      { views: 0, engagedViews: 0, readSeconds: 0, signups: 0 }
    );

    return blogAdminJson({
      days,
      totals,
      engagementRate:
        totals.views > 0 ? totals.engagedViews / totals.views : 0,
      averageReadSeconds:
        totals.engagedViews > 0
          ? Math.round(totals.readSeconds / totals.engagedViews)
          : 0,
      daily: Array.from(daily.values()),
      posts: Array.from(posts.values())
        .sort((left, right) => right.views - left.views)
        .slice(0, 50),
      privacy: {
        aggregateOnly: true,
        rawIpStored: false,
        cookieFree: true,
      },
    });
  } catch (error) {
    return blogAdminError(error);
  }
}

