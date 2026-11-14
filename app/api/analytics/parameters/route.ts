import { apiError, apiSuccess, rejectUnauthorized } from '@/lib/admin-api';
import {
  AnalyticsReportingError,
} from '@/lib/analytics-reporting.server';
import { getAnalyticsUrlParameterReport } from '@/lib/analytics-url-parameters.server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const unauthorized = rejectUnauthorized(request);
  if (unauthorized) return unauthorized;

  const requestedDays = new URL(request.url).searchParams.get('days') || '30';
  if (!['7', '30', '90'].includes(requestedDays)) {
    return apiError('INVALID_ANALYTICS_RANGE', 'Tarih aralığı 7, 30 veya 90 gün olmalıdır.', 400);
  }

  try {
    return apiSuccess(await getAnalyticsUrlParameterReport(Number(requestedDays) as 7 | 30 | 90));
  } catch (error) {
    if (error instanceof AnalyticsReportingError) {
      return apiError(error.code, error.message, error.status, error.fields);
    }
    return apiError(
      'ANALYTICS_PARAMETER_REPORT_UNAVAILABLE',
      'URL parametre raporu şu anda alınamıyor.',
      503
    );
  }
}
