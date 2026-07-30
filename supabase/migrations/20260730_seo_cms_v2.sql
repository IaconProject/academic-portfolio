-- SEO CMS v2: additive content fields, page metadata, redirects and audit history.
-- Apply after taking a Supabase backup. The legacy seo_settings table is retained.

ALTER TABLE public.publications
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'tr',
  ADD COLUMN IF NOT EXISTS translation_group_id UUID,
  ADD COLUMN IF NOT EXISTS excerpt TEXT,
  ADD COLUMN IF NOT EXISTS content TEXT,
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS cover_image_alt TEXT,
  ADD COLUMN IF NOT EXISTS detail_status TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'tr',
  ADD COLUMN IF NOT EXISTS translation_group_id UUID,
  ADD COLUMN IF NOT EXISTS excerpt TEXT,
  ADD COLUMN IF NOT EXISTS content TEXT,
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS cover_image_alt TEXT,
  ADD COLUMN IF NOT EXISTS related_publication_ids UUID[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS detail_status TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS publications_locale_slug_idx
  ON public.publications(locale, slug) WHERE slug IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS projects_locale_slug_idx
  ON public.projects(locale, slug) WHERE slug IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'tr',
  translation_group_id UUID,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT,
  cover_image_alt TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  author_name TEXT,
  published_at TIMESTAMPTZ,
  related_keywords TEXT[] NOT NULL DEFAULT '{}',
  topic_cluster TEXT,
  "references" TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(locale, slug),
  CONSTRAINT articles_status_check CHECK (status IN ('draft', 'scheduled', 'published'))
);

CREATE TABLE IF NOT EXISTS public.seo_site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_name TEXT NOT NULL DEFAULT 'Muhammed Akan Akademik Portfolyo',
  meta_title TEXT NOT NULL,
  meta_description TEXT NOT NULL,
  title_template TEXT NOT NULL DEFAULT '%s | Muhammed Akan',
  default_og_image_url TEXT,
  author_name TEXT NOT NULL DEFAULT 'Muhammed Akan',
  default_locale TEXT NOT NULL DEFAULT 'tr',
  focus_topics TEXT[] NOT NULL DEFAULT '{}',
  twitter_handle TEXT,
  google_site_verification TEXT,
  bing_site_verification TEXT,
  ga4_measurement_id TEXT,
  gsc_property TEXT,
  ga4_property_id TEXT,
  enable_analytics BOOLEAN NOT NULL DEFAULT FALSE,
  allow_indexing BOOLEAN NOT NULL DEFAULT TRUE,
  alternate_name TEXT,
  orcid_url TEXT,
  scholar_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.seo_site_settings (
  meta_title,
  meta_description,
  default_og_image_url,
  author_name,
  focus_topics
)
SELECT
  meta_title,
  meta_description,
  NULLIF(og_image_url, ''),
  author_name,
  string_to_array(keywords, ',')
FROM public.seo_settings
WHERE NOT EXISTS (SELECT 1 FROM public.seo_site_settings)
LIMIT 1;

INSERT INTO public.seo_site_settings (
  meta_title,
  meta_description
)
SELECT
  'Muhammed Akan | Akademik Portfolyo & Özgeçmiş',
  'Muhammed Akan akademik portfolyosu, yayınları, projeleri ve araştırma yazıları.'
WHERE NOT EXISTS (SELECT 1 FROM public.seo_site_settings);

CREATE TABLE IF NOT EXISTS public.seo_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_key TEXT NOT NULL,
  path TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'tr',
  title TEXT,
  description TEXT,
  focus_keyword TEXT,
  related_keywords TEXT[] NOT NULL DEFAULT '{}',
  search_intent TEXT,
  topic_cluster TEXT,
  og_title TEXT,
  og_description TEXT,
  og_image_url TEXT,
  canonical_override TEXT,
  is_indexable BOOLEAN NOT NULL DEFAULT TRUE,
  follow_links BOOLEAN NOT NULL DEFAULT TRUE,
  include_in_sitemap BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(route_key, locale),
  UNIQUE(path, locale)
);

INSERT INTO public.seo_pages
  (route_key, path, locale, is_indexable, follow_links, include_in_sitemap)
VALUES
  ('home', '/', 'tr', TRUE, TRUE, TRUE),
  ('publications:index', '/yayinlar', 'tr', TRUE, TRUE, TRUE),
  ('projects:index', '/projeler', 'tr', TRUE, TRUE, TRUE),
  ('articles:index', '/yazilar', 'tr', TRUE, TRUE, TRUE),
  ('privacy', '/gizlilik', 'tr', FALSE, TRUE, FALSE)
ON CONFLICT (route_key, locale) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.seo_redirects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_path TEXT NOT NULL UNIQUE,
  to_path TEXT NOT NULL,
  status_code INTEGER NOT NULL DEFAULT 308,
  reason TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT seo_redirect_status_check CHECK (status_code IN (301, 308)),
  CONSTRAINT seo_redirect_not_self CHECK (from_path <> to_path)
);

