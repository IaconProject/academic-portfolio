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
  landingPath: '/',
  exitPath: '/yazilar',
  source: 'google',
  medium: 'organic',
  campaign: null,
  referrerDomain: 'google.com',
  countryCode: 'TR',
  countryName: 'Türkiye',
  region: null,
  city: 'İstanbul',
  deviceType: 'desktop',
  browser: 'Chrome',
  operatingSystem: 'macOS',
  consentVersion: '2026-07-30',
  journey: [
    {
      occurredAt: '2026-07-29T10:00:00.000Z',
      path: '/',
      title: 'Ana Sayfa',
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
      journeyTruncated: true,
      journey: [{ path: '/', title: 'Ana Sayfa' }],
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
      p_snapshot_to: firstRpcParameters.p_snapshot_to,
    });
  });

  it('cursor başka filtreyle kullanılırsa veritabanına gitmeden 400 üretir', async () => {
    reportingMocks.rpc.mockResolvedValueOnce({
      data: {
        items: [sessionItem],
        hasMore: true,
        nextCursor: {
          at: '2026-07-29T09:55:00.000Z',
          key: 'b'.repeat(32),
        },
      },
      error: null,
    });

    const firstPage = await getAnalyticsSessions(baseQuery);

    await expect(
      getAnalyticsSessions({
        ...baseQuery,
        path: '/yazilar',
        cursor: firstPage.nextCursor!,
      })
    ).rejects.toMatchObject({
      code: 'ANALYTICS_CURSOR_QUERY_MISMATCH',
      status: 400,
    });
    expect(reportingMocks.rpc).toHaveBeenCalledTimes(1);
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
