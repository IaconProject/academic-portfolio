import { apiError, apiSuccess, rejectUnauthorized } from '@/lib/admin-api';
import {
  AnalyticsReportingError,
  getAnalyticsSessions,
  parseAnalyticsSessionsQuery,
} from '@/lib/analytics-reporting.server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const unauthorized = rejectUnauthorized(request);
  if (unauthorized) return unauthorized;

  const parsed = parseAnalyticsSessionsQuery(request);
  if (!parsed.success) {
    return apiError(
      'INVALID_ANALYTICS_QUERY',
      'Analitik oturum sorgusu geçersiz.',
      400,
      parsed.fields
    );
  }

  try {
    return apiSuccess(await getAnalyticsSessions(parsed.data));
  } catch (error) {
    if (error instanceof AnalyticsReportingError) {
      return apiError(error.code, error.message, error.status, error.fields);
    }
    return apiError(
      'ANALYTICS_SESSIONS_UNAVAILABLE',
      'Analitik oturumları şu anda kullanılamıyor.',
      503
    );
  }
}
