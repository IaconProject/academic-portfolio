import 'server-only';

import { hashNewsletterToken, createNewsletterUnsubscribeToken } from './newsletter-core';
import {
  getNewsletterTokenSecret,
  sendBlogNewsletterBatch,
} from './newsletter';
import { prepareBlogDocument } from './document';
import {
  hasSupabaseServiceRole,
  serverSupabase,
} from '@/lib/supabase/server';

interface BroadcastRow {
  id: string;
  title: string;
  subject: string;
  preview_text: string;
  content_html: string;
  content_text: string;
  status: string;
  scheduled_for: string | null;
}

interface SubscriberRow {
  id: string;
  email: string;
}

const PAGE_SIZE = 1000;
const RESEND_BATCH_SIZE = 100;

export class BlogNewsletterSendError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BlogNewsletterSendError';
  }
}

function requireServiceClient() {
  if (!hasSupabaseServiceRole || !serverSupabase) {
    throw new BlogNewsletterSendError(
      'Bülten veri deposu yapılandırılmamış.'
    );
  }
  return serverSupabase;
}

async function readActiveSubscribers(): Promise<SubscriberRow[]> {
  const client = requireServiceClient();
  const subscribers: SubscriberRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from('blog_newsletter_subscribers')
      .select('id, email')
      .eq('status', 'active')
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    subscribers.push(...((data || []) as SubscriberRow[]));
    if ((data || []).length < PAGE_SIZE) break;
  }
  return subscribers;
}

async function readDeliveredSubscriberIds(
  broadcastId: string
): Promise<Set<string>> {
  const client = requireServiceClient();
  const ids = new Set<string>();
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from('blog_newsletter_deliveries')
      .select('subscriber_id')
      .eq('broadcast_id', broadcastId)
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    (data || []).forEach((row) => ids.add(String(row.subscriber_id)));
    if ((data || []).length < PAGE_SIZE) break;
  }
  return ids;
}

async function markBroadcastFailed(id: string, error: unknown) {
  if (!serverSupabase) return;
  const code =
    error instanceof Error
      ? error.message.replace(/[^A-Z0-9:_-]/gi, '').slice(0, 240)
      : 'UNKNOWN_SEND_ERROR';
  await serverSupabase
    .from('blog_newsletter_broadcasts')
    .update({
      status: 'draft',
      error_message: code,
      send_started_at: null,
    })
    .eq('id', id);
}

export async function sendBlogNewsletterBroadcast(
  broadcastId: string,
  options: { allowEarly?: boolean } = {}
) {
  const client = requireServiceClient();
  const tokenSecret = getNewsletterTokenSecret();
  if (!tokenSecret) {
    throw new BlogNewsletterSendError(
      'BLOG_NEWSLETTER_TOKEN_SECRET yapılandırılmamış veya çok kısa.'
    );
  }

  const { data: claimed, error: claimError } = await client.rpc(
    'claim_blog_newsletter_broadcast',
    {
      p_broadcast_id: broadcastId,
      p_allow_early: options.allowEarly === true,
    }
  );
  if (claimError) throw claimError;
  if (claimed !== true) {
    throw new BlogNewsletterSendError(
      'Bülten gönderime uygun değil veya başka bir işlem tarafından gönderiliyor.'
    );
  }

  try {
    const { data: broadcastData, error: broadcastError } = await client
      .from('blog_newsletter_broadcasts')
      .select(
        'id, title, subject, preview_text, content_html, content_text, status, scheduled_for'
      )
      .eq('id', broadcastId)
      .single();
    if (broadcastError || !broadcastData) throw broadcastError;
    const broadcast = broadcastData as BroadcastRow;
    const prepared = prepareBlogDocument(broadcast.content_html);
    if (!prepared.text) {
      throw new BlogNewsletterSendError('Bülten içeriği boş olamaz.');
    }

    const [subscribers, alreadyDelivered] = await Promise.all([
      readActiveSubscribers(),
      readDeliveredSubscriberIds(broadcastId),
    ]);
    const pending = subscribers.filter(
      (subscriber) => !alreadyDelivered.has(subscriber.id)
    );

    for (let offset = 0; offset < pending.length; offset += RESEND_BATCH_SIZE) {
      const chunk = pending.slice(offset, offset + RESEND_BATCH_SIZE);
      const recipientData = chunk.map((subscriber) => {
        const unsubscribeToken = createNewsletterUnsubscribeToken(
          subscriber.email,
          tokenSecret
        );
        return {
          subscriber,
          unsubscribeToken,
          unsubscribeTokenHash: hashNewsletterToken(unsubscribeToken),
        };
      });

      const { data: tokenUpdateCount, error: tokenError } = await client.rpc(
        'set_blog_newsletter_unsubscribe_tokens',
        {
          p_tokens: recipientData.map((item) => ({
            subscriber_id: item.subscriber.id,
            token_hash: item.unsubscribeTokenHash,
          })),
        }
      );
      if (tokenError || Number(tokenUpdateCount) !== recipientData.length) {
        throw tokenError || new Error('UNSUBSCRIBE_TOKEN_UPDATE_INCOMPLETE');
      }

      const providerIds = await sendBlogNewsletterBatch({
        broadcastId,
        chunkKey: hashNewsletterToken(
          recipientData.map((item) => item.subscriber.id).join(':')
        ),
        recipients: recipientData.map((item) => ({
          subscriberId: item.subscriber.id,
          email: item.subscriber.email,
          unsubscribeToken: item.unsubscribeToken,
          title: broadcast.title,
          subject: broadcast.subject,
          previewText: broadcast.preview_text,
          contentHtml: prepared.html,
          contentText: prepared.text || broadcast.content_text,
        })),
      });
      const now = new Date().toISOString();
      const deliveries = recipientData.map((item, index) => ({
        broadcast_id: broadcastId,
        subscriber_id: item.subscriber.id,
        provider_email_id: providerIds[index],
        status: 'sent',
        last_event_at: now,
      }));
      const { error: deliveryError } = await client
        .from('blog_newsletter_deliveries')
        .upsert(deliveries, {
          onConflict: 'broadcast_id,subscriber_id',
          ignoreDuplicates: true,
        });
      if (deliveryError) throw deliveryError;

      const { error: eventError } = await client
        .from('blog_newsletter_events')
        .upsert(
          deliveries.map((delivery) => ({
            subscriber_id: delivery.subscriber_id,
            broadcast_id: delivery.broadcast_id,
            event_type: 'broadcast_sent',
            provider_event_id: `broadcast-sent:${delivery.provider_email_id}`,
            metadata: { providerEmailId: delivery.provider_email_id },
            occurred_at: now,
          })),
          { onConflict: 'provider_event_id', ignoreDuplicates: true }
        );
      if (eventError) throw eventError;
    }

    const { count: recipientCount, error: countError } = await client
      .from('blog_newsletter_deliveries')
      .select('id', { count: 'exact', head: true })
      .eq('broadcast_id', broadcastId);
    if (countError) throw countError;

    const { error: completionError } = await client
      .from('blog_newsletter_broadcasts')
      .update({
        status: 'sent',
        recipient_count: recipientCount || 0,
        sent_at: new Date().toISOString(),
        send_started_at: null,
        error_message: '',
      })
      .eq('id', broadcastId)
      .eq('status', 'sending');
    if (completionError) throw completionError;

    return {
      broadcastId,
      recipientCount: recipientCount || 0,
      sentNow: pending.length,
    };
  } catch (error) {
    await markBroadcastFailed(broadcastId, error);
    throw error;
  }
}
