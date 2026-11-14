import 'server-only';

import { hasSupabaseServiceRole, serverSupabase } from '@/lib/supabase/server';
import { AnalyticsReportingError } from '@/lib/analytics-reporting.server';
import { VISITOR_ANALYTICS_TRACKED_PATH } from '@/lib/analytics-contract';

const PAGE_SIZE = 1000;
const MAX_PAGE_VIEWS = 20_000;
const SESSION_LOOKUP_BATCH = 200;

type PageViewEvent = {
  event_id: string;
  session_id: string;
  path: string | null;
};

type PageViewSession = {
  id: string;
  visitor_id: string;
  traffic_class: string;
};

type PathCounts = {
  path: string;
  pageViews: number;
  sessions: Set<string>;
  visitors: Set<string>;
};

function reportQueryFailed() {
  return new AnalyticsReportingError(
    'ANALYTICS_PAGE_PATH_REPORT_FAILED',
    'Sayfa yolu raporu şu anda üretilemedi.',
    503
  );
}

export async function getAnalyticsPagePathReport(days: 7 | 30 | 90) {
  if (!serverSupabase || !hasSupabaseServiceRole) {
    throw new AnalyticsReportingError(
      'ANALYTICS_STORAGE_UNAVAILABLE',
      'Analitik veritabanı şu anda kullanılamıyor.',
      503
    );
  }

  const toMs = Date.now();
  const from = new Date(toMs - days * 24 * 60 * 60 * 1000).toISOString();
  const to = new Date(toMs).toISOString();
  const events: PageViewEvent[] = [];

  for (let offset = 0; offset < MAX_PAGE_VIEWS; offset += PAGE_SIZE) {
    const { data, error } = await serverSupabase
      .from('analytics_events')
      .select('event_id, session_id, path')
      .eq('event_type', 'page_view')
      .neq('path', VISITOR_ANALYTICS_TRACKED_PATH)
      .gte('occurred_at', from)
      .lt('occurred_at', to)
      .order('occurred_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error || !Array.isArray(data)) throw reportQueryFailed();
    events.push(...(data as PageViewEvent[]));
    if (data.length < PAGE_SIZE) break;
    if (offset + PAGE_SIZE >= MAX_PAGE_VIEWS) {
      throw new AnalyticsReportingError(
        'ANALYTICS_PAGE_PATH_REPORT_TOO_LARGE',
        'Bu dönem için çok fazla sayfa görüntülemesi var. Daha kısa bir tarih aralığı seçin.',
        413
      );
    }
  }

  const sessionIds = Array.from(new Set(events.map((event) => event.session_id)));
  const sessions: PageViewSession[] = [];
  for (let offset = 0; offset < sessionIds.length; offset += SESSION_LOOKUP_BATCH) {
    const ids = sessionIds.slice(offset, offset + SESSION_LOOKUP_BATCH);
    const { data, error } = await serverSupabase
      .from('analytics_sessions')
      .select('id, visitor_id, traffic_class')
      .in('id', ids);
    if (error || !Array.isArray(data)) throw reportQueryFailed();
    sessions.push(...(data as PageViewSession[]));
  }

  const sessionById = new Map(sessions.map((session) => [session.id, session]));
  const visitorIds = new Set<string>();
  const sessionIdsCounted = new Set<string>();
  const pathCounts = new Map<string, PathCounts>();

  for (const event of events) {
    const session = sessionById.get(event.session_id);
    const path = event.path;
    if (
      !session ||
      session.traffic_class !== 'human' ||
      !path ||
      path === VISITOR_ANALYTICS_TRACKED_PATH
    ) continue;

    const item = pathCounts.get(path) || {
      path,
      pageViews: 0,
      sessions: new Set<string>(),
      visitors: new Set<string>(),
    };
    item.pageViews += 1;
    item.sessions.add(session.id);
    item.visitors.add(session.visitor_id);
    pathCounts.set(path, item);
    sessionIdsCounted.add(session.id);
    visitorIds.add(session.visitor_id);
  }

  const rows = Array.from(pathCounts.values())
    .map((item) => ({
      path: item.path,
      visitors: item.visitors.size,
      sessions: item.sessions.size,
      pageViews: item.pageViews,
    }))
    .sort((left, right) => right.pageViews - left.pageViews || left.path.localeCompare(right.path))
    .slice(0, 100);

  return {
    range: { from, to, days },
    summary: {
      visitors: visitorIds.size,
      sessions: sessionIdsCounted.size,
      pageViews: Array.from(pathCounts.values()).reduce(
        (sum, item) => sum + item.pageViews,
        0
      ),
      pages: pathCounts.size,
    },
    rows,
  };
}
