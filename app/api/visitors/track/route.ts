import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { getClientIp, lookupGeo, parseDeviceAndBrowser } from '@/lib/visitor-helpers.server';
import { VisitorSession, PageNavStep } from '@/lib/types';
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

    let localSessions = readLocalSessions();
    const existingIndex = localSessions.findIndex((s) => s.sessionId === sessionId);

    if (existingIndex !== -1) {
      // 1. Existing Session -> Append page step & update timestamp (No Geo Lookup Overhead!)
      const currentSession = localSessions[existingIndex];
      const updatedPages = Array.isArray(currentSession.pages) ? [...currentSession.pages] : [];

      // Avoid duplicate consecutive page logs if under 2 seconds
      const lastStep = updatedPages[updatedPages.length - 1];
      const isDuplicate = lastStep && lastStep.path === path && (Date.now() - new Date(lastStep.timestamp).getTime() < 2000);

      if (!isDuplicate) {
        if (updatedPages.length >= 100) {
          updatedPages.shift(); // FIFO trim if capped at 100
        }
        updatedPages.push(newPageStep);
      }

      currentSession.pages = updatedPages;
      currentSession.updatedAt = nowIso;
      localSessions[existingIndex] = currentSession;
      writeLocalSessions(localSessions);

      // Async update Supabase
      if (isSupabaseConfigured && supabase) {
        try {
          await supabase
            .from('visitor_sessions')
            .update({
              pages: updatedPages,
              updated_at: nowIso,
            })
            .eq('session_id', sessionId);
        } catch (e) {
          console.warn('Supabase session append error:', e);
        }
      }

      return NextResponse.json({ success: true, isNewSession: false });
    }

    // 2. New Session -> Full Geo Lookup & Hardware Parsing
    const geo = await lookupGeo(ip);
    const device = parseDeviceAndBrowser(userAgent, gpuRenderer, screenResolution);

    const newSession: VisitorSession = {
      id: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sessionId,
      ip,
      country: geo.country,
      countryCode: geo.countryCode,
      city: geo.city,
      region: geo.region,
      isp: geo.isp,
      isMobileNetwork: geo.isMobileNetwork,
      deviceBrand: device.deviceBrand,
      deviceModel: device.deviceModel,
      deviceType: device.deviceType,
      osName: device.osName,
      osVersion: device.osVersion,
      browserName: device.browserName,
      browserVersion: device.browserVersion,
      userAgent,
      lat: geo.lat,
      lon: geo.lon,
      pages: [newPageStep],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    localSessions = [newSession, ...localSessions];
    writeLocalSessions(localSessions);

    // Save to Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('visitor_sessions').insert({
          id: newSession.id,
          session_id: newSession.sessionId,
          ip: newSession.ip,
          country: newSession.country,
          country_code: newSession.countryCode,
          city: newSession.city,
          region: newSession.region,
          isp: newSession.isp,
          is_mobile_network: newSession.isMobileNetwork,
          device_brand: newSession.deviceBrand,
          device_model: newSession.deviceModel,
          device_type: newSession.deviceType,
          os_name: newSession.osName,
          os_version: newSession.osVersion,
          browser_name: newSession.browserName,
          browser_version: newSession.browserVersion,
          user_agent: newSession.userAgent,
          lat: newSession.lat,
          lon: newSession.lon,
          pages: newSession.pages,
          created_at: newSession.createdAt,
          updated_at: newSession.updatedAt,
        });
      } catch (e) {
        console.warn('Supabase session insert error:', e);
      }
    }

    return NextResponse.json({ success: true, isNewSession: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
