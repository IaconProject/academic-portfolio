-- Advanced Blog CMS v1
-- Additive migration: legacy `articles` data is retained and copied into the
-- new model. Public reads are limited to publishable content; editorial writes
-- require an authenticated blog member (or the server-side service role).

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

DO $$
BEGIN
  CREATE TYPE public.blog_role AS ENUM ('owner', 'editor', 'author', 'viewer');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.blog_post_status AS ENUM (
    'draft',
    'review',
    'scheduled',
    'published',
    'archived'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.blog_newsletter_status AS ENUM (
    'pending',
    'active',
    'unsubscribed',
    'bounced',
    'complained'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.blog_members (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.blog_role NOT NULL DEFAULT 'viewer',
  display_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.blog_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  owner_email TEXT NOT NULL DEFAULT 'bilgi@muhammedakan.com',
  site_name TEXT NOT NULL DEFAULT 'Muhammed Akan Blog',
  tagline TEXT NOT NULL DEFAULT 'Blok zinciri, kripto paralar ve yapay zekâyı temelden anlayın.',
  description TEXT NOT NULL DEFAULT 'Bitcoin, blok zinciri, kripto paralar, yapay zekâ ve bu alanların arkasındaki teknolojiler üzerine kaynaklı ve anlaşılır yazılar.',
  locale TEXT NOT NULL DEFAULT 'tr' CHECK (locale IN ('tr', 'en')),
  posts_per_page SMALLINT NOT NULL DEFAULT 12 CHECK (posts_per_page BETWEEN 3 AND 48),
  author_name TEXT NOT NULL DEFAULT 'Muhammed Akan',
  author_bio TEXT NOT NULL DEFAULT '',
  social_links JSONB NOT NULL DEFAULT '[]'::JSONB CHECK (jsonb_typeof(social_links) = 'array'),
  theme JSONB NOT NULL DEFAULT '{"accent":"amber","density":"comfortable","radius":"soft"}'::JSONB CHECK (jsonb_typeof(theme) = 'object'),
  seo JSONB NOT NULL DEFAULT '{"titleTemplate":"%s | Muhammed Akan Blog","indexing":true}'::JSONB CHECK (jsonb_typeof(seo) = 'object'),
  newsletter JSONB NOT NULL DEFAULT '{"enabled":true,"doubleOptIn":true,"consentVersion":"2026-08-24"}'::JSONB CHECK (jsonb_typeof(newsletter) = 'object'),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.blog_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.blog_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id TEXT NOT NULL DEFAULT 'blog-media' CHECK (bucket_id = 'blog-media'),
  object_path TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  byte_size BIGINT NOT NULL CHECK (byte_size BETWEEN 1 AND 15728640),
  width INTEGER CHECK (width IS NULL OR width BETWEEN 1 AND 20000),
  height INTEGER CHECK (height IS NULL OR height BETWEEN 1 AND 20000),
  alt_text TEXT NOT NULL DEFAULT '',
  caption TEXT NOT NULL DEFAULT '',
  credit TEXT NOT NULL DEFAULT '',
  focal_x NUMERIC(5,4) NOT NULL DEFAULT 0.5 CHECK (focal_x BETWEEN 0 AND 1),
  focal_y NUMERIC(5,4) NOT NULL DEFAULT 0.5 CHECK (focal_y BETWEEN 0 AND 1),
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT 'amber',
  icon TEXT NOT NULL DEFAULT 'folder',
  seo_title TEXT,
  seo_description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order BETWEEN -10000 AND 10000),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.blog_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.blog_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  cover_asset_id UUID REFERENCES public.blog_assets(id) ON DELETE SET NULL,
  seo_title TEXT,
  seo_description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order BETWEEN -10000 AND 10000),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_article_id UUID UNIQUE,
  slug TEXT NOT NULL CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  locale TEXT NOT NULL DEFAULT 'tr' CHECK (locale IN ('tr', 'en')),
  translation_group_id UUID,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 240),
  subtitle TEXT NOT NULL DEFAULT '',
  excerpt TEXT NOT NULL DEFAULT '' CHECK (char_length(excerpt) <= 640),
  content_json JSONB NOT NULL DEFAULT '{"type":"doc","content":[]}'::JSONB CHECK (jsonb_typeof(content_json) = 'object'),
  content_html TEXT NOT NULL DEFAULT '',
  content_text TEXT NOT NULL DEFAULT '',
  table_of_contents JSONB NOT NULL DEFAULT '[]'::JSONB CHECK (jsonb_typeof(table_of_contents) = 'array'),
  status public.blog_post_status NOT NULL DEFAULT 'draft',
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL DEFAULT 'Muhammed Akan',
  category_id UUID REFERENCES public.blog_categories(id) ON DELETE SET NULL,
  series_id UUID REFERENCES public.blog_series(id) ON DELETE SET NULL,
  series_order INTEGER CHECK (series_order IS NULL OR series_order BETWEEN 1 AND 10000),
  cover_asset_id UUID REFERENCES public.blog_assets(id) ON DELETE SET NULL,
  cover_image_url TEXT NOT NULL DEFAULT '',
  cover_image_alt TEXT NOT NULL DEFAULT '',
  canonical_url TEXT,
  seo_title TEXT CHECK (seo_title IS NULL OR char_length(seo_title) <= 120),
  seo_description TEXT CHECK (seo_description IS NULL OR char_length(seo_description) <= 320),
  focus_keyword TEXT,
  related_keywords TEXT[] NOT NULL DEFAULT '{}',
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order BETWEEN -10000 AND 10000),
  allow_indexing BOOLEAN NOT NULL DEFAULT TRUE,
  word_count INTEGER NOT NULL DEFAULT 0 CHECK (word_count >= 0),
  reading_minutes SMALLINT NOT NULL DEFAULT 1 CHECK (reading_minutes BETWEEN 1 AND 1440),
  published_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  search_vector TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('turkish', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('turkish', coalesce(excerpt, '')), 'B') ||
    setweight(to_tsvector('turkish', coalesce(content_text, '')), 'C')
  ) STORED,
  UNIQUE(locale, slug),
  CONSTRAINT blog_posts_schedule_check CHECK (
    status <> 'scheduled' OR scheduled_for IS NOT NULL
  ),
  CONSTRAINT blog_posts_archive_check CHECK (
    status <> 'archived' OR archived_at IS NOT NULL
  )
);

