import { apiError, apiSuccess, rejectUnauthorized } from '@/lib/admin-api';
import { getAnalyticsHashSecret } from '@/lib/analytics';
import { readAnalyticsCmsEnabled } from '@/lib/analytics-settings.server';
import {
  hasSupabaseServiceRole,
  serverSupabase,
} from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const unauthorized = rejectUnauthorized(request);
  if (unauthorized) return unauthorized;

  let enabled = false;
  try {
    enabled = await readAnalyticsCmsEnabled();
  } catch (error) {
    return apiError(
      'ANALYTICS_CONFIGURATION_UNAVAILABLE',
      'Analitik ayarları okunamadı.',
      503
    );
  }

  const prerequisites = {
    enabled,
    ingestFeatureEnabled: process.env.ANALYTICS_V2_INGEST === 'true',
    serviceRoleConfigured: hasSupabaseServiceRole,
    hashSecretConfigured: Boolean(getAnalyticsHashSecret()),
  };

  if (!serverSupabase || !hasSupabaseServiceRole) {
    return apiError(
      'ANALYTICS_STORAGE_UNAVAILABLE',
      'Analytics v2 için Supabase service role yapılandırılmamış.',
      503,
      {
        SUPABASE_SERVICE_ROLE_KEY: [
          'Production ortamında server-only service role anahtarı zorunludur.',
        ],
      }
    );
  }

  const { data: ingestHealth, error: healthError } = await serverSupabase
    .from('analytics_ingest_health')
    .select(
      'accepted_batches, accepted_events, duplicate_events, rejected_events, failed_batches, last_success_at, last_failure_at, last_failure_code, updated_at'
    )
    .eq('id', 1)
    .maybeSingle();

  if (healthError || !ingestHealth) {
    return apiError(
      'ANALYTICS_SCHEMA_UNAVAILABLE',
      'Analytics v2 tabloları veya erişim izinleri doğrulanamadı.',
      503
    );
  }

  const prerequisitesReady =
    enabled &&
    prerequisites.ingestFeatureEnabled &&
    prerequisites.serviceRoleConfigured &&
    prerequisites.hashSecretConfigured;
  const lastSuccessAt = ingestHealth.last_success_at
    ? Date.parse(ingestHealth.last_success_at)
    : 0;
  const lastFailureAt = ingestHealth.last_failure_at
    ? Date.parse(ingestHealth.last_failure_at)
    : 0;
  const acceptedEvents = Number(ingestHealth.accepted_events || 0);
  const collectorIsStale =
    lastSuccessAt > 0 &&
    Date.now() - lastSuccessAt > 24 * 60 * 60 * 1000;

  return apiSuccess({
    status: !prerequisitesReady
      ? 'disabled'
      : lastFailureAt > lastSuccessAt
        ? 'degraded'
        : acceptedEvents === 0 || collectorIsStale
          ? 'idle'
        : 'healthy',
    prerequisites,
    storage: {
      reachable: true,
      eventCount: acceptedEvents,
      lastAcceptedAt: ingestHealth.last_success_at || null,
    },
    ingestion: {
      acceptedBatches: Number(ingestHealth.accepted_batches || 0),
      acceptedEvents: Number(ingestHealth.accepted_events || 0),
      duplicateEvents: Number(ingestHealth.duplicate_events || 0),
      rejectedEvents: Number(ingestHealth.rejected_events || 0),
      failedBatches: Number(ingestHealth.failed_batches || 0),
      lastSuccessAt: ingestHealth.last_success_at || null,
      lastFailureAt: ingestHealth.last_failure_at || null,
      lastFailureCode: ingestHealth.last_failure_code || null,
      updatedAt: ingestHealth.updated_at || null,
    },
    collectorVersion: '2.0.0',
    checkedAt: new Date().toISOString(),
  });
}
