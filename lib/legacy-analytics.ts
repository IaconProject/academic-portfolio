import { VisitorSession } from '@/lib/types';

export const LEGACY_ANALYTICS_SOURCES = [
  'visitor_sessions',
  'visitor_logs',
] as const;

export type LegacyAnalyticsSource =
  (typeof LEGACY_ANALYTICS_SOURCES)[number];

export type LegacyRecordReference = {
  source: LegacyAnalyticsSource;
  sourceId: string;
};

export function cleanLegacyText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function maskLegacyIpAddress(value: unknown): string {
  const ip = cleanLegacyText(value);
  if (!ip) return '';

  if (ip.includes(':')) {
    const segments = ip.split(':').filter(Boolean);
    return segments.length > 0
      ? `${segments.slice(0, 3).join(':')}::`
      : '::';
  }

  const segments = ip.split('.');
  if (segments.length === 4) {
    return `${segments[0]}.${segments[1]}.x.x`;
  }
  return 'masked';
}

export function encodeLegacyRecordId(
  source: LegacyAnalyticsSource,
  sourceId: unknown
): string {
  return `${source}:${cleanLegacyText(sourceId)}`;
}

export function parseLegacyRecordId(
  value: unknown
): LegacyRecordReference | null {
  const id = cleanLegacyText(value);
  if (!id || id.length > 512) return null;

  for (const source of LEGACY_ANALYTICS_SOURCES) {
    const prefix = `${source}:`;
    if (id.startsWith(prefix)) {
      const sourceId = id.slice(prefix.length).trim();
      return sourceId ? { source, sourceId } : null;
    }
  }

  // Backward compatibility for an admin tab that was opened before this
  // release. The former API returned visitor_sessions.id without a prefix.
  if (!id.includes(':')) {
    return { source: 'visitor_sessions', sourceId: id };
  }
  return null;
}

function normalizeDeviceType(
  value: unknown
): VisitorSession['deviceType'] {
  const deviceType = cleanLegacyText(value);
  return ['Desktop', 'Mobile', 'Tablet'].includes(deviceType)
    ? (deviceType as VisitorSession['deviceType'])
    : ('' as VisitorSession['deviceType']);
}

/**
 * Maps the retired session collector without inventing missing enrichment.
 * The API only returns a masked network identifier and never exposes the
 * stored raw IP or raw User-Agent to the browser.
 */
export function mapLegacySessionRow(
  row: Record<string, unknown>
): VisitorSession {
  const sourceId = cleanLegacyText(row.id);
  return {
    id: encodeLegacyRecordId('visitor_sessions', sourceId),
    sessionId: cleanLegacyText(row.session_id ?? row.sessionId),
    legacySource: 'visitor_sessions',
    legacySourceId: sourceId,
    ip: maskLegacyIpAddress(row.ip),
    country: cleanLegacyText(row.country),
    countryCode: cleanLegacyText(row.country_code ?? row.countryCode),
    city: cleanLegacyText(row.city),
    region: cleanLegacyText(row.region),
    isp: cleanLegacyText(row.isp),
    isMobileNetwork: Boolean(
      row.is_mobile_network ?? row.isMobileNetwork
    ),
    deviceBrand: cleanLegacyText(row.device_brand ?? row.deviceBrand),
    deviceModel: cleanLegacyText(row.device_model ?? row.deviceModel),
    deviceType: normalizeDeviceType(row.device_type ?? row.deviceType),
    osName: cleanLegacyText(row.os_name ?? row.osName),
    osVersion: cleanLegacyText(row.os_version ?? row.osVersion),
    browserName: cleanLegacyText(row.browser_name ?? row.browserName),
    browserVersion: cleanLegacyText(
      row.browser_version ?? row.browserVersion
    ),
    userAgent: '',
    lat: typeof row.lat === 'number' ? row.lat : 0,
    lon: typeof row.lon === 'number' ? row.lon : 0,
    pages: Array.isArray(row.pages) ? row.pages : [],
    createdAt: cleanLegacyText(row.created_at ?? row.createdAt),
    updatedAt: cleanLegacyText(row.updated_at ?? row.updatedAt),
  };
}

/** Converts one row from the original page-view collector into a one-step
 * historical session so both generations can be reviewed in one read model. */
