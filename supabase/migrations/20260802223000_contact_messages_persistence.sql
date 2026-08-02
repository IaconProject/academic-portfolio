-- Durable contact inbox and notification configuration.
-- Public visitors write through the validated Next.js API; direct table access stays closed.

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 160),
  email TEXT NOT NULL CHECK (char_length(email) BETWEEN 3 AND 320),
  subject TEXT NOT NULL DEFAULT 'Genel İletişim' CHECK (char_length(subject) BETWEEN 1 AND 200),
  phone TEXT NOT NULL DEFAULT '' CHECK (char_length(phone) <= 64),
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 5 AND 10000),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  is_starred BOOLEAN NOT NULL DEFAULT FALSE,
  ip_address TEXT NOT NULL DEFAULT '' CHECK (char_length(ip_address) <= 128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS contact_messages_created_at_idx
  ON public.contact_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS contact_messages_unread_created_at_idx
  ON public.contact_messages (created_at DESC) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS contact_messages_starred_created_at_idx
  ON public.contact_messages (created_at DESC) WHERE is_starred = TRUE;
CREATE INDEX IF NOT EXISTS contact_messages_ip_created_at_idx
  ON public.contact_messages (ip_address, created_at DESC);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can submit contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Contact messages admin access" ON public.contact_messages;
DROP POLICY IF EXISTS "Allow all access to contact messages" ON public.contact_messages;
REVOKE ALL ON TABLE public.contact_messages FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  notify_on_new_message BOOLEAN NOT NULL DEFAULT TRUE,
  notify_on_new_visitor BOOLEAN NOT NULL DEFAULT FALSE,
  recipient_email TEXT NOT NULL DEFAULT 'bilgi@muhammedakan.com',
  recipient_emails TEXT[] NOT NULL DEFAULT ARRAY['bilgi@muhammedakan.com']::TEXT[],
  resend_api_key TEXT NOT NULL DEFAULT '',
  sender_email TEXT NOT NULL DEFAULT 'noreply@muhammedakan.com',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Notification settings admin access" ON public.notification_settings;
DROP POLICY IF EXISTS "Allow all access to notification settings" ON public.notification_settings;
REVOKE ALL ON TABLE public.notification_settings FROM anon, authenticated;

INSERT INTO public.notification_settings (
  email_notifications_enabled,
  notify_on_new_message,
  notify_on_new_visitor,
  recipient_email,
  recipient_emails,
  sender_email
)
SELECT TRUE, TRUE, FALSE, 'bilgi@muhammedakan.com', ARRAY['bilgi@muhammedakan.com']::TEXT[], 'noreply@muhammedakan.com'
WHERE NOT EXISTS (SELECT 1 FROM public.notification_settings);
