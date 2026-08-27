import 'server-only';

import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { z } from 'zod';
import { getAnalyticsHashSecret } from './analytics';
import {
  VISITOR_ANALYTICS_TRACKED_FROM,
  VISITOR_ANALYTICS_TRACKED_PATH,
} from './analytics-contract';
import {
  hasSupabaseServiceRole,
  serverSupabase,
} from './supabase/server';
import {
  buildVisitorLinkAnalyticsDashboard,
  VisitorLinkEventRow,
  VisitorLinkIngestHealthRow,
  VisitorLinkSessionRow,
} from './visitor-link-analytics-report';

const MAX_RANGE_MS = 366 * 24 * 60 * 60 * 1000;
const DEFAULT_TIMEZONE = 'Europe/Istanbul';

const isoTimestampSchema = z.string().datetime({ offset: true });
const timezoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z0-9_+./-]+$/)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
      return true;
    } catch {
      return false;
    }
  }, 'Geçerli bir IANA saat dilimi girin.');

function validateRange(
  value: { from: string; to: string },
  context: z.RefinementCtx
) {
  const from = Date.parse(value.from);
  const to = Date.parse(value.to);

  if (Number.isFinite(from) && Number.isFinite(to) && from >= to) {
    context.addIssue({
      code: 'custom',
      path: ['to'],
      message: 'Bitiş zamanı başlangıç zamanından sonra olmalıdır.',
    });
  }

  if (
    Number.isFinite(from) &&
    Number.isFinite(to) &&
    to - from > MAX_RANGE_MS
  ) {
    context.addIssue({
      code: 'custom',
      path: ['to'],
      message: 'Rapor aralığı 366 günü aşamaz.',
    });
  }
}

const baseRangeShape = {
  from: isoTimestampSchema,
  to: isoTimestampSchema,
  timezone: timezoneSchema.default(DEFAULT_TIMEZONE),
};

export const analyticsDashboardQuerySchema = z
  .object(baseRangeShape)
  .strict()
  .superRefine(validateRange);

const positiveIntegerString = (maximum: number, defaultValue: number) =>
  z
    .string()
    .regex(/^[1-9][0-9]*$/)
    .transform(Number)
    .pipe(z.number().int().min(1).max(maximum))
    .default(defaultValue);

const analyticsPathSchema = z
  .string()
  .trim()
  .min(1)
  .max(512)
  .startsWith('/')
  .refine(
    (path) =>
      !path.startsWith('//') &&
      !path.includes('?') &&
      !path.includes('#') &&
      !/[\\\u0000-\u001F\u007F]/.test(path),
    'Canonical bir site yolu girin.'
  );

export const analyticsSessionsQuerySchema = z
  .object({
    ...baseRangeShape,
    cursor: z
      .string()
      .trim()
      .min(20)
      .max(512)
      .regex(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/)
      .optional(),
    limit: positiveIntegerString(100, 50),
    trafficClass: z.enum(['human', 'bots', 'all']).default('human'),
    path: analyticsPathSchema.optional(),
  })
  .strict()
  .superRefine(validateRange);

export const analyticsExportQuerySchema = z
  .object({
    ...baseRangeShape,
    dataset: z.enum(['sessions', 'pages', 'acquisition']).default('sessions'),
    limit: positiveIntegerString(10_000, 10_000),
  })
  .strict()
  .superRefine(validateRange);

export const analyticsSessionRefsSchema = z
  .array(z.string().regex(/^s_[a-f0-9]{16}$/))
  .min(1)
  .max(100)
  .transform((values) => Array.from(new Set(values)));

export type AnalyticsDashboardQuery = z.infer<
  typeof analyticsDashboardQuerySchema
>;
export type AnalyticsSessionsQuery = z.infer<
  typeof analyticsSessionsQuerySchema
>;
export type AnalyticsExportQuery = z.infer<
  typeof analyticsExportQuerySchema
>;

export type AnalyticsTrafficClass =
  | 'human'
  | 'suspected_bot'
  | 'verified_bot'
  | 'internal'
  | 'test';

