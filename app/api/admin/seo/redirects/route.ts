import { z } from 'zod';
import { serverSupabase } from '@/lib/supabase/server';
import { getSeoExperienceData } from '@/lib/seo-repository';
import {
  apiError,
  apiSuccess,
  rejectUnauthorized,
  revalidateSeoRoutes,
  zodFields,
} from '@/lib/admin-api';
import { createsRedirectLoop, normalizePath } from '@/lib/seo';

export const dynamic = 'force-dynamic';

const redirectSchema = z
  .object({
    id: z.string().uuid().optional(),
    fromPath: z.string().min(1).max(300),
    toPath: z.string().min(1).max(300),
    statusCode: z.union([z.literal(301), z.literal(308)]).default(308),
    reason: z.string().max(300).default(''),
    isActive: z.boolean().default(true),
  })
  .superRefine((value, context) => {
    if (normalizePath(value.fromPath) === normalizePath(value.toPath)) {
      context.addIssue({
        code: 'custom',
        path: ['toPath'],
        message: 'Kaynak ve hedef yol aynı olamaz.',
      });
    }
  });

export async function GET(request: Request) {
  const unauthorized = rejectUnauthorized(request);
  if (unauthorized) return unauthorized;
  if (serverSupabase) {
    const { data, error } = await serverSupabase
      .from('seo_redirects')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      return apiError('DATABASE_READ_FAILED', 'Redirectler okunamadı.', 500);
    }
    return apiSuccess(
      (data || []).map((row) => ({
        id: row.id,
        fromPath: row.from_path,
        toPath: row.to_path,
        statusCode: row.status_code === 301 ? 301 : 308,
        reason: row.reason || '',
        isActive: row.is_active ?? true,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))
    );
  }
  const data = await getSeoExperienceData();
  return apiSuccess(data.seoRedirects || []);
}

async function save(request: Request) {
  const unauthorized = rejectUnauthorized(request);
  if (unauthorized) return unauthorized;
  if (!serverSupabase) {
    return apiError(
      'DATABASE_NOT_CONFIGURED',
      'Redirect yönetimi için Supabase bağlantısı gereklidir.',
      503
    );
  }
  const parsed = redirectSchema.safeParse(await request.json());
  if (!parsed.success) {
    return apiError(
      'VALIDATION_ERROR',
      'Redirect alanlarını kontrol edin.',
      422,
      zodFields(parsed.error)
    );
  }
  const value = parsed.data;
  const fromPath = normalizePath(value.fromPath);
  const toPath = normalizePath(value.toPath);
  const current = await getSeoExperienceData();
  const otherRedirects = (current.seoRedirects || []).filter(
    (item) => item.id !== value.id
  );
  if (
    value.isActive &&
    createsRedirectLoop(otherRedirects, {
      fromPath,
      toPath,
    })
  ) {
    return apiError(
      'REDIRECT_LOOP',
      'Bu yönlendirme bir redirect döngüsü oluşturur.',
      422
    );
  }

  const existing = await serverSupabase
    .from('seo_redirects')
    .select('*')
    .eq('from_path', fromPath)
    .limit(1)
    .maybeSingle();
  if (existing.data) {
    await serverSupabase.from('seo_revisions').insert({
      entity_type: 'redirect',
      entity_key: existing.data.id,
      snapshot: existing.data,
    });
  }
  const { data, error } = await serverSupabase
    .from('seo_redirects')
    .upsert({
      ...(value.id ? { id: value.id } : {}),
      from_path: fromPath,
      to_path: toPath,
      status_code: value.statusCode,
      reason: value.reason || null,
      is_active: value.isActive,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();
  if (error) {
    return apiError(
      'DATABASE_WRITE_FAILED',
      error.code === '23505'
        ? 'Bu kaynak yol için zaten bir redirect bulunuyor.'
        : 'Redirect kaydedilemedi.',
      error.code === '23505' ? 409 : 500
    );
  }
  revalidateSeoRoutes([fromPath]);
  return apiSuccess(
    {
      id: data.id,
      fromPath: data.from_path,
      toPath: data.to_path,
      statusCode: data.status_code === 301 ? 301 : 308,
      reason: data.reason || '',
      isActive: data.is_active ?? true,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    },
    value.id ? 200 : 201
  );
}

export async function POST(request: Request) {
  return save(request);
}

export async function PATCH(request: Request) {
  return save(request);
}

export async function DELETE(request: Request) {
  const unauthorized = rejectUnauthorized(request);
  if (unauthorized) return unauthorized;
  if (!serverSupabase) {
    return apiError('DATABASE_NOT_CONFIGURED', 'Supabase bağlantısı yok.', 503);
  }
  const id = new URL(request.url).searchParams.get('id');
  if (!id || !z.string().uuid().safeParse(id).success) {
    return apiError('INVALID_ID', 'Geçerli bir redirect kimliği gereklidir.', 422);
  }
  const { error } = await serverSupabase
    .from('seo_redirects')
    .delete()
    .eq('id', id);
  if (error) {
    return apiError('DATABASE_DELETE_FAILED', 'Redirect silinemedi.', 500);
  }
  revalidateSeoRoutes();
  return apiSuccess({ id });
}
