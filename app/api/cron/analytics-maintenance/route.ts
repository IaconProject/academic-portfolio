import { NextResponse } from 'next/server';
import {
  hasSupabaseServiceRole,
  serverSupabase,
} from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60;

const HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  'X-Robots-Tag': 'noindex, nofollow',
};

function retentionDays(): number {
  const value = Number(process.env.ANALYTICS_RETENTION_DAYS || 425);
  return Number.isSafeInteger(value) && value >= 30 && value <= 3650
    ? value
    : 425;
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim() || '';
  const authorization = request.headers.get('authorization') || '';
  if (
    secret.length < 32 ||
    authorization !== `Bearer ${secret}`
  ) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Cron yetkilendirmesi geçersiz.',
        },
      },
      { status: 401, headers: HEADERS }
    );
  }

  if (!serverSupabase || !hasSupabaseServiceRole) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'ANALYTICS_STORAGE_UNAVAILABLE',
          message: 'Analytics service role yapılandırılmamış.',
        },
      },
      { status: 503, headers: HEADERS }
    );
  }

  const { data, error } = await serverSupabase.rpc(
    'run_analytics_maintenance',
    {
      p_retention_days: retentionDays(),
      p_timezone: 'Europe/Istanbul',
    }
  );

  if (error || !data) {
    console.error(
      '[analytics-maintenance] RPC failed:',
      error?.code || 'INVALID_RESPONSE'
    );
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'ANALYTICS_MAINTENANCE_FAILED',
          message: 'Analytics bakım işlemi tamamlanamadı.',
        },
      },
      { status: 503, headers: HEADERS }
    );
  }

  return NextResponse.json(
    { success: true, data },
    { headers: HEADERS }
  );
}
