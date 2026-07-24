import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const TMP_LOGS_PATH = path.join('/tmp', 'academic_portfolio_visitor_logs_v1.json');
let inMemoryVisitorLogs: any[] = [];

function getStoredLogs(): any[] {
  if (inMemoryVisitorLogs.length > 0) return inMemoryVisitorLogs;
  try {
    if (fs.existsSync(TMP_LOGS_PATH)) {
      const content = fs.readFileSync(TMP_LOGS_PATH, 'utf-8');
      if (content) {
        inMemoryVisitorLogs = JSON.parse(content);
        return inMemoryVisitorLogs;
      }
    }
  } catch (e) {
    console.error('Failed to read tmp visitor logs:', e);
  }
  return [];
}

function saveLogs(logs: any[]): void {
  inMemoryVisitorLogs = logs.slice(0, 500);
  try {
    fs.writeFileSync(TMP_LOGS_PATH, JSON.stringify(inMemoryVisitorLogs), 'utf-8');
  } catch (e) {
    console.error('Failed to write tmp visitor logs:', e);
  }
}

interface ClientHardwareInfo {
  screenResolution?: string;
  viewportSize?: string;
  devicePixelRatio?: number;
  gpuRenderer?: string;
  platform?: string;
  maxTouchPoints?: number;
  connectionType?: string;
  isMobileConnection?: boolean;
  clientHintModel?: string;
  clientHintPlatform?: string;
}

