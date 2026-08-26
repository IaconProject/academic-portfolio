import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { validateAdminSession } from '@/lib/auth-helpers';
import {
  isSupabaseAuthConfigured,
  supabasePublicUrl,
  supabasePublishableKey,
} from './config';

function isProtectedAdminPath(pathname: string) {
  if (pathname === '/admin/login') return false;
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return true;

  return (
    pathname.startsWith('/api/admin/') ||
    pathname === '/api/cms' ||
    pathname.startsWith('/api/cms/') ||
    pathname === '/api/upload' ||
    pathname === '/api/messages' ||
    pathname === '/api/visitors' ||
    pathname === '/api/auth/change-password' ||
    pathname.startsWith('/api/blog/admin/') ||
    [
      '/api/analytics/dashboard',
      '/api/analytics/export',
      '/api/analytics/health',
      '/api/analytics/maintenance',
      '/api/analytics/sessions',
    ].includes(pathname)
  );
}

function isBlogCmsPath(pathname: string) {
  return (
    pathname === '/admin/blog' ||
    pathname.startsWith('/admin/blog/') ||
    pathname.startsWith('/api/blog/admin/')
  );
}

function copyAuthResponseHeaders(source: NextResponse, target: NextResponse) {
  source.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'location') target.headers.set(key, value);
  });
  return target;
}

export async function updateSupabaseSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  if (!isSupabaseAuthConfigured) return supabaseResponse;

  const supabase = createServerClient(
    supabasePublicUrl,
    supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
          Object.entries(headers).forEach(([key, value]) => {
            supabaseResponse.headers.set(key, value);
          });
        },
      },
    }
  );

  // Keep this call adjacent to client creation. It validates the JWT and may
  // rotate cookies used by Server Components and Route Handlers.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!isProtectedAdminPath(request.nextUrl.pathname)) {
    return supabaseResponse;
  }

  const isApiRequest = request.nextUrl.pathname.startsWith('/api/');
  const hasLegacyTransitionAccess =
    process.env.ALLOW_LEGACY_ADMIN_LOGIN === 'true' &&
    !isBlogCmsPath(request.nextUrl.pathname) &&
    validateAdminSession(request);
  if (hasLegacyTransitionAccess) return supabaseResponse;

  const requiresMfa = process.env.BLOG_REQUIRE_MFA !== 'false';
  const hasRequiredAssurance = !requiresMfa || claims?.aal === 'aal2';

  if (!claims?.sub || !hasRequiredAssurance) {
    if (isApiRequest) {
      return copyAuthResponseHeaders(
        supabaseResponse,
        NextResponse.json(
          {
            success: false,
            error: {
              code: claims?.sub ? 'MFA_REQUIRED' : 'UNAUTHORIZED',
              message: claims?.sub
                ? 'İki aşamalı doğrulama gerekli.'
                : 'Kimlik doğrulaması gerekli.',
            },
          },
          { status: 401 }
        )
      );
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/admin/login';
    loginUrl.search = claims?.sub ? '?step=mfa' : '';
    return copyAuthResponseHeaders(
      supabaseResponse,
      NextResponse.redirect(loginUrl)
    );
  }

  return supabaseResponse;
}
