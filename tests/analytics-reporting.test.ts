import { beforeEach, describe, expect, it, vi } from 'vitest';

const reportingMocks = vi.hoisted(() => ({
  rpc: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('../lib/analytics', () => ({
  getAnalyticsHashSecret: () => 'r'.repeat(64),
}));
vi.mock('../lib/supabase/server', () => ({
  hasSupabaseServiceRole: true,
  serverSupabase: {
    rpc: reportingMocks.rpc,
  },
}));

import {
  deleteAnalyticsSessions,
  getAnalyticsSessions,
  parseAnalyticsSessionsQuery,
} from '../lib/analytics-reporting.server';

const baseQuery = {
  from: '2026-07-01T00:00:00.000Z',
  to: '2026-07-30T00:00:00.000Z',
  timezone: 'Europe/Istanbul',
  limit: 1,
  trafficClass: 'human' as const,
};

const sessionItem = {
  sessionRef: 's_0123456789abcdef',
  startedAt: '2026-07-29T10:00:00.000Z',
  lastActivityAt: '2026-07-29T10:02:00.000Z',
  durationSeconds: 120,
  trafficClass: 'human' as const,
  isEngaged: true,
  pageViews: 2,
  eventCount: 4,
  engagementSeconds: 30,
  maxScrollPercent: 90,
  conversions: 1,
  landingPath: '/7',
  exitPath: '/7',
  source: 'google',
  medium: 'organic',
  campaign: null,
  referrerDomain: 'google.com',
  countryCode: 'TR',
  countryName: 'Türkiye',
  region: null,
  city: 'İstanbul',
  geoSource: 'vercel-edge',
  geoConfidence: 'medium' as const,
  deviceType: 'desktop',
  deviceBrand: 'Apple',
  deviceModel: 'Mac',
  browser: 'Chrome',
  browserVersion: '127.0.0.0',
  operatingSystem: 'macOS',
  osVersion: '14.6',
  consentVersion: '2026-07-30',
  journey: [
    {
      occurredAt: '2026-07-29T10:00:00.000Z',
      path: '/7',
      title: 'Instagram biyografi bağlantısı',
    },
  ],
  journeyTruncated: true,
};

beforeEach(() => {
  reportingMocks.rpc.mockReset();
});

describe('Analytics reporting cursor sözleşmesi', () => {
  it('snapshot ve filtre parmak izini sonraki sayfaya taşır', async () => {
    reportingMocks.rpc
      .mockResolvedValueOnce({
        data: {
          items: [sessionItem],
          hasMore: true,
          nextCursor: {
            at: '2026-07-29T09:55:00.000Z',
            key: 'a'.repeat(32),
          },
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          items: [],
          hasMore: false,
          nextCursor: null,
        },
        error: null,
      });

    const firstPage = await getAnalyticsSessions(baseQuery);
    expect(firstPage.sessions[0]).toMatchObject({
      id: 's_0123456789abcdef',
      geoSource: 'vercel-edge',
      geoConfidence: 'medium',
      deviceBrand: 'Apple',
      browserVersion: '127.0.0.0',
      journeyTruncated: true,
      journey: [{ path: '/7', title: 'Instagram biyografi bağlantısı' }],
    });
    expect(firstPage.nextCursor).toBeTruthy();

    const encodedPayload = firstPage.nextCursor!.split('.')[0];
    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8')
    );
    expect(payload).toMatchObject({
      version: 2,
      key: 'a'.repeat(32),
    });
    expect(payload.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(payload.snapshotTo).toMatch(/Z$/);

    await getAnalyticsSessions({
      ...baseQuery,
      cursor: firstPage.nextCursor!,
    });

    const firstRpcParameters = reportingMocks.rpc.mock.calls[0][1];
    const secondRpcParameters = reportingMocks.rpc.mock.calls[1][1];
    expect(secondRpcParameters).toMatchObject({
      p_cursor_at: '2026-07-29T09:55:00.000Z',
      p_cursor_key: 'a'.repeat(32),
      p_path: '/7',
      p_snapshot_to: firstRpcParameters.p_snapshot_to,
    });
  });

  it('istemci başka filtre istese de oturum RPC kapsamını /7 olarak tutar', async () => {
    reportingMocks.rpc
      .mockResolvedValueOnce({
        data: {
          items: [sessionItem],
          hasMore: true,
          nextCursor: {
            at: '2026-07-29T09:55:00.000Z',
            key: 'b'.repeat(32),
          },
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { items: [], hasMore: false, nextCursor: null },
        error: null,
      });

    const firstPage = await getAnalyticsSessions(baseQuery);

    await getAnalyticsSessions({
      ...baseQuery,
      path: '/yazilar',
      cursor: firstPage.nextCursor!,
    });
    expect(reportingMocks.rpc).toHaveBeenCalledTimes(2);
    expect(reportingMocks.rpc.mock.calls[0][1].p_path).toBe('/7');
    expect(reportingMocks.rpc.mock.calls[1][1].p_path).toBe('/7');
  });

  it('değiştirilmiş cursor imzasını reddeder', async () => {
    await expect(
      getAnalyticsSessions({
        ...baseQuery,
        cursor: `${Buffer.from('{}').toString('base64url')}.invalid`,
      })
    ).rejects.toMatchObject({
      code: 'INVALID_ANALYTICS_CURSOR',
      status: 400,
    });
    expect(reportingMocks.rpc).not.toHaveBeenCalled();
  });
});

describe('Analytics reporting query doğrulaması', () => {
  it('range presetini kesin bir event penceresine dönüştürür', () => {
    const parsed = parseAnalyticsSessionsQuery(
      new Request(
        'https://example.test/api/analytics/sessions?range=30d&timezone=Europe%2FIstanbul'
      )
    );
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(Date.parse(parsed.data.to) - Date.parse(parsed.data.from)).toBe(
      30 * 24 * 60 * 60 * 1000
    );
  });
});

describe('Analytics admin silme sözleşmesi', () => {
  it('yalnız seçili pseudonymous oturum referanslarını RPCye yollar', async () => {
    reportingMocks.rpc.mockResolvedValueOnce({
      data: { requestedCount: 2, deletedCount: 2 },
      error: null,
    });

    await expect(
      deleteAnalyticsSessions([
        's_0123456789abcdef',
        's_fedcba9876543210',
      ])
    ).resolves.toEqual({ requestedCount: 2, deletedCount: 2 });
    expect(reportingMocks.rpc).toHaveBeenCalledWith(
      'delete_analytics_sessions',
      {
        p_session_refs: [
          's_0123456789abcdef',
          's_fedcba9876543210',
        ],
      }
    );
  });
});
