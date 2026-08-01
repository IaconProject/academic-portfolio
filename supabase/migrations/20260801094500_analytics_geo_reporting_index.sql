-- Keeps geo provenance enrichment bounded as the session table grows.
CREATE INDEX IF NOT EXISTS analytics_sessions_report_ref_idx
  ON public.analytics_sessions (
    ('s_' || substr(md5(id::TEXT), 1, 16))
  );
