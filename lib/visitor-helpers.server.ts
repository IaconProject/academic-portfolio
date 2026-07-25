import { UAParser } from 'ua-parser-js';

export interface GeoLocationResult {
  country: string;
  countryCode: string;
  city: string;
  region: string;
  isp: string;
  isMobileNetwork: boolean;
  lat: number;
  lon: number;
}

export function getClientIp(request: Request): string {
  const headers = request.headers;
  const forwardedFor = headers.get('x-forwarded-for');
  const realIp = headers.get('x-real-ip');
  const cfIp = headers.get('cf-connecting-ip');

  let ip = cfIp || (forwardedFor ? forwardedFor.split(',')[0].trim() : realIp) || '127.0.0.1';

  // Strip IPv4-mapped IPv6 prefix
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }

  // Localhost dev fallback for geo lookup
  if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return '176.234.0.1'; // Fallback Turkish IP for local dev geo testing
  }

  return ip;
}

export function formatTurkishCarrier(ispName: string, orgName: string = ''): { isp: string; isMobileNetwork: boolean } {
  const full = `${ispName} ${orgName}`.toLowerCase();

  if (full.includes('turkcell') || full.includes('superonline')) {
    if (full.includes('gsm') || full.includes('mobile') || full.includes('iletisim') || full.includes('3g') || full.includes('4g') || full.includes('5g')) {
      return { isp: 'Turkcell Mobil (4G/5G)', isMobileNetwork: true };
    }
    return { isp: 'Turkcell Superonline', isMobileNetwork: false };
  }

  if (full.includes('vodafone')) {
    if (full.includes('net') || full.includes('fiber')) {
      return { isp: 'Vodafone Net Fiber', isMobileNetwork: false };
    }
    return { isp: 'Vodafone Mobil (4G/5G)', isMobileNetwork: true };
  }

  if (full.includes('turk telekom') || full.includes('ttnet') || full.includes('avea')) {
    if (full.includes('avea') || full.includes('mobil') || full.includes('gsm')) {
      return { isp: 'Türk Telekom Mobil', isMobileNetwork: true };
    }
    return { isp: 'Türk Telekom (TTNET)', isMobileNetwork: false };
  }

  if (full.includes('turknet')) {
    return { isp: 'TurkNet Fiber', isMobileNetwork: false };
  }

  if (full.includes('kablonet') || full.includes('turksat')) {
    return { isp: 'Türksat Kablonet', isMobileNetwork: false };
  }

  const isMobile = Boolean(
    full.includes('mobile') || full.includes('cellular') || full.includes('gsm') || full.includes('lte')
  );

  return { isp: ispName || 'Bilinmeyen Servis Sağlayıcı', isMobileNetwork: isMobile };
}

export async function lookupGeo(ip: string): Promise<GeoLocationResult> {
  const defaultGeo: GeoLocationResult = {
    country: 'Türkiye',
    countryCode: 'TR',
    city: 'Eskişehir',
    region: 'İç Anadolu',
    isp: 'Türk Telekom',
    isMobileNetwork: false,
    lat: 39.7767,
    lon: 30.5206,
  };

  // Primary: ipapi.co (HTTPS)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`https://ipapi.co/${ip}/json/`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'AcademicPortfolioVisitorEngine/2.0' },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && !data.error && data.city) {
        const carrierInfo = formatTurkishCarrier(data.org || data.asn || data.network || '', data.isp || '');
        return {
          country: data.country_name || 'Türkiye',
          countryCode: data.country_code || 'TR',
          city: data.city || 'Bilinmiyor',
          region: data.region || 'Bilinmiyor',
          isp: carrierInfo.isp,
          isMobileNetwork: carrierInfo.isMobileNetwork,
          lat: typeof data.latitude === 'number' ? data.latitude : 39.7767,
          lon: typeof data.longitude === 'number' ? data.longitude : 30.5206,
        };
      }
    }
  } catch (e) {}

  // Secondary: ipwho.is (HTTPS)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`https://ipwho.is/${ip}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.success) {
        const carrierInfo = formatTurkishCarrier(data.connection?.isp || data.connection?.org || '', data.connection?.domain || '');
        return {
          country: data.country || 'Türkiye',
          countryCode: data.country_code || 'TR',
          city: data.city || 'Bilinmiyor',
          region: data.region || 'Bilinmiyor',
          isp: carrierInfo.isp,
          isMobileNetwork: carrierInfo.isMobileNetwork,
          lat: typeof data.latitude === 'number' ? data.latitude : 39.7767,
          lon: typeof data.longitude === 'number' ? data.longitude : 30.5206,
        };
      }
    }
  } catch (e) {}

  return defaultGeo;
}

