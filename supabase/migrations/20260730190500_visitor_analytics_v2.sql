-- Visitor Analytics v2 (2026-07-30 19:05 Europe/Istanbul)
--
-- Additive, privacy-conscious analytics storage and ingestion primitives.
-- The legacy visitor_sessions and visitor_logs tables are intentionally retained.
--
-- Security model:
--   * Browsers never read or write analytics tables directly.
--   * Only the server-side service_role can execute ingestion/rate-limit RPCs.
--   * Raw IP addresses, full user agents and exact coordinates are not persisted.
--   * visitor_key and rate-limit key_hash must be pseudonymous/hashes generated
--     by the trusted application backend.

CREATE TABLE IF NOT EXISTS public.analytics_visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_key TEXT NOT NULL UNIQUE,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  first_source TEXT,
  first_medium TEXT,
  first_campaign TEXT,
  first_referrer_domain TEXT,
  last_consent_version TEXT,
  session_count BIGINT NOT NULL DEFAULT 0,
  event_count BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT analytics_visitors_key_check CHECK (
    char_length(visitor_key) BETWEEN 32 AND 128
    AND visitor_key ~ '^[A-Za-z0-9_-]+$'
  ),
  CONSTRAINT analytics_visitors_time_check CHECK (last_seen_at >= first_seen_at),
  CONSTRAINT analytics_visitors_counts_check CHECK (
    session_count >= 0 AND event_count >= 0
  )
);

CREATE TABLE IF NOT EXISTS public.analytics_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id UUID NOT NULL
    REFERENCES public.analytics_visitors(id) ON DELETE CASCADE,
  client_session_id UUID NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_heartbeat_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  landing_path TEXT,
  exit_path TEXT,
  referrer_domain TEXT,
  source TEXT,
  medium TEXT,
  campaign TEXT,
  country_code TEXT,
  country_name TEXT,
  region TEXT,
  city TEXT,
  geo_source TEXT,
  geo_confidence TEXT,
  device_type TEXT,
  browser_name TEXT,
  os_name TEXT,
  consent_version TEXT,
  traffic_class TEXT NOT NULL DEFAULT 'human',
  bot_reason TEXT,
  pageview_count BIGINT NOT NULL DEFAULT 0,
  event_count BIGINT NOT NULL DEFAULT 0,
  engagement_duration_ms BIGINT NOT NULL DEFAULT 0,
  max_scroll_percent SMALLINT NOT NULL DEFAULT 0,
  conversion_count BIGINT NOT NULL DEFAULT 0,
  is_engaged BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT analytics_sessions_time_check CHECK (
    last_activity_at >= started_at
    AND (last_heartbeat_at IS NULL OR last_heartbeat_at >= started_at)
    AND (ended_at IS NULL OR ended_at >= started_at)
  ),
  CONSTRAINT analytics_sessions_path_check CHECK (
    (landing_path IS NULL OR (
      char_length(landing_path) BETWEEN 1 AND 2048
      AND landing_path LIKE '/%'
      AND landing_path NOT LIKE '//%'
      AND position('?' IN landing_path) = 0
      AND position('#' IN landing_path) = 0
    ))
    AND
    (exit_path IS NULL OR (
      char_length(exit_path) BETWEEN 1 AND 2048
      AND exit_path LIKE '/%'
      AND exit_path NOT LIKE '//%'
      AND position('?' IN exit_path) = 0
      AND position('#' IN exit_path) = 0
    ))
  ),
  CONSTRAINT analytics_sessions_country_code_check CHECK (
    country_code IS NULL OR country_code ~ '^[A-Z]{2}$'
  ),
  CONSTRAINT analytics_sessions_geo_confidence_check CHECK (
    geo_confidence IS NULL OR geo_confidence IN ('high', 'medium', 'low')
  ),
  CONSTRAINT analytics_sessions_device_type_check CHECK (
    device_type IS NULL OR device_type IN ('desktop', 'mobile', 'tablet', 'other')
  ),
  CONSTRAINT analytics_sessions_traffic_class_check CHECK (
    traffic_class IN ('human', 'suspected_bot', 'verified_bot', 'internal', 'test')
  ),
  CONSTRAINT analytics_sessions_counts_check CHECK (
    pageview_count >= 0
    AND event_count >= 0
    AND engagement_duration_ms >= 0
    AND max_scroll_percent BETWEEN 0 AND 100
    AND conversion_count >= 0
  )
);