CREATE TABLE IF NOT EXISTS public.blog_post_tags (
  post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.blog_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, tag_id)
);

CREATE TABLE IF NOT EXISTS public.blog_post_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  citation_key TEXT NOT NULL,
  title TEXT NOT NULL,
  authors TEXT[] NOT NULL DEFAULT '{}',
  publisher TEXT NOT NULL DEFAULT '',
  publication_year SMALLINT CHECK (publication_year IS NULL OR publication_year BETWEEN 1000 AND 3000),
  url TEXT,
  doi TEXT,
  accessed_at DATE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, citation_key)
);

CREATE TABLE IF NOT EXISTS public.blog_post_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL CHECK (revision_number > 0),
  snapshot JSONB NOT NULL CHECK (jsonb_typeof(snapshot) = 'object'),
  change_summary TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, revision_number)
);

CREATE TABLE IF NOT EXISTS public.blog_home_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_type TEXT NOT NULL CHECK (section_type IN (
    'hero',
    'featured_posts',
    'latest_posts',
    'category_grid',
    'series_spotlight',
    'newsletter',
    'rich_text'
  )),
  internal_name TEXT NOT NULL,
  heading TEXT NOT NULL DEFAULT '',
  subheading TEXT NOT NULL DEFAULT '',
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order BETWEEN -10000 AND 10000),
  config JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(config) = 'object'),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.blog_home_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot JSONB NOT NULL CHECK (jsonb_typeof(snapshot) = 'array'),
  change_summary TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.blog_navigation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location TEXT NOT NULL CHECK (location IN ('header', 'footer', 'legal')),
  parent_id UUID REFERENCES public.blog_navigation_items(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  href TEXT NOT NULL CHECK (href ~ '^/' OR href ~ '^https://'),
  open_in_new_tab BOOLEAN NOT NULL DEFAULT FALSE,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order BETWEEN -10000 AND 10000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.blog_newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  status public.blog_newsletter_status NOT NULL DEFAULT 'pending',
  confirmation_token_hash TEXT,
  unsubscribe_token_hash TEXT NOT NULL,
  consent_version TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'blog',
  locale TEXT NOT NULL DEFAULT 'tr' CHECK (locale IN ('tr', 'en')),
  ip_hash TEXT,
  user_agent_hash TEXT,
  resend_contact_id TEXT,
  confirmed_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS blog_newsletter_subscribers_email_idx
  ON public.blog_newsletter_subscribers (lower(email));

CREATE TABLE IF NOT EXISTS public.blog_newsletter_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  preview_text TEXT NOT NULL DEFAULT '',
  content_json JSONB NOT NULL DEFAULT '{"type":"doc","content":[]}'::JSONB CHECK (jsonb_typeof(content_json) = 'object'),
  content_html TEXT NOT NULL DEFAULT '',
  content_text TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'canceled')),
  resend_broadcast_id TEXT,
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.blog_newsletter_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID REFERENCES public.blog_newsletter_subscribers(id) ON DELETE SET NULL,
  broadcast_id UUID REFERENCES public.blog_newsletter_broadcasts(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'confirmation_sent',
    'confirmed',
    'broadcast_sent',
    'delivered',
    'opened',
    'clicked',
    'bounced',
    'complained',
    'unsubscribed'
  )),
  provider_event_id TEXT UNIQUE,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(metadata) = 'object'),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.blog_post_metrics_daily (
  post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  views INTEGER NOT NULL DEFAULT 0 CHECK (views >= 0),
  engaged_views INTEGER NOT NULL DEFAULT 0 CHECK (engaged_views >= 0),
  total_read_seconds BIGINT NOT NULL DEFAULT 0 CHECK (total_read_seconds >= 0),
  newsletter_signups INTEGER NOT NULL DEFAULT 0 CHECK (newsletter_signups >= 0),
  PRIMARY KEY (post_id, metric_date)
);

