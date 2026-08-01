import { createHmac } from 'crypto';
import { UAParser } from 'ua-parser-js';
import { z } from 'zod';
import {
  ANALYTICS_CLIENT_ERROR_NAMES,
  ANALYTICS_CONSENT_POLICY_VERSION,
  ANALYTICS_DOWNLOAD_EXTENSIONS,
  ANALYTICS_MAX_BATCH_EVENTS,
  ANALYTICS_NAVIGATION_TYPES,
  ANALYTICS_SCHEMA_VERSION,
  ANALYTICS_SCROLL_THRESHOLDS,
  ANALYTICS_SESSION_TIMEOUT_MS,
  ANALYTICS_WEB_VITAL_NAMES,
  ANALYTICS_WEB_VITAL_RATINGS,
  normalizeAnalyticsCampaignValue,
} from './analytics-contract';
import {
  analyticsAuthorizationBasisFromVersion,
  analyticsAuthorizationVersion,
  AnalyticsAuthorizationBasis,
} from './analytics-consent-policy';

export {
  ANALYTICS_MAX_BATCH_EVENTS,
  ANALYTICS_SCHEMA_VERSION,
  ANALYTICS_SESSION_TIMEOUT_MS,
};
export const ANALYTICS_CONSENT_VERSION = analyticsAuthorizationVersion(
  ANALYTICS_CONSENT_POLICY_VERSION,
  'consent'
);
export const ANALYTICS_FIRST_PARTY_VERSION = analyticsAuthorizationVersion(
  ANALYTICS_CONSENT_POLICY_VERSION,
  'first-party-analytics'
);
export const ANALYTICS_MAX_BODY_BYTES = 32 * 1024;

export function getAnalyticsAuthorizationBasis(
  value: string
): AnalyticsAuthorizationBasis | null {
  return analyticsAuthorizationBasisFromVersion(
    value,
    ANALYTICS_CONSENT_POLICY_VERSION
  );
}

const shortText = (max: number) => z.string().trim().max(max);
const optionalCampaignValue = shortText(100)
  .refine(
    (value) => normalizeAnalyticsCampaignValue(value) === value,
    'Kampanya değeri güvenli bir etiket olmalıdır.'
  )
  .optional();
const hostnameSchema = (max: number) =>
  shortText(max).min(1).regex(
    /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?))*$/i,
    'Geçerli bir alan adı bekleniyor.'
  );
const publicTitleSchema = shortText(300).refine(
  (value) =>
    !/[\u0000-\u001F\u007F]/.test(value) &&
    !/(?:https?:\/\/|www\.|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.)/i.test(
      value
    ),
  'Sayfa başlığı URL, e-posta veya kontrol karakteri içeremez.'
);

const analyticsCommonEventFields = {
  eventId: z.string().uuid(),
  visitorId: z.string().uuid(),
  sessionId: z.string().uuid(),
  tabId: z.string().uuid(),
  sequence: z.number().int().nonnegative().max(1_000_000),
  occurredAt: z.string().datetime({ offset: true }),
  path: z.string().trim().min(1).max(512).startsWith('/'),
  title: publicTitleSchema.default(''),
  referrerDomain: hostnameSchema(253).optional(),
  screen: z
    .object({
      bucket: z.enum(['xs', 'sm', 'md', 'lg', 'xl', '2xl', 'unknown']),
      width: z.number().int().nonnegative().max(10_000),
      height: z.number().int().nonnegative().max(10_000),
    })
    .strict(),
  language: shortText(35).default(''),
  timezone: shortText(100).default(''),
  consentVersion: shortText(40),
  utm: z
    .object({
      source: optionalCampaignValue,
      medium: optionalCampaignValue,
      campaign: optionalCampaignValue,
      term: optionalCampaignValue,
      content: optionalCampaignValue,
    })
    .strict()
    .optional(),
};