export interface AnalyticsDashboardData {
  range: {
    from: string;
    to: string;
    timezone: string;
  };
  summary: {
    visitors: number;
    sessions: number;
    pageViews: number;
    engagedSessions: number;
    engagementRate: number;
    avgEngagementSeconds: number;
    conversions: number;
  };
  series: Array<{
    bucket: string;
    visitors: number;
    sessions: number;
    pageViews: number;
    conversions: number;
  }>;
  topPages: Array<{
    path: string;
    pageViews: number;
    sessions: number;
    exits: number;
    avgEngagementSeconds: number;
  }>;
  acquisition: Array<{
    channel: string;
    source: string | null;
    medium: string | null;
    campaign: string | null;
    sessions: number;
    pageViews: number;
    conversions: number;
  }>;
  technology: {
    devices: Array<{ name: string; sessions: number }>;
    deviceModels: Array<{ name: string; sessions: number }>;
    browsers: Array<{ name: string; sessions: number }>;
    browserVersions: Array<{ name: string; sessions: number }>;
    operatingSystems: Array<{ name: string; sessions: number }>;
    operatingSystemVersions: Array<{ name: string; sessions: number }>;
    screenBuckets: Array<{ name: string; pageViews: number }>;
  };
  geography: {
    countries: Array<{
      countryCode: string | null;
      countryName: string;
      sessions: number;
    }>;
    cities: Array<{
      countryCode: string | null;
      region: string | null;
      city: string;
      sessions: number;
    }>;
    networks: Array<{
      name: string;
      asn: string | null;
      isMobileNetwork: boolean | null;
      isProxy: boolean | null;
      isHosting: boolean | null;
      sessions: number;
    }>;
  };
  events: Array<{ eventType: string; count: number }>;
  interactionEvents: Array<{ interactionKey: string; count: number }>;
  webVitals: Array<{
    metric: string;
    p75: number;
    rating: 'good' | 'needs-improvement' | 'poor' | 'unknown';
    measurements: number;
  }>;
  quality: {
    humanSessions: number;
    botSessions: number;
    consentVersions: Array<{ version: string; sessions: number }>;
    lateEvents: number;
    duplicateEvents: number;
    rejectedEvents: number;
    counterScope: 'all-time';
    lastSuccessAt: string | null;
  };
}

export interface AnalyticsJourneyEvent {
  occurredAt: string;
  path: string | null;
  title: string | null;
}

export interface AnalyticsSessionSummary {
  id: string;
  startedAt: string;
  lastActivityAt: string;
  durationSeconds: number;
  trafficClass: AnalyticsTrafficClass;
  isEngaged: boolean;
  pageViews: number;
  eventCount: number;
  engagementSeconds: number;
  maxScrollPercent: number;
  conversionCount: number;
  landingPath: string | null;
  exitPath: string | null;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  referrerDomain: string | null;
  countryCode: string | null;
  countryName: string | null;
  region: string | null;
  city: string | null;
  geoSource: string | null;
  geoConfidence: 'high' | 'medium' | 'low' | null;
  ispName: string | null;
  networkOrganization: string | null;
  asn: string | null;
  isMobileNetwork: boolean | null;
  isProxy: boolean | null;
  isHosting: boolean | null;
  deviceType: string | null;
  deviceBrand: string | null;
  deviceModel: string | null;
  browserName: string | null;
  browserVersion: string | null;
  osName: string | null;
  osVersion: string | null;
  consentVersion: string | null;
  journey: AnalyticsJourneyEvent[];
  journeyTruncated: boolean;
}

export interface AnalyticsSessionsData {
  range: AnalyticsDashboardData['range'];
  sessions: AnalyticsSessionSummary[];
  nextCursor: string | null;
}

type QueryParseResult<T> =
  | { success: true; data: T }
  | {
      success: false;
      fields: Record<string, string[]>;
    };

const finiteCountSchema = z.number().finite().nonnegative();
const nullableTextSchema = z.string().nullable();
const rangeOutputSchema = z
  .object({
    from: isoTimestampSchema,
    to: isoTimestampSchema,
    timezone: timezoneSchema,
  })
  .strict();

