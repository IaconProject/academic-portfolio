import { apiError, apiSuccess, rejectUnauthorized } from '@/lib/admin-api';
import {
  hasSupabaseServiceRole,
  serverSupabase,
} from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60;

function retentionDays(): number {
  const value = Number(process.env.ANALYTICS_RETENTION_DAYS || 425);
  return Number.isSafeInteger(value) && value >= 30 && value <= 3650
    ? value
    : 425;
}

function requireStorage() {
  if (serverSupabase && hasSupabaseServiceRole) return null;
  return apiError(
    'ANALYTICS_STORAGE_UNAVAILABLE',
    'Analytics service role yapılandırılmamış.',
    503
  );
}

export async function GET(request: Request) {
  const unauthorized = rejectUnauthorized(request);
  if (unauthorized) return unauthorized;
  const unavailable = requireStorage();
  if (unavailable) return unavailable;

  const [{ data: quality, error: qualityError }, { data: rollup, error: rollupError }] =
    await Promise.all([
      serverSupabase!
        .from('analytics_quality_runs')
        .select(
          'id, window_started_at, window_ended_at, status, score, metrics, flags, created_at'
        )
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      serverSupabase!
        .from('analytics_daily_rollups')
        .select('bucket_date, timezone, updated_at')
        .order('bucket_date', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (qualityError || rollupError) {
    return apiError(
      'ANALYTICS_OPERATIONS_UNAVAILABLE',
      'Analytics operasyon tabloları okunamadı.',
      503
    );
  }

  return apiSuccess({
    latestQualityRun: quality || null,
    latestRollup: rollup || null,
    retentionDays: retentionDays(),
  });
}

export async function POST(request: Request) {
  const unauthorized = rejectUnauthorized(request);
  if (unauthorized) return unauthorized;
  const unavailable = requireStorage();
  if (unavailable) return unavailable;

  const { data, error } = await serverSupabase!.rpc(
    'run_analytics_maintenance',
    {
      p_retention_days: retentionDays(),
      p_timezone: 'Europe/Istanbul',
    }
  );
  if (error || !data) {
    console.error(
      '[analytics-maintenance] Manual RPC failed:',
      error?.code || 'INVALID_RESPONSE'
    );
    return apiError(
      'ANALYTICS_MAINTENANCE_FAILED',
      'Analytics bakım işlemi tamamlanamadı.',
      503
    );
  }

  return apiSuccess(data);
}
