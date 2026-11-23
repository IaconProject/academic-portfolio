import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { apiError, apiSuccess, rejectUnauthorized } from '@/lib/admin-api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const requestSchema = z.object({
  scope: z.enum(['portfolio', 'blog', 'seo-insights', 'all']),
});

const scopeLabels = {
  portfolio: 'Portfolyo sayfaları',
  blog: 'Blog sayfaları',
  'seo-insights': 'Google SEO raporları',
  all: 'Tüm site',
} as const;

function invalidatePortfolio() {
  revalidateTag('seo', { expire: 0 });
  revalidateTag('portfolio-content', { expire: 0 });
  for (const path of [
    '/',
    '/yayinlar',
    '/projeler',
    '/gizlilik',
    '/sitemap.xml',
    '/robots.txt',
    '/llms.txt',
    '/feed.xml',
    '/og.png',
  ]) {
    revalidatePath(path);
  }
  revalidatePath('/yayinlar/[slug]', 'page');
  revalidatePath('/projeler/[slug]', 'page');
}

function invalidateBlog() {
  revalidatePath('/blog', 'layout');
  for (const path of ['/feed.xml', '/sitemap.xml', '/llms.txt']) {
    revalidatePath(path);
  }
}

export async function POST(request: Request) {
  const unauthorized = rejectUnauthorized(request);
  if (unauthorized) return unauthorized;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_REQUEST', 'Geçerli bir JSON isteği gönderin.', 400);
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('INVALID_SCOPE', 'Geçersiz cache kapsamı seçildi.', 400);
  }

  const { scope } = parsed.data;
  switch (scope) {
    case 'portfolio':
      invalidatePortfolio();
      break;
    case 'blog':
      invalidateBlog();
      break;
    case 'seo-insights':
      revalidateTag('seo-insights', { expire: 0 });
      break;
    case 'all':
      revalidateTag('seo', { expire: 0 });
      revalidateTag('portfolio-content', { expire: 0 });
      revalidateTag('seo-insights', { expire: 0 });
      revalidatePath('/', 'layout');
      break;
  }

  return apiSuccess({
    scope,
    label: scopeLabels[scope],
    invalidatedAt: new Date().toISOString(),
  });
}
