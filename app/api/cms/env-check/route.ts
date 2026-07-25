import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/cms/env-check
 * Diagnostic endpoint to verify environment variables are loaded on the server.
 * Does NOT expose actual secret values — only confirms presence/absence.
 */
export async function GET() {
  const resendKey = process.env.RESEND_API_KEY || '';
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    env: {
      RESEND_API_KEY: resendKey
        ? { present: true, prefix: resendKey.substring(0, 6), length: resendKey.length }
        : { present: false },
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl
        ? { present: true, value: supabaseUrl }
        : { present: false },
      NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnon
        ? { present: true, prefix: supabaseAnon.substring(0, 10), length: supabaseAnon.length }
        : { present: false },
    },
    nodeEnvKeys: Object.keys(process.env)
      .filter(k => k.includes('RESEND') || k.includes('SUPABASE'))
      .sort(),
  });
}