const dashboardOutputSchema = z
  .object({
    range: rangeOutputSchema,
    summary: z
      .object({
        visitors: finiteCountSchema,
        sessions: finiteCountSchema,
        pageViews: finiteCountSchema,
        engagedSessions: finiteCountSchema,
        engagementRate: finiteCountSchema,
        avgEngagementSeconds: finiteCountSchema,
        conversions: finiteCountSchema,
      })
      .strict(),
    series: z.array(
      z
        .object({
          bucket: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          visitors: finiteCountSchema,
          sessions: finiteCountSchema,
          pageViews: finiteCountSchema,
          conversions: finiteCountSchema,
        })
        .strict()
    ),
    topPages: z.array(
      z
        .object({
          path: z.string().startsWith('/'),
          pageViews: finiteCountSchema,
          sessions: finiteCountSchema,
          exits: finiteCountSchema,
          avgEngagementSeconds: finiteCountSchema,
        })
        .strict()
    ),
    acquisition: z.array(
      z
        .object({
          channel: z.string(),
          source: nullableTextSchema,
          medium: nullableTextSchema,
          campaign: nullableTextSchema,
          sessions: finiteCountSchema,
          pageViews: finiteCountSchema,
          conversions: finiteCountSchema,
        })
        .strict()
    ),
    technology: z
      .object({
        devices: z.array(
          z
            .object({ name: z.string(), sessions: finiteCountSchema })
            .strict()
        ),
        deviceModels: z.array(
          z
            .object({ name: z.string(), sessions: finiteCountSchema })
            .strict()
        ),
        browsers: z.array(
          z
            .object({ name: z.string(), sessions: finiteCountSchema })
            .strict()
        ),
        browserVersions: z.array(
          z
            .object({ name: z.string(), sessions: finiteCountSchema })
            .strict()
        ),
        operatingSystems: z.array(
          z
            .object({ name: z.string(), sessions: finiteCountSchema })
            .strict()
        ),
        operatingSystemVersions: z.array(
          z
            .object({ name: z.string(), sessions: finiteCountSchema })
            .strict()
        ),
        screenBuckets: z.array(
          z
            .object({ name: z.string(), pageViews: finiteCountSchema })
            .strict()
        ),
      })
      .strict(),
    geography: z
      .object({
        countries: z.array(
          z
            .object({
              countryCode: nullableTextSchema,
              countryName: z.string(),
              sessions: finiteCountSchema,
            })
            .strict()
        ),
        cities: z.array(
          z
            .object({
              countryCode: nullableTextSchema,
              region: nullableTextSchema,
              city: z.string(),
              sessions: finiteCountSchema,
            })
            .strict()
        ),
        networks: z
          .array(
            z
              .object({
                name: z.string(),
                asn: nullableTextSchema,
                isMobileNetwork: z.boolean().nullable(),
                isProxy: z.boolean().nullable(),
                isHosting: z.boolean().nullable(),
                sessions: finiteCountSchema,
              })
              .strict()
          )
          .default([]),
      })
      .strict(),
    events: z.array(
      z
        .object({
          eventType: z.string(),
          count: finiteCountSchema,
        })
        .strict()
    ),
    interactionEvents: z.array(
      z
        .object({
          interactionKey: z.string(),
          count: finiteCountSchema,
        })
        .strict()
    ),
    webVitals: z.array(
      z
        .object({
          metric: z.string(),
          p75: finiteCountSchema,
          rating: z.enum([
            'good',
            'needs-improvement',
            'poor',
            'unknown',
          ]),
          measurements: finiteCountSchema,
        })
        .strict()
    ),
    quality: z
      .object({
        humanSessions: finiteCountSchema,
        botSessions: finiteCountSchema,
        consentVersions: z.array(
          z
            .object({
              version: z.string(),
              sessions: finiteCountSchema,
            })
            .strict()
        ),
        lateEvents: finiteCountSchema,
        duplicateEvents: finiteCountSchema,
        rejectedEvents: finiteCountSchema,
        counterScope: z.literal('all-time'),
        lastSuccessAt: isoTimestampSchema.nullable(),
      })
      .strict(),
  })
  .strict();

const journeyEventSchema = z
  .object({
    occurredAt: isoTimestampSchema,
    path: nullableTextSchema,
    title: nullableTextSchema,
  })
  .strict();

const sessionSummarySchema = z
  .object({
    sessionRef: z.string().regex(/^s_[a-f0-9]{16}$/),
    startedAt: isoTimestampSchema,
    lastActivityAt: isoTimestampSchema,
    durationSeconds: finiteCountSchema,
    trafficClass: z.enum([
      'human',
      'suspected_bot',
      'verified_bot',
      'internal',
      'test',
    ]),
    isEngaged: z.boolean(),
    pageViews: finiteCountSchema,
    eventCount: finiteCountSchema,
    engagementSeconds: finiteCountSchema,
    maxScrollPercent: finiteCountSchema.max(100),
    conversions: finiteCountSchema,
    landingPath: nullableTextSchema,
    exitPath: nullableTextSchema,
    source: nullableTextSchema,
    medium: nullableTextSchema,
    campaign: nullableTextSchema,
    referrerDomain: nullableTextSchema,
    countryCode: nullableTextSchema,
    countryName: nullableTextSchema,
    region: nullableTextSchema,
    city: nullableTextSchema,
    geoSource: nullableTextSchema,
    geoConfidence: z.enum(['high', 'medium', 'low']).nullable(),
    ispName: nullableTextSchema.optional(),
    networkOrganization: nullableTextSchema.optional(),
    asn: nullableTextSchema.optional(),
    isMobileNetwork: z.boolean().nullable().optional(),
    isProxy: z.boolean().nullable().optional(),
    isHosting: z.boolean().nullable().optional(),
    deviceType: nullableTextSchema,
    deviceBrand: nullableTextSchema,
    deviceModel: nullableTextSchema,
    browser: nullableTextSchema,
    browserVersion: nullableTextSchema,
    operatingSystem: nullableTextSchema,
    osVersion: nullableTextSchema,
    consentVersion: nullableTextSchema,
    journey: z.array(journeyEventSchema).max(100),
    journeyTruncated: z.boolean(),
  })
  .strict();

const internalCursorSchema = z
  .object({
    at: isoTimestampSchema,
    key: z.string().regex(/^[a-f0-9]{32}$/),
  })
  .strict();

const sessionsRpcOutputSchema = z
  .object({
    items: z.array(sessionSummarySchema).max(100),
    hasMore: z.boolean(),
    nextCursor: internalCursorSchema.nullable(),
  })
  .strict();

export class AnalyticsReportingError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly fields?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'AnalyticsReportingError';
  }
}

function zodIssueFields(error: z.ZodError): Record<string, string[]> {
  const fields: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const path = issue.path.length ? issue.path.join('.') : 'query';
    fields[path] = [...(fields[path] || []), issue.message];
  }
  return fields;
}

