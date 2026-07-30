-- Visitor Analytics phases 2-4: operations, rollups and lifecycle.
-- Additive and safe to run more than once after visitor_analytics_v2.

CREATE TABLE IF NOT EXISTS public.analytics_daily_rollups (
  bucket_date DATE NOT NULL,
  timezone TEXT NOT NULL,
  visitors BIGINT NOT NULL DEFAULT 0,
  sessions BIGINT NOT NULL DEFAULT 0,
  page_views BIGINT NOT NULL DEFAULT 0,
  engaged_sessions BIGINT NOT NULL DEFAULT 0,
  engagement_duration_ms BIGINT NOT NULL DEFAULT 0,
  conversions BIGINT NOT NULL DEFAULT 0,
  outbound_clicks BIGINT NOT NULL DEFAULT 0,
  downloads BIGINT NOT NULL DEFAULT 0,
  client_errors BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (bucket_date, timezone),
  CONSTRAINT analytics_daily_rollups_timezone_check
    CHECK (char_length(timezone) BETWEEN 1 AND 100),
  CONSTRAINT analytics_daily_rollups_counts_check CHECK (
    visitors >= 0
    AND sessions >= 0
    AND page_views >= 0
    AND engaged_sessions >= 0
    AND engagement_duration_ms >= 0
    AND conversions >= 0
    AND outbound_clicks >= 0
    AND downloads >= 0
    AND client_errors >= 0
  )
);

CREATE TABLE IF NOT EXISTS public.analytics_quality_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  window_started_at TIMESTAMPTZ NOT NULL,
  window_ended_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL,
  score SMALLINT NOT NULL,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT analytics_quality_runs_window_check
    CHECK (window_ended_at > window_started_at),
  CONSTRAINT analytics_quality_runs_status_check
    CHECK (status IN ('healthy', 'warning', 'critical', 'idle')),
  CONSTRAINT analytics_quality_runs_score_check CHECK (score BETWEEN 0 AND 100),
  CONSTRAINT analytics_quality_runs_json_check CHECK (
    jsonb_typeof(metrics) = 'object'
    AND jsonb_typeof(flags) = 'object'
    AND pg_column_size(metrics) <= 16384
    AND pg_column_size(flags) <= 16384
  )
);

CREATE INDEX IF NOT EXISTS analytics_daily_rollups_date_idx
  ON public.analytics_daily_rollups(bucket_date DESC);
CREATE INDEX IF NOT EXISTS analytics_quality_runs_created_idx
  ON public.analytics_quality_runs(created_at DESC);

ALTER TABLE public.analytics_daily_rollups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_daily_rollups FORCE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_quality_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_quality_runs FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.analytics_daily_rollups
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.analytics_quality_runs
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.analytics_daily_rollups TO service_role;
GRANT SELECT ON TABLE public.analytics_quality_runs TO service_role;

