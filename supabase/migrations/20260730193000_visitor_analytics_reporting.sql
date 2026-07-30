-- Visitor Analytics v2 reporting primitives (2026-07-30 19:30 Europe/Istanbul)
--
-- This migration is intentionally reporting-only:
--   * no raw visitor identifiers are returned by any RPC;
--   * public/anon/authenticated roles cannot execute reporting functions;
--   * human, bot, internal and test traffic remain separate;
--   * every query has a bounded date range and bounded result size.

CREATE INDEX IF NOT EXISTS analytics_sessions_reporting_idx
  ON public.analytics_sessions(traffic_class, started_at DESC, id);

CREATE INDEX IF NOT EXISTS analytics_sessions_reporting_created_cursor_idx
  ON public.analytics_sessions(created_at DESC, id);

CREATE INDEX IF NOT EXISTS analytics_events_reporting_idx
  ON public.analytics_events(session_id, occurred_at, event_type);

CREATE INDEX IF NOT EXISTS analytics_events_reporting_window_idx
  ON public.analytics_events(occurred_at, session_id)
  INCLUDE (event_type, path, duration_ms);

CREATE OR REPLACE FUNCTION public.analytics_reporting_validate_range(
  p_from TIMESTAMPTZ,
  p_to TIMESTAMPTZ,
  p_timezone TEXT
)
RETURNS VOID
LANGUAGE plpgsql
STABLE
SET search_path = pg_catalog, public
AS $function$
BEGIN
  IF p_from IS NULL OR p_to IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22004',
      MESSAGE = 'from and to are required';
  END IF;

  IF p_from >= p_to THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'from must be earlier than to';
  END IF;

  IF p_to - p_from > INTERVAL '366 days' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'reporting range cannot exceed 366 days';
  END IF;

  IF p_timezone IS NULL
    OR char_length(p_timezone) NOT BETWEEN 1 AND 100
    OR p_timezone !~ '^[A-Za-z0-9_+./-]+$'
    OR NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_timezone_names timezone_item
      WHERE timezone_item.name = p_timezone
    )
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'timezone is not recognized';
  END IF;
END
$function$;

REVOKE ALL
  ON FUNCTION public.analytics_reporting_validate_range(
    TIMESTAMPTZ,
    TIMESTAMPTZ,
    TEXT
  )
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.analytics_reporting_channel(
  p_source TEXT,
  p_medium TEXT,
  p_referrer_domain TEXT
)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = pg_catalog, public
AS $function$
  SELECT CASE
    WHEN lower(COALESCE(p_medium, '')) IN (
      'cpc', 'ppc', 'paid', 'paidsearch', 'paid_search', 'display'
    ) THEN 'Paid'
    WHEN lower(COALESCE(p_medium, '')) IN (
      'email', 'e-mail', 'newsletter'
    ) THEN 'Email'
    WHEN lower(COALESCE(p_medium, '')) IN (
      'social', 'social-network', 'social_media', 'sm'
    )
      OR lower(COALESCE(p_source, p_referrer_domain, '')) ~
        '(facebook|instagram|linkedin|twitter|t\.co|x\.com|youtube|youtu\.be|reddit|pinterest|tiktok)'
    THEN 'Social'
    WHEN lower(COALESCE(p_medium, '')) IN (
      'organic', 'organic_search', 'search'
    )
      OR lower(COALESCE(p_referrer_domain, '')) ~
        '(^|\.)((google|bing|yahoo|yandex|duckduckgo)\.)'
    THEN 'Organic Search'
    WHEN NULLIF(btrim(COALESCE(p_source, '')), '') IS NOT NULL
      OR NULLIF(btrim(COALESCE(p_referrer_domain, '')), '') IS NOT NULL
    THEN 'Referral'
    ELSE 'Direct'
  END
$function$;