CREATE INDEX IF NOT EXISTS blog_posts_publication_idx
  ON public.blog_posts (locale, status, is_pinned DESC, is_featured DESC, sort_order, published_at DESC);
CREATE INDEX IF NOT EXISTS blog_posts_category_idx
  ON public.blog_posts (category_id, status, published_at DESC);
CREATE INDEX IF NOT EXISTS blog_posts_series_idx
  ON public.blog_posts (series_id, series_order, published_at);
CREATE INDEX IF NOT EXISTS blog_posts_search_idx
  ON public.blog_posts USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS blog_posts_title_trgm_idx
  ON public.blog_posts USING GIN (title extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS blog_posts_slug_trgm_idx
  ON public.blog_posts USING GIN (slug extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS blog_post_tags_tag_idx
  ON public.blog_post_tags (tag_id, post_id);
CREATE INDEX IF NOT EXISTS blog_post_sources_post_idx
  ON public.blog_post_sources (post_id, sort_order);
CREATE INDEX IF NOT EXISTS blog_post_revisions_history_idx
  ON public.blog_post_revisions (post_id, revision_number DESC);
CREATE INDEX IF NOT EXISTS blog_home_sections_order_idx
  ON public.blog_home_sections (is_enabled DESC, sort_order, created_at);
CREATE INDEX IF NOT EXISTS blog_navigation_order_idx
  ON public.blog_navigation_items (location, parent_id, sort_order);
CREATE INDEX IF NOT EXISTS blog_newsletter_status_idx
  ON public.blog_newsletter_subscribers (status, created_at DESC);

INSERT INTO public.blog_categories (slug, name, description, color, icon, sort_order)
VALUES
  ('blok-zinciri', 'Blok Zinciri', 'Dağıtık defterler, mutabakat mekanizmaları ve akıllı sözleşmeler.', 'amber', 'blocks', 10),
  ('bitcoin', 'Bitcoin', 'Bitcoin protokolü, madencilik, Lightning ve parasal özellikler.', 'orange', 'bitcoin', 20),
  ('kripto-paralar', 'Kripto Paralar', 'Bilinen kripto ağlarının çalışma biçimleri ve teknik karşılaştırmaları.', 'violet', 'coins', 30),
  ('yapay-zeka', 'Yapay Zekâ', 'Makine öğrenmesi, büyük dil modelleri ve üretken yapay zekâ.', 'sky', 'brain', 40),
  ('altyapi', 'Teknoloji Altyapısı', 'Kriptografi, ağlar, veri yapıları ve sistem tasarımı.', 'emerald', 'cpu', 50)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.blog_home_sections (
  section_type,
  internal_name,
  heading,
  subheading,
  sort_order,
  config
)
VALUES
  ('hero', 'Ana karşılama', 'Teknolojiyi ezberlemeden anlayın', 'Blok zinciri, Bitcoin, kripto paralar ve yapay zekânın nasıl çalıştığını kaynaklarıyla keşfedin.', 10, '{"showSearch":true,"showTopics":true}'::JSONB),
  ('featured_posts', 'Öne çıkan yazılar', 'Öne çıkanlar', 'Editörün seçtiği başlangıç yazıları.', 20, '{"limit":3,"layout":"editorial"}'::JSONB),
  ('latest_posts', 'Son yazılar', 'Yeni yayınlananlar', 'En güncel açıklamalar ve araştırma notları.', 30, '{"limit":6,"showFilters":true}'::JSONB),
  ('category_grid', 'Konu haritası', 'Konulara göre keşfet', 'İlgi alanınıza göre bir öğrenme yolu seçin.', 40, '{"limit":6}'::JSONB),
  ('newsletter', 'Bülten çağrısı', 'Yeni yazıları kaçırmayın', 'Yeni teknik incelemeler yayınlandığında e-posta alın.', 50, '{"variant":"panel"}'::JSONB)
ON CONFLICT DO NOTHING;

INSERT INTO public.blog_navigation_items (location, label, href, sort_order)
VALUES
  ('header', 'Blog', '/blog', 10),
  ('header', 'Arşiv', '/blog/arsiv', 20),
  ('header', 'Seriler', '/blog/seriler', 30),
  ('header', 'Hakkımda', '/', 40),
  ('footer', 'Gizlilik', '/gizlilik', 10),
  ('footer', 'RSS', '/blog/feed.xml', 20)
ON CONFLICT DO NOTHING;

-- Preserve existing long-form articles. The legacy table remains untouched so
-- rollback is possible and old deployments continue to read it during rollout.
INSERT INTO public.blog_posts (
  legacy_article_id,
  slug,
  locale,
  translation_group_id,
  title,
  excerpt,
  content_json,
  content_text,
  status,
  author_name,
  cover_image_url,
  cover_image_alt,
  related_keywords,
  is_featured,
  sort_order,
  word_count,
  reading_minutes,
  published_at,
  scheduled_for,
  created_at,
  updated_at
)
SELECT
  article.id,
  article.slug,
  CASE WHEN article.locale IN ('tr', 'en') THEN article.locale ELSE 'tr' END,
  article.translation_group_id,
  article.title,
  article.excerpt,
  jsonb_build_object(
    'type', 'doc',
    'content', CASE
      WHEN btrim(coalesce(article.content, '')) = '' THEN '[]'::JSONB
      ELSE jsonb_build_array(
        jsonb_build_object(
          'type', 'paragraph',
          'content', jsonb_build_array(
            jsonb_build_object('type', 'text', 'text', article.content)
          )
        )
      )
    END
  ),
  coalesce(article.content, ''),
  CASE article.status
    WHEN 'published' THEN 'published'::public.blog_post_status
    WHEN 'scheduled' THEN 'scheduled'::public.blog_post_status
    ELSE 'draft'::public.blog_post_status
  END,
  coalesce(NULLIF(article.author_name, ''), 'Muhammed Akan'),
  coalesce(article.cover_image_url, ''),
  coalesce(article.cover_image_alt, ''),
  coalesce(article.related_keywords, '{}'),
  coalesce(article.is_featured, FALSE),
  coalesce(article.sort_order, 0),
  CASE
    WHEN btrim(coalesce(article.content, '')) = '' THEN 0
    ELSE array_length(regexp_split_to_array(btrim(article.content), '\s+'), 1)
  END,
  greatest(
    1,
    ceil(
      CASE
        WHEN btrim(coalesce(article.content, '')) = '' THEN 0
        ELSE array_length(regexp_split_to_array(btrim(article.content), '\s+'), 1)
      END / 200.0
    )::INTEGER
  ),
  CASE
    WHEN article.status = 'published' THEN coalesce(article.published_at, article.updated_at, article.created_at, NOW())
    ELSE article.published_at
  END,
  CASE WHEN article.status = 'scheduled' THEN coalesce(article.published_at, NOW()) END,
  coalesce(article.created_at, NOW()),
  coalesce(article.updated_at, article.created_at, NOW())
FROM public.articles AS article
ON CONFLICT DO NOTHING;

INSERT INTO public.blog_post_sources (
  post_id,
  citation_key,
  title,
  url,
  sort_order
)
SELECT
  post.id,
  'legacy-' || source.ordinality::TEXT,
  source.reference,
  CASE WHEN source.reference ~ '^https?://' THEN source.reference ELSE NULL END,
  source.ordinality::INTEGER
FROM public.articles AS article
JOIN public.blog_posts AS post ON post.legacy_article_id = article.id
CROSS JOIN LATERAL unnest(coalesce(article."references", '{}')) WITH ORDINALITY AS source(reference, ordinality)
ON CONFLICT (post_id, citation_key) DO NOTHING;

INSERT INTO public.seo_redirects (
  from_path,
  to_path,
  status_code,
  reason,
  is_active
)
VALUES (
  '/yazilar',
  '/blog/arsiv',
  308,
  'Gelişmiş blog geçişi',
  TRUE
)
ON CONFLICT (from_path) DO NOTHING;

INSERT INTO public.seo_redirects (
  from_path,
  to_path,
  status_code,
  reason,
  is_active
)
SELECT
  '/yazilar/' || article.slug,
  '/blog/' || article.slug,
  308,
  'Gelişmiş blog yazı geçişi',
  TRUE
FROM public.articles AS article
ON CONFLICT (from_path) DO NOTHING;

CREATE OR REPLACE FUNCTION public.set_blog_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_blog_role()
RETURNS public.blog_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT member.role
  FROM public.blog_members AS member
  WHERE member.user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_blog_editor()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(public.current_blog_role() IN ('owner', 'editor'), FALSE);
$$;

CREATE OR REPLACE FUNCTION public.is_blog_owner()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(public.current_blog_role() = 'owner', FALSE);
$$;

CREATE OR REPLACE FUNCTION public.can_manage_blog_post(target_post_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    public.is_blog_editor()
    OR EXISTS (
      SELECT 1
      FROM public.blog_posts AS post
      WHERE post.id = target_post_id
        AND post.author_id = auth.uid()
        AND post.status IN ('draft', 'review')
        AND public.current_blog_role() = 'author'
    );
$$;

CREATE OR REPLACE FUNCTION public.claim_blog_owner()
RETURNS public.blog_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_id UUID := auth.uid();
  caller_email TEXT;
  configured_email TEXT;
  existing_role public.blog_role;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT member.role INTO existing_role
  FROM public.blog_members AS member
  WHERE member.user_id = caller_id;

  IF existing_role IS NOT NULL THEN
    RETURN existing_role;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('claim_blog_owner'));

  IF EXISTS (SELECT 1 FROM public.blog_members) THEN
    RAISE EXCEPTION 'Blog owner already configured' USING ERRCODE = '42501';
  END IF;

  SELECT lower(identity.email) INTO caller_email
  FROM auth.users AS identity
  WHERE identity.id = caller_id;

  SELECT lower(settings.owner_email) INTO configured_email
  FROM public.blog_settings AS settings
  WHERE settings.id = 1;

  IF caller_email IS NULL OR caller_email <> configured_email THEN
    RAISE EXCEPTION 'Account is not the configured blog owner' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.blog_members (user_id, role, display_name)
  VALUES (caller_id, 'owner', coalesce(split_part(caller_email, '@', 1), 'Owner'));

  RETURN 'owner'::public.blog_role;
END;
$$;

CREATE OR REPLACE FUNCTION public.capture_blog_post_revision()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  next_revision INTEGER;
BEGIN
  SELECT coalesce(max(revision.revision_number), 0) + 1
  INTO next_revision
  FROM public.blog_post_revisions AS revision
  WHERE revision.post_id = OLD.id;

  INSERT INTO public.blog_post_revisions (
    post_id,
    revision_number,
    snapshot,
    created_by
  )
  VALUES (
    OLD.id,
    next_revision,
    to_jsonb(OLD) - 'search_vector',
    auth.uid()
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.publish_due_blog_posts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.blog_posts
  SET
    status = 'published',
    published_at = coalesce(published_at, scheduled_for, NOW()),
    updated_at = NOW()
  WHERE status = 'scheduled'
    AND scheduled_for <= NOW();

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.search_published_blog_posts(
  search_query TEXT DEFAULT '',
  category_slug TEXT DEFAULT NULL,
  tag_slug TEXT DEFAULT NULL,
  series_slug TEXT DEFAULT NULL,
  result_limit INTEGER DEFAULT 12,
  result_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  slug TEXT,
  title TEXT,
  excerpt TEXT,
  cover_image_url TEXT,
  cover_image_alt TEXT,
  author_name TEXT,
  category_name TEXT,
  category_path TEXT,
  series_title TEXT,
  published_at TIMESTAMPTZ,
  reading_minutes SMALLINT,
  rank REAL
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT
    post.id,
    post.slug,
    post.title,
    post.excerpt,
    post.cover_image_url,
    post.cover_image_alt,
    post.author_name,
    category.name,
    category.slug,
    series.title,
    post.published_at,
    post.reading_minutes,
    CASE
      WHEN btrim(coalesce(search_query, '')) = '' THEN 0::REAL
      ELSE ts_rank_cd(post.search_vector, websearch_to_tsquery('turkish', search_query))
    END AS rank
  FROM public.blog_posts AS post
  LEFT JOIN public.blog_categories AS category ON category.id = post.category_id
  LEFT JOIN public.blog_series AS series ON series.id = post.series_id
  WHERE (
      post.status = 'published'
      OR (post.status = 'scheduled' AND post.scheduled_for <= NOW())
    )
    AND post.published_at <= NOW()
    AND (
      btrim(coalesce(search_query, '')) = ''
      OR post.search_vector @@ websearch_to_tsquery('turkish', search_query)
      OR post.title OPERATOR(extensions.%) search_query
    )
    AND (category_slug IS NULL OR category.slug = category_slug)
    AND (series_slug IS NULL OR series.slug = series_slug)
    AND (
      tag_slug IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.blog_post_tags AS post_tag
        JOIN public.blog_tags AS tag ON tag.id = post_tag.tag_id
        WHERE post_tag.post_id = post.id
          AND tag.slug = tag_slug
      )
    )
  ORDER BY
    CASE WHEN btrim(coalesce(search_query, '')) = '' THEN 0 ELSE 1 END DESC,
    rank DESC,
    post.is_pinned DESC,
    post.is_featured DESC,
    post.published_at DESC
  LIMIT least(greatest(result_limit, 1), 48)
  OFFSET greatest(result_offset, 0);
$$;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'blog_members',
    'blog_settings',
    'blog_assets',
    'blog_categories',
    'blog_tags',
    'blog_series',
    'blog_posts',
    'blog_post_tags',
    'blog_post_sources',
    'blog_post_revisions',
    'blog_home_sections',
    'blog_home_revisions',
    'blog_navigation_items',
    'blog_newsletter_subscribers',
    'blog_newsletter_broadcasts',
    'blog_newsletter_events',
    'blog_post_metrics_daily'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', table_name);
  END LOOP;
END $$;

-- Public, publish-state-aware reads.
CREATE POLICY blog_settings_public_read
  ON public.blog_settings FOR SELECT TO anon
  USING (TRUE);
CREATE POLICY blog_assets_public_read
  ON public.blog_assets FOR SELECT TO anon
  USING (deleted_at IS NULL);
CREATE POLICY blog_categories_public_read
  ON public.blog_categories FOR SELECT TO anon
  USING (is_active);
CREATE POLICY blog_tags_public_read
  ON public.blog_tags FOR SELECT TO anon
  USING (is_active);
CREATE POLICY blog_series_public_read
  ON public.blog_series FOR SELECT TO anon
  USING (is_active);
CREATE POLICY blog_posts_public_read
  ON public.blog_posts FOR SELECT TO anon
  USING (
    published_at <= NOW()
    AND (
      status = 'published'
      OR (status = 'scheduled' AND scheduled_for <= NOW())
    )
  );
CREATE POLICY blog_post_tags_public_read
  ON public.blog_post_tags FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.blog_posts AS post
    WHERE post.id = post_id
      AND post.published_at <= NOW()
      AND (post.status = 'published' OR (post.status = 'scheduled' AND post.scheduled_for <= NOW()))
  ));
CREATE POLICY blog_post_sources_public_read
  ON public.blog_post_sources FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.blog_posts AS post
    WHERE post.id = post_id
      AND post.published_at <= NOW()
      AND (post.status = 'published' OR (post.status = 'scheduled' AND post.scheduled_for <= NOW()))
  ));
