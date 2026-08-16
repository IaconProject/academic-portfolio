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
import {
  getSiteUrl,
  normalizeRobotsRules,
  normalizeSeoSettings,
  normalizeSitemapConfig,
} from '@/lib/seo';

export const dynamic = 'force-dynamic';

const robotsPathSchema = z
  .string()
  .trim()
  .min(1)
  .max(300)
  .regex(/^\//, 'Robots yolu / ile başlamalıdır.')
  .refine((value) => !/[\r\n]/.test(value), 'Robots yolu tek satır olmalıdır.');

const robotsRuleSchema = z
  .object({
    id: z.string().trim().regex(/^[A-Za-z0-9_-]{1,80}$/),
    name: z.string().trim().min(2).max(120),
    enabled: z.boolean().default(true),
    userAgents: z
      .array(z.string().trim().regex(/^[A-Za-z0-9*._-]{1,120}$/))
      .min(1)
      .max(20),
    allow: z.array(robotsPathSchema).max(50).default([]),
    disallow: z.array(robotsPathSchema).max(50).default([]),
  })
  .refine((value) => value.allow.length > 0 || value.disallow.length > 0, {
    message: 'Her tarayıcı kuralında en az bir Allow veya Disallow yolu olmalıdır.',
  });

const sitemapConfigSchema = z.object({
  enabled: z.boolean().default(true),
  includePublications: z.boolean().default(true),
  includeProjects: z.boolean().default(true),
  includeArticles: z.boolean().default(true),
  additionalPaths: z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .max(300)
        .regex(/^\//, 'Ek sitemap yolu / ile başlamalıdır.')
        .refine(
          (value) =>
            !value.startsWith('/admin') &&
            !value.startsWith('/api/') &&
            !['/robots.txt', '/sitemap.xml'].includes(value),
          'Admin, API, robots.txt ve sitemap.xml ek sitemap yolu olamaz.'
        )
    )
    .max(200)
    .default([]),
});

const settingsSchema = z.object({
  metaTitle: z.string().trim().min(10).max(180),
  metaDescription: z.string().trim().min(40).max(500),
  keywords: z.string().max(1000).default(''),
  ogImageUrl: z.union([z.literal(''), z.string().url()]).default(''),
  authorName: z.string().trim().min(2).max(120),
  siteName: z.string().trim().min(2).max(160),
  titleTemplate: z
    .string()
    .trim()
    .min(3)
    .max(160)
    .refine((value) => value.includes('%s'), 'Başlık şablonu %s içermelidir.'),
  defaultLocale: z.enum(['tr', 'en']).default('tr'),
  twitterHandle: z.string().max(80).default(''),
  googleSiteVerification: z
    .string()
    .max(255)
    .refine((value) => !/[<>]/.test(value), 'Yalnız doğrulama kodunu girin.')
    .default(''),
  bingSiteVerification: z
    .string()
    .max(255)
    .refine((value) => !/[<>]/.test(value), 'Yalnız doğrulama kodunu girin.')
    .default(''),
  ga4MeasurementId: z.string().max(40).default(''),
  gscProperty: z.string().max(255).default(''),
  ga4PropertyId: z.string().max(80).default(''),
  enableAnalytics: z.boolean().default(false),
  allowIndexing: z.boolean().default(true),
  alternateName: z.string().max(160).default(''),
  orcidUrl: z.union([z.literal(''), z.string().url()]).default(''),
  scholarUrl: z.union([z.literal(''), z.string().url()]).default(''),
  robotsRules: z.array(robotsRuleSchema).min(1).max(20),
  sitemapConfig: sitemapConfigSchema,
});

export async function GET(request: Request) {
  const unauthorized = rejectUnauthorized(request);
  if (unauthorized) return unauthorized;
  const data = await getSeoExperienceData();
  return apiSuccess({
    ...normalizeSeoSettings(data.seoSettings, data.profile.fullName),
    canonicalUrl: getSiteUrl(),
    canonicalUrlReadOnly: true,
  });
}

export async function PATCH(request: Request) {
  const unauthorized = rejectUnauthorized(request);
  if (unauthorized) return unauthorized;
  if (!serverSupabase) {
    return apiError(
      'DATABASE_NOT_CONFIGURED',
      'Kalıcı SEO ayarları için Supabase bağlantısı yapılandırılmalıdır.',
      503
    );
  }

  const parsed = settingsSchema.safeParse(await request.json());
  if (!parsed.success) {
    return apiError(
      'VALIDATION_ERROR',
      'SEO ayarlarında geçersiz alanlar var.',
      422,
      zodFields(parsed.error)
    );
  }

  const current = await getSeoExperienceData();
  const now = new Date().toISOString();
  await serverSupabase.from('seo_revisions').insert({
    entity_type: 'settings',
    entity_key: 'site',
    snapshot: current.seoSettings,
    created_at: now,
  });

  const payload = {
    ...parsed.data,
    robotsRules: normalizeRobotsRules(parsed.data.robotsRules),
    sitemapConfig: normalizeSitemapConfig(parsed.data.sitemapConfig),
  };
  const { data: currentRows } = await serverSupabase
    .from('seo_site_settings')
    .select('id')
    .limit(1);
  const { error } = await serverSupabase.from('seo_site_settings').upsert({
    ...(currentRows?.[0]?.id ? { id: currentRows[0].id } : {}),
    site_name: payload.siteName,
    meta_title: payload.metaTitle,
    meta_description: payload.metaDescription,
    title_template: payload.titleTemplate,
    default_og_image_url: payload.ogImageUrl || null,
    author_name: payload.authorName,
    default_locale: payload.defaultLocale,
    focus_topics: payload.keywords
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    twitter_handle: payload.twitterHandle || null,
    google_site_verification: payload.googleSiteVerification || null,
    bing_site_verification: payload.bingSiteVerification || null,
    ga4_measurement_id: payload.ga4MeasurementId || null,
    gsc_property: payload.gscProperty || null,
    ga4_property_id: payload.ga4PropertyId || null,
    enable_analytics: payload.enableAnalytics,
    allow_indexing: payload.allowIndexing,
    alternate_name: payload.alternateName || null,
    orcid_url: payload.orcidUrl || null,
    scholar_url: payload.scholarUrl || null,
    robots_rules: payload.robotsRules,
    sitemap_config: payload.sitemapConfig,
    updated_at: now,
  });

  if (error) {
    return apiError(
      'DATABASE_WRITE_FAILED',
      'SEO migration’ı uygulanmadan yeni ayarlar kaydedilemez.',
      500
    );
  }

  revalidateSeoRoutes();
  return apiSuccess({
    ...payload,
    canonicalUrl: getSiteUrl(),
    canonicalUrlReadOnly: true,
  });
}
