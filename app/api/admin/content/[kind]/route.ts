import { z } from 'zod';
import { serverSupabase } from '@/lib/supabase/server';
import {
  apiError,
  apiSuccess,
  rejectUnauthorized,
  revalidateSeoRoutes,
  zodFields,
} from '@/lib/admin-api';
import { normalizePath, slugifyTurkish } from '@/lib/seo';
import { optionalUrlSchema } from '@/lib/admin-content-validation';

export const dynamic = 'force-dynamic';

const status = z.enum(['none', 'draft', 'scheduled', 'published']);
const baseDetail = {
  id: z.string().uuid().optional(),
  slug: z.string().max(100).default(''),
  locale: z.enum(['tr', 'en']).default('tr'),
  translationGroupId: z.union([z.literal(''), z.string().uuid()]).optional(),
  excerpt: z.string().max(1000).default(''),
  content: z.string().max(100000).default(''),
  coverImageUrl: optionalUrlSchema.default(''),
  coverImageAlt: z.string().max(300).default(''),
  publishedAt: z.string().datetime({ offset: true }).optional().or(z.literal('')),
};

const publicationSchema = z.object({
  ...baseDetail,
  type: z.string().min(2).max(80),
  title: z.string().min(3).max(300),
  publisher: z.string().max(300).default(''),
  year: z.string().min(4).max(30),
  url: optionalUrlSchema.default(''),
  doi: z.string().max(300).default(''),
  detailStatus: status.default('none'),
}).superRefine((value, context) => {
  validatePublishable(value, value.detailStatus, context);
});

const projectSchema = z.object({
  ...baseDetail,
  title: z.string().min(3).max(300),
  description: z.string().min(10).max(3000),
  years: z.string().min(2).max(80),
  tags: z.array(z.string().max(100)).max(30).default([]),
  relatedPublicationIds: z.array(z.string().uuid()).max(50).default([]),
  url: optionalUrlSchema.default(''),
  detailStatus: status.default('none'),
}).superRefine((value, context) => {
  validatePublishable(value, value.detailStatus, context);
});

const articleSchema = z.object({
  ...baseDetail,
  title: z.string().min(3).max(300),
  excerpt: z.string().min(40).max(1000),
  content: z.string().min(100).max(100000),
  status: z.enum(['draft', 'scheduled', 'published']).default('draft'),
  authorName: z.string().max(160).default(''),
  relatedKeywords: z.array(z.string().max(180)).max(30).default([]),
  topicCluster: z.string().max(180).default(''),
  references: z.array(z.string().max(1000)).max(100).default([]),
}).superRefine((value, context) => {
  validatePublishable(value, value.status, context);
});

function validatePublishable(
  value: {
    excerpt?: string;
    content?: string;
    coverImageUrl?: string;
    coverImageAlt?: string;
    publishedAt?: string;
  },
  contentStatus: string,
  context: z.RefinementCtx
) {
  if (contentStatus === 'draft' || contentStatus === 'none') return;
  if ((value.excerpt || '').trim().length < 40) {
    context.addIssue({
      code: 'custom',
      path: ['excerpt'],
      message: 'Yayınlamak için en az 40 karakterlik özgün bir özet gereklidir.',
    });
  }
  if ((value.content || '').trim().length < 100) {
    context.addIssue({
      code: 'custom',
      path: ['content'],
      message: 'Yayınlamak için en az 100 karakterlik ana içerik gereklidir.',
    });
  }
  if (value.coverImageUrl && !(value.coverImageAlt || '').trim()) {
    context.addIssue({
      code: 'custom',
      path: ['coverImageAlt'],
      message: 'Kapak görseli kullanıldığında alt metin zorunludur.',
    });
  }
  if (contentStatus === 'scheduled' && !value.publishedAt) {
    context.addIssue({
      code: 'custom',
      path: ['publishedAt'],
      message: 'Zamanlanmış içerik için yayın tarihi zorunludur.',
    });
  }
}

type ContentKind = 'articles' | 'publications' | 'projects';

function kindFrom(value: string): ContentKind | null {
  return ['articles', 'publications', 'projects'].includes(value)
    ? (value as ContentKind)
    : null;
}

function schemaFor(kind: ContentKind) {
  if (kind === 'articles') return articleSchema;
  if (kind === 'publications') return publicationSchema;
  return projectSchema;
}

