import { NextResponse } from 'next/server';
import {
  serverSupabase as supabase,
  hasSupabaseServiceRole,
} from '@/lib/supabase/server';
import { VisitorSession } from '@/lib/types';
import { validateAdminSession } from '@/lib/auth-helpers';

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

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Maps legacy visitor_sessions rows without inventing geo, ISP or hardware data.
 * Empty values are intentionally kept empty so the admin UI can label them as
 * unknown instead of presenting inferred information as fact.
 */
function mapSession(row: Record<string, unknown>): VisitorSession {
  const rawDeviceType = cleanText(row.device_type ?? row.deviceType);
  const deviceType = ['Desktop', 'Mobile', 'Tablet'].includes(rawDeviceType)
    ? (rawDeviceType as VisitorSession['deviceType'])
    : ('' as VisitorSession['deviceType']);

  return {
    id: cleanText(row.id),
    sessionId: cleanText(row.session_id ?? row.sessionId),
    ip: cleanText(row.ip),
    country: cleanText(row.country),
    countryCode: cleanText(row.country_code ?? row.countryCode),
    city: cleanText(row.city),
    region: cleanText(row.region),
    isp: cleanText(row.isp),
    isMobileNetwork: Boolean(row.is_mobile_network ?? row.isMobileNetwork),
    deviceBrand: cleanText(row.device_brand ?? row.deviceBrand),
    deviceModel: cleanText(row.device_model ?? row.deviceModel),
    deviceType,
    osName: cleanText(row.os_name ?? row.osName),
    osVersion: cleanText(row.os_version ?? row.osVersion),
    browserName: cleanText(row.browser_name ?? row.browserName),
    browserVersion: cleanText(row.browser_version ?? row.browserVersion),
    userAgent: cleanText(row.user_agent ?? row.userAgent),
    lat: typeof row.lat === 'number' ? row.lat : 0,
    lon: typeof row.lon === 'number' ? row.lon : 0,
    pages: Array.isArray(row.pages) ? row.pages : [],
    createdAt: cleanText(row.created_at ?? row.createdAt),
    updatedAt: cleanText(row.updated_at ?? row.updatedAt),
  };
}

function isKnown(value: string): boolean {
  const normalized = value.trim().toLocaleLowerCase('tr-TR');
  return Boolean(
    normalized &&
      normalized !== 'bilinmiyor' &&
      normalized !== 'bilinmeyen' &&
      normalized !== 'bilinmeyen operatör' &&
      normalized !== 'unknown' &&
      normalized !== '—'
  );
}

