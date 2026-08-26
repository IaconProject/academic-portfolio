import { NextResponse } from 'next/server';
import { hashNewsletterToken } from '@/lib/blog/newsletter-core';
import { blogPublicHeaders } from '@/lib/blog/public-api';
import { absoluteUrl } from '@/lib/seo';
import {
  hasSupabaseServiceRole,
  serverSupabase,
} from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function confirmationRedirect(state: string) {
  const status =
    state === 'confirmed'
      ? 'basarili'
      : state === 'already_active'
        ? 'zaten-onayli'
        : state === 'expired'
          ? 'suresi-doldu'
          : 'gecersiz';
  return NextResponse.redirect(
    absoluteUrl(`/blog/bulten/onaylandi?durum=${status}`),
    { status: 303, headers: blogPublicHeaders() }
  );
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') || '';
  if (
    !hasSupabaseServiceRole ||
    !serverSupabase ||
    !/^[A-Za-z0-9_-]{40,100}$/.test(token)
  ) {
    return confirmationRedirect('invalid');
  }
  const { data, error } = await serverSupabase.rpc(
    'confirm_blog_newsletter_subscription',
    { p_confirmation_token_hash: hashNewsletterToken(token) }
  );
  if (error || !data || typeof data !== 'object') {
    return confirmationRedirect('invalid');
  }
  return confirmationRedirect(String((data as { state?: string }).state || 'invalid'));
}