function parseQuery<T>(
  request: Request,
  schema: z.ZodType<T>
): QueryParseResult<T> {
  const searchParams = new URL(request.url).searchParams;
  const input: Record<string, string | string[]> = {};
  const seen = new Set<string>();

  searchParams.forEach((_value, key) => {
    if (seen.has(key)) return;
    seen.add(key);
    const values = searchParams.getAll(key);
    input[key] = values.length === 1 ? values[0] : values;
  });

  const presetDurations: Record<string, number> = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    '90d': 90 * 24 * 60 * 60 * 1000,
    '365d': 365 * 24 * 60 * 60 * 1000,
  };
  const preset = input.range;
  if (
    typeof preset === 'string' &&
    presetDurations[preset] &&
    input.from === undefined &&
    input.to === undefined
  ) {
    const to = Date.now();
    input.from = new Date(to - presetDurations[preset]).toISOString();
    input.to = new Date(to).toISOString();
    delete input.range;
  }

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { success: false, fields: zodIssueFields(parsed.error) };
  }
  return { success: true, data: parsed.data };
}

export function parseAnalyticsDashboardQuery(
  request: Request
): QueryParseResult<AnalyticsDashboardQuery> {
  return parseQuery(request, analyticsDashboardQuerySchema);
}

export function parseAnalyticsSessionsQuery(
  request: Request
): QueryParseResult<AnalyticsSessionsQuery> {
  return parseQuery(request, analyticsSessionsQuerySchema);
}

export function parseAnalyticsExportQuery(
  request: Request
): QueryParseResult<AnalyticsExportQuery> {
  return parseQuery(request, analyticsExportQuerySchema);
}

function requireReportingClient() {
  if (!serverSupabase || !hasSupabaseServiceRole) {
    throw new AnalyticsReportingError(
      'ANALYTICS_STORAGE_UNAVAILABLE',
      'Analitik raporlama için Supabase service role yapılandırılmamış.',
      503,
      {
        SUPABASE_SERVICE_ROLE_KEY: [
          'Bu rapor yalnız server-only service role ile çalışır.',
        ],
      }
    );
  }
  return serverSupabase;
}

function reportQueryFailed() {
  return new AnalyticsReportingError(
    'ANALYTICS_REPORT_QUERY_FAILED',
    'Analitik rapor şu anda üretilemedi.',
    503
  );
}

function reportContractFailed() {
  return new AnalyticsReportingError(
    'ANALYTICS_REPORT_CONTRACT_INVALID',
    'Analitik rapor veri sözleşmesi doğrulanamadı.',
    503
  );
}

const VISITOR_LINK_REPORT_PAGE_SIZE = 1_000;
const VISITOR_LINK_REPORT_MAX_EVENTS = 50_000;
const VISITOR_LINK_SESSION_CHUNK_SIZE = 100;
const VISITOR_ANALYTICS_TRACKED_FROM_MS = Date.parse(
  VISITOR_ANALYTICS_TRACKED_FROM
);

const visitorLinkEventRowSchema = z
  .object({
    event_id: z.string().uuid(),
    visitor_id: z.string().uuid(),
    session_id: z.string().uuid(),
    event_type: z.string(),
    occurred_at: isoTimestampSchema,
    received_at: isoTimestampSchema,
    path: nullableTextSchema,
    screen_bucket: nullableTextSchema,
    duration_ms: z.number().int().nonnegative().nullable(),
    content_type: nullableTextSchema,
    content_key: nullableTextSchema,
    properties: z.record(z.string(), z.unknown()).nullable(),
  })
  .strict();

const visitorLinkSessionRowSchema = z
  .object({
    id: z.string().uuid(),
    visitor_id: z.string().uuid(),
    traffic_class: z.string(),
    referrer_domain: nullableTextSchema,
    source: nullableTextSchema,
    medium: nullableTextSchema,
    campaign: nullableTextSchema,
    country_code: nullableTextSchema,
    country_name: nullableTextSchema,
    region: nullableTextSchema,
    city: nullableTextSchema,
    geo_source: nullableTextSchema,
    geo_confidence: nullableTextSchema,
    isp_name: nullableTextSchema,
    network_organization: nullableTextSchema,
    asn: nullableTextSchema,
    is_mobile_network: z.boolean().nullable(),
    is_proxy: z.boolean().nullable(),
    is_hosting: z.boolean().nullable(),
    device_type: nullableTextSchema,
    device_brand: nullableTextSchema,
    device_model: nullableTextSchema,
    browser_name: nullableTextSchema,
    browser_version: nullableTextSchema,
    os_name: nullableTextSchema,
    os_version: nullableTextSchema,
    consent_version: nullableTextSchema,
  })
  .strict();

const visitorLinkHealthRowSchema = z
  .object({
    duplicate_events: finiteCountSchema,
    rejected_events: finiteCountSchema,
    last_success_at: isoTimestampSchema.nullable(),
  })
  .strict();

