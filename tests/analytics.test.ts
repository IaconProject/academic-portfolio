import { afterEach, describe, expect, it } from 'vitest';
import {
  ANALYTICS_CONSENT_VERSION,
  ANALYTICS_FIRST_PARTY_VERSION,
  analyticsBatchSchema,
  applyClientTechnologyToAnalyticsContext,
  buildAnalyticsRequestContext,
  classifyObviousBot,
  getTransientRequestIp,
  groupAnalyticsEvents,
  getAnalyticsAuthorizationBasis,
  hashAnalyticsIdentifier,
  isAnalyticsTimestampAccepted,
  normalizeAnalyticsPath,
  toDatabaseAnalyticsEvent,
} from '../lib/analytics';
import {
  normalizeTurkeyProvinceRegion,
  resolveTurkeyNetworkProvince,
} from '../lib/analytics-turkey-geo';
import {
  getSafeAnalyticsDownload,
  normalizeAnalyticsCampaignValue,
  normalizeAnalyticsClientErrorName,
  normalizeAnalyticsNavigationType,
  normalizeAnalyticsOutboundHostname,
  normalizeAnalyticsWebVitalRating,
  normalizeAnalyticsWebVitalValue,
} from '../lib/analytics-contract';

const baseEvent = {
  eventId: '254ea163-9cd8-45fd-a184-67d47ce94d6a',
  visitorId: 'c914e94e-d3f3-4495-ad12-c0b5a6e9a803',
  sessionId: '7b87fa63-0709-49e3-b604-050956315b1e',
  tabId: 'dfd84189-bb4a-483a-93d2-d21ec5c8244d',
  sequence: 1,
  eventType: 'page_view' as const,
  occurredAt: new Date().toISOString(),
  path: '/yazilar/ornek',
  title: 'Örnek yazı',
  referrerDomain: 'google.com',
  screen: { bucket: 'lg' as const, width: 1440, height: 900 },
  language: 'tr-TR',
  timezone: 'Europe/Istanbul',
  consentVersion: ANALYTICS_CONSENT_VERSION,
};

afterEach(() => {
  delete process.env.ANALYTICS_HASH_SECRET;
  delete process.env.ADMIN_SESSION_SECRET;
  delete process.env.VERCEL;
});

