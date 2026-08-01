-- Server-side IP-network geography enrichment for Analytics v2.
-- Raw IP addresses, exact coordinates and User-Agent values are deliberately
-- excluded. The cache key is an application-side HMAC of the transient IP.

BEGIN;

ALTER TABLE public.analytics_sessions
  ADD COLUMN IF NOT EXISTS isp_name TEXT,
  ADD COLUMN IF NOT EXISTS network_organization TEXT,
  ADD COLUMN IF NOT EXISTS asn TEXT,
  ADD COLUMN IF NOT EXISTS is_mobile_network BOOLEAN,
  ADD COLUMN IF NOT EXISTS is_proxy BOOLEAN,
  ADD COLUMN IF NOT EXISTS is_hosting BOOLEAN;

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'analytics_sessions_network_dimensions_check'
      AND conrelid = 'public.analytics_sessions'::regclass
  ) THEN
    ALTER TABLE public.analytics_sessions
      ADD CONSTRAINT analytics_sessions_network_dimensions_check CHECK (
        (isp_name IS NULL OR char_length(isp_name) <= 160)
        AND (
          network_organization IS NULL
          OR char_length(network_organization) <= 160
        )
        AND (asn IS NULL OR asn ~ '^AS[0-9]{1,10}$')
      );
  END IF;
END
$migration$;

