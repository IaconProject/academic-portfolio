import { describe, expect, it } from 'vitest';
import {
  buildVisitorLinkAnalyticsDashboard,
  VisitorLinkEventRow,
  VisitorLinkSessionRow,
} from '../lib/visitor-link-analytics-report';

const trackedSession: VisitorLinkSessionRow = {
  id: '11111111-1111-4111-8111-111111111111',
  visitor_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  traffic_class: 'human',
  referrer_domain: 'instagram.com',
  source: null,
  medium: null,
  campaign: null,
  country_code: 'TR',
  country_name: 'Türkiye',
  region: 'İstanbul',
  city: 'İstanbul',
  geo_source: 'vercel-edge',
  geo_confidence: 'medium',
  isp_name: 'Example Mobile',
  network_organization: null,
  asn: 'AS64500',
  is_mobile_network: true,
  is_proxy: false,
  is_hosting: false,
  device_type: 'mobile',
  device_brand: 'Apple',
  device_model: 'iPhone',
  browser_name: 'Mobile Safari',
  browser_version: '19',
  os_name: 'iOS',
  os_version: '19',
  consent_version: '2026-08-02.1:first-party-analytics',
};

const unrelatedSession: VisitorLinkSessionRow = {
  ...trackedSession,
  id: '22222222-2222-4222-8222-222222222222',
  visitor_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  referrer_domain: 'google.com',
  device_type: 'desktop',
};

function event(
  overrides: Partial<VisitorLinkEventRow>
): VisitorLinkEventRow {
  return {
    event_id: crypto.randomUUID(),
    visitor_id: trackedSession.visitor_id,
    session_id: trackedSession.id,
    event_type: 'page_view',
    occurred_at: '2026-08-27T10:00:00.000Z',
    received_at: '2026-08-27T10:00:01.000Z',
    path: '/7',
    screen_bucket: 'sm',
    duration_ms: null,
    content_type: null,
    content_key: null,
    properties: {},
    ...overrides,
  };
}

describe('/7 ziyaretçi raporu', () => {
  it('Google ve blog trafiğini dışarıda bırakıp yalnız /7 verisini toplar', () => {
    const report = buildVisitorLinkAnalyticsDashboard({
      range: {
        from: '2026-08-27T00:00:00.000Z',
        to: '2026-08-28T00:00:00.000Z',
        timezone: 'Europe/Istanbul',
      },
      sessions: [trackedSession, unrelatedSession],
      events: [
        event({}),
        event({
          event_type: 'engagement',
          duration_ms: 12_000,
        }),
        event({
          event_id: '33333333-3333-4333-8333-333333333333',
          visitor_id: unrelatedSession.visitor_id,
          session_id: unrelatedSession.id,
          path: '/blog/muhammed-akan-kimdir',
          occurred_at: '2026-08-27T11:00:00.000Z',
        }),
      ],
      health: {
        duplicate_events: 0,
        rejected_events: 0,
        last_success_at: '2026-08-27T10:00:01.000Z',
      },
    });

    expect(report.summary).toMatchObject({
      visitors: 1,
      sessions: 1,
      pageViews: 1,
      engagedSessions: 1,
    });
    expect(report.topPages).toEqual([
      expect.objectContaining({ path: '/7', pageViews: 1, sessions: 1 }),
    ]);
    expect(report.acquisition).toEqual([
      expect.objectContaining({ channel: 'Social', sessions: 1 }),
    ]);
    expect(report.geography.cities).toEqual([
      expect.objectContaining({ city: 'İstanbul', sessions: 1 }),
    ]);
    expect(report.events).toEqual(
      expect.arrayContaining([
        { eventType: 'page_view', count: 1 },
        { eventType: 'engagement', count: 1 },
      ])
    );
  });
});
