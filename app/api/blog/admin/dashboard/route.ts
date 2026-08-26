import { requireBlogIdentity } from '@/lib/blog-auth';
import { blogAdminError, blogAdminJson } from '@/lib/blog/admin-api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const identity = await requireBlogIdentity({
      roles: ['owner', 'editor', 'author', 'viewer'],
    });
    const statuses = ['draft', 'review', 'scheduled', 'published', 'archived'];
    const statusQueries = statuses.map((status) =>
      identity.client
        .from('blog_posts')
        .select('id', { count: 'exact', head: true })
        .eq('status', status)
    );
    const [recent, ...statusResults] = await Promise.all([
      identity.client
        .from('blog_posts')
        .select('id, slug, title, status, updated_at, published_at')
        .order('updated_at', { ascending: false })
        .limit(6),
      ...statusQueries,
    ]);
    if (recent.error || statusResults.some((result) => result.error)) {
      throw recent.error || statusResults.find((result) => result.error)?.error;
    }

    let subscribers = 0;
    let views30d = 0;
    if (identity.role === 'owner' || identity.role === 'editor') {
      const since = new Date();
      since.setUTCDate(since.getUTCDate() - 30);
      const metricsResult = await identity.client
        .from('blog_post_metrics_daily')
        .select('views')
        .gte('metric_date', since.toISOString().slice(0, 10));
      if (metricsResult.error) throw metricsResult.error;
      views30d = (metricsResult.data || []).reduce(
        (total, row) => total + (Number(row.views) || 0),
        0
      );
      if (identity.role === 'owner') {
        const subscriberResult = await identity.client
          .from('blog_newsletter_subscribers')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active');
        if (subscriberResult.error) throw subscriberResult.error;
        subscribers = subscriberResult.count || 0;
      }
    }

    return blogAdminJson({
      role: identity.role,
      email: identity.email,
      counts: Object.fromEntries(
        statuses.map((status, index) => [
          status,
          statusResults[index]?.count || 0,
        ])
      ),
      subscribers,
      views30d,
      recentPosts: recent.data || [],
    });
  } catch (error) {
    return blogAdminError(error);
  }
}
