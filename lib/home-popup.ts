import type { HomePopupSettings } from './types';

export const DEFAULT_HOME_POPUP_SETTINGS: HomePopupSettings = {
  enabled: false,
  eyebrow: 'DUYURU',
  title: 'Yeni bir duyuru',
  message: 'Ziyaretçilerinizle paylaşmak istediğiniz kısa bir mesaj ekleyin.',
  imageUrl: '',
  buttonLabel: 'Daha fazla bilgi',
  buttonUrl: '',
  delaySeconds: 2,
  frequency: 'session',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown, fallback: string, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : fallback;
}

function safeUrl(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return '';
  const candidate = value.trim();
  if (candidate.startsWith('/') && !candidate.startsWith('//')) return candidate.slice(0, 500);
  try {
    const url = new URL(candidate);
    return ['https:', 'http:'].includes(url.protocol) ? candidate.slice(0, 500) : '';
  } catch {
    return '';
  }
}

export function normalizeHomePopupSettings(value: unknown): HomePopupSettings {
  if (!isRecord(value)) return { ...DEFAULT_HOME_POPUP_SETTINGS };
  const delay = Number(value.delaySeconds);
  return {
    enabled: value.enabled === true,
    eyebrow: text(value.eyebrow, DEFAULT_HOME_POPUP_SETTINGS.eyebrow, 60),
    title: text(value.title, DEFAULT_HOME_POPUP_SETTINGS.title, 120),
    message: text(value.message, DEFAULT_HOME_POPUP_SETTINGS.message, 600),
    imageUrl: safeUrl(value.imageUrl),
    buttonLabel: text(value.buttonLabel, DEFAULT_HOME_POPUP_SETTINGS.buttonLabel, 60),
    buttonUrl: safeUrl(value.buttonUrl),
    delaySeconds: Number.isFinite(delay) ? Math.min(30, Math.max(0, Math.round(delay))) : DEFAULT_HOME_POPUP_SETTINGS.delaySeconds,
    frequency: value.frequency === 'always' ? 'always' : 'session',
  };
}
