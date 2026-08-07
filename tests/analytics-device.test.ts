import { describe, expect, it } from 'vitest';
import { refineAnalyticsDeviceDetails } from '../lib/analytics-device';

describe('Analytics cihaz ayrıntılandırma', () => {
  it('Android model kodundan muhafazakâr marka ve model çıkarır', () => {
    expect(
      refineAnalyticsDeviceDetails({
        userAgent:
          'Mozilla/5.0 (Linux; Android 14; SM-S928B Build/UP1A.231005.007) AppleWebKit/537.36 Mobile Safari/537.36',
        osName: 'Android',
      })
    ).toEqual({ brand: 'Samsung', model: 'SM-S928B' });
  });

  it('Windows işletim sistemini yanlış biçimde donanım markası saymaz', () => {
    expect(
      refineAnalyticsDeviceDetails({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        osName: 'Windows',
      })
    ).toEqual({ brand: null, model: 'Windows PC' });
  });

  it('Apple cihaz ailesini model uydurmadan tamamlar', () => {
    expect(
      refineAnalyticsDeviceDetails({
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) AppleWebKit/605.1.15',
        osName: 'macOS',
      })
    ).toEqual({ brand: 'Apple', model: 'Mac' });
  });
});
