-- Enrich an already-open Analytics v2 session when later requests contain a
-- better Vercel network-geo signal. The function accepts only the reduced
-- country/province/city context; raw IP addresses and edge coordinates never
-- cross the database boundary.

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
  safe_country_code TEXT;
  safe_country_name TEXT;
  safe_region TEXT;
  safe_city TEXT;
  safe_confidence TEXT;
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
    OR p_context ->> 'geo_source' <> 'vercel-edge'
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'network geo context is invalid';
  END IF;

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

  IF safe_country_code IS NULL
    OR safe_country_code !~ '^[A-Z]{2}$'
    OR (safe_region IS NULL AND safe_city IS NULL)
    OR safe_confidence NOT IN ('medium', 'low')
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'country, province/city or geo confidence is invalid';
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
    geo_source = 'vercel-edge',
    geo_confidence = target_confidence,
    updated_at = NOW()
  WHERE id = target_session_id
    -- Historical device-assisted records remain untouched. New application
    -- code no longer creates them, but preserving stronger old data avoids a
    -- silent accuracy downgrade.
    AND geo_source IS DISTINCT FROM 'browser-geolocation'
    AND (
      country_code IS DISTINCT FROM safe_country_code
      OR (safe_country_name IS NOT NULL AND country_name IS DISTINCT FROM safe_country_name)
      OR (safe_region IS NOT NULL AND region IS DISTINCT FROM safe_region)
      OR (safe_city IS NOT NULL AND city IS DISTINCT FROM safe_city)
      OR geo_source IS DISTINCT FROM 'vercel-edge'
      OR geo_confidence IS DISTINCT FROM target_confidence
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