CREATE OR REPLACE FUNCTION public.refresh_analytics_daily_rollups(
  p_from DATE DEFAULT (CURRENT_DATE - 7),
  p_to DATE DEFAULT CURRENT_DATE,
  p_timezone TEXT DEFAULT 'Europe/Istanbul'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  refreshed_rows INTEGER := 0;
BEGIN
  IF p_from IS NULL OR p_to IS NULL OR p_from > p_to THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'from/to date range is invalid';
  END IF;
  IF p_to - p_from > 366 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'rollup range cannot exceed 366 days';
  END IF;
  IF p_timezone IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM pg_timezone_names zone WHERE zone.name = p_timezone
    )
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'timezone is invalid';
  END IF;

  WITH days AS (
    SELECT generate_series(p_from, p_to, INTERVAL '1 day')::DATE AS bucket_date
  ),
  event_session_daily AS (
    SELECT
      (event.occurred_at AT TIME ZONE p_timezone)::DATE AS bucket_date,
      event.visitor_id,
      event.session_id,
      COUNT(*) FILTER (WHERE event.event_type = 'page_view')::BIGINT AS page_views,
      COALESCE(SUM(event.duration_ms) FILTER (
        WHERE event.event_type IN ('heartbeat', 'engagement')
      ), 0)::BIGINT AS engagement_duration_ms,
      COUNT(*) FILTER (
        WHERE event.event_type IN ('contact_submit', 'conversion')
      )::BIGINT AS conversions,
      COUNT(*) FILTER (WHERE event.event_type = 'outbound_click')::BIGINT
        AS outbound_clicks,
      COUNT(*) FILTER (WHERE event.event_type = 'download')::BIGINT AS downloads,
      COUNT(*) FILTER (WHERE event.event_type = 'client_error')::BIGINT
        AS client_errors
    FROM public.analytics_events event
    JOIN public.analytics_sessions session ON session.id = event.session_id
    WHERE event.occurred_at >= (p_from::TIMESTAMP AT TIME ZONE p_timezone)
      AND event.occurred_at < ((p_to + 1)::TIMESTAMP AT TIME ZONE p_timezone)
      AND session.traffic_class = 'human'
    GROUP BY 1, 2, 3
  ),
  event_daily AS (
    SELECT
      event_session.bucket_date,
      COUNT(DISTINCT event_session.visitor_id)::BIGINT AS visitors,
      COUNT(*)::BIGINT AS sessions,
      COALESCE(SUM(event_session.page_views), 0)::BIGINT AS page_views,
      COUNT(*) FILTER (
        WHERE event_session.page_views >= 2
          OR event_session.engagement_duration_ms >= 10000
          OR event_session.conversions > 0
      )::BIGINT AS engaged_sessions,
      COALESCE(SUM(event_session.engagement_duration_ms), 0)::BIGINT
        AS engagement_duration_ms,
      COALESCE(SUM(event_session.conversions), 0)::BIGINT AS conversions,
      COALESCE(SUM(event_session.outbound_clicks), 0)::BIGINT
        AS outbound_clicks,
      COALESCE(SUM(event_session.downloads), 0)::BIGINT AS downloads,
      COALESCE(SUM(event_session.client_errors), 0)::BIGINT
        AS client_errors
    FROM event_session_daily event_session
    GROUP BY event_session.bucket_date
  )
  INSERT INTO public.analytics_daily_rollups (
    bucket_date,
    timezone,
    visitors,
    sessions,
    page_views,
    engaged_sessions,
    engagement_duration_ms,
    conversions,
    outbound_clicks,
    downloads,
    client_errors,
    updated_at
  )
  SELECT
    day.bucket_date,
    p_timezone,
    COALESCE(event.visitors, 0),
    COALESCE(event.sessions, 0),
    COALESCE(event.page_views, 0),
    COALESCE(event.engaged_sessions, 0),
    COALESCE(event.engagement_duration_ms, 0),
    COALESCE(event.conversions, 0),
    COALESCE(event.outbound_clicks, 0),
    COALESCE(event.downloads, 0),
    COALESCE(event.client_errors, 0),
    clock_timestamp()
  FROM days day
  LEFT JOIN event_daily event USING (bucket_date)
  ON CONFLICT (bucket_date, timezone) DO UPDATE
  SET
    visitors = EXCLUDED.visitors,
    sessions = EXCLUDED.sessions,
    page_views = EXCLUDED.page_views,
    engaged_sessions = EXCLUDED.engaged_sessions,
    engagement_duration_ms = EXCLUDED.engagement_duration_ms,
    conversions = EXCLUDED.conversions,
    outbound_clicks = EXCLUDED.outbound_clicks,
    downloads = EXCLUDED.downloads,
    client_errors = EXCLUDED.client_errors,
    updated_at = EXCLUDED.updated_at;

  GET DIAGNOSTICS refreshed_rows = ROW_COUNT;
  RETURN jsonb_build_object(
    'success', TRUE,
    'from', p_from,
    'to', p_to,
    'timezone', p_timezone,
    'refreshed_rows', refreshed_rows
  );
END
$function$;

