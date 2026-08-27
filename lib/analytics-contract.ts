/**
 * Analytics constants shared by the browser and the trusted collector.
 * Updating the consent policy version here forces both sides to move together.
 */
export const ANALYTICS_SCHEMA_VERSION = 2 as const;
export const ANALYTICS_COLLECTOR_VERSION = '2.7.0';
export const ANALYTICS_CONSENT_POLICY_VERSION = '2026-08-02.1';
export const ANALYTICS_MAX_BATCH_EVENTS = 20;
export const ANALYTICS_SESSION_TIMEOUT_MS = 30 * 60 * 1000;
export const ANALYTICS_RUNTIME_DISABLED_EVENT =
  'analytics-runtime-disabled';
export const ANALYTICS_TRACK_EVENT = 'analytics-track-v2';

export const ANALYTICS_SCROLL_THRESHOLDS = [
  25,
  50,
  75,
  90,
  100,
] as const;
export type AnalyticsScrollThreshold =
  (typeof ANALYTICS_SCROLL_THRESHOLDS)[number];

export const ANALYTICS_WEB_VITAL_NAMES = [
  'LCP',
  'CLS',
  'INP',
  'FCP',
  'TTFB',
] as const;
export type AnalyticsWebVitalName =
  (typeof ANALYTICS_WEB_VITAL_NAMES)[number];

export const ANALYTICS_PROFILE_INTERACTION_KEYS = [
  'profile_photo_click',
  'profile_photo_double_click',
  'profile_photo_zoom',
  'profile_photo_open_new_tab',
  'profile_photo_save_intent',
] as const;
export type AnalyticsProfileInteractionKey =
  (typeof ANALYTICS_PROFILE_INTERACTION_KEYS)[number];

export const ANALYTICS_SCREEN_INTERACTION_KEYS = ['screen_zoom'] as const;
export type AnalyticsScreenInteractionKey =
  (typeof ANALYTICS_SCREEN_INTERACTION_KEYS)[number];

export const ANALYTICS_WEB_VITAL_RATINGS = [
  'good',
  'needs-improvement',
  'poor',
  'unknown',
] as const;
export type AnalyticsWebVitalRating =
  (typeof ANALYTICS_WEB_VITAL_RATINGS)[number];

export const ANALYTICS_NAVIGATION_TYPES = [
  'navigate',
  'reload',
  'back-forward',
  'back-forward-cache',
  'prerender',
  'restore',
  'unknown',
] as const;
export type AnalyticsNavigationType =
  (typeof ANALYTICS_NAVIGATION_TYPES)[number];

export const ANALYTICS_CLIENT_ERROR_NAMES = [
  'Error',
  'TypeError',
  'RangeError',
  'ReferenceError',
  'SyntaxError',
  'URIError',
  'EvalError',
  'AggregateError',
  'NonErrorRejection',
  'UnknownError',
] as const;
export type AnalyticsClientErrorName =
  (typeof ANALYTICS_CLIENT_ERROR_NAMES)[number];

export type AnalyticsClientErrorSource =
  | 'window_error'
  | 'unhandled_rejection';

export const ANALYTICS_DOWNLOAD_EXTENSIONS = [
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'csv',
  'txt',
  'rtf',
  'epub',
  'zip',
] as const;
export type AnalyticsDownloadExtension =
  (typeof ANALYTICS_DOWNLOAD_EXTENSIONS)[number];

export type AnalyticsScreenBucket =
  | 'xs'
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'
  | '2xl'
  | 'unknown';

export type AnalyticsUtmProperties = Partial<
  Record<'source' | 'medium' | 'campaign' | 'term' | 'content', string>
>;

/**
 * Coarse, allowlisted client technology hints. No full User-Agent, hardware
 * identifier, architecture or other fingerprinting dimension is collected.
 */
export interface AnalyticsClientTechnology {
  platform?: string;
  platformVersion?: string;
  deviceModel?: string;
  browserName?: string;
  browserVersion?: string;
  mobile?: boolean;
}

const ANALYTICS_CAMPAIGN_VALUE_PATTERN =
  /^[A-Za-z0-9ÇĞİÖŞÜçğıöşüÂâÎîÛû][A-Za-z0-9ÇĞİÖŞÜçğıöşüÂâÎîÛû _./:+-]{0,99}$/;

/**
 * Campaign dimensions are deliberately narrower than arbitrary query values.
 * This keeps common UTM labels useful while dropping e-mail addresses, URLs,
 * query fragments, control characters and other likely personal/free-form data.
 */
export function normalizeAnalyticsCampaignValue(
  value: string | null | undefined
): string | null {
  const normalized = value?.replace(/\s+/g, ' ').trim() || '';
  if (
    !normalized ||
    !ANALYTICS_CAMPAIGN_VALUE_PATTERN.test(normalized) ||
    /(?:https?:\/\/|www\.|[A-Za-z0-9._%+-]+@)/i.test(normalized) ||
    /\d{7,}/.test(normalized)
  ) {
    return null;
  }
  return normalized;
}

export interface AnalyticsEventBase {
  eventId: string;
  visitorId: string;
  sessionId: string;
  tabId: string;
  sequence: number;
  occurredAt: string;
  path: string;
  title: string;
  referrerDomain?: string;
  screen: {
    bucket: AnalyticsScreenBucket;
    width: number;
    height: number;
  };
  language: string;
  timezone: string;
  consentVersion: string;
  utm?: AnalyticsUtmProperties;
  technology?: AnalyticsClientTechnology;
}

