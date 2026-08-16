import { z } from 'zod';
import { serverSupabase } from '@/lib/supabase/server';
import {
  apiError,
  apiSuccess,
  rejectUnauthorized,
  revalidateSeoRoutes,
} from '@/lib/admin-api';
import {
  normalizePath,
  normalizeRobotsRules,
  normalizeSitemapConfig,
} from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const unauthorized = rejectUnauthorized(request);
  if (unauthorized) return unauthorized;
  if (!serverSupabase) return apiSuccess([]);
  const { data, error } = await serverSupabase
    .from('seo_revisions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) {
    return apiError('DATABASE_READ_FAILED', 'Revizyon geçmişi okunamadı.', 500);
  }
  return apiSuccess(
    (data || []).map((row) => ({
      id: row.id,
      entityType: row.entity_type,
      entityKey: row.entity_key,
      snapshot: row.snapshot,
      createdBy: row.created_by,
      createdAt: row.created_at,
    }))
  );
}

export async function PATCH(request: Request) {
  const unauthorized = rejectUnauthorized(request);
  if (unauthorized) return unauthorized;
  if (!serverSupabase) {
    return apiError('DATABASE_NOT_CONFIGURED', 'Supabase bağlantısı yok.', 503);
  }
  const parsed = z.object({ id: z.string().uuid() }).safeParse(await request.json());
  if (!parsed.success) {
    return apiError('INVALID_ID', 'Geçerli bir revizyon kimliği gereklidir.', 422);
  }
  const { data: revision } = await serverSupabase
    .from('seo_revisions')
    .select('*')
    .eq('id', parsed.data.id)
    .single();
  if (!revision) {
    return apiError('NOT_FOUND', 'Revizyon bulunamadı.', 404);
  }
  const snapshot = revision.snapshot;
  let error: { message?: string } | null = null;
  let restoredPath = '/';

  if (revision.entity_type === 'page') {
    const separator = revision.entity_key.lastIndexOf(':');
    const routeKey =
      separator > -1
        ? revision.entity_key.slice(0, separator)
        : revision.entity_key;
    const locale =
      separator > -1 ? revision.entity_key.slice(separator + 1) : 'tr';
    const { data: rows } = await serverSupabase
      .from('seo_pages')
      .select('id')
      .eq('route_key', routeKey)
      .eq('locale', locale)
      .limit(1);
    const result = await serverSupabase.from('seo_pages').upsert({
      ...(rows?.[0]?.id ? { id: rows[0].id } : {}),
      route_key: routeKey,
      locale,
      path: normalizePath(String(snapshot.path || '/')),
      title: snapshot.title || null,
      description: snapshot.description || null,
      focus_keyword: snapshot.focusKeyword || null,
      related_keywords: snapshot.relatedKeywords || [],
      search_intent: snapshot.searchIntent || null,
      topic_cluster: snapshot.topicCluster || null,
      og_title: snapshot.ogTitle || null,
      og_description: snapshot.ogDescription || null,
      og_image_url: snapshot.ogImageUrl || null,
      canonical_override: snapshot.canonicalOverride || null,
      is_indexable: snapshot.index ?? true,
      follow_links: snapshot.follow ?? true,
      include_in_sitemap: snapshot.includeInSitemap ?? true,
      updated_at: new Date().toISOString(),
    });
    error = result.error;
    restoredPath = normalizePath(String(snapshot.path || '/'));
  } else if (revision.entity_type === 'settings') {
    const { data: rows } = await serverSupabase
      .from('seo_site_settings')
      .select('id')
      .limit(1);
    const result = await serverSupabase.from('seo_site_settings').upsert({
      ...(rows?.[0]?.id ? { id: rows[0].id } : {}),
      site_name: snapshot.siteName,
      meta_title: snapshot.metaTitle,
      meta_description: snapshot.metaDescription,
      title_template: snapshot.titleTemplate,
      default_og_image_url: snapshot.ogImageUrl || null,
      author_name: snapshot.authorName,
      default_locale: snapshot.defaultLocale || 'tr',
      focus_topics: String(snapshot.keywords || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      twitter_handle: snapshot.twitterHandle || null,
      google_site_verification: snapshot.googleSiteVerification || null,
      bing_site_verification: snapshot.bingSiteVerification || null,
      ga4_measurement_id: snapshot.ga4MeasurementId || null,
      gsc_property: snapshot.gscProperty || null,
      ga4_property_id: snapshot.ga4PropertyId || null,
      enable_analytics: snapshot.enableAnalytics ?? false,
      allow_indexing: snapshot.allowIndexing ?? true,
      alternate_name: snapshot.alternateName || null,
      orcid_url: snapshot.orcidUrl || null,
      scholar_url: snapshot.scholarUrl || null,
      robots_rules: normalizeRobotsRules(snapshot.robotsRules),
      sitemap_config: normalizeSitemapConfig(snapshot.sitemapConfig),
      updated_at: new Date().toISOString(),
    });
    error = result.error;
  } else if (revision.entity_type === 'redirect') {
    const result = await serverSupabase.from('seo_redirects').upsert({
      id: snapshot.id || revision.entity_key,
      from_path: snapshot.from_path || snapshot.fromPath,
      to_path: snapshot.to_path || snapshot.toPath,
      status_code: snapshot.status_code || snapshot.statusCode || 308,
      reason: snapshot.reason || null,
      is_active: snapshot.is_active ?? snapshot.isActive ?? true,
      updated_at: new Date().toISOString(),
    });
    error = result.error;
    restoredPath = String(snapshot.from_path || snapshot.fromPath || '/');
  } else {
    return apiError('RESTORE_NOT_SUPPORTED', 'Revizyon türü desteklenmiyor.', 422);
  }

  if (error) {
    return apiError('RESTORE_FAILED', 'Revizyon geri yüklenemedi.', 500);
  }
  revalidateSeoRoutes([restoredPath]);
  return apiSuccess({ restored: parsed.data.id });
}