function pathFor(kind: ContentKind, slug: string, locale = 'tr') {
  const prefix = locale === 'en' ? '/en' : '';
  if (kind === 'articles') return `${prefix}/${locale === 'en' ? 'articles' : 'yazilar'}/${slug}`;
  if (kind === 'publications') return `${prefix}/${locale === 'en' ? 'publications' : 'yayinlar'}/${slug}`;
  return `${prefix}/${locale === 'en' ? 'projects' : 'projeler'}/${slug}`;
}

function dbPayload(kind: ContentKind, value: Record<string, any>) {
  const slug = value.slug || slugifyTurkish(value.title);
  const common = {
    slug,
    locale: value.locale,
    translation_group_id: value.translationGroupId || null,
    excerpt: value.excerpt || '',
    content: value.content || '',
    cover_image_url: value.coverImageUrl || null,
    cover_image_alt: value.coverImageAlt || null,
    published_at:
      value.publishedAt ||
      (value.status === 'published' || value.detailStatus === 'published'
        ? new Date().toISOString()
        : null),
    updated_at: new Date().toISOString(),
  };
  if (kind === 'articles') {
    return {
      ...common,
      title: value.title,
      status: value.status,
      author_name: value.authorName || null,
      related_keywords: value.relatedKeywords,
      topic_cluster: value.topicCluster || null,
      references: value.references,
    };
  }
  if (kind === 'publications') {
    return {
      ...common,
      type: value.type,
      title: value.title,
      publisher: value.publisher || '',
      year: value.year,
      url: value.url || '',
      doi: value.doi || '',
      detail_status: value.detailStatus,
    };
  }
  return {
    ...common,
    title: value.title,
    description: value.description,
    years: value.years,
    tags: value.tags,
    related_publication_ids: value.relatedPublicationIds,
    url: value.url || '',
    detail_status: value.detailStatus,
  };
}

export async function GET(
  request: Request,
  { params }: { params: { kind: string } }
) {
  const unauthorized = rejectUnauthorized(request);
  if (unauthorized) return unauthorized;
  const kind = kindFrom(params.kind);
  if (!kind) return apiError('INVALID_KIND', 'Geçersiz içerik türü.', 404);
  if (!serverSupabase) return apiSuccess([]);
  const { data, error } = await serverSupabase
    .from(kind)
    .select('*')
    .order(kind === 'articles' ? 'published_at' : 'created_at', {
      ascending: false,
      nullsFirst: false,
    });
  if (error) {
    return apiError('DATABASE_READ_FAILED', 'İçerikler okunamadı.', 500);
  }
  return apiSuccess(data || []);
}