CREATE POLICY blog_home_sections_public_read
  ON public.blog_home_sections FOR SELECT TO anon
  USING (is_enabled);
CREATE POLICY blog_navigation_public_read
  ON public.blog_navigation_items FOR SELECT TO anon
  USING (is_visible);

-- Authenticated readers get the same public rows; members get editorial reads.
CREATE POLICY blog_members_member_read
  ON public.blog_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_blog_owner());
CREATE POLICY blog_settings_member_read
  ON public.blog_settings FOR SELECT TO authenticated
  USING (TRUE);
CREATE POLICY blog_assets_member_read
  ON public.blog_assets FOR SELECT TO authenticated
  USING (deleted_at IS NULL OR public.is_blog_editor());
CREATE POLICY blog_categories_member_read
  ON public.blog_categories FOR SELECT TO authenticated
  USING (is_active OR public.is_blog_editor());
CREATE POLICY blog_tags_member_read
  ON public.blog_tags FOR SELECT TO authenticated
  USING (is_active OR public.is_blog_editor());
CREATE POLICY blog_series_member_read
  ON public.blog_series FOR SELECT TO authenticated
  USING (is_active OR public.is_blog_editor());
CREATE POLICY blog_posts_member_read
  ON public.blog_posts FOR SELECT TO authenticated
  USING (
    (published_at <= NOW() AND (status = 'published' OR (status = 'scheduled' AND scheduled_for <= NOW())))
    OR public.is_blog_editor()
    OR (author_id = auth.uid() AND public.current_blog_role() = 'author')
  );
