-- Content archive CMS presentation controls and deterministic editorial order.
-- Additive and idempotent so it can be applied safely to the existing project.

ALTER TABLE public.seo_pages
  ADD COLUMN IF NOT EXISTS presentation JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.publications
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'seo_pages_presentation_object_check'
      AND conrelid = 'public.seo_pages'::regclass
  ) THEN
    ALTER TABLE public.seo_pages
      ADD CONSTRAINT seo_pages_presentation_object_check
      CHECK (jsonb_typeof(presentation) = 'object');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'publications_sort_order_check'
      AND conrelid = 'public.publications'::regclass
  ) THEN
    ALTER TABLE public.publications
      ADD CONSTRAINT publications_sort_order_check
      CHECK (sort_order BETWEEN -10000 AND 10000);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'projects_sort_order_check'
      AND conrelid = 'public.projects'::regclass
  ) THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT projects_sort_order_check
      CHECK (sort_order BETWEEN -10000 AND 10000);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'articles_sort_order_check'
      AND conrelid = 'public.articles'::regclass
  ) THEN
    ALTER TABLE public.articles
      ADD CONSTRAINT articles_sort_order_check
      CHECK (sort_order BETWEEN -10000 AND 10000);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS publications_archive_order_idx
  ON public.publications (locale, is_featured DESC, sort_order, published_at DESC);

CREATE INDEX IF NOT EXISTS projects_archive_order_idx
  ON public.projects (locale, is_featured DESC, sort_order, published_at DESC);

CREATE INDEX IF NOT EXISTS articles_archive_order_idx
  ON public.articles (
    locale,
    status,
    is_featured DESC,
    sort_order,
    published_at DESC
  );

UPDATE public.seo_pages
SET presentation = jsonb_build_object(
  'eyebrow', 'Akademik üretim',
  'heading', 'Akademik Yayınlar',
  'intro', 'Hakemli çalışmalar, bildiriler, kitap bölümleri ve disiplinlerarası araştırma çıktıları.'
)
WHERE route_key = 'publications:index'
  AND locale = 'tr'
  AND presentation = '{}'::jsonb;

UPDATE public.seo_pages
SET presentation = jsonb_build_object(
  'eyebrow', 'Araştırma gündemi',
  'heading', 'Araştırma Projeleri',
  'intro', 'İslam hukuku, yapay zekâ etiği ve dijital teknolojiler kesişimindeki devam eden ve tamamlanan projeler.'
)
WHERE route_key = 'projects:index'
  AND locale = 'tr'
  AND presentation = '{}'::jsonb;

UPDATE public.seo_pages
SET presentation = jsonb_build_object(
  'eyebrow', 'Notlar ve incelemeler',
  'heading', 'Akademik Yazılar ve Araştırma Notları',
  'intro', 'Kaynaklı değerlendirmeler, kavramsal incelemeler ve güncel araştırma notları.'
)
WHERE route_key = 'articles:index'
  AND locale = 'tr'
  AND presentation = '{}'::jsonb;

-- Public visitors may read only these non-sensitive presentation fields.
GRANT SELECT (presentation) ON public.seo_pages TO anon, authenticated;
GRANT SELECT (is_featured, sort_order) ON public.publications TO anon, authenticated;
GRANT SELECT (is_featured, sort_order) ON public.projects TO anon, authenticated;
GRANT SELECT (is_featured, sort_order) ON public.articles TO anon, authenticated;
