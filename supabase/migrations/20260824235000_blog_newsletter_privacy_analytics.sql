-- Privacy-first newsletter delivery and aggregate blog metrics.
-- Public endpoints never receive table privileges: every mutating workflow is
-- exposed only to the server-side service role through narrow RPC functions.

ALTER TABLE public.blog_newsletter_subscribers
  ADD COLUMN IF NOT EXISTS confirmation_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmation_sent_at TIMESTAMPTZ;

UPDATE public.blog_newsletter_subscribers
SET confirmation_expires_at = COALESCE(
  confirmation_expires_at,
  updated_at + INTERVAL '48 hours'
)
WHERE status = 'pending'
  AND confirmation_token_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS blog_newsletter_confirmation_token_idx
  ON public.blog_newsletter_subscribers (confirmation_token_hash)
  WHERE confirmation_token_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS blog_newsletter_unsubscribe_token_idx
  ON public.blog_newsletter_subscribers (unsubscribe_token_hash);

ALTER TABLE public.blog_newsletter_broadcasts
  ADD COLUMN IF NOT EXISTS send_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recipient_count INTEGER NOT NULL DEFAULT 0
    CHECK (recipient_count >= 0),
  ADD COLUMN IF NOT EXISTS error_message TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS public.blog_newsletter_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID NOT NULL
    REFERENCES public.blog_newsletter_broadcasts(id) ON DELETE CASCADE,
  subscriber_id UUID NOT NULL
    REFERENCES public.blog_newsletter_subscribers(id) ON DELETE CASCADE,
  provider_email_id TEXT,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN (
    'sent',
    'delivered',
    'opened',
    'clicked',
    'bounced',
    'complained',
    'failed'
  )),
  last_event_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (broadcast_id, subscriber_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS blog_newsletter_delivery_provider_idx
  ON public.blog_newsletter_deliveries (provider_email_id)
  WHERE provider_email_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS blog_newsletter_delivery_broadcast_idx
  ON public.blog_newsletter_deliveries (broadcast_id, status);

CREATE TABLE IF NOT EXISTS public.blog_metric_event_dedup (
  event_id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS blog_metric_event_dedup_created_idx
  ON public.blog_metric_event_dedup (created_at);

ALTER TABLE public.blog_newsletter_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_newsletter_deliveries FORCE ROW LEVEL SECURITY;
ALTER TABLE public.blog_metric_event_dedup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_metric_event_dedup FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS blog_newsletter_deliveries_owner_read
  ON public.blog_newsletter_deliveries;
CREATE POLICY blog_newsletter_deliveries_owner_read
  ON public.blog_newsletter_deliveries FOR SELECT TO authenticated
  USING (public.is_blog_owner());

REVOKE ALL ON TABLE public.blog_newsletter_deliveries
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.blog_newsletter_deliveries TO authenticated;
GRANT ALL ON TABLE public.blog_newsletter_deliveries TO service_role;

REVOKE ALL ON TABLE public.blog_metric_event_dedup
  FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.blog_metric_event_dedup TO service_role;

DROP TRIGGER IF EXISTS blog_newsletter_deliveries_updated_at
  ON public.blog_newsletter_deliveries;
CREATE TRIGGER blog_newsletter_deliveries_updated_at
BEFORE UPDATE ON public.blog_newsletter_deliveries
FOR EACH ROW EXECUTE FUNCTION public.set_blog_updated_at();

CREATE OR REPLACE FUNCTION public.begin_blog_newsletter_subscription(
  p_email TEXT,
  p_confirmation_token_hash TEXT,
  p_unsubscribe_token_hash TEXT,
  p_confirmation_expires_at TIMESTAMPTZ,
  p_consent_version TEXT,
  p_source TEXT,
  p_locale TEXT,
  p_ip_hash TEXT,
  p_user_agent_hash TEXT,
  p_double_opt_in BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  normalized_email TEXT := lower(trim(p_email));
  subscriber public.blog_newsletter_subscribers%ROWTYPE;
  created_subscription BOOLEAN := FALSE;
  count_signup BOOLEAN := FALSE;
BEGIN
  IF normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    OR length(normalized_email) > 254
    OR length(split_part(normalized_email, '@', 1)) > 64
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid email';
  END IF;
  IF p_confirmation_token_hash !~ '^[A-Fa-f0-9]{64}$'
    OR p_unsubscribe_token_hash !~ '^[A-Fa-f0-9]{64}$'
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid token hash';
  END IF;
  IF p_locale NOT IN ('tr', 'en')
    OR length(trim(p_consent_version)) NOT BETWEEN 1 AND 80
    OR length(trim(p_source)) NOT BETWEEN 1 AND 80
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid subscription metadata';
  END IF;

  SELECT * INTO subscriber
  FROM public.blog_newsletter_subscribers
  WHERE lower(email) = normalized_email
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.blog_newsletter_subscribers (
      email,
      status,
      confirmation_token_hash,
      unsubscribe_token_hash,
      confirmation_expires_at,
      consent_version,
      source,
      locale,
      ip_hash,
      user_agent_hash,
      confirmed_at
    )
    VALUES (
      normalized_email,
      CASE
        WHEN p_double_opt_in THEN 'pending'::public.blog_newsletter_status
        ELSE 'active'::public.blog_newsletter_status
      END,
      CASE WHEN p_double_opt_in THEN p_confirmation_token_hash ELSE NULL END,
      p_unsubscribe_token_hash,
      CASE WHEN p_double_opt_in THEN p_confirmation_expires_at ELSE NULL END,
      trim(p_consent_version),
      trim(p_source),
      p_locale,
      NULLIF(p_ip_hash, ''),
      NULLIF(p_user_agent_hash, ''),
      CASE WHEN p_double_opt_in THEN NULL ELSE NOW() END
    )
    RETURNING * INTO subscriber;
    created_subscription := TRUE;
    count_signup := TRUE;

    IF NOT p_double_opt_in THEN
      INSERT INTO public.blog_newsletter_events (
        subscriber_id,
        event_type,
        metadata
      ) VALUES (
        subscriber.id,
        'confirmed',
        '{"method":"single_opt_in"}'::JSONB
      );
    END IF;
  ELSIF subscriber.status IN ('bounced', 'complained') THEN
    RETURN jsonb_build_object(
      'subscriber_id', subscriber.id,
      'state', 'suppressed',
      'should_send_confirmation', FALSE,
      'count_signup', FALSE
    );
  ELSIF subscriber.status = 'active' THEN
    UPDATE public.blog_newsletter_subscribers
    SET
      unsubscribe_token_hash = p_unsubscribe_token_hash,
      consent_version = trim(p_consent_version),
      source = trim(p_source),
      locale = p_locale,
      ip_hash = NULLIF(p_ip_hash, ''),
      user_agent_hash = NULLIF(p_user_agent_hash, '')
    WHERE id = subscriber.id;
    RETURN jsonb_build_object(
      'subscriber_id', subscriber.id,
      'state', 'active',
      'should_send_confirmation', FALSE,
      'count_signup', FALSE
    );
  ELSE
    count_signup := subscriber.status = 'unsubscribed';
    UPDATE public.blog_newsletter_subscribers
    SET
      status = CASE
        WHEN p_double_opt_in THEN 'pending'::public.blog_newsletter_status
        ELSE 'active'::public.blog_newsletter_status
      END,
      confirmation_token_hash = CASE
        WHEN p_double_opt_in THEN p_confirmation_token_hash ELSE NULL
      END,
      confirmation_expires_at = CASE
        WHEN p_double_opt_in THEN p_confirmation_expires_at ELSE NULL
      END,
      confirmation_sent_at = NULL,
      unsubscribe_token_hash = p_unsubscribe_token_hash,
      consent_version = trim(p_consent_version),
      source = trim(p_source),
      locale = p_locale,
      ip_hash = NULLIF(p_ip_hash, ''),
      user_agent_hash = NULLIF(p_user_agent_hash, ''),
      confirmed_at = CASE WHEN p_double_opt_in THEN NULL ELSE NOW() END,
      unsubscribed_at = NULL
    WHERE id = subscriber.id
    RETURNING * INTO subscriber;

    IF NOT p_double_opt_in AND count_signup THEN
      INSERT INTO public.blog_newsletter_events (
        subscriber_id,
        event_type,
        metadata
      ) VALUES (
        subscriber.id,
        'confirmed',
        '{"method":"single_opt_in_resubscribe"}'::JSONB
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'subscriber_id', subscriber.id,
    'state', CASE WHEN p_double_opt_in THEN 'pending' ELSE 'active' END,
    'should_send_confirmation', p_double_opt_in,
    'count_signup', count_signup,
    'created', created_subscription
  );
END
$function$;

CREATE OR REPLACE FUNCTION public.record_blog_newsletter_confirmation_sent(
  p_subscriber_id UUID,
  p_provider_email_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
BEGIN
  UPDATE public.blog_newsletter_subscribers
  SET confirmation_sent_at = NOW()
  WHERE id = p_subscriber_id
    AND status = 'pending';

  IF FOUND THEN
    INSERT INTO public.blog_newsletter_events (
      subscriber_id,
      event_type,
      provider_event_id,
      metadata
    ) VALUES (
      p_subscriber_id,
      'confirmation_sent',
      CASE
        WHEN NULLIF(trim(p_provider_email_id), '') IS NULL THEN NULL
        ELSE 'confirmation:' || trim(p_provider_email_id)
      END,
      jsonb_build_object('providerEmailId', NULLIF(trim(p_provider_email_id), ''))
    )
    ON CONFLICT (provider_event_id) DO NOTHING;
  END IF;
END
$function$;

CREATE OR REPLACE FUNCTION public.confirm_blog_newsletter_subscription(
  p_confirmation_token_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  subscriber public.blog_newsletter_subscribers%ROWTYPE;
BEGIN
  IF p_confirmation_token_hash !~ '^[A-Fa-f0-9]{64}$' THEN
    RETURN jsonb_build_object('state', 'invalid');
  END IF;

  SELECT * INTO subscriber
  FROM public.blog_newsletter_subscribers
  WHERE confirmation_token_hash = p_confirmation_token_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('state', 'invalid');
  END IF;
  IF subscriber.status = 'active' THEN
    RETURN jsonb_build_object('state', 'already_active');
  END IF;
  IF subscriber.status <> 'pending' THEN
    RETURN jsonb_build_object('state', 'invalid');
  END IF;
  IF subscriber.confirmation_expires_at IS NULL
    OR subscriber.confirmation_expires_at < NOW()
  THEN
    RETURN jsonb_build_object('state', 'expired');
  END IF;

  UPDATE public.blog_newsletter_subscribers
  SET
    status = 'active',
    confirmed_at = NOW(),
    unsubscribed_at = NULL
  WHERE id = subscriber.id;

  INSERT INTO public.blog_newsletter_events (
    subscriber_id,
    event_type,
    metadata
  ) VALUES (
    subscriber.id,
    'confirmed',
    '{"method":"double_opt_in"}'::JSONB
  );

  RETURN jsonb_build_object('state', 'confirmed');
END
$function$;

CREATE OR REPLACE FUNCTION public.unsubscribe_blog_newsletter(
  p_unsubscribe_token_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  subscriber public.blog_newsletter_subscribers%ROWTYPE;
BEGIN
  IF p_unsubscribe_token_hash !~ '^[A-Fa-f0-9]{64}$' THEN
    RETURN jsonb_build_object('state', 'invalid');
  END IF;

  SELECT * INTO subscriber
  FROM public.blog_newsletter_subscribers
  WHERE unsubscribe_token_hash = p_unsubscribe_token_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('state', 'invalid');
  END IF;
  IF subscriber.status = 'unsubscribed' THEN
    RETURN jsonb_build_object('state', 'already_unsubscribed');
  END IF;

  UPDATE public.blog_newsletter_subscribers
  SET
    status = 'unsubscribed',
    unsubscribed_at = NOW(),
    confirmation_token_hash = NULL,
    confirmation_expires_at = NULL
  WHERE id = subscriber.id;

  INSERT INTO public.blog_newsletter_events (
    subscriber_id,
    event_type,
    metadata
  ) VALUES (
    subscriber.id,
    'unsubscribed',
    '{"method":"subscriber_link"}'::JSONB
  );

  RETURN jsonb_build_object('state', 'unsubscribed');
END
$function$;

CREATE OR REPLACE FUNCTION public.claim_blog_newsletter_broadcast(
  p_broadcast_id UUID,
  p_allow_early BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  claimed_id UUID;
BEGIN
  UPDATE public.blog_newsletter_broadcasts
  SET
    status = 'sending',
    send_started_at = NOW(),
    error_message = ''
  WHERE id = p_broadcast_id
    AND (
      status = 'draft'
      OR (
        status = 'scheduled'
        AND (p_allow_early OR scheduled_for <= NOW())
      )
      OR (
        status = 'sending'
        AND send_started_at < NOW() - INTERVAL '30 minutes'
      )
    )
  RETURNING id INTO claimed_id;

  RETURN claimed_id IS NOT NULL;
END
$function$;

CREATE OR REPLACE FUNCTION public.set_blog_newsletter_unsubscribe_tokens(
  p_tokens JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  item JSONB;
  updated_count INTEGER := 0;
  row_count_value INTEGER;
BEGIN
  IF jsonb_typeof(p_tokens) <> 'array'
    OR jsonb_array_length(p_tokens) > 100
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid token batch';
  END IF;

  FOR item IN SELECT value FROM jsonb_array_elements(p_tokens)
  LOOP
    IF COALESCE(item->>'subscriber_id', '')
        !~ '^[0-9a-fA-F-]{36}$'
      OR COALESCE(item->>'token_hash', '') !~ '^[A-Fa-f0-9]{64}$'
    THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid token item';
    END IF;
    UPDATE public.blog_newsletter_subscribers
    SET unsubscribe_token_hash = item->>'token_hash'
    WHERE id = (item->>'subscriber_id')::UUID;
    GET DIAGNOSTICS row_count_value = ROW_COUNT;
    updated_count := updated_count + row_count_value;
  END LOOP;

  RETURN updated_count;
END
$function$;

CREATE OR REPLACE FUNCTION public.record_blog_post_metric(
  p_event_id UUID,
  p_post_id UUID,
  p_metric_type TEXT,
  p_value INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  inserted_count INTEGER;
  metric_day DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
BEGIN
  IF p_metric_type NOT IN (
    'view',
    'engaged_view',
    'read_seconds',
    'newsletter_signup'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid metric type';
  END IF;
  IF p_value < 1
    OR (p_metric_type = 'read_seconds' AND p_value > 1800)
    OR (p_metric_type <> 'read_seconds' AND p_value <> 1)
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid metric value';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.blog_posts post
    WHERE post.id = p_post_id
      AND post.published_at <= NOW()
      AND (
        post.status = 'published'
        OR (post.status = 'scheduled' AND post.scheduled_for <= NOW())
      )
  ) THEN
    RETURN jsonb_build_object('accepted', FALSE, 'reason', 'post_not_public');
  END IF;

  DELETE FROM public.blog_metric_event_dedup expired
  WHERE expired.event_id IN (
    SELECT candidate.event_id
    FROM public.blog_metric_event_dedup candidate
    WHERE candidate.created_at < NOW() - INTERVAL '48 hours'
    ORDER BY candidate.created_at
    LIMIT 100
  );

  INSERT INTO public.blog_metric_event_dedup (event_id)
  VALUES (p_event_id)
  ON CONFLICT (event_id) DO NOTHING;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  IF inserted_count = 0 THEN
    RETURN jsonb_build_object('accepted', TRUE, 'duplicate', TRUE);
  END IF;

  INSERT INTO public.blog_post_metrics_daily (
    post_id,
    metric_date,
    views,
    engaged_views,
    total_read_seconds,
    newsletter_signups
  ) VALUES (
    p_post_id,
    metric_day,
    CASE WHEN p_metric_type = 'view' THEN 1 ELSE 0 END,
    CASE WHEN p_metric_type = 'engaged_view' THEN 1 ELSE 0 END,
    CASE WHEN p_metric_type = 'read_seconds' THEN p_value ELSE 0 END,
    CASE WHEN p_metric_type = 'newsletter_signup' THEN 1 ELSE 0 END
  )
  ON CONFLICT (post_id, metric_date) DO UPDATE SET
    views = public.blog_post_metrics_daily.views + EXCLUDED.views,
    engaged_views = public.blog_post_metrics_daily.engaged_views
      + EXCLUDED.engaged_views,
    total_read_seconds = public.blog_post_metrics_daily.total_read_seconds
      + EXCLUDED.total_read_seconds,
    newsletter_signups = public.blog_post_metrics_daily.newsletter_signups
      + EXCLUDED.newsletter_signups;

  RETURN jsonb_build_object('accepted', TRUE, 'duplicate', FALSE);
END
$function$;

CREATE OR REPLACE FUNCTION public.record_blog_newsletter_provider_event(
  p_provider_event_id TEXT,
  p_provider_email_id TEXT,
  p_event_type TEXT,
  p_recipient_email TEXT,
  p_metadata JSONB,
  p_occurred_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  delivery public.blog_newsletter_deliveries%ROWTYPE;
  subscriber_id_value UUID;
  broadcast_id_value UUID;
  inserted_count INTEGER;
  mapped_event_type TEXT;
  mapped_delivery_status TEXT;
BEGIN
  IF length(trim(p_provider_event_id)) NOT BETWEEN 1 AND 300
    OR length(trim(p_provider_email_id)) NOT BETWEEN 1 AND 300
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid provider event';
  END IF;

  mapped_event_type := CASE p_event_type
    WHEN 'email.delivered' THEN 'delivered'
    WHEN 'email.opened' THEN 'opened'
    WHEN 'email.clicked' THEN 'clicked'
    WHEN 'email.bounced' THEN 'bounced'
    WHEN 'email.complained' THEN 'complained'
    WHEN 'email.failed' THEN 'bounced'
    WHEN 'email.suppressed' THEN 'bounced'
    ELSE NULL
  END;
  IF mapped_event_type IS NULL THEN
    RETURN jsonb_build_object('accepted', FALSE, 'reason', 'ignored_type');
  END IF;
  mapped_delivery_status := mapped_event_type;

  SELECT * INTO delivery
  FROM public.blog_newsletter_deliveries
  WHERE provider_email_id = trim(p_provider_email_id)
  FOR UPDATE;

  IF FOUND THEN
    subscriber_id_value := delivery.subscriber_id;
    broadcast_id_value := delivery.broadcast_id;
  ELSE
    SELECT subscriber.id INTO subscriber_id_value
    FROM public.blog_newsletter_subscribers subscriber
    WHERE lower(subscriber.email) = lower(trim(p_recipient_email))
    LIMIT 1;
  END IF;

  INSERT INTO public.blog_newsletter_events (
    subscriber_id,
    broadcast_id,
    event_type,
    provider_event_id,
    metadata,
    occurred_at
  ) VALUES (
    subscriber_id_value,
    broadcast_id_value,
    mapped_event_type,
    trim(p_provider_event_id),
    COALESCE(p_metadata, '{}'::JSONB),
    COALESCE(p_occurred_at, NOW())
  )
  ON CONFLICT (provider_event_id) DO NOTHING;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  IF inserted_count = 0 THEN
    RETURN jsonb_build_object('accepted', TRUE, 'duplicate', TRUE);
  END IF;

  IF delivery.id IS NOT NULL THEN
    UPDATE public.blog_newsletter_deliveries
    SET
      status = CASE
        WHEN mapped_delivery_status IN ('bounced', 'complained')
          THEN mapped_delivery_status
        WHEN delivery.status IN ('bounced', 'complained', 'failed')
          THEN delivery.status
        WHEN mapped_delivery_status = 'clicked' THEN 'clicked'
        WHEN mapped_delivery_status = 'opened'
          AND delivery.status NOT IN ('clicked') THEN 'opened'
        WHEN mapped_delivery_status = 'delivered'
          AND delivery.status = 'sent' THEN 'delivered'
        ELSE delivery.status
      END,
      last_event_at = GREATEST(last_event_at, COALESCE(p_occurred_at, NOW()))
    WHERE id = delivery.id;
  END IF;

  IF subscriber_id_value IS NOT NULL AND mapped_event_type = 'bounced' THEN
    UPDATE public.blog_newsletter_subscribers
    SET status = 'bounced'
    WHERE id = subscriber_id_value
      AND status <> 'complained';
  ELSIF subscriber_id_value IS NOT NULL
    AND mapped_event_type = 'complained'
  THEN
    UPDATE public.blog_newsletter_subscribers
    SET status = 'complained'
    WHERE id = subscriber_id_value;
  END IF;

  RETURN jsonb_build_object('accepted', TRUE, 'duplicate', FALSE);
END
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_blog_newsletter_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  pending_deleted INTEGER;
  identifiers_cleared INTEGER;
  confirmations_cleared INTEGER;
  events_deleted INTEGER;
  deliveries_deleted INTEGER;
  metric_keys_deleted INTEGER;
BEGIN
  DELETE FROM public.blog_newsletter_subscribers subscriber
  WHERE subscriber.status = 'pending'
    AND subscriber.confirmation_expires_at
      < NOW() - INTERVAL '28 days';
  GET DIAGNOSTICS pending_deleted = ROW_COUNT;

  UPDATE public.blog_newsletter_subscribers subscriber
  SET ip_hash = NULL, user_agent_hash = NULL
  WHERE subscriber.created_at < NOW() - INTERVAL '30 days'
    AND (subscriber.ip_hash IS NOT NULL OR subscriber.user_agent_hash IS NOT NULL);
  GET DIAGNOSTICS identifiers_cleared = ROW_COUNT;

  UPDATE public.blog_newsletter_subscribers subscriber
  SET confirmation_token_hash = NULL, confirmation_expires_at = NULL
  WHERE subscriber.status <> 'pending'
    AND subscriber.confirmation_expires_at < NOW();
  GET DIAGNOSTICS confirmations_cleared = ROW_COUNT;

  DELETE FROM public.blog_newsletter_events event
  WHERE event.occurred_at < NOW() - INTERVAL '730 days';
  GET DIAGNOSTICS events_deleted = ROW_COUNT;

  DELETE FROM public.blog_newsletter_deliveries delivery
  WHERE delivery.created_at < NOW() - INTERVAL '730 days';
  GET DIAGNOSTICS deliveries_deleted = ROW_COUNT;

  DELETE FROM public.blog_metric_event_dedup metric_key
  WHERE metric_key.created_at < NOW() - INTERVAL '48 hours';
  GET DIAGNOSTICS metric_keys_deleted = ROW_COUNT;

  RETURN jsonb_build_object(
    'pendingDeleted', pending_deleted,
    'identifiersCleared', identifiers_cleared,
    'confirmationsCleared', confirmations_cleared,
    'eventsDeleted', events_deleted,
    'deliveriesDeleted', deliveries_deleted,
    'metricKeysDeleted', metric_keys_deleted
  );
END
$function$;

REVOKE ALL ON FUNCTION public.begin_blog_newsletter_subscription(
  TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_blog_newsletter_confirmation_sent(
  UUID, TEXT
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.confirm_blog_newsletter_subscription(TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.unsubscribe_blog_newsletter(TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_blog_newsletter_broadcast(UUID, BOOLEAN)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_blog_newsletter_unsubscribe_tokens(JSONB)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_blog_post_metric(
  UUID, UUID, TEXT, INTEGER
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_blog_newsletter_provider_event(
  TEXT, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cleanup_blog_newsletter_data()
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.begin_blog_newsletter_subscription(
  TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN
) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_blog_newsletter_confirmation_sent(
  UUID, TEXT
) TO service_role;
GRANT EXECUTE ON FUNCTION public.confirm_blog_newsletter_subscription(TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.unsubscribe_blog_newsletter(TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_blog_newsletter_broadcast(UUID, BOOLEAN)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.set_blog_newsletter_unsubscribe_tokens(JSONB)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.record_blog_post_metric(
  UUID, UUID, TEXT, INTEGER
) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_blog_newsletter_provider_event(
  TEXT, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ
) TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_blog_newsletter_data()
  TO service_role;

COMMENT ON TABLE public.blog_metric_event_dedup IS
  'Short-lived anonymous UUIDs used only to make aggregate metric retries idempotent.';
COMMENT ON FUNCTION public.record_blog_post_metric(UUID, UUID, TEXT, INTEGER) IS
  'Atomically records consented, aggregate-only blog metrics without visitor identifiers.';
