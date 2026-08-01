import { describe, expect, it } from 'vitest';
import {
  buildLegacyStats,
  mapLegacyLogRow,
  mapLegacySessionRow,
  parseLegacyRecordId,
} from '../lib/legacy-analytics';

describe('legacy analytics compatibility', () => {
  it('maps historical visitor_logs rows to a one-step session', () => {
    const session = mapLegacyLogRow({
      id: '57a5dc84-ef61-49db-8762-7680766fcf4f',
      ip_address: '203.0.113.55',
      country: 'Türkiye',
      country_code: 'TR',
      city: 'İstanbul',
      device_type: 'Mobile',
      page_path: '/yayinlar',
      created_at: '2026-07-25T11:14:41.974Z',
    });

    expect(session.id).toBe(
      'visitor_logs:57a5dc84-ef61-49db-8762-7680766fcf4f'
    );
    expect(session.legacySource).toBe('visitor_logs');
    expect(session.ip).toBe('203.0.x.x');
    expect(session.userAgent).toBe('');
    expect(session.pages).toEqual([
      {
        path: '/yayinlar',
        title: 'Tarihî sayfa görüntüleme',
        timestamp: '2026-07-25T11:14:41.974Z',
      },
    ]);
  });

  it('maps visitor_sessions while withholding raw network metadata', () => {
    const session = mapLegacySessionRow({
      id: 'session-row',
      session_id: 'client-session',
      ip: '2001:db8:abcd:12::1',
      user_agent: 'raw user agent must not leave the server',
      device_type: 'Desktop',
      pages: [{ path: '/', title: 'Ana sayfa', timestamp: '2026-07-25T10:00:00Z' }],
      created_at: '2026-07-25T10:00:00Z',
      updated_at: '2026-07-25T10:01:00Z',
    });

    expect(session.id).toBe('visitor_sessions:session-row');
    expect(session.legacySourceId).toBe('session-row');
    expect(session.ip).toBe('2001:db8:abcd::');
    expect(session.userAgent).toBe('');
  });

  it('parses source-aware ids and supports old session ids', () => {
    expect(parseLegacyRecordId('visitor_logs:log-id')).toEqual({
      source: 'visitor_logs',
      sourceId: 'log-id',
    });
    expect(parseLegacyRecordId('visitor_sessions:session-id')).toEqual({
      source: 'visitor_sessions',
      sourceId: 'session-id',
    });
    expect(parseLegacyRecordId('old-session-id')).toEqual({
      source: 'visitor_sessions',
      sourceId: 'old-session-id',
    });
    expect(parseLegacyRecordId('unknown:record')).toBeNull();
  });

  it('includes both generations in aggregate legacy stats', () => {
    const log = mapLegacyLogRow({
      id: 'log-id',
      page_path: '/yazilar',
      city: 'Ankara',
      country: 'Türkiye',
      device_type: 'Mobile',
      created_at: '2026-07-25T11:00:00Z',
    });
    const session = mapLegacySessionRow({
      id: 'session-id',
      device_type: 'Desktop',
      pages: [
        { path: '/', title: 'Ana sayfa', timestamp: '2026-07-25T10:00:00Z' },
        { path: '/projeler', title: 'Projeler', timestamp: '2026-07-25T10:01:00Z' },
      ],
      created_at: '2026-07-25T10:00:00Z',
      updated_at: '2026-07-25T10:01:00Z',
    });

    const stats = buildLegacyStats([log, session]);
    expect(stats.recordedLegacySessions).toBe(2);
    expect(stats.storedPageSteps).toBe(3);
    expect(stats.topPages).toEqual([
      { name: '/yazilar', count: 1 },
      { name: '/', count: 1 },
      { name: '/projeler', count: 1 },
    ]);
  });
});