CREATE POLICY blog_post_tags_member_read
  ON public.blog_post_tags FOR SELECT TO authenticated
  USING (TRUE);
CREATE POLICY blog_post_sources_member_read
  ON public.blog_post_sources FOR SELECT TO authenticated
  USING (TRUE);
CREATE POLICY blog_post_revisions_member_read
  ON public.blog_post_revisions FOR SELECT TO authenticated
  USING (public.can_manage_blog_post(post_id));
CREATE POLICY blog_home_sections_member_read
  ON public.blog_home_sections FOR SELECT TO authenticated
  USING (TRUE);
CREATE POLICY blog_home_revisions_member_read
  ON public.blog_home_revisions FOR SELECT TO authenticated
  USING (public.is_blog_editor());
CREATE POLICY blog_navigation_member_read
  ON public.blog_navigation_items FOR SELECT TO authenticated
  USING (TRUE);
CREATE POLICY blog_newsletter_subscribers_owner_read
  ON public.blog_newsletter_subscribers FOR SELECT TO authenticated
  USING (public.is_blog_owner());
CREATE POLICY blog_newsletter_broadcasts_editor_read
  ON public.blog_newsletter_broadcasts FOR SELECT TO authenticated
  USING (public.is_blog_editor());
CREATE POLICY blog_newsletter_events_owner_read
  ON public.blog_newsletter_events FOR SELECT TO authenticated
  USING (public.is_blog_owner());