export function mapLegacyLogRow(
  row: Record<string, unknown>
): VisitorSession {
  const sourceId = cleanLegacyText(row.id);
  const timestamp = cleanLegacyText(row.created_at ?? row.timestamp);
  const path = cleanLegacyText(row.page_path ?? row.pagePath) || '/';

  return {
    id: encodeLegacyRecordId('visitor_logs', sourceId),
    sessionId: encodeLegacyRecordId('visitor_logs', sourceId),
    legacySource: 'visitor_logs',
    legacySourceId: sourceId,
    ip: maskLegacyIpAddress(row.ip_address ?? row.ipAddress),
    country: cleanLegacyText(row.country),
    countryCode: cleanLegacyText(row.country_code ?? row.countryCode),
    city: cleanLegacyText(row.city),
    region: cleanLegacyText(row.region),
    isp: cleanLegacyText(row.isp),
    isMobileNetwork: Boolean(
      row.is_mobile_network ?? row.isMobileNetwork
    ),
    deviceBrand: cleanLegacyText(row.device_brand ?? row.deviceBrand),
    deviceModel: cleanLegacyText(row.device_model ?? row.deviceModel),
    deviceType: normalizeDeviceType(row.device_type ?? row.deviceType),
    osName: cleanLegacyText(row.os_name ?? row.osName),
    osVersion: cleanLegacyText(row.os_version ?? row.osVersion),
    browserName: cleanLegacyText(row.browser_name ?? row.browserName),
    browserVersion: cleanLegacyText(
      row.browser_version ?? row.browserVersion
    ),
    userAgent: '',
    lat: 0,
    lon: 0,
    pages: [
      {
        path,
        title: 'Tarihî sayfa görüntüleme',
        timestamp,
      },
    ],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function isKnown(value: string): boolean {
  const normalized = value.trim().toLocaleLowerCase('tr-TR');
  return Boolean(
    normalized &&
      normalized !== 'bilinmiyor' &&
      normalized !== 'bilinmeyen' &&
      normalized !== 'bilinmeyen operatör' &&
      normalized !== 'unknown' &&
      normalized !== '—'
  );
}

export function buildLegacyStats(sessions: VisitorSession[]) {
  let storedPageSteps = 0;
  const fifteenMinsAgo = Date.now() - 15 * 60 * 1000;
  let activeLast15Minutes = 0;

  const cityCounts: Record<string, number> = {};
  const countryCounts: Record<string, number> = {};
  const deviceCounts: Record<string, number> = {};
  const browserCounts: Record<string, number> = {};
  const ispCounts: Record<string, number> = {};
  const pageCounts: Record<string, number> = {};

  sessions.forEach((session) => {
    const steps = Array.isArray(session.pages) ? session.pages : [];
    storedPageSteps += steps.length;

    const updatedTime = new Date(
      session.updatedAt || session.createdAt
    ).getTime();
    if (Number.isFinite(updatedTime) && updatedTime >= fifteenMinsAgo) {
      activeLast15Minutes += 1;
    }

    if (isKnown(session.city)) {
      cityCounts[session.city] = (cityCounts[session.city] || 0) + 1;
    }
    if (isKnown(session.country)) {
      countryCounts[session.country] =
        (countryCounts[session.country] || 0) + 1;
    }
    if (isKnown(session.isp)) {
      ispCounts[session.isp] = (ispCounts[session.isp] || 0) + 1;
    }

    const deviceParts = [session.deviceBrand, session.deviceType].filter(
      isKnown
    );
    if (deviceParts.length > 0) {
      const label =
        deviceParts.length === 2
          ? `${deviceParts[0]} (${deviceParts[1]})`
          : deviceParts[0];
      deviceCounts[label] = (deviceCounts[label] || 0) + 1;
    }

    const browserParts = [session.browserName, session.osName].filter(
      isKnown
    );
    if (browserParts.length > 0) {
      const label =
        browserParts.length === 2
          ? `${browserParts[0]} (${browserParts[1]})`
          : browserParts[0];
      browserCounts[label] = (browserCounts[label] || 0) + 1;
    }

    steps.forEach((step) => {
      const path = cleanLegacyText(step?.path) || '/';
      pageCounts[path] = (pageCounts[path] || 0) + 1;
    });
  });

  const getTop = (values: Record<string, number>, limit = 5) =>
    Object.entries(values)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

  return {
    storedPageSteps,
    legacyPageHistoryTruncated: sessions.some(
      (session) => (session.pages || []).length >= 100
    ),
    recordedLegacySessions: sessions.length,
    activeLast15Minutes,
    topCities: getTop(cityCounts),
    topCountries: getTop(countryCounts),
    topDevices: getTop(deviceCounts),
    topBrowsers: getTop(browserCounts),
    topISPs: getTop(ispCounts),
    topPages: getTop(pageCounts),
  };
}