// Ultra-precise device model & brand parser combining User-Agent + Hardware Footprints
function parseDeviceDetails(ua: string, hw: ClientHardwareInfo) {
  let deviceType: 'Mobile' | 'Tablet' | 'Desktop' = 'Desktop';
  let deviceBrand = 'Bilinmiyor';
  let deviceModel = 'Bilinmiyor';
  let osName = 'Bilinmiyor';
  let osVersion = '';
  let browserName = 'Bilinmiyor';
  let browserVersion = '';

  const uaLower = ua.toLowerCase();
  const gpu = (hw.gpuRenderer || '').toLowerCase();
  const screen = hw.screenResolution || '';
  const dpr = hw.devicePixelRatio || 1;
  const maxTouch = hw.maxTouchPoints || 0;

  // 1. Device Category & OS Detection
  if (/ipad|tablet|playbook|silk/i.test(ua) || (hw.platform === 'MacIntel' && maxTouch > 2)) {
    deviceType = 'Tablet';
  } else if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile|webos/i.test(ua) || maxTouch > 0) {
    deviceType = 'Mobile';
  } else {
    deviceType = 'Desktop';
  }

  // OS Detection
  if (ua.includes('iPhone') || ua.includes('iPad') || ua.includes('iPod') || hw.platform === 'iPhone' || hw.platform === 'iPad') {
    osName = (ua.includes('iPad') || hw.platform === 'iPad') ? 'iPadOS' : 'iOS';
    const match = ua.match(/OS (\d+[_.\d]+)/);
    if (match) osVersion = match[1].replace(/_/g, '.');
  } else if (ua.includes('Android') || hw.clientHintPlatform === 'Android') {
    osName = 'Android';
    const match = ua.match(/Android (\d+[_.\d]+)/);
    if (match) osVersion = match[1];
  } else if (ua.includes('Mac OS X') || hw.platform === 'MacIntel') {
    osName = 'macOS';
    const match = ua.match(/Mac OS X (\d+[_.\d]+)/);
    if (match) osVersion = match[1].replace(/_/g, '.');
  } else if (ua.includes('Windows NT')) {
    osName = 'Windows';
    if (ua.includes('Windows NT 10.0')) osVersion = '10 / 11';
    else if (ua.includes('Windows NT 6.3')) osVersion = '8.1';
    else if (ua.includes('Windows NT 6.1')) osVersion = '7';
  } else if (ua.includes('Linux')) {
    osName = 'Linux';
  }

  // 2. High-Precision Device Brand & Model Mapping
  if (osName === 'iOS' || osName === 'iPadOS' || ua.includes('iPhone')) {
    deviceBrand = 'Apple';

    // Dissect iPhone exact model based on Screen Matrix & DevicePixelRatio
    if (screen === '393x852' || screen === '852x393') {
      deviceModel = 'iPhone 15 / 15 Pro / 14 Pro';
    } else if (screen === '430x932' || screen === '932x430') {
      deviceModel = 'iPhone 15 Pro Max / 15 Plus / 14 Pro Max';
    } else if (screen === '390x844' || screen === '844x390') {
      deviceModel = 'iPhone 14 / 13 / 13 Pro / 12 / 12 Pro';
    } else if (screen === '428x926' || screen === '926x428') {
      deviceModel = 'iPhone 14 Plus / 13 Pro Max / 12 Pro Max';
    } else if (screen === '375x812' || screen === '812x375') {
      deviceModel = 'iPhone 13 mini / 12 mini / 11 Pro / XS / X';
    } else if (screen === '414x896' || screen === '896x414') {
      deviceModel = dpr >= 3 ? 'iPhone 11 Pro Max / XS Max' : 'iPhone 11 / XR';
    } else if (screen === '375x667' || screen === '667x375') {
      deviceModel = 'iPhone SE (2/3. Nesil) / 8 / 7';
    } else if (screen === '414x736' || screen === '736x414') {
      deviceModel = 'iPhone 8 Plus / 7 Plus';
    } else {
      deviceModel = 'Apple iPhone';
    }
  } else if (osName === 'iPadOS' || ua.includes('iPad')) {
    deviceBrand = 'Apple';
    deviceModel = 'Apple iPad Pro / Air';
  } else if (osName === 'macOS') {
    deviceBrand = 'Apple';
    if (gpu.includes('apple') || gpu.includes('m1') || gpu.includes('m2') || gpu.includes('m3') || gpu.includes('m4')) {
      deviceModel = 'MacBook (Apple Silicon M-Series)';
    } else {
      deviceModel = 'Mac (Intel Processor)';
    }
  } else if (hw.clientHintModel) {
    // Direct Client Hint Model (Chrome / Android)
    const m = hw.clientHintModel;
    if (/sm-s928/i.test(m)) { deviceBrand = 'Samsung'; deviceModel = 'Galaxy S24 Ultra'; }
    else if (/sm-s918/i.test(m)) { deviceBrand = 'Samsung'; deviceModel = 'Galaxy S23 Ultra'; }
    else if (/sm-s911/i.test(m)) { deviceBrand = 'Samsung'; deviceModel = 'Galaxy S23 5G'; }
    else if (/sm-a546/i.test(m)) { deviceBrand = 'Samsung'; deviceModel = 'Galaxy A54 5G'; }
    else if (/sm-a536/i.test(m)) { deviceBrand = 'Samsung'; deviceModel = 'Galaxy A53 5G'; }
    else if (/sm-f946/i.test(m)) { deviceBrand = 'Samsung'; deviceModel = 'Galaxy Z Fold 5'; }
    else if (/pixel 8/i.test(m)) { deviceBrand = 'Google'; deviceModel = 'Pixel 8 / 8 Pro'; }
    else if (/pixel 7/i.test(m)) { deviceBrand = 'Google'; deviceModel = 'Pixel 7 / 7a'; }
    else {
      deviceBrand = m.startsWith('SM-') || m.startsWith('GT-') ? 'Samsung' : 'Android Cihaz';
      deviceModel = m;
    }
  } else if (uaLower.includes('samsung') || uaLower.includes('sm-') || uaLower.includes('gt-')) {
    deviceBrand = 'Samsung';
    const modelMatch = ua.match(/SM-([A-Z0-9]+)/i);
    deviceModel = modelMatch ? `Galaxy (SM-${modelMatch[1]})` : 'Samsung Galaxy';
  } else if (uaLower.includes('xiaomi') || uaLower.includes('redmi') || uaLower.includes('poco') || uaLower.includes('2201') || uaLower.includes('2304')) {
    deviceBrand = 'Xiaomi';
    if (uaLower.includes('redmi')) deviceModel = 'Redmi Series';
    else if (uaLower.includes('poco')) deviceModel = 'POCO Series';
    else deviceModel = 'Xiaomi Mi Series';
  } else if (uaLower.includes('huawei') || uaLower.includes('honor')) {
    deviceBrand = uaLower.includes('honor') ? 'Honor' : 'Huawei';
    deviceModel = `${deviceBrand} Smartphone`;
  } else if (uaLower.includes('pixel')) {
    deviceBrand = 'Google';
    const match = ua.match(/Pixel (\d+[a-zA-Z\s]*)/i);
    deviceModel = match ? `Google Pixel ${match[1].trim()}` : 'Google Pixel';
  } else if (uaLower.includes('oneplus')) {
    deviceBrand = 'OnePlus';
    deviceModel = 'OnePlus Smartphone';
  } else if (uaLower.includes('oppo')) {
    deviceBrand = 'OPPO';
    deviceModel = 'OPPO Smartphone';
  } else if (uaLower.includes('vivo')) {
    deviceBrand = 'Vivo';
    deviceModel = 'Vivo Smartphone';
  } else if (uaLower.includes('realme')) {
    deviceBrand = 'Realme';
    deviceModel = 'Realme Smartphone';
  } else if (osName === 'Windows') {
    deviceBrand = 'PC / Masaüstü';
    if (gpu.includes('nvidia')) deviceModel = 'Windows PC (NVIDIA Grafikleri)';
    else if (gpu.includes('amd') || gpu.includes('radeon')) deviceModel = 'Windows PC (AMD Radeon)';
    else if (gpu.includes('intel')) deviceModel = 'Windows PC (Intel HD/Iris Graphics)';
    else deviceModel = 'Windows Computer';
  }

  // 3. Browser Detection
  if (ua.includes('Edg/')) {
    browserName = 'Microsoft Edge';
    const m = ua.match(/Edg\/(\d+[\.\d]+)/);
    if (m) browserVersion = m[1];
  } else if (ua.includes('OPR/') || ua.includes('Opera')) {
    browserName = 'Opera';
    const m = ua.match(/(?:OPR|Opera)\/(\d+[\.\d]+)/);
    if (m) browserVersion = m[1];
  } else if (ua.includes('SamsungBrowser')) {
    browserName = 'Samsung Internet';
    const m = ua.match(/SamsungBrowser\/(\d+[\.\d]+)/);
    if (m) browserVersion = m[1];
  } else if (ua.includes('Chrome') && !ua.includes('Chromium')) {
    browserName = 'Google Chrome';
    const m = ua.match(/Chrome\/(\d+[\.\d]+)/);
    if (m) browserVersion = m[1];
  } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
    browserName = 'Safari';
    const m = ua.match(/Version\/(\d+[\.\d]+)/);
    if (m) browserVersion = m[1];
  } else if (ua.includes('Firefox')) {
    browserName = 'Mozilla Firefox';
    const m = ua.match(/Firefox\/(\d+[\.\d]+)/);
    if (m) browserVersion = m[1];
  }

  return {
    deviceType,
    deviceBrand,
    deviceModel,
    osName,
    osVersion,
    browserName,
    browserVersion,
  };
}