const durationMsSchema = z.number().int().min(1).max(300_000);
const contentKeySchema = shortText(200).min(1);
const outboundHostnameSchema = hostnameSchema(200);
const internalContentPathSchema = contentKeySchema
  .startsWith('/')
  .refine(
    (value) =>
      !value.startsWith('//') &&
      !/[\\\u0000-\u001F\u007F?#]/.test(value),
    'İçerik anahtarı güvenli bir dahili path olmalıdır.'
  );

const pageViewEventSchema = z
  .object({
    ...analyticsCommonEventFields,
    eventType: z.literal('page_view'),
  })
  .strict();

const heartbeatEventSchema = z
  .object({
    ...analyticsCommonEventFields,
    eventType: z.literal('heartbeat'),
    durationMs: durationMsSchema,
  })
  .strict();

const engagementEventSchema = z
  .object({
    ...analyticsCommonEventFields,
    eventType: z.literal('engagement'),
    durationMs: durationMsSchema,
  })
  .strict();

const scrollDepthEventSchema = z
  .object({
    ...analyticsCommonEventFields,
    eventType: z.literal('scroll_depth'),
    contentType: z.literal('page'),
    contentKey: internalContentPathSchema,
    scrollPercent: z.union(
      ANALYTICS_SCROLL_THRESHOLDS.map((value) => z.literal(value))
    ),
  })
  .strict();

const outboundClickEventSchema = z
  .object({
    ...analyticsCommonEventFields,
    eventType: z.literal('outbound_click'),
    contentType: z.literal('outbound_host'),
    contentKey: outboundHostnameSchema,
  })
  .strict();

const downloadEventSchema = z
  .object({
    ...analyticsCommonEventFields,
    eventType: z.literal('download'),
    contentType: z.literal('download'),
    contentKey: internalContentPathSchema,
    properties: z
      .object({
        file_extension: z.enum(ANALYTICS_DOWNLOAD_EXTENSIONS),
      })
      .strict(),
  })
  .strict();

const contactSubmitEventSchema = z
  .object({
    ...analyticsCommonEventFields,
    eventType: z.literal('contact_submit'),
    contentType: z.literal('form'),
    contentKey: z.literal('contact_form'),
  })
  .strict();

const webVitalEventSchema = z
  .object({
    ...analyticsCommonEventFields,
    eventType: z.literal('web_vital'),
    contentType: z.literal('web_vital'),
    contentKey: z.enum(ANALYTICS_WEB_VITAL_NAMES),
    durationMs: z.number().int().nonnegative().max(300_000),
    properties: z
      .object({
        metric_name: z.enum(ANALYTICS_WEB_VITAL_NAMES),
        rating: z.enum(ANALYTICS_WEB_VITAL_RATINGS),
        navigation_type: z.enum(ANALYTICS_NAVIGATION_TYPES),
      })
      .strict(),
  })
  .strict()
  .refine(
    (event) => event.contentKey === event.properties.metric_name,
    {
      message: 'Web vital adı içerik anahtarıyla eşleşmelidir.',
      path: ['properties', 'metric_name'],
    }
  );

const clientErrorEventSchema = z
  .object({
    ...analyticsCommonEventFields,
    eventType: z.literal('client_error'),
    contentType: z.literal('client_error'),
    contentKey: z.enum([
      'window_error',
      'unhandled_rejection',
    ]),
    properties: z
      .object({
        error_name: z.enum(ANALYTICS_CLIENT_ERROR_NAMES),
        error_source: z.enum([
          'window_error',
          'unhandled_rejection',
        ]),
      })
      .strict(),
  })
  .strict()
  .refine(
    (event) => event.contentKey === event.properties.error_source,
    {
      message: 'İstemci hata kaynağı içerik anahtarıyla eşleşmelidir.',
      path: ['properties', 'error_source'],
    }
  );

export const analyticsEventSchema = z.discriminatedUnion('eventType', [
  pageViewEventSchema,
  heartbeatEventSchema,
  engagementEventSchema,
  scrollDepthEventSchema,
  outboundClickEventSchema,
  downloadEventSchema,
  contactSubmitEventSchema,
  webVitalEventSchema,
  clientErrorEventSchema,
]);

export const analyticsBatchSchema = z
  .object({
    schemaVersion: z.literal(ANALYTICS_SCHEMA_VERSION),
    consentVersion: shortText(40),
    events: z
      .array(analyticsEventSchema)
      .min(1)
      .max(ANALYTICS_MAX_BATCH_EVENTS),
  })
  .strict()
  .superRefine((batch, ctx) => {
    batch.events.forEach((event, index) => {
      if (event.consentVersion !== batch.consentVersion) {
        ctx.addIssue({
          code: 'custom',
          message: 'Event consent sürümü batch sürümüyle eşleşmelidir.',
          path: ['events', index, 'consentVersion'],
        });
      }
    });
  });

export type AnalyticsClientEvent = z.infer<typeof analyticsEventSchema>;
export type AnalyticsBatch = z.infer<typeof analyticsBatchSchema>;

export type AnalyticsTrafficClass =
  | 'human'
  | 'suspected_bot'
  | 'verified_bot'
  | 'internal'
  | 'test';

export interface AnalyticsIngestResult {
  acceptedCount: number;
  duplicateCount: number;
  rejectedCount: number;
}

export interface AnalyticsRequestContext {
  country_code?: string;
  country_name?: string;
  region?: string;
  city?: string;
  geo_source?: 'vercel-edge';
  geo_confidence?: 'medium';
  device_type?: 'desktop' | 'mobile' | 'tablet' | 'other';
  browser_name?: string;
  os_name?: string;
}

export function toDatabaseAnalyticsEvent(
  event: AnalyticsClientEvent
) {
  return {
    event_id: event.eventId,
    tab_id: event.tabId,
    sequence: event.sequence,
    event_type: event.eventType,
    schema_version: ANALYTICS_SCHEMA_VERSION,
    occurred_at: event.occurredAt,
    path: normalizeAnalyticsPath(event.path),
    title: event.title,
    referrer_domain: event.referrerDomain || null,
    screen_bucket: event.screen.bucket,
    language: event.language || null,
    timezone: event.timezone || null,
    consent_version: event.consentVersion,
    utm_source: event.utm?.source || null,
    utm_medium: event.utm?.medium || null,
    utm_campaign: event.utm?.campaign || null,
    utm_term: event.utm?.term || null,
    utm_content: event.utm?.content || null,
    content_type:
      'contentType' in event ? event.contentType : null,
    content_key:
      'contentKey' in event ? event.contentKey : null,
    duration_ms:
      'durationMs' in event ? event.durationMs : null,
    scroll_percent:
      'scrollPercent' in event ? event.scrollPercent : null,
    properties:
      'properties' in event ? event.properties : {},
  };
}

function cleanContextText(value: string | null, max: number): string {
  return (value || '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function decodeEdgeText(value: string | null, max: number): string {
  if (!value) return '';
  try {
    return cleanContextText(decodeURIComponent(value), max);
  } catch {
    return cleanContextText(value, max);
  }
}

/**
 * Produces useful, coarse request dimensions without persisting the raw
 * User-Agent or IP address. Geo headers are trusted only on Vercel runtime;
 * local/custom callers cannot populate them by spoofing request headers.
 */
export function buildAnalyticsRequestContext(
  request: Request
): AnalyticsRequestContext {
  const context: AnalyticsRequestContext = {};
  const userAgent = request.headers.get('user-agent') || '';
  const parsedAgent = new UAParser(userAgent).getResult();
  const deviceType = parsedAgent.device.type;

  context.device_type =
    deviceType === 'mobile'
      ? 'mobile'
      : deviceType === 'tablet'
        ? 'tablet'
        : deviceType
          ? 'other'
          : 'desktop';

  const browserName = cleanContextText(parsedAgent.browser.name || '', 128);
  const osName = cleanContextText(parsedAgent.os.name || '', 128);
  if (browserName) context.browser_name = browserName;
  if (osName) context.os_name = osName;

  if (process.env.VERCEL === '1') {
    const countryCode = cleanContextText(
      request.headers.get('x-vercel-ip-country'),
      2
    ).toUpperCase();
    const region = decodeEdgeText(
      request.headers.get('x-vercel-ip-country-region'),
      128
    );
    const city = decodeEdgeText(
      request.headers.get('x-vercel-ip-city'),
      128
    );

    if (/^[A-Z]{2}$/.test(countryCode)) {
      context.country_code = countryCode;
      try {
        const countryName = new Intl.DisplayNames(['tr'], {
          type: 'region',
        }).of(countryCode);
        if (countryName) {
          context.country_name = cleanContextText(countryName, 128);
        }
      } catch {
        // The ISO code remains a reliable dimension on runtimes without ICU.
      }
      context.geo_source = 'vercel-edge';
      context.geo_confidence = 'medium';
      if (region) context.region = region;
      if (city) context.city = city;
    }
  }

  return context;
}

export function getAnalyticsHashSecret(): string {
  const secret = process.env.ANALYTICS_HASH_SECRET?.trim() || '';
  return Buffer.byteLength(secret, 'utf8') >= 32 ? secret : '';
}

export function hashAnalyticsIdentifier(
  value: string,
  purpose: 'visitor' | 'rate-limit'
): string {
  const secret = getAnalyticsHashSecret();
  if (!secret) {
    throw new Error('ANALYTICS_HASH_SECRET_NOT_CONFIGURED');
  }
  return createHmac('sha256', secret)
    .update(`${purpose}:${value}`)
    .digest('hex');
}

export function normalizeAnalyticsPath(value: string): string | null {
  if (
    !value.startsWith('/') ||
    value.startsWith('//') ||
    /[\\\u0000-\u001F\u007F]/.test(value)
  ) {
    return null;
  }

  try {
    const parsed = new URL(value, 'https://analytics.invalid');
    const path = parsed.pathname.replace(/\/{2,}/g, '/');
    const policyPath = decodeURIComponent(path).toLocaleLowerCase('en-US');
    if (
      /^\/(?:admin|api)(?:\/|$)/.test(policyPath) ||
      path.length > 512
    ) {
      return null;
    }
    return path || '/';
  } catch {
    return null;
  }
}

export function isAnalyticsTimestampAccepted(
  occurredAt: string,
  now = Date.now()
): boolean {
  const timestamp = Date.parse(occurredAt);
  if (!Number.isFinite(timestamp)) return false;
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const fiveMinutesAhead = now + 5 * 60 * 1000;
  return timestamp >= sevenDaysAgo && timestamp <= fiveMinutesAhead;
}

export function classifyObviousBot(userAgent: string): AnalyticsTrafficClass {
  const ua = userAgent.toLowerCase();
  if (
    !ua ||
    /(bot|crawler|spider|slurp|bingpreview|facebookexternalhit|headlesschrome|phantomjs|lighthouse|pagespeed|curl\/|wget\/|python-requests|go-http-client|academicportfoliovisitorengine|muhammedakan-seo-audit)/i.test(
      ua
    )
  ) {
    return 'verified_bot';
  }
  return 'human';
}

export function getTransientRequestIp(request: Request): string {
  const candidate =
    process.env.VERCEL === '1'
      ? request.headers
          .get('x-vercel-forwarded-for')
          ?.split(',')[0]
          ?.trim() || ''
      : '';
  return candidate.replace(/^::ffff:/, '').slice(0, 128);
}

export function groupAnalyticsEvents(
  events: AnalyticsClientEvent[]
): Array<{
  visitorId: string;
  sessionId: string;
  events: AnalyticsClientEvent[];
}> {
  const groups = new Map<string, AnalyticsClientEvent[]>();
  events.forEach((event) => {
    const key = `${event.visitorId}:${event.sessionId}`;
    const existing = groups.get(key) || [];
    existing.push(event);
    groups.set(key, existing);
  });

  return Array.from(groups.entries()).map(([key, groupedEvents]) => {
    const [visitorId, sessionId] = key.split(':');
    return { visitorId, sessionId, events: groupedEvents };
  });
}