export function parseDeviceAndBrowser(userAgent: string, gpuRenderer?: string, screenRes?: string) {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  let osName = result.os.name || 'Bilinmiyor';
  let osVersion = result.os.version || '';
  let browserName = result.browser.name || 'Bilinmiyor';
  let browserVersion = result.browser.version || '';
  let deviceType: 'Desktop' | 'Mobile' | 'Tablet' = 'Desktop';
  let deviceBrand = result.device.vendor || '';
  let deviceModel = result.device.model || '';

  const uaLower = userAgent.toLowerCase();

  // Determine Device Type
  if (result.device.type === 'mobile' || uaLower.includes('iphone') || uaLower.includes('android') && uaLower.includes('mobile')) {
    deviceType = 'Mobile';
  } else if (result.device.type === 'tablet' || uaLower.includes('ipad') || (uaLower.includes('android') && !uaLower.includes('mobile'))) {
    deviceType = 'Tablet';
  }

  // Refine Apple iPhones
  if (uaLower.includes('iphone') || (osName === 'iOS' && deviceType === 'Mobile')) {
    deviceBrand = 'Apple';
    osName = 'iOS';

    if (screenRes) {
      if (screenRes.includes('430x932') || screenRes.includes('932x430')) {
        deviceModel = 'iPhone 15 Pro Max / 14 Pro Max';
      } else if (screenRes.includes('393x852') || screenRes.includes('852x393')) {
        deviceModel = 'iPhone 15 / 15 Pro / 14 Pro';
      } else if (screenRes.includes('390x844') || screenRes.includes('844x390')) {
        deviceModel = 'iPhone 14 / 13 / 12';
      } else if (screenRes.includes('414x896') || screenRes.includes('896x414')) {
        deviceModel = 'iPhone 11 / XR / XS Max';
      } else if (screenRes.includes('375x812') || screenRes.includes('812x375')) {
        deviceModel = 'iPhone 11 Pro / XS / X';
      } else {
        deviceModel = 'iPhone (iOS)';
      }
    } else {
      deviceModel = 'iPhone';
    }
  }

  // Refine Android Models
  if (uaLower.includes('android')) {
    osName = 'Android';
    if (!deviceBrand) {
      if (uaLower.includes('samsung') || uaLower.includes('sm-')) {
        deviceBrand = 'Samsung';
        if (uaLower.includes('sm-s928') || uaLower.includes('sm-s918')) deviceModel = 'Galaxy S24 / S23 Ultra';
        else if (uaLower.includes('sm-a546')) deviceModel = 'Galaxy A54 5G';
        else deviceModel = 'Galaxy Serisi';
      } else if (uaLower.includes('xiaomi') || uaLower.includes('redmi') || uaLower.includes('poco')) {
        deviceBrand = 'Xiaomi';
        deviceModel = uaLower.includes('redmi') ? 'Redmi Serisi' : 'Xiaomi Phone';
      } else if (uaLower.includes('huawei')) {
        deviceBrand = 'Huawei';
        deviceModel = 'Huawei Mobile';
      } else if (uaLower.includes('pixel')) {
        deviceBrand = 'Google';
        deviceModel = 'Pixel Phone';
      } else {
        deviceBrand = 'Android Cihaz';
        deviceModel = 'Akıllı Telefon';
      }
    }
  }

  // Refine Mac / Windows Desktop
  if (deviceType === 'Desktop') {
    if (uaLower.includes('macintosh') || uaLower.includes('mac os')) {
      deviceBrand = 'Apple';
      deviceModel = gpuRenderer && gpuRenderer.toLowerCase().includes('apple') ? 'MacBook (Apple Silicon M-Series)' : 'MacBook / Mac';
      osName = 'macOS';
    } else if (uaLower.includes('windows')) {
      deviceBrand = 'PC / Workstation';
      deviceModel = 'Windows PC';
      osName = 'Windows';
    } else if (uaLower.includes('linux')) {
      deviceBrand = 'PC / Workstation';
      deviceModel = 'Linux Workstation';
      osName = 'Linux';
    }
  }

  return {
    osName,
    osVersion,
    browserName,
    browserVersion,
    deviceType,
    deviceBrand: deviceBrand || (deviceType === 'Desktop' ? 'PC / Mac' : 'Akıllı Cihaz'),
    deviceModel: deviceModel || deviceType,
  };
}
