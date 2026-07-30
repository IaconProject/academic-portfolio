import { NextResponse } from 'next/server';
import {
  ANALYTICS_CONSENT_VERSION,
  ANALYTICS_MAX_BODY_BYTES,
  AnalyticsIngestResult,
  analyticsBatchSchema,
  buildAnalyticsRequestContext,
  classifyObviousBot,
  getAnalyticsHashSecret,
  getTransientRequestIp,
  groupAnalyticsEvents,
  hashAnalyticsIdentifier,
  isAnalyticsTimestampAccepted,
  normalizeAnalyticsPath,
  toDatabaseAnalyticsEvent,
} from '@/lib/analytics';
import { readAnalyticsCmsEnabled } from '@/lib/analytics-settings.server';
import {
  hasSupabaseServiceRole,
  serverSupabase,
} from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const COLLECTOR_VERSION = '2.0.0';
const RATE_LIMIT_PER_MINUTE = 120;
const RATE_LIMIT_PER_VISITOR_PER_MINUTE = 60;
const REJECTION_RECORD_LIMIT_PER_MINUTE = 30;

function responseHeaders(extra?: HeadersInit): HeadersInit {
  return {
    'Cache-Control': 'no-store, max-age=0',
    'X-Robots-Tag': 'noindex, nofollow',
    ...extra,
  };
}

function success(data: unknown, status = 202) {
  return NextResponse.json(
    { success: true, data },
    { status, headers: responseHeaders() }
  );
}

function failure(
  code: string,
  message: string,
  status: number,
  fields?: Record<string, string[]>,
  headers?: HeadersInit
) {
  return NextResponse.json(
    {
      success: false,
      error: { code, message, ...(fields ? { fields } : {}) },
    },
    { status, headers: responseHeaders(headers) }
  );
}

function requestSourceAllowed(request: Request): boolean {
  if (process.env.NODE_ENV !== 'production') return true;

  const configuredOrigin =
    process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || '';
  if (!configuredOrigin) return false;

  let expectedOrigin: string;
  try {
    expectedOrigin = new URL(configuredOrigin).origin;
  } catch {
    return false;
  }

  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const secFetchSite = request.headers.get('sec-fetch-site');

  if (secFetchSite && !['same-origin', 'same-site'].includes(secFetchSite)) {
    return false;
  }

  if (origin) return origin === expectedOrigin;
  if (referer) {
    try {
      return new URL(referer).origin === expectedOrigin;
    } catch {
      return false;
    }
  }
  return false;
}

async function checkDurableRateLimit(
  keyHash: string,
  limit: number,
  cost: number
): Promise<
  | { ok: true; remaining: number }
  | { ok: false; retryAfter: number }
  | { ok: false; unavailable: true }
> {
  if (!serverSupabase) return { ok: false, unavailable: true };

  const { data, error } = await serverSupabase.rpc(
    'check_analytics_rate_limit',
    {
      p_key_hash: keyHash,
      p_limit: limit,
      p_window_seconds: 60,
      p_cost: cost,
    }
  );

  if (error || !data || typeof data !== 'object') {
    console.error('[analytics] Rate limit RPC failed:', error?.code || 'INVALID_RESPONSE');
    return { ok: false, unavailable: true };
  }

  const result = data as {
    allowed?: boolean;
    remaining?: number;
    retry_after?: number;
  };
  if (!result.allowed) {
    return {
      ok: false,
      retryAfter: Math.max(1, Number(result.retry_after || 60)),
    };
  }
  return { ok: true, remaining: Math.max(0, Number(result.remaining || 0)) };
}

async function recordCollectorFailure(
  code: string,
  rejectedCount = 0
): Promise<void> {
  if (!serverSupabase) return;
  const { error } = await serverSupabase.rpc(
    'record_analytics_ingest_failure',
    {
      p_error_code: code.slice(0, 128),
      p_rejected_count: rejectedCount,
    }
  );
  if (error) {
    console.error(
      '[analytics] Failed to record collector health:',
      error.code
    );
  }
}

async function recordHttpRejection(
  request: Request,
  code: string
): Promise<void> {
  const transientIp = getTransientRequestIp(request);
  if (!transientIp || !getAnalyticsHashSecret()) return;

  const rateLimit = await checkDurableRateLimit(
    hashAnalyticsIdentifier(
      `http-rejection:${transientIp}`,
      'rate-limit'
    ),
    REJECTION_RECORD_LIMIT_PER_MINUTE,
    1
  );
  if (!rateLimit.ok) return;
  await recordCollectorFailure(`HTTP_${code}`, 1);
}

