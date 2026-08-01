import { NextResponse } from 'next/server';
import {
  serverSupabase as supabase,
  hasSupabaseServiceRole,
} from '@/lib/supabase/server';
import { validateAdminSession } from '@/lib/auth-helpers';
import {
  buildLegacyStats,
  cleanLegacyText,
  mapLegacyLogRow,
  mapLegacySessionRow,
  parseLegacyRecordId,
} from '@/lib/legacy-analytics';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const MAX_SESSIONS = 1000;
const RESPONSE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  'X-Robots-Tag': 'noindex, nofollow',
};

type ApiError = {
  code: string;
  message: string;
  fields?: Record<string, string>;
};

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json(
    {
      success: false,
      error: { code, message } satisfies ApiError,
    },
    { status, headers: RESPONSE_HEADERS }
  );
}

function ensureAnalyticsBackend() {
  if (!hasSupabaseServiceRole || !supabase) {
    return errorResponse(
      503,
      'ANALYTICS_BACKEND_NOT_CONFIGURED',
      'Ziyaretçi analizi veritabanı bağlantısı yapılandırılmamış. SUPABASE_SERVICE_ROLE_KEY gerekli.'
    );
  }
  return null;
}

export async function GET(request: Request) {
  if (!validateAdminSession(request)) {
    return errorResponse(401, 'UNAUTHORIZED', 'Ziyaretçi verilerini görüntülemek için yeniden giriş yapın.');
  }

  const unavailableResponse = ensureAnalyticsBackend();
  if (unavailableResponse) return unavailableResponse;

  try {
    const [sessionResult, logResult] = await Promise.all([
      supabase!
        .from('visitor_sessions')
        .select(
          'id, session_id, ip, country, country_code, city, region, isp, is_mobile_network, device_brand, device_model, device_type, os_name, os_version, browser_name, browser_version, pages, created_at, updated_at',
          { count: 'exact' }
        )
        .order('updated_at', { ascending: false })
        .limit(MAX_SESSIONS + 1),
      supabase!
        .from('visitor_logs')
        .select(
          'id, ip_address, country, country_code, city, region, isp, is_mobile_network, device_type, device_brand, device_model, os_name, os_version, browser_name, browser_version, page_path, created_at',
          { count: 'exact' }
        )
        .order('created_at', { ascending: false })
        .limit(MAX_SESSIONS + 1),
    ]);

    if (sessionResult.error || logResult.error) {
      console.error('[visitors GET] Supabase query error:', {
        visitorSessions: sessionResult.error?.code,
        visitorLogs: logResult.error?.code,
      });
      return errorResponse(
        503,
        'ANALYTICS_DATABASE_UNAVAILABLE',
        'Ziyaretçi kayıtları şu anda veritabanından okunamıyor.'
      );
    }

    const sessionRows = Array.isArray(sessionResult.data)
      ? sessionResult.data
      : [];
    const logRows = Array.isArray(logResult.data) ? logResult.data : [];
    const sessions = [
      ...sessionRows.map((row) => mapLegacySessionRow(row)),
      ...logRows.map((row) => mapLegacyLogRow(row)),
    ]
      .sort((left, right) => {
        const leftTime = Date.parse(left.updatedAt || left.createdAt) || 0;
        const rightTime = Date.parse(right.updatedAt || right.createdAt) || 0;
        return rightTime - leftTime;
      })
      .slice(0, MAX_SESSIONS);
    const totalRows =
      (sessionResult.count ?? sessionRows.length) +
      (logResult.count ?? logRows.length);
    const isPartial = totalRows > sessions.length;
    const stats = buildLegacyStats(sessions);
    const meta = {
      source: 'supabase-legacy-combined',
      legacy: true,
      isPartial,
      limit: MAX_SESSIONS,
      sourceCounts: {
        visitorSessions: sessionResult.count ?? sessionRows.length,
        visitorLogs: logResult.count ?? logRows.length,
      },
      displayedSourceCounts: {
        visitorSessions: sessions.filter(
          (session) => session.legacySource === 'visitor_sessions'
        ).length,
        visitorLogs: sessions.filter(
          (session) => session.legacySource === 'visitor_logs'
        ).length,
      },
      activityWindowMinutes: 15,
      pageHistoryMayBeTruncated: stats.legacyPageHistoryTruncated,
      geoConfidence: 'unverified-legacy',
      generatedAt: new Date().toISOString(),
    };
    const responseData = { sessions, stats, meta };

    return NextResponse.json(
      {
        success: true,
        data: responseData,
      },
      { headers: RESPONSE_HEADERS }
    );
  } catch (error) {
    console.error('[visitors GET] Unexpected error:', error);
    return errorResponse(
      503,
      'ANALYTICS_DATABASE_UNAVAILABLE',
      'Ziyaretçi kayıtları şu anda veritabanından okunamıyor.'
    );
  }
}

