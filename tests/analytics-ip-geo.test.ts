import { describe, expect, it } from 'vitest';
import {
  buildIpApiUrl,
  isPublicAnalyticsIp,
  mergeAnalyticsIpGeo,
  parseIpApiResolution,
} from '../lib/analytics-ip-geo';

const sirnakResponse = {
  status: 'success',
  country: 'Turkey',
  countryCode: 'TR',
  region: '73',
  regionName: 'Şırnak',
  city: 'Cizre',
  lat: 37.33,
  lon: 42.19,
  isp: 'Turkcell Superonline',
  org: 'Turkcell Iletisim Hizmetleri A.S.',
  as: 'AS16135 Turkcell Iletisim Hizmetleri A.S.',
  mobile: true,
  proxy: false,
  hosting: false,
  query: '8.8.8.8',
};

describe('Analytics IP konum çözümleme', () => {
  it('yalnız genel yönlendirilebilir IP adreslerini sağlayıcıya kabul eder', () => {
    expect(isPublicAnalyticsIp('8.8.8.8')).toBe(true);
    expect(isPublicAnalyticsIp('2001:4860:4860::8888')).toBe(true);
    expect(isPublicAnalyticsIp('10.0.0.1')).toBe(false);
    expect(isPublicAnalyticsIp('192.168.1.1')).toBe(false);
    expect(isPublicAnalyticsIp('203.0.113.10')).toBe(false);
    expect(isPublicAnalyticsIp('2001:db8::1')).toBe(false);
    expect(isPublicAnalyticsIp('geçersiz')).toBe(false);
  });

  it('anahtarsız kullanımda free HTTP, anahtarlı kullanımda Pro HTTPS URL üretir', () => {
    const freeUrl = new URL(buildIpApiUrl('8.8.8.8'));
    expect(freeUrl.protocol).toBe('http:');
    expect(freeUrl.hostname).toBe('ip-api.com');
    expect(freeUrl.searchParams.get('fields')).toContain('regionName');
    expect(freeUrl.searchParams.has('key')).toBe(false);

    const proUrl = new URL(buildIpApiUrl('8.8.8.8', 'secret-key'));
    expect(proUrl.protocol).toBe('https:');
    expect(proUrl.hostname).toBe('pro.ip-api.com');
    expect(proUrl.searchParams.get('key')).toBe('secret-key');
  });

  it('sağlayıcı yanıtını il, ISP ve ASN allowlistine indirger', () => {
    const result = parseIpApiResolution(sirnakResponse);
    expect(result).toEqual({
      countryCode: 'TR',
      countryName: 'Türkiye',
      region: 'Şırnak',
      city: 'Cizre',
      ispName: 'Turkcell Superonline',
      networkOrganization: 'Turkcell Iletisim Hizmetleri A.S.',
      asn: 'AS16135',
      isMobileNetwork: true,
      isProxy: false,
      isHosting: false,
      confidence: 'medium',
    });
    expect(result).not.toHaveProperty('query');
    expect(result).not.toHaveProperty('lat');
    expect(result).not.toHaveProperty('lon');
  });

  it('ip-api il sinyalini Vercel ülke sinyaliyle birleştirir', () => {
    const resolution = parseIpApiResolution(sirnakResponse);
    expect(resolution).not.toBeNull();
    const merged = mergeAnalyticsIpGeo(
      {
        country_code: 'TR',
        country_name: 'Türkiye',
        region: 'İstanbul',
        city: 'Istanbul',
        geo_source: 'vercel-edge',
        geo_confidence: 'medium',
      },
      resolution!
    );
    expect(merged.region).toBe('Şırnak');
    expect(merged.city).toBe('Cizre');
    expect(merged.geo_source).toBe('vercel-edge+ip-api');
    expect(merged.isp_name).toBe('Turkcell Superonline');
    expect(merged.asn).toBe('AS16135');
  });

  it('ülke çelişkisinde Vercel coğrafyasını korur fakat ağ sınıfını saklar', () => {
    const resolution = parseIpApiResolution({
      ...sirnakResponse,
      country: 'Germany',
      countryCode: 'DE',
      regionName: 'Hesse',
      city: 'Frankfurt am Main',
    });
    expect(resolution).not.toBeNull();
    const merged = mergeAnalyticsIpGeo(
      {
        country_code: 'TR',
        country_name: 'Türkiye',
        region: 'Şırnak',
        geo_source: 'vercel-edge',
        geo_confidence: 'medium',
      },
      resolution!
    );
    expect(merged.country_code).toBe('TR');
    expect(merged.region).toBe('Şırnak');
    expect(merged.geo_source).toBe('vercel-edge');
    expect(merged.asn).toBe('AS16135');
  });

  it('başarısız veya biçimsiz sağlayıcı yanıtını kabul etmez', () => {
    expect(
      parseIpApiResolution({ status: 'fail', message: 'private range' })
    ).toBeNull();
    expect(
      parseIpApiResolution({ status: 'success', countryCode: 'TUR' })
    ).toBeNull();
  });
});