CREATE OR REPLACE FUNCTION public.run_analytics_data_quality(
  p_window_hours INTEGER DEFAULT 24
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  quality_now TIMESTAMPTZ := clock_timestamp();
  quality_start TIMESTAMPTZ;
  event_count BIGINT := 0;
  human_event_count BIGINT := 0;
  bot_event_count BIGINT := 0;
  late_event_count BIGINT := 0;
  error_event_count BIGINT := 0;
  missing_consent_count BIGINT := 0;
  rejected_events BIGINT := 0;
  failed_batches BIGINT := 0;
  last_success_at TIMESTAMPTZ;
  quality_score INTEGER := 100;
  quality_status TEXT := 'healthy';
  quality_flags JSONB := '{}'::jsonb;
  quality_metrics JSONB;
  inserted_id UUID;
BEGIN
  IF p_window_hours IS NULL OR p_window_hours NOT BETWEEN 1 AND 168 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'window_hours must be between 1 and 168';
  END IF;
  quality_start := quality_now - make_interval(hours => p_window_hours);

  SELECT
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE session.traffic_class = 'human')::BIGINT,
    COUNT(*) FILTER (
      WHERE session.traffic_class IN ('suspected_bot', 'verified_bot')
    )::BIGINT,
    COUNT(*) FILTER (
      WHERE event.received_at - event.occurred_at > INTERVAL '1 hour'
    )::BIGINT,
    COUNT(*) FILTER (WHERE event.event_type = 'client_error')::BIGINT,
    COUNT(*) FILTER (
      WHERE event.consent_version IS NULL OR event.consent_version = ''
    )::BIGINT
  INTO
    event_count,
    human_event_count,
    bot_event_count,
    late_event_count,
    error_event_count,
    missing_consent_count
  FROM public.analytics_events event
  JOIN public.analytics_sessions session ON session.id = event.session_id
  WHERE event.received_at >= quality_start
    AND event.received_at <= quality_now;

  SELECT
    health.rejected_events,
    health.failed_batches,
    health.last_success_at
  INTO rejected_events, failed_batches, last_success_at
  FROM public.analytics_ingest_health health
  WHERE health.id = 1;

  IF event_count = 0 THEN
    quality_score := 0;
    quality_status := 'idle';
    quality_flags := quality_flags || jsonb_build_object(
      'no_events_in_window', TRUE
    );
  ELSE
    IF missing_consent_count > 0 THEN
      quality_score := quality_score - 40;
      quality_flags := quality_flags || jsonb_build_object(
        'missing_consent_events', missing_consent_count
      );
    END IF;
    IF late_event_count::NUMERIC / event_count > 0.25 THEN
      quality_score := quality_score - 15;
      quality_flags := quality_flags || jsonb_build_object(
        'high_late_event_ratio', TRUE
      );
    END IF;
    IF error_event_count::NUMERIC / event_count > 0.10 THEN
      quality_score := quality_score - 25;
      quality_flags := quality_flags || jsonb_build_object(
        'high_client_error_ratio', TRUE
      );
    END IF;
    IF last_success_at IS NULL
      OR last_success_at < quality_now - INTERVAL '24 hours'
    THEN
      quality_score := quality_score - 20;
      quality_flags := quality_flags || jsonb_build_object(
        'collector_stale', TRUE
      );
    END IF;

    quality_score := GREATEST(quality_score, 0);
    quality_status := CASE
      WHEN quality_score < 50 THEN 'critical'
      WHEN quality_score < 80 THEN 'warning'
      ELSE 'healthy'
    END;
  END IF;

  quality_metrics := jsonb_build_object(
    'event_count', event_count,
    'human_event_count', human_event_count,
    'bot_event_count', bot_event_count,
    'late_event_count', late_event_count,
    'client_error_count', error_event_count,
    'missing_consent_count', missing_consent_count,
    'lifetime_rejected_events', COALESCE(rejected_events, 0),
    'lifetime_failed_batches', COALESCE(failed_batches, 0),
    'last_success_at', last_success_at
  );

  INSERT INTO public.analytics_quality_runs (
    window_started_at,
    window_ended_at,
    status,
    score,
    metrics,
    flags
  )
  VALUES (
    quality_start,
    quality_now,
    quality_status,
    quality_score,
    quality_metrics,
    quality_flags
  )
  RETURNING id INTO inserted_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'run_id', inserted_id,
    'status', quality_status,
    'score', quality_score,
    'metrics', quality_metrics,
    'flags', quality_flags,
    'created_at', quality_now
  );
END
$function$;