CREATE POLICY blog_post_metrics_editor_read
  ON public.blog_post_metrics_daily FOR SELECT TO authenticated
  USING (public.is_blog_editor());

-- Owner-only member administration.
CREATE POLICY blog_members_owner_insert
  ON public.blog_members FOR INSERT TO authenticated
  WITH CHECK (public.is_blog_owner());
CREATE POLICY blog_members_owner_update
  ON public.blog_members FOR UPDATE TO authenticated
  USING (public.is_blog_owner())
  WITH CHECK (public.is_blog_owner());
CREATE POLICY blog_members_owner_delete
  ON public.blog_members FOR DELETE TO authenticated
  USING (public.is_blog_owner() AND user_id <> auth.uid());

-- Editors manage presentation and taxonomy.
CREATE POLICY blog_settings_editor_update
  ON public.blog_settings FOR UPDATE TO authenticated
  USING (public.is_blog_editor())
  WITH CHECK (public.is_blog_editor());

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'blog_assets',
    'blog_categories',
    'blog_tags',
    'blog_series',
    'blog_home_sections',
    'blog_home_revisions',
    'blog_navigation_items',
    'blog_newsletter_broadcasts'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_blog_editor())',
      table_name || '_editor_insert',
      table_name
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.is_blog_editor()) WITH CHECK (public.is_blog_editor())',
      table_name || '_editor_update',
      table_name
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.is_blog_editor())',
      table_name || '_editor_delete',
      table_name
    );
  END LOOP;
