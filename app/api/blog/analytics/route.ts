import { z } from 'zod';
import {
  classifyObviousBot,
  getAnalyticsAuthorizationBasis,
  getTransientRequestIp,
} from '@/lib/analytics';
import { analyticsCollectionModeForRequest } from '@/lib/analytics-consent-policy';
import { readAnalyticsCmsEnabled } from '@/lib/analytics-settings.server';
import {
  blogPublicJson,
  checkBlogDurableRateLimit,
  getBlogPrivacyHashSecret,
  isSameSiteBlogRequest,
} from '@/lib/blog/public-api';
import {
  hasSupabaseServiceRole,
  serverSupabase,
} from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const MAX_BODY_BYTES = 2048;
const metricSchema = z
  .object({
    eventId: z.string().uuid(),
    postId: z.string().uuid(),
    metric: z.enum(['view', 'engaged_view', 'read_seconds']),
    value: z.number().int().min(1).max(1800),
    authorizationVersion: z.string().trim().min(1).max(80),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.metric !== 'read_seconds' && value.value !== 1) {
      context.addIssue({
        code: 'custom',
        path: ['value'],
        message: 'Sayaç metriği yalnızca bir artırılabilir.',
      });
    }
  });

export async function POST(request: Request) {
  if (!isSameSiteBlogRequest(request)) {
    return blogPublicJson({ success: false }, 403);
  }
  if (
    process.env.ANALYTICS_V2_INGEST !== 'true' ||
    !hasSupabaseServiceRole ||
    !serverSupabase ||
    !getBlogPrivacyHashSecret()
  ) {
    return blogPublicJson({ success: false }, 503);
  }
  if (Number(request.headers.get('content-length') || 0) > MAX_BODY_BYTES) {
    return blogPublicJson({ success: false }, 413);
  }
  const raw = await request.text().catch(() => '');
  if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
    return blogPublicJson({ success: false }, 413);
  }
  let input: unknown;
  try {
    input = JSON.parse(raw);
  } catch {
    return blogPublicJson({ success: false }, 400);
  }
  const parsed = metricSchema.safeParse(input);
  if (!parsed.success) return blogPublicJson({ success: false }, 422);

  const basis = getAnalyticsAuthorizationBasis(
    parsed.data.authorizationVersion
  );
  if (!basis) return blogPublicJson({ success: false }, 422);
  if (
    basis === 'first-party-analytics' &&
    analyticsCollectionModeForRequest(request) !== 'first-party-analytics'
  ) {
    return blogPublicJson({ success: false }, 422);
  }
  if (!(await readAnalyticsCmsEnabled().catch(() => false))) {
    return blogPublicJson({ success: false }, 403);
  }
  if (
    classifyObviousBot(request.headers.get('user-agent') || '') ===
    'verified_bot'
  ) {
    return blogPublicJson({ success: true, data: { filtered: true } });
  }

  const transientIp = getTransientRequestIp(request);
  const fallbackAgent = (request.headers.get('user-agent') || '').slice(0, 500);
  const rateLimit = await checkBlogDurableRateLimit({
    key: `blog-metric:${transientIp || fallbackAgent}:${parsed.data.postId}`,
    limit: 120,
    windowSeconds: 60,
  });
  if (!rateLimit.allowed) {
    if ('unavailable' in rateLimit) {
      return blogPublicJson({ success: false }, 503);
    }
    return blogPublicJson(
      { success: false },
      429,
      { 'Retry-After': String(rateLimit.retryAfter) }
    );
  }

  const { data, error } = await serverSupabase.rpc('record_blog_post_metric', {
    p_event_id: parsed.data.eventId,
    p_post_id: parsed.data.postId,
    p_metric_type: parsed.data.metric,
    p_value: parsed.data.value,
  });
  if (error) {
    console.error('[blog-analytics] Aggregate metric failed', error.code);
    return blogPublicJson({ success: false }, 503);
  }
  return blogPublicJson({ success: true, data }, 202);
}

