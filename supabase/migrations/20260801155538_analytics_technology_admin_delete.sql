-- Detailed, privacy-bounded technology dimensions and admin-only session deletion.
-- Raw User-Agent strings and hardware identifiers remain outside analytics storage.

BEGIN;

ALTER TABLE public.analytics_sessions
  ADD COLUMN IF NOT EXISTS device_brand TEXT,
  ADD COLUMN IF NOT EXISTS device_model TEXT,
  ADD COLUMN IF NOT EXISTS browser_version TEXT,
  ADD COLUMN IF NOT EXISTS os_version TEXT;

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'analytics_sessions_technology_length_check'
      AND conrelid = 'public.analytics_sessions'::regclass
  ) THEN
    ALTER TABLE public.analytics_sessions
      ADD CONSTRAINT analytics_sessions_technology_length_check CHECK (
        (device_brand IS NULL OR char_length(device_brand) <= 128)
        AND (device_model IS NULL OR char_length(device_model) <= 128)
        AND (browser_name IS NULL OR char_length(browser_name) <= 128)
        AND (browser_version IS NULL OR char_length(browser_version) <= 64)
        AND (os_name IS NULL OR char_length(os_name) <= 128)
        AND (os_version IS NULL OR char_length(os_version) <= 64)
      );
  END IF;
END
$migration$;

