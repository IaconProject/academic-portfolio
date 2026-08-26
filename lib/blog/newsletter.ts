import 'server-only';

import { Resend, type CreateBatchOptions, type WebhookEventPayload } from 'resend';
import { absoluteUrl } from '@/lib/seo';
import {
  buildNewsletterBroadcastMessage,
  buildNewsletterConfirmationMessage,
} from './newsletter-core';

export class BlogNewsletterConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BlogNewsletterConfigurationError';
  }
}

function configuredValue(name: string): string {
  return process.env[name]?.trim() || '';
}

export function getNewsletterTokenSecret(): string {
  const secret = configuredValue('BLOG_NEWSLETTER_TOKEN_SECRET');
  return Buffer.byteLength(secret, 'utf8') >= 32 ? secret : '';
}

export function getNewsletterSender(): string {
  return (
    configuredValue('BLOG_NEWSLETTER_FROM') ||
    'Muhammed Akan Blog <noreply@muhammedakan.com>'
  );
}

function newsletterReplyTo(): string | undefined {
  return configuredValue('BLOG_NEWSLETTER_REPLY_TO') || undefined;
}

function resendClient(): Resend {
  const key = configuredValue('RESEND_API_KEY');
  if (!key) {
    throw new BlogNewsletterConfigurationError(
      'RESEND_API_KEY yapılandırılmamış.'
    );
  }
  return new Resend(key);
}

export async function sendBlogNewsletterConfirmation({
  to,
  confirmationToken,
  subscriberId,
  tokenHash,
}: {
  to: string;
  confirmationToken: string;
  subscriberId: string;
  tokenHash: string;
}) {
  const confirmationUrl = absoluteUrl(
    `/api/blog/newsletter/confirm?token=${encodeURIComponent(confirmationToken)}`
  );
  const message = buildNewsletterConfirmationMessage({
    confirmationUrl,
    privacyUrl: absoluteUrl('/gizlilik'),
  });
  const result = await resendClient().emails.send(
    {
      from: getNewsletterSender(),
      to,
      replyTo: newsletterReplyTo(),
      subject: message.subject,
      html: message.html,
      text: message.text,
      tags: [
        { name: 'category', value: 'blog-confirmation' },
        { name: 'subscriber', value: subscriberId.replace(/-/g, '') },
      ],
    },
    {
      idempotencyKey: `blog-confirmation/${subscriberId}/${tokenHash.slice(0, 24)}`,
    }
  );
  if (result.error || !result.data?.id) {
    throw new Error(
      `NEWSLETTER_CONFIRMATION_SEND_FAILED:${result.error?.name || 'unknown'}`
    );
  }
  return { providerEmailId: result.data.id };
}

export interface BlogBroadcastRecipientMessage {
  subscriberId: string;
  email: string;
  unsubscribeToken: string;
  title: string;
  subject: string;
  previewText: string;
  contentHtml: string;
  contentText: string;
}

export async function sendBlogNewsletterBatch({
  broadcastId,
  chunkKey,
  recipients,
}: {
  broadcastId: string;
  chunkKey: string;
  recipients: BlogBroadcastRecipientMessage[];
}) {
  const payload: CreateBatchOptions = recipients.map((recipient) => {
    const unsubscribeApiUrl = absoluteUrl(
      `/api/blog/newsletter/unsubscribe?token=${encodeURIComponent(
        recipient.unsubscribeToken
      )}`
    );
    const unsubscribePageUrl = absoluteUrl(
      `/blog/bulten/ayril?token=${encodeURIComponent(
        recipient.unsubscribeToken
      )}`
    );
    const message = buildNewsletterBroadcastMessage({
      title: recipient.title,
      previewText: recipient.previewText,
      contentHtml: recipient.contentHtml,
      contentText: recipient.contentText,
      unsubscribePageUrl,
      privacyUrl: absoluteUrl('/gizlilik'),
    });
    return {
      from: getNewsletterSender(),
      to: recipient.email,
      replyTo: newsletterReplyTo(),
      subject: recipient.subject,
      html: message.html,
      text: message.text,
      headers: {
        'List-Unsubscribe': `<${unsubscribeApiUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      tags: [
        { name: 'category', value: 'blog-broadcast' },
        { name: 'broadcast', value: broadcastId.replace(/-/g, '') },
        {
          name: 'subscriber',
          value: recipient.subscriberId.replace(/-/g, ''),
        },
      ],
    };
  });

  const result = await resendClient().batch.send(payload, {
    idempotencyKey: `blog-broadcast/${broadcastId}/${chunkKey.slice(0, 48)}`,
  });
  if (result.error || !result.data) {
    throw new Error(
      `NEWSLETTER_BROADCAST_SEND_FAILED:${result.error?.name || 'unknown'}`
    );
  }
  if (result.data.data.length !== recipients.length) {
    throw new Error('NEWSLETTER_BROADCAST_INCOMPLETE_RESPONSE');
  }
  return result.data.data.map((item) => item.id);
}

export function verifyBlogNewsletterWebhook({
  payload,
  id,
  timestamp,
  signature,
}: {
  payload: string;
  id: string;
  timestamp: string;
  signature: string;
}): WebhookEventPayload {
  const webhookSecret = configuredValue('RESEND_WEBHOOK_SECRET');
  if (!webhookSecret) {
    throw new BlogNewsletterConfigurationError(
      'RESEND_WEBHOOK_SECRET yapılandırılmamış.'
    );
  }
  return resendClient().webhooks.verify({
    payload,
    headers: { id, timestamp, signature },
    webhookSecret,
  });
}
