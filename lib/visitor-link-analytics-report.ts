import {
  ANALYTICS_PROFILE_INTERACTION_KEYS,
  ANALYTICS_SCREEN_INTERACTION_KEYS,
  VISITOR_ANALYTICS_TRACKED_PATH,
} from './analytics-contract';

export interface VisitorLinkEventRow {
  event_id: string;
  visitor_id: string;
  session_id: string;
  event_type: string;
  occurred_at: string;
  received_at: string;
  path: string | null;
  screen_bucket: string | null;
  duration_ms: number | null;
  content_type: string | null;
  content_key: string | null;
  properties: Record<string, unknown> | null;
}

export interface VisitorLinkSessionRow {
  id: string;
  visitor_id: string;
  traffic_class: string;
  referrer_domain: string | null;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  country_code: string | null;
  country_name: string | null;
  region: string | null;
  city: string | null;
  geo_source: string | null;
  geo_confidence: string | null;
  isp_name: string | null;
  network_organization: string | null;
  asn: string | null;
  is_mobile_network: boolean | null;
  is_proxy: boolean | null;
  is_hosting: boolean | null;
  device_type: string | null;
  device_brand: string | null;
  device_model: string | null;
  browser_name: string | null;
  browser_version: string | null;
  os_name: string | null;
  os_version: string | null;
  consent_version: string | null;
}

export interface VisitorLinkIngestHealthRow {
  duplicate_events: number;
  rejected_events: number;
  last_success_at: string | null;
}

type ReportRange = { from: string; to: string; timezone: string };

type SessionMetric = {
  session: VisitorLinkSessionRow;
  eventCount: number;
  pageViews: number;
  engagementDurationMs: number;
  conversions: number;
};

const PROFILE_INTERACTIONS = new Set<string>(
  ANALYTICS_PROFILE_INTERACTION_KEYS
);
const SCREEN_INTERACTIONS = new Set<string>(
  ANALYTICS_SCREEN_INTERACTION_KEYS
);

function cleanText(value: string | null | undefined): string | null {
  const normalized = value?.trim() || '';
  return normalized || null;
}

