import { isIP } from 'node:net';
import { z } from 'zod';
import type { AnalyticsRequestContext } from './analytics';
import {
  normalizeTurkeyProvinceRegion,
  resolveTurkeyNetworkProvince,
} from './analytics-turkey-geo';

const IP_API_FIELDS = [
  'status',
  'message',
  'country',
  'countryCode',
  'region',
  'regionName',
  'city',
  'lat',
  'lon',
  'isp',
  'org',
  'as',
  'mobile',
  'proxy',
  'hosting',
].join(',');

const ipApiPayloadSchema = z
  .object({
    status: z.enum(['success', 'fail']),
    message: z.string().optional(),
    country: z.string().optional(),
    countryCode: z.string().optional(),
    region: z.string().optional(),
    regionName: z.string().optional(),
    city: z.string().optional(),
    lat: z.number().finite().min(-90).max(90).optional(),
    lon: z.number().finite().min(-180).max(180).optional(),
    isp: z.string().optional(),
    org: z.string().optional(),
    as: z.string().optional(),
    mobile: z.boolean().optional(),
    proxy: z.boolean().optional(),
    hosting: z.boolean().optional(),
  })
  .passthrough();

export type AnalyticsIpGeoResolution = {
  countryCode: string;
  countryName: string | null;
  region: string | null;
  city: string | null;
  ispName: string | null;
  networkOrganization: string | null;
  asn: string | null;
  isMobileNetwork: boolean | null;
  isProxy: boolean | null;
  isHosting: boolean | null;
  confidence: 'medium' | 'low';
};

function cleanText(value: string | null | undefined, max: number) {
  return (value || '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function normalizedAsn(value: string | null | undefined): string | null {
  const match = cleanText(value, 160).match(/^AS(\d{1,10})(?:\s|$)/i);
  return match ? `AS${match[1]}` : null;
}

function networkOrganization(value: string | null | undefined) {
  const cleaned = cleanText(value, 160).replace(/^AS\d{1,10}\s*/i, '');
  return cleaned || null;
}

/**
 * Rejects local, documentation, multicast and other non-routable addresses.
 * Only a Vercel-overwritten forwarding header reaches this check in production.
 */
export function isPublicAnalyticsIp(value: string): boolean {
  const ip = value.trim().replace(/^::ffff:/, '');
  const version = isIP(ip);
  if (!version) return false;

  if (version === 4) {
    const octets = ip.split('.').map(Number);
    const [a, b] = octets;
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 0 && octets[2] === 2) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      (a === 198 && b === 51) ||
      (a === 203 && b === 0 && octets[2] === 113) ||
      a >= 224
    );
  }

  const folded = ip.toLowerCase();
  return !(
    folded === '::' ||
    folded === '::1' ||
    folded.startsWith('fc') ||
    folded.startsWith('fd') ||
    /^fe[89ab]/.test(folded) ||
    folded.startsWith('ff') ||
    folded.startsWith('2001:db8:')
  );
}

export function buildIpApiUrl(ip: string, apiKey?: string): string {
  if (!isPublicAnalyticsIp(ip)) throw new Error('IP_API_INVALID_IP');
  const key = apiKey?.trim();
  const endpoint = key
    ? `https://pro.ip-api.com/json/${encodeURIComponent(ip)}`
    : `http://ip-api.com/json/${encodeURIComponent(ip)}`;
  const url = new URL(endpoint);
  url.searchParams.set('fields', IP_API_FIELDS);
  if (key) url.searchParams.set('key', key);
  return url.toString();
}

/**
 * Reduces an ip-api response before it can cross the persistence boundary.
 * The response's query/IP and coordinates are intentionally absent from the
 * returned type. Coordinates are used only transiently as a last-resort
 * Türkiye province estimate.
 */
