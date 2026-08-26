import { blogPublicJson } from '@/lib/blog/public-api';
import { verifyBlogNewsletterWebhook } from '@/lib/blog/newsletter';
import {
  hasSupabaseServiceRole,
  serverSupabase,
} from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const MAX_WEBHOOK_BYTES = 256 * 1024;
const supportedEvents = new Set([
  'email.delivered',
  'email.bounced',
  'email.complained',
  'email.failed',
  'email.suppressed',
]);

export async function POST(request: Request) {
  if (!hasSupabaseServiceRole || !serverSupabase) {
    return blogPublicJson({ success: false }, 503);
  }
  const length = Number(request.headers.get('content-length') || 0);
  if (length > MAX_WEBHOOK_BYTES) {
    return blogPublicJson({ success: false }, 413);
  }
  const payload = await request.text().catch(() => '');
  if (Buffer.byteLength(payload, 'utf8') > MAX_WEBHOOK_BYTES) {
    return blogPublicJson({ success: false }, 413);
  }
  const id = request.headers.get('svix-id') || '';
  const timestamp = request.headers.get('svix-timestamp') || '';
  const signature = request.headers.get('svix-signature') || '';
  if (!id || !timestamp || !signature) {
    return blogPublicJson({ success: false }, 400);
  }

  let event: ReturnType<typeof verifyBlogNewsletterWebhook>;
  try {
    event = verifyBlogNewsletterWebhook({
      payload,
      id,
      timestamp,
      signature,
    });
  } catch {
    return blogPublicJson({ success: false }, 400);
  }

  const eventType = String(event.type || '');
  if (
    !supportedEvents.has(eventType) &&
    !(
      process.env.BLOG_NEWSLETTER_ENGAGEMENT_TRACKING === 'true' &&
      ['email.opened', 'email.clicked'].includes(eventType)
    )
  ) {
    return blogPublicJson({ success: true, data: { ignored: true } });
  }
  const eventData = event.data as unknown as Record<string, unknown>;
  const providerEmailId =
    typeof eventData.email_id === 'string' ? eventData.email_id : '';
  const recipients = Array.isArray(eventData.to) ? eventData.to : [];
  const recipient =
    typeof recipients[0] === 'string' ? recipients[0].slice(0, 320) : '';
  if (!providerEmailId || !recipient) {
    return blogPublicJson({ success: false }, 422);
  }
  const bounce =
    eventData.bounce && typeof eventData.bounce === 'object'
      ? (eventData.bounce as Record<string, unknown>)
      : {};
  const metadata = {
    originalType: eventType,
    providerEmailId,
    ...(typeof bounce.type === 'string'
      ? { bounceType: bounce.type.slice(0, 80) }
      : {}),
    ...(typeof bounce.subType === 'string'
      ? { bounceSubtype: bounce.subType.slice(0, 120) }
      : {}),
  };
  const { error } = await serverSupabase.rpc(
    'record_blog_newsletter_provider_event',
    {
      p_provider_event_id: id,
      p_provider_email_id: providerEmailId,
      p_event_type: eventType,
      p_recipient_email: recipient,
      p_metadata: metadata,
      p_occurred_at:
        typeof event.created_at === 'string' ? event.created_at : new Date().toISOString(),
    }
  );
  if (error) {
    console.error('[blog-newsletter] Webhook workflow failed', error.code);
    return blogPublicJson({ success: false }, 503);
  }
  return blogPublicJson({ success: true });
}

