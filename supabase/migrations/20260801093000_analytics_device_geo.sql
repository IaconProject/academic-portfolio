-- Privacy-preserving device-assisted province resolution for Analytics v2.
-- Exact coordinates are reduced by the application before this RPC is called;
-- only province/country plus source/confidence are persisted.

CREATE OR REPLACE FUNCTION public.upgrade_analytics_session_geo(
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
  safe_region TEXT;
  safe_city TEXT;
  safe_confidence TEXT;
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
    OR p_context ->> 'geo_source' <> 'browser-geolocation'
    OR p_context ->> 'country_code' <> 'TR'
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'device geo context is invalid';
  END IF;

  safe_region := NULLIF(left(btrim(p_context ->> 'region'), 128), '');
  safe_city := NULLIF(left(btrim(p_context ->> 'city'), 128), '');
  safe_confidence := NULLIF(
    left(btrim(p_context ->> 'geo_confidence'), 16),
    ''
  );

  IF safe_region IS NULL
    OR safe_city IS NULL
    OR safe_confidence NOT IN ('high', 'medium')
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'province or geo confidence is invalid';
  END IF;

  SELECT session_item.id
  INTO target_session_id
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

  UPDATE public.analytics_sessions
  SET
    country_code = 'TR',
    country_name = 'Türkiye',
    region = safe_region,
    city = safe_city,
    geo_source = 'browser-geolocation',
    geo_confidence = safe_confidence,
    updated_at = NOW()
  WHERE id = target_session_id
    AND (
      geo_source IS DISTINCT FROM 'browser-geolocation'
      OR region IS DISTINCT FROM safe_region
      OR city IS DISTINCT FROM safe_city
      OR geo_confidence IS DISTINCT FROM safe_confidence
    );

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows > 0;
END
$function$;

REVOKE ALL
  ON FUNCTION public.upgrade_analytics_session_geo(TEXT, UUID, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE
  ON FUNCTION public.upgrade_analytics_session_geo(TEXT, UUID, JSONB)
  TO service_role;

-- Preserve the battle-tested filtered/paginated query as an internal base and
-- enrich only its already-bounded result with geo provenance.
DO $migration$
BEGIN
  IF to_regprocedure(
    'public.get_analytics_sessions(timestamptz,timestamptz,text,integer,timestamptz,text,text,text,timestamptz)'
  ) IS NOT NULL
    AND to_regprocedure(
      'public.get_analytics_sessions_base(timestamptz,timestamptz,text,integer,timestamptz,text,text,text,timestamptz)'
    ) IS NULL
  THEN
    ALTER FUNCTION public.get_analytics_sessions(
      TIMESTAMPTZ,
      TIMESTAMPTZ,
      TEXT,
      INTEGER,
      TIMESTAMPTZ,
      TEXT,
      TEXT,
      TEXT,
      TIMESTAMPTZ
    ) RENAME TO get_analytics_sessions_base;
  END IF;
END
$migration$;

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
    p_from,
    p_to,
    p_timezone,
    p_limit,
    p_cursor_at,
    p_cursor_key,
    p_traffic_class,
    p_path,
    p_snapshot_to
  );

  SELECT COALESCE(
    jsonb_agg(
      item.value || jsonb_build_object(
        'geoSource', geo.geo_source,
        'geoConfidence', geo.geo_confidence
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
      session_item.geo_confidence
    FROM public.analytics_sessions session_item
    WHERE 's_' || substr(md5(session_item.id::TEXT), 1, 16)
      = item.value ->> 'sessionRef'
    LIMIT 1
  ) geo ON TRUE;

  RETURN jsonb_set(base_result, '{items}', enriched_items, TRUE);
END
$function$;

REVOKE ALL
  ON FUNCTION public.get_analytics_sessions_base(
    TIMESTAMPTZ,
    TIMESTAMPTZ,
    TEXT,
    INTEGER,
    TIMESTAMPTZ,
    TEXT,
    TEXT,
    TEXT,
    TIMESTAMPTZ
  )
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE
  ON FUNCTION public.get_analytics_sessions_base(
    TIMESTAMPTZ,
    TIMESTAMPTZ,
    TEXT,
    INTEGER,
    TIMESTAMPTZ,
    TEXT,
    TEXT,
    TEXT,
    TIMESTAMPTZ
  )
  TO service_role;

REVOKE ALL
  ON FUNCTION public.get_analytics_sessions(
    TIMESTAMPTZ,
    TIMESTAMPTZ,
    TEXT,
    INTEGER,
    TIMESTAMPTZ,
    TEXT,
    TEXT,
    TEXT,
    TIMESTAMPTZ
  )
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE
  ON FUNCTION public.get_analytics_sessions(
    TIMESTAMPTZ,
    TIMESTAMPTZ,
    TEXT,
    INTEGER,
    TIMESTAMPTZ,
    TEXT,
    TEXT,
    TEXT,
    TIMESTAMPTZ
  )
  TO service_role;