// Format Turkish ISP & Operator with High Precision
function formatTurkishOperator(isp: string, org: string, asn: string, isMobileFlag: boolean): { ispName: string; isMobile: boolean } {
  const text = `${isp} ${org} ${asn}`.toLowerCase();
  let isMobile = isMobileFlag;

  if (text.includes('turkcell') || text.includes('cellular') || text.includes('as24888') || text.includes('as16135')) {
    if (text.includes('superonline') || text.includes('fiber') || text.includes('sol')) {
      return { ispName: 'Turkcell Superonline (Fiber Ev/İş)', isMobile: false };
    }
    return { ispName: 'Turkcell Mobil (4G/5G)', isMobile: true };
  }

  if (text.includes('vodafone') || text.includes('as15897') || text.includes('as34984')) {
    if (text.includes('net') || text.includes('dsl') || text.includes('sabit')) {
      return { ispName: 'Vodafone Net (Ev İnterneti)', isMobile: false };
    }
    return { ispName: 'Vodafone Mobil (4G/5G)', isMobile: true };
  }

  if (text.includes('turk telekom') || text.includes('ttnet') || text.includes('avea') || text.includes('as9121') || text.includes('as47524')) {
    if (text.includes('avea') || text.includes('mobil') || isMobile) {
      return { ispName: 'Türk Telekom Mobil (4G/5G)', isMobile: true };
    }
    return { ispName: 'Türk Telekom (TTNET Ev/İş)', isMobile: false };
  }

  if (text.includes('turknet') || text.includes('as12735')) return { ispName: 'TurkNet İletişim', isMobile: false };
  if (text.includes('gibir') || text.includes('gibirnet')) return { ispName: 'GıbırNet', isMobile: false };
  if (text.includes('millenicom') || text.includes('as42910')) return { ispName: 'Millenicom', isMobile: false };
  if (text.includes('kablonet') || text.includes('turksat') || text.includes('as15424')) return { ispName: 'Türksat Kablonet', isMobile: false };
  if (text.includes('netgsm')) return { ispName: 'Netgsm Mobil', isMobile: true };

  return { ispName: isp || org || 'Diğer / Bilinmiyor', isMobile };
}