async function rejectedFailure(
  request: Request,
  code: string,
  message: string,
  status: number,
  fields?: Record<string, string[]>
) {
  await recordHttpRejection(request, code);
  return failure(code, message, status, fields);
}

export async function POST(request: Request) {
  if (process.env.ANALYTICS_V2_INGEST !== 'true') {
    return failure(
      'ANALYTICS_V2_DISABLED',
      'Analytics v2 collector özellik bayrağıyla kapatılmış.',
      503
    );
  }

  if (process.env.VERCEL_ENV === 'preview') {
    return success(
      { acceptedCount: 0, filtered: 'preview_environment' },
      200
    );
  }

  if (!requestSourceAllowed(request)) {
    return failure(
      'INVALID_REQUEST_SOURCE',
      'Analitik isteğinin kaynağı doğrulanamadı.',
      403
    );
  }

  if (!hasSupabaseServiceRole || !serverSupabase) {
    return failure(
      'ANALYTICS_STORAGE_UNAVAILABLE',
      'Analitik veri deposu production için yapılandırılmamış.',
      503
    );
  }

  if (!getAnalyticsHashSecret()) {
    return failure(
      'ANALYTICS_HASH_SECRET_MISSING',
      'Analitik pseudonimleştirme anahtarı yapılandırılmamış.',
      503
    );
  }

  try {
    const analyticsEnabled = await readAnalyticsCmsEnabled();
    if (!analyticsEnabled) {
      return failure(
        'ANALYTICS_DISABLED',
        'Analitik ölçüm yönetici tarafından kapatılmış.',
        403
      );
    }
  } catch (error) {
    console.error('[analytics] Failed to read analytics switch:', error);
    return failure(
      'ANALYTICS_CONFIGURATION_UNAVAILABLE',
      'Analitik ayarları doğrulanamadı.',
      503
    );
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > ANALYTICS_MAX_BODY_BYTES) {
    return rejectedFailure(
      request,
      'PAYLOAD_TOO_LARGE',
      'Analitik batch boyutu sınırı aşıldı.',
      413
    );
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return rejectedFailure(
      request,
      'INVALID_BODY',
      'İstek gövdesi okunamadı.',
      400
    );
  }
  if (Buffer.byteLength(rawBody, 'utf8') > ANALYTICS_MAX_BODY_BYTES) {
    return rejectedFailure(
      request,
      'PAYLOAD_TOO_LARGE',
      'Analitik batch boyutu sınırı aşıldı.',
      413
    );
  }

  let input: unknown;
  try {
    input = JSON.parse(rawBody);
  } catch {
    return rejectedFailure(
      request,
      'INVALID_JSON',
      'Geçerli bir JSON gövdesi bekleniyor.',
      400
    );
  }

  const parsed = analyticsBatchSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string[]> = {};
    parsed.error.issues.forEach((issue) => {
      const key = issue.path.join('.') || '_root';
      fields[key] = [...(fields[key] || []), issue.message];
    });
    return rejectedFailure(
      request,
      'VALIDATION_ERROR',
      'Analitik event sözleşmesi geçersiz.',
      422,
      fields
    );
  }

  if (parsed.data.consentVersion !== ANALYTICS_CONSENT_VERSION) {
    return rejectedFailure(
      request,
      'CONSENT_VERSION_MISMATCH',
      'Analitik izin metni güncellendi; yeniden izin alınmadan event kabul edilemez.',
      422
    );
  }

  const now = Date.now();
  for (const event of parsed.data.events) {
    if (
      !normalizeAnalyticsPath(event.path) ||
      !isAnalyticsTimestampAccepted(event.occurredAt, now)
    ) {
      return rejectedFailure(
        request,
        'INVALID_EVENT',
        'Event yolu veya zamanı kabul edilen aralığın dışında.',
        422
      );
    }
  }

  const detectedTrafficClass = classifyObviousBot(
    request.headers.get('user-agent') || ''
  );
  if (detectedTrafficClass === 'verified_bot') {
    return success({ acceptedCount: 0, filtered: 'verified_bot' }, 200);
  }
  const trafficClass =
    process.env.NODE_ENV === 'production' ? detectedTrafficClass : 'test';
  const requestContext = buildAnalyticsRequestContext(request);

  const groups = groupAnalyticsEvents(parsed.data.events);
  const visitorIds = Array.from(
    new Set(groups.map((group) => group.visitorId))
  ).sort();
  const transientIp = getTransientRequestIp(request);
  const rateLimitChecks = [
    ...(transientIp
      ? [
          checkDurableRateLimit(
            hashAnalyticsIdentifier(
              `network:${transientIp}`,
              'rate-limit'
            ),
            RATE_LIMIT_PER_MINUTE,
            parsed.data.events.length
          ),
        ]
      : []),
    ...visitorIds.map((visitorId) =>
      checkDurableRateLimit(
        hashAnalyticsIdentifier(
          `visitor:${visitorId}`,
          'rate-limit'
        ),
        RATE_LIMIT_PER_VISITOR_PER_MINUTE,
        groups.find((group) => group.visitorId === visitorId)?.events.length ||
          parsed.data.events.length
      )
    ),
  ];
  const rateLimits = await Promise.all(rateLimitChecks);

  if (rateLimits.some((result) => 'unavailable' in result)) {
    await recordCollectorFailure('RATE_LIMIT_RPC_UNAVAILABLE');
    return failure(
      'RATE_LIMIT_STORAGE_UNAVAILABLE',
      'Analitik koruma katmanı geçici olarak kullanılamıyor.',
      503
    );
  }

  const blockedLimits = rateLimits.filter(
    (result): result is { ok: false; retryAfter: number } =>
      !result.ok && !('unavailable' in result)
  );
  if (blockedLimits.length > 0) {
    const retryAfter = Math.max(
      ...blockedLimits.map((result) => result.retryAfter)
    );
    return failure(
      'RATE_LIMITED',
      'Çok fazla analitik event gönderildi.',
      429,
      undefined,
      { 'Retry-After': String(retryAfter) }
    );
  }

  const totals: AnalyticsIngestResult = {
    acceptedCount: 0,
    duplicateCount: 0,
    rejectedCount: 0,
  };

  for (const group of groups) {
    const visitorKey = hashAnalyticsIdentifier(
      group.visitorId,
      'visitor'
    );
    const databaseEvents = group.events.map(toDatabaseAnalyticsEvent);
    const { data, error } = await serverSupabase.rpc(
      'ingest_analytics_events',
      {
        p_visitor_key: visitorKey,
        p_client_session_id: group.sessionId,
        p_events: databaseEvents,
        p_context: {
          ...requestContext,
          collector_version: COLLECTOR_VERSION,
          consent_version: parsed.data.consentVersion,
          traffic_class: trafficClass,
        },
      }
    );

    if (error) {
      console.error('[analytics] Ingest RPC failed:', error.code);
      await recordCollectorFailure(`INGEST_RPC_${error.code || 'ERROR'}`);
      return failure(
        'ANALYTICS_INGEST_FAILED',
        'Analitik eventler kalıcı veri deposuna yazılamadı.',
        503
      );
    }

    const result = (data || {}) as {
      success?: boolean;
      error_code?: string;
      accepted_count?: number;
      duplicate_count?: number;
      rejected_count?: number;
    };
    if (result.success !== true) {
      console.error(
        '[analytics] Ingest RPC rejected the batch:',
        result.error_code || 'INVALID_RESPONSE'
      );
      return failure(
        'ANALYTICS_INGEST_REJECTED',
        'Analitik event batchi veri katmanı tarafından reddedildi.',
        503
      );
    }

    const acceptedCount = Number(result.accepted_count);
    const duplicateCount = Number(result.duplicate_count);
    const rejectedCount = Number(result.rejected_count);
    const counts = [acceptedCount, duplicateCount, rejectedCount];
    if (
      counts.some(
        (value) => !Number.isSafeInteger(value) || value < 0
      ) ||
      rejectedCount !== 0 ||
      acceptedCount + duplicateCount !== group.events.length
    ) {
      console.error('[analytics] Ingest RPC count invariant failed');
      return failure(
        'ANALYTICS_INGEST_INVARIANT_FAILED',
        'Analitik veri katmanı batch bütünlüğünü doğrulayamadı.',
        503
      );
    }

    totals.acceptedCount += acceptedCount;
    totals.duplicateCount += duplicateCount;
  }

  return success(totals, 202);
}