async function getVisitorLinkEventsWindow(
  client: ReturnType<typeof requireReportingClient>,
  from: string,
  to: string,
  trackedPath?: string
): Promise<VisitorLinkEventRow[]> {
  const rows: VisitorLinkEventRow[] = [];

  for (let offset = 0; offset < VISITOR_LINK_REPORT_MAX_EVENTS; offset += VISITOR_LINK_REPORT_PAGE_SIZE) {
    let eventsQuery = client
      .from('analytics_events')
      .select(
        'event_id, visitor_id, session_id, event_type, occurred_at, received_at, path, screen_bucket, duration_ms, content_type, content_key, properties'
      )
      .gte('occurred_at', from)
      .lt('occurred_at', to);
    if (trackedPath) eventsQuery = eventsQuery.eq('path', trackedPath);

    const { data, error } = await eventsQuery
      .order('occurred_at', { ascending: true })
      .order('event_id', { ascending: true })
      .range(offset, offset + VISITOR_LINK_REPORT_PAGE_SIZE - 1);

    if (error || !Array.isArray(data)) throw reportQueryFailed();
    const parsed = z.array(visitorLinkEventRowSchema).safeParse(data);
    if (!parsed.success) throw reportContractFailed();
    rows.push(...parsed.data);

    if (parsed.data.length < VISITOR_LINK_REPORT_PAGE_SIZE) return rows;
  }

  throw new AnalyticsReportingError(
    'ANALYTICS_REPORT_TOO_LARGE',
    'Seçilen tarih aralığındaki analitik verisi rapor sınırını aşıyor. Daha kısa bir tarih aralığı seçin.',
    413
  );
}

async function getVisitorLinkEvents(
  client: ReturnType<typeof requireReportingClient>,
  query: AnalyticsDashboardQuery
): Promise<VisitorLinkEventRow[]> {
  const fromMs = Date.parse(query.from);
  const toMs = Date.parse(query.to);
  const windows: Array<{
    from: string;
    to: string;
    trackedPath?: string;
  }> = [];

  if (fromMs < VISITOR_ANALYTICS_TRACKED_FROM_MS) {
    const historicalTo = new Date(
      Math.min(toMs, VISITOR_ANALYTICS_TRACKED_FROM_MS)
    ).toISOString();
    windows.push({ from: query.from, to: historicalTo });
  }
  if (toMs > VISITOR_ANALYTICS_TRACKED_FROM_MS) {
    const trackedFrom = new Date(
      Math.max(fromMs, VISITOR_ANALYTICS_TRACKED_FROM_MS)
    ).toISOString();
    windows.push({
      from: trackedFrom,
      to: query.to,
      trackedPath: VISITOR_ANALYTICS_TRACKED_PATH,
    });
  }

  const windowRows = await Promise.all(
    windows.map((window) =>
      getVisitorLinkEventsWindow(
        client,
        window.from,
        window.to,
        window.trackedPath
      )
    )
  );
  const rows = windowRows.flat().sort(
    (left, right) =>
      Date.parse(left.occurred_at) - Date.parse(right.occurred_at) ||
      left.event_id.localeCompare(right.event_id)
  );
  if (rows.length > VISITOR_LINK_REPORT_MAX_EVENTS) {
    throw new AnalyticsReportingError(
      'ANALYTICS_REPORT_TOO_LARGE',
      'Seçilen tarih aralığındaki analitik verisi rapor sınırını aşıyor. Daha kısa bir tarih aralığı seçin.',
      413
    );
  }
  return rows;
}

async function getVisitorLinkSessions(
  client: ReturnType<typeof requireReportingClient>,
  sessionIds: string[]
): Promise<VisitorLinkSessionRow[]> {
  const rows: VisitorLinkSessionRow[] = [];
  for (
    let offset = 0;
    offset < sessionIds.length;
    offset += VISITOR_LINK_SESSION_CHUNK_SIZE
  ) {
    const chunk = sessionIds.slice(
      offset,
      offset + VISITOR_LINK_SESSION_CHUNK_SIZE
    );
    const { data, error } = await client
      .from('analytics_sessions')
      .select(
        'id, visitor_id, traffic_class, referrer_domain, source, medium, campaign, country_code, country_name, region, city, geo_source, geo_confidence, isp_name, network_organization, asn, is_mobile_network, is_proxy, is_hosting, device_type, device_brand, device_model, browser_name, browser_version, os_name, os_version, consent_version'
      )
      .in('id', chunk);

    if (error || !Array.isArray(data)) throw reportQueryFailed();
    const parsed = z.array(visitorLinkSessionRowSchema).safeParse(data);
    if (!parsed.success) throw reportContractFailed();
    rows.push(...parsed.data);
  }
  return rows;
}

async function getVisitorLinkHealth(
  client: ReturnType<typeof requireReportingClient>
): Promise<VisitorLinkIngestHealthRow | null> {
  const { data, error } = await client
    .from('analytics_ingest_health')
    .select('duplicate_events, rejected_events, last_success_at')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw reportQueryFailed();
  if (!data) return null;
  const parsed = visitorLinkHealthRowSchema.safeParse(data);
  if (!parsed.success) throw reportContractFailed();
  return parsed.data;
}

