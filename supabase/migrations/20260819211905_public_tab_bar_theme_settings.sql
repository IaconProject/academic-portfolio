-- Public floating tab bar and public theme presentation settings.
-- Stored beside the legacy public SEO shell because it is a singleton,
-- publicly readable experience configuration. Writes remain service-role only.

ALTER TABLE public.seo_settings
  ADD COLUMN IF NOT EXISTS tab_bar_settings JSONB NOT NULL DEFAULT
  '{"version":1,"enabled":true,"buttons":[{"id":"home","visible":true},{"id":"theme","visible":true},{"id":"email","visible":true},{"id":"contact","visible":true}],"lightPalette":"ivory","darkPalette":"midnight"}'::JSONB;

ALTER TABLE public.seo_settings
  DROP CONSTRAINT IF EXISTS seo_settings_tab_bar_settings_object_check;

ALTER TABLE public.seo_settings
  ADD CONSTRAINT seo_settings_tab_bar_settings_object_check
  CHECK (jsonb_typeof(tab_bar_settings) = 'object');

COMMENT ON COLUMN public.seo_settings.tab_bar_settings IS
  'Versioned public tab bar visibility, action registry preferences, and light/dark palette selections.';

-- Data API access requires both table privileges and the existing public SELECT
-- RLS policy. Only this presentation column is added to the public grant surface.
GRANT SELECT (tab_bar_settings) ON TABLE public.seo_settings TO anon, authenticated;