export async function POST(request: Request) {
  try {
    const body: ClientHardwareInfo & { userAgent?: string; pagePath?: string; referrer?: string; language?: string } = await request.json().catch(() => ({}));
    
    // Extract IP address from request headers
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const cfIp = request.headers.get('x-cf-connecting-ip');
    
    let rawIp = cfIp || forwarded?.split(',')[0].trim() || realIp || '127.0.0.1';
    if (rawIp.includes('::ffff:')) {
      rawIp = rawIp.replace('::ffff:', '');
    }

    const userAgent = request.headers.get('user-agent') || body.userAgent || '';
    const pagePath = body.pagePath || '/';
    const referrer = body.referrer || request.headers.get('referer') || 'Direkt Giriş';
    const screenResolution = body.screenResolution || '';
    const language = body.language || request.headers.get('accept-language')?.split(',')[0] || '';

    // Parse Device Details with Hardware Footprinting
    const devInfo = parseDeviceDetails(userAgent, body);

    // Multi-Provider Waterfall IP Geolocation Lookup
    let country = 'Türkiye';
    let countryCode = 'TR';
    let city = 'Bilinmiyor';
    let region = 'Bilinmiyor';
    let isp = 'Bilinmiyor';
    let isMobileNetwork = body.isMobileConnection || devInfo.deviceType === 'Mobile';

    const cleanIp = (rawIp === '127.0.0.1' || rawIp === '::1' || rawIp === 'localhost') ? '' : rawIp;

    // Provider 1: ipapi.co (Highly accurate for Turkish carriers and location)
    let fetchedGeo = false;
    try {
      const geoUrl = cleanIp ? `https://ipapi.co/${cleanIp}/json/` : 'https://ipapi.co/json/';
      const geoRes = await fetch(geoUrl, { signal: AbortSignal.timeout(3000) });
      if (geoRes.ok) {
        const data = await geoRes.json();
        if (data && !data.error) {
          country = data.country_name || country;
          countryCode = data.country_code || countryCode;
          city = data.city || city;
          region = data.region || region;
          if (data.ip) rawIp = data.ip;

          const rawIsp = data.org || data.isp || data.asn || '';
          const isMobileHint = data.carrier || body.isMobileConnection || devInfo.deviceType === 'Mobile';
          const formatted = formatTurkishOperator(rawIsp, data.asn || '', data.isp || '', isMobileHint);
          isp = formatted.ispName;
          isMobileNetwork = formatted.isMobile;
          fetchedGeo = true;
        }
      }
    } catch (e) {
      // Fallthrough to Provider 2
    }

    // Provider 2: ipwho.is (Fallback)
    if (!fetchedGeo) {
      try {
        const geoRes = await fetch(`https://ipwho.is/${cleanIp}`, { signal: AbortSignal.timeout(3000) });
        if (geoRes.ok) {
          const data = await geoRes.json();
          if (data && data.success) {
            country = data.country || country;
            countryCode = data.country_code || countryCode;
            city = data.city || city;
            region = data.region || region;
            if (data.ip) rawIp = data.ip;

            const rawIsp = data.connection?.isp || data.connection?.org || '';
            const formatted = formatTurkishOperator(rawIsp, data.connection?.domain || '', data.connection?.asn || '', data.connection?.type === 'mobile');
            isp = formatted.ispName;
            isMobileNetwork = formatted.isMobile;
            fetchedGeo = true;
          }
        }
      } catch (e) {
        // Fallback to default
      }
    }

    const newLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ip_address: rawIp,
      ipAddress: rawIp,
      country,
      country_code: countryCode,
      countryCode,
      city,
      region,
      isp,
      is_mobile_network: isMobileNetwork,
      isMobileNetwork,
      device_type: devInfo.deviceType,
      deviceType: devInfo.deviceType,
      device_brand: devInfo.deviceBrand,
      deviceBrand: devInfo.deviceBrand,
      device_model: devInfo.deviceModel,
      deviceModel: devInfo.deviceModel,
      os_name: devInfo.osName,
      osName: devInfo.osName,
      os_version: devInfo.osVersion,
      osVersion: devInfo.osVersion,
      browser_name: devInfo.browserName,
      browserName: devInfo.browserName,
      browser_version: devInfo.browserVersion,
      browserVersion: devInfo.browserVersion,
      screen_resolution: screenResolution,
      screenResolution,
      language,
      page_path: pagePath,
      pagePath,
      referrer,
      user_agent: userAgent,
      userAgent,
      created_at: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      gpuRenderer: body.gpuRenderer || '',
    };

    // Save to Supabase if configured
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('visitor_logs').insert({
          ip_address: newLog.ip_address,
          country: newLog.country,
          country_code: newLog.country_code,
          city: newLog.city,
          region: newLog.region,
          isp: newLog.isp,
          is_mobile_network: newLog.is_mobile_network,
          device_type: newLog.device_type,
          device_brand: newLog.device_brand,
          device_model: newLog.device_model,
          os_name: newLog.os_name,
          os_version: newLog.os_version,
          browser_name: newLog.browser_name,
          browser_version: newLog.browser_version,
          screen_resolution: newLog.screen_resolution,
          language: newLog.language,
          page_path: newLog.page_path,
          referrer: newLog.referrer,
          user_agent: newLog.user_agent,
        });
      } catch (err) {
        console.warn('Failed to insert log into Supabase:', err);
      }
    }

    // Always maintain local fallback store
    const existing = getStoredLogs();
    saveLogs([newLog, ...existing]);

    return NextResponse.json({ success: true, log: newLog });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
