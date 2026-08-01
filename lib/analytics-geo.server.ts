import 'server-only';

import {
  AnalyticsRequestContext,
  getAnalyticsHashSecret,
  getTransientRequestIp,
  hashAnalyticsIdentifier,
} from './analytics';
import {
  AnalyticsIpGeoResolution,
  buildIpApiUrl,
  isPublicAnalyticsIp,
  mergeAnalyticsIpGeo,
  parseIpApiResolution,
} from './analytics-ip-geo';
import {
  hasSupabaseServiceRole,
  serverSupabase,
} from './supabase/server';

const IP_API_TIMEOUT_MS = 2_000;
const IP_API_MAX_RESPONSE_BYTES = 16 * 1024;
const IP_API_FREE_RATE_LIMIT = 40;
const FIXED_NETWORK_CACHE_MS = 24 * 60 * 60 * 1000;
const MOBILE_NETWORK_CACHE_MS = 2 * 60 * 60 * 1000;

let providerBlockedUntil = 0;

type GeoProviderOutcome =
  | 'success'
  | 'timeout'
  | 'rate_limited'
  | 'http_error'
  | 'invalid_response'
  | 'network_error';

export function getAnalyticsGeoRuntimeStatus() {
  const apiKeyConfigured = Boolean(process.env.IP_API_KEY?.trim());
  return {
    enabled: process.env.ANALYTICS_IP_GEO_ENABLED !== 'false',
    provider: 'ip-api' as const,
    transport: apiKeyConfigured ? ('https' as const) : ('http' as const),
    secureTransport: apiKeyConfigured,
    apiKeyConfigured,
    timeoutMs: IP_API_TIMEOUT_MS,
    cacheTtlHours: {
      mobile: MOBILE_NETWORK_CACHE_MS / (60 * 60 * 1000),
      fixed: FIXED_NETWORK_CACHE_MS / (60 * 60 * 1000),
    },
    blockedUntil:
      providerBlockedUntil > Date.now()
        ? new Date(providerBlockedUntil).toISOString()
        : null,
  };
}

type GeoCacheRow = {
  country_code: string;
  country_name: string | null;
  region: string | null;
  city: string | null;
  isp_name: string | null;
  network_organization: string | null;
  asn: string | null;
  is_mobile_network: boolean | null;
  is_proxy: boolean | null;
  is_hosting: boolean | null;
  geo_confidence: 'medium' | 'low';
};

function resolutionFromCache(row: GeoCacheRow): AnalyticsIpGeoResolution {
  return {
    countryCode: row.country_code,
    countryName: row.country_name,
    region: row.region,
    city: row.city,
    ispName: row.isp_name,
    networkOrganization: row.network_organization,
    asn: row.asn,
    isMobileNetwork: row.is_mobile_network,
    isProxy: row.is_proxy,
    isHosting: row.is_hosting,
    confidence: row.geo_confidence,
  };
}

async function readCachedResolution(
  ipHash: string
): Promise<AnalyticsIpGeoResolution | null> {
  if (!serverSupabase) return null;
  const { data, error } = await serverSupabase
    .from('analytics_geo_cache')
    .select(
      'country_code,country_name,region,city,isp_name,network_organization,asn,is_mobile_network,is_proxy,is_hosting,geo_confidence'
    )
    .eq('ip_hash', ipHash)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  if (error || !data) return null;
  return resolutionFromCache(data as GeoCacheRow);
}

async function providerQuotaAvailable(): Promise<boolean> {
  if (!serverSupabase || Date.now() < providerBlockedUntil) return false;
  const keyHash = hashAnalyticsIdentifier('provider:ip-api', 'rate-limit');
  const { data, error } = await serverSupabase.rpc(
    'check_analytics_rate_limit',
    {
      p_key_hash: keyHash,
      p_limit: IP_API_FREE_RATE_LIMIT,
      p_window_seconds: 60,
      p_cost: 1,
    }
  );
  return !error && Boolean((data as { allowed?: boolean } | null)?.allowed);
}

function applyProviderRateHeaders(headers: Headers) {
  const rawRemaining = headers.get('x-rl');
  const rawRetrySeconds = headers.get('x-ttl');
  if (rawRemaining === null) return;
  const remaining = Number(rawRemaining);
  const retrySeconds = Number(rawRetrySeconds);
  if (Number.isFinite(remaining) && remaining <= 0) {
    providerBlockedUntil =
      Date.now() +
      Math.max(1, Number.isFinite(retrySeconds) ? retrySeconds : 60) * 1000;
  }
}