CREATE OR REPLACE FUNCTION public.upgrade_analytics_session_technology(
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
  safe_device_type TEXT;
  safe_device_brand TEXT;
  safe_device_model TEXT;
  safe_browser_name TEXT;
  safe_browser_version TEXT;
  safe_os_name TEXT;
  safe_os_version TEXT;
  affected_rows INTEGER := 0;
BEGIN
  IF p_visitor_key IS NULL
    OR char_length(p_visitor_key) NOT BETWEEN 32 AND 128
    OR p_visitor_key !~ '^[A-Za-z0-9_-]+$'
    OR p_client_session_id IS NULL
    OR p_context IS NULL
    OR jsonb_typeof(p_context) <> 'object'
    OR octet_length(p_context::TEXT) > 8192
    OR public.analytics_payload_has_forbidden_keys(p_context)
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'technology context is invalid';
  END IF;

  safe_device_type := NULLIF(
    left(lower(btrim(p_context ->> 'device_type')), 16),
    ''
  );
  safe_device_brand := NULLIF(left(btrim(p_context ->> 'device_brand'), 128), '');
  safe_device_model := NULLIF(left(btrim(p_context ->> 'device_model'), 128), '');
  safe_browser_name := NULLIF(left(btrim(p_context ->> 'browser_name'), 128), '');
  safe_browser_version := NULLIF(left(btrim(p_context ->> 'browser_version'), 64), '');
  safe_os_name := NULLIF(left(btrim(p_context ->> 'os_name'), 128), '');
  safe_os_version := NULLIF(left(btrim(p_context ->> 'os_version'), 64), '');

  IF safe_device_type IS NOT NULL
    AND safe_device_type NOT IN ('desktop', 'mobile', 'tablet', 'other')
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'device type is invalid';
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
    device_type = COALESCE(safe_device_type, device_type),
    device_brand = COALESCE(safe_device_brand, device_brand),
    device_model = COALESCE(safe_device_model, device_model),
    browser_name = COALESCE(safe_browser_name, browser_name),
    browser_version = COALESCE(safe_browser_version, browser_version),
    os_name = COALESCE(safe_os_name, os_name),
    os_version = COALESCE(safe_os_version, os_version),
    updated_at = NOW()
  WHERE id = target_session_id
    AND (
      device_type IS DISTINCT FROM COALESCE(safe_device_type, device_type)
      OR device_brand IS DISTINCT FROM COALESCE(safe_device_brand, device_brand)
      OR device_model IS DISTINCT FROM COALESCE(safe_device_model, device_model)
      OR browser_name IS DISTINCT FROM COALESCE(safe_browser_name, browser_name)
      OR browser_version IS DISTINCT FROM COALESCE(safe_browser_version, browser_version)
      OR os_name IS DISTINCT FROM COALESCE(safe_os_name, os_name)
      OR os_version IS DISTINCT FROM COALESCE(safe_os_version, os_version)
    );

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows > 0;
END
$function$;

REVOKE ALL ON FUNCTION public.upgrade_analytics_session_technology(TEXT, UUID, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upgrade_analytics_session_technology(TEXT, UUID, JSONB)
  TO service_role;

CREATE OR REPLACE FUNCTION public.delete_analytics_sessions(
  p_session_refs TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  requested_count INTEGER;
  deleted_count INTEGER := 0;
  affected_visitor_ids UUID[] := ARRAY[]::UUID[];
BEGIN
  SELECT count(DISTINCT session_ref)::INTEGER
  INTO requested_count
  FROM unnest(COALESCE(p_session_refs, ARRAY[]::TEXT[])) AS input(session_ref);

  IF requested_count NOT BETWEEN 1 AND 100
    OR EXISTS (
      SELECT 1
      FROM unnest(COALESCE(p_session_refs, ARRAY[]::TEXT[])) AS input(session_ref)
      WHERE input.session_ref !~ '^s_[a-f0-9]{16}$'
    )
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'one to one hundred valid session references are required';
  END IF;

  WITH deleted AS (
    DELETE FROM public.analytics_sessions session_item
    WHERE 's_' || substr(md5(session_item.id::TEXT), 1, 16)
      = ANY(p_session_refs)
    RETURNING session_item.visitor_id
  )
  SELECT
    count(*)::INTEGER,
    COALESCE(array_agg(DISTINCT deleted.visitor_id), ARRAY[]::UUID[])
  INTO deleted_count, affected_visitor_ids
  FROM deleted;

  UPDATE public.analytics_visitors visitor_item
  SET
    session_count = (
      SELECT count(*)
      FROM public.analytics_sessions remaining_session
      WHERE remaining_session.visitor_id = visitor_item.id
    ),
    event_count = (
      SELECT count(*)
      FROM public.analytics_events remaining_event
      WHERE remaining_event.visitor_id = visitor_item.id
    ),
    last_seen_at = COALESCE(
      (
        SELECT max(remaining_session.last_activity_at)
        FROM public.analytics_sessions remaining_session
        WHERE remaining_session.visitor_id = visitor_item.id
      ),
      visitor_item.first_seen_at
    ),
    updated_at = NOW()
  WHERE visitor_item.id = ANY(affected_visitor_ids);

  DELETE FROM public.analytics_visitors visitor_item
  WHERE visitor_item.id = ANY(affected_visitor_ids)
    AND NOT EXISTS (
      SELECT 1
      FROM public.analytics_sessions remaining_session
      WHERE remaining_session.visitor_id = visitor_item.id
    );

  RETURN jsonb_build_object(
    'requestedCount', requested_count,
    'deletedCount', deleted_count
  );
END
$function$;

REVOKE ALL ON FUNCTION public.delete_analytics_sessions(TEXT[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_analytics_sessions(TEXT[])
  TO service_role;

-- Enrich the existing bounded/paginated report without duplicating its cursor logic.
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
        'osVersion', details.os_version
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
      session_item.os_version
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

-- Preserve the original dashboard report as a private base, then add detailed
-- model/version and province/district aggregate dimensions.
DO $migration$
BEGIN
  IF to_regprocedure(
    'public.get_analytics_dashboard(timestamptz,timestamptz,text)'
  ) IS NOT NULL
    AND to_regprocedure(
      'public.get_analytics_dashboard_base(timestamptz,timestamptz,text)'
    ) IS NULL
  THEN
    ALTER FUNCTION public.get_analytics_dashboard(
      TIMESTAMPTZ, TIMESTAMPTZ, TEXT
    ) RENAME TO get_analytics_dashboard_base;
  END IF;
END
$migration$;

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

  base_result := jsonb_set(
    base_result,
    '{technology}',
    COALESCE(base_result -> 'technology', '{}'::JSONB) || detailed_technology,
    TRUE
  );
  RETURN jsonb_set(base_result, '{geography,cities}', detailed_cities, TRUE);
END
$function$;

REVOKE ALL ON FUNCTION public.get_analytics_dashboard_base(
  TIMESTAMPTZ, TIMESTAMPTZ, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_analytics_dashboard_base(
  TIMESTAMPTZ, TIMESTAMPTZ, TEXT
) TO service_role;

REVOKE ALL ON FUNCTION public.get_analytics_dashboard(
  TIMESTAMPTZ, TIMESTAMPTZ, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_analytics_dashboard(
  TIMESTAMPTZ, TIMESTAMPTZ, TEXT
) TO service_role;

COMMIT;