export async function getAnalyticsDashboard(
  query: AnalyticsDashboardQuery
): Promise<AnalyticsDashboardData> {
  const client = requireReportingClient();
  const [events, health] = await Promise.all([
    getVisitorLinkEvents(client, query),
    getVisitorLinkHealth(client),
  ]);
  const sessions = await getVisitorLinkSessions(
    client,
    Array.from(new Set(events.map((event) => event.session_id)))
  );
  const parsed = dashboardOutputSchema.safeParse(
    buildVisitorLinkAnalyticsDashboard({
      range: {
        from: query.from,
        to: query.to,
        timezone: query.timezone,
      },
      events,
      sessions,
      health,
    })
  );
  if (!parsed.success) throw reportContractFailed();
  return parsed.data;
}

const signedCursorPayloadSchema = z
  .object({
    version: z.literal(2),
    at: isoTimestampSchema,
    key: z.string().regex(/^[a-f0-9]{32}$/),
    fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    snapshotTo: isoTimestampSchema,
  })
  .strict();

function cursorSecret(): string {
  const secret = getAnalyticsHashSecret();
  if (!secret) {
    throw new AnalyticsReportingError(
      'ANALYTICS_CURSOR_SECRET_UNAVAILABLE',
      'Güvenli analitik sayfalama anahtarı yapılandırılmamış.',
      503
    );
  }
  return secret;
}

function signCursor(payload: string): string {
  return createHmac('sha256', cursorSecret())
    .update(`reporting-cursor:${payload}`)
    .digest('base64url');
}

function sessionQueryFingerprint(query: AnalyticsSessionsQuery): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        from: new Date(query.from).toISOString(),
        to: new Date(query.to).toISOString(),
        timezone: query.timezone,
        trafficClass: query.trafficClass,
        path: query.path || null,
      })
    )
    .digest('hex');
}

function analyticsSessionsRpcPath(
  query: AnalyticsSessionsQuery
): string | null {
  // Before the rollout, the old report was site-wide and must remain
  // visible. Once the requested window starts at the cutover, only /7 can be
  // present because the collector rejects every other path.
  return Date.parse(query.from) >= VISITOR_ANALYTICS_TRACKED_FROM_MS
    ? VISITOR_ANALYTICS_TRACKED_PATH
    : null;
}

function encodeCursor(
  cursor: z.infer<typeof internalCursorSchema>,
  fingerprint: string,
  snapshotTo: string
): string {
  const payload = Buffer.from(
    JSON.stringify({
      version: 2,
      ...cursor,
      fingerprint,
      snapshotTo,
    }),
    'utf8'
  ).toString('base64url');
  return `${payload}.${signCursor(payload)}`;
}

function decodeCursor(
  value: string | undefined,
  expectedFingerprint: string
): {
  at: string | null;
  key: string | null;
  snapshotTo: string;
} {
  if (!value) {
    return {
      at: null,
      key: null,
      snapshotTo: new Date().toISOString(),
    };
  }

  let decoded: z.infer<typeof signedCursorPayloadSchema>;
  try {
    const [payload, signature, extra] = value.split('.');
    if (!payload || !signature || extra) throw new Error('INVALID_CURSOR');

    const expected = Buffer.from(signCursor(payload), 'utf8');
    const actual = Buffer.from(signature, 'utf8');
    if (
      actual.length !== expected.length ||
      !timingSafeEqual(actual, expected)
    ) {
      throw new Error('INVALID_CURSOR');
    }

    decoded = signedCursorPayloadSchema.parse(
      JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    );
  } catch {
    throw new AnalyticsReportingError(
      'INVALID_ANALYTICS_CURSOR',
      'Analitik oturum sayfalama anahtarı geçersiz.',
      400,
      { cursor: ['Sayfalama anahtarını temizleyip yeniden deneyin.'] }
    );
  }

  if (decoded.fingerprint !== expectedFingerprint) {
    throw new AnalyticsReportingError(
      'ANALYTICS_CURSOR_QUERY_MISMATCH',
      'Sayfalama anahtarı mevcut analitik filtrelerle eşleşmiyor.',
      400,
      { cursor: ['Filtreleri değiştirdikten sonra ilk sayfadan başlayın.'] }
    );
  }

  if (Date.parse(decoded.snapshotTo) > Date.now() + 5 * 60 * 1000) {
    throw new AnalyticsReportingError(
      'INVALID_ANALYTICS_CURSOR',
      'Analitik oturum sayfalama anahtarı geçersiz.',
      400,
      { cursor: ['Sayfalama anahtarını temizleyip yeniden deneyin.'] }
    );
  }

  return {
    at: decoded.at,
    key: decoded.key,
    snapshotTo: decoded.snapshotTo,
  };
}