REVOKE ALL
  ON FUNCTION public.analytics_reporting_channel(TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated, service_role;

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
  result JSONB;
BEGIN
  PERFORM public.analytics_reporting_validate_range(
    p_from,
    p_to,
    p_timezone
  );

  WITH
  human_events AS MATERIALIZED (
    SELECT
      event_item.event_id,
      event_item.session_id,
      event_item.event_type,
      event_item.occurred_at,
      event_item.received_at,
      event_item.path,
      event_item.title,
      event_item.sequence,
      event_item.screen_bucket,
      event_item.duration_ms,
      event_item.properties
    FROM public.analytics_events event_item
    INNER JOIN public.analytics_sessions session_item
      ON session_item.id = event_item.session_id
      AND session_item.traffic_class = 'human'
    WHERE event_item.occurred_at >= p_from
      AND event_item.occurred_at < p_to
  ),
  session_window_metrics AS MATERIALIZED (
    SELECT
      event_item.session_id,
      count(*)::BIGINT AS event_count,
      count(*) FILTER (
        WHERE event_item.event_type = 'page_view'
      )::BIGINT AS page_views,
      COALESCE(sum(event_item.duration_ms) FILTER (
        WHERE event_item.event_type IN ('heartbeat', 'engagement')
      ), 0)::BIGINT AS engagement_duration_ms,
      count(*) FILTER (
        WHERE event_item.event_type IN ('contact_submit', 'conversion')
      )::BIGINT AS conversion_count
    FROM human_events event_item
    GROUP BY event_item.session_id
  ),
  human_sessions AS MATERIALIZED (
    SELECT
      session_item.id,
      session_item.visitor_id,
      session_item.referrer_domain,
      session_item.source,
      session_item.medium,
      session_item.campaign,
      session_item.country_code,
      session_item.country_name,
      session_item.city,
      session_item.device_type,
      session_item.browser_name,
      session_item.os_name,
      session_item.consent_version,
      window_metrics.event_count,
      window_metrics.page_views,
      window_metrics.engagement_duration_ms,
      window_metrics.conversion_count,
      (
        window_metrics.page_views >= 2
        OR window_metrics.engagement_duration_ms >= 10000
        OR window_metrics.conversion_count > 0
      ) AS is_engaged
    FROM session_window_metrics window_metrics
    INNER JOIN public.analytics_sessions session_item
      ON session_item.id = window_metrics.session_id
  ),
  active_bot_sessions AS MATERIALIZED (
    SELECT DISTINCT event_item.session_id
    FROM public.analytics_events event_item
    INNER JOIN public.analytics_sessions session_item
      ON session_item.id = event_item.session_id
      AND session_item.traffic_class IN (
        'suspected_bot',
        'verified_bot'
      )
    WHERE event_item.occurred_at >= p_from
      AND event_item.occurred_at < p_to
  ),
  day_bounds AS (
    SELECT
      (p_from AT TIME ZONE p_timezone)::DATE AS first_day,
      ((p_to - INTERVAL '1 microsecond') AT TIME ZONE p_timezone)::DATE
        AS last_day
  ),
  days AS MATERIALIZED (
    SELECT generate_series(
      day_bounds.first_day,
      day_bounds.last_day,
      INTERVAL '1 day'
    )::DATE AS bucket_day
    FROM day_bounds
  ),
  event_series AS (
    SELECT
      (event_item.occurred_at AT TIME ZONE p_timezone)::DATE AS bucket_day,
      count(DISTINCT session_item.visitor_id)::BIGINT AS visitors,
      count(DISTINCT event_item.session_id)::BIGINT AS sessions,
      count(*) FILTER (
        WHERE event_item.event_type = 'page_view'
      )::BIGINT AS page_views,
      count(*) FILTER (
        WHERE event_item.event_type IN ('contact_submit', 'conversion')
      )::BIGINT AS conversions
    FROM human_events event_item
    INNER JOIN human_sessions session_item
      ON session_item.id = event_item.session_id
    GROUP BY 1
  ),
  page_views AS MATERIALIZED (
    SELECT
      event_item.event_id,
      event_item.session_id,
      event_item.occurred_at,
      event_item.path,
      event_item.sequence,
      event_item.screen_bucket
    FROM human_events event_item
    WHERE event_item.event_type = 'page_view'
      AND event_item.path IS NOT NULL
  ),
  page_stats AS (
    SELECT
      page_view.path,
      count(*)::BIGINT AS page_views,
      count(DISTINCT page_view.session_id)::BIGINT AS sessions
    FROM page_views page_view
    GROUP BY page_view.path
  ),
  exit_stats AS (
    SELECT
      last_page.path,
      count(*)::BIGINT AS exits
    FROM (
      SELECT DISTINCT ON (page_view.session_id)
        page_view.session_id,
        page_view.path
      FROM page_views page_view
      ORDER BY
        page_view.session_id,
        page_view.occurred_at DESC,
        page_view.sequence DESC,
        page_view.event_id DESC
    ) last_page
    GROUP BY last_page.path
  ),
  engagement_by_page AS (
    SELECT
      event_item.path,
      COALESCE(sum(event_item.duration_ms), 0)::BIGINT AS duration_ms
    FROM human_events event_item
    WHERE event_item.event_type IN ('engagement', 'heartbeat')
      AND event_item.path IS NOT NULL
      AND event_item.duration_ms IS NOT NULL
    GROUP BY event_item.path
  ),
  session_acquisition AS MATERIALIZED (
    SELECT
      public.analytics_reporting_channel(
        session_item.source,
        session_item.medium,
        session_item.referrer_domain
      ) AS channel,
      NULLIF(btrim(session_item.source), '') AS source,
      NULLIF(btrim(session_item.medium), '') AS medium,
      NULLIF(btrim(session_item.campaign), '') AS campaign,
      count(*)::BIGINT AS sessions,
      COALESCE(sum(session_item.conversion_count), 0)::BIGINT AS conversions
    FROM human_sessions session_item
    GROUP BY 1, 2, 3, 4
  ),
  page_acquisition AS MATERIALIZED (
    SELECT
      public.analytics_reporting_channel(
        session_item.source,
        session_item.medium,
        session_item.referrer_domain
      ) AS channel,
      NULLIF(btrim(session_item.source), '') AS source,
      NULLIF(btrim(session_item.medium), '') AS medium,
      NULLIF(btrim(session_item.campaign), '') AS campaign,
      count(*)::BIGINT AS page_views
    FROM page_views page_view
    INNER JOIN public.analytics_sessions session_item
      ON session_item.id = page_view.session_id
      AND session_item.traffic_class = 'human'
    GROUP BY 1, 2, 3, 4
  ),
  acquisition_rows AS MATERIALIZED (
    SELECT
      COALESCE(session_row.channel, page_row.channel) AS channel,
      COALESCE(session_row.source, page_row.source) AS source,
      COALESCE(session_row.medium, page_row.medium) AS medium,
      COALESCE(session_row.campaign, page_row.campaign) AS campaign,
      COALESCE(session_row.sessions, 0)::BIGINT AS sessions,
      COALESCE(page_row.page_views, 0)::BIGINT AS page_views,
      COALESCE(session_row.conversions, 0)::BIGINT AS conversions
    FROM session_acquisition session_row
    FULL OUTER JOIN page_acquisition page_row
      ON page_row.channel = session_row.channel
      AND page_row.source IS NOT DISTINCT FROM session_row.source
      AND page_row.medium IS NOT DISTINCT FROM session_row.medium
      AND page_row.campaign IS NOT DISTINCT FROM session_row.campaign
  ),
  web_vital_values AS MATERIALIZED (
    SELECT
      upper(
        COALESCE(
          NULLIF(event_item.properties ->> 'metric_name', ''),
          NULLIF(event_item.properties ->> 'metric', '')
        )
      ) AS metric,
      CASE
        -- Phase 2 stores Web Vital values in the bounded duration_ms column.
        -- CLS is represented as milli-CLS so that it remains an integer on the
        -- wire and is converted back to its standard unit for reporting.
        WHEN upper(
          COALESCE(
            NULLIF(event_item.properties ->> 'metric_name', ''),
            NULLIF(event_item.properties ->> 'metric', '')
          )
        ) = 'CLS'
        THEN event_item.duration_ms / 1000.0
        WHEN event_item.duration_ms IS NOT NULL
        THEN event_item.duration_ms::NUMERIC
        ELSE NULL
      END AS metric_value
    FROM human_events event_item
    WHERE event_item.event_type = 'web_vital'
  ),
  web_vital_p75 AS MATERIALIZED (
    SELECT
      vital.metric,
      percentile_cont(0.75) WITHIN GROUP (
        ORDER BY vital.metric_value
      )::NUMERIC AS p75,
      count(*)::BIGINT AS measurements
    FROM web_vital_values vital
    WHERE vital.metric IN ('LCP', 'INP', 'CLS', 'FCP', 'TTFB')
      AND vital.metric_value IS NOT NULL
      AND vital.metric_value >= 0
    GROUP BY vital.metric
  )
  SELECT jsonb_build_object(
    'range', jsonb_build_object(
      'from', p_from,
      'to', p_to,
      'timezone', p_timezone
    ),
    'summary', jsonb_build_object(
      'visitors', (
        SELECT count(DISTINCT session_item.visitor_id)
        FROM human_sessions session_item
      ),
      'sessions', (
        SELECT count(*)
        FROM human_sessions
      ),
      'pageViews', (
        SELECT count(*)
        FROM page_views
      ),
      'engagedSessions', (
        SELECT count(*)
        FROM human_sessions session_item
        WHERE session_item.is_engaged
      ),
      'engagementRate', (
        SELECT COALESCE(
          round(
            100.0
            * count(*) FILTER (WHERE session_item.is_engaged)
            / NULLIF(count(*), 0),
            2
          ),
          0
        )
        FROM human_sessions session_item
      ),
      'avgEngagementSeconds', (
        SELECT COALESCE(
          round(avg(session_item.engagement_duration_ms) / 1000.0, 2),
          0
        )
        FROM human_sessions session_item
      ),
      'conversions', (
        SELECT COALESCE(sum(session_item.conversion_count), 0)
        FROM human_sessions session_item
      )
    ),
    'series', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'bucket', to_char(day_item.bucket_day, 'YYYY-MM-DD'),
          'visitors', COALESCE(event_row.visitors, 0),
          'sessions', COALESCE(event_row.sessions, 0),
          'pageViews', COALESCE(event_row.page_views, 0),
          'conversions', COALESCE(event_row.conversions, 0)
        )
        ORDER BY day_item.bucket_day
      )
      FROM days day_item
      LEFT JOIN event_series event_row
        ON event_row.bucket_day = day_item.bucket_day
    ), '[]'::jsonb),
    'topPages', COALESCE((
      SELECT jsonb_agg(
        to_jsonb(page_row)
        ORDER BY page_row."pageViews" DESC, page_row.path
      )
      FROM (
        SELECT
          page_stat.path,
          page_stat.page_views AS "pageViews",
          page_stat.sessions,
          COALESCE(exit_stat.exits, 0)::BIGINT AS exits,
          CASE
            WHEN page_stat.sessions = 0 THEN 0
            ELSE round(
              COALESCE(engagement.duration_ms, 0)
              / (page_stat.sessions * 1000.0),
              2
            )
          END AS "avgEngagementSeconds"
        FROM page_stats page_stat
        LEFT JOIN exit_stats exit_stat
          ON exit_stat.path = page_stat.path
        LEFT JOIN engagement_by_page engagement
          ON engagement.path = page_stat.path
        ORDER BY page_stat.page_views DESC, page_stat.path
        LIMIT 100
      ) page_row
    ), '[]'::jsonb),
    'acquisition', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'channel', acquisition_row.channel,
          'source', acquisition_row.source,
          'medium', acquisition_row.medium,
          'campaign', acquisition_row.campaign,
          'sessions', acquisition_row.sessions,
          'pageViews', acquisition_row.page_views,
          'conversions', acquisition_row.conversions
        )
        ORDER BY
          acquisition_row.sessions DESC,
          acquisition_row.page_views DESC,
          acquisition_row.channel
      )
      FROM (
        SELECT *
        FROM acquisition_rows
        ORDER BY sessions DESC, page_views DESC, channel
        LIMIT 100
      ) acquisition_row
    ), '[]'::jsonb),
    'technology', jsonb_build_object(
      'devices', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'name', dimension.name,
            'sessions', dimension.sessions
          )
          ORDER BY dimension.sessions DESC, dimension.name
        )
        FROM (
          SELECT
            COALESCE(NULLIF(btrim(session_item.device_type), ''), 'unknown')
              AS name,
            count(*)::BIGINT AS sessions
          FROM human_sessions session_item
          GROUP BY 1
          ORDER BY sessions DESC, name
          LIMIT 25
        ) dimension
      ), '[]'::jsonb),
      'browsers', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'name', dimension.name,
            'sessions', dimension.sessions
          )
          ORDER BY dimension.sessions DESC, dimension.name
        )
        FROM (
          SELECT
            COALESCE(NULLIF(btrim(session_item.browser_name), ''), 'unknown')
              AS name,
            count(*)::BIGINT AS sessions
          FROM human_sessions session_item
          GROUP BY 1
          ORDER BY sessions DESC, name
          LIMIT 25
        ) dimension
      ), '[]'::jsonb),
      'operatingSystems', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'name', dimension.name,
            'sessions', dimension.sessions
          )
          ORDER BY dimension.sessions DESC, dimension.name
        )
        FROM (
          SELECT
            COALESCE(NULLIF(btrim(session_item.os_name), ''), 'unknown')
              AS name,
            count(*)::BIGINT AS sessions
          FROM human_sessions session_item
          GROUP BY 1
          ORDER BY sessions DESC, name
          LIMIT 25
        ) dimension
      ), '[]'::jsonb),
      'screenBuckets', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'name', dimension.name,
            'pageViews', dimension.page_views
          )
          ORDER BY dimension.page_views DESC, dimension.name
        )
        FROM (
          SELECT
            COALESCE(NULLIF(page_view.screen_bucket, ''), 'unknown') AS name,
            count(*)::BIGINT AS page_views
          FROM page_views page_view
          GROUP BY 1
          ORDER BY page_views DESC, name
          LIMIT 25
        ) dimension
      ), '[]'::jsonb)
    ),
    'geography', jsonb_build_object(
      'countries', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'countryCode', dimension.country_code,
            'countryName', dimension.country_name,
            'sessions', dimension.sessions
          )
          ORDER BY dimension.sessions DESC, dimension.country_name
        )
        FROM (
          SELECT
            session_item.country_code,
            COALESCE(
              NULLIF(btrim(session_item.country_name), ''),
              session_item.country_code,
              'unknown'
            ) AS country_name,
            count(*)::BIGINT AS sessions
          FROM human_sessions session_item
          GROUP BY 1, 2
          ORDER BY sessions DESC, country_name
          LIMIT 100
        ) dimension
      ), '[]'::jsonb),
      'cities', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'countryCode', dimension.country_code,
            'city', dimension.city,
            'sessions', dimension.sessions
          )
          ORDER BY dimension.sessions DESC, dimension.city
        )
        FROM (
          SELECT
            session_item.country_code,
            COALESCE(NULLIF(btrim(session_item.city), ''), 'unknown') AS city,
            count(*)::BIGINT AS sessions
          FROM human_sessions session_item
          GROUP BY 1, 2
          ORDER BY sessions DESC, city
          LIMIT 100
        ) dimension
      ), '[]'::jsonb)
    ),
    'events', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'eventType', event_dimension.event_type,
          'count', event_dimension.event_count
        )
        ORDER BY event_dimension.event_count DESC, event_dimension.event_type
      )
      FROM (
        SELECT
          event_item.event_type,
          count(*)::BIGINT AS event_count
        FROM human_events event_item
        GROUP BY event_item.event_type
        ORDER BY event_count DESC, event_type
        LIMIT 25
      ) event_dimension
    ), '[]'::jsonb),
    'webVitals', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'metric', vital.metric,
          'p75', round(vital.p75, 3),
          'rating', CASE
            WHEN vital.measurements < 20 THEN 'unknown'
            WHEN vital.metric = 'LCP' AND vital.p75 <= 2500 THEN 'good'
            WHEN vital.metric = 'LCP' AND vital.p75 <= 4000
              THEN 'needs-improvement'
            WHEN vital.metric = 'LCP' THEN 'poor'
            WHEN vital.metric = 'INP' AND vital.p75 <= 200 THEN 'good'
            WHEN vital.metric = 'INP' AND vital.p75 <= 500
              THEN 'needs-improvement'
            WHEN vital.metric = 'INP' THEN 'poor'
            WHEN vital.metric = 'CLS' AND vital.p75 <= 0.1 THEN 'good'
            WHEN vital.metric = 'CLS' AND vital.p75 <= 0.25
              THEN 'needs-improvement'
            WHEN vital.metric = 'CLS' THEN 'poor'
            ELSE 'unknown'
          END,
          'measurements', vital.measurements
        )
        ORDER BY
          CASE vital.metric
            WHEN 'LCP' THEN 1
            WHEN 'INP' THEN 2
            WHEN 'CLS' THEN 3
            WHEN 'FCP' THEN 4
            WHEN 'TTFB' THEN 5
            ELSE 6
          END
      )
      FROM web_vital_p75 vital
    ), '[]'::jsonb),
    'quality', jsonb_build_object(
      'humanSessions', (
        SELECT count(*)
        FROM human_sessions
      ),
      'botSessions', (
        SELECT count(*)
        FROM active_bot_sessions
      ),
      'consentVersions', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'version', consent_row.version,
            'sessions', consent_row.sessions
          )
          ORDER BY consent_row.sessions DESC, consent_row.version
        )
        FROM (
          SELECT
            COALESCE(
              NULLIF(btrim(session_item.consent_version), ''),
              'unknown'
            ) AS version,
            count(*)::BIGINT AS sessions
          FROM human_sessions session_item
          GROUP BY 1
          ORDER BY sessions DESC, version
          LIMIT 25
        ) consent_row
      ), '[]'::jsonb),
      'lateEvents', (
        SELECT count(*)
        FROM human_events event_item
        WHERE event_item.received_at >
          event_item.occurred_at + INTERVAL '5 minutes'
      ),
      'duplicateEvents', COALESCE((
        SELECT health.duplicate_events
        FROM public.analytics_ingest_health health
        WHERE health.id = 1
      ), 0),
      'rejectedEvents', COALESCE((
        SELECT health.rejected_events
        FROM public.analytics_ingest_health health
        WHERE health.id = 1
      ), 0),
      'counterScope', 'all-time',
      'lastSuccessAt', (
        SELECT health.last_success_at
        FROM public.analytics_ingest_health health
        WHERE health.id = 1
      )
    )
  )
  INTO result;

  RETURN result;
