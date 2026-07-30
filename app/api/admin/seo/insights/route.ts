import { google } from 'googleapis';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { unstable_cache } from 'next/cache';
import {
  apiError,
  apiSuccess,
  rejectUnauthorized,
} from '@/lib/admin-api';
import { getSiteUrl } from '@/lib/seo';
import { getSeoExperienceData } from '@/lib/seo-repository';

export const dynamic = 'force-dynamic';

function credentials() {
  const client_email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
  const private_key = (
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || ''
  ).replace(/\\n/g, '\n');
  return client_email && private_key ? { client_email, private_key } : null;
}

async function loadInsights(days: number) {
  const creds = credentials();
  const siteData = await getSeoExperienceData();
  const gscProperty =
    process.env.GOOGLE_SEARCH_CONSOLE_PROPERTY ||
    siteData.seoSettings.gscProperty ||
    'sc-domain:muhammedakan.com';
  const ga4Property =
    process.env.GA4_PROPERTY_ID || siteData.seoSettings.ga4PropertyId || '';
  if (!creds) {
    return {
      connected: false,
      gsc: { connected: false, property: gscProperty, rows: [] },
      ga4: { connected: false, property: ga4Property, rows: [] },
      message:
        'Google service account bilgileri tanımlandığında raporlar burada görünecek.',
    };
  }

  const end = new Date();
  end.setDate(end.getDate() - 2);
  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);
  const asDate = (value: Date) => value.toISOString().slice(0, 10);
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });

  let gsc: Record<string, unknown> = {
    connected: false,
    property: gscProperty,
    rows: [],
  };
  try {
    const client = google.searchconsole({ version: 'v1', auth });
    const [summary, queries] = await Promise.all([
      client.searchanalytics.query({
        siteUrl: gscProperty,
        requestBody: {
          startDate: asDate(start),
          endDate: asDate(end),
          dimensions: ['date'],
          rowLimit: 250,
        },
      }),
      client.searchanalytics.query({
        siteUrl: gscProperty,
        requestBody: {
          startDate: asDate(start),
          endDate: asDate(end),
          dimensions: ['query', 'page'],
          rowLimit: 100,
        },
      }),
    ]);
    const summaryRows = summary.data.rows || [];
    const totals = summaryRows.reduce<{
      clicks: number;
      impressions: number;
      weightedPosition: number;
    }>(
      (result, row) => ({
        clicks: result.clicks + Number(row.clicks || 0),
        impressions: result.impressions + Number(row.impressions || 0),
        weightedPosition:
          result.weightedPosition +
          Number(row.position || 0) * Number(row.impressions || 0),
      }),
      { clicks: 0, impressions: 0, weightedPosition: 0 }
    );
    gsc = {
      connected: true,
      property: gscProperty,
      startDate: asDate(start),
      endDate: asDate(end),
      totals: {
        clicks: totals.clicks,
        impressions: totals.impressions,
        ctr: totals.impressions ? totals.clicks / totals.impressions : 0,
        position: totals.impressions
          ? totals.weightedPosition / totals.impressions
          : 0,
      },
      timeline: summaryRows,
      rows: queries.data.rows || [],
    };
  } catch (error) {
    gsc = {
      connected: false,
      property: gscProperty,
      rows: [],
      error: error instanceof Error ? error.message : 'GSC bağlantı hatası',
    };
  }

  let ga4: Record<string, unknown> = {
    connected: false,
    property: ga4Property,
    rows: [],
  };
  if (ga4Property) {
    try {
      const analytics = new BetaAnalyticsDataClient({ credentials: creds });
      const [response] = await analytics.runReport({
        property: `properties/${ga4Property}`,
        dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [
          { name: 'activeUsers' },
          { name: 'sessions' },
          { name: 'engagementRate' },
        ],
        limit: 100,
      });
      ga4 = {
        connected: true,
        property: ga4Property,
        rows: (response.rows || []).map((row) => ({
          pagePath: row.dimensionValues?.[0]?.value || '/',
          activeUsers: Number(row.metricValues?.[0]?.value || 0),
          sessions: Number(row.metricValues?.[1]?.value || 0),
          engagementRate: Number(row.metricValues?.[2]?.value || 0),
        })),
        totals: (response.rows || []).reduce(
          (totals, row) => ({
            activeUsers:
              totals.activeUsers +
              Number(row.metricValues?.[0]?.value || 0),
            sessions:
              totals.sessions + Number(row.metricValues?.[1]?.value || 0),
          }),
          { activeUsers: 0, sessions: 0 }
        ),
      };
    } catch (error) {
      ga4 = {
        connected: false,
        property: ga4Property,
        rows: [],
        error: error instanceof Error ? error.message : 'GA4 bağlantı hatası',
      };
    }
  }

  return { connected: Boolean((gsc as any).connected || (ga4 as any).connected), gsc, ga4 };
}

export async function GET(request: Request) {
  const unauthorized = rejectUnauthorized(request);
  if (unauthorized) return unauthorized;
  const requested = Number(new URL(request.url).searchParams.get('range') || 28);
  const days = [7, 28, 90].includes(requested) ? requested : 28;
  const cached = unstable_cache(
    () => loadInsights(days),
    [`seo-google-insights-${days}`],
    { revalidate: 21600, tags: ['seo-insights'] }
  );
  return apiSuccess(await cached());
}

export async function POST(request: Request) {
  const unauthorized = rejectUnauthorized(request);
  if (unauthorized) return unauthorized;
  const creds = credentials();
  if (!creds) {
    return apiError(
      'GOOGLE_NOT_CONNECTED',
      'Sitemap göndermek için Google service account bağlantısı gereklidir.',
      503
    );
  }
  const gscProperty =
    process.env.GOOGLE_SEARCH_CONSOLE_PROPERTY ||
    (await getSeoExperienceData()).seoSettings.gscProperty ||
    'sc-domain:muhammedakan.com';
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ['https://www.googleapis.com/auth/webmasters'],
    });
    const client = google.searchconsole({ version: 'v1', auth });
    await client.sitemaps.submit({
      siteUrl: gscProperty,
      feedpath: `${getSiteUrl()}/sitemap.xml`,
    });
    return apiSuccess({
      submitted: true,
      sitemap: `${getSiteUrl()}/sitemap.xml`,
      property: gscProperty,
    });
  } catch (error) {
    return apiError(
      'SITEMAP_SUBMIT_FAILED',
      error instanceof Error ? error.message : 'Sitemap gönderilemedi.',
      502
    );
  }
}