export async function getAnalyticsSessions(
  query: AnalyticsSessionsQuery
): Promise<AnalyticsSessionsData> {
  const client = requireReportingClient();
  const scopedQuery = {
    ...query,
    path: VISITOR_ANALYTICS_TRACKED_PATH,
  };
  const rpcPath = analyticsSessionsRpcPath(query);
  const fingerprint = sessionQueryFingerprint(scopedQuery);
  const cursor = decodeCursor(scopedQuery.cursor, fingerprint);
  const { data, error } = await client.rpc('get_analytics_sessions', {
    p_from: scopedQuery.from,
    p_to: scopedQuery.to,
    p_timezone: scopedQuery.timezone,
    p_limit: scopedQuery.limit,
    p_cursor_at: cursor.at,
    p_cursor_key: cursor.key,
    p_traffic_class: scopedQuery.trafficClass,
    p_path: rpcPath,
    p_snapshot_to: cursor.snapshotTo,
  });

  if (error || !data) throw reportQueryFailed();

  const parsed = sessionsRpcOutputSchema.safeParse(data);
  if (!parsed.success) throw reportContractFailed();

  return {
    range: {
      from: scopedQuery.from,
      to: scopedQuery.to,
      timezone: scopedQuery.timezone,
    },
    sessions: parsed.data.items.map((session) => ({
      id: session.sessionRef,
      startedAt: session.startedAt,
      lastActivityAt: session.lastActivityAt,
      durationSeconds: session.durationSeconds,
      trafficClass: session.trafficClass,
      isEngaged: session.isEngaged,
      pageViews: session.pageViews,
      eventCount: session.eventCount,
      engagementSeconds: session.engagementSeconds,
      maxScrollPercent: session.maxScrollPercent,
      conversionCount: session.conversions,
      landingPath: session.landingPath,
      exitPath: session.exitPath,
      source: session.source,
      medium: session.medium,
      campaign: session.campaign,
      referrerDomain: session.referrerDomain,
      countryCode: session.countryCode,
      countryName: session.countryName,
      region: session.region,
      city: session.city,
      geoSource: session.geoSource,
      geoConfidence: session.geoConfidence,
      ispName: session.ispName ?? null,
      networkOrganization: session.networkOrganization ?? null,
      asn: session.asn ?? null,
      isMobileNetwork: session.isMobileNetwork ?? null,
      isProxy: session.isProxy ?? null,
      isHosting: session.isHosting ?? null,
      deviceType: session.deviceType,
      deviceBrand: session.deviceBrand,
      deviceModel: session.deviceModel,
      browserName: session.browser,
      browserVersion: session.browserVersion,
      osName: session.operatingSystem,
      osVersion: session.osVersion,
      consentVersion: session.consentVersion,
      journey: session.journey.map((event) => ({
        path: event.path,
        title: event.title,
        occurredAt: event.occurredAt,
      })),
      journeyTruncated: session.journeyTruncated,
    })),
    nextCursor: parsed.data.nextCursor
      ? encodeCursor(
          parsed.data.nextCursor,
          fingerprint,
          cursor.snapshotTo
        )
      : null,
  };
}

const deleteSessionsOutputSchema = z
  .object({
    requestedCount: z.number().int().min(1).max(100),
    deletedCount: z.number().int().min(0).max(100),
  })
  .strict();

export async function deleteAnalyticsSessions(
  sessionRefs: string[]
): Promise<z.infer<typeof deleteSessionsOutputSchema>> {
  const client = requireReportingClient();
  const { data, error } = await client.rpc('delete_analytics_sessions', {
    p_session_refs: sessionRefs,
  });

  if (error || !data) throw reportQueryFailed();
  const parsed = deleteSessionsOutputSchema.safeParse(data);
  if (!parsed.success) throw reportContractFailed();
  return parsed.data;
}

export type AnalyticsExportRow = Record<
  string,
  string | number | boolean | null
>;

const exportRowSchema = z.record(
  z.string(),
  z.union([z.string(), z.number().finite(), z.boolean(), z.null()])
);

export async function getAnalyticsExportRows(
  query: AnalyticsExportQuery
): Promise<AnalyticsExportRow[]> {
  let rows: AnalyticsExportRow[] = [];

  if (query.dataset === 'sessions') {
    let cursor: string | undefined;
    while (rows.length < query.limit) {
      const page = await getAnalyticsSessions({
        from: query.from,
        to: query.to,
        timezone: query.timezone,
        limit: Math.min(100, query.limit - rows.length),
        trafficClass: 'human',
        path: VISITOR_ANALYTICS_TRACKED_PATH,
        cursor,
      });
      rows.push(
        ...page.sessions.map((session) => ({
          sessionRef: session.id,
          startedAt: session.startedAt,
          lastActivityAt: session.lastActivityAt,
          durationSeconds: session.durationSeconds,
          trafficClass: session.trafficClass,
          isEngaged: session.isEngaged,
          pageViews: session.pageViews,
          eventCount: session.eventCount,
          engagementSeconds: session.engagementSeconds,
          maxScrollPercent: session.maxScrollPercent,
          conversions: session.conversionCount,
          landingPath: session.landingPath,
          exitPath: session.exitPath,
          source: session.source,
          medium: session.medium,
          campaign: session.campaign,
          referrerDomain: session.referrerDomain,
          countryCode: session.countryCode,
          countryName: session.countryName,
          region: session.region,
          city: session.city,
          geoSource: session.geoSource,
          geoConfidence: session.geoConfidence,
          ispName: session.ispName,
          networkOrganization: session.networkOrganization,
          asn: session.asn,
          isMobileNetwork: session.isMobileNetwork,
          isProxy: session.isProxy,
          isHosting: session.isHosting,
          deviceType: session.deviceType,
          deviceBrand: session.deviceBrand,
          deviceModel: session.deviceModel,
          browser: session.browserName,
          browserVersion: session.browserVersion,
          operatingSystem: session.osName,
          osVersion: session.osVersion,
          consentVersion: session.consentVersion,
        }))
      );
      if (!page.nextCursor) break;
      cursor = page.nextCursor;
    }
  } else {
    const dashboard = await getAnalyticsDashboard(query);
    rows =
      query.dataset === 'pages'
        ? dashboard.topPages
        : dashboard.acquisition;
  }

  const parsed = z.array(exportRowSchema).max(query.limit).safeParse(rows);
  if (!parsed.success) throw reportContractFailed();

  for (const row of parsed.data) {
    if (
      'visitorKey' in row ||
      'visitorId' in row ||
      'visitor_id' in row ||
      'clientSessionId' in row ||
      'ip' in row ||
      'ipAddress' in row
    ) {
      throw reportContractFailed();
    }
  }

  return parsed.data;
}