CREATE TABLE IF NOT EXISTS public.analytics_events (
  event_id UUID PRIMARY KEY,
  visitor_id UUID NOT NULL
    REFERENCES public.analytics_visitors(id) ON DELETE CASCADE,
  session_id UUID NOT NULL
    REFERENCES public.analytics_sessions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  path TEXT,
  title TEXT,
  referrer_domain TEXT,
  tab_id UUID NOT NULL,
  sequence INTEGER NOT NULL,
  screen_bucket TEXT,
  language TEXT,
  timezone TEXT,
  consent_version TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  content_type TEXT,
  content_key TEXT,
  duration_ms INTEGER,
  scroll_percent SMALLINT,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  schema_version SMALLINT NOT NULL DEFAULT 2,
  CONSTRAINT analytics_events_type_check CHECK (
    event_type IN (
      'page_view',
      'heartbeat',
      'engagement',
      'scroll_depth',
      'outbound_click',
      'download',
      'contact_submit',
      'conversion',
      'consent_update',
      'session_end',
      'web_vital',
      'client_error'
    )
  ),
  CONSTRAINT analytics_events_path_check CHECK (
    path IS NULL OR (
      char_length(path) BETWEEN 1 AND 2048
      AND path LIKE '/%'
      AND path NOT LIKE '//%'
      AND position('?' IN path) = 0
      AND position('#' IN path) = 0
    )
  ),
  CONSTRAINT analytics_events_title_check CHECK (
    title IS NULL OR char_length(title) <= 300
  ),
  CONSTRAINT analytics_events_referrer_check CHECK (
    referrer_domain IS NULL OR char_length(referrer_domain) <= 255
  ),
  CONSTRAINT analytics_events_sequence_check CHECK (
    sequence BETWEEN 0 AND 1000000
  ),
  CONSTRAINT analytics_events_screen_bucket_check CHECK (
    screen_bucket IS NULL
    OR screen_bucket IN ('xs', 'sm', 'md', 'lg', 'xl', '2xl', 'unknown')
  ),
  CONSTRAINT analytics_events_locale_context_check CHECK (
    (language IS NULL OR char_length(language) <= 35)
    AND (timezone IS NULL OR char_length(timezone) <= 100)
    AND (consent_version IS NULL OR char_length(consent_version) <= 64)
  ),
  CONSTRAINT analytics_events_campaign_check CHECK (
    (utm_source IS NULL OR char_length(utm_source) <= 200)
    AND (utm_medium IS NULL OR char_length(utm_medium) <= 200)
    AND (utm_campaign IS NULL OR char_length(utm_campaign) <= 200)
    AND (utm_term IS NULL OR char_length(utm_term) <= 200)
    AND (utm_content IS NULL OR char_length(utm_content) <= 200)
  ),
  CONSTRAINT analytics_events_content_check CHECK (
    (content_type IS NULL OR char_length(content_type) <= 64)
    AND (content_key IS NULL OR char_length(content_key) <= 200)
  ),
  CONSTRAINT analytics_events_duration_check CHECK (
    duration_ms IS NULL OR duration_ms BETWEEN 0 AND 300000
  ),
  CONSTRAINT analytics_events_scroll_check CHECK (
    scroll_percent IS NULL OR scroll_percent BETWEEN 0 AND 100
  ),
  CONSTRAINT analytics_events_properties_check CHECK (
    jsonb_typeof(properties) = 'object'
    AND pg_column_size(properties) <= 8192
  ),
  CONSTRAINT analytics_events_schema_version_check CHECK (
    schema_version BETWEEN 1 AND 100
  )
);

CREATE TABLE IF NOT EXISTS public.analytics_ingest_health (
  id SMALLINT PRIMARY KEY DEFAULT 1,
  accepted_batches BIGINT NOT NULL DEFAULT 0,
  accepted_events BIGINT NOT NULL DEFAULT 0,
  duplicate_events BIGINT NOT NULL DEFAULT 0,
  rejected_events BIGINT NOT NULL DEFAULT 0,
  failed_batches BIGINT NOT NULL DEFAULT 0,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  last_failure_code TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT analytics_ingest_health_singleton_check CHECK (id = 1),
  CONSTRAINT analytics_ingest_health_counts_check CHECK (
    accepted_batches >= 0
    AND accepted_events >= 0
    AND duplicate_events >= 0
    AND rejected_events >= 0
    AND failed_batches >= 0
  )
);

