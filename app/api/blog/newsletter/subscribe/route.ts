import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { classifyObviousBot } from '@/lib/analytics';
import {
  createNewsletterConfirmationToken,
  createNewsletterUnsubscribeToken,
  hashNewsletterToken,
  normalizeNewsletterEmail,
} from '@/lib/blog/newsletter-core';
import {
  getNewsletterTokenSecret,
  sendBlogNewsletterConfirmation,
} from '@/lib/blog/newsletter';
import {
  blogPublicJson,
  blogRequestPrivacyContext,
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

const MAX_BODY_BYTES = 4096;
const subscribeSchema = z
  .object({
    email: z.string().trim().min(3).max(320),
    source: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .regex(/^[a-z0-9:_-]+$/i)
      .default('blog'),
    locale: z.enum(['tr', 'en']).default('tr'),
    postId: z.string().uuid().optional(),
  })
  .strict();

const genericMessage =
  'E-posta adresi kayıt için uygunsa doğrulama bağlantısı gönderildi.';

export async function POST(request: Request) {
  if (!isSameSiteBlogRequest(request)) {
    return blogPublicJson(
      {
        success: false,
        error: { code: 'INVALID_SOURCE', message: 'İstek kaynağı doğrulanamadı.' },
      },
      403
    );
  }
  if (
    !hasSupabaseServiceRole ||
    !serverSupabase ||
    !getNewsletterTokenSecret() ||
    !getBlogPrivacyHashSecret()
  ) {
    return blogPublicJson(
      {
        success: false,
        error: {
          code: 'NEWSLETTER_UNAVAILABLE',
          message: 'Bülten kaydı şu anda kullanılamıyor.',
        },
      },
      503
    );
  }

  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return blogPublicJson(
      {
        success: false,
        error: { code: 'PAYLOAD_TOO_LARGE', message: 'İstek çok büyük.' },
      },
      413
    );
  }

  let rawBody = '';
  try {
    rawBody = await request.text();
  } catch {
    return blogPublicJson(
      {
        success: false,
        error: { code: 'INVALID_BODY', message: 'İstek okunamadı.' },
      },
      400
    );
  }
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
    return blogPublicJson(
      {
        success: false,
        error: { code: 'PAYLOAD_TOO_LARGE', message: 'İstek çok büyük.' },
      },
      413
    );
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    return blogPublicJson(
      {
        success: false,
        error: { code: 'INVALID_JSON', message: 'Geçerli JSON bekleniyor.' },
      },
      400
    );
  }
  const parsed = subscribeSchema.safeParse(parsedBody);
  const email = parsed.success
    ? normalizeNewsletterEmail(parsed.data.email)
    : null;
  if (!parsed.success || !email) {
    return blogPublicJson(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Geçerli bir e-posta adresi girin.',
        },
      },
      422
    );
  }

  if (
    classifyObviousBot(request.headers.get('user-agent') || '') ===
    'verified_bot'
  ) {
    return blogPublicJson(
      { success: true, data: { message: genericMessage } },
      202
    );
  }

  const privacy = blogRequestPrivacyContext(request);
  const rateChecks = [
    checkBlogDurableRateLimit({
      key: `newsletter-email:${email}`,
      limit: 3,
      windowSeconds: 15 * 60,
    }),
    ...(privacy.transientIp
      ? [
          checkBlogDurableRateLimit({
            key: `newsletter-ip:${privacy.transientIp}`,
            limit: 10,
            windowSeconds: 60 * 60,
          }),
        ]
      : []),
  ];
  const rateResults = await Promise.all(rateChecks);
  const unavailable = rateResults.some(
    (result) => !result.allowed && 'unavailable' in result
  );
  if (unavailable) {
    return blogPublicJson(
      {
        success: false,
        error: {
          code: 'RATE_LIMIT_UNAVAILABLE',
          message: 'Bülten kaydı şu anda kullanılamıyor.',
        },
      },
      503
    );
  }
  const limited = rateResults.find(
    (result) => !result.allowed && 'retryAfter' in result
  );
  if (limited && !limited.allowed && 'retryAfter' in limited) {
    return blogPublicJson(
      {
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Çok sık deneme yapıldı. Lütfen daha sonra yeniden deneyin.',
        },
      },
      429,
      { 'Retry-After': String(limited.retryAfter) }
    );
  }

  const { data: settings, error: settingsError } = await serverSupabase
    .from('blog_settings')
    .select('newsletter')
    .eq('id', 1)
    .single();
  if (settingsError) {
    return blogPublicJson(
      {
        success: false,
        error: { code: 'NEWSLETTER_UNAVAILABLE', message: 'Bülten ayarları okunamadı.' },
      },
      503
    );
  }
  const newsletter =
    settings?.newsletter && typeof settings.newsletter === 'object'
      ? (settings.newsletter as Record<string, unknown>)
      : {};
  if (newsletter.enabled === false) {
    return blogPublicJson(
      {
        success: false,
        error: { code: 'NEWSLETTER_DISABLED', message: 'Bülten kaydı kapalı.' },
      },
      403
    );
  }

  const tokenSecret = getNewsletterTokenSecret();
  const confirmationToken = createNewsletterConfirmationToken();
  const confirmationTokenHash = hashNewsletterToken(confirmationToken);
  const unsubscribeToken = createNewsletterUnsubscribeToken(
    email,
    tokenSecret
  );
  const doubleOptIn = newsletter.doubleOptIn !== false;
  const consentVersion =
    typeof newsletter.consentVersion === 'string' &&
    newsletter.consentVersion.trim()
      ? newsletter.consentVersion.trim().slice(0, 80)
      : '2026-08-24';

  const { data: subscriptionData, error: subscriptionError } =
    await serverSupabase.rpc('begin_blog_newsletter_subscription', {
      p_email: email,
      p_confirmation_token_hash: confirmationTokenHash,
      p_unsubscribe_token_hash: hashNewsletterToken(unsubscribeToken),
      p_confirmation_expires_at: new Date(
        Date.now() + 48 * 60 * 60 * 1000
      ).toISOString(),
      p_consent_version: consentVersion,
      p_source: parsed.data.source,
      p_locale: parsed.data.locale,
      p_ip_hash: privacy.ipHash,
      p_user_agent_hash: privacy.userAgentHash,
      p_double_opt_in: doubleOptIn,
    });
  if (subscriptionError || !subscriptionData) {
    console.error('[blog-newsletter] Subscription workflow failed', subscriptionError?.code);
    return blogPublicJson(
      {
        success: false,
        error: {
          code: 'SUBSCRIPTION_FAILED',
          message: 'Kayıt şu anda tamamlanamadı.',
        },
      },
      503
    );
  }
  const subscription = subscriptionData as {
    subscriber_id?: string;
    should_send_confirmation?: boolean;
    count_signup?: boolean;
  };

  if (subscription.count_signup && parsed.data.postId) {
    const { error: metricError } = await serverSupabase.rpc(
      'record_blog_post_metric',
      {
        p_event_id: randomUUID(),
        p_post_id: parsed.data.postId,
        p_metric_type: 'newsletter_signup',
        p_value: 1,
      }
    );
    if (metricError) {
      console.error('[blog-newsletter] Signup metric failed', metricError.code);
    }
  }

  if (
    subscription.should_send_confirmation === true &&
    subscription.subscriber_id
  ) {
    try {
      const result = await sendBlogNewsletterConfirmation({
        to: email,
        confirmationToken,
        subscriberId: subscription.subscriber_id,
        tokenHash: confirmationTokenHash,
      });
      const { error: sentEventError } = await serverSupabase.rpc(
        'record_blog_newsletter_confirmation_sent',
        {
          p_subscriber_id: subscription.subscriber_id,
          p_provider_email_id: result.providerEmailId,
        }
      );
      if (sentEventError) {
        console.error(
          '[blog-newsletter] Confirmation event failed',
          sentEventError.code
        );
      }
    } catch (error) {
      console.error(
        '[blog-newsletter] Confirmation delivery failed',
        error instanceof Error ? error.message.split(':')[0] : 'UNKNOWN'
      );
      return blogPublicJson(
        {
          success: false,
          error: {
            code: 'CONFIRMATION_SEND_FAILED',
            message: 'Doğrulama e-postası gönderilemedi. Lütfen daha sonra yeniden deneyin.',
          },
        },
        503
      );
    }
  }

  return blogPublicJson(
    { success: true, data: { message: genericMessage } },
    202
  );
}

