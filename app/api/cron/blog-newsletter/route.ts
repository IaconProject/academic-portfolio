import { NextResponse } from 'next/server';
import { sendBlogNewsletterBroadcast } from '@/lib/blog/newsletter-service';
import {
  hasSupabaseServiceRole,
  serverSupabase,
} from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim() || '';
  if (
    !secret ||
    request.headers.get('authorization') !== `Bearer ${secret}`
  ) {
    return NextResponse.json({ success: false }, { status: 401 });
  }
  if (!hasSupabaseServiceRole || !serverSupabase) {
    return NextResponse.json({ success: false }, { status: 503 });
  }
  const { error: cleanupError } = await serverSupabase.rpc(
    'cleanup_blog_newsletter_data'
  );
  if (cleanupError) {
    console.error('[blog-newsletter] Retention cleanup failed', cleanupError.code);
  }
  const { data, error } = await serverSupabase
    .from('blog_newsletter_broadcasts')
    .select('id')
    .eq('status', 'scheduled')
    .lte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(1);
  if (error) {
    return NextResponse.json({ success: false }, { status: 503 });
  }
  const due = data?.[0];
  if (!due) {
    return NextResponse.json({ success: true, sent: 0 });
  }
  try {
    const result = await sendBlogNewsletterBroadcast(due.id);
    return NextResponse.json({ success: true, sent: 1, result });
  } catch (sendError) {
    console.error(
      '[blog-newsletter] Scheduled send failed',
      sendError instanceof Error ? sendError.name : 'UNKNOWN'
    );
    return NextResponse.json({ success: false }, { status: 503 });
  }
}
