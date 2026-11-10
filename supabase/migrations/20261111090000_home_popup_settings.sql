ALTER TABLE public.seo_settings
  ADD COLUMN IF NOT EXISTS home_popup_settings JSONB NOT NULL DEFAULT '{"enabled":false,"eyebrow":"DUYURU","title":"Yeni bir duyuru","message":"Ziyaretçilerinizle paylaşmak istediğiniz kısa bir mesaj ekleyin.","imageUrl":"","buttonLabel":"Daha fazla bilgi","buttonUrl":"","delaySeconds":2,"frequency":"session"}'::JSONB;

ALTER TABLE public.seo_settings
  DROP CONSTRAINT IF EXISTS seo_settings_home_popup_settings_object_check;

ALTER TABLE public.seo_settings
  ADD CONSTRAINT seo_settings_home_popup_settings_object_check
  CHECK (jsonb_typeof(home_popup_settings) = 'object');

COMMENT ON COLUMN public.seo_settings.home_popup_settings IS
  'Admin-managed homepage announcement popup settings.';

GRANT SELECT (home_popup_settings) ON TABLE public.seo_settings TO anon, authenticated;
