import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { validateAdminSession } from './auth-helpers';

export function isAuthorizedAdmin(request: Request): boolean {
  return validateAdminSession(request);
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(
    { success: true, data },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    }
  );
}

export function apiError(
  code: string,
  message: string,
  status = 400,
  fields?: Record<string, string[]>
) {
  return NextResponse.json(
    {
      success: false,
      error: { code, message, ...(fields ? { fields } : {}) },
    },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    }
  );
}

export function rejectUnauthorized(request: Request) {
  if (isAuthorizedAdmin(request)) return null;
  return apiError(
    'UNAUTHORIZED',
    'Yetkisiz erişim. Lütfen yeniden giriş yapın.',
    401
  );
}

export function revalidateSeoRoutes(paths: string[] = []) {
  revalidateTag('seo');
  revalidateTag('portfolio-content');
  const routePaths = new Set([
    '/',
    '/yayinlar',
    '/projeler',
    '/yazilar',
    '/gizlilik',
    '/sitemap.xml',
    '/robots.txt',
    '/feed.xml',
    ...paths,
  ]);
  routePaths.forEach((path) => revalidatePath(path));
}

export function zodFields(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined> };
}) {
  const flattened = error.flatten().fieldErrors;
  return Object.fromEntries(
    Object.entries(flattened).filter(
      (entry): entry is [string, string[]] => Boolean(entry[1]?.length)
    )
  );
}
