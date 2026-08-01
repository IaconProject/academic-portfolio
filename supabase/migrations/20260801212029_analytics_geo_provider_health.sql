-- Operational visibility for server-side IP-network geolocation. This table
-- contains only provider counters; visitor IPs and coordinates never enter it.

BEGIN;

CREATE TABLE IF NOT EXISTS public.analytics_geo_provider_health (
  provider TEXT PRIMARY KEY,
  request_count BIGINT NOT NULL DEFAULT 0,
  success_count BIGINT NOT NULL DEFAULT 0,
  failure_count BIGINT NOT NULL DEFAULT 0,
  timeout_count BIGINT NOT NULL DEFAULT 0,
  rate_limited_count BIGINT NOT NULL DEFAULT 0,
  last_outcome TEXT,
  last_http_status INTEGER,
  last_duration_ms INTEGER,
  last_attempt_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT analytics_geo_provider_health_provider_check
    CHECK (provider = 'ip-api'),
  CONSTRAINT analytics_geo_provider_health_counts_check CHECK (
    request_count >= 0
    AND success_count >= 0
    AND failure_count >= 0
    AND timeout_count >= 0
    AND rate_limited_count >= 0
    AND success_count + failure_count <= request_count
  ),
  CONSTRAINT analytics_geo_provider_health_outcome_check CHECK (
    last_outcome IS NULL OR last_outcome IN (
      'success',
      'timeout',
      'rate_limited',
      'http_error',
      'invalid_response',
      'network_error'
    )
  ),
  CONSTRAINT analytics_geo_provider_health_status_check CHECK (
    last_http_status IS NULL
    OR last_http_status BETWEEN 100 AND 599
  ),
  CONSTRAINT analytics_geo_provider_health_duration_check CHECK (
    last_duration_ms IS NULL
    OR last_duration_ms BETWEEN 0 AND 10000
  )
);

ALTER TABLE public.analytics_geo_provider_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_geo_provider_health FORCE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.analytics_geo_provider_health
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.analytics_geo_provider_health
  TO service_role;

COMMENT ON TABLE public.analytics_geo_provider_health IS
  'Service-role-only provider health counters. Contains no visitor identifiers, IP addresses or coordinates.';

CREATE OR REPLACE FUNCTION public.record_analytics_geo_provider_result(
  p_provider TEXT,
  p_outcome TEXT,
  p_http_status INTEGER DEFAULT NULL,
  p_duration_ms INTEGER DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  safe_provider TEXT := lower(NULLIF(left(btrim(p_provider), 32), ''));
  safe_outcome TEXT := lower(NULLIF(left(btrim(p_outcome), 32), ''));
  attempt_time TIMESTAMPTZ := clock_timestamp();
BEGIN
  IF safe_provider IS DISTINCT FROM 'ip-api'
    OR safe_outcome IS NULL
    OR safe_outcome NOT IN (
      'success',
      'timeout',
      'rate_limited',
      'http_error',
      'invalid_response',
      'network_error'
    )
    OR (p_http_status IS NOT NULL AND p_http_status NOT BETWEEN 100 AND 599)
    OR (p_duration_ms IS NOT NULL AND p_duration_ms NOT BETWEEN 0 AND 10000)
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'analytics geo provider result is invalid';
  END IF;

  INSERT INTO public.analytics_geo_provider_health (
    provider,
    request_count,
    success_count,
    failure_count,
    timeout_count,
    rate_limited_count,
    last_outcome,
    last_http_status,
    last_duration_ms,
    last_attempt_at,
    last_success_at,
    updated_at
  ) VALUES (
    safe_provider,
    1,
    CASE WHEN safe_outcome = 'success' THEN 1 ELSE 0 END,
    CASE WHEN safe_outcome = 'success' THEN 0 ELSE 1 END,
    CASE WHEN safe_outcome = 'timeout' THEN 1 ELSE 0 END,
    CASE WHEN safe_outcome = 'rate_limited' THEN 1 ELSE 0 END,
    safe_outcome,
    p_http_status,
    p_duration_ms,
    attempt_time,
    CASE WHEN safe_outcome = 'success' THEN attempt_time ELSE NULL END,
    attempt_time
  )
  ON CONFLICT (provider) DO UPDATE SET
    request_count = public.analytics_geo_provider_health.request_count + 1,
    success_count = public.analytics_geo_provider_health.success_count
      + CASE WHEN EXCLUDED.last_outcome = 'success' THEN 1 ELSE 0 END,
    failure_count = public.analytics_geo_provider_health.failure_count
      + CASE WHEN EXCLUDED.last_outcome = 'success' THEN 0 ELSE 1 END,
    timeout_count = public.analytics_geo_provider_health.timeout_count
      + CASE WHEN EXCLUDED.last_outcome = 'timeout' THEN 1 ELSE 0 END,
    rate_limited_count = public.analytics_geo_provider_health.rate_limited_count
      + CASE WHEN EXCLUDED.last_outcome = 'rate_limited' THEN 1 ELSE 0 END,
    last_outcome = EXCLUDED.last_outcome,
    last_http_status = EXCLUDED.last_http_status,
    last_duration_ms = EXCLUDED.last_duration_ms,
    last_attempt_at = EXCLUDED.last_attempt_at,
    last_success_at = COALESCE(
      EXCLUDED.last_success_at,
      public.analytics_geo_provider_health.last_success_at
    ),
    updated_at = EXCLUDED.updated_at;
END
$function$;

REVOKE ALL
  ON FUNCTION public.record_analytics_geo_provider_result(TEXT, TEXT, INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE
  ON FUNCTION public.record_analytics_geo_provider_result(TEXT, TEXT, INTEGER, INTEGER)
  TO service_role;

-- Location freshness matters more than long cache retention. Public mobile IP
-- pools move frequently; fixed access networks also reassign addresses.
UPDATE public.analytics_geo_cache
SET
  expires_at = LEAST(
    expires_at,
    NOW() + CASE
      WHEN is_mobile_network IS TRUE THEN INTERVAL '2 hours'
      ELSE INTERVAL '24 hours'
    END
  ),
  updated_at = NOW()
WHERE expires_at > NOW() + CASE
  WHEN is_mobile_network IS TRUE THEN INTERVAL '2 hours'
  ELSE INTERVAL '24 hours'
END;

-- New clients never request or transmit device coordinates. Remove the former
-- service-role RPC so this capability cannot be reintroduced accidentally.
DROP FUNCTION IF EXISTS public.upgrade_analytics_session_geo(TEXT, UUID, JSONB);

COMMIT;
