import { NextResponse } from 'next/server';
import { hashNewsletterToken } from '@/lib/blog/newsletter-core';
import {
  blogPublicHeaders,
  blogPublicJson,
  isSameSiteBlogRequest,
} from '@/lib/blog/public-api';
import { absoluteUrl } from '@/lib/seo';
import {
  hasSupabaseServiceRole,
  serverSupabase,
} from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const url = new URL(request.url);
  let token = url.searchParams.get('token') || '';
  const contentType = request.headers.get('content-type') || '';
  const body = await request.text().catch(() => '');
  const oneClick =
    contentType.includes('application/x-www-form-urlencoded') &&
    new URLSearchParams(body).get('List-Unsubscribe') === 'One-Click' &&
    Boolean(token);

  if (!oneClick) {
    if (!isSameSiteBlogRequest(request)) {
      return blogPublicJson(
        {
          success: false,
          error: { code: 'INVALID_SOURCE', message: 'İstek kaynağı doğrulanamadı.' },
        },
        403
      );
    }
    if (!token && contentType.includes('application/x-www-form-urlencoded')) {
      token = new URLSearchParams(body).get('token') || '';
    }
  }

  let state = 'invalid';
  if (
    hasSupabaseServiceRole &&
    serverSupabase &&
    /^[A-Za-z0-9_-]{40,100}$/.test(token)
  ) {
    const { data } = await serverSupabase.rpc(
      'unsubscribe_blog_newsletter',
      { p_unsubscribe_token_hash: hashNewsletterToken(token) }
    );
    if (data && typeof data === 'object') {
      state = String((data as { state?: string }).state || 'invalid');
    }
  }

  if (oneClick) {
    return new NextResponse(null, {
      status: 204,
      headers: blogPublicHeaders(),
    });
  }
  const status =
    state === 'unsubscribed' || state === 'already_unsubscribed'
      ? 'basarili'
      : 'gecersiz';
  return NextResponse.redirect(
    absoluteUrl(`/blog/bulten/ayrildiniz?durum=${status}`),
    { status: 303, headers: blogPublicHeaders() }
  );
}