function rounded(value: number, digits = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function reportingDay(value: string | number, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function reportingDays(range: ReportRange): string[] {
  const first = reportingDay(range.from, range.timezone);
  const last = reportingDay(Date.parse(range.to) - 1, range.timezone);
  const cursor = new Date(`${first}T00:00:00.000Z`);
  const end = new Date(`${last}T00:00:00.000Z`);
  const days: string[] = [];
  while (cursor <= end && days.length <= 367) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

function channelFor(session: VisitorLinkSessionRow): string {
  const source = (
    cleanText(session.source) || cleanText(session.referrer_domain) || ''
  ).toLocaleLowerCase('en-US');
  const medium = (cleanText(session.medium) || '').toLocaleLowerCase('en-US');

  if (['cpc', 'ppc', 'paid', 'paidsearch', 'paid_search', 'display'].includes(medium)) {
    return 'Paid';
  }
  if (['email', 'e-mail', 'newsletter'].includes(medium)) return 'Email';
  if (
    ['social', 'social-network', 'social_media', 'sm'].includes(medium) ||
    /(facebook|instagram|linkedin|twitter|t\.co|x\.com|youtube|youtu\.be|reddit|pinterest|tiktok)/.test(
      source
    )
  ) {
    return 'Social';
  }
  if (
    ['organic', 'organic_search', 'search'].includes(medium) ||
    /(^|\.)((google|bing|yahoo|yandex|duckduckgo)\.)/.test(source)
  ) {
    return 'Organic Search';
  }
  return source ? 'Referral' : 'Direct';
}

function percentile75(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const position = (sorted.length - 1) * 0.75;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

function vitalRating(metric: string, p75: number, measurements: number) {
  if (measurements < 20) return 'unknown' as const;
  if (metric === 'LCP') {
    return p75 <= 2500 ? 'good' : p75 <= 4000 ? 'needs-improvement' : 'poor';
  }
  if (metric === 'INP') {
    return p75 <= 200 ? 'good' : p75 <= 500 ? 'needs-improvement' : 'poor';
  }
  if (metric === 'CLS') {
    return p75 <= 0.1 ? 'good' : p75 <= 0.25 ? 'needs-improvement' : 'poor';
  }
  return 'unknown' as const;
}

function increment(map: Map<string, number>, key: string, amount = 1) {
  map.set(key, (map.get(key) || 0) + amount);
}

function sortedDimension(map: Map<string, number>, limit = 50) {
  return Array.from(map, ([name, sessions]) => ({ name, sessions }))
    .sort(
      (left, right) =>
        right.sessions - left.sessions || left.name.localeCompare(right.name)
    )
    .slice(0, limit);
}

/** Builds the admin report exclusively from events whose canonical path is /7. */
export function buildVisitorLinkAnalyticsDashboard(input: {
  range: ReportRange;
  events: VisitorLinkEventRow[];
  sessions: VisitorLinkSessionRow[];
  health?: VisitorLinkIngestHealthRow | null;
}) {
  const sessionById = new Map(input.sessions.map((session) => [session.id, session]));
  const scopedEvents = input.events.filter(
    (event) => event.path === VISITOR_ANALYTICS_TRACKED_PATH
  );
  const humanEvents = scopedEvents.filter(
    (event) => sessionById.get(event.session_id)?.traffic_class === 'human'
  );
  const humanMetrics = new Map<string, SessionMetric>();

  for (const event of humanEvents) {
    const session = sessionById.get(event.session_id);
    if (!session) continue;
    const metric = humanMetrics.get(session.id) || {
      session,
      eventCount: 0,
      pageViews: 0,
      engagementDurationMs: 0,
      conversions: 0,
    };
    metric.eventCount += 1;
    if (event.event_type === 'page_view') metric.pageViews += 1;
    if (event.event_type === 'heartbeat' || event.event_type === 'engagement') {
      metric.engagementDurationMs += Math.max(0, event.duration_ms || 0);
    }
    if (event.event_type === 'contact_submit' || event.event_type === 'conversion') {
      metric.conversions += 1;
    }
    humanMetrics.set(session.id, metric);
  }

  const metrics = Array.from(humanMetrics.values());
  const engagedMetrics = metrics.filter(
    (metric) =>
      metric.pageViews >= 2 ||
      metric.engagementDurationMs >= 10_000 ||
      metric.conversions > 0
  );
  const visitorCount = new Set(metrics.map((metric) => metric.session.visitor_id)).size;
  const pageViews = humanEvents.filter((event) => event.event_type === 'page_view');
  const engagementDurationMs = humanEvents
    .filter(
      (event) =>
        event.event_type === 'heartbeat' || event.event_type === 'engagement'
    )
    .reduce((sum, event) => sum + Math.max(0, event.duration_ms || 0), 0);

  const seriesState = new Map<
    string,
    {
      visitors: Set<string>;
      sessions: Set<string>;
      pageViews: number;
      conversions: number;
    }
  >();
  for (const day of reportingDays(input.range)) {
    seriesState.set(day, {
      visitors: new Set(),
      sessions: new Set(),
      pageViews: 0,
      conversions: 0,
    });
  }
  for (const event of humanEvents) {
    const session = sessionById.get(event.session_id);
    const day = reportingDay(event.occurred_at, input.range.timezone);
    const bucket = seriesState.get(day);
    if (!session || !bucket) continue;
    bucket.visitors.add(session.visitor_id);
    bucket.sessions.add(session.id);
    if (event.event_type === 'page_view') bucket.pageViews += 1;
    if (event.event_type === 'contact_submit' || event.event_type === 'conversion') {
      bucket.conversions += 1;
    }
  }

  const acquisitionState = new Map<
    string,
    {
      channel: string;
      source: string | null;
      medium: string | null;
      campaign: string | null;
      sessions: number;
      pageViews: number;
      conversions: number;
    }
  >();
  for (const metric of metrics) {
    const session = metric.session;
    const acquisition = {
      channel: channelFor(session),
      source: cleanText(session.source),
      medium: cleanText(session.medium),
      campaign: cleanText(session.campaign),
    };
    const key = JSON.stringify(acquisition);
    const current = acquisitionState.get(key) || {
      ...acquisition,
      sessions: 0,
      pageViews: 0,
      conversions: 0,
    };
    current.sessions += 1;
    current.pageViews += metric.pageViews;
    current.conversions += metric.conversions;
    acquisitionState.set(key, current);
  }

  const devices = new Map<string, number>();
  const deviceModels = new Map<string, number>();
  const browsers = new Map<string, number>();
  const browserVersions = new Map<string, number>();
  const operatingSystems = new Map<string, number>();
  const operatingSystemVersions = new Map<string, number>();
  const countries = new Map<string, { countryCode: string | null; countryName: string; sessions: number }>();
  const cities = new Map<string, { countryCode: string | null; region: string | null; city: string; sessions: number }>();
  const networks = new Map<string, { name: string; asn: string | null; isMobileNetwork: boolean | null; isProxy: boolean | null; isHosting: boolean | null; sessions: number }>();

  for (const metric of metrics) {
    const session = metric.session;
    const device = cleanText(session.device_type) || 'unknown';
    const browser = cleanText(session.browser_name) || 'unknown';
    const operatingSystem = cleanText(session.os_name) || 'unknown';
    increment(devices, device);
    increment(browsers, browser);
    increment(operatingSystems, operatingSystem);
    increment(
      deviceModels,
      [cleanText(session.device_brand), cleanText(session.device_model)]
        .filter(Boolean)
        .join(' ') || device
    );
    increment(
      browserVersions,
      [browser, cleanText(session.browser_version)].filter(Boolean).join(' ')
    );
    increment(
      operatingSystemVersions,
      [operatingSystem, cleanText(session.os_version)].filter(Boolean).join(' ')
    );

    const countryCode = cleanText(session.country_code);
    const countryName = cleanText(session.country_name) || countryCode || 'unknown';
    const countryKey = JSON.stringify([countryCode, countryName]);
    const country = countries.get(countryKey) || {
      countryCode,
      countryName,
      sessions: 0,
    };
    country.sessions += 1;
    countries.set(countryKey, country);

    const region = cleanText(session.region);
    const cityName = cleanText(session.city) || 'unknown';
    const cityKey = JSON.stringify([countryCode, region, cityName]);
    const city = cities.get(cityKey) || {
      countryCode,
      region,
      city: cityName,
      sessions: 0,
    };
    city.sessions += 1;
    cities.set(cityKey, city);

    if (session.isp_name || session.network_organization || session.asn) {
      const network = {
        name:
          cleanText(session.isp_name) ||
          cleanText(session.network_organization) ||
          'unknown',
        asn: cleanText(session.asn),
        isMobileNetwork: session.is_mobile_network,
        isProxy: session.is_proxy,
        isHosting: session.is_hosting,
      };
      const networkKey = JSON.stringify(network);
      const current = networks.get(networkKey) || { ...network, sessions: 0 };
      current.sessions += 1;
      networks.set(networkKey, current);
    }
  }

  const screenBuckets = new Map<string, number>();
  const eventCounts = new Map<string, number>();
  const interactionCounts = new Map<string, number>();
  const consentVersions = new Map<string, number>();
  const vitalValues = new Map<string, number[]>();

  for (const metric of metrics) {
    increment(
      consentVersions,
      cleanText(metric.session.consent_version) || 'unknown'
    );
  }
  for (const event of humanEvents) {
    increment(eventCounts, event.event_type);
    if (event.event_type === 'page_view') {
      increment(screenBuckets, cleanText(event.screen_bucket) || 'unknown');
    }
    const session = sessionById.get(event.session_id);
    const interactionAllowed =
      event.event_type === 'engagement' &&
      session?.device_type === 'mobile' &&
      ((event.content_type === 'profile_interaction' &&
        PROFILE_INTERACTIONS.has(event.content_key || '')) ||
        (event.content_type === 'screen_interaction' &&
          SCREEN_INTERACTIONS.has(event.content_key || '')));
    if (interactionAllowed && event.content_key) {
      increment(interactionCounts, event.content_key);
    }
    if (event.event_type === 'web_vital') {
      const metricName = String(
        event.properties?.metric_name || event.content_key || ''
      ).toUpperCase();
      const rawValue = Math.max(0, event.duration_ms || 0);
      if (['LCP', 'INP', 'CLS', 'FCP', 'TTFB'].includes(metricName)) {
        const values = vitalValues.get(metricName) || [];
        values.push(metricName === 'CLS' ? rawValue / 1000 : rawValue);
        vitalValues.set(metricName, values);
      }
    }
  }

  const conversions = metrics.reduce((sum, metric) => sum + metric.conversions, 0);
  const botSessions = new Set(
    scopedEvents
      .filter((event) =>
        ['suspected_bot', 'verified_bot'].includes(
          sessionById.get(event.session_id)?.traffic_class || ''
        )
      )
      .map((event) => event.session_id)
  ).size;

  return {
    range: input.range,
    summary: {
      visitors: visitorCount,
      sessions: metrics.length,
      pageViews: pageViews.length,
      engagedSessions: engagedMetrics.length,
      engagementRate: rounded(
        metrics.length ? (engagedMetrics.length / metrics.length) * 100 : 0
      ),
      avgEngagementSeconds: rounded(
        metrics.length ? engagementDurationMs / metrics.length / 1000 : 0
      ),
      conversions,
    },
    series: Array.from(seriesState, ([bucket, value]) => ({
      bucket,
      visitors: value.visitors.size,
      sessions: value.sessions.size,
      pageViews: value.pageViews,
      conversions: value.conversions,
    })),
    topPages:
      pageViews.length > 0
        ? [
            {
              path: VISITOR_ANALYTICS_TRACKED_PATH,
              pageViews: pageViews.length,
              sessions: new Set(pageViews.map((event) => event.session_id)).size,
              exits: new Set(pageViews.map((event) => event.session_id)).size,
              avgEngagementSeconds: rounded(
                metrics.length ? engagementDurationMs / metrics.length / 1000 : 0
              ),
            },
          ]
        : [],
    acquisition: Array.from(acquisitionState.values())
      .sort(
        (left, right) =>
          right.sessions - left.sessions ||
          right.pageViews - left.pageViews ||
          left.channel.localeCompare(right.channel)
      )
      .slice(0, 100),
    technology: {
      devices: sortedDimension(devices, 25),
      deviceModels: sortedDimension(deviceModels),
      browsers: sortedDimension(browsers, 25),
      browserVersions: sortedDimension(browserVersions),
      operatingSystems: sortedDimension(operatingSystems, 25),
      operatingSystemVersions: sortedDimension(operatingSystemVersions),
      screenBuckets: Array.from(screenBuckets, ([name, count]) => ({
        name,
        pageViews: count,
      })).sort(
        (left, right) =>
          right.pageViews - left.pageViews || left.name.localeCompare(right.name)
      ),
    },
    geography: {
      countries: Array.from(countries.values())
        .sort(
          (left, right) =>
            right.sessions - left.sessions ||
            left.countryName.localeCompare(right.countryName)
        )
        .slice(0, 100),
      cities: Array.from(cities.values())
        .sort(
          (left, right) =>
            right.sessions - left.sessions || left.city.localeCompare(right.city)
        )
        .slice(0, 100),
      networks: Array.from(networks.values())
        .sort(
          (left, right) =>
            right.sessions - left.sessions || left.name.localeCompare(right.name)
        )
        .slice(0, 100),
    },
    events: Array.from(eventCounts, ([eventType, count]) => ({ eventType, count }))
      .sort(
        (left, right) =>
          right.count - left.count || left.eventType.localeCompare(right.eventType)
      )
      .slice(0, 25),
    interactionEvents: Array.from(
      interactionCounts,
      ([interactionKey, count]) => ({ interactionKey, count })
    ).sort(
      (left, right) =>
        right.count - left.count ||
        left.interactionKey.localeCompare(right.interactionKey)
    ),
    webVitals: Array.from(vitalValues, ([metric, values]) => {
      const p75 = percentile75(values);
      return {
        metric,
        p75: rounded(p75, 3),
        rating: vitalRating(metric, p75, values.length),
        measurements: values.length,
      };
    }).sort((left, right) =>
      ['LCP', 'INP', 'CLS', 'FCP', 'TTFB'].indexOf(left.metric) -
      ['LCP', 'INP', 'CLS', 'FCP', 'TTFB'].indexOf(right.metric)
    ),
    quality: {
      humanSessions: metrics.length,
      botSessions,
      consentVersions: sortedDimension(consentVersions, 25).map(
        ({ name: version, sessions }) => ({ version, sessions })
      ),
      lateEvents: humanEvents.filter(
        (event) =>
          Date.parse(event.received_at) >
          Date.parse(event.occurred_at) + 5 * 60 * 1000
      ).length,
      duplicateEvents: Math.max(0, input.health?.duplicate_events || 0),
      rejectedEvents: Math.max(0, input.health?.rejected_events || 0),
      counterScope: 'all-time' as const,
      lastSuccessAt: input.health?.last_success_at || null,
    },
  };
}