export function parseIpApiResolution(
  input: unknown
): AnalyticsIpGeoResolution | null {
  const parsed = ipApiPayloadSchema.safeParse(input);
  if (!parsed.success || parsed.data.status !== 'success') return null;

  const countryCode = cleanText(parsed.data.countryCode, 8).toUpperCase();
  if (!/^[A-Z]{2}$/.test(countryCode)) return null;

  const rawCountry = cleanText(parsed.data.country, 128);
  let region = cleanText(parsed.data.regionName, 128) || null;
  let city = cleanText(parsed.data.city, 128) || null;
  let confidence: 'medium' | 'low' =
    region || city ? 'medium' : 'low';

  if (countryCode === 'TR') {
    const normalizedRegion =
      normalizeTurkeyProvinceRegion(region) ||
      normalizeTurkeyProvinceRegion(parsed.data.region) ||
      normalizeTurkeyProvinceRegion(city);
    const coordinateResolution =
      normalizedRegion ||
      parsed.data.lat === undefined ||
      parsed.data.lon === undefined
        ? null
        : resolveTurkeyNetworkProvince(parsed.data.lat, parsed.data.lon);
    region = normalizedRegion || coordinateResolution?.province || null;
    confidence = normalizedRegion ? 'medium' : 'low';
    const cityAsProvince = city
      ? normalizeTurkeyProvinceRegion(city)
      : null;
    if (cityAsProvince && region) city = null;
  }

  const organization = networkOrganization(parsed.data.org || parsed.data.as);
  // Mobile carrier gateways, proxies and hosting networks can resolve to a
  // perfectly valid network location that is still far from the person using
  // it. Keep the useful province/city signal but label it conservatively.
  if (parsed.data.mobile || parsed.data.proxy || parsed.data.hosting) {
    confidence = 'low';
  }
  return {
    countryCode,
    countryName: countryCode === 'TR' ? 'Türkiye' : rawCountry || null,
    region,
    city,
    ispName: cleanText(parsed.data.isp, 160) || null,
    networkOrganization: organization,
    asn: normalizedAsn(parsed.data.as),
    isMobileNetwork:
      typeof parsed.data.mobile === 'boolean' ? parsed.data.mobile : null,
    isProxy: typeof parsed.data.proxy === 'boolean' ? parsed.data.proxy : null,
    isHosting:
      typeof parsed.data.hosting === 'boolean' ? parsed.data.hosting : null,
    confidence,
  };
}

export function mergeAnalyticsIpGeo(
  base: AnalyticsRequestContext,
  resolution: AnalyticsIpGeoResolution
): AnalyticsRequestContext {
  const countriesAgree =
    !base.country_code || base.country_code === resolution.countryCode;
  const hasProviderGeo = Boolean(resolution.region || resolution.city);
  const hasProviderNetwork = Boolean(
    resolution.ispName || resolution.networkOrganization || resolution.asn
  );

  if (!countriesAgree) {
    return {
      ...base,
      ...(hasProviderNetwork
        ? {
            isp_name: resolution.ispName || undefined,
            network_organization:
              resolution.networkOrganization || undefined,
            asn: resolution.asn || undefined,
            is_mobile_network: resolution.isMobileNetwork ?? undefined,
            is_proxy: resolution.isProxy ?? undefined,
            is_hosting: resolution.isHosting ?? undefined,
          }
        : {}),
    };
  }

  const combinedSource = base.geo_source
    ? 'vercel-edge+ip-api'
    : 'ip-api';
  const baseRegion = normalizeTurkeyProvinceRegion(base.region);
  const providerRegion = normalizeTurkeyProvinceRegion(resolution.region);
  const sourcesDisagree = Boolean(
    base.country_code === 'TR' &&
      baseRegion &&
      providerRegion &&
      baseRegion !== providerRegion
  );
  const mergedConfidence = sourcesDisagree
    ? 'low'
    : resolution.confidence;
  return {
    ...base,
    country_code: resolution.countryCode,
    country_name:
      resolution.countryName || base.country_name || resolution.countryCode,
    ...(resolution.region ? { region: resolution.region } : {}),
    // Once the provider supplies a normalized province, do not retain an
    // unrelated Vercel city when the provider has no city-level signal.
    ...(resolution.region
      ? { city: resolution.city || undefined }
      : resolution.city
        ? { city: resolution.city }
        : {}),
    ...(hasProviderGeo || hasProviderNetwork
      ? {
          geo_source: combinedSource,
          geo_confidence: hasProviderGeo
            ? mergedConfidence
            : base.geo_confidence || 'low',
        }
      : {}),
    isp_name: resolution.ispName || undefined,
    network_organization: resolution.networkOrganization || undefined,
    asn: resolution.asn || undefined,
    is_mobile_network: resolution.isMobileNetwork ?? undefined,
    is_proxy: resolution.isProxy ?? undefined,
    is_hosting: resolution.isHosting ?? undefined,
  };
}
