-- Admin credentials are exclusively accessed by the server-side service role.
ALTER TABLE public.admin_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow write admin_credentials" ON public.admin_credentials;
DROP POLICY IF EXISTS "Public read admin_credentials" ON public.admin_credentials;

REVOKE ALL PRIVILEGES ON TABLE public.admin_credentials FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.admin_credentials FROM authenticated;
