export const ANALYTICS_COLLECTION_MODES = [
  'consent-required',
  'first-party-analytics',
] as const;

export type AnalyticsCollectionMode =
  (typeof ANALYTICS_COLLECTION_MODES)[number];

export const ANALYTICS_AUTHORIZATION_BASES = [
  'consent',
  'first-party-analytics',
] as const;

export type AnalyticsAuthorizationBasis =
  (typeof ANALYTICS_AUTHORIZATION_BASES)[number];

export function normalizeAnalyticsCountryCode(
  value: string | null | undefined
): string | null {
  const normalized = value?.trim().toUpperCase() || '';
  return /^[A-Z]{2}$/.test(normalized) ? normalized : null;
}

/**
 * Turkey's KVKK cookie guide treats narrowly scoped, first-party audience and
 * performance measurement as a Criterion B use. Every unknown or other
 * country deliberately falls back to explicit consent.
 */
export function analyticsCollectionModeForCountry(
  countryCode: string | null | undefined
): AnalyticsCollectionMode {
  return normalizeAnalyticsCountryCode(countryCode) === 'TR'
    ? 'first-party-analytics'
    : 'consent-required';
}

/** Vercel overwrites this header at the platform boundary. Never trust a
 * caller-supplied geo header outside the Vercel runtime. */
export function trustedAnalyticsCountryCode(
  request: Request,
  isVercelRuntime = process.env.VERCEL === '1'
): string | null {
  if (!isVercelRuntime) return null;
  return normalizeAnalyticsCountryCode(
    request.headers.get('x-vercel-ip-country')
  );
}

export function analyticsCollectionModeForRequest(
  request: Request,
  isVercelRuntime = process.env.VERCEL === '1'
): AnalyticsCollectionMode {
  return analyticsCollectionModeForCountry(
    trustedAnalyticsCountryCode(request, isVercelRuntime)
  );
}

export function analyticsAuthorizationVersion(
  policyVersion: string,
  basis: AnalyticsAuthorizationBasis
): string {
  return `${policyVersion}:${basis}`;
}

export function analyticsAuthorizationBasisFromVersion(
  value: string,
  policyVersion: string
): AnalyticsAuthorizationBasis | null {
  for (const basis of ANALYTICS_AUTHORIZATION_BASES) {
    if (value === analyticsAuthorizationVersion(policyVersion, basis)) {
      return basis;
    }
  }
  return null;
}