CREATE OR REPLACE FUNCTION public.prune_analytics_data(
  p_retention_days INTEGER DEFAULT 425,
  p_event_batch_size INTEGER DEFAULT 10000
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  retention_now TIMESTAMPTZ := clock_timestamp();
  retention_cutoff TIMESTAMPTZ;
  deleted_events INTEGER := 0;
  batch_deleted_events INTEGER := 0;
  delete_passes INTEGER := 0;
  deleted_rate_limits INTEGER := 0;
  batch_deleted_rate_limits INTEGER := 0;
  rate_limit_delete_passes INTEGER := 0;
  deleted_sessions INTEGER := 0;
  deleted_visitors INTEGER := 0;
BEGIN
  IF p_retention_days IS NULL OR p_retention_days NOT BETWEEN 30 AND 3650 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'retention_days must be between 30 and 3650';
  END IF;
  IF p_event_batch_size IS NULL
    OR p_event_batch_size NOT BETWEEN 100 AND 50000
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'event_batch_size must be between 100 and 50000';
  END IF;
  retention_cutoff :=
    retention_now - make_interval(days => p_retention_days);

  -- Opportunistic cleanup also happens during collector traffic, but the
  -- scheduled lifecycle must enforce 48 hours even when ingest is disabled.
  LOOP
    WITH candidates AS (
      SELECT rate_limit.key_hash
      FROM public.analytics_rate_limits rate_limit
      WHERE rate_limit.updated_at < retention_now - INTERVAL '48 hours'
      ORDER BY rate_limit.updated_at
      LIMIT p_event_batch_size
    ),
    deleted AS (
      DELETE FROM public.analytics_rate_limits rate_limit
      USING candidates candidate
      WHERE rate_limit.key_hash = candidate.key_hash
      RETURNING rate_limit.key_hash
    )
    SELECT COUNT(*)::INTEGER
    INTO batch_deleted_rate_limits
    FROM deleted;

    deleted_rate_limits :=
      deleted_rate_limits + batch_deleted_rate_limits;
    rate_limit_delete_passes := rate_limit_delete_passes + 1;
    EXIT WHEN batch_deleted_rate_limits < p_event_batch_size
      OR rate_limit_delete_passes >= 10;
  END LOOP;

  -- Drain a bounded backlog instead of deleting only one daily batch forever.
  -- The ten-pass cap protects the scheduled function's execution time.
  LOOP
    WITH candidates AS (
      SELECT event.event_id
      FROM public.analytics_events event
      WHERE event.received_at < retention_cutoff
      ORDER BY event.received_at
      LIMIT p_event_batch_size
    ),
    deleted AS (
      DELETE FROM public.analytics_events event
      USING candidates candidate
      WHERE event.event_id = candidate.event_id
      RETURNING event.event_id
    )
    SELECT COUNT(*)::INTEGER
    INTO batch_deleted_events
    FROM deleted;

    deleted_events := deleted_events + batch_deleted_events;
    delete_passes := delete_passes + 1;
    EXIT WHEN batch_deleted_events < p_event_batch_size
      OR delete_passes >= 10;
  END LOOP;

  WITH candidates AS (
    SELECT session.id
    FROM public.analytics_sessions session
    WHERE session.last_activity_at < retention_cutoff
      AND NOT EXISTS (
        SELECT 1
        FROM public.analytics_events event
        WHERE event.session_id = session.id
      )
    ORDER BY session.last_activity_at
    LIMIT 5000
  ),
  deleted AS (
    DELETE FROM public.analytics_sessions session
    USING candidates candidate
    WHERE session.id = candidate.id
    RETURNING session.id
  )
  SELECT COUNT(*)::INTEGER INTO deleted_sessions FROM deleted;

  WITH candidates AS (
    SELECT visitor.id
    FROM public.analytics_visitors visitor
    WHERE visitor.last_seen_at < retention_cutoff
      AND NOT EXISTS (
        SELECT 1
        FROM public.analytics_sessions session
        WHERE session.visitor_id = visitor.id
      )
    ORDER BY visitor.last_seen_at
    LIMIT 5000
  ),
  deleted AS (
    DELETE FROM public.analytics_visitors visitor
    USING candidates candidate
    WHERE visitor.id = candidate.id
    RETURNING visitor.id
  )
  SELECT COUNT(*)::INTEGER INTO deleted_visitors FROM deleted;

  DELETE FROM public.analytics_quality_runs quality
  WHERE quality.created_at < retention_now - INTERVAL '730 days';
  DELETE FROM public.analytics_daily_rollups rollup
  WHERE rollup.bucket_date < (retention_now AT TIME ZONE 'UTC')::DATE - 1825;

  RETURN jsonb_build_object(
    'success', TRUE,
    'cutoff', retention_cutoff,
    'deleted_events', deleted_events,
    'delete_passes', delete_passes,
    'deleted_rate_limits', deleted_rate_limits,
    'rate_limit_delete_passes', rate_limit_delete_passes,
    'deleted_sessions', deleted_sessions,
    'deleted_visitors', deleted_visitors,
    'more_rate_limits_may_remain',
      batch_deleted_rate_limits = p_event_batch_size
      AND rate_limit_delete_passes >= 10,
    'more_events_may_remain',
      batch_deleted_events = p_event_batch_size
      AND delete_passes >= 10
  );
END
$function$;

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

  RETURN jsonb_build_object(
    'success', TRUE,
    'rollup', rollup_result,
    'quality', quality_result,
    'retention', prune_result,
    'completed_at', clock_timestamp()
  );
END
$function$;

REVOKE ALL ON FUNCTION public.refresh_analytics_daily_rollups(
  DATE, DATE, TEXT
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.run_analytics_data_quality(INTEGER)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prune_analytics_data(INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.run_analytics_maintenance(INTEGER, TEXT)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.refresh_analytics_daily_rollups(
  DATE, DATE, TEXT
) TO service_role;
GRANT EXECUTE ON FUNCTION public.run_analytics_data_quality(INTEGER)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.prune_analytics_data(INTEGER, INTEGER)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.run_analytics_maintenance(INTEGER, TEXT)
  TO service_role;

COMMENT ON TABLE public.analytics_daily_rollups IS
  'Privacy-safe daily human-traffic aggregates maintained by a server-only RPC.';
COMMENT ON TABLE public.analytics_quality_runs IS
  'Bounded operational data-quality snapshots without raw visitor identifiers.';
COMMENT ON FUNCTION public.run_analytics_maintenance(INTEGER, TEXT) IS
  'Daily service-role-only rollup, data-quality and retention maintenance.';
