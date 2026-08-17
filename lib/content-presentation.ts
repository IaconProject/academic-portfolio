import type { ContentStatus } from './types';

export interface PresentableContent {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  coverImageUrl?: string;
  coverImageAlt?: string;
  publishedAt?: string;
  updatedAt?: string;
  year?: string;
  isFeatured?: boolean;
  sortOrder?: number;
  status?: ContentStatus;
  detailStatus?: ContentStatus;
}

function dateWeight(item: PresentableContent): number {
  const direct = item.publishedAt || item.updatedAt;
  if (direct) {
    const parsed = new Date(direct).getTime();
    if (Number.isFinite(parsed)) return parsed;
  }
  const year = Number.parseInt(item.year || '', 10);
  return Number.isFinite(year) ? Date.UTC(year, 0, 1) : 0;
}

export function sortArchiveContent<T extends PresentableContent>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const featured = Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured));
    if (featured) return featured;
    const order = (a.sortOrder || 0) - (b.sortOrder || 0);
    if (order) return order;
    const date = dateWeight(b) - dateWeight(a);
    if (date) return date;
    return (a.title || '').localeCompare(b.title || '', 'tr');
  });
}

export function estimateReadingMinutes(content?: string): number {
  const words = (content || '')
    .replace(/[#>*_`~\[\]()!-]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function toDateTimeLocalValue(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function fromDateTimeLocalValue(value: string): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : '';
}

export interface ContentReadiness {
  score: number;
  issues: string[];
}

export function contentReadiness(item: PresentableContent): ContentReadiness {
  const shortRecord = item.detailStatus === 'none';
  const checks = [
    { ok: (item.title || '').trim().length >= 3, message: 'Başlık en az 3 karakter olmalı.' },
    { ok: Boolean((item.slug || '').trim()), message: 'Kalıcı bir URL kısa adı olmalı.' },
    { ok: shortRecord || (item.excerpt || '').trim().length >= 40, message: 'Özet en az 40 karakter olmalı.' },
    { ok: shortRecord || (item.content || '').trim().length >= 100, message: 'Ana içerik en az 100 karakter olmalı.' },
    { ok: !item.coverImageUrl || Boolean((item.coverImageAlt || '').trim()), message: 'Kapak görselinin alt metni eksik.' },
    {
      ok:
        (item.status || item.detailStatus) !== 'scheduled' ||
        Boolean(item.publishedAt),
      message: 'Zamanlanmış içerik için yayın tarihi gerekli.',
    },
  ];
  const passed = checks.filter((check) => check.ok).length;
  return {
    score: Math.round((passed / checks.length) * 100),
    issues: checks.filter((check) => !check.ok).map((check) => check.message),
  };
}