END $$;

CREATE POLICY blog_posts_member_insert
  ON public.blog_posts FOR INSERT TO authenticated
  WITH CHECK (
    public.is_blog_editor()
    OR (
      public.current_blog_role() = 'author'
      AND author_id = auth.uid()
      AND status IN ('draft', 'review')
    )
  );
CREATE POLICY blog_posts_member_update
  ON public.blog_posts FOR UPDATE TO authenticated
  USING (public.can_manage_blog_post(id))
  WITH CHECK (
    public.is_blog_editor()
    OR (
      public.current_blog_role() = 'author'
      AND author_id = auth.uid()
      AND status IN ('draft', 'review')
    )
  );
CREATE POLICY blog_posts_member_delete
  ON public.blog_posts FOR DELETE TO authenticated
  USING (public.can_manage_blog_post(id));

CREATE POLICY blog_post_tags_member_insert
  ON public.blog_post_tags FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_blog_post(post_id));
CREATE POLICY blog_post_tags_member_delete
  ON public.blog_post_tags FOR DELETE TO authenticated
  USING (public.can_manage_blog_post(post_id));
CREATE POLICY blog_post_sources_member_insert
  ON public.blog_post_sources FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_blog_post(post_id));
CREATE POLICY blog_post_sources_member_update
  ON public.blog_post_sources FOR UPDATE TO authenticated
  USING (public.can_manage_blog_post(post_id))
  WITH CHECK (public.can_manage_blog_post(post_id));
CREATE POLICY blog_post_sources_member_delete
  ON public.blog_post_sources FOR DELETE TO authenticated
  USING (public.can_manage_blog_post(post_id));