describe('Analytics v2 event sözleşmesi', () => {
  it('açık rıza ve Türkiye birinci taraf işleme dayanaklarını ayırır', () => {
    expect(getAnalyticsAuthorizationBasis(ANALYTICS_CONSENT_VERSION)).toBe(
      'consent'
    );
    expect(getAnalyticsAuthorizationBasis(ANALYTICS_FIRST_PARTY_VERSION)).toBe(
      'first-party-analytics'
    );
    expect(getAnalyticsAuthorizationBasis('eski-politika')).toBeNull();
  });

  it('geçerli, küçük bir page_view batchini kabul eder', () => {
    const result = analyticsBatchSchema.safeParse({
      schemaVersion: 2,
      consentVersion: ANALYTICS_CONSENT_VERSION,
      events: [baseEvent],
    });
    expect(result.success).toBe(true);
  });

  it('batch ve event consent sürümü ayrışınca reddeder', () => {
    const result = analyticsBatchSchema.safeParse({
      schemaVersion: 2,
      consentVersion: 'future-policy',
      events: [baseEvent],
    });
    expect(result.success).toBe(false);
  });

  it('bilinmeyen alanları ve izin verilmeyen event tipini reddeder', () => {
    const result = analyticsBatchSchema.safeParse({
      schemaVersion: 2,
      consentVersion: ANALYTICS_CONSENT_VERSION,
      events: [{ ...baseEvent, eventType: 'session_replay', rawIp: '1.2.3.4' }],
    });
    expect(result.success).toBe(false);
  });

  it('faz 2 event tiplerini ayrıştırılmış sözleşmeyle kabul eder', () => {
    const events = [
      { ...baseEvent, eventType: 'heartbeat', durationMs: 30_000 },
      {
        ...baseEvent,
        eventType: 'engagement',
        durationMs: 12_500,
      },
      {
        ...baseEvent,
        eventType: 'consent_update',
        contentType: 'privacy_preference',
        contentKey: 'analytics_measurement',
      },
      {
        ...baseEvent,
        eventType: 'scroll_depth',
        contentType: 'page',
        contentKey: '/yazilar/ornek',
        scrollPercent: 90,
      },
      {
        ...baseEvent,
        eventType: 'outbound_click',
        contentType: 'outbound_host',
        contentKey: 'orcid.org',
      },
      {
        ...baseEvent,
        eventType: 'download',
        contentType: 'download',
        contentKey: '/dosyalar/makale.pdf',
        properties: { file_extension: 'pdf' },
      },
      {
        ...baseEvent,
        eventType: 'contact_submit',
        contentType: 'form',
        contentKey: 'contact_form',
      },
      {
        ...baseEvent,
        eventType: 'web_vital',
        contentType: 'web_vital',
        contentKey: 'LCP',
        durationMs: 2_450,
        properties: {
          metric_name: 'LCP',
          rating: 'good',
          navigation_type: 'navigate',
        },
      },
      {
        ...baseEvent,
        eventType: 'client_error',
        contentType: 'client_error',
        contentKey: 'window_error',
        properties: {
          error_name: 'TypeError',
          error_source: 'window_error',
        },
      },
    ].map((event, index) => ({
      ...event,
      eventId: `254ea163-9cd8-45fd-a184-${String(index + 1).padStart(12, '0')}`,
      sequence: index + 1,
    }));

    const result = analyticsBatchSchema.safeParse({
      schemaVersion: 2,
      consentVersion: ANALYTICS_CONSENT_VERSION,
      events,
    });
    expect(result.success).toBe(true);
  });

  it('event türüne ait olmayan alanları ve hassas özellikleri reddeder', () => {
    const unsafeEvents = [
      {
        ...baseEvent,
        eventType: 'outbound_click',
        contentType: 'outbound_host',
        contentKey: 'example.com/path?email=user@example.com',
      },
      {
        ...baseEvent,
        eventType: 'download',
        contentType: 'download',
        contentKey: '/dosyalar/makale.pdf?token=secret',
        properties: { file_extension: 'pdf' },
      },
      {
        ...baseEvent,
        eventType: 'web_vital',
        contentType: 'web_vital',
        contentKey: 'LCP',
        durationMs: 1234,
        properties: {
          metric_name: 'LCP',
          rating: 'good',
          navigation_type: 'navigate',
          page_url: 'https://example.com/private',
        },
      },
      {
        ...baseEvent,
        eventType: 'client_error',
        contentType: 'client_error',
        contentKey: 'window_error',
        properties: {
          error_name: 'TypeError',
          error_source: 'window_error',
          message: 'Kullanıcı verisi içeren hata mesajı',
          stack: 'private stack',
        },
      },
      {
        ...baseEvent,
        referrerDomain: 'https://example.com/private?email=user@example.com',
      },
      {
        ...baseEvent,
        utm: { campaign: 'user@example.com' },
      },
      {
        ...baseEvent,
        title: 'Özel rapor https://example.com/private',
      },
    ];

    unsafeEvents.forEach((event) => {
      expect(
        analyticsBatchSchema.safeParse({
          schemaVersion: 2,
          consentVersion: ANALYTICS_CONSENT_VERSION,
          events: [event],
        }).success
      ).toBe(false);
    });
  });

  it('scroll, süre ve web vital alanlarını güvenli sınırlarda tutar', () => {
    const invalidEvents = [
      { ...baseEvent, eventType: 'heartbeat', durationMs: 0 },
      {
        ...baseEvent,
        eventType: 'scroll_depth',
        contentType: 'page',
        contentKey: '/yazilar/ornek',
        scrollPercent: 42,
      },
      {
        ...baseEvent,
        eventType: 'web_vital',
        contentType: 'web_vital',
        contentKey: 'LCP',
        durationMs: 2000,
        properties: {
          metric_name: 'CLS',
          rating: 'good',
          navigation_type: 'navigate',
        },
      },
    ];

    invalidEvents.forEach((event) => {
      expect(
        analyticsBatchSchema.safeParse({
          schemaVersion: 2,
          consentVersion: ANALYTICS_CONSENT_VERSION,
          events: [event],
        }).success
      ).toBe(false);
    });
  });

  it('faz 2 alanlarını ingest RPC snake_case sözleşmesine kayıpsız eşler', () => {
    const parsed = analyticsBatchSchema.parse({
      schemaVersion: 2,
      consentVersion: ANALYTICS_CONSENT_VERSION,
      events: [
        {
          ...baseEvent,
          eventType: 'web_vital',
          contentType: 'web_vital',
          contentKey: 'CLS',
          durationMs: 123,
          properties: {
            metric_name: 'CLS',
            rating: 'needs-improvement',
            navigation_type: 'reload',
          },
        },
      ],
    });

    expect(toDatabaseAnalyticsEvent(parsed.events[0])).toMatchObject({
      event_type: 'web_vital',
      content_type: 'web_vital',
      content_key: 'CLS',
      duration_ms: 123,
      scroll_percent: null,
      properties: {
        metric_name: 'CLS',
        rating: 'needs-improvement',
        navigation_type: 'reload',
      },
    });
  });

  it('tarayıcı koordinatı alanını sözleşme dışında bırakır', () => {
    const result = analyticsBatchSchema.safeParse({
      schemaVersion: 2,
      consentVersion: ANALYTICS_FIRST_PARTY_VERSION,
      events: [
        {
          ...baseEvent,
          consentVersion: ANALYTICS_FIRST_PARTY_VERSION,
          geo: {
            source: 'browser-geolocation',
            latitude: 37.52,
            longitude: 42.46,
            accuracyMeters: 120,
          },
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});

describe('Analytics faz 2 gizlilik normalizasyonu', () => {
  it('outbound tıklamada yalnız harici hostname üretir', () => {
    const current = 'https://www.muhammedakan.com/yazilar?private=1';
    expect(
      normalizeAnalyticsOutboundHostname(
        'https://ORCID.org/0000-0000?token=secret#profile',
        current
      )
    ).toBe('orcid.org');
    expect(
      normalizeAnalyticsOutboundHostname('/projeler', current)
    ).toBeNull();
    expect(
      normalizeAnalyticsOutboundHostname('mailto:test@example.com', current)
    ).toBeNull();
  });

  it('download için query/hash olmadan allowlist path ve uzantı üretir', () => {
    const current = 'https://www.muhammedakan.com/yayinlar';
    expect(
      getSafeAnalyticsDownload(
        '/dosyalar/makale.PDF?download_token=secret#page=2',
        current
      )
    ).toEqual({
      path: '/dosyalar/makale.PDF',
      extension: 'pdf',
    });
    expect(
      getSafeAnalyticsDownload('/dosyalar/calistir.exe', current)
    ).toBeNull();
    expect(
      getSafeAnalyticsDownload('javascript:alert(1)', current)
    ).toBeNull();
    expect(
      getSafeAnalyticsDownload(
        'https://files.example.com/private/user-report.pdf?token=secret',
        current
      )
    ).toBeNull();
  });

  it('UTM etiketlerini faydalı ama kişisel veriden arındırılmış tutar', () => {
    expect(normalizeAnalyticsCampaignValue('yapay-zeka_2026')).toBe(
      'yapay-zeka_2026'
    );
    expect(normalizeAnalyticsCampaignValue('İslami Finans / Yaz')).toBe(
      'İslami Finans / Yaz'
    );
    expect(
      normalizeAnalyticsCampaignValue('user@example.com')
    ).toBeNull();
    expect(
      normalizeAnalyticsCampaignValue('https://example.com/campaign')
    ).toBeNull();
    expect(normalizeAnalyticsCampaignValue('telefon 905551234567')).toBeNull();
  });

  it('web vital değerlerini sonlu ve bounded sayıya dönüştürür', () => {
    expect(normalizeAnalyticsWebVitalValue('LCP', 2450.4)).toBe(2450);
    expect(normalizeAnalyticsWebVitalValue('CLS', 0.1234)).toBe(123);
    expect(normalizeAnalyticsWebVitalValue('INP', 999_999)).toBe(300_000);
    expect(normalizeAnalyticsWebVitalValue('FID', 20)).toBeNull();
    expect(normalizeAnalyticsWebVitalValue('LCP', Number.NaN)).toBeNull();
    expect(normalizeAnalyticsWebVitalValue('LCP', -1)).toBeNull();
  });

  it('rating, navigation ve hata adlarını kapalı sınıflara indirger', () => {
    expect(normalizeAnalyticsWebVitalRating('poor')).toBe('poor');
    expect(normalizeAnalyticsWebVitalRating('custom')).toBe('unknown');
    expect(normalizeAnalyticsNavigationType('reload')).toBe('reload');
    expect(normalizeAnalyticsNavigationType('private-route')).toBe('unknown');
    expect(normalizeAnalyticsClientErrorName('TypeError')).toBe('TypeError');
    expect(normalizeAnalyticsClientErrorName('User email leaked')).toBe(
      'UnknownError'
    );
    expect(
      normalizeAnalyticsClientErrorName(undefined, true)
    ).toBe('NonErrorRejection');
  });
});

describe('Analytics URL ve zaman normalizasyonu', () => {
  it('query ve hash değerlerini page path dışında bırakır', () => {
    expect(normalizeAnalyticsPath('/yazilar/ornek?utm_source=x#ozet')).toBe(
      '/yazilar/ornek'
    );
  });

  it('admin, API ve protokol-relative yolları reddeder', () => {
    expect(normalizeAnalyticsPath('/admin')).toBeNull();
    expect(normalizeAnalyticsPath('/ADMIN/seo')).toBeNull();
    expect(normalizeAnalyticsPath('/%61dmin/seo')).toBeNull();
    expect(normalizeAnalyticsPath('/api/cms')).toBeNull();
    expect(normalizeAnalyticsPath('//example.com/path')).toBeNull();
    expect(normalizeAnalyticsPath('/\\example.com/path')).toBeNull();
    expect(normalizeAnalyticsPath('/apiary')).toBe('/apiary');
  });

  it('yakın geçmişi kabul edip aşırı eski/gelecek zamanı reddeder', () => {
    const now = Date.now();
    expect(isAnalyticsTimestampAccepted(new Date(now - 1_000).toISOString(), now)).toBe(true);
    expect(
      isAnalyticsTimestampAccepted(
        new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString(),
        now
      )
    ).toBe(false);
    expect(
      isAnalyticsTimestampAccepted(
        new Date(now + 10 * 60 * 1000).toISOString(),
        now
      )
    ).toBe(false);
  });
});

describe('Analytics pseudonimleştirme ve sınıflama', () => {
  it('visitor kimliğini kararlı, amaç ayrımlı HMAC ile dönüştürür', () => {
    process.env.ANALYTICS_HASH_SECRET =
      'test-only-analytics-secret-at-least-32-bytes';
    const first = hashAnalyticsIdentifier(baseEvent.visitorId, 'visitor');
    const second = hashAnalyticsIdentifier(baseEvent.visitorId, 'visitor');
    const rate = hashAnalyticsIdentifier(baseEvent.visitorId, 'rate-limit');
    expect(first).toBe(second);
    expect(first).not.toBe(rate);
    expect(first).toHaveLength(64);
  });

  it('kısa veya eksik HMAC anahtarıyla kimlik üretmez', () => {
    process.env.ANALYTICS_HASH_SECRET = 'too-short';
    expect(() =>
      hashAnalyticsIdentifier(baseEvent.visitorId, 'visitor')
    ).toThrow('ANALYTICS_HASH_SECRET_NOT_CONFIGURED');
  });

  it('açık bot user agentlerini insan trafiğine dahil etmez', () => {
    expect(classifyObviousBot('Googlebot/2.1')).toBe('verified_bot');
    expect(classifyObviousBot('curl/8.0')).toBe('verified_bot');
    expect(
      classifyObviousBot(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 Chrome/126 Safari/537.36'
      )
    ).toBe('human');
  });

  it('raw User-Agent saklamadan kaba cihaz ve güvenilir edge geo bağlamı üretir', () => {
    process.env.VERCEL = '1';
    const request = new Request('https://www.muhammedakan.com/yazilar', {
      headers: {
        'user-agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1',
        'x-vercel-ip-country': 'TR',
        'x-vercel-ip-country-region': '26',
        'x-vercel-ip-city': 'Eski%C5%9Fehir',
      },
    });
    const context = buildAnalyticsRequestContext(request);

    expect(context).toMatchObject({
      country_code: 'TR',
      region: 'Eskişehir',
      city: 'Eskişehir',
      geo_source: 'vercel-edge',
      geo_confidence: 'medium',
      device_type: 'mobile',
      browser_name: 'Mobile Safari',
      browser_version: '17.5',
      os_name: 'iOS',
      os_version: '17.5',
      device_brand: 'Apple',
      device_model: 'iPhone',
    });
    expect(JSON.stringify(context)).not.toContain('user-agent');
    expect(JSON.stringify(context)).not.toContain('Mozilla');
  });

  it('Türkiye ISO il kodlarını adlara dönüştürür', () => {
    expect(normalizeTurkeyProvinceRegion('73')).toBe('Şırnak');
    expect(normalizeTurkeyProvinceRegion('TR-73')).toBe('Şırnak');
    expect(normalizeTurkeyProvinceRegion('sirnak')).toBe('Şırnak');
    expect(normalizeTurkeyProvinceRegion('Marmara')).toBeNull();
  });

  it('bölge/şehir yoksa IP ağ merkez noktasını yalnız il düzeyine indirger', () => {
    process.env.VERCEL = '1';
    const request = new Request('https://www.muhammedakan.com/', {
      headers: {
        'x-vercel-ip-country': 'TR',
        'x-vercel-ip-latitude': '37.52',
        'x-vercel-ip-longitude': '42.46',
      },
    });

    expect(resolveTurkeyNetworkProvince(37.52, 42.46)).toMatchObject({
      province: 'Şırnak',
    });
    expect(buildAnalyticsRequestContext(request)).toMatchObject({
      country_code: 'TR',
      country_name: 'Türkiye',
      region: 'Şırnak',
      geo_source: 'vercel-edge',
      geo_confidence: 'low',
    });
    expect(buildAnalyticsRequestContext(request)).not.toHaveProperty('city');
    expect(JSON.stringify(buildAnalyticsRequestContext(request))).not.toContain(
      '42.46'
    );
  });

  it('il sinyali yoksa yanlış il üretmeden yalnız ülkeyi düşük güvenle tutar', () => {
    process.env.VERCEL = '1';
    const request = new Request('https://www.muhammedakan.com/', {
      headers: { 'x-vercel-ip-country': 'TR' },
    });

    expect(buildAnalyticsRequestContext(request)).toMatchObject({
      country_code: 'TR',
      country_name: 'Türkiye',
      geo_source: 'vercel-edge',
      geo_confidence: 'low',
    });
    expect(buildAnalyticsRequestContext(request)).not.toHaveProperty('region');
    expect(buildAnalyticsRequestContext(request)).not.toHaveProperty('city');
  });

  it('izinli Client Hints alanlarıyla cihaz ve sürüm bilgisini zenginleştirir', () => {
    expect(
      applyClientTechnologyToAnalyticsContext(
        {
          device_type: 'mobile',
          browser_name: 'Chrome',
          os_name: 'Android',
        },
        {
          platform: 'Android',
          platformVersion: '15.0.0',
          deviceModel: 'Pixel 9 Pro',
          browserName: 'Google Chrome',
          browserVersion: '127.0.6533.88',
          mobile: true,
        }
      )
    ).toMatchObject({
      device_type: 'mobile',
      device_model: 'Pixel 9 Pro',
      browser_name: 'Google Chrome',
      browser_version: '127.0.6533.88',
      os_name: 'Android',
      os_version: '15.0.0',
    });
  });

  it('UA parser boşluklarını ham User-Agent saklamadan güvenli cihaz ayrıntılarıyla tamamlar', () => {
    const request = new Request('https://www.muhammedakan.com/', {
      headers: {
        'user-agent':
          'Mozilla/5.0 (Linux; Android 14; SM-S928B Build/UP1A.231005.007) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36',
      },
    });
    const context = buildAnalyticsRequestContext(request);
    expect(context).toMatchObject({
      device_type: 'mobile',
      device_brand: 'Samsung',
      device_model: 'SM-S928B',
      os_name: 'Android',
    });
    expect(JSON.stringify(context)).not.toContain('Mozilla');
  });

  it('rate-limit IP değerinde yalnız Vercel güven sınırını kullanır', () => {
    const spoofed = new Request('https://www.muhammedakan.com', {
      headers: {
        'x-forwarded-for': '203.0.113.50',
        'x-real-ip': '203.0.113.51',
      },
    });
    expect(getTransientRequestIp(spoofed)).toBe('');

    process.env.VERCEL = '1';
    const trusted = new Request('https://www.muhammedakan.com', {
      headers: {
        'x-vercel-forwarded-for': '198.51.100.12, 10.0.0.1',
        'x-forwarded-for': '203.0.113.50',
      },
    });
    expect(getTransientRequestIp(trusted)).toBe('198.51.100.12');

    const documentedFallback = new Request(
      'https://www.muhammedakan.com',
      { headers: { 'x-forwarded-for': '192.0.2.25, 10.0.0.1' } }
    );
    expect(getTransientRequestIp(documentedFallback)).toBe('192.0.2.25');
  });

  it('offline kuyruktaki eventleri visitor ve client sessiona göre gruplar', () => {
    const groups = groupAnalyticsEvents([
      baseEvent,
      {
        ...baseEvent,
        eventId: '2cc7f67b-c291-4fa7-8863-50a8faf00461',
        sequence: 2,
      },
      {
        ...baseEvent,
        eventId: '3b6a1fe2-18e0-47c4-b1fd-614d105874e5',
        sessionId: '3ae9f1e6-86b8-4942-8ab0-2f5a295a8ee4',
      },
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0].events).toHaveLength(2);
    expect(groups[1].events).toHaveLength(1);
  });
});
