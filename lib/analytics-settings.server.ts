import 'server-only';
import {
  hasSupabaseServiceRole,
  serverSupabase,
} from '@/lib/supabase/server';

const ANALYTICS_SWITCH_CACHE_MS = 5_000;
let cachedSwitch: { value: boolean; expiresAt: number } | null = null;
let switchReadInFlight: Promise<boolean> | null = null;
let cachedRuntimeReady: { value: boolean; expiresAt: number } | null = null;
let runtimeReadInFlight: Promise<boolean> | null = null;

export async function readAnalyticsCmsEnabled(): Promise<boolean> {
  if (!serverSupabase || !hasSupabaseServiceRole) {
    throw new Error('ANALYTICS_STORAGE_UNAVAILABLE');
  }

  const now = Date.now();
  if (cachedSwitch && cachedSwitch.expiresAt > now) {
    return cachedSwitch.value;
  }
  if (switchReadInFlight) return switchReadInFlight;

  switchReadInFlight = (async () => {
    const { data, error } = await serverSupabase
      .from('seo_site_settings')
      .select('enable_analytics')
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      throw new Error(
        `ANALYTICS_CONFIGURATION_UNAVAILABLE:${error?.code || 'MISSING_ROW'}`
      );
    }

    const value = data.enable_analytics === true;
    cachedSwitch = {
      value,
      expiresAt: Date.now() + ANALYTICS_SWITCH_CACHE_MS,
    };
    return value;
  })();

  try {
    return await switchReadInFlight;
  } finally {
    switchReadInFlight = null;
  }
}

export async function readAnalyticsRuntimeEnabled(): Promise<boolean> {
  if (
    process.env.ANALYTICS_V2_INGEST !== 'true' ||
    process.env.VERCEL_ENV === 'preview' ||
    !serverSupabase ||
    !hasSupabaseServiceRole
  ) {
    return false;
  }

  let cmsEnabled = false;
  try {
    cmsEnabled = await readAnalyticsCmsEnabled();
  } catch {
    return false;
  }
  if (!cmsEnabled) return false;

  const now = Date.now();
  if (cachedRuntimeReady && cachedRuntimeReady.expiresAt > now) {
    return cachedRuntimeReady.value;
  }
  if (runtimeReadInFlight) return runtimeReadInFlight;

  runtimeReadInFlight = (async () => {
    const { data, error } = await serverSupabase
      .from('analytics_ingest_health')
      .select('id')
      .eq('id', 1)
      .maybeSingle();
    const value = !error && data?.id === 1;
    cachedRuntimeReady = {
      value,
      expiresAt: Date.now() + ANALYTICS_SWITCH_CACHE_MS,
    };
    return value;
  })();

  try {
    return await runtimeReadInFlight;
  } finally {
    runtimeReadInFlight = null;
  }
}
