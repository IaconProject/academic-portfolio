-- Replace legacy navigation placeholders with the empty optional-URL value
-- accepted by the SEO-CMS content contract.

UPDATE public.projects
SET url = '', updated_at = NOW()
WHERE BTRIM(COALESCE(url, '')) = '#';

UPDATE public.publications
SET url = '', updated_at = NOW()
WHERE BTRIM(COALESCE(url, '')) = '#';
