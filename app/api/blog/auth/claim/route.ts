import { NextResponse } from 'next/server';
import { createSessionToken, ADMIN_SESSION_TTL_SECONDS } from '@/lib/auth-helpers';
import { BlogAuthError, requireBlogIdentity } from '@/lib/blog-auth';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const identity = await requireBlogIdentity({
      allowOwnerClaim: true,
      roles: ['owner', 'editor', 'author'],
    });

    // Temporary compatibility bridge for the existing portfolio CMS routes.
    // It is HttpOnly and every protected route is also gated by Supabase AAL2
    // in proxy.ts; the token is never exposed to localStorage.
    const legacyToken = createSessionToken(identity.email);
    const response = NextResponse.json(
      {
        success: true,
        data: {
          role: identity.role,
          email: identity.email,
        },
      },
      {
        headers: {
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        },
      }
    );
    response.cookies.set('admin_token', legacyToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: ADMIN_SESSION_TTL_SECONDS,
      path: '/',
    });
    return response;
  } catch (error) {
    if (error instanceof BlogAuthError) {
      return NextResponse.json(
        {
          success: false,
          error: { code: error.code, message: error.message },
        },
        { status: error.status }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'AUTH_SETUP_FAILED',
          message: 'Yönetici oturumu hazırlanamadı.',
        },
      },
      { status: 500 }
    );
  }
}
