import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Analytics v1 compatibility endpoint.
 *
 * The old endpoint used mutable JSON session rows and an ephemeral /tmp
 * fallback. It is deliberately retired instead of silently accepting data
 * that cannot be persisted reliably. Current clients use
 * POST /api/analytics/events.
 */
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'ANALYTICS_V1_RETIRED',
        message:
          'Eski ziyaretçi collector kullanımdan kaldırıldı. Sayfayı yenileyerek Analytics v2 istemcisini yükleyin.',
      },
    },
    {
      status: 410,
      headers: {
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    }
  );
}
