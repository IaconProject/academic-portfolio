import 'server-only';

import { createHmac } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getTransientRequestIp } from '@/lib/analytics';
import { getSiteUrl } from '@/lib/seo';
import { serverSupabase } from '@/lib/supabase/server';

export function blogPublicHeaders(extra?: HeadersInit): HeadersInit {
  return {
    'Cache-Control': 'no-store, max-age=0',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
    ...extra,
  };
}

export function blogPublicJson(
  body: unknown,
  status = 200,
  extraHeaders?: HeadersInit
) {
  return NextResponse.json(body, {
    status,
    headers: blogPublicHeaders(extraHeaders),
  });
}

export function isSameSiteBlogRequest(request: Request): boolean {
  if (process.env.NODE_ENV !== 'production') return true;

  let expectedOrigin: string;
  try {
    expectedOrigin = new URL(getSiteUrl()).origin;
  } catch {
    return false;
  }

  const secFetchSite = request.headers.get('sec-fetch-site');
  if (secFetchSite && !['same-origin', 'same-site'].includes(secFetchSite)) {
    return false;
  }
  const origin = request.headers.get('origin');
  if (origin) return origin === expectedOrigin;
  const referer = request.headers.get('referer');
  if (!referer) return false;
  try {
    return new URL(referer).origin === expectedOrigin;
  } catch {
    return false;
  }
}

export function getBlogPrivacyHashSecret(): string {
  const secret =
    process.env.BLOG_PRIVACY_HASH_SECRET?.trim() ||
    process.env.ANALYTICS_HASH_SECRET?.trim() ||
    '';
  return Buffer.byteLength(secret, 'utf8') >= 32 ? secret : '';
}

export function hashBlogPrivateIdentifier(
  value: string,
  purpose: 'newsletter-ip' | 'newsletter-user-agent' | 'rate-limit'
): string {
  const secret = getBlogPrivacyHashSecret();
  if (!secret) throw new Error('BLOG_PRIVACY_HASH_SECRET_NOT_CONFIGURED');
  return createHmac('sha256', secret)
    .update(`${purpose}:${value}`, 'utf8')
    .digest('hex');
}

export function blogRequestPrivacyContext(request: Request) {
  const ip = getTransientRequestIp(request);
  const userAgent = (request.headers.get('user-agent') || '').slice(0, 1000);
  return {
    transientIp: ip,
    ipHash: ip ? hashBlogPrivateIdentifier(ip, 'newsletter-ip') : '',
    userAgentHash: userAgent
      ? hashBlogPrivateIdentifier(userAgent, 'newsletter-user-agent')
      : '',
  };
}

export async function checkBlogDurableRateLimit({
  key,
  limit,
  windowSeconds,
  cost = 1,
}: {
  key: string;
  limit: number;
  windowSeconds: number;
  cost?: number;
}): Promise<
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfter: number }
  | { allowed: false; unavailable: true }
> {
  if (!serverSupabase) return { allowed: false, unavailable: true };
  const keyHash = hashBlogPrivateIdentifier(key, 'rate-limit');
  const { data, error } = await serverSupabase.rpc(
    'check_analytics_rate_limit',
    {
      p_key_hash: keyHash,
      p_limit: limit,
      p_window_seconds: windowSeconds,
      p_cost: cost,
    }
  );
  if (error || !data || typeof data !== 'object') {
    console.error('[blog-public] Durable rate limit unavailable', error?.code);
    return { allowed: false, unavailable: true };
  }
  const result = data as {
    allowed?: boolean;
    remaining?: number;
    retry_after?: number;
  };
  if (result.allowed !== true) {
    return {
      allowed: false,
      retryAfter: Math.max(1, Number(result.retry_after || windowSeconds)),
    };
  }
  return {
    allowed: true,
    remaining: Math.max(0, Number(result.remaining || 0)),
  };
}