CREATE TABLE IF NOT EXISTS public.analytics_geo_cache (
  ip_hash TEXT PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'ip-api',
  country_code TEXT NOT NULL,
  country_name TEXT,
  region TEXT,
  city TEXT,
  isp_name TEXT,
  network_organization TEXT,
  asn TEXT,
  is_mobile_network BOOLEAN,
  is_proxy BOOLEAN,
  is_hosting BOOLEAN,
  geo_confidence TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT analytics_geo_cache_ip_hash_check
    CHECK (ip_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT analytics_geo_cache_provider_check
    CHECK (provider = 'ip-api'),
  CONSTRAINT analytics_geo_cache_country_code_check
    CHECK (country_code ~ '^[A-Z]{2}$'),
  CONSTRAINT analytics_geo_cache_text_length_check CHECK (
    (country_name IS NULL OR char_length(country_name) <= 128)
    AND (region IS NULL OR char_length(region) <= 128)
    AND (city IS NULL OR char_length(city) <= 128)
    AND (isp_name IS NULL OR char_length(isp_name) <= 160)
    AND (
      network_organization IS NULL
      OR char_length(network_organization) <= 160
    )
    AND (asn IS NULL OR asn ~ '^AS[0-9]{1,10}$')
  ),
  CONSTRAINT analytics_geo_cache_confidence_check
    CHECK (geo_confidence IN ('medium', 'low'))
);

CREATE INDEX IF NOT EXISTS analytics_geo_cache_expires_at_idx
  ON public.analytics_geo_cache (expires_at);

ALTER TABLE public.analytics_geo_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_geo_cache FORCE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.analytics_geo_cache
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.analytics_geo_cache
  TO service_role;

COMMENT ON TABLE public.analytics_geo_cache IS
  'Service-role-only reduced ip-api result cache. ip_hash is an application HMAC; raw IPs and coordinates are never stored.';
COMMENT ON COLUMN public.analytics_geo_cache.ip_hash IS
  'HMAC-SHA256 cache key produced with ANALYTICS_HASH_SECRET and the geo-cache purpose.';

CREATE OR REPLACE FUNCTION public.upgrade_analytics_session_network_geo(
  p_visitor_key TEXT,
  p_client_session_id UUID,
  p_context JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  target_session_id UUID;
  safe_source TEXT;
  safe_country_code TEXT;
  safe_country_name TEXT;
  safe_region TEXT;
  safe_city TEXT;
  safe_confidence TEXT;
  safe_isp_name TEXT;
  safe_network_organization TEXT;
  safe_asn TEXT;
  safe_is_mobile_network BOOLEAN;
  safe_is_proxy BOOLEAN;
  safe_is_hosting BOOLEAN;
  target_confidence TEXT;
  current_confidence TEXT;
  affected_rows INTEGER := 0;
BEGIN
  IF p_visitor_key IS NULL
    OR char_length(p_visitor_key) NOT BETWEEN 32 AND 128
    OR p_visitor_key !~ '^[A-Za-z0-9_-]+$'
    OR p_client_session_id IS NULL
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'pseudonymous visitor and session keys are required';
  END IF;

  IF p_context IS NULL
    OR jsonb_typeof(p_context) <> 'object'
    OR octet_length(p_context::TEXT) > 8192
    OR public.analytics_payload_has_forbidden_keys(p_context)
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'network geo context is invalid';
  END IF;

  safe_source := NULLIF(left(btrim(p_context ->> 'geo_source'), 32), '');
  safe_country_code := upper(
    NULLIF(left(btrim(p_context ->> 'country_code'), 2), '')
  );
  safe_country_name := NULLIF(
    left(btrim(p_context ->> 'country_name'), 128),
    ''
  );
  safe_region := NULLIF(left(btrim(p_context ->> 'region'), 128), '');
  safe_city := NULLIF(left(btrim(p_context ->> 'city'), 128), '');
  safe_confidence := NULLIF(
    left(btrim(p_context ->> 'geo_confidence'), 16),
    ''
  );
  safe_isp_name := NULLIF(left(btrim(p_context ->> 'isp_name'), 160), '');
  safe_network_organization := NULLIF(
    left(btrim(p_context ->> 'network_organization'), 160),
    ''
  );
  safe_asn := upper(NULLIF(left(btrim(p_context ->> 'asn'), 12), ''));
  safe_is_mobile_network := CASE p_context ->> 'is_mobile_network'
    WHEN 'true' THEN TRUE WHEN 'false' THEN FALSE ELSE NULL END;
  safe_is_proxy := CASE p_context ->> 'is_proxy'
    WHEN 'true' THEN TRUE WHEN 'false' THEN FALSE ELSE NULL END;
  safe_is_hosting := CASE p_context ->> 'is_hosting'
    WHEN 'true' THEN TRUE WHEN 'false' THEN FALSE ELSE NULL END;

  IF safe_source NOT IN ('vercel-edge', 'ip-api', 'vercel-edge+ip-api')
    OR safe_country_code IS NULL
    OR safe_country_code !~ '^[A-Z]{2}$'
    OR (
      safe_region IS NULL
      AND safe_city IS NULL
      AND safe_isp_name IS NULL
      AND safe_network_organization IS NULL
      AND safe_asn IS NULL
    )
    OR safe_confidence NOT IN ('medium', 'low')
    OR (safe_asn IS NOT NULL AND safe_asn !~ '^AS[0-9]{1,10}$')
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'country, geography, network or confidence is invalid';
  END IF;

  SELECT session_item.id, session_item.geo_confidence
  INTO target_session_id, current_confidence
  FROM public.analytics_sessions session_item
  INNER JOIN public.analytics_visitors visitor_item
    ON visitor_item.id = session_item.visitor_id
  WHERE visitor_item.visitor_key = p_visitor_key
    AND session_item.client_session_id = p_client_session_id
  ORDER BY session_item.last_activity_at DESC, session_item.id DESC
  LIMIT 1
  FOR UPDATE OF session_item;

  IF target_session_id IS NULL THEN
    RETURN FALSE;
  END IF;

  target_confidence := CASE
    WHEN current_confidence = 'medium' AND safe_confidence = 'low'
      THEN 'medium'
    ELSE safe_confidence
  END;

  UPDATE public.analytics_sessions
  SET
    country_code = safe_country_code,
    country_name = COALESCE(safe_country_name, country_name),
    region = COALESCE(safe_region, region),
    city = COALESCE(safe_city, city),
    geo_source = safe_source,
    geo_confidence = target_confidence,
    isp_name = COALESCE(safe_isp_name, isp_name),
    network_organization = COALESCE(
      safe_network_organization,
      network_organization
    ),
    asn = COALESCE(safe_asn, asn),
    is_mobile_network = COALESCE(safe_is_mobile_network, is_mobile_network),
    is_proxy = COALESCE(safe_is_proxy, is_proxy),
    is_hosting = COALESCE(safe_is_hosting, is_hosting),
    updated_at = NOW()
  WHERE id = target_session_id
    AND geo_source IS DISTINCT FROM 'browser-geolocation'
    AND (
      country_code IS DISTINCT FROM safe_country_code
      OR (safe_country_name IS NOT NULL AND country_name IS DISTINCT FROM safe_country_name)
      OR (safe_region IS NOT NULL AND region IS DISTINCT FROM safe_region)
      OR (safe_city IS NOT NULL AND city IS DISTINCT FROM safe_city)
      OR geo_source IS DISTINCT FROM safe_source
      OR geo_confidence IS DISTINCT FROM target_confidence
      OR (safe_isp_name IS NOT NULL AND isp_name IS DISTINCT FROM safe_isp_name)
      OR (
        safe_network_organization IS NOT NULL
        AND network_organization IS DISTINCT FROM safe_network_organization
      )
      OR (safe_asn IS NOT NULL AND asn IS DISTINCT FROM safe_asn)
      OR (
        safe_is_mobile_network IS NOT NULL
        AND is_mobile_network IS DISTINCT FROM safe_is_mobile_network
      )
      OR (safe_is_proxy IS NOT NULL AND is_proxy IS DISTINCT FROM safe_is_proxy)
      OR (safe_is_hosting IS NOT NULL AND is_hosting IS DISTINCT FROM safe_is_hosting)
    );

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows > 0;
END
$function$;

REVOKE ALL
  ON FUNCTION public.upgrade_analytics_session_network_geo(TEXT, UUID, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE
  ON FUNCTION public.upgrade_analytics_session_network_geo(TEXT, UUID, JSONB)
  TO service_role;

-- Preserve the bounded cursor implementation and add the new reduced network
-- dimensions to its session items.
CREATE OR REPLACE FUNCTION public.get_analytics_sessions(
  p_from TIMESTAMPTZ,
  p_to TIMESTAMPTZ,
  p_timezone TEXT DEFAULT 'Europe/Istanbul',
  p_limit INTEGER DEFAULT 50,
  p_cursor_at TIMESTAMPTZ DEFAULT NULL,
  p_cursor_key TEXT DEFAULT NULL,
  p_traffic_class TEXT DEFAULT 'human',
  p_path TEXT DEFAULT NULL,
  p_snapshot_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
AS $function$
DECLARE
  base_result JSONB;
  enriched_items JSONB;
BEGIN
  base_result := public.get_analytics_sessions_base(
    p_from, p_to, p_timezone, p_limit, p_cursor_at, p_cursor_key,
    p_traffic_class, p_path, p_snapshot_to
  );

  SELECT COALESCE(
    jsonb_agg(
      item.value || jsonb_build_object(
        'geoSource', details.geo_source,
        'geoConfidence', details.geo_confidence,
        'deviceBrand', details.device_brand,
        'deviceModel', details.device_model,
        'browserVersion', details.browser_version,
        'osVersion', details.os_version,
        'ispName', details.isp_name,
        'networkOrganization', details.network_organization,
        'asn', details.asn,
        'isMobileNetwork', details.is_mobile_network,
        'isProxy', details.is_proxy,
        'isHosting', details.is_hosting
      )
      ORDER BY item.ordinality
    ),
    '[]'::JSONB
  )
  INTO enriched_items
  FROM jsonb_array_elements(COALESCE(base_result -> 'items', '[]'::JSONB))
    WITH ORDINALITY AS item(value, ordinality)
  LEFT JOIN LATERAL (
    SELECT
      session_item.geo_source,
      session_item.geo_confidence,
      session_item.device_brand,
      session_item.device_model,
      session_item.browser_version,
      session_item.os_version,
      session_item.isp_name,
      session_item.network_organization,
      session_item.asn,
      session_item.is_mobile_network,
      session_item.is_proxy,
      session_item.is_hosting
    FROM public.analytics_sessions session_item
    WHERE 's_' || substr(md5(session_item.id::TEXT), 1, 16)
      = item.value ->> 'sessionRef'
    LIMIT 1
  ) details ON TRUE;

  RETURN jsonb_set(base_result, '{items}', enriched_items, TRUE);
END
$function$;

REVOKE ALL ON FUNCTION public.get_analytics_sessions(
  TIMESTAMPTZ, TIMESTAMPTZ, TEXT, INTEGER, TIMESTAMPTZ,
  TEXT, TEXT, TEXT, TIMESTAMPTZ
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_analytics_sessions(
  TIMESTAMPTZ, TIMESTAMPTZ, TEXT, INTEGER, TIMESTAMPTZ,
  TEXT, TEXT, TEXT, TIMESTAMPTZ
) TO service_role;

CREATE OR REPLACE FUNCTION public.get_analytics_dashboard(
  p_from TIMESTAMPTZ,
  p_to TIMESTAMPTZ,
  p_timezone TEXT DEFAULT 'Europe/Istanbul'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
AS $function$
DECLARE
  base_result JSONB;
  detailed_technology JSONB;
  detailed_cities JSONB;
  detailed_networks JSONB;
BEGIN
  base_result := public.get_analytics_dashboard_base(p_from, p_to, p_timezone);

  WITH scoped_sessions AS MATERIALIZED (
    SELECT session_item.*
    FROM public.analytics_sessions session_item
    WHERE session_item.traffic_class = 'human'
      AND EXISTS (
        SELECT 1
        FROM public.analytics_events event_item
        WHERE event_item.session_id = session_item.id
          AND event_item.occurred_at >= p_from
          AND event_item.occurred_at < p_to
      )
  )
  SELECT jsonb_build_object(
    'deviceModels', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object('name', dimension.name, 'sessions', dimension.sessions)
        ORDER BY dimension.sessions DESC, dimension.name
      )
      FROM (
        SELECT COALESCE(
          NULLIF(btrim(concat_ws(' ', device_brand, device_model)), ''),
          NULLIF(btrim(device_type), ''),
          'unknown'
        ) AS name, count(*)::BIGINT AS sessions
        FROM scoped_sessions
        GROUP BY 1 ORDER BY sessions DESC, name LIMIT 50
      ) dimension
    ), '[]'::JSONB),
    'browserVersions', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object('name', dimension.name, 'sessions', dimension.sessions)
        ORDER BY dimension.sessions DESC, dimension.name
      )
      FROM (
        SELECT COALESCE(
          NULLIF(btrim(concat_ws(' ', browser_name, browser_version)), ''),
          'unknown'
        ) AS name, count(*)::BIGINT AS sessions
        FROM scoped_sessions
        GROUP BY 1 ORDER BY sessions DESC, name LIMIT 50
      ) dimension
    ), '[]'::JSONB),
    'operatingSystemVersions', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object('name', dimension.name, 'sessions', dimension.sessions)
        ORDER BY dimension.sessions DESC, dimension.name
      )
      FROM (
        SELECT COALESCE(
          NULLIF(btrim(concat_ws(' ', os_name, os_version)), ''),
          'unknown'
        ) AS name, count(*)::BIGINT AS sessions
        FROM scoped_sessions
        GROUP BY 1 ORDER BY sessions DESC, name LIMIT 50
      ) dimension
    ), '[]'::JSONB)
  ) INTO detailed_technology;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'countryCode', dimension.country_code,
      'region', dimension.region,
      'city', dimension.city,
      'sessions', dimension.sessions
    ) ORDER BY dimension.sessions DESC, dimension.region, dimension.city
  ), '[]'::JSONB)
  INTO detailed_cities
  FROM (
    SELECT
      session_item.country_code,
      NULLIF(btrim(session_item.region), '') AS region,
      COALESCE(NULLIF(btrim(session_item.city), ''), 'unknown') AS city,
      count(*)::BIGINT AS sessions
    FROM public.analytics_sessions session_item
    WHERE session_item.traffic_class = 'human'
      AND EXISTS (
        SELECT 1
        FROM public.analytics_events event_item
        WHERE event_item.session_id = session_item.id
          AND event_item.occurred_at >= p_from
          AND event_item.occurred_at < p_to
      )
    GROUP BY 1, 2, 3
    ORDER BY sessions DESC, region, city
    LIMIT 100
  ) dimension;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'name', dimension.name,
      'asn', dimension.asn,
      'isMobileNetwork', dimension.is_mobile_network,
      'isProxy', dimension.is_proxy,
      'isHosting', dimension.is_hosting,
      'sessions', dimension.sessions
    ) ORDER BY dimension.sessions DESC, dimension.name, dimension.asn
  ), '[]'::JSONB)
  INTO detailed_networks
  FROM (
    SELECT
      COALESCE(
        NULLIF(btrim(session_item.isp_name), ''),
        NULLIF(btrim(session_item.network_organization), ''),
        'unknown'
      ) AS name,
      session_item.asn,
      session_item.is_mobile_network,
      session_item.is_proxy,
      session_item.is_hosting,
      count(*)::BIGINT AS sessions
    FROM public.analytics_sessions session_item
    WHERE session_item.traffic_class = 'human'
      AND (
        session_item.isp_name IS NOT NULL
        OR session_item.network_organization IS NOT NULL
        OR session_item.asn IS NOT NULL
      )
      AND EXISTS (
        SELECT 1
        FROM public.analytics_events event_item
        WHERE event_item.session_id = session_item.id
          AND event_item.occurred_at >= p_from
          AND event_item.occurred_at < p_to
      )
    GROUP BY 1, 2, 3, 4, 5
    ORDER BY sessions DESC, name, asn
    LIMIT 100
  ) dimension;

  base_result := jsonb_set(
    base_result,
    '{technology}',
    COALESCE(base_result -> 'technology', '{}'::JSONB) || detailed_technology,
    TRUE
  );
  base_result := jsonb_set(base_result, '{geography,cities}', detailed_cities, TRUE);
  RETURN jsonb_set(base_result, '{geography,networks}', detailed_networks, TRUE);
