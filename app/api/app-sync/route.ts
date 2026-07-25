import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { getClientIp, lookupGeo, parseDeviceAndBrowser } from '@/lib/visitor-helpers.server';
import { VisitorSession, PageNavStep } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sessionId = (body.sessionId || '').trim();
    const path = (body.path || '/').trim();
    const title = (body.title || 'Portfolyo').trim();
    const screenResolution = (body.screenResolution || '').trim();
    const gpuRenderer = (body.gpuRenderer || '').trim();

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'sessionId zorunludur.' }, { status: 400 });
    }

    const ip = getClientIp(request);
    const userAgent = request.headers.get('user-agent') || '';
    const nowIso = new Date().toISOString();
    const newPageStep: PageNavStep = { path, title, timestamp: nowIso };

    if (!isSupabaseConfigured || !supabase) {
      return NextResponse.json({ success: false, error: 'Supabase devredışı.' }, { status: 500 });
    }

    // 1. Query Supabase directly for existing session
    const { data: existingRows, error: selectErr } = await supabase
      .from('visitor_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!selectErr && existingRows && existingRows.length > 0) {
      const row = existingRows[0];
      const existingPages = Array.isArray(row.pages) ? [...row.pages] : [];

      // Avoid duplicate consecutive page logs if under 2 seconds
      const lastStep = existingPages[existingPages.length - 1];
      const isDuplicate = lastStep && lastStep.path === path && (Date.now() - new Date(lastStep.timestamp).getTime() < 2000);

      if (!isDuplicate) {
        if (existingPages.length >= 100) {
          existingPages.shift(); // FIFO trim if capped at 100
        }
        existingPages.push(newPageStep);
      }

      await supabase
        .from('visitor_sessions')
        .update({
          pages: existingPages,
          updated_at: nowIso,
        })
        .eq('session_id', sessionId);

      return NextResponse.json({ success: true, isNewSession: false });
    }

    // 2. New Session -> Full Instant Edge Geo Lookup & Hardware Parsing
    const geo = await lookupGeo(ip, request);
    const device = parseDeviceAndBrowser(userAgent, gpuRenderer, screenResolution);

    const newSessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    await supabase.from('visitor_sessions').insert({
      id: newSessionId,
      session_id: sessionId,
      ip: ip,
      country: geo.country,
      country_code: geo.countryCode,
      city: geo.city,
      region: geo.region,
      isp: geo.isp,
      is_mobile_network: geo.isMobileNetwork,
      device_brand: device.deviceBrand,
      device_model: device.deviceModel,
      device_type: device.deviceType,
      os_name: device.osName,
      os_version: device.osVersion,
      browser_name: device.browserName,
      browser_version: device.browserVersion,
      user_agent: userAgent,
      lat: geo.lat,
      lon: geo.lon,
      pages: [newPageStep],
      created_at: nowIso,
      updated_at: nowIso,
    });

    return NextResponse.json({ success: true, isNewSession: true });
  } catch (err) {
    console.error('POST /api/app-sync error:', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
