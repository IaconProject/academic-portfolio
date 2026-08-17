import { describe, expect, it } from 'vitest';
import {
  contentReadiness,
  estimateReadingMinutes,
  fromDateTimeLocalValue,
  sortArchiveContent,
} from '../lib/content-presentation';

describe('content presentation helpers', () => {
  it('orders featured items first, then editorial order and date', () => {
    const ordered = sortArchiveContent([
      { title: 'C', sortOrder: 2, publishedAt: '2026-01-01T00:00:00.000Z' },
      { title: 'A', isFeatured: true, sortOrder: 9 },
      { title: 'B', sortOrder: 1, publishedAt: '2025-01-01T00:00:00.000Z' },
    ]);
    expect(ordered.map((item) => item.title)).toEqual(['A', 'B', 'C']);
  });

  it('returns actionable readiness gaps', () => {
    const result = contentReadiness({
      title: 'Başlık',
      slug: 'baslik',
      excerpt: 'kısa',
      content: 'yetersiz',
      coverImageUrl: 'https://example.com/cover.jpg',
      status: 'scheduled',
    });
    expect(result.score).toBe(33);
    expect(result.issues).toContain('Kapak görselinin alt metni eksik.');
    expect(result.issues).toContain('Zamanlanmış içerik için yayın tarihi gerekli.');
  });

  it('estimates reading time with a one-minute floor', () => {
    expect(estimateReadingMinutes('Kısa metin')).toBe(1);
    expect(estimateReadingMinutes(Array.from({ length: 401 }, () => 'kelime').join(' '))).toBe(3);
  });

  it('converts a local date-time value to an ISO timestamp', () => {
    expect(fromDateTimeLocalValue('2026-08-18T12:30')).toMatch(/^2026-08-18T/);
    expect(fromDateTimeLocalValue('')).toBe('');
  });
});
