import { z } from 'zod';
import { getSeoExperienceData } from '@/lib/seo-repository';
import { serverSupabase } from '@/lib/supabase/server';
import {
  apiError,
  apiSuccess,
  rejectUnauthorized,
  revalidateSeoRoutes,
  zodFields,
} from '@/lib/admin-api';
import { findSeoPage, normalizePath } from '@/lib/seo';

export const dynamic = 'force-dynamic';

const pageSchema = z.object({
  path: z.string().trim().min(1).max(300),
  locale: z.enum(['tr', 'en']).default('tr'),
  title: z.string().max(180).default(''),
  description: z.string().max(500).default(''),
  focusKeyword: z.string().max(180).default(''),
  relatedKeywords: z.array(z.string().max(180)).max(30).default([]),
  searchIntent: z
    .enum(['informational', 'navigational', 'academic', 'transactional'])
    .optional(),
  topicCluster: z.string().max(180).default(''),
  ogTitle: z.string().max(180).default(''),
  ogDescription: z.string().max(500).default(''),
  ogImageUrl: z.union([z.literal(''), z.string().url()]).default(''),
  canonicalOverride: z.union([z.literal(''), z.string().url()]).default(''),
  index: z.boolean().default(true),
  follow: z.boolean().default(true),
  includeInSitemap: z.boolean().default(true),
  presentation: z
    .object({
      eyebrow: z.string().max(100).default(''),
      heading: z.string().max(180).default(''),
      intro: z.string().max(1000).default(''),
    })
    .default({ eyebrow: '', heading: '', intro: '' }),
});

export async function GET(
  request: Request,
  { params }: { params: { routeKey: string } }
) {
  const unauthorized = rejectUnauthorized(request);
  if (unauthorized) return unauthorized;
  const data = await getSeoExperienceData();
  return apiSuccess(
    findSeoPage(data.seoPages, decodeURIComponent(params.routeKey))
  );
}

export async function PATCH(
  request: Request,
  { params }: { params: { routeKey: string } }
) {
  const unauthorized = rejectUnauthorized(request);
  if (unauthorized) return unauthorized;
  if (!serverSupabase) {
    return apiError(
      'DATABASE_NOT_CONFIGURED',
      'Kalıcı sayfa SEO yönetimi için Supabase bağlantısı gereklidir.',
      503
    );
  }
  const parsed = pageSchema.safeParse(await request.json());
  if (!parsed.success) {
    return apiError(
      'VALIDATION_ERROR',
      'Sayfa SEO alanlarında geçersiz değerler var.',
      422,
      zodFields(parsed.error)
    );
  }
  const routeKey = decodeURIComponent(params.routeKey);
  const current = await getSeoExperienceData();
  const previous = findSeoPage(current.seoPages, routeKey);
  const now = new Date().toISOString();

  await serverSupabase.from('seo_revisions').insert({
    entity_type: 'page',
    entity_key: `${routeKey}:${parsed.data.locale}`,
    snapshot: previous,
    created_at: now,
  });
  const { data: rows } = await serverSupabase
    .from('seo_pages')
    .select('id')
    .eq('route_key', routeKey)
    .eq('locale', parsed.data.locale)
    .limit(1);
  const value = parsed.data;
  const { error } = await serverSupabase.from('seo_pages').upsert({
    ...(rows?.[0]?.id ? { id: rows[0].id } : {}),
    route_key: routeKey,
    path: normalizePath(value.path),
    locale: value.locale,
    title: value.title || null,
    description: value.description || null,
    focus_keyword: value.focusKeyword || null,
    related_keywords: value.relatedKeywords,
    search_intent: value.searchIntent || null,
    topic_cluster: value.topicCluster || null,
    og_title: value.ogTitle || null,
    og_description: value.ogDescription || null,
    og_image_url: value.ogImageUrl || null,
    canonical_override: value.canonicalOverride || null,
    is_indexable: value.index,
    follow_links: value.follow,
    include_in_sitemap: value.canonicalOverride
      ? false
      : value.includeInSitemap,
    presentation: value.presentation,
    updated_at: now,
  });
  if (error) {
    return apiError(
      'DATABASE_WRITE_FAILED',
      'Sayfa SEO ayarları kaydedilemedi.',
      500
    );
  }
  revalidateSeoRoutes([normalizePath(value.path)]);
  return apiSuccess({ routeKey, ...value, updatedAt: now });
}