END
$function$;

REVOKE ALL ON FUNCTION public.get_analytics_dashboard(
  TIMESTAMPTZ, TIMESTAMPTZ, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_analytics_dashboard(
  TIMESTAMPTZ, TIMESTAMPTZ, TEXT
) TO service_role;

-- Wrap the existing export so session CSVs receive the same reduced details
-- without duplicating page and acquisition reporting logic.
DO $migration$
BEGIN
  IF to_regprocedure(
    'public.export_analytics_report(timestamptz,timestamptz,text,text,integer)'
  ) IS NOT NULL
    AND to_regprocedure(
      'public.export_analytics_report_base(timestamptz,timestamptz,text,text,integer)'
    ) IS NULL
  THEN
    ALTER FUNCTION public.export_analytics_report(
      TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, INTEGER
    ) RENAME TO export_analytics_report_base;
  END IF;
END
$migration$;

CREATE OR REPLACE FUNCTION public.export_analytics_report(
  p_from TIMESTAMPTZ,
  p_to TIMESTAMPTZ,
  p_timezone TEXT DEFAULT 'Europe/Istanbul',
  p_dataset TEXT DEFAULT 'sessions',
  p_limit INTEGER DEFAULT 10000
)
RETURNS SETOF JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
AS $function$
BEGIN
  IF p_dataset = 'sessions' THEN
    RETURN QUERY
    SELECT base_row.value || jsonb_build_object(
      'geoSource', details.geo_source,
      'geoConfidence', details.geo_confidence,
      'deviceBrand', details.device_brand,
      'deviceModel', details.device_model,
      'browserVersion', details.browser_version,
      'osVersion', details.os_version,
      'ispName', details.isp_name,
      'networkOrganization', details.network_organization,
      'asn', details.asn,
      'isMobileNetwork', details.is_mobile_network,
      'isProxy', details.is_proxy,
      'isHosting', details.is_hosting
    )
    FROM public.export_analytics_report_base(
      p_from, p_to, p_timezone, p_dataset, p_limit
    ) AS base_row(value)
    LEFT JOIN LATERAL (
      SELECT session_item.*
      FROM public.analytics_sessions session_item
      WHERE 's_' || substr(md5(session_item.id::TEXT), 1, 16)
        = base_row.value ->> 'sessionRef'
      LIMIT 1
    ) details ON TRUE;
  ELSE
    RETURN QUERY
    SELECT base_row.value
    FROM public.export_analytics_report_base(
      p_from, p_to, p_timezone, p_dataset, p_limit
    ) AS base_row(value);
  END IF;
END
$function$;

REVOKE ALL ON FUNCTION public.export_analytics_report_base(
  TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, INTEGER
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.export_analytics_report_base(
  TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, INTEGER
) TO service_role;
REVOKE ALL ON FUNCTION public.export_analytics_report(
  TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, INTEGER
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.export_analytics_report(
  TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, INTEGER
) TO service_role;

CREATE OR REPLACE FUNCTION public.prune_analytics_geo_cache(
  p_batch_size INTEGER DEFAULT 10000
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  IF p_batch_size IS NULL OR p_batch_size NOT BETWEEN 1 AND 50000 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'geo cache batch size must be between 1 and 50000';
  END IF;

  WITH expired AS (
    SELECT cache_item.ip_hash
    FROM public.analytics_geo_cache cache_item
    WHERE cache_item.expires_at <= NOW()
    ORDER BY cache_item.expires_at
    LIMIT p_batch_size
  )
  DELETE FROM public.analytics_geo_cache cache_item
  USING expired
  WHERE cache_item.ip_hash = expired.ip_hash;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN jsonb_build_object('deletedCount', deleted_count);
END
$function$;

REVOKE ALL ON FUNCTION public.prune_analytics_geo_cache(INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prune_analytics_geo_cache(INTEGER)
  TO service_role;

CREATE OR REPLACE FUNCTION public.run_analytics_maintenance(
  p_retention_days INTEGER DEFAULT 425,
  p_timezone TEXT DEFAULT 'Europe/Istanbul'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  maintenance_now TIMESTAMPTZ := clock_timestamp();
  rollup_result JSONB;
  quality_result JSONB;
  prune_result JSONB;
  geo_cache_result JSONB;
BEGIN
  IF NOT pg_try_advisory_xact_lock(20760730, 4) THEN
    RETURN jsonb_build_object(
      'success', TRUE,
      'skipped', TRUE,
      'reason', 'maintenance_already_running',
      'completed_at', clock_timestamp()
    );
  END IF;

  rollup_result := public.refresh_analytics_daily_rollups(
    (maintenance_now AT TIME ZONE p_timezone)::DATE - 7,
    (maintenance_now AT TIME ZONE p_timezone)::DATE,
    p_timezone
  );
  quality_result := public.run_analytics_data_quality(24);
  prune_result := public.prune_analytics_data(p_retention_days, 10000);
  geo_cache_result := public.prune_analytics_geo_cache(10000);

  RETURN jsonb_build_object(
    'success', TRUE,
    'rollup', rollup_result,
    'quality', quality_result,
    'retention', prune_result,
    'geo_cache', geo_cache_result,
    'completed_at', clock_timestamp()
  );
END
$function$;

REVOKE ALL ON FUNCTION public.run_analytics_maintenance(INTEGER, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_analytics_maintenance(INTEGER, TEXT)
  TO service_role;

COMMENT ON COLUMN public.analytics_sessions.isp_name IS
  'Reduced server-side ISP label; raw IP is not stored.';
COMMENT ON COLUMN public.analytics_sessions.asn IS
  'Autonomous system number associated with the public network exit.';
COMMENT ON FUNCTION public.prune_analytics_geo_cache(INTEGER) IS
  'Deletes expired HMAC-keyed geo-provider cache rows in a bounded batch.';

COMMIT;