function buildStats(sessions: VisitorSession[]) {
  let storedPageSteps = 0;
  const fifteenMinsAgo = Date.now() - 15 * 60 * 1000;
  let activeLast15Minutes = 0;

  const cityCounts: Record<string, number> = {};
  const countryCounts: Record<string, number> = {};
  const deviceCounts: Record<string, number> = {};
  const browserCounts: Record<string, number> = {};
  const ispCounts: Record<string, number> = {};
  const pageCounts: Record<string, number> = {};

  sessions.forEach((session) => {
    const steps = Array.isArray(session.pages) ? session.pages : [];
    storedPageSteps += steps.length;

    const updatedTime = new Date(session.updatedAt || session.createdAt).getTime();
    if (Number.isFinite(updatedTime) && updatedTime >= fifteenMinsAgo) {
      activeLast15Minutes += 1;
    }

    if (isKnown(session.city)) {
      cityCounts[session.city] = (cityCounts[session.city] || 0) + 1;
    }
    if (isKnown(session.country)) {
      countryCounts[session.country] = (countryCounts[session.country] || 0) + 1;
    }
    if (isKnown(session.isp)) {
      ispCounts[session.isp] = (ispCounts[session.isp] || 0) + 1;
    }

    const deviceParts = [session.deviceBrand, session.deviceType].filter(isKnown);
    if (deviceParts.length > 0) {
      const deviceLabel =
        deviceParts.length === 2 ? `${deviceParts[0]} (${deviceParts[1]})` : deviceParts[0];
      deviceCounts[deviceLabel] = (deviceCounts[deviceLabel] || 0) + 1;
    }

    const browserParts = [session.browserName, session.osName].filter(isKnown);
    if (browserParts.length > 0) {
      const browserLabel =
        browserParts.length === 2 ? `${browserParts[0]} (${browserParts[1]})` : browserParts[0];
      browserCounts[browserLabel] = (browserCounts[browserLabel] || 0) + 1;
    }

    steps.forEach((step) => {
      const path = cleanText(step?.path) || '/';
      pageCounts[path] = (pageCounts[path] || 0) + 1;
    });
  });

  const getTop = (values: Record<string, number>, limit = 5) =>
    Object.entries(values)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

  return {
    storedPageSteps,
    legacyPageHistoryTruncated: sessions.some(
      (session) => (session.pages || []).length >= 100
    ),
    recordedLegacySessions: sessions.length,
    activeLast15Minutes,
    topCities: getTop(cityCounts),
    topCountries: getTop(countryCounts),
    topDevices: getTop(deviceCounts),
    topBrowsers: getTop(browserCounts),
    topISPs: getTop(ispCounts),
    topPages: getTop(pageCounts),
  };
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
    const { data, error } = await supabase!
      .from('visitor_sessions')
      .select(
        'id, session_id, ip, country, country_code, city, region, isp, is_mobile_network, device_brand, device_model, device_type, os_name, os_version, browser_name, browser_version, pages, created_at, updated_at'
      )
      .order('updated_at', { ascending: false })
      .limit(MAX_SESSIONS + 1);

    if (error) {
      console.error('[visitors GET] Supabase query error:', error);
      return errorResponse(
        503,
        'ANALYTICS_DATABASE_UNAVAILABLE',
        'Ziyaretçi kayıtları şu anda veritabanından okunamıyor.'
      );
    }

    const rows = Array.isArray(data) ? data : [];
    const isPartial = rows.length > MAX_SESSIONS;
    const sessions = rows.slice(0, MAX_SESSIONS).map((row) => mapSession(row));
    const stats = buildStats(sessions);
    const meta = {
      source: 'supabase',
      legacy: true,
      isPartial,
      limit: MAX_SESSIONS,
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
    const id = cleanText(searchParams.get('id'));
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
        ids = (body as { ids: unknown[] }).ids.map(cleanText).filter(Boolean);
      }
    }

    const idsParam = cleanText(searchParams.get('ids'));
    if (idsParam) {
      ids.push(...idsParam.split(',').map(cleanText).filter(Boolean));
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
      const { error, count } = await supabase!
        .from('visitor_sessions')
        .delete({ count: 'exact' })
        .not('id', 'is', null);

      if (error) {
        console.error('[visitors DELETE] Supabase clearAll error:', error);
        return errorResponse(
          503,
          'ANALYTICS_DELETE_FAILED',
          'Ziyaretçi kayıtları silinemedi. Veriler değiştirilmedi.'
        );
      }

      return NextResponse.json(
        {
          success: true,
          data: { deletedCount: count ?? 0 },
          count: count ?? 0,
        },
        { headers: RESPONSE_HEADERS }
      );
    }

    if (ids.length === 0) {
      return errorResponse(400, 'MISSING_IDS', 'Silinecek en az bir kayıt kimliği belirtilmelidir.');
    }

    const { error, count } = await supabase!
      .from('visitor_sessions')
      .delete({ count: 'exact' })
      .in('id', ids);

    if (error) {
      console.error('[visitors DELETE] Supabase delete error:', error);
      return errorResponse(
        503,
        'ANALYTICS_DELETE_FAILED',
        'Seçilen ziyaretçi kayıtları silinemedi. Veriler değiştirilmedi.'
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: { deletedCount: count ?? 0 },
        count: count ?? 0,
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