export async function DELETE(request: Request) {
  if (!validateAdminSession(request)) {
    return errorResponse(401, 'UNAUTHORIZED', 'Bu işlem için yeniden giriş yapın.');
  }

  const unavailableResponse = ensureAnalyticsBackend();
  if (unavailableResponse) return unavailableResponse;

  try {
    const { searchParams } = new URL(request.url);
    const id = cleanLegacyText(searchParams.get('id'));
    const clearAll = searchParams.get('clearAll') === 'true';
    let ids: string[] = [];

    if (request.headers.get('content-type')?.includes('application/json')) {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return errorResponse(400, 'INVALID_JSON', 'İstek gövdesi geçerli JSON olmalıdır.');
      }

      if (
        typeof body === 'object' &&
        body !== null &&
        Array.isArray((body as { ids?: unknown }).ids)
      ) {
        ids = (body as { ids: unknown[] }).ids
          .map(cleanLegacyText)
          .filter(Boolean);
      }
    }

    const idsParam = cleanLegacyText(searchParams.get('ids'));
    if (idsParam) {
      ids.push(
        ...idsParam.split(',').map(cleanLegacyText).filter(Boolean)
      );
    }
    if (id) ids.push(id);
    ids = Array.from(new Set(ids));

    if (ids.length > 500) {
      return errorResponse(
        400,
        'TOO_MANY_IDS',
        'Tek istekte en fazla 500 ziyaretçi kaydı silinebilir.'
      );
    }

    if (clearAll) {
      const [sessionDelete, logDelete] = await Promise.all([
        supabase!
          .from('visitor_sessions')
          .delete({ count: 'exact' })
          .not('id', 'is', null),
        supabase!
          .from('visitor_logs')
          .delete({ count: 'exact' })
          .not('id', 'is', null),
      ]);

      if (sessionDelete.error || logDelete.error) {
        console.error('[visitors DELETE] Supabase clearAll error:', {
          visitorSessions: sessionDelete.error?.code,
          visitorLogs: logDelete.error?.code,
        });
        return errorResponse(
          503,
          'ANALYTICS_DELETE_FAILED',
          'Ziyaretçi kayıtları silinemedi. Veriler değiştirilmedi.'
        );
      }

      return NextResponse.json(
        {
          success: true,
          data: {
            deletedCount:
              (sessionDelete.count ?? 0) + (logDelete.count ?? 0),
          },
          count: (sessionDelete.count ?? 0) + (logDelete.count ?? 0),
        },
        { headers: RESPONSE_HEADERS }
      );
    }

    if (ids.length === 0) {
      return errorResponse(400, 'MISSING_IDS', 'Silinecek en az bir kayıt kimliği belirtilmelidir.');
    }

    const references = ids.map(parseLegacyRecordId);
    if (references.some((reference) => reference === null)) {
      return errorResponse(
        400,
        'INVALID_RECORD_ID',
        'Silinecek kayıtlardan en az birinin kaynak kimliği geçersiz.'
      );
    }

    const sessionIds = references
      .filter(
        (reference) => reference?.source === 'visitor_sessions'
      )
      .map((reference) => reference!.sourceId);
    const logIds = references
      .filter((reference) => reference?.source === 'visitor_logs')
      .map((reference) => reference!.sourceId);
    const deleteResults = await Promise.all([
      sessionIds.length > 0
        ? supabase!
            .from('visitor_sessions')
            .delete({ count: 'exact' })
            .in('id', sessionIds)
        : Promise.resolve({ error: null, count: 0 }),
      logIds.length > 0
        ? supabase!
            .from('visitor_logs')
            .delete({ count: 'exact' })
            .in('id', logIds)
        : Promise.resolve({ error: null, count: 0 }),
    ]);

    if (deleteResults.some((result) => result.error)) {
      console.error('[visitors DELETE] Supabase delete error:', {
        visitorSessions: deleteResults[0].error?.code,
        visitorLogs: deleteResults[1].error?.code,
      });
      return errorResponse(
        503,
        'ANALYTICS_DELETE_FAILED',
        'Seçilen ziyaretçi kayıtları silinemedi. Veriler değiştirilmedi.'
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          deletedCount: deleteResults.reduce(
            (sum, result) => sum + (result.count ?? 0),
            0
          ),
        },
        count: deleteResults.reduce(
          (sum, result) => sum + (result.count ?? 0),
          0
        ),
      },
      { headers: RESPONSE_HEADERS }
    );
  } catch (error) {
    console.error('[visitors DELETE] Unexpected error:', error);
    return errorResponse(
      500,
      'ANALYTICS_DELETE_FAILED',
      'Ziyaretçi kayıtları silinirken beklenmeyen bir hata oluştu.'
    );
  }
}