INSERT INTO public.analytics_ingest_health (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.analytics_rate_limits (
  key_hash TEXT PRIMARY KEY,
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  request_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT analytics_rate_limits_key_hash_check CHECK (
    key_hash ~ '^([A-Fa-f0-9]{64}|[A-Za-z0-9_-]{43})$'
  ),
  CONSTRAINT analytics_rate_limits_count_check CHECK (request_count >= 0)
);

CREATE INDEX IF NOT EXISTS analytics_visitors_last_seen_idx
  ON public.analytics_visitors(last_seen_at DESC);

CREATE INDEX IF NOT EXISTS analytics_sessions_visitor_activity_idx
  ON public.analytics_sessions(visitor_id, last_activity_at DESC);

-- A browser session id is a correlation hint, not the authority for an
-- unbounded server session. Multiple server-side inactivity windows may share
-- the same stale/forged client id and remain separate.
DROP INDEX IF EXISTS public.analytics_sessions_visitor_client_session_uidx;
CREATE INDEX IF NOT EXISTS analytics_sessions_visitor_client_session_idx
  ON public.analytics_sessions(
    visitor_id,
    client_session_id,
    last_activity_at DESC
  );

CREATE INDEX IF NOT EXISTS analytics_sessions_activity_idx
  ON public.analytics_sessions(last_activity_at DESC);

CREATE INDEX IF NOT EXISTS analytics_sessions_started_idx
  ON public.analytics_sessions(started_at DESC);

CREATE INDEX IF NOT EXISTS analytics_sessions_traffic_idx
  ON public.analytics_sessions(traffic_class, started_at DESC);

CREATE INDEX IF NOT EXISTS analytics_events_session_time_idx
  ON public.analytics_events(session_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS analytics_events_visitor_time_idx
  ON public.analytics_events(visitor_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS analytics_events_type_time_idx
  ON public.analytics_events(event_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS analytics_events_received_at_idx
  ON public.analytics_events(received_at DESC);

CREATE INDEX IF NOT EXISTS analytics_events_tab_sequence_idx
  ON public.analytics_events(tab_id, sequence);

CREATE INDEX IF NOT EXISTS analytics_events_campaign_time_idx
  ON public.analytics_events(utm_source, utm_medium, utm_campaign, occurred_at DESC)
  WHERE utm_source IS NOT NULL OR utm_medium IS NOT NULL OR utm_campaign IS NOT NULL;

CREATE INDEX IF NOT EXISTS analytics_events_pageview_path_idx
  ON public.analytics_events(path, occurred_at DESC)
  WHERE event_type = 'page_view' AND path IS NOT NULL;

CREATE INDEX IF NOT EXISTS analytics_rate_limits_window_idx
  ON public.analytics_rate_limits(window_started_at);

CREATE INDEX IF NOT EXISTS analytics_rate_limits_updated_at_idx
  ON public.analytics_rate_limits(updated_at);

ALTER TABLE public.analytics_visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_ingest_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_rate_limits ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.analytics_visitors FORCE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_ingest_health FORCE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_rate_limits FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.analytics_visitors FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.analytics_sessions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.analytics_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.analytics_ingest_health FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.analytics_rate_limits FROM PUBLIC, anon, authenticated;

REVOKE ALL ON TABLE public.analytics_visitors FROM service_role;
REVOKE ALL ON TABLE public.analytics_sessions FROM service_role;
REVOKE ALL ON TABLE public.analytics_events FROM service_role;
REVOKE ALL ON TABLE public.analytics_ingest_health FROM service_role;
REVOKE ALL ON TABLE public.analytics_rate_limits FROM service_role;

GRANT SELECT ON TABLE public.analytics_visitors TO service_role;
GRANT SELECT ON TABLE public.analytics_sessions TO service_role;
GRANT SELECT ON TABLE public.analytics_events TO service_role;
GRANT SELECT ON TABLE public.analytics_ingest_health TO service_role;
GRANT SELECT ON TABLE public.analytics_rate_limits TO service_role;

-- Close permissive access on optional legacy analytics tables without removing
-- their data. All table and policy operations are conditional for fresh installs.
DO $migration$
DECLARE
  item RECORD;
  policy_item RECORD;
BEGIN
  FOR item IN
    SELECT table_name
    FROM (VALUES ('visitor_sessions'), ('visitor_logs'))
      AS legacy(table_name)
  LOOP
    IF to_regclass(format('public.%I', item.table_name)) IS NOT NULL THEN
      EXECUTE format(
        'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',
        item.table_name
      );
      EXECUTE format(
        'ALTER TABLE public.%I FORCE ROW LEVEL SECURITY',
        item.table_name
      );
      EXECUTE format(
        'REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC, anon, authenticated',
        item.table_name
      );

      FOR policy_item IN
        SELECT policy.policyname
        FROM pg_catalog.pg_policies policy
        WHERE policy.schemaname = 'public'
          AND policy.tablename = item.table_name
      LOOP
        EXECUTE format(
          'DROP POLICY IF EXISTS %I ON public.%I',
          policy_item.policyname,
          item.table_name
        );
      END LOOP;

      -- Legacy data remains available only to trusted server-side admin APIs
      -- during the transition; browser roles retain no direct table access.
      EXECUTE format(
        'GRANT SELECT, DELETE ON TABLE public.%I TO service_role',
        item.table_name
      );
    END IF;
  END LOOP;
END
$migration$;

-- Recursively rejects privacy-sensitive raw identifiers even if a caller tries
-- to hide one in a nested event properties/context object.
CREATE OR REPLACE FUNCTION public.analytics_payload_has_forbidden_keys(
  p_payload JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
STRICT
PARALLEL SAFE
SET search_path = pg_catalog, public
AS $function$
DECLARE
  pair RECORD;
  element JSONB;
  normalized_key TEXT;
BEGIN
  IF jsonb_typeof(p_payload) = 'object' THEN
    FOR pair IN SELECT key, value FROM jsonb_each(p_payload)
    LOOP
      normalized_key := regexp_replace(lower(pair.key), '[^a-z0-9]', '', 'g');

      IF normalized_key IN (
        'ip',
        'ipaddress',
        'clientip',
        'remoteip',
        'useragent',
        'fulluseragent',
        'ua',
        'latitude',
        'longitude',
        'lat',
        'lon',
        'coordinates'
      ) THEN
        RETURN TRUE;
      END IF;

      IF jsonb_typeof(pair.value) IN ('object', 'array')
        AND public.analytics_payload_has_forbidden_keys(pair.value)
      THEN
        RETURN TRUE;
      END IF;
    END LOOP;
  ELSIF jsonb_typeof(p_payload) = 'array' THEN
    FOR element IN SELECT value FROM jsonb_array_elements(p_payload)
    LOOP
      IF jsonb_typeof(element) IN ('object', 'array')
        AND public.analytics_payload_has_forbidden_keys(element)
      THEN
        RETURN TRUE;
      END IF;
    END LOOP;
  END IF;

  RETURN FALSE;
END
$function$;

REVOKE ALL ON FUNCTION public.analytics_payload_has_forbidden_keys(JSONB)
  FROM PUBLIC, anon, authenticated;

-- Replace the request-counting v1 signature if an earlier revision of this
-- additive migration was already applied. The v2 signature consumes event
-- cost, so a 20-event batch cannot bypass a request-only quota.
DROP FUNCTION IF EXISTS public.check_analytics_rate_limit(
  TEXT,
  INTEGER,
  INTEGER
);

CREATE OR REPLACE FUNCTION public.check_analytics_rate_limit(
  p_key_hash TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER,
  p_cost INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  rate_limit_now TIMESTAMPTZ := clock_timestamp();
  current_row public.analytics_rate_limits%ROWTYPE;
  is_allowed BOOLEAN;
  remaining_count INTEGER;
  retry_after_seconds INTEGER;
BEGIN
  IF p_key_hash IS NULL
    OR p_key_hash !~ '^([A-Fa-f0-9]{64}|[A-Za-z0-9_-]{43})$'
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'key_hash must be a SHA-256 hex or base64url digest';
  END IF;

  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 10000 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'limit must be between 1 and 10000';
  END IF;

  IF p_window_seconds IS NULL
    OR p_window_seconds < 1
    OR p_window_seconds > 86400
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'window_seconds must be between 1 and 86400';
  END IF;

  IF p_cost IS NULL OR p_cost < 1 OR p_cost > 20 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'cost must be between 1 and 20';
  END IF;

  -- Bound pseudonymous network-key retention and table growth without making
  -- every request perform an unbounded cleanup. The updated_at index keeps this
  -- opportunistic batch delete cheap; repeated traffic drains any backlog.
  DELETE FROM public.analytics_rate_limits expired
  WHERE expired.key_hash IN (
    SELECT candidate.key_hash
    FROM public.analytics_rate_limits candidate
    WHERE candidate.updated_at < rate_limit_now - INTERVAL '48 hours'
    ORDER BY candidate.updated_at
    LIMIT 100
  );

  INSERT INTO public.analytics_rate_limits (
    key_hash,
    window_started_at,
    request_count,
    updated_at
  )
  VALUES (
    p_key_hash,
    rate_limit_now,
    p_cost,
    rate_limit_now
  )
  ON CONFLICT (key_hash) DO UPDATE
  SET
    window_started_at = CASE
      WHEN public.analytics_rate_limits.window_started_at
        <= rate_limit_now - make_interval(secs => p_window_seconds)
      THEN rate_limit_now
      ELSE public.analytics_rate_limits.window_started_at
    END,
    request_count = CASE
      WHEN public.analytics_rate_limits.window_started_at
        <= rate_limit_now - make_interval(secs => p_window_seconds)
      THEN p_cost
      ELSE LEAST(
        public.analytics_rate_limits.request_count + p_cost,
        p_limit + 1
      )
    END,
    updated_at = rate_limit_now
  RETURNING * INTO current_row;

  is_allowed := current_row.request_count <= p_limit;
  remaining_count := GREATEST(p_limit - current_row.request_count, 0);

  retry_after_seconds := CASE
    WHEN is_allowed THEN 0
    ELSE GREATEST(
      CEIL(
        EXTRACT(
          EPOCH FROM (
            current_row.window_started_at
            + make_interval(secs => p_window_seconds)
            - rate_limit_now
          )
        )
      )::INTEGER,
      1
    )
  END;

  RETURN jsonb_build_object(
    'allowed', is_allowed,
    'remaining', remaining_count,
    'retry_after', retry_after_seconds
  );
END
$function$;

REVOKE ALL ON FUNCTION public.check_analytics_rate_limit(
  TEXT,
  INTEGER,
  INTEGER,
  INTEGER
)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE
  ON FUNCTION public.check_analytics_rate_limit(
    TEXT,
    INTEGER,
    INTEGER,
    INTEGER
  )
  TO service_role;

CREATE OR REPLACE FUNCTION public.ingest_analytics_events(
  p_visitor_key TEXT,
  p_client_session_id UUID,
  p_events JSONB,
  p_context JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  accepted_at TIMESTAMPTZ := clock_timestamp();
  event_item JSONB;
  event_properties JSONB;
  event_id_value UUID;
  tab_id_value UUID;
  event_type_value TEXT;
  event_time_value TIMESTAMPTZ;
  event_path_value TEXT;
  duration_value INTEGER;
  scroll_value INTEGER;
  schema_version_value INTEGER;
  sequence_value INTEGER;
  valid_events JSONB := '[]'::jsonb;
  unique_events JSONB := '[]'::jsonb;
  new_events JSONB := '[]'::jsonb;
  unique_count INTEGER := 0;
  accepted_count INTEGER := 0;
  duplicate_count INTEGER := 0;
  rejected_count INTEGER := 0;
  pageview_delta INTEGER := 0;
  heartbeat_delta INTEGER := 0;
  conversion_delta INTEGER := 0;
  engagement_delta BIGINT := 0;
  max_scroll_delta INTEGER := 0;
  has_session_end BOOLEAN := FALSE;
  batch_started_at TIMESTAMPTZ;
  batch_last_activity_at TIMESTAMPTZ;
  last_heartbeat_event_at TIMESTAMPTZ;
  last_session_end_event_at TIMESTAMPTZ;
  first_path_value TEXT;
  last_path_value TEXT;
  visitor_id_value UUID;
  session_id_value UUID;
  is_new_visitor BOOLEAN := FALSE;
  is_new_session BOOLEAN := FALSE;
  context_source TEXT;
  context_medium TEXT;
  context_campaign TEXT;
  context_referrer TEXT;
  context_country_code TEXT;
  context_country_name TEXT;
  context_region TEXT;
  context_city TEXT;
  context_geo_source TEXT;
  context_geo_confidence TEXT;
  context_device_type TEXT;
  context_browser_name TEXT;
  context_os_name TEXT;
  context_consent_version TEXT;
  context_traffic_class TEXT;
  context_bot_reason TEXT;
BEGIN
  IF p_visitor_key IS NULL
    OR char_length(p_visitor_key) NOT BETWEEN 32 AND 128
    OR p_visitor_key !~ '^[A-Za-z0-9_-]+$'
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'visitor_key must be a 32-128 character pseudonymous key';
  END IF;

  IF p_client_session_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22004',
      MESSAGE = 'client_session_id is required';
  END IF;

  IF p_events IS NULL OR jsonb_typeof(p_events) <> 'array' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'events must be a JSON array';
  END IF;

  IF jsonb_array_length(p_events) NOT BETWEEN 1 AND 20 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'events batch must contain between 1 and 20 items';
  END IF;

  IF octet_length(p_events::TEXT) > 32768 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22001',
      MESSAGE = 'events batch exceeds 32 KB';
  END IF;

  IF p_context IS NULL OR jsonb_typeof(p_context) <> 'object' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'context must be a JSON object';
  END IF;

  IF octet_length(p_context::TEXT) > 8192 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22001',
      MESSAGE = 'context exceeds 8 KB';
  END IF;

  IF public.analytics_payload_has_forbidden_keys(p_context) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'context contains a prohibited raw identifier';
  END IF;

  -- Validate the entire bounded batch before any visitor/session/event write.
  -- One invalid item rejects the whole batch so the collector never discards an
  -- unreported subset after receiving a successful HTTP response.
  FOR event_item IN SELECT value FROM jsonb_array_elements(p_events)
  LOOP
    BEGIN
      IF jsonb_typeof(event_item) <> 'object' THEN
        RAISE EXCEPTION 'event must be an object';
      END IF;

      event_id_value := (event_item ->> 'event_id')::UUID;
      IF event_id_value IS NULL THEN
        RAISE EXCEPTION 'event_id is required';
      END IF;

      tab_id_value := (event_item ->> 'tab_id')::UUID;
      IF tab_id_value IS NULL THEN
        RAISE EXCEPTION 'tab_id is required';
      END IF;

      sequence_value := (event_item ->> 'sequence')::INTEGER;
      IF sequence_value IS NULL OR sequence_value NOT BETWEEN 0 AND 1000000 THEN
        RAISE EXCEPTION 'sequence is outside its accepted range';
      END IF;

      event_type_value := event_item ->> 'event_type';

      IF event_type_value IS NULL OR event_type_value NOT IN (
        'page_view',
        'heartbeat',
        'engagement',
        'scroll_depth',
        'outbound_click',
        'download',
        'contact_submit',
        'conversion',
        'consent_update',
        'session_end',
        'web_vital',
        'client_error'
      ) THEN
        RAISE EXCEPTION 'unsupported event_type';
      END IF;

      event_time_value := COALESCE(
        NULLIF(event_item ->> 'occurred_at', '')::TIMESTAMPTZ,
        accepted_at
      );

      IF event_time_value < accepted_at - INTERVAL '7 days'
        OR event_time_value > accepted_at + INTERVAL '5 minutes'
      THEN
        RAISE EXCEPTION 'occurred_at is outside the accepted clock window';
      END IF;

      event_path_value := NULLIF(btrim(event_item ->> 'path'), '');
      IF event_path_value IS NOT NULL AND (
        char_length(event_path_value) > 2048
        OR event_path_value NOT LIKE '/%'
        OR event_path_value LIKE '//%'
        OR position('?' IN event_path_value) > 0
        OR position('#' IN event_path_value) > 0
      ) THEN
        RAISE EXCEPTION 'path must be a canonical internal path';
      END IF;

      IF char_length(COALESCE(event_item ->> 'title', '')) > 300
        OR char_length(COALESCE(event_item ->> 'referrer_domain', '')) > 255
        OR char_length(COALESCE(event_item ->> 'language', '')) > 35
        OR char_length(COALESCE(event_item ->> 'timezone', '')) > 100
        OR char_length(COALESCE(event_item ->> 'consent_version', '')) > 64
        OR char_length(COALESCE(event_item ->> 'utm_source', '')) > 200
        OR char_length(COALESCE(event_item ->> 'utm_medium', '')) > 200
        OR char_length(COALESCE(event_item ->> 'utm_campaign', '')) > 200
        OR char_length(COALESCE(event_item ->> 'utm_term', '')) > 200
        OR char_length(COALESCE(event_item ->> 'utm_content', '')) > 200
        OR char_length(COALESCE(event_item ->> 'content_type', '')) > 64
        OR char_length(COALESCE(event_item ->> 'content_key', '')) > 200
      THEN
        RAISE EXCEPTION 'event text field exceeds its maximum length';
      END IF;

      IF NULLIF(event_item ->> 'screen_bucket', '') IS NOT NULL
        AND (event_item ->> 'screen_bucket') NOT IN (
          'xs', 'sm', 'md', 'lg', 'xl', '2xl', 'unknown'
        )
      THEN
        RAISE EXCEPTION 'screen_bucket is invalid';
      END IF;

      duration_value := NULLIF(event_item ->> 'duration_ms', '')::INTEGER;
      IF duration_value IS NOT NULL
        AND duration_value NOT BETWEEN 0 AND 300000
      THEN
        RAISE EXCEPTION 'duration_ms is outside its accepted range';
      END IF;

      scroll_value := NULLIF(event_item ->> 'scroll_percent', '')::INTEGER;
      IF scroll_value IS NOT NULL AND scroll_value NOT BETWEEN 0 AND 100 THEN
        RAISE EXCEPTION 'scroll_percent is outside its accepted range';
      END IF;

      schema_version_value := COALESCE(
        NULLIF(event_item ->> 'schema_version', '')::INTEGER,
        2
      );
      IF schema_version_value NOT BETWEEN 1 AND 100 THEN
        RAISE EXCEPTION 'schema_version is outside its accepted range';
      END IF;

      event_properties := COALESCE(event_item -> 'properties', '{}'::jsonb);
      IF jsonb_typeof(event_properties) <> 'object'
        OR pg_column_size(event_properties) > 8192
        OR public.analytics_payload_has_forbidden_keys(event_properties)
      THEN
        RAISE EXCEPTION 'properties are invalid or contain a prohibited key';
      END IF;

      valid_events := valid_events || jsonb_build_array(event_item);
    EXCEPTION
      WHEN OTHERS THEN
        rejected_count := rejected_count + 1;
    END;
  END LOOP;

  IF rejected_count > 0 THEN
    UPDATE public.analytics_ingest_health
    SET
      rejected_events = rejected_events + rejected_count,
      failed_batches = failed_batches + 1,
      last_failure_at = accepted_at,
      last_failure_code = 'INVALID_EVENTS',
      updated_at = accepted_at
    WHERE id = 1;

    RETURN jsonb_build_object(
      'success', FALSE,
      'error_code', 'INVALID_EVENTS',
      'accepted_count', 0,
      'duplicate_count', 0,
      'rejected_count', rejected_count
    );
  END IF;

  -- Keep the first occurrence of an event_id inside this batch.
  SELECT COALESCE(jsonb_agg(deduped.event ORDER BY deduped.first_ordinal), '[]'::jsonb)
  INTO unique_events
  FROM (
    SELECT DISTINCT ON ((expanded.event ->> 'event_id')::UUID)
      expanded.event,
      expanded.ordinality AS first_ordinal
    FROM jsonb_array_elements(valid_events)
      WITH ORDINALITY AS expanded(event, ordinality)
    ORDER BY
      (expanded.event ->> 'event_id')::UUID,
      expanded.ordinality
  ) AS deduped;

  unique_count := jsonb_array_length(unique_events);
  duplicate_count := jsonb_array_length(valid_events) - unique_count;

  -- Serialize ingestion for one pseudonymous visitor. This prevents concurrent
  -- tabs from creating competing sessions or losing aggregate increments.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_visitor_key, 0));

  SELECT COALESCE(jsonb_agg(candidate.event ORDER BY candidate.ordinality), '[]'::jsonb)
  INTO new_events
  FROM jsonb_array_elements(unique_events)
    WITH ORDINALITY AS candidate(event, ordinality)
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.analytics_events existing
    WHERE existing.event_id = (candidate.event ->> 'event_id')::UUID
  );

  duplicate_count := duplicate_count + unique_count - jsonb_array_length(new_events);

  IF jsonb_array_length(new_events) = 0 THEN
    SELECT existing.visitor_id, existing.session_id
    INTO visitor_id_value, session_id_value
    FROM public.analytics_events existing
    JOIN jsonb_array_elements(unique_events) AS duplicate(event)
      ON existing.event_id = (duplicate.event ->> 'event_id')::UUID
    ORDER BY existing.received_at
    LIMIT 1;

    UPDATE public.analytics_ingest_health
    SET
      accepted_batches = accepted_batches + 1,
      duplicate_events = duplicate_events + duplicate_count,
      rejected_events = rejected_events + rejected_count,
      last_success_at = accepted_at,
      last_failure_code = NULL,
      updated_at = accepted_at
    WHERE id = 1;

    RETURN jsonb_build_object(
      'success', TRUE,
      'visitor_id', visitor_id_value,
      'session_id', session_id_value,
      'is_new_visitor', FALSE,
      'is_new_session', FALSE,
      'accepted_count', 0,
      'duplicate_count', duplicate_count,
      'rejected_count', rejected_count
    );
  END IF;

  SELECT
    MIN(COALESCE(
      NULLIF(candidate.event ->> 'occurred_at', '')::TIMESTAMPTZ,
      accepted_at
    )),
    MAX(COALESCE(
      NULLIF(candidate.event ->> 'occurred_at', '')::TIMESTAMPTZ,
      accepted_at
    ))
  INTO batch_started_at, batch_last_activity_at
  FROM jsonb_array_elements(new_events) AS candidate(event);

  SELECT NULLIF(candidate.event ->> 'path', '')
  INTO first_path_value
  FROM jsonb_array_elements(new_events)
    WITH ORDINALITY AS candidate(event, ordinality)
  WHERE NULLIF(candidate.event ->> 'path', '') IS NOT NULL
  ORDER BY
    COALESCE(
      NULLIF(candidate.event ->> 'occurred_at', '')::TIMESTAMPTZ,
      accepted_at
    ),
    candidate.ordinality
  LIMIT 1;

  SELECT NULLIF(candidate.event ->> 'path', '')
  INTO last_path_value
  FROM jsonb_array_elements(new_events)
    WITH ORDINALITY AS candidate(event, ordinality)
  WHERE NULLIF(candidate.event ->> 'path', '') IS NOT NULL
  ORDER BY
    COALESCE(
      NULLIF(candidate.event ->> 'occurred_at', '')::TIMESTAMPTZ,
      accepted_at
    ) DESC,
    candidate.ordinality DESC
  LIMIT 1;

  context_source := NULLIF(left(btrim(p_context ->> 'source'), 128), '');
  context_medium := NULLIF(left(btrim(p_context ->> 'medium'), 128), '');
  context_campaign := NULLIF(left(btrim(p_context ->> 'campaign'), 200), '');
  context_referrer := NULLIF(left(lower(btrim(p_context ->> 'referrer_domain')), 255), '');
  context_country_code := upper(NULLIF(left(btrim(p_context ->> 'country_code'), 2), ''));
  context_country_name := NULLIF(left(btrim(p_context ->> 'country_name'), 128), '');
  context_region := NULLIF(left(btrim(p_context ->> 'region'), 128), '');
  context_city := NULLIF(left(btrim(p_context ->> 'city'), 128), '');
  context_geo_source := NULLIF(left(btrim(p_context ->> 'geo_source'), 64), '');
  context_geo_confidence := NULLIF(left(btrim(p_context ->> 'geo_confidence'), 16), '');
  context_device_type := NULLIF(left(lower(btrim(p_context ->> 'device_type')), 16), '');
  context_browser_name := NULLIF(left(btrim(p_context ->> 'browser_name'), 128), '');
  context_os_name := NULLIF(left(btrim(p_context ->> 'os_name'), 128), '');
  context_consent_version := NULLIF(left(btrim(p_context ->> 'consent_version'), 64), '');
  context_traffic_class := COALESCE(
    NULLIF(left(lower(btrim(p_context ->> 'traffic_class')), 32), ''),
    'human'
  );
  context_bot_reason := NULLIF(left(btrim(p_context ->> 'bot_reason'), 256), '');

  -- Acquisition and consent values are emitted on each event by the collector.
  -- Explicit server context remains the higher-priority override.
  SELECT
    COALESCE(
      context_source,
      NULLIF(left(btrim(first_event.event ->> 'utm_source'), 200), '')
    ),
    COALESCE(
      context_medium,
      NULLIF(left(btrim(first_event.event ->> 'utm_medium'), 200), '')
    ),
    COALESCE(
      context_campaign,
      NULLIF(left(btrim(first_event.event ->> 'utm_campaign'), 200), '')
    ),
    COALESCE(
      context_referrer,
      NULLIF(
        left(lower(btrim(first_event.event ->> 'referrer_domain')), 255),
        ''
      )
    ),
    COALESCE(
      context_consent_version,
      NULLIF(left(btrim(first_event.event ->> 'consent_version'), 64), '')
    )
  INTO
    context_source,
    context_medium,
    context_campaign,
    context_referrer,
    context_consent_version
  FROM jsonb_array_elements(new_events)
    WITH ORDINALITY AS first_event(event, ordinality)
  ORDER BY
    COALESCE(
      NULLIF(first_event.event ->> 'occurred_at', '')::TIMESTAMPTZ,
      accepted_at
    ),
    first_event.ordinality
  LIMIT 1;

  IF context_country_code IS NOT NULL
    AND context_country_code !~ '^[A-Z]{2}$'
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'country_code must be a two-letter ISO code';
  END IF;

  IF context_geo_confidence IS NOT NULL
    AND context_geo_confidence NOT IN ('high', 'medium', 'low')
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'geo_confidence is invalid';
  END IF;

  IF context_device_type IS NOT NULL
    AND context_device_type NOT IN ('desktop', 'mobile', 'tablet', 'other')
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'device_type is invalid';
  END IF;

  IF context_traffic_class NOT IN (
    'human',
    'suspected_bot',
    'verified_bot',
    'internal',
    'test'
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'traffic_class is invalid';
  END IF;

  INSERT INTO public.analytics_visitors (
    visitor_key,
    first_seen_at,
    last_seen_at,
    first_source,
    first_medium,
    first_campaign,
    first_referrer_domain,
    last_consent_version,
    created_at,
    updated_at
  )
  VALUES (
    p_visitor_key,
    accepted_at,
    accepted_at,
    context_source,
    context_medium,
    context_campaign,
    context_referrer,
    context_consent_version,
    accepted_at,
    accepted_at
  )
  ON CONFLICT (visitor_key) DO UPDATE
  SET
    last_seen_at = GREATEST(public.analytics_visitors.last_seen_at, accepted_at),
    last_consent_version = COALESCE(
      EXCLUDED.last_consent_version,
      public.analytics_visitors.last_consent_version
    ),
    updated_at = accepted_at
  RETURNING
    id,
    (created_at = accepted_at)
  INTO visitor_id_value, is_new_visitor;

  -- Client rotation is useful but not authoritative. Reuse a persisted session
  -- only when the incoming event-time window is within 30 minutes of it.
  -- This prevents stale or forged client session ids from merging activity
  -- forever while still attaching delayed/offline batches to the right window.
  SELECT session.id
  INTO session_id_value
  FROM public.analytics_sessions session
  WHERE session.visitor_id = visitor_id_value
    AND session.client_session_id = p_client_session_id
    AND batch_started_at
      <= session.last_activity_at + INTERVAL '30 minutes'
    AND batch_last_activity_at
      >= session.started_at - INTERVAL '30 minutes'
  ORDER BY session.last_activity_at DESC
  LIMIT 1
  FOR UPDATE;

  IF session_id_value IS NULL THEN
    INSERT INTO public.analytics_sessions (
      visitor_id,
      client_session_id,
      started_at,
      last_activity_at,
      landing_path,
      exit_path,
      referrer_domain,
      source,
      medium,
      campaign,
      country_code,
      country_name,
      region,
      city,
      geo_source,
      geo_confidence,
      device_type,
      browser_name,
      os_name,
      consent_version,
      traffic_class,
      bot_reason,
      created_at,
      updated_at
    )
    SELECT
      visitor_id_value,
      p_client_session_id,
      batch_started_at,
      batch_last_activity_at,
      first_path_value,
      last_path_value,
      COALESCE(
        NULLIF(first_event.event ->> 'referrer_domain', ''),
        context_referrer
      ),
      context_source,
      context_medium,
      context_campaign,
      context_country_code,
      context_country_name,
      context_region,
      context_city,
      context_geo_source,
      context_geo_confidence,
      context_device_type,
      context_browser_name,
      context_os_name,
      context_consent_version,
      context_traffic_class,
      context_bot_reason,
      accepted_at,
      accepted_at
    FROM jsonb_array_elements(new_events)
      WITH ORDINALITY AS first_event(event, ordinality)
    ORDER BY
      COALESCE(
        NULLIF(first_event.event ->> 'occurred_at', '')::TIMESTAMPTZ,
        accepted_at
      ),
      first_event.ordinality
    LIMIT 1
    RETURNING id INTO session_id_value;

    is_new_session := TRUE;

    UPDATE public.analytics_visitors
    SET
      session_count = session_count + 1,
      updated_at = accepted_at
    WHERE id = visitor_id_value;
  END IF;

  WITH inserted AS (
    INSERT INTO public.analytics_events (
      event_id,
      visitor_id,
      session_id,
      event_type,
      occurred_at,
      received_at,
      path,
      title,
      referrer_domain,
      tab_id,
      sequence,
      screen_bucket,
      language,
      timezone,
      consent_version,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      content_type,
      content_key,
      duration_ms,
      scroll_percent,
      properties,
      schema_version
    )
    SELECT
      (source.event ->> 'event_id')::UUID,
      visitor_id_value,
      session_id_value,
      source.event ->> 'event_type',
      COALESCE(
        NULLIF(source.event ->> 'occurred_at', '')::TIMESTAMPTZ,
        accepted_at
      ),
      accepted_at,
      NULLIF(btrim(source.event ->> 'path'), ''),
      NULLIF(left(btrim(source.event ->> 'title'), 300), ''),
      NULLIF(left(lower(btrim(source.event ->> 'referrer_domain')), 255), ''),
      (source.event ->> 'tab_id')::UUID,
      (source.event ->> 'sequence')::INTEGER,
      NULLIF(left(btrim(source.event ->> 'screen_bucket'), 16), ''),
      NULLIF(left(btrim(source.event ->> 'language'), 35), ''),
      NULLIF(left(btrim(source.event ->> 'timezone'), 100), ''),
      NULLIF(left(btrim(source.event ->> 'consent_version'), 64), ''),
      NULLIF(left(btrim(source.event ->> 'utm_source'), 200), ''),
      NULLIF(left(btrim(source.event ->> 'utm_medium'), 200), ''),
      NULLIF(left(btrim(source.event ->> 'utm_campaign'), 200), ''),
      NULLIF(left(btrim(source.event ->> 'utm_term'), 200), ''),
      NULLIF(left(btrim(source.event ->> 'utm_content'), 200), ''),
      NULLIF(left(btrim(source.event ->> 'content_type'), 64), ''),
      NULLIF(left(btrim(source.event ->> 'content_key'), 200), ''),
      NULLIF(source.event ->> 'duration_ms', '')::INTEGER,
      NULLIF(source.event ->> 'scroll_percent', '')::SMALLINT,
      COALESCE(source.event -> 'properties', '{}'::jsonb),
      COALESCE(
        NULLIF(source.event ->> 'schema_version', '')::SMALLINT,
        2
      )
    FROM jsonb_array_elements(new_events)
      WITH ORDINALITY AS source(event, ordinality)
    ON CONFLICT (event_id) DO NOTHING
    RETURNING event_type, occurred_at, duration_ms, scroll_percent
  )
  SELECT
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE event_type = 'page_view')::INTEGER,
    COUNT(*) FILTER (WHERE event_type = 'heartbeat')::INTEGER,
    COUNT(*) FILTER (
      WHERE event_type IN ('contact_submit', 'conversion')
    )::INTEGER,
    COALESCE(SUM(duration_ms) FILTER (
      WHERE event_type IN ('heartbeat', 'engagement')
    ), 0)::BIGINT,
    COALESCE(MAX(scroll_percent), 0)::INTEGER,
    BOOL_OR(event_type = 'session_end'),
    MAX(occurred_at) FILTER (WHERE event_type = 'heartbeat'),
    MAX(occurred_at) FILTER (WHERE event_type = 'session_end')
  INTO
    accepted_count,
    pageview_delta,
    heartbeat_delta,
    conversion_delta,
    engagement_delta,
    max_scroll_delta,
    has_session_end,
    last_heartbeat_event_at,
    last_session_end_event_at
  FROM inserted;

  duplicate_count := duplicate_count
    + jsonb_array_length(new_events)
    - accepted_count;

  UPDATE public.analytics_sessions
  SET
    landing_path = CASE
      WHEN batch_started_at < started_at
        AND first_path_value IS NOT NULL
      THEN first_path_value
      ELSE landing_path
    END,
    started_at = LEAST(started_at, batch_started_at),
    last_activity_at = GREATEST(last_activity_at, batch_last_activity_at),
    last_heartbeat_at = CASE
      WHEN heartbeat_delta > 0 THEN GREATEST(
        COALESCE(last_heartbeat_at, last_heartbeat_event_at),
        last_heartbeat_event_at
      )
      ELSE last_heartbeat_at
    END,
    ended_at = CASE
      WHEN has_session_end THEN GREATEST(
        COALESCE(ended_at, last_session_end_event_at),
        last_session_end_event_at
      )
      ELSE ended_at
    END,
    exit_path = CASE
      WHEN batch_last_activity_at >= last_activity_at
      THEN COALESCE(last_path_value, exit_path)
      ELSE exit_path
    END,
    pageview_count = pageview_count + pageview_delta,
    event_count = event_count + accepted_count,
    engagement_duration_ms = engagement_duration_ms + engagement_delta,
    max_scroll_percent = GREATEST(max_scroll_percent, max_scroll_delta),
    conversion_count = conversion_count + conversion_delta,
    is_engaged = (
      pageview_count + pageview_delta >= 2
      OR engagement_duration_ms + engagement_delta >= 10000
      OR conversion_count + conversion_delta > 0
    ),
    updated_at = accepted_at
  WHERE id = session_id_value;

  UPDATE public.analytics_visitors
  SET
    last_seen_at = GREATEST(last_seen_at, accepted_at),
    event_count = event_count + accepted_count,
    updated_at = accepted_at
  WHERE id = visitor_id_value;

  UPDATE public.analytics_ingest_health
  SET
    accepted_batches = accepted_batches + 1,
    accepted_events = accepted_events + accepted_count,
    duplicate_events = duplicate_events + duplicate_count,
    rejected_events = rejected_events + rejected_count,
    last_success_at = accepted_at,
    last_failure_code = NULL,
    updated_at = accepted_at
  WHERE id = 1;

  RETURN jsonb_build_object(
    'success', TRUE,
    'visitor_id', visitor_id_value,
    'session_id', session_id_value,
    'is_new_visitor', is_new_visitor,
    'is_new_session', is_new_session,
    'accepted_count', accepted_count,
    'duplicate_count', duplicate_count,
    'rejected_count', rejected_count
  );
END
$function$;

REVOKE ALL ON FUNCTION public.ingest_analytics_events(TEXT, UUID, JSONB, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE
  ON FUNCTION public.ingest_analytics_events(TEXT, UUID, JSONB, JSONB)
  TO service_role;

-- Optional backend hook for failures that occur before/around the atomic ingest
-- transaction (for example request validation or database connectivity).
DROP FUNCTION IF EXISTS public.record_analytics_ingest_failure(TEXT);

CREATE OR REPLACE FUNCTION public.record_analytics_ingest_failure(
  p_error_code TEXT,
  p_rejected_count INTEGER DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  safe_error_code TEXT := COALESCE(
    NULLIF(left(btrim(p_error_code), 128), ''),
    'UNKNOWN'
  );
BEGIN
  IF p_rejected_count IS NULL OR p_rejected_count NOT BETWEEN 0 AND 20 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'rejected_count must be between 0 and 20';
  END IF;

  UPDATE public.analytics_ingest_health
  SET
    failed_batches = failed_batches + 1,
    rejected_events = rejected_events + p_rejected_count,
    last_failure_at = clock_timestamp(),
    last_failure_code = safe_error_code,
    updated_at = clock_timestamp()
  WHERE id = 1;
END
$function$;

REVOKE ALL ON FUNCTION public.record_analytics_ingest_failure(TEXT, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE
  ON FUNCTION public.record_analytics_ingest_failure(TEXT, INTEGER)
  TO service_role;

COMMENT ON TABLE public.analytics_visitors IS
  'Pseudonymous visitor aggregates. visitor_key must be generated by the trusted backend.';
COMMENT ON TABLE public.analytics_sessions IS
  'Server-authoritative 30-minute analytics sessions without raw IP, full UA or coordinates.';
COMMENT ON TABLE public.analytics_events IS
  'Append-only, idempotent Analytics v2 events keyed by event_id.';
COMMENT ON TABLE public.analytics_ingest_health IS
  'Singleton counters describing Analytics v2 ingestion pipeline health.';
COMMENT ON TABLE public.analytics_rate_limits IS
  'Atomic fixed-window counters keyed only by SHA-256 digests.';
COMMENT ON FUNCTION public.ingest_analytics_events(TEXT, UUID, JSONB, JSONB) IS
  'Service-role-only atomic event ingestion with UUID dedupe and 30-minute sessionization.';
COMMENT ON FUNCTION public.check_analytics_rate_limit(
  TEXT,
  INTEGER,
  INTEGER,
  INTEGER
) IS
  'Service-role-only event-weighted atomic fixed-window rate limiter.';
