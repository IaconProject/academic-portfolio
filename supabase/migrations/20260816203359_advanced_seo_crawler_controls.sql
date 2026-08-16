-- Advanced crawler and sitemap CMS controls plus the primary biography query.
-- This migration is additive; existing SEO revisions and legacy settings remain intact.

ALTER TABLE public.seo_site_settings
  ADD COLUMN IF NOT EXISTS robots_rules JSONB NOT NULL DEFAULT
    '[
      {
        "id": "search-engines",
        "name": "Arama motorları",
        "enabled": true,
        "userAgents": ["*"],
        "allow": ["/"],
        "disallow": ["/api/"]
      },
      {
        "id": "openai-search",
        "name": "OpenAI arama ve kullanıcı istekleri",
        "enabled": true,
        "userAgents": ["OAI-SearchBot", "ChatGPT-User"],
        "allow": ["/"],
        "disallow": ["/api/"]
      },
      {
        "id": "perplexity-search",
        "name": "Perplexity arama ve kullanıcı istekleri",
        "enabled": true,
        "userAgents": ["PerplexityBot", "Perplexity-User"],
        "allow": ["/"],
        "disallow": ["/api/"]
      },
      {
        "id": "ai-model-access",
        "name": "İsteğe bağlı AI model erişimi",
        "enabled": true,
        "userAgents": ["GPTBot", "Google-Extended"],
        "allow": ["/"],
        "disallow": ["/api/"]
      }
    ]'::JSONB,
  ADD COLUMN IF NOT EXISTS sitemap_config JSONB NOT NULL DEFAULT
    '{
      "enabled": true,
      "includePublications": true,
      "includeProjects": true,
      "includeArticles": true,
      "additionalPaths": []
    }'::JSONB;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'seo_site_settings_robots_rules_array'
      AND conrelid = 'public.seo_site_settings'::regclass
  ) THEN
    ALTER TABLE public.seo_site_settings
      ADD CONSTRAINT seo_site_settings_robots_rules_array
      CHECK (jsonb_typeof(robots_rules) = 'array');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'seo_site_settings_sitemap_config_object'
      AND conrelid = 'public.seo_site_settings'::regclass
  ) THEN
    ALTER TABLE public.seo_site_settings
      ADD CONSTRAINT seo_site_settings_sitemap_config_object
      CHECK (jsonb_typeof(sitemap_config) = 'object');
  END IF;
END $$;

UPDATE public.seo_site_settings
SET
  site_name = 'Muhammed Akan | Akademik Biyografi',
  meta_title = 'Muhammed Akan Kimdir? | Akademik Biyografi',
  meta_description = 'Muhammed Akan kimdir? İlahiyat öğrencisi, araştırmacı ve yazılımcı Muhammed Akan''ın biyografisi; eğitimi, akademik çalışmaları, yayınları ve projeleri.',
  title_template = '%s | Muhammed Akan',
  author_name = 'Muhammed Akan',
  focus_topics = ARRAY[
    'İslam Hukuku',
    'Yapay Zekâ Etiği',
    'Blokzincir Teknolojisi',
    'Yazılım',
    'Siber Güvenlik',
    'Dijital Dönüşüm'
  ],
  allow_indexing = TRUE,
  updated_at = NOW();

INSERT INTO public.seo_pages (
  route_key,
  path,
  locale,
  title,
  description,
  focus_keyword,
  related_keywords,
  search_intent,
  topic_cluster,
  og_title,
  og_description,
  canonical_override,
  is_indexable,
  follow_links,
  include_in_sitemap,
  updated_at
)
VALUES (
  'home',
  '/',
  'tr',
  'Muhammed Akan Kimdir? | Akademik Biyografi',
  'Muhammed Akan kimdir? İlahiyat öğrencisi, araştırmacı ve yazılımcı Muhammed Akan''ın biyografisi; eğitimi, akademik çalışmaları, yayınları ve projeleri.',
  'Muhammed Akan kimdir',
  ARRAY[
    'Muhammed Akan biyografi',
    'Muhammed Akan akademik kariyeri',
    'Muhammed Akan araştırmacı',
    'Muhammed Akan yazılımcı'
  ],
  'informational',
  'Muhammed Akan biyografisi',
  'Muhammed Akan Kimdir?',
  'Muhammed Akan''ın biyografisi, eğitimi, akademik çalışma alanları, yayınları ve araştırma projeleri.',
  NULL,
  TRUE,
  TRUE,
  TRUE,
  NOW()
)
ON CONFLICT (route_key, locale) DO UPDATE
SET
  path = EXCLUDED.path,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  focus_keyword = EXCLUDED.focus_keyword,
  related_keywords = EXCLUDED.related_keywords,
  search_intent = EXCLUDED.search_intent,
  topic_cluster = EXCLUDED.topic_cluster,
  og_title = EXCLUDED.og_title,
  og_description = EXCLUDED.og_description,
  canonical_override = EXCLUDED.canonical_override,
  is_indexable = EXCLUDED.is_indexable,
  follow_links = EXCLUDED.follow_links,
  include_in_sitemap = EXCLUDED.include_in_sitemap,
  updated_at = EXCLUDED.updated_at;

GRANT SELECT (robots_rules, sitemap_config)
  ON public.seo_site_settings TO anon, authenticated;
