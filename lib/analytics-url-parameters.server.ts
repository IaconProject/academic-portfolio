import 'server-only';

import { hasSupabaseServiceRole, serverSupabase } from '@/lib/supabase/server';
import { AnalyticsReportingError } from '@/lib/analytics-reporting.server';
import { VISITOR_ANALYTICS_TRACKED_PATH } from '@/lib/analytics-contract';

const PAGE_SIZE = 1000;
const MAX_PAGE_VIEWS = 20_000;
const SESSION_LOOKUP_BATCH = 200;

type CampaignEvent = {
  event_id: string;
  session_id: string;
  occurred_at: string;
  path: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
};

type CampaignSession = {
  id: string;
  visitor_id: string;
  traffic_class: string;
};

type CampaignGroup = {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  term: string | null;
  content: string | null;
  landingPath: string;
  pageViews: number;
  sessionIds: Set<string>;
  visitorIds: Set<string>;
};

function reportQueryFailed() {
  return new AnalyticsReportingError(
    'ANALYTICS_PARAMETER_REPORT_FAILED',
    'URL parametre raporu şu anda üretilemedi.',
    503
  );
}

export async function getAnalyticsUrlParameterReport(days: 7 | 30 | 90) {
  if (!serverSupabase || !hasSupabaseServiceRole) {
    throw new AnalyticsReportingError(
      'ANALYTICS_STORAGE_UNAVAILABLE',
      'Analitik veritabanı şu anda kullanılamıyor.',
      503
    );
  }

  const toMs = Date.now();
  const fromMs = toMs - days * 24 * 60 * 60 * 1000;
  const from = new Date(fromMs).toISOString();
  const to = new Date(toMs).toISOString();
  const events: CampaignEvent[] = [];

  for (let offset = 0; offset < MAX_PAGE_VIEWS; offset += PAGE_SIZE) {
    const { data, error } = await serverSupabase
      .from('analytics_events')
      .select('event_id, session_id, occurred_at, path, utm_source, utm_medium, utm_campaign, utm_term, utm_content')
      .eq('event_type', 'page_view')
      .gte('occurred_at', from)
      .lt('occurred_at', to)
      .neq('path', VISITOR_ANALYTICS_TRACKED_PATH)
      .or('utm_source.not.is.null,utm_medium.not.is.null,utm_campaign.not.is.null,utm_term.not.is.null,utm_content.not.is.null')
      .order('occurred_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error || !Array.isArray(data)) throw reportQueryFailed();
    events.push(...(data as CampaignEvent[]));
    if (data.length < PAGE_SIZE) break;
    if (offset + PAGE_SIZE >= MAX_PAGE_VIEWS) {
      throw new AnalyticsReportingError(
        'ANALYTICS_PARAMETER_REPORT_TOO_LARGE',
        'Bu dönem için çok fazla URL parametreli ziyaret var. Daha kısa bir tarih aralığı seçin.',
        413
      );
    }
  }

  const sessionIds = Array.from(new Set(events.map((event) => event.session_id)));
  const sessions: CampaignSession[] = [];
  for (let offset = 0; offset < sessionIds.length; offset += SESSION_LOOKUP_BATCH) {
    const ids = sessionIds.slice(offset, offset + SESSION_LOOKUP_BATCH);
    const { data, error } = await serverSupabase
      .from('analytics_sessions')
      .select('id, visitor_id, traffic_class')
      .in('id', ids);
    if (error || !Array.isArray(data)) throw reportQueryFailed();
    sessions.push(...(data as CampaignSession[]));
  }

  const sessionById = new Map(sessions.map((session) => [session.id, session]));
  const visitorIds = new Set<string>();
  const countedSessionIds = new Set<string>();
  const countedPaths = new Set<string>();
  const groups = new Map<string, CampaignGroup>();
  let pageViews = 0;

  for (const event of events) {
    const session = sessionById.get(event.session_id);
    const landingPath = event.path;
    if (
      !session ||
      session.traffic_class !== 'human' ||
      !landingPath ||
      landingPath === VISITOR_ANALYTICS_TRACKED_PATH
    ) continue;

    const dimensions = {
      source: event.utm_source,
      medium: event.utm_medium,
      campaign: event.utm_campaign,
      term: event.utm_term,
      content: event.utm_content,
      landingPath,
    };
    const key = JSON.stringify(Object.values(dimensions));
    const group = groups.get(key) || {
      ...dimensions,
      pageViews: 0,
      sessionIds: new Set<string>(),
      visitorIds: new Set<string>(),
    };
    group.pageViews += 1;
    group.sessionIds.add(session.id);
    group.visitorIds.add(session.visitor_id);
    groups.set(key, group);
    countedSessionIds.add(session.id);
    visitorIds.add(session.visitor_id);
    countedPaths.add(landingPath);
    pageViews += 1;
  }

  const rows = Array.from(groups.values())
    .map((group) => ({
      source: group.source,
      medium: group.medium,
      campaign: group.campaign,
      term: group.term,
      content: group.content,
      landingPath: group.landingPath,
      visitors: group.visitorIds.size,
      sessions: group.sessionIds.size,
      pageViews: group.pageViews,
    }))
    .sort((left, right) => right.sessions - left.sessions || right.pageViews - left.pageViews)
    .slice(0, 100);

  return {
    range: { from, to, days },
    summary: {
      visitors: visitorIds.size,
      sessions: countedSessionIds.size,
      pageViews,
      parameterizedUrls: countedPaths.size,
    },
    rows,
  };
}
