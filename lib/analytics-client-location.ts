'use client';

import type { AnalyticsBrowserGeo } from './analytics-contract';

export const ANALYTICS_LOCATION_SESSION_KEY =
  'analytics_coarse_location_v2';

const MAX_POSITION_AGE_MS = 5 * 60 * 1000;
let volatileGeo: AnalyticsBrowserGeo | null = null;

function normalizeGeo(
  value: Partial<AnalyticsBrowserGeo> | null | undefined
): AnalyticsBrowserGeo | null {
  if (
    value?.source !== 'browser-geolocation' ||
    !Number.isFinite(value.latitude) ||
    !Number.isFinite(value.longitude) ||
    !Number.isFinite(value.accuracyMeters) ||
    Number(value.latitude) < -90 ||
    Number(value.latitude) > 90 ||
    Number(value.longitude) < -180 ||
    Number(value.longitude) > 180 ||
    Number(value.accuracyMeters) < 0 ||
    Number(value.accuracyMeters) > 100_000
  ) {
    return null;
  }

  return {
    source: 'browser-geolocation',
    // Roughly one-kilometre precision: sufficient for province/district
    // inference while avoiding unnecessary coordinate detail in transit.
    latitude: Number(Number(value.latitude).toFixed(2)),
    longitude: Number(Number(value.longitude).toFixed(2)),
    accuracyMeters: Math.round(Number(value.accuracyMeters)),
  };
}

function readCachedGeo(): AnalyticsBrowserGeo | null {
  if (volatileGeo) return volatileGeo;
  try {
    const raw = sessionStorage.getItem(ANALYTICS_LOCATION_SESSION_KEY);
    const parsed = raw
      ? (JSON.parse(raw) as Partial<AnalyticsBrowserGeo>)
      : null;
    volatileGeo = normalizeGeo(parsed);
    return volatileGeo;
  } catch {
    return null;
  }
}

function rememberGeo(geo: AnalyticsBrowserGeo): AnalyticsBrowserGeo {
  volatileGeo = geo;
  try {
    sessionStorage.setItem(
      ANALYTICS_LOCATION_SESSION_KEY,
      JSON.stringify(geo)
    );
  } catch {
    // The current page can still use the volatile value.
  }
  return geo;
}

function currentPosition(): Promise<AnalyticsBrowserGeo | null> {
  if (!navigator.geolocation) return Promise.resolve(null);

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const geo = normalizeGeo({
          source: 'browser-geolocation',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
        });
        resolve(geo ? rememberGeo(geo) : null);
      },
      () => resolve(null),
      {
        enableHighAccuracy: true,
        timeout: 5_000,
        maximumAge: MAX_POSITION_AGE_MS,
      }
    );
  });
}

/** Reads device location only when permission was granted before this call. */
export async function getGrantedAnalyticsBrowserGeo(): Promise<AnalyticsBrowserGeo | null> {
  if (typeof window === 'undefined') return null;
  const cached = readCachedGeo();

  if (!navigator.geolocation || !navigator.permissions?.query) {
    return cached;
  }

  try {
    const permission = await navigator.permissions.query({
      name: 'geolocation',
    });
    if (permission.state !== 'granted') return cached;
    return (await currentPosition()) || cached;
  } catch {
    return cached;
  }
}

/**
 * Called directly from a real user gesture. The browser remains the authority:
 * it displays its native permission UI and a denial produces no retry loop.
 */
export function requestAnalyticsBrowserGeoFromUserGesture(): Promise<AnalyticsBrowserGeo | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  return currentPosition();
}

export function clearAnalyticsBrowserGeo(): void {
  volatileGeo = null;
  try {
    sessionStorage.removeItem(ANALYTICS_LOCATION_SESSION_KEY);
  } catch {
    // Session storage is optional.
  }
}
