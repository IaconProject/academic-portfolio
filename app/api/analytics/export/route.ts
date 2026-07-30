import { NextResponse } from 'next/server';
import { apiError, rejectUnauthorized } from '@/lib/admin-api';
import {
  AnalyticsReportingError,
  createAnalyticsCsv,
  getAnalyticsExportRows,
  parseAnalyticsExportQuery,
} from '@/lib/analytics-reporting.server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const unauthorized = rejectUnauthorized(request);
  if (unauthorized) return unauthorized;

  const parsed = parseAnalyticsExportQuery(request);
  if (!parsed.success) {
    return apiError(
      'INVALID_ANALYTICS_QUERY',
      'Analitik dışa aktarma sorgusu geçersiz.',
      400,
      parsed.fields
    );
  }

  try {
    const rows = await getAnalyticsExportRows(parsed.data);
    const csv = createAnalyticsCsv(parsed.data.dataset, rows);
    const fileDate = parsed.data.from.slice(0, 10);
    const filename = `analytics-${parsed.data.dataset}-${fileDate}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Type': 'text/csv; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  } catch (error) {
    if (error instanceof AnalyticsReportingError) {
      return apiError(error.code, error.message, error.status, error.fields);
    }
    return apiError(
      'ANALYTICS_EXPORT_UNAVAILABLE',
      'Analitik verileri şu anda dışa aktarılamıyor.',
      503
    );
  }
}
