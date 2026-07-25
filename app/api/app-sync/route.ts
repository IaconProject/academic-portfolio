import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { getClientIp, lookupGeo, parseDeviceAndBrowser } from '@/lib/visitor-helpers.server';
import { VisitorSession, PageNavStep } from '@/lib/types';
import { sendNotificationEmail } from '@/lib/email-service';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ── Local Fallback Store (In-Memory + /tmp persistence) ──
const TMP_SESSIONS_PATH = path.join('/tmp', 'academic_portfolio_visitor_sessions_v2.json');
let inMemorySessions: Record<string, any> = {};
let localStoreLoaded = false;

function loadLocalSessions(): void {
  if (localStoreLoaded) return;
  try {
    if (fs.existsSync(TMP_SESSIONS_PATH)) {
      const content = fs.readFileSync(TMP_SESSIONS_PATH, 'utf-8');
      if (content) {
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed === 'object') {
          inMemorySessions = parsed;
        }
      }
    }
  } catch (e) {
    console.warn('[app-sync] Failed to load local sessions:', e);
  }
  localStoreLoaded = true;
}

function persistLocalSessions(): void {
  try {
    // Keep max 500 sessions to avoid unbounded growth
    const keys = Object.keys(inMemorySessions);
    if (keys.length > 500) {
      const sorted = keys
        .map((k) => ({ key: k, updatedAt: inMemorySessions[k]?.updated_at || '' }))
        .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
      const removeCount = keys.length - 500;
      for (let i = 0; i < removeCount; i++) {
        delete inMemorySessions[sorted[i].key];
      }
    }
    fs.writeFileSync(TMP_SESSIONS_PATH, JSON.stringify(inMemorySessions), 'utf-8');
  } catch (e) {
    console.warn('[app-sync] Failed to persist local sessions:', e);
  }
}

/** Exported for the visitors GET API to read local fallback data */
export function getLocalSessions(): any[] {
  loadLocalSessions();
  return Object.values(inMemorySessions).sort(
    (a: any, b: any) => (b.updated_at || '').localeCompare(a.updated_at || '')
  );
}

/** Delete a single local session by id or sessionId */
export function deleteLocalSession(id: string): void {
  loadLocalSessions();
  // Try direct key match (sessionId is the key)
  if (inMemorySessions[id]) {
    delete inMemorySessions[id];
  } else {
    // Search by id field
    for (const key of Object.keys(inMemorySessions)) {
      if (inMemorySessions[key]?.id === id) {
        delete inMemorySessions[key];
        break;
      }
    }
  }
  persistLocalSessions();
}

/** Delete multiple local sessions by their ids */
export function deleteLocalSessionsByIds(ids: string[]): void {
  loadLocalSessions();
  const idSet = new Set(ids);
  for (const key of Object.keys(inMemorySessions)) {
    const entry = inMemorySessions[key];
    if (idSet.has(key) || idSet.has(entry?.id) || idSet.has(entry?.session_id) || idSet.has(entry?.sessionId)) {
      delete inMemorySessions[key];
    }
  }
  persistLocalSessions();
}

/** Clear all local sessions */
export function deleteAllLocalSessions(): void {
  inMemorySessions = {};
  persistLocalSessions();
}