CREATE POLICY blog_post_revisions_member_insert
  ON public.blog_post_revisions FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_blog_post(post_id));

-- Subscriber PII and provider events are written only by the server-side
-- service role. Owners can remove records through authenticated admin flows.
CREATE POLICY blog_newsletter_subscribers_owner_delete
  ON public.blog_newsletter_subscribers FOR DELETE TO authenticated
  USING (public.is_blog_owner());
CREATE POLICY blog_newsletter_events_owner_delete
  ON public.blog_newsletter_events FOR DELETE TO authenticated
  USING (public.is_blog_owner());

GRANT USAGE ON TYPE public.blog_role TO authenticated, service_role;
GRANT USAGE ON TYPE public.blog_post_status TO anon, authenticated, service_role;
GRANT USAGE ON TYPE public.blog_newsletter_status TO authenticated, service_role;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;

GRANT SELECT ON TABLE
  public.blog_settings,
  public.blog_assets,
  public.blog_categories,
  public.blog_tags,
  public.blog_series,
  public.blog_posts,
  public.blog_post_tags,
  public.blog_post_sources,
  public.blog_home_sections,
  public.blog_navigation_items
TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.blog_members,
  public.blog_settings,
  public.blog_assets,
  public.blog_categories,
  public.blog_tags,
  public.blog_series,
  public.blog_posts,
  public.blog_post_tags,
  public.blog_post_sources,
  public.blog_post_revisions,
  public.blog_home_sections,
  public.blog_home_revisions,
  public.blog_navigation_items,
  public.blog_newsletter_subscribers,
  public.blog_newsletter_broadcasts,
  public.blog_newsletter_events,
  public.blog_post_metrics_daily
TO authenticated;

GRANT ALL ON TABLE
  public.blog_members,
  public.blog_settings,
  public.blog_assets,
  public.blog_categories,
  public.blog_tags,
  public.blog_series,
  public.blog_posts,
  public.blog_post_tags,
  public.blog_post_sources,
  public.blog_post_revisions,
  public.blog_home_sections,
  public.blog_home_revisions,
  public.blog_navigation_items,
  public.blog_newsletter_subscribers,
  public.blog_newsletter_broadcasts,
  public.blog_newsletter_events,
  public.blog_post_metrics_daily
TO service_role;

REVOKE ALL ON FUNCTION public.set_blog_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_blog_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_blog_editor() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_blog_owner() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_manage_blog_post(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_blog_owner() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.capture_blog_post_revision() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.publish_due_blog_posts() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.search_published_blog_posts(TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.current_blog_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_blog_editor() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_blog_owner() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_manage_blog_post(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_blog_owner() TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_due_blog_posts() TO service_role;
GRANT EXECUTE ON FUNCTION public.search_published_blog_posts(TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER) TO anon, authenticated, service_role;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'blog_members',
    'blog_settings',
    'blog_categories',
    'blog_tags',
    'blog_series',
    'blog_posts',
    'blog_post_sources',
    'blog_home_sections',
    'blog_navigation_items',
    'blog_newsletter_subscribers',
    'blog_newsletter_broadcasts'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', 'set_' || table_name || '_updated_at', table_name);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_blog_updated_at()',
      'set_' || table_name || '_updated_at',
      table_name
    );
  END LOOP;
END $$;

DROP TRIGGER IF EXISTS capture_blog_post_revision ON public.blog_posts;
CREATE TRIGGER capture_blog_post_revision
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.capture_blog_post_revision();

-- Media bucket. Public delivery is intentional; writes are restricted to
-- authenticated editors/authors and normal uploads still pass through the app.
INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'blog-media',
  'blog-media',
  TRUE,
  15728640,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
    'image/gif',
    'application/pdf'
  ]::TEXT[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS blog_media_public_read ON storage.objects;
CREATE POLICY blog_media_public_read
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'blog-media');

DROP POLICY IF EXISTS blog_media_member_insert ON storage.objects;
CREATE POLICY blog_media_member_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'blog-media'
    AND public.current_blog_role() IN ('owner', 'editor', 'author')
  );

DROP POLICY IF EXISTS blog_media_member_update ON storage.objects;
CREATE POLICY blog_media_member_update
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'blog-media'
    AND public.current_blog_role() IN ('owner', 'editor', 'author')
  )
  WITH CHECK (
    bucket_id = 'blog-media'
    AND public.current_blog_role() IN ('owner', 'editor', 'author')
  );

DROP POLICY IF EXISTS blog_media_member_delete ON storage.objects;
CREATE POLICY blog_media_member_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'blog-media'
    AND public.current_blog_role() IN ('owner', 'editor')
  );