END
$function$;

REVOKE ALL
  ON FUNCTION public.get_analytics_dashboard(
    TIMESTAMPTZ,
    TIMESTAMPTZ,
    TEXT
  )
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE
  ON FUNCTION public.get_analytics_dashboard(
    TIMESTAMPTZ,
    TIMESTAMPTZ,
    TEXT
  )
  TO service_role;

-- Remove the pre-snapshot draft signature if this migration was exercised
-- before the reporting cursor contract was finalized.
DROP FUNCTION IF EXISTS public.get_analytics_sessions(
  TIMESTAMPTZ,
  TIMESTAMPTZ,
  TEXT,
  INTEGER,
  TIMESTAMPTZ,
  TEXT,
  TEXT,
  TEXT
);

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
  result JSONB;
  snapshot_to_value TIMESTAMPTZ :=
    COALESCE(p_snapshot_to, statement_timestamp());
BEGIN
  PERFORM public.analytics_reporting_validate_range(
    p_from,
    p_to,
    p_timezone
  );

  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'limit must be between 1 and 100';
  END IF;

  IF p_traffic_class IS NULL
    OR p_traffic_class NOT IN ('human', 'bots', 'all')
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'traffic_class must be human, bots or all';
  END IF;

  IF snapshot_to_value > statement_timestamp() + INTERVAL '5 minutes' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'snapshot_to cannot be in the future';
  END IF;

  IF (p_cursor_at IS NULL) <> (p_cursor_key IS NULL)
    OR (
      p_cursor_key IS NOT NULL
      AND p_cursor_key !~ '^[a-f0-9]{32}$'
    )
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'cursor is invalid';
  END IF;

  IF p_path IS NOT NULL AND (
    char_length(p_path) NOT BETWEEN 1 AND 512
    OR p_path NOT LIKE '/%'
    OR p_path LIKE '//%'
    OR position('?' IN p_path) > 0
    OR position('#' IN p_path) > 0
    OR position(E'\\' IN p_path) > 0
    OR p_path ~ '[[:cntrl:]]'
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'path must be a canonical internal path';
  END IF;

  WITH
  candidates AS MATERIALIZED (
    SELECT
      session_item.id,
      session_item.created_at,
      session_item.started_at,
      session_item.last_activity_at,
      session_item.traffic_class,
      session_item.is_engaged,
      session_item.pageview_count,
      session_item.event_count,
      session_item.engagement_duration_ms,
      session_item.max_scroll_percent,
      session_item.conversion_count,
      session_item.landing_path,
      session_item.exit_path,
      session_item.source,
      session_item.medium,
      session_item.campaign,
      session_item.referrer_domain,
      session_item.country_code,
      session_item.country_name,
      session_item.region,
      session_item.city,
      session_item.device_type,
      session_item.browser_name,
      session_item.os_name,
      session_item.consent_version,
      md5(session_item.id::TEXT) AS cursor_key
    FROM public.analytics_sessions session_item
    WHERE session_item.started_at >= p_from
      AND session_item.started_at < p_to
      AND session_item.created_at <= snapshot_to_value
      AND (
        p_traffic_class = 'all'
        OR (
          p_traffic_class = 'human'
          AND session_item.traffic_class = 'human'
        )
        OR (
          p_traffic_class = 'bots'
          AND session_item.traffic_class IN (
            'suspected_bot',
            'verified_bot'
          )
        )
      )
      AND (
        p_path IS NULL
        OR session_item.landing_path = p_path
        OR session_item.exit_path = p_path
        OR EXISTS (
          SELECT 1
          FROM public.analytics_events path_event
          WHERE path_event.session_id = session_item.id
            AND path_event.path = p_path
            AND path_event.occurred_at >= p_from
            AND path_event.occurred_at < p_to
        )
      )
      AND (
        p_cursor_at IS NULL
        OR session_item.created_at < p_cursor_at
        OR (
          session_item.created_at = p_cursor_at
          AND md5(session_item.id::TEXT) < p_cursor_key
        )
      )
    ORDER BY
      session_item.created_at DESC,
      md5(session_item.id::TEXT) DESC
    LIMIT p_limit + 1
  ),
  page_rows AS MATERIALIZED (
    SELECT candidate.*
    FROM candidates candidate
    ORDER BY candidate.created_at DESC, candidate.cursor_key DESC
    LIMIT p_limit
  ),
  page_state AS (
    SELECT
      (SELECT count(*) > p_limit FROM candidates) AS has_more,
      (
        SELECT page_item.created_at
        FROM page_rows page_item
        ORDER BY page_item.created_at, page_item.cursor_key
        LIMIT 1
      ) AS cursor_at,
      (
        SELECT page_item.cursor_key
        FROM page_rows page_item
        ORDER BY page_item.created_at, page_item.cursor_key
        LIMIT 1
      ) AS cursor_key
  )
  SELECT jsonb_build_object(
    'items', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'sessionRef', 's_' || substr(page_item.cursor_key, 1, 16),
          'startedAt', page_item.started_at,
          'lastActivityAt', page_item.last_activity_at,
          'durationSeconds', GREATEST(
            round(
              EXTRACT(
                EPOCH FROM (
                  page_item.last_activity_at - page_item.started_at
                )
              )::NUMERIC,
              2
            ),
            0
          ),
          'trafficClass', page_item.traffic_class,
          'isEngaged', page_item.is_engaged,
          'pageViews', page_item.pageview_count,
          'eventCount', page_item.event_count,
          'engagementSeconds', round(
            page_item.engagement_duration_ms / 1000.0,
            2
          ),
          'maxScrollPercent', page_item.max_scroll_percent,
          'conversions', page_item.conversion_count,
          'landingPath', page_item.landing_path,
          'exitPath', page_item.exit_path,
          'source', page_item.source,
          'medium', page_item.medium,
          'campaign', page_item.campaign,
          'referrerDomain', page_item.referrer_domain,
          'countryCode', page_item.country_code,
          'countryName', page_item.country_name,
          'region', page_item.region,
          'city', page_item.city,
          'deviceType', page_item.device_type,
          'browser', page_item.browser_name,
          'operatingSystem', page_item.os_name,
          'consentVersion', page_item.consent_version,
          'journey', journey_data.journey,
          'journeyTruncated', journey_data.is_truncated
        )
        ORDER BY page_item.created_at DESC, page_item.cursor_key DESC
      )
      FROM page_rows page_item
      LEFT JOIN LATERAL (
        SELECT
          COALESCE(
            jsonb_agg(
              jsonb_build_object(
                'occurredAt', journey_event.occurred_at,
                'path', journey_event.path,
                'title', journey_event.title
              )
              ORDER BY
                journey_event.occurred_at,
                journey_event.sequence,
                journey_event.event_id
            ) FILTER (WHERE journey_event.row_number <= 100),
            '[]'::jsonb
          ) AS journey,
          count(*) > 100 AS is_truncated
        FROM (
          SELECT
            event_item.event_id,
            event_item.occurred_at,
            event_item.path,
            event_item.title,
            event_item.sequence,
            row_number() OVER (
              ORDER BY
                event_item.occurred_at,
                event_item.sequence,
                event_item.event_id
            ) AS row_number
          FROM public.analytics_events event_item
          WHERE event_item.session_id = page_item.id
            AND event_item.event_type = 'page_view'
            AND event_item.occurred_at >= p_from
            AND event_item.occurred_at < p_to
          ORDER BY
            event_item.occurred_at,
            event_item.sequence,
            event_item.event_id
          LIMIT 101
        ) journey_event
      ) journey_data ON TRUE
    ), '[]'::jsonb),
    'hasMore', page_state.has_more,
    'nextCursor', CASE
      WHEN page_state.has_more THEN jsonb_build_object(
        'at', page_state.cursor_at,
        'key', page_state.cursor_key
      )
      ELSE NULL
    END
  )
  INTO result
  FROM page_state;

  RETURN result;
