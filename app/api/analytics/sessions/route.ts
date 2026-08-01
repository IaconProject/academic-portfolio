import { apiError, apiSuccess, rejectUnauthorized } from '@/lib/admin-api';
import {
  AnalyticsReportingError,
  analyticsSessionRefsSchema,
  deleteAnalyticsSessions,
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

export async function DELETE(request: Request) {
  const unauthorized = rejectUnauthorized(request);
  if (unauthorized) return unauthorized;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(
      'INVALID_ANALYTICS_DELETE_BODY',
      'Silinecek oturumları içeren geçerli bir JSON gövdesi bekleniyor.',
      400
    );
  }

  const parsed = analyticsSessionRefsSchema.safeParse(
    body && typeof body === 'object' && 'sessionRefs' in body
      ? (body as { sessionRefs?: unknown }).sessionRefs
      : undefined
  );
  if (!parsed.success) {
    return apiError(
      'INVALID_ANALYTICS_SESSION_REFS',
      'Bir ile yüz arasında geçerli oturum seçilmelidir.',
      400,
      { sessionRefs: parsed.error.issues.map((issue) => issue.message) }
    );
  }

  try {
    return apiSuccess(await deleteAnalyticsSessions(parsed.data));
  } catch (error) {
    if (error instanceof AnalyticsReportingError) {
      return apiError(error.code, error.message, error.status, error.fields);
    }
    return apiError(
      'ANALYTICS_SESSION_DELETE_UNAVAILABLE',
      'Seçili analitik oturumları şu anda silinemiyor.',
      503
    );
  }
}
