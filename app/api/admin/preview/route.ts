import { draftMode } from 'next/headers';
import { z } from 'zod';
import { apiError, apiSuccess, rejectUnauthorized } from '@/lib/admin-api';

export const dynamic = 'force-dynamic';

const previewSchema = z.object({
  kind: z.enum(['articles', 'publications', 'projects']),
  slug: z.string().trim().min(1).max(100),
  locale: z.enum(['tr', 'en']).default('tr'),
});

function previewPath(kind: z.infer<typeof previewSchema>['kind'], slug: string) {
  if (kind === 'articles') return `/yazilar/${slug}`;
  if (kind === 'publications') return `/yayinlar/${slug}`;
  return `/projeler/${slug}`;
}

export async function POST(request: Request) {
  const unauthorized = rejectUnauthorized(request);
  if (unauthorized) return unauthorized;
  const parsed = previewSchema.safeParse(await request.json());
  if (!parsed.success) {
    return apiError('INVALID_PREVIEW', 'Önizleme yolu geçersiz.', 422);
  }
  if (parsed.data.locale === 'en') {
    return apiError(
      'LOCALE_NOT_PUBLISHED',
      'İngilizce rota şablonları açılana kadar çeviri yalnız taslak olarak tutulabilir.',
      422
    );
  }
  draftMode().enable();
  return apiSuccess({
    url: previewPath(parsed.data.kind, parsed.data.slug),
  });
}

export async function DELETE(request: Request) {
  const unauthorized = rejectUnauthorized(request);
  if (unauthorized) return unauthorized;
  draftMode().disable();
  return apiSuccess({ disabled: true });
}
