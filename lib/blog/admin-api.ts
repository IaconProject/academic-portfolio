import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { BlogAuthError } from '@/lib/blog-auth';

export function blogAdminJson<T>(data: T, status = 200) {
  return NextResponse.json(
    { success: true, data },
    {
      status,
      headers: { 'Cache-Control': 'private, no-cache, no-store' },
    }
  );
}

export function blogAdminError(error: unknown) {
  if (error instanceof BlogAuthError) {
    return NextResponse.json(
      {
        success: false,
        error: { code: error.code, message: error.message },
      },
      { status: error.status }
    );
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.issues[0]?.message || 'Gönderilen alanları kontrol edin.',
          fields: error.flatten().fieldErrors,
        },
      },
      { status: 400 }
    );
  }

  const candidate = error as {
    code?: string;
    message?: string;
    details?: string;
  };
  const conflict = candidate?.code === '23505';
  return NextResponse.json(
    {
      success: false,
      error: {
        code: conflict ? 'CONFLICT' : 'BLOG_ADMIN_ERROR',
        message: conflict
          ? 'Bu kısa URL veya benzersiz alan zaten kullanılıyor.'
          : 'İşlem tamamlanamadı. Lütfen yeniden deneyin.',
      },
    },
    { status: conflict ? 409 : 500 }
  );
}