// ── POST Handler ──

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sessionId = (body.sessionId || '').trim();
    const reqPath = (body.path || '/').trim();
    const title = (body.title || 'Portfolyo').trim();
    const screenResolution = (body.screenResolution || '').trim();
    const gpuRenderer = (body.gpuRenderer || '').trim();

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'sessionId zorunludur.' }, { status: 400 });
    }

    const ip = getClientIp(request);
    const userAgent = request.headers.get('user-agent') || '';
    const nowIso = new Date().toISOString();
    const newPageStep: PageNavStep = { path: reqPath, title, timestamp: nowIso };

    // ── Supabase Active Path ──
    if (isSupabaseConfigured && supabase) {
      try {
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
          const isDuplicate = lastStep && lastStep.path === reqPath && (Date.now() - new Date(lastStep.timestamp).getTime() < 2000);

          if (!isDuplicate) {
            if (existingPages.length >= 100) {
              existingPages.shift(); // FIFO trim if capped at 100
            }
            existingPages.push(newPageStep);
          }

          const { error: updateErr } = await supabase
            .from('visitor_sessions')
            .update({
              pages: existingPages,
              updated_at: nowIso,
            })
            .eq('id', row.id);

          if (updateErr) {
            console.warn('[app-sync] Supabase update error:', updateErr);
          }

          return NextResponse.json({ success: true, isNewSession: false });
        }

        // 2. New Session -> Full Instant Edge Geo Lookup & Hardware Parsing
        const geo = await lookupGeo(ip, request);
        const device = parseDeviceAndBrowser(userAgent, gpuRenderer, screenResolution);

        const newSessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        const { error: insertErr } = await supabase.from('visitor_sessions').insert({
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

        if (insertErr) {
          console.warn('[app-sync] Supabase insert error:', insertErr);
        } else {
          sendNotificationEmail({
            type: 'visitor',
            subject: `🔔 Yeni Ziyaretçi Oturumu: ${geo.city}, ${geo.country} (${ip})`,
            plainText: `Yeni ziyaretçi oturumu başlatıldı.\nIP: ${ip}\nŞehir: ${geo.city}, ${geo.country}\nISP: ${geo.isp}\nCihaz: ${device.deviceBrand} (${device.deviceType})\nİşletim Sistemi: ${device.osName}\nTarayıcı: ${device.browserName}`,
            htmlText: `
              <div style="font-family: sans-serif; padding: 20px; background-color: #f7f5f0; color: #1c1917;">
                <h2 style="color: #d97706;">🔔 Yeni Ziyaretçi Oturumu Başlatıldı</h2>
                <p><strong>IP Adresi:</strong> ${ip}</p>
                <p><strong>Lokasyon:</strong> ${geo.city}, ${geo.country}</p>
                <p><strong>Servis Sağlayıcı (ISP):</strong> ${geo.isp}</p>
                <p><strong>Cihaz & OS:</strong> ${device.deviceBrand} (${device.deviceType}) - ${device.osName} / ${device.browserName}</p>
                <hr style="border: none; border-top: 1px solid #e7e3d8; margin: 15px 0;" />
                <p style="font-size: 12px; color: #78716c;">Bu bildirim Akademik Portfolyo CMS yönetim paneliniz tarafından gönderilmiştir.</p>
              </div>
            `,
          }).catch(() => {});
        }

        return NextResponse.json({ success: true, isNewSession: true });
      } catch (supabaseErr) {
        console.warn('[app-sync] Supabase operation failed, falling through to local store:', supabaseErr);
        // Fall through to local store below
      }
    }

    // ── Local Fallback Path (Supabase disabled or failed) ──
    loadLocalSessions();

    // Check for existing local session
    const existingLocal = inMemorySessions[sessionId];

    if (existingLocal) {
      const existingPages: PageNavStep[] = Array.isArray(existingLocal.pages) ? [...existingLocal.pages] : [];

      // Avoid duplicate consecutive page logs if under 2 seconds
      const lastStep = existingPages[existingPages.length - 1];
      const isDuplicate = lastStep && lastStep.path === reqPath && (Date.now() - new Date(lastStep.timestamp).getTime() < 2000);

      if (!isDuplicate) {
        if (existingPages.length >= 100) {
          existingPages.shift();
        }
        existingPages.push(newPageStep);
      }

      existingLocal.pages = existingPages;
      existingLocal.updated_at = nowIso;
      existingLocal.updatedAt = nowIso;
      inMemorySessions[sessionId] = existingLocal;
      persistLocalSessions();

      return NextResponse.json({ success: true, isNewSession: false, store: 'local' });
    }

    // New local session
    const geo = await lookupGeo(ip, request);
    const device = parseDeviceAndBrowser(userAgent, gpuRenderer, screenResolution);
    const newId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newSession = {
      id: newId,
      session_id: sessionId,
      sessionId: sessionId,
      ip: ip,
      country: geo.country,
      country_code: geo.countryCode,
      countryCode: geo.countryCode,
      city: geo.city,
      region: geo.region,
      isp: geo.isp,
      is_mobile_network: geo.isMobileNetwork,
      isMobileNetwork: geo.isMobileNetwork,
      device_brand: device.deviceBrand,
      deviceBrand: device.deviceBrand,
      device_model: device.deviceModel,
      deviceModel: device.deviceModel,
      device_type: device.deviceType,
      deviceType: device.deviceType,
      os_name: device.osName,
      osName: device.osName,
      os_version: device.osVersion,
      osVersion: device.osVersion,
      browser_name: device.browserName,
      browserName: device.browserName,
      browser_version: device.browserVersion,
      browserVersion: device.browserVersion,
      user_agent: userAgent,
      userAgent: userAgent,
      lat: geo.lat,
      lon: geo.lon,
      pages: [newPageStep],
      created_at: nowIso,
      createdAt: nowIso,
      updated_at: nowIso,
      updatedAt: nowIso,
    };

    inMemorySessions[sessionId] = newSession;
    persistLocalSessions();

    return NextResponse.json({ success: true, isNewSession: true, store: 'local' });
  } catch (err) {
    console.error('POST /api/app-sync error:', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
