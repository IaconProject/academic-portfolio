import type { NextRequest } from 'next/server';
import { updateSupabaseSession } from '@/lib/supabase/proxy';

export async function proxy(request: NextRequest) {
  return updateSupabaseSession(request);
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/api/cms/:path*',
    '/api/upload',
    '/api/messages',
    '/api/visitors',
    '/api/auth/change-password',
    '/api/blog/:path*',
    '/api/analytics/dashboard',
    '/api/analytics/export',
    '/api/analytics/health',
    '/api/analytics/maintenance',
    '/api/analytics/sessions',
  ],
};