export type AnalyticsEventDetails =
  | { eventType: 'page_view' }
  | { eventType: 'heartbeat'; durationMs: number }
  | {
      eventType: 'engagement';
      durationMs: number;
      contentType?: 'profile_interaction' | 'screen_interaction';
      contentKey?:
        | AnalyticsProfileInteractionKey
        | AnalyticsScreenInteractionKey;
    }
  | {
      eventType: 'consent_update';
      contentType: 'privacy_preference';
      contentKey: 'analytics_measurement';
    }
  | {
      eventType: 'scroll_depth';
      contentType: 'page';
      contentKey: string;
      scrollPercent: AnalyticsScrollThreshold;
    }
  | {
      eventType: 'outbound_click';
      contentType: 'outbound_host';
      contentKey: string;
    }
  | {
      eventType: 'download';
      contentType: 'download';
      contentKey: string;
      properties: { file_extension: AnalyticsDownloadExtension };
    }
  | {
      eventType: 'contact_submit';
      contentType: 'form';
      contentKey: 'contact_form';
    }
  | {
      eventType: 'web_vital';
      contentType: 'web_vital';
      contentKey: AnalyticsWebVitalName;
      durationMs: number;
      properties: {
        metric_name: AnalyticsWebVitalName;
        rating: AnalyticsWebVitalRating;
        navigation_type: AnalyticsNavigationType;
      };
    }
  | {
      eventType: 'client_error';
      contentType: 'client_error';
      contentKey: AnalyticsClientErrorSource;
      properties: {
        error_name: AnalyticsClientErrorName;
        error_source: AnalyticsClientErrorSource;
      };
    };

export type AnalyticsClientEventContract =
  AnalyticsEventBase & AnalyticsEventDetails;

export type AnalyticsTrackEventDetail = Extract<
  AnalyticsEventDetails,
  { eventType: 'contact_submit' | 'engagement' }
>;

export function normalizeAnalyticsOutboundHostname(
  href: string,
  currentUrl: string
): string | null {
  try {
    const current = new URL(currentUrl);
    const target = new URL(href, current);
    if (!['http:', 'https:'].includes(target.protocol)) return null;

    const hostname = target.hostname
      .toLocaleLowerCase('en-US')
      .replace(/\.$/, '');
    if (
      !hostname ||
      target.origin === current.origin ||
      hostname.length > 200 ||
      /[^a-z0-9.-]/i.test(hostname) ||
      hostname.startsWith('.') ||
      hostname.includes('..')
    ) {
      return null;
    }
    return hostname;
  } catch {
    return null;
  }
}

export function getSafeAnalyticsDownload(
  href: string,
  currentUrl: string
): { path: string; extension: AnalyticsDownloadExtension } | null {
  try {
    const current = new URL(currentUrl);
    const target = new URL(href, current);
    if (
      !['http:', 'https:'].includes(target.protocol) ||
      target.origin !== current.origin
    ) {
      return null;
    }

    const path = target.pathname.replace(/\/{2,}/g, '/');
    if (
      !path.startsWith('/') ||
      path.startsWith('//') ||
      path.length > 200 ||
      /[\\\u0000-\u001F\u007F]/.test(path)
    ) {
      return null;
    }

    const extension = path
      .split('/')
      .pop()
      ?.split('.')
      .pop()
      ?.toLocaleLowerCase('en-US');
    if (
      !extension ||
      !ANALYTICS_DOWNLOAD_EXTENSIONS.includes(
        extension as AnalyticsDownloadExtension
      )
    ) {
      return null;
    }

    return {
      path,
      extension: extension as AnalyticsDownloadExtension,
    };
  } catch {
    return null;
  }
}

export function normalizeAnalyticsWebVitalValue(
  name: string,
  value: number
): number | null {
  if (
    !ANALYTICS_WEB_VITAL_NAMES.includes(
      name as AnalyticsWebVitalName
    ) ||
    !Number.isFinite(value) ||
    value < 0
  ) {
    return null;
  }

  // duration_ms is the bounded numeric metric storage in analytics v2.
  // CLS has no milliseconds unit, so it is stored in milli-CLS units.
  const normalized =
    name === 'CLS' ? Math.round(value * 1000) : Math.round(value);
  return Math.min(normalized, 300_000);
}

export function normalizeAnalyticsWebVitalRating(
  value: string | undefined
): AnalyticsWebVitalRating {
  return ANALYTICS_WEB_VITAL_RATINGS.includes(
    value as AnalyticsWebVitalRating
  )
    ? (value as AnalyticsWebVitalRating)
    : 'unknown';
}

export function normalizeAnalyticsNavigationType(
  value: string | undefined
): AnalyticsNavigationType {
  return ANALYTICS_NAVIGATION_TYPES.includes(
    value as AnalyticsNavigationType
  )
    ? (value as AnalyticsNavigationType)
    : 'unknown';
}

export function normalizeAnalyticsClientErrorName(
  value: string | undefined,
  isNonErrorRejection = false
): AnalyticsClientErrorName {
  if (
    ANALYTICS_CLIENT_ERROR_NAMES.includes(
      value as AnalyticsClientErrorName
    )
  ) {
    return value as AnalyticsClientErrorName;
  }
  return isNonErrorRejection ? 'NonErrorRejection' : 'UnknownError';
}
