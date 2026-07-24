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
  inMemoryVisitorLogs = logs.slice(0, 500); // keep max 500 items
  try {
    fs.writeFileSync(TMP_LOGS_PATH, JSON.stringify(inMemoryVisitorLogs), 'utf-8');
  } catch (e) {
    console.error('Failed to write tmp visitor logs:', e);
  }
}

// User Agent Parser for Device Brand, Model, OS, and Browser
function parseUserAgent(ua: string) {
  let deviceType: 'Mobile' | 'Tablet' | 'Desktop' = 'Desktop';
  let deviceBrand = 'Bilinmiyor';
  let deviceModel = 'Bilinmiyor';
  let osName = 'Bilinmiyor';
  let osVersion = '';
  let browserName = 'Bilinmiyor';
  let browserVersion = '';

  const uaLower = ua.toLowerCase();

  // 1. Device Category
  if (/ipad|tablet|playbook|silk/i.test(ua)) {
    deviceType = 'Tablet';
  } else if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile|webos/i.test(ua)) {
    deviceType = 'Mobile';
  } else {
    deviceType = 'Desktop';
  }

  // OS Detection
  if (ua.includes('iPhone') || ua.includes('iPad') || ua.includes('iPod')) {
    osName = ua.includes('iPad') ? 'iPadOS' : 'iOS';
    const match = ua.match(/OS (\d+[_.\d]+)/);
    if (match) osVersion = match[1].replace(/_/g, '.');
  } else if (ua.includes('Android')) {
    osName = 'Android';
    const match = ua.match(/Android (\d+[_.\d]+)/);
    if (match) osVersion = match[1];
  } else if (ua.includes('Mac OS X')) {
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
  } else if (ua.includes('CrOS')) {
    osName = 'ChromeOS';
  }

  // 2. Device Brand & Model Detection
  if (ua.includes('iPhone')) {
    deviceBrand = 'Apple';
    if (ua.includes('iPhone15,') || uaLower.includes('iphone 15')) deviceModel = 'iPhone 15 Series';
    else if (ua.includes('iPhone14,') || uaLower.includes('iphone 14')) deviceModel = 'iPhone 14 Series';
    else if (ua.includes('iPhone13,') || uaLower.includes('iphone 13')) deviceModel = 'iPhone 13 Series';
    else if (ua.includes('iPhone12,') || uaLower.includes('iphone 12')) deviceModel = 'iPhone 12 Series';
    else if (ua.includes('iPhone11,') || uaLower.includes('iphone 11')) deviceModel = 'iPhone 11 Series';
    else deviceModel = 'Apple iPhone';
  } else if (ua.includes('iPad')) {
    deviceBrand = 'Apple';
    deviceModel = 'Apple iPad';
  } else if (osName === 'macOS') {
    deviceBrand = 'Apple';
    deviceModel = 'Mac (MacBook / iMac)';
  } else if (uaLower.includes('samsung') || uaLower.includes('sm-') || uaLower.includes('gt-')) {
    deviceBrand = 'Samsung';
    const modelMatch = ua.match(/SM-([A-Z0-9]+)/i);
    deviceModel = modelMatch ? `Galaxy (${modelMatch[0]})` : 'Samsung Galaxy';
  } else if (uaLower.includes('xiaomi') || uaLower.includes('redmi') || uaLower.includes('poco') || uaLower.includes('2201') || uaLower.includes('2304')) {
    deviceBrand = 'Xiaomi';
    if (uaLower.includes('redmi')) deviceModel = 'Redmi Series';
    else if (uaLower.includes('poco')) deviceModel = 'POCO Series';
    else deviceModel = 'Xiaomi Mi Series';
  } else if (uaLower.includes('huawei') || uaLower.includes('honor')) {
    deviceBrand = uaLower.includes('honor') ? 'Honor' : 'Huawei';
    deviceModel = `${deviceBrand} Mobile`;
  } else if (uaLower.includes('pixel')) {
    deviceBrand = 'Google';
    const match = ua.match(/Pixel (\d+[a-zA-Z\s]*)/i);
    deviceModel = match ? `Google Pixel ${match[1].trim()}` : 'Google Pixel';
  } else if (uaLower.includes('oneplus')) {
    deviceBrand = 'OnePlus';
    deviceModel = 'OnePlus Device';
  } else if (uaLower.includes('oppo')) {
    deviceBrand = 'OPPO';
    deviceModel = 'OPPO Mobile';
  } else if (uaLower.includes('vivo')) {
    deviceBrand = 'Vivo';
    deviceModel = 'Vivo Mobile';
  } else if (uaLower.includes('realme')) {
    deviceBrand = 'Realme';
    deviceModel = 'Realme Mobile';
  } else if (uaLower.includes('sony')) {
    deviceBrand = 'Sony';
    deviceModel = 'Sony Xperia';
  } else if (osName === 'Windows') {
    deviceBrand = 'PC / Masaüstü';
    deviceModel = 'Windows Computer';
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

// Clean ISP / Carrier names for user clarity
function formatOperatorName(isp: string, org: string, isMobile: boolean): { ispName: string; isMobile: boolean } {
  const text = `${isp} ${org}`.toLowerCase();
  let mobileFlag = isMobile;

  if (text.includes('turkcell') || text.includes('cellular')) {
    mobileFlag = true;
    if (text.includes('superonline')) return { ispName: 'Turkcell Superonline', isMobile: false };
    return { ispName: 'Turkcell Mobil', isMobile: true };
  }
  if (text.includes('vodafone')) {
    mobileFlag = true;
    if (text.includes('net') || text.includes('dsl')) return { ispName: 'Vodafone Net Ev İnterneti', isMobile: false };
    return { ispName: 'Vodafone Mobil', isMobile: true };
  }
  if (text.includes('turk telekom') || text.includes('ttnet') || text.includes('avea')) {
    if (text.includes('avea') || text.includes('mobil') || isMobile) return { ispName: 'Türk Telekom Mobil', isMobile: true };
    return { ispName: 'Türk Telekom (Ev/İş İnterneti)', isMobile: false };
  }
  if (text.includes('turknet')) return { ispName: 'TurkNet', isMobile: false };
  if (text.includes('gibir')) return { ispName: 'GıbırNet', isMobile: false };
  if (text.includes('millenicom')) return { ispName: 'Millenicom', isMobile: false };
  if (text.includes('kablonet') || text.includes('turksat')) return { ispName: 'Türksat Kablonet', isMobile: false };

  return { ispName: isp || org || 'Diğer / Bilinmiyor', isMobile: mobileFlag };
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    
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

    // Parse User Agent
    const uaInfo = parseUserAgent(userAgent);

    // Fetch Geolocation & ISP over HTTPS (ipwho.is)
    let country = 'Türkiye';
    let countryCode = 'TR';
    let city = 'Bilinmiyor';
    let region = 'Bilinmiyor';
    let isp = 'Bilinmiyor';
    let isMobileNetwork = uaInfo.deviceType === 'Mobile';

    const cleanIp = (rawIp === '127.0.0.1' || rawIp === '::1' || rawIp === 'localhost') ? '' : rawIp;

    try {
      // Use HTTPS geo endpoint to avoid mixed-content / SSL failures on Vercel
      const geoRes = await fetch(`https://ipwho.is/${cleanIp}`, {
        signal: AbortSignal.timeout(3500),
      });

      if (geoRes.ok) {
        const geoData = await geoRes.json();
        if (geoData.success) {
          country = geoData.country || country;
          countryCode = geoData.country_code || countryCode;
          city = geoData.city || city;
          region = geoData.region || region;
          if (geoData.ip) rawIp = geoData.ip;

          const rawIsp = geoData.connection?.isp || geoData.connection?.org || '';
          const formattedOp = formatOperatorName(rawIsp, geoData.connection?.domain || '', geoData.connection?.type === 'mobile');
          isp = formattedOp.ispName;
          isMobileNetwork = formattedOp.isMobile;
        }
      }
    } catch (e) {
      console.warn('Geo IP lookup warning (HTTPS fallback used):', e);
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
      device_type: uaInfo.deviceType,
      deviceType: uaInfo.deviceType,
      device_brand: uaInfo.deviceBrand,
      deviceBrand: uaInfo.deviceBrand,
      device_model: uaInfo.deviceModel,
      deviceModel: uaInfo.deviceModel,
      os_name: uaInfo.osName,
      osName: uaInfo.osName,
      os_version: uaInfo.osVersion,
      osVersion: uaInfo.osVersion,
      browser_name: uaInfo.browserName,
      browserName: uaInfo.browserName,
      browser_version: uaInfo.browserVersion,
      browserVersion: uaInfo.browserVersion,
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