END
$function$;

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
  PERFORM public.analytics_reporting_validate_range(
    p_from,
    p_to,
    p_timezone
  );

  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 10000 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'export limit must be between 1 and 10000';
  END IF;

  IF p_dataset IS NULL
    OR p_dataset NOT IN ('sessions', 'pages', 'acquisition')
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'dataset must be sessions, pages or acquisition';
  END IF;

  IF p_dataset = 'sessions' THEN
    RETURN QUERY
    SELECT jsonb_build_object(
      'sessionRef', 's_' || substr(md5(session_item.id::TEXT), 1, 16),
      'startedAt', session_item.started_at,
      'lastActivityAt', session_item.last_activity_at,
      'durationSeconds', GREATEST(
        round(
          EXTRACT(
            EPOCH FROM (
              session_item.last_activity_at - session_item.started_at
            )
          )::NUMERIC,
          2
        ),
        0
      ),
      'trafficClass', session_item.traffic_class,
      'isEngaged', session_item.is_engaged,
      'pageViews', session_item.pageview_count,
      'eventCount', session_item.event_count,
      'engagementSeconds', round(
        session_item.engagement_duration_ms / 1000.0,
        2
      ),
      'maxScrollPercent', session_item.max_scroll_percent,
      'conversions', session_item.conversion_count,
      'landingPath', session_item.landing_path,
      'exitPath', session_item.exit_path,
      'source', session_item.source,
      'medium', session_item.medium,
      'campaign', session_item.campaign,
      'referrerDomain', session_item.referrer_domain,
      'countryCode', session_item.country_code,
      'countryName', session_item.country_name,
      'region', session_item.region,
      'city', session_item.city,
      'deviceType', session_item.device_type,
      'browser', session_item.browser_name,
      'operatingSystem', session_item.os_name,
      'consentVersion', session_item.consent_version
    )
    FROM public.analytics_sessions session_item
    WHERE session_item.started_at >= p_from
      AND session_item.started_at < p_to
      AND session_item.traffic_class = 'human'
    ORDER BY session_item.started_at DESC, session_item.id DESC
    LIMIT p_limit;
  ELSIF p_dataset = 'pages' THEN
    RETURN QUERY
    SELECT jsonb_build_object(
      'path', page_row.path,
      'pageViews', page_row.page_views,
      'sessions', page_row.sessions,
      'exits', page_row.exits,
      'avgEngagementSeconds', page_row.avg_engagement_seconds
    )
    FROM (
      WITH page_stats AS MATERIALIZED (
        SELECT
          event_item.path,
          count(*)::BIGINT AS page_views,
          count(DISTINCT event_item.session_id)::BIGINT AS sessions,
          count(DISTINCT session_item.id) FILTER (
            WHERE session_item.exit_path = event_item.path
          )::BIGINT AS exits
        FROM public.analytics_events event_item
        INNER JOIN public.analytics_sessions session_item
          ON session_item.id = event_item.session_id
          AND session_item.traffic_class = 'human'
        WHERE event_item.occurred_at >= p_from
          AND event_item.occurred_at < p_to
          AND event_item.event_type = 'page_view'
          AND event_item.path IS NOT NULL
        GROUP BY event_item.path
      ),
      engagement_stats AS MATERIALIZED (
        SELECT
          event_item.path,
          COALESCE(sum(event_item.duration_ms), 0)::BIGINT AS duration_ms
        FROM public.analytics_events event_item
        INNER JOIN public.analytics_sessions session_item
          ON session_item.id = event_item.session_id
          AND session_item.traffic_class = 'human'
        WHERE event_item.occurred_at >= p_from
          AND event_item.occurred_at < p_to
          AND event_item.event_type IN ('engagement', 'heartbeat')
          AND event_item.path IS NOT NULL
          AND event_item.duration_ms IS NOT NULL
        GROUP BY event_item.path
      )
      SELECT
        page_stat.path,
        page_stat.page_views,
        page_stat.sessions,
        page_stat.exits,
        CASE
          WHEN page_stat.sessions = 0 THEN 0
          ELSE round(
            COALESCE(engagement_stat.duration_ms, 0)
            / (page_stat.sessions * 1000.0),
            2
          )
        END AS avg_engagement_seconds
      FROM page_stats page_stat
      LEFT JOIN engagement_stats engagement_stat
        ON engagement_stat.path = page_stat.path
      ORDER BY page_stat.page_views DESC, page_stat.path
      LIMIT p_limit
    ) page_row;
  ELSE
    RETURN QUERY
    WITH session_rows AS MATERIALIZED (
      SELECT
        public.analytics_reporting_channel(
          session_item.source,
          session_item.medium,
          session_item.referrer_domain
        ) AS channel,
        NULLIF(btrim(session_item.source), '') AS source,
        NULLIF(btrim(session_item.medium), '') AS medium,
        NULLIF(btrim(session_item.campaign), '') AS campaign,
        count(*)::BIGINT AS sessions,
        COALESCE(sum(session_item.conversion_count), 0)::BIGINT AS conversions
      FROM public.analytics_sessions session_item
      WHERE session_item.started_at >= p_from
        AND session_item.started_at < p_to
        AND session_item.traffic_class = 'human'
      GROUP BY 1, 2, 3, 4
    ),
    page_rows AS MATERIALIZED (
      SELECT
        public.analytics_reporting_channel(
          session_item.source,
          session_item.medium,
          session_item.referrer_domain
        ) AS channel,
        NULLIF(btrim(session_item.source), '') AS source,
        NULLIF(btrim(session_item.medium), '') AS medium,
        NULLIF(btrim(session_item.campaign), '') AS campaign,
        count(*)::BIGINT AS page_views
      FROM public.analytics_events event_item
      INNER JOIN public.analytics_sessions session_item
        ON session_item.id = event_item.session_id
        AND session_item.traffic_class = 'human'
      WHERE event_item.occurred_at >= p_from
        AND event_item.occurred_at < p_to
        AND event_item.event_type = 'page_view'
      GROUP BY 1, 2, 3, 4
    )
    SELECT jsonb_build_object(
      'channel', acquisition_row.channel,
      'source', acquisition_row.source,
      'medium', acquisition_row.medium,
      'campaign', acquisition_row.campaign,
      'sessions', acquisition_row.sessions,
      'pageViews', acquisition_row.page_views,
      'conversions', acquisition_row.conversions
    )
    FROM (
      SELECT
        COALESCE(session_row.channel, page_row.channel) AS channel,
        COALESCE(session_row.source, page_row.source) AS source,
        COALESCE(session_row.medium, page_row.medium) AS medium,
        COALESCE(session_row.campaign, page_row.campaign) AS campaign,
        COALESCE(session_row.sessions, 0)::BIGINT AS sessions,
        COALESCE(page_row.page_views, 0)::BIGINT AS page_views,
        COALESCE(session_row.conversions, 0)::BIGINT AS conversions
      FROM session_rows session_row
      FULL OUTER JOIN page_rows page_row
        ON page_row.channel = session_row.channel
        AND page_row.source IS NOT DISTINCT FROM session_row.source
        AND page_row.medium IS NOT DISTINCT FROM session_row.medium
        AND page_row.campaign IS NOT DISTINCT FROM session_row.campaign
      ORDER BY sessions DESC, page_views DESC, channel
      LIMIT p_limit
    ) acquisition_row;
  END IF;
END
$function$;

REVOKE ALL
  ON FUNCTION public.export_analytics_report(
    TIMESTAMPTZ,
    TIMESTAMPTZ,
    TEXT,
    TEXT,
    INTEGER
  )
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE
  ON FUNCTION public.export_analytics_report(
    TIMESTAMPTZ,
    TIMESTAMPTZ,
    TEXT,
    TEXT,
    INTEGER
  )
  TO service_role;