async function save(
  request: Request,
  kindValue: string,
  isPatch: boolean
) {
  const unauthorized = rejectUnauthorized(request);
  if (unauthorized) return unauthorized;
  const kind = kindFrom(kindValue);
  if (!kind) return apiError('INVALID_KIND', 'Geçersiz içerik türü.', 404);
  if (!serverSupabase) {
    return apiError('DATABASE_NOT_CONFIGURED', 'Supabase bağlantısı yok.', 503);
  }
  const parsed = schemaFor(kind).safeParse(await request.json());
  if (!parsed.success) {
    const fields = zodFields(parsed.error);
    console.warn('[admin/content] validation rejected', {
      kind,
      method: isPatch ? 'PATCH' : 'POST',
      fields,
    });
    return apiError(
      'VALIDATION_ERROR',
      'İçerik alanlarını kontrol edin.',
      422,
      fields
    );
  }
  const value = parsed.data as Record<string, any>;
  const requestedStatus =
    kind === 'articles' ? value.status : value.detailStatus;
  if (
    value.locale === 'en' &&
    (requestedStatus === 'published' || requestedStatus === 'scheduled')
  ) {
    return apiError(
      'ENGLISH_ROUTES_NOT_ENABLED',
      'İngilizce rota şablonları açılana kadar İngilizce içerik taslak olarak tutulmalıdır.',
      422
    );
  }
  if (isPatch && !value.id) {
    return apiError('INVALID_ID', 'Güncelleme için içerik kimliği gereklidir.', 422);
  }
  const slug = value.slug || slugifyTurkish(value.title);
  if (!slug) {
    return apiError('INVALID_SLUG', 'Geçerli bir URL kısa adı üretilemedi.', 422);
  }
  let previous: Record<string, any> | null = null;
  if (value.id) {
    const existing = await serverSupabase
      .from(kind)
      .select('*')
      .eq('id', value.id)
      .single();
    previous = existing.data;
  }
  const { data, error } = await serverSupabase
    .from(kind)
    .upsert({
      ...(value.id ? { id: value.id } : {}),
      ...dbPayload(kind, { ...value, slug }),
    })
    .select('*')
    .single();
  if (error) {
    console.error('[admin/content] database write failed', {
      kind,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return apiError(
      'DATABASE_WRITE_FAILED',
      error.code === '23505'
        ? 'Bu URL kısa adı aynı dilde başka bir içerik tarafından kullanılıyor.'
        : 'İçerik kaydedilemedi.',
      error.code === '23505' ? 409 : 500
    );
  }

  if (previous?.slug && previous.slug !== slug) {
    const fromPath = pathFor(kind, previous.slug, previous.locale || value.locale);
    const toPath = pathFor(kind, slug, value.locale);
    await serverSupabase.from('seo_redirects').upsert({
      from_path: normalizePath(fromPath),
      to_path: normalizePath(toPath),
      status_code: 308,
      reason: 'Slug değişikliği',
      is_active: true,
      updated_at: new Date().toISOString(),
    });
  }

  const savedStatus = kind === 'articles' ? data.status : data.detail_status;
  const seoRouteKey = `${kind === 'articles' ? 'article' : kind === 'publications' ? 'publication' : 'project'}:${data.id}`;
  const existingSeoPage = await serverSupabase
    .from('seo_pages')
    .select('is_indexable,include_in_sitemap')
    .eq('route_key', seoRouteKey)
    .eq('locale', data.locale || 'tr')
    .maybeSingle();
  await serverSupabase.from('seo_pages').upsert(
    {
      route_key: seoRouteKey,
      path: pathFor(kind, slug, data.locale || 'tr'),
      locale: data.locale || 'tr',
      is_indexable:
        existingSeoPage.data?.is_indexable ?? savedStatus !== 'none',
      follow_links: true,
      include_in_sitemap:
        existingSeoPage.data?.include_in_sitemap ?? savedStatus !== 'none',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'route_key,locale' }
  );

  revalidateSeoRoutes([
    kind === 'articles'
      ? '/yazilar'
      : kind === 'publications'
        ? '/yayinlar'
        : '/projeler',
    pathFor(kind, slug, data.locale || 'tr'),
    ...(previous?.slug
      ? [pathFor(kind, previous.slug, previous.locale || data.locale || 'tr')]
      : []),
  ]);
  return apiSuccess(data, isPatch ? 200 : 201);
}

export async function POST(
  request: Request,
  { params }: { params: { kind: string } }
) {
  return save(request, params.kind, false);
}

export async function PATCH(
  request: Request,
  { params }: { params: { kind: string } }
) {
  return save(request, params.kind, true);
}

export async function DELETE(
  request: Request,
  { params }: { params: { kind: string } }
) {
  const unauthorized = rejectUnauthorized(request);
  if (unauthorized) return unauthorized;
  const kind = kindFrom(params.kind);
  if (!kind) return apiError('INVALID_KIND', 'Geçersiz içerik türü.', 404);
  if (!serverSupabase) {
    return apiError('DATABASE_NOT_CONFIGURED', 'Supabase bağlantısı yok.', 503);
  }
  const id = new URL(request.url).searchParams.get('id');
  if (!id || !z.string().uuid().safeParse(id).success) {
    return apiError('INVALID_ID', 'Geçerli bir içerik kimliği gereklidir.', 422);
  }
  const previous = await serverSupabase
    .from(kind)
    .select('slug,locale')
    .eq('id', id)
    .single();
  const { error } = await serverSupabase.from(kind).delete().eq('id', id);
  if (error) {
    return apiError('DATABASE_DELETE_FAILED', 'İçerik silinemedi.', 500);
  }
  await serverSupabase
    .from('seo_pages')
    .delete()
    .eq(
      'route_key',
      `${kind === 'articles' ? 'article' : kind === 'publications' ? 'publication' : 'project'}:${id}`
    );
  revalidateSeoRoutes(
    previous.data?.slug
      ? [pathFor(kind, previous.data.slug, previous.data.locale || 'tr')]
      : []
  );
  return apiSuccess({ id });
}
