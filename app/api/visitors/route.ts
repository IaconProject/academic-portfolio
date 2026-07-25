import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { VisitorSession } from '@/lib/types';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SESSIONS_TMP_FILE = path.join('/tmp', 'academic_visitor_sessions_v2.json');

let memorySessions: VisitorSession[] = [];

function readLocalSessions(): VisitorSession[] {
  if (memorySessions.length > 0) return memorySessions;
  try {
    if (fs.existsSync(SESSIONS_TMP_FILE)) {
      const content = fs.readFileSync(SESSIONS_TMP_FILE, 'utf-8');
      if (content) {
        memorySessions = JSON.parse(content);
        return memorySessions;
      }
    }
  } catch (e) {
    console.error('Failed reading local visitor sessions:', e);
  }
  return [];
}

function writeLocalSessions(sessions: VisitorSession[]): void {
  memorySessions = sessions;
  try {
    fs.writeFileSync(SESSIONS_TMP_FILE, JSON.stringify(sessions, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed writing local visitor sessions:', e);
  }
}

export async function GET() {
  let sessions: VisitorSession[] = [];

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('visitor_sessions')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1000);

      if (!error && data) {
        sessions = data.map((row: any) => ({
          id: row.id,
          sessionId: row.session_id,
          ip: row.ip,
          country: row.country || 'Bilinmiyor',
          countryCode: row.country_code || 'TR',
          city: row.city || 'Bilinmiyor',
          region: row.region || 'Bilinmiyor',
          isp: row.isp || 'Bilinmiyor',
          isMobileNetwork: row.is_mobile_network ?? false,
          deviceBrand: row.device_brand || 'Bilinmiyor',
          deviceModel: row.device_model || 'Bilinmiyor',
          deviceType: row.device_type || 'Desktop',
          osName: row.os_name || 'Bilinmiyor',
          osVersion: row.os_version || '',
          browserName: row.browser_name || 'Bilinmiyor',
          browserVersion: row.browser_version || '',
          userAgent: row.user_agent || '',
          lat: row.lat || 0,
          lon: row.lon || 0,
          pages: Array.isArray(row.pages) ? row.pages : [],
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));
        writeLocalSessions(sessions);
      } else {
        sessions = readLocalSessions();
      }
    } catch (e) {
      sessions = readLocalSessions();
    }
  } else {
    sessions = readLocalSessions();
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

    if (sess.city) cityCounts[sess.city] = (cityCounts[sess.city] || 0) + 1;
    if (sess.country) countryCounts[sess.country] = (countryCounts[sess.country] || 0) + 1;
    if (sess.isp) ispCounts[sess.isp] = (ispCounts[sess.isp] || 0) + 1;

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

    // Also support JSON body if passed
    try {
      if (request.headers.get('content-type')?.includes('application/json')) {
        const body = await request.json();
        if (body.ids && Array.isArray(body.ids)) {
          idsParam = body.ids.join(',');
        }
      }
    } catch (e) {}

    let current = readLocalSessions();

    if (clearAll === 'true') {
      writeLocalSessions([]);

      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from('visitor_sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        } catch (e) {}
      }

      return NextResponse.json({ success: true });
    }

    const idsToDelete = idsParam ? idsParam.split(',').map((x) => x.trim()).filter(Boolean) : id ? [id] : [];

    if (idsToDelete.length > 0) {
      const deleteSet = new Set(idsToDelete);
      current = current.filter((s) => !deleteSet.has(s.id) && !deleteSet.has(s.sessionId));
      writeLocalSessions(current);

      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from('visitor_sessions').delete().in('id', idsToDelete);
        } catch (e) {}
      }

      return NextResponse.json({ success: true, count: idsToDelete.length });
    }

    return NextResponse.json({ success: false, error: 'Parametre eksik.' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
