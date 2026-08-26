import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireBlogIdentity } from '@/lib/blog-auth';
import {
  blogNewsletterBroadcastInputSchema,
  blogNewsletterSubscriberActionSchema,
} from '@/lib/blog/admin-schema';
import { blogAdminError, blogAdminJson } from '@/lib/blog/admin-api';
import { prepareBlogDocument } from '@/lib/blog/document';
import { serverSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const subscriberStatuses = [
  'pending',
  'active',
  'unsubscribed',
  'bounced',
  'complained',
] as const;

export async function GET() {
  try {
    const identity = await requireBlogIdentity({ roles: ['owner'] });
    const statusQueries = subscriberStatuses.map((status) =>
      identity.client
        .from('blog_newsletter_subscribers')
        .select('id', { count: 'exact', head: true })
        .eq('status', status)
    );
    const [subscribersResult, broadcastsResult, ...counts] = await Promise.all([
      identity.client
        .from('blog_newsletter_subscribers')
        .select(
          'id, email, status, consent_version, source, locale, confirmed_at, unsubscribed_at, confirmation_sent_at, created_at, updated_at'
        )
        .order('created_at', { ascending: false })
        .limit(200),
      identity.client
        .from('blog_newsletter_broadcasts')
        .select(
          'id, title, subject, preview_text, content_json, content_html, content_text, status, scheduled_for, send_started_at, sent_at, recipient_count, error_message, created_at, updated_at'
        )
        .order('created_at', { ascending: false })
        .limit(50),
      ...statusQueries,
    ]);
    if (
      subscribersResult.error ||
      broadcastsResult.error ||
      counts.some((result) => result.error)
    ) {
      throw (
        subscribersResult.error ||
        broadcastsResult.error ||
        counts.find((result) => result.error)?.error
      );
    }

    const broadcastIds = (broadcastsResult.data || []).map((item) => item.id);
    const deliveryStats = new Map<string, Record<string, number>>();
    if (broadcastIds.length) {
      const pageSize = 1000;
      for (let from = 0; ; from += pageSize) {
        const { data, error } = await identity.client
          .from('blog_newsletter_deliveries')
          .select('broadcast_id, status')
          .in('broadcast_id', broadcastIds)
          .range(from, from + pageSize - 1);
        if (error) throw error;
        (data || []).forEach((delivery) => {
          const current = deliveryStats.get(delivery.broadcast_id) || {};
          current[delivery.status] = (current[delivery.status] || 0) + 1;
          deliveryStats.set(delivery.broadcast_id, current);
        });
        if ((data || []).length < pageSize) break;
      }
    }

    return blogAdminJson({
      stats: Object.fromEntries(
        subscriberStatuses.map((status, index) => [
          status,
          counts[index]?.count || 0,
        ])
      ),
      subscribers: subscribersResult.data || [],
      broadcasts: (broadcastsResult.data || []).map((broadcast) => ({
        ...broadcast,
        delivery_stats: deliveryStats.get(broadcast.id) || {},
      })),
      configuration: {
        resend: Boolean(process.env.RESEND_API_KEY?.trim()),
        sender: Boolean(process.env.BLOG_NEWSLETTER_FROM?.trim()),
        tokenSecret:
          Buffer.byteLength(
            process.env.BLOG_NEWSLETTER_TOKEN_SECRET?.trim() || '',
            'utf8'
          ) >= 32,
        webhook: Boolean(process.env.RESEND_WEBHOOK_SECRET?.trim()),
        engagementTracking:
          process.env.BLOG_NEWSLETTER_ENGAGEMENT_TRACKING === 'true',
      },
    });
  } catch (error) {
    return blogAdminError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const identity = await requireBlogIdentity({ roles: ['owner'] });
    const input = blogNewsletterBroadcastInputSchema.parse(await request.json());
    if (
      input.status === 'scheduled' &&
      (!input.scheduledFor || Date.parse(input.scheduledFor) <= Date.now())
    ) {
      throw new z.ZodError([
        {
          code: 'custom',
          path: ['scheduledFor'],
          message: 'Gönderim tarihi gelecekte olmalıdır.',
        },
      ]);
    }
    const prepared = prepareBlogDocument(input.contentHtml);
    if (!prepared.text) {
      throw new z.ZodError([
        { code: 'custom', path: ['contentHtml'], message: 'Bülten içeriği boş olamaz.' },
      ]);
    }
    const { data, error } = await identity.client
      .from('blog_newsletter_broadcasts')
      .insert({
        title: input.title,
        subject: input.subject,
        preview_text: input.previewText,
        content_json: input.contentJson,
        content_html: prepared.html,
        content_text: prepared.text,
        status: input.status,
        scheduled_for:
          input.status === 'scheduled' ? input.scheduledFor : null,
        created_by: identity.userId,
      })
      .select('*')
      .single();
    if (error) throw error;
    return blogAdminJson({ broadcast: data }, 201);
  } catch (error) {
    return blogAdminError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const identity = await requireBlogIdentity({ roles: ['owner'] });
    const input = blogNewsletterBroadcastInputSchema.parse(await request.json());
    const id = z.string().uuid().parse(input.id);
    if (
      input.status === 'scheduled' &&
      (!input.scheduledFor || Date.parse(input.scheduledFor) <= Date.now())
    ) {
      throw new z.ZodError([
        {
          code: 'custom',
          path: ['scheduledFor'],
          message: 'Gönderim tarihi gelecekte olmalıdır.',
        },
      ]);
    }
    const prepared = prepareBlogDocument(input.contentHtml);
    if (!prepared.text) {
      throw new z.ZodError([
        { code: 'custom', path: ['contentHtml'], message: 'Bülten içeriği boş olamaz.' },
      ]);
    }
    const { data, error } = await identity.client
      .from('blog_newsletter_broadcasts')
      .update({
        title: input.title,
        subject: input.subject,
        preview_text: input.previewText,
        content_json: input.contentJson,
        content_html: prepared.html,
        content_text: prepared.text,
        status: input.status,
        scheduled_for:
          input.status === 'scheduled' ? input.scheduledFor : null,
        error_message: '',
      })
      .eq('id', id)
      .in('status', ['draft', 'scheduled'])
      .select('*')
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'IMMUTABLE_BROADCAST',
            message: 'Gönderilmiş veya gönderilmekte olan bülten değiştirilemez.',
          },
        },
        { status: 409, headers: { 'Cache-Control': 'private, no-cache, no-store' } }
      );
    }
    return blogAdminJson({ broadcast: data });
  } catch (error) {
    return blogAdminError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireBlogIdentity({ roles: ['owner'] });
    const input = blogNewsletterSubscriberActionSchema.parse(
      await request.json()
    );
    if (!serverSupabase) throw new Error('SERVICE_ROLE_REQUIRED');
    const { data: subscriber, error } = await serverSupabase
      .from('blog_newsletter_subscribers')
      .update({
        status: 'unsubscribed',
        unsubscribed_at: new Date().toISOString(),
        confirmation_token_hash: null,
        confirmation_expires_at: null,
      })
      .eq('id', input.id)
      .select('id')
      .maybeSingle();
    if (error) throw error;
    if (subscriber) {
      const { error: eventError } = await serverSupabase
        .from('blog_newsletter_events')
        .insert({
          subscriber_id: subscriber.id,
          event_type: 'unsubscribed',
          metadata: { method: 'admin' },
        });
      if (eventError) throw eventError;
    }
    return blogAdminJson({ updated: true });
  } catch (error) {
    return blogAdminError(error);
  }
}
