-- Mobile visitor interaction reporting (2026-08-09)
--
-- Interaction signals are carried by the existing engagement event contract so
-- older collectors and the ingest RPC remain compatible. Only the allowlisted
-- content types/keys are exposed by this reporting function.

CREATE INDEX IF NOT EXISTS analytics_events_mobile_interaction_reporting_idx
  ON public.analytics_events(content_type, content_key, occurred_at, session_id)
  WHERE content_type IN ('profile_interaction', 'screen_interaction');

CREATE OR REPLACE FUNCTION public.get_analytics_interaction_breakdown(
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
BEGIN
  PERFORM public.analytics_reporting_validate_range(
    p_from,
    p_to,
    p_timezone
  );

  RETURN COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object(
        'interactionKey', event_item.content_key,
        'count', count(*)
      )
      ORDER BY count(*) DESC, event_item.content_key
    )
    FROM public.analytics_events event_item
    INNER JOIN public.analytics_sessions session_item
      ON session_item.id = event_item.session_id
      AND session_item.traffic_class = 'human'
      AND session_item.device_type = 'mobile'
    WHERE event_item.occurred_at >= p_from
      AND event_item.occurred_at < p_to
      AND event_item.event_type = 'engagement'
      AND event_item.content_type IN (
        'profile_interaction',
        'screen_interaction'
      )
      AND event_item.content_key IN (
        'profile_photo_click',
        'profile_photo_double_click',
        'profile_photo_zoom',
        'profile_photo_open_new_tab',
        'profile_photo_save_intent',
        'screen_zoom'
      )
    GROUP BY event_item.content_key
  ), '[]'::jsonb);
END
$function$;

REVOKE ALL
  ON FUNCTION public.get_analytics_interaction_breakdown(
    TIMESTAMPTZ,
    TIMESTAMPTZ,
    TEXT
  )
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE
  ON FUNCTION public.get_analytics_interaction_breakdown(
    TIMESTAMPTZ,
    TIMESTAMPTZ,
    TEXT
  )
  TO service_role;