CREATE TABLE IF NOT EXISTS public.seo_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_key TEXT NOT NULL,
  snapshot JSONB NOT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS seo_revisions_entity_idx
  ON public.seo_revisions(entity_type, entity_key, created_at DESC);

CREATE TABLE IF NOT EXISTS public.seo_audit_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  score INTEGER NOT NULL,
  issues JSONB NOT NULL DEFAULT '[]'::jsonb,
  checked_urls TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.seo_audit_runs
  ADD COLUMN IF NOT EXISTS category_scores JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_redirects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_audit_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read published articles" ON public.articles;
CREATE POLICY "Public read published articles"
  ON public.articles FOR SELECT
  USING (
    status = 'published'
    OR (status = 'scheduled' AND published_at IS NOT NULL AND published_at <= NOW())
  );

DROP POLICY IF EXISTS "Public read seo site settings" ON public.seo_site_settings;
CREATE POLICY "Public read seo site settings"
  ON public.seo_site_settings FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Public read seo pages" ON public.seo_pages;
CREATE POLICY "Public read seo pages"
  ON public.seo_pages FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Public read active redirects" ON public.seo_redirects;
CREATE POLICY "Public read active redirects"
  ON public.seo_redirects FOR SELECT USING (is_active = TRUE);

-- Close the legacy anonymous write policies. Server writes now use the
-- SUPABASE_SERVICE_ROLE_KEY and therefore bypass RLS.
DROP POLICY IF EXISTS "Allow write public_profile" ON public.public_profile;
DROP POLICY IF EXISTS "Allow write education" ON public.education;
DROP POLICY IF EXISTS "Allow write publications" ON public.publications;
DROP POLICY IF EXISTS "Allow write projects" ON public.projects;
DROP POLICY IF EXISTS "Allow write conferences" ON public.conferences;
DROP POLICY IF EXISTS "Allow write activities" ON public.activities;
DROP POLICY IF EXISTS "Allow write references_list" ON public.references_list;
DROP POLICY IF EXISTS "Allow write social_links" ON public.social_links;
DROP POLICY IF EXISTS "Allow write seo_settings" ON public.seo_settings;
DROP POLICY IF EXISTS "Allow write admin_credentials" ON public.admin_credentials;
DROP POLICY IF EXISTS "Allow write notification_settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Allow write contact_messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Allow public insert visitor_logs" ON public.visitor_logs;
DROP POLICY IF EXISTS "Allow public select visitor_logs" ON public.visitor_logs;
DROP POLICY IF EXISTS "Allow admin delete visitor_logs" ON public.visitor_logs;
DROP POLICY IF EXISTS "Allow write visitor_sessions" ON public.visitor_sessions;
DROP POLICY IF EXISTS "Allow write password_attempts" ON public.password_attempts;
DROP POLICY IF EXISTS "Admin Upload Avatars" ON storage.objects;

DROP POLICY IF EXISTS "Public read profile" ON public.public_profile;
CREATE POLICY "Public read profile" ON public.public_profile FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Public read education" ON public.education;
CREATE POLICY "Public read education" ON public.education FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Public read publications" ON public.publications;
CREATE POLICY "Public read publications" ON public.publications FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Public read projects" ON public.projects;
CREATE POLICY "Public read projects" ON public.projects FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Public read conferences" ON public.conferences;
CREATE POLICY "Public read conferences" ON public.conferences FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Public read activities" ON public.activities;
CREATE POLICY "Public read activities" ON public.activities FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Public read references" ON public.references_list;
CREATE POLICY "Public read references" ON public.references_list FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Public read social links" ON public.social_links;
CREATE POLICY "Public read social links" ON public.social_links FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Public read legacy seo settings" ON public.seo_settings;
CREATE POLICY "Public read legacy seo settings" ON public.seo_settings FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Public insert contact messages" ON public.contact_messages;
CREATE POLICY "Public insert contact messages" ON public.contact_messages
  FOR INSERT WITH CHECK (TRUE);

-- Draft long-form bodies must not be retrievable with the public anon key.
-- The server-side service role retains full access for rendering and admin CMS.
REVOKE SELECT ON public.publications FROM anon;
GRANT SELECT (
  id, type, title, publisher, year, url, doi, slug, locale, excerpt,
  cover_image_url, cover_image_alt, detail_status, published_at, updated_at, created_at
) ON public.publications TO anon;
REVOKE SELECT ON public.projects FROM anon;
GRANT SELECT (
  id, title, description, years, tags, url, slug, locale, excerpt,
  related_publication_ids,
  cover_image_url, cover_image_alt, detail_status, published_at, updated_at, created_at
) ON public.projects TO anon;
