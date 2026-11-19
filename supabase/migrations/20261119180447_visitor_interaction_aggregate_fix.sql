-- Keep dashboard reporting available when mobile interaction events are empty
-- or present. Build per-key counts first so PostgreSQL does not nest aggregate
-- functions inside jsonb_agg.
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

  RETURN (
    WITH interaction_counts AS (
      SELECT
        event_item.content_key AS interaction_key,
        count(*)::BIGINT AS event_count
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
    )
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'interactionKey', interaction_key,
          'count', event_count
        )
        ORDER BY event_count DESC, interaction_key
      ),
      '[]'::JSONB
    )
    FROM interaction_counts
  );
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
