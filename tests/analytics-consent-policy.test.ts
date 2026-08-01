import { describe, expect, it } from 'vitest';
import { ANALYTICS_CONSENT_POLICY_VERSION } from '../lib/analytics-contract';
import {
  analyticsAuthorizationBasisFromVersion,
  analyticsAuthorizationVersion,
  analyticsCollectionModeForCountry,
  analyticsCollectionModeForRequest,
  normalizeAnalyticsCountryCode,
  trustedAnalyticsCountryCode,
} from '../lib/analytics-consent-policy';

describe('Analytics bölgesel izin politikası', () => {
  it('yalnız Türkiye için dar kapsamlı birinci taraf modu seçer', () => {
    expect(analyticsCollectionModeForCountry('TR')).toBe(
      'first-party-analytics'
    );
    expect(analyticsCollectionModeForCountry('tr')).toBe(
      'first-party-analytics'
    );
    expect(analyticsCollectionModeForCountry('DE')).toBe(
      'consent-required'
    );
    expect(analyticsCollectionModeForCountry(null)).toBe(
      'consent-required'
    );
    expect(analyticsCollectionModeForCountry('')).toBe(
      'consent-required'
    );
  });

  it('geçersiz ülke kodlarını güvenli varsayılana düşürür', () => {
    expect(normalizeAnalyticsCountryCode('TUR')).toBeNull();
    expect(normalizeAnalyticsCountryCode('T1')).toBeNull();
    expect(normalizeAnalyticsCountryCode(' tr ')).toBe('TR');
  });

  it('geo başlığını yalnız Vercel sınırı güvenilirken kullanır', () => {
    const request = new Request('https://www.muhammedakan.com', {
      headers: { 'x-vercel-ip-country': 'TR' },
    });

    expect(trustedAnalyticsCountryCode(request, false)).toBeNull();
    expect(analyticsCollectionModeForRequest(request, false)).toBe(
      'consent-required'
    );
    expect(trustedAnalyticsCountryCode(request, true)).toBe('TR');
    expect(analyticsCollectionModeForRequest(request, true)).toBe(
      'first-party-analytics'
    );
  });

  it('veritabanında işleme dayanağını ayırt eden sürümler üretir', () => {
    const consentVersion = analyticsAuthorizationVersion(
      ANALYTICS_CONSENT_POLICY_VERSION,
      'consent'
    );
    const firstPartyVersion = analyticsAuthorizationVersion(
      ANALYTICS_CONSENT_POLICY_VERSION,
      'first-party-analytics'
    );

    expect(consentVersion).not.toBe(firstPartyVersion);
    expect(
      analyticsAuthorizationBasisFromVersion(
        consentVersion,
        ANALYTICS_CONSENT_POLICY_VERSION
      )
    ).toBe('consent');
    expect(
      analyticsAuthorizationBasisFromVersion(
        firstPartyVersion,
        ANALYTICS_CONSENT_POLICY_VERSION
      )
    ).toBe('first-party-analytics');
    expect(
      analyticsAuthorizationBasisFromVersion(
        '2020-01-01:first-party-analytics',
        ANALYTICS_CONSENT_POLICY_VERSION
      )
    ).toBeNull();
  });
});
