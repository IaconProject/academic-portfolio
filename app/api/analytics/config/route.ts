import { NextResponse } from 'next/server';
import {
  ANALYTICS_CONSENT_POLICY_VERSION,
  ANALYTICS_SCHEMA_VERSION,
} from '@/lib/analytics-contract';
import { readAnalyticsRuntimeEnabled } from '@/lib/analytics-settings.server';
import { analyticsCollectionModeForRequest } from '@/lib/analytics-consent-policy';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  'X-Robots-Tag': 'noindex, nofollow',
  Vary: 'X-Vercel-IP-Country',
};

export async function GET(request: Request) {
  try {
    const enabled = await readAnalyticsRuntimeEnabled();
    const collectionMode = analyticsCollectionModeForRequest(request);
    return NextResponse.json(
      {
        success: true,
        data: {
          enabled,
          collectionMode,
          schemaVersion: ANALYTICS_SCHEMA_VERSION,
          consentVersion: ANALYTICS_CONSENT_POLICY_VERSION,
          checkedAt: new Date().toISOString(),
        },
      },
      { headers: HEADERS }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'ANALYTICS_CONFIGURATION_UNAVAILABLE',
          message: 'Analitik çalışma durumu doğrulanamadı.',
        },
      },
      { status: 503, headers: HEADERS }
    );
  }
}
