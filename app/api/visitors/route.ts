import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { VisitorSession } from '@/lib/types';
import {
  getLocalSessions,
  deleteLocalSession,
  deleteLocalSessionsByIds,
  deleteAllLocalSessions,
} from '@/app/api/app-sync/route';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Map a raw session row (from Supabase or local store) to the VisitorSession shape
 * used by the admin panel. Handles both snake_case (DB) and camelCase (local) keys.
 */
function mapSession(row: any): VisitorSession {
  return {
    id: row.id,
    sessionId: row.session_id || row.sessionId || '',
    ip: row.ip || '',
    country: row.country || 'Türkiye',
    countryCode: row.country_code || row.countryCode || 'TR',
    city: row.city || 'Bilinmiyor',
    region: row.region || 'Bilinmiyor',
    isp: row.isp || 'Bilinmeyen Operatör',
    isMobileNetwork: row.is_mobile_network ?? row.isMobileNetwork ?? false,
    deviceBrand: row.device_brand || row.deviceBrand || 'Bilinmiyor',
    deviceModel: row.device_model || row.deviceModel || 'Bilinmiyor',
    deviceType: row.device_type || row.deviceType || 'Desktop',
    osName: row.os_name || row.osName || 'Bilinmiyor',
    osVersion: row.os_version || row.osVersion || '',
    browserName: row.browser_name || row.browserName || 'Bilinmiyor',
    browserVersion: row.browser_version || row.browserVersion || '',
    userAgent: row.user_agent || row.userAgent || '',
    lat: row.lat || 0,
    lon: row.lon || 0,
    pages: Array.isArray(row.pages) ? row.pages : [],
    createdAt: row.created_at || row.createdAt || '',
    updatedAt: row.updated_at || row.updatedAt || '',
  };
}

export async function GET() {
  let sessions: VisitorSession[] = [];

  // ── Try Supabase first ──
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('visitor_sessions')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1000);

      if (!error && data && data.length > 0) {
        sessions = data.map(mapSession);
      } else if (error) {
        console.error('[visitors GET] Supabase error:', error);
      }
    } catch (e) {
      console.error('[visitors GET] Supabase catch error:', e);
    }
  }

  // ── Local fallback: read from in-memory/tmp store if Supabase returned nothing ──
  if (sessions.length === 0) {
    try {
      const localData = getLocalSessions();
      if (localData && localData.length > 0) {
        sessions = localData.map(mapSession);
      }
    } catch (e) {
      console.warn('[visitors GET] Local fallback read error:', e);
    }
  }

  // Calculate Dashboard Statistics
  const uniqueVisitors = sessions.length;
  let totalVisits = 0;
  const fifteenMinsAgo = Date.now() - 15 * 60 * 1000;
  let activeNow = 0;

  const cityCounts: Record<string, number> = {};
  const countryCounts: Record<string, number> = {};
  const deviceCounts: Record<string, number> = {};
  const browserCounts: Record<string, number> = {};
  const ispCounts: Record<string, number> = {};
  const pageCounts: Record<string, number> = {};

  sessions.forEach((sess) => {
    const steps = Array.isArray(sess.pages) ? sess.pages : [];
    totalVisits += steps.length;

    const updatedTime = new Date(sess.updatedAt || sess.createdAt).getTime();
    if (updatedTime >= fifteenMinsAgo) {
      activeNow++;
    }

    if (sess.city && sess.city !== 'Bilinmiyor') cityCounts[sess.city] = (cityCounts[sess.city] || 0) + 1;
    if (sess.country) countryCounts[sess.country] = (countryCounts[sess.country] || 0) + 1;
    if (sess.isp && sess.isp !== 'Bilinmeyen Operatör') ispCounts[sess.isp] = (ispCounts[sess.isp] || 0) + 1;

    const devLabel = `${sess.deviceBrand} (${sess.deviceType})`;
    deviceCounts[devLabel] = (deviceCounts[devLabel] || 0) + 1;

    const browserLabel = `${sess.browserName} (${sess.osName})`;
    browserCounts[browserLabel] = (browserCounts[browserLabel] || 0) + 1;

    steps.forEach((step) => {
      const p = step.path || '/';
      pageCounts[p] = (pageCounts[p] || 0) + 1;
    });
  });

  const getTop = (obj: Record<string, number>, limit = 5) =>
    Object.entries(obj)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

  return NextResponse.json({
    success: true,
    stats: {
      totalVisits,
      uniqueVisitors,
      activeNow,
      topCities: getTop(cityCounts),
      topCountries: getTop(countryCounts),
      topDevices: getTop(deviceCounts),
      topBrowsers: getTop(browserCounts),
      topISPs: getTop(ispCounts),
      topPages: getTop(pageCounts),
    },
    sessions,
  });
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');
    let idsParam = searchParams.get('ids');
    const clearAll = searchParams.get('clearAll');

    // Support JSON body if passed
    try {
      if (request.headers.get('content-type')?.includes('application/json')) {
        const body = await request.json();
        if (body.ids && Array.isArray(body.ids)) {
          idsParam = body.ids.join(',');
        }
      }
    } catch (e) {
      console.warn('[visitors DELETE] Body parse error:', e);
    }

    // ── Clear All ──
    if (clearAll === 'true') {
      // Clear Supabase
      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from('visitor_sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        } catch (e) {
          console.warn('[visitors DELETE] Supabase clearAll error:', e);
        }
      }

      // Clear local fallback store
      try {
        deleteAllLocalSessions();
      } catch (e) {
        console.warn('[visitors DELETE] Local clearAll error:', e);
      }

      return NextResponse.json({ success: true });
    }

    // ── Delete by IDs (batch or single) ──
    const idsToDelete = idsParam ? idsParam.split(',').map((x) => x.trim()).filter(Boolean) : id ? [id] : [];

    if (idsToDelete.length > 0) {
      // Delete from Supabase
      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from('visitor_sessions').delete().in('id', idsToDelete);
        } catch (e) {
          console.warn('[visitors DELETE] Supabase delete error:', e);
        }
      }

      // Delete from local fallback store
      try {
        deleteLocalSessionsByIds(idsToDelete);
      } catch (e) {
        console.warn('[visitors DELETE] Local delete error:', e);
      }

      return NextResponse.json({ success: true, count: idsToDelete.length });
    }

    return NextResponse.json({ success: false, error: 'Parametre eksik.' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