async function recordProviderResult(
  outcome: GeoProviderOutcome,
  startedAt: number,
  httpStatus: number | null = null
) {
  if (!serverSupabase) return;
  const durationMs = Math.min(10_000, Math.max(0, Date.now() - startedAt));
  const { error } = await serverSupabase.rpc(
    'record_analytics_geo_provider_result',
    {
      p_provider: 'ip-api',
      p_outcome: outcome,
      p_http_status: httpStatus,
      p_duration_ms: durationMs,
    }
  );
  if (error && error.code !== 'PGRST202') {
    console.error('[analytics] Geo provider health RPC failed:', error.code);
  }
}

async function requestIpApi(
  ip: string
): Promise<AnalyticsIpGeoResolution | null> {
  if (!(await providerQuotaAvailable())) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), IP_API_TIMEOUT_MS);
  const startedAt = Date.now();
  try {
    const response = await fetch(
      buildIpApiUrl(ip, process.env.IP_API_KEY),
      {
        cache: 'no-store',
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      }
    );
    applyProviderRateHeaders(response.headers);
    if (response.status === 429) {
      providerBlockedUntil = Math.max(
        providerBlockedUntil,
        Date.now() + 60 * 1000
      );
      await recordProviderResult('rate_limited', startedAt, 429);
      return null;
    }
    if (!response.ok) {
      await recordProviderResult('http_error', startedAt, response.status);
      return null;
    }

    const declaredLength = Number(response.headers.get('content-length'));
    if (
      Number.isFinite(declaredLength) &&
      declaredLength > IP_API_MAX_RESPONSE_BYTES
    ) {
      await recordProviderResult(
        'invalid_response',
        startedAt,
        response.status
      );
      return null;
    }
    const body = await response.text();
    if (Buffer.byteLength(body, 'utf8') > IP_API_MAX_RESPONSE_BYTES) {
      await recordProviderResult(
        'invalid_response',
        startedAt,
        response.status
      );
      return null;
    }
    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(body);
    } catch {
      await recordProviderResult(
        'invalid_response',
        startedAt,
        response.status
      );
      return null;
    }
    const resolution = parseIpApiResolution(parsedBody);
    await recordProviderResult(
      resolution ? 'success' : 'invalid_response',
      startedAt,
      response.status
    );
    return resolution;
  } catch {
    await recordProviderResult(
      controller.signal.aborted ? 'timeout' : 'network_error',
      startedAt
    );
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function cacheResolution(
  ipHash: string,
  resolution: AnalyticsIpGeoResolution
) {
  if (!serverSupabase) return;
  const ttl = resolution.isMobileNetwork
    ? MOBILE_NETWORK_CACHE_MS
    : FIXED_NETWORK_CACHE_MS;
  await serverSupabase.from('analytics_geo_cache').upsert(
    {
      ip_hash: ipHash,
      provider: 'ip-api',
      country_code: resolution.countryCode,
      country_name: resolution.countryName,
      region: resolution.region,
      city: resolution.city,
      isp_name: resolution.ispName,
      network_organization: resolution.networkOrganization,
      asn: resolution.asn,
      is_mobile_network: resolution.isMobileNetwork,
      is_proxy: resolution.isProxy,
      is_hosting: resolution.isHosting,
      geo_confidence: resolution.confidence,
      expires_at: new Date(Date.now() + ttl).toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'ip_hash' }
  );
}

/**
 * Adds coarse IP-network geography and ISP/ASN data without making analytics
 * ingestion dependent on an external provider. Every failure returns the
 * already-validated Vercel edge context.
 */
export async function resolveAnalyticsRequestContext(
  request: Request,
  baseContext: AnalyticsRequestContext
): Promise<AnalyticsRequestContext> {
  if (
    process.env.ANALYTICS_IP_GEO_ENABLED === 'false' ||
    !hasSupabaseServiceRole ||
    !serverSupabase ||
    !getAnalyticsHashSecret()
  ) {
    return baseContext;
  }

  const ip = getTransientRequestIp(request);
  if (!isPublicAnalyticsIp(ip)) return baseContext;
  const ipHash = hashAnalyticsIdentifier(ip, 'geo-cache');

  const cached = await readCachedResolution(ipHash);
  if (cached) return mergeAnalyticsIpGeo(baseContext, cached);

  const resolution = await requestIpApi(ip);
  if (!resolution) return baseContext;

  // Cache persistence is deliberately non-critical. A missing migration or a
  // transient database error must never reject a valid analytics event batch.
  await cacheResolution(ipHash, resolution);
  return mergeAnalyticsIpGeo(baseContext, resolution);
}