const EXPORT_COLUMNS: Record<
  AnalyticsExportQuery['dataset'],
  Array<{ key: string; label: string }>
> = {
  sessions: [
    { key: 'sessionRef', label: 'session_ref' },
    { key: 'startedAt', label: 'started_at' },
    { key: 'lastActivityAt', label: 'last_activity_at' },
    { key: 'durationSeconds', label: 'duration_seconds' },
    { key: 'trafficClass', label: 'traffic_class' },
    { key: 'isEngaged', label: 'is_engaged' },
    { key: 'pageViews', label: 'page_views' },
    { key: 'eventCount', label: 'event_count' },
    { key: 'engagementSeconds', label: 'engagement_seconds' },
    { key: 'maxScrollPercent', label: 'max_scroll_percent' },
    { key: 'conversions', label: 'conversions' },
    { key: 'landingPath', label: 'landing_path' },
    { key: 'exitPath', label: 'exit_path' },
    { key: 'source', label: 'source' },
    { key: 'medium', label: 'medium' },
    { key: 'campaign', label: 'campaign' },
    { key: 'referrerDomain', label: 'referrer_domain' },
    { key: 'countryCode', label: 'country_code' },
    { key: 'countryName', label: 'country_name' },
    { key: 'region', label: 'region' },
    { key: 'city', label: 'city' },
    { key: 'geoSource', label: 'geo_source' },
    { key: 'geoConfidence', label: 'geo_confidence' },
    { key: 'ispName', label: 'isp_name' },
    { key: 'networkOrganization', label: 'network_organization' },
    { key: 'asn', label: 'asn' },
    { key: 'isMobileNetwork', label: 'is_mobile_network' },
    { key: 'isProxy', label: 'is_proxy' },
    { key: 'isHosting', label: 'is_hosting' },
    { key: 'deviceType', label: 'device_type' },
    { key: 'deviceBrand', label: 'device_brand' },
    { key: 'deviceModel', label: 'device_model' },
    { key: 'browser', label: 'browser' },
    { key: 'browserVersion', label: 'browser_version' },
    { key: 'operatingSystem', label: 'operating_system' },
    { key: 'osVersion', label: 'os_version' },
    { key: 'consentVersion', label: 'consent_version' },
  ],
  pages: [
    { key: 'path', label: 'path' },
    { key: 'pageViews', label: 'page_views' },
    { key: 'sessions', label: 'sessions' },
    { key: 'exits', label: 'exits' },
    { key: 'avgEngagementSeconds', label: 'avg_engagement_seconds' },
  ],
  acquisition: [
    { key: 'channel', label: 'channel' },
    { key: 'source', label: 'source' },
    { key: 'medium', label: 'medium' },
    { key: 'campaign', label: 'campaign' },
    { key: 'sessions', label: 'sessions' },
    { key: 'pageViews', label: 'page_views' },
    { key: 'conversions', label: 'conversions' },
  ],
};

function csvCell(value: unknown): string {
  let text =
    value === null || value === undefined
      ? ''
      : typeof value === 'boolean'
        ? value
          ? 'true'
          : 'false'
        : String(value);

  text = text.replace(/\u0000/g, '').replace(/\r\n?/g, '\n');
  const executablePrefix = text.replace(
    /^[\s\u0000-\u001F\u007F\u200B-\u200D\u202A-\u202E\u2066-\u2069\uFEFF]+/,
    ''
  );
  if (/^[=+\-@]/.test(executablePrefix)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function createAnalyticsCsv(
  dataset: AnalyticsExportQuery['dataset'],
  rows: AnalyticsExportRow[]
): string {
  const columns = EXPORT_COLUMNS[dataset];
  const lines = [
    columns.map((column) => csvCell(column.label)).join(','),
    ...rows.map((row) =>
      columns.map((column) => csvCell(row[column.key])).join(',')
    ),
  ];
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}
