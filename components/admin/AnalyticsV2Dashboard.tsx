'use client';

import React, {
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Database,
  Download,
  Eye,
  Gauge,
  Globe2,
  Monitor,
  MousePointerClick,
  RefreshCw,
  Route,
  Search,
  ServerCog,
  Trash2,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';

type DateRangeKey = '7d' | '30d' | '90d' | 'custom';
type TrafficFilter = 'human' | 'bots' | 'all';
type ExportDataset = 'sessions' | 'pages' | 'acquisition';

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: string | { code?: string; message?: string };
};

type Summary = {
  visitors: number;
  sessions: number;
  pageViews: number;
  engagedSessions: number;
  engagementRate: number;
  avgEngagementSeconds: number;
  conversions: number;
};

type SeriesPoint = {
  bucket: string;
  visitors: number;
  sessions: number;
  pageViews: number;
  conversions: number;
};

type TopPage = {
  path: string;
  pageViews: number;
  sessions: number;
  exits: number;
  avgEngagementSeconds: number;
};

type AcquisitionRow = {
  channel: string;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  sessions: number;
  pageViews: number;
  conversions: number;
};

type CountRow = {
  name: string;
  count?: number;
  sessions?: number;
  pageViews?: number;
};

type DashboardData = {
  range: { from: string; to: string; timezone: string };
  summary: Summary;
  series: SeriesPoint[];
  topPages: TopPage[];
  acquisition: AcquisitionRow[];
  technology: {
    devices: CountRow[];
    deviceModels: CountRow[];
    browsers: CountRow[];
    browserVersions: CountRow[];
    operatingSystems: CountRow[];
    operatingSystemVersions: CountRow[];
    screenBuckets: CountRow[];
  };
  geography: {
    countries: Array<
      CountRow & {
        code?: string | null;
        countryCode?: string | null;
        countryName?: string;
      }
    >;
    cities: Array<
      CountRow & {
        city?: string;
        region?: string | null;
        countryCode?: string | null;
      }
    >;
  };
  events: Array<{ eventType: string; count: number }>;
  webVitals: Array<{
    metric: string;
    p75: number;
    rating: 'good' | 'needs-improvement' | 'poor' | 'unknown' | string;
    measurements: number;
  }>;
  quality: {
    humanSessions: number;
    botSessions: number;
    consentVersions: Array<{
      version: string;
      count?: number;
      sessions?: number;
    }>;
    lateEvents: number;
    duplicateEvents: number;
    rejectedEvents: number;
    lastSuccessAt: string | null;
  };
};

type SessionJourneyStep = {
  path: string | null;
  title: string | null;
  occurredAt: string;
  eventType?: string;
  durationMs?: number | null;
  scrollPercent?: number | null;
  contentType?: string | null;
  contentKey?: string | null;
};

type AnalyticsSession = {
  sessionRef?: string;
  id?: string;
  startedAt: string;
  lastActivityAt: string;
  durationSeconds: number;
  trafficClass?: 'human' | 'suspected_bot' | 'verified_bot' | 'internal' | 'test';
  pageViews: number;
  eventCount: number;
  isEngaged: boolean;
  engagementSeconds: number;
  maxScrollPercent?: number;
  conversions?: number;
  conversionCount?: number;
  landingPath: string | null;
  exitPath: string | null;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  referrerDomain: string | null;
  countryCode: string | null;
  countryName: string | null;
  region?: string | null;
  city: string | null;
  geoSource?: string | null;
  geoConfidence?: 'high' | 'medium' | 'low' | null;
  deviceType: string | null;
  deviceBrand?: string | null;
  deviceModel?: string | null;
  browser?: string | null;
  browserName?: string | null;
  browserVersion?: string | null;
  operatingSystem?: string | null;
  osName?: string | null;
  osVersion?: string | null;
  consentVersion?: string | null;
  journeyTruncated?: boolean;
  journey: SessionJourneyStep[];
};

type SessionsData = {
  items?: AnalyticsSession[];
  sessions?: AnalyticsSession[];
  pageInfo?: {
    nextCursor: string | null;
    hasMore: boolean;
  };
  nextCursor?: string | null;
};

type AnalyticsHealth = {
  status: 'disabled' | 'idle' | 'degraded' | 'healthy';
  prerequisites: {
    enabled: boolean;
    ingestFeatureEnabled: boolean;
    serviceRoleConfigured: boolean;
    hashSecretConfigured: boolean;
  };
  ingestion: {
    acceptedBatches?: number;
    acceptedEvents: number;
    duplicateEvents: number;
    rejectedEvents: number;
    failedBatches: number;
    lastSuccessAt: string | null;
    lastFailureAt: string | null;
    lastFailureCode: string | null;
  };
  collectorVersion: string;
  checkedAt: string;
};

type MaintenanceSnapshot = {
  latestQualityRun?: {
    id: string;
    window_started_at: string;
    window_ended_at: string;
    status: string;
    score: number;
    metrics: unknown;
    flags: unknown;
    created_at: string;
  } | null;
  latestRollup?: {
    bucket_date: string;
    timezone: string;
    updated_at: string;
  } | null;
  retentionDays?: number;
};

const TIMEZONE = 'Europe/Istanbul';
const SESSION_PAGE_SIZE = 25;
const NUMBER_FORMATTER = new Intl.NumberFormat('tr-TR');
const PERCENT_FORMATTER = new Intl.NumberFormat('tr-TR', {
  maximumFractionDigits: 1,
});
const CLS_FORMATTER = new Intl.NumberFormat('tr-TR', {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

function adminHeaders(): Record<string, string> {
  const token = sessionStorage.getItem('admin_token') || '';
  const headers: Record<string, string> = {};
  if (token) headers['X-Admin-Token'] = token;
  return headers;
}

function apiMessage(payload: ApiEnvelope<unknown> | null, fallback: string) {
  if (typeof payload?.error === 'string') return payload.error;
  return payload?.error?.message || fallback;
}

function formatNumber(value: number | null | undefined) {
  return NUMBER_FORMATTER.format(Number.isFinite(value) ? Number(value) : 0);
}

function formatPercent(value: number | null | undefined) {
  const numeric = Number.isFinite(value) ? Number(value) : 0;
  return `%${PERCENT_FORMATTER.format(numeric)}`;
}

function formatDuration(seconds: number | null | undefined) {
  const safeSeconds = Math.max(0, Math.round(Number(seconds) || 0));
  if (safeSeconds < 60) return `${safeSeconds} sn`;
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return remainder ? `${minutes} dk ${remainder} sn` : `${minutes} dk`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString('tr-TR', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: TIMEZONE,
      })
    : '—';
}

function formatDay(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: 'short',
        timeZone: TIMEZONE,
      })
    : value;
}

function countOf(row: CountRow) {
  return Number(row.count ?? row.sessions ?? row.pageViews ?? 0);
}

function safeText(value: string | null | undefined, fallback = '—') {
  const trimmed = value?.trim();
  return trimmed || fallback;
}

function formatSessionLocation(session: AnalyticsSession): string {
  const parts = [session.city, session.region, session.countryName]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
  const uniqueParts = Array.from(new Set(parts));
  if (
    !session.city &&
    !session.region &&
    session.countryName
  ) {
    return `İl belirlenemedi · ${session.countryName}`;
  }
  return uniqueParts.join(', ') || 'Bilinmiyor';
}

function geoQualityLabel(session: AnalyticsSession): string {
  if (session.geoSource === 'browser-geolocation') {
    return 'Geçmiş cihaz konumu kaydı · artık toplanmıyor';
  }
  if (session.geoSource !== 'vercel-edge') {
    return 'Konum kaynağı bilinmiyor';
  }
  if (!session.city && !session.region) {
    return 'Yalnız ülke belirlendi';
  }
  return session.geoConfidence === 'low'
    ? 'IP ağ merkezinden il tahmini · düşük güven'
    : 'Public IP bölge/şehir sinyali · yaklaşık';
}

function authorizationBasisLabel(version: string | null | undefined) {
  if (version?.endsWith(':first-party-analytics')) {
    return 'Türkiye · birinci taraf analitik';
  }
  if (version?.endsWith(':consent')) return 'Açık analitik izni';
  return safeText(version, 'Bilinmiyor');
}

function reportingDateInput(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function resolveDateRange(
  key: DateRangeKey,
  customFrom: string,
  customTo: string,
  anchorMs = Date.now()
) {
  if (key === 'custom') {
    // Reporting is explicitly grouped in Europe/Istanbul (UTC+03:00).
    // Do not let an administrator's current device timezone shift date-only
    // filters into a different reporting day.
    const from = new Date(`${customFrom}T00:00:00+03:00`);
    const selectedTo = new Date(`${customTo}T00:00:00+03:00`);
    const to = new Date(selectedTo.getTime() + 24 * 60 * 60 * 1000);
    if (
      !customFrom ||
      !customTo ||
      !Number.isFinite(from.getTime()) ||
      !Number.isFinite(to.getTime()) ||
      from > to
    ) {
      throw new Error('Özel tarih aralığı geçerli değil.');
    }
    if (to.getTime() - from.getTime() > 366 * 24 * 60 * 60 * 1000) {
      throw new Error('Rapor aralığı 366 günü aşamaz.');
    }
    return { from: from.toISOString(), to: to.toISOString() };
  }

  const days = key === '7d' ? 7 : key === '30d' ? 30 : 90;
  const to = new Date(anchorMs);
  const todayInReportingTimezone = reportingDateInput(to);
  const todayStart = new Date(
    `${todayInReportingTimezone}T00:00:00+03:00`
  );
  const from = new Date(
    todayStart.getTime() - (days - 1) * 24 * 60 * 60 * 1000
  );
  return { from: from.toISOString(), to: to.toISOString() };
}

function queryForRange(
  key: DateRangeKey,
  customFrom: string,
  customTo: string,
  anchorMs: number
) {
  const range = resolveDateRange(key, customFrom, customTo, anchorMs);
  const params = new URLSearchParams({
    from: range.from,
    to: range.to,
    timezone: TIMEZONE,
  });
  return params;
}

function objectField(
  value: unknown,
  candidates: string[]
): string | number | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  for (const key of candidates) {
    const candidate = record[key];
    if (typeof candidate === 'string' || typeof candidate === 'number') {
      return candidate;
    }
  }
  return null;
}

function SectionCard({
  title,
  description,
  children,
  className = '',
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-stone-200/80 bg-white/70 p-4 dark:border-stone-800 dark:bg-stone-900/40 ${className}`}
    >
      <div className="mb-4">
        <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
          {title}
        </h3>
        {description && (
          <p className="mt-1 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

function MetricCard({
  label,
  value,
  note,
  icon,
  tone = 'stone',
}: {
  label: string;
  value: string;
  note?: string;
  icon: ReactNode;
  tone?: 'stone' | 'amber' | 'emerald';
}) {
  const classes =
    tone === 'emerald'
      ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/25'
      : tone === 'amber'
        ? 'border-amber-200 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/25'
        : 'border-stone-200 bg-stone-50/80 dark:border-stone-700 dark:bg-stone-800/65';

  return (
    <div className={`rounded-xl border p-3.5 ${classes}`}>
      <div className="flex items-center justify-between gap-2 text-stone-500 dark:text-stone-400">
        <span className="text-[10px] font-bold uppercase tracking-wide">
          {label}
        </span>
        {icon}
      </div>
      <p className="mt-2 text-xl font-bold text-stone-900 dark:text-stone-100">
        {value}
      </p>
      {note && (
        <p className="mt-1 text-[10px] text-stone-500 dark:text-stone-400">
          {note}
        </p>
      )}
    </div>
  );
}

function BreakdownBars({
  rows,
  emptyText = 'Bu aralıkta veri yok.',
}: {
  rows: Array<{ label: string; value: number; detail?: string }>;
  emptyText?: string;
}) {
  const maximum = Math.max(0, ...rows.map((row) => row.value));
  if (rows.length === 0 || maximum === 0) {
    return (
      <p className="rounded-xl bg-stone-50 p-4 text-center text-xs text-stone-500 dark:bg-stone-800/50">
        {emptyText}
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {rows.map((row, index) => {
        const percentage = Math.max(2, (row.value / maximum) * 100);
        return (
          <li key={`${row.label}-${index}`}>
            <div className="mb-1 flex items-center justify-between gap-3 text-[11px]">
              <span className="truncate font-semibold text-stone-700 dark:text-stone-300">
                {row.label}
              </span>
              <span className="shrink-0 text-stone-500 dark:text-stone-400">
                {formatNumber(row.value)}
                {row.detail ? ` · ${row.detail}` : ''}
              </span>
            </div>
            <div
              role="progressbar"
              aria-label={`${row.label}: ${formatNumber(row.value)}`}
              aria-valuemin={0}
              aria-valuemax={maximum}
              aria-valuenow={row.value}
              className="h-2 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800"
            >
              <div
                className="h-full rounded-full bg-amber-500 dark:bg-amber-600"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function LoadingBlock() {
  return (
    <div
      role="status"
      className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-xl border border-stone-200 bg-stone-50/70 text-xs text-stone-500 dark:border-stone-800 dark:bg-stone-900/40"
    >
      <RefreshCw className="h-6 w-6 animate-spin text-amber-600" />
      <span>Analytics v2 raporu hazırlanıyor…</span>
    </div>
  );
}

function healthLabel(status: AnalyticsHealth['status']) {
  return {
    healthy: 'Sağlıklı',
    idle: 'Hazır, event bekliyor',
    degraded: 'Dikkat gerektiriyor',
    disabled: 'Kapalı veya eksik yapılandırılmış',
  }[status];
}

function eventLabel(eventType: string) {
  return (
    {
      page_view: 'Sayfa görüntüleme',
      heartbeat: 'Etkinlik sinyali',
      engagement: 'Etkileşim süresi',
      scroll_depth: 'Kaydırma derinliği',
      outbound_click: 'Harici bağlantı tıklaması',
      download: 'Dosya indirme',
      contact_submit: 'İletişim formu gönderimi',
      consent_update: 'Gizlilik / konum tercihi',
      web_vital: 'Web performans ölçümü',
      client_error: 'İstemci hatası',
    }[eventType] || eventType
  );
}

function vitalValue(metric: string, value: number) {
  return metric.toUpperCase() === 'CLS'
    ? CLS_FORMATTER.format(value)
    : `${Math.round(value)} ms`;
}

function ratingLabel(rating: string, metric: string) {
  if (
    rating === 'unknown' &&
    ['FCP', 'TTFB'].includes(metric.toUpperCase())
  ) {
    return 'Bilgilendirme metriği';
  }
  return (
    {
      good: 'İyi',
      'needs-improvement': 'Geliştirilmeli',
      poor: 'Zayıf',
      unknown: 'Yetersiz örnek',
    }[rating] || rating
  );
}

function qualityFlagLabel(key: string, value: unknown) {
  const labels: Record<string, string> = {
    no_events_in_window: 'Kalite penceresinde event yok',
    missing_consent_events: 'İşleme dayanağı eksik event',
    high_late_event_ratio: 'Geciken event oranı yüksek',
    high_client_error_ratio: 'İstemci hata oranı yüksek',
    collector_stale: 'Collector verisi güncel değil',
  };
  const suffix =
    typeof value === 'number' || typeof value === 'string'
      ? ` (${String(value)})`
      : '';
  return `${labels[key] || key}${suffix}`;
}

export function AnalyticsV2Dashboard() {
  const today = useMemo(() => new Date(), []);
  const defaultTo = useMemo(() => reportingDateInput(today), [today]);
  const defaultFrom = useMemo(() => {
    const reportingToday = new Date(`${defaultTo}T00:00:00+03:00`);
    return reportingDateInput(
      new Date(reportingToday.getTime() - 29 * 24 * 60 * 60 * 1000)
    );
  }, [defaultTo]);

  const [rangeKey, setRangeKey] = useState<DateRangeKey>('7d');
  const [rangeAnchorMs, setRangeAnchorMs] = useState(() => Date.now());
  const [customFrom, setCustomFrom] = useState(defaultFrom);
  const [customTo, setCustomTo] = useState(defaultTo);
  const [appliedCustomRange, setAppliedCustomRange] = useState({
    from: defaultFrom,
    to: defaultTo,
  });
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardRefreshing, setDashboardRefreshing] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [health, setHealth] = useState<AnalyticsHealth | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [maintenance, setMaintenance] =
    useState<MaintenanceSnapshot | null>(null);
  const [maintenanceError, setMaintenanceError] = useState<string | null>(null);
  const [maintenanceRunning, setMaintenanceRunning] = useState(false);

  const [analyticsSessions, setAnalyticsSessions] = useState<
    AnalyticsSession[]
  >([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsLoadingMore, setSessionsLoadingMore] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [selectedSessionRefs, setSelectedSessionRefs] = useState<Set<string>>(
    () => new Set()
  );
  const [sessionsDeleting, setSessionsDeleting] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [trafficFilter, setTrafficFilter] =
    useState<TrafficFilter>('human');
  const [pathInput, setPathInput] = useState('');
  const [pathFilter, setPathFilter] = useState('');
  const [exportDataset, setExportDataset] =
    useState<ExportDataset>('sessions');
  const [exporting, setExporting] = useState(false);

  const dashboardController = useRef<AbortController | null>(null);
  const dashboardRequestId = useRef(0);
  const sessionsController = useRef<AbortController | null>(null);
  const sessionsRequestId = useRef(0);
  const healthController = useRef<AbortController | null>(null);
  const maintenanceController = useRef<AbortController | null>(null);

  const effectiveCustomFrom = appliedCustomRange.from;
  const effectiveCustomTo = appliedCustomRange.to;
  const renewRangeAnchor = useCallback(() => {
    setRangeAnchorMs((current) => Math.max(Date.now(), current + 1));
  }, []);

  const buildRangeQuery = useCallback(
    () =>
      queryForRange(
        rangeKey,
        effectiveCustomFrom,
        effectiveCustomTo,
        rangeAnchorMs
      ),
    [effectiveCustomFrom, effectiveCustomTo, rangeAnchorMs, rangeKey]
  );

  const fetchDashboard = useCallback(
    async (background = false) => {
      const requestId = dashboardRequestId.current + 1;
      dashboardRequestId.current = requestId;
      dashboardController.current?.abort();
      const controller = new AbortController();
      dashboardController.current = controller;

      if (background) setDashboardRefreshing(true);
      else setDashboardLoading(true);

      try {
        const response = await fetch(
          `/api/analytics/dashboard?${buildRangeQuery().toString()}`,
          {
            headers: adminHeaders(),
            cache: 'no-store',
            signal: controller.signal,
          }
        );
        const payload = (await response
          .json()
          .catch(() => null)) as ApiEnvelope<DashboardData> | null;
        if (!response.ok || !payload?.success || !payload.data) {
          throw new Error(
            apiMessage(payload, 'Analytics v2 raporu alınamadı.')
          );
        }
        if (requestId !== dashboardRequestId.current) return;
        setDashboard(payload.data);
        setDashboardError(null);
        setRefreshError(null);
      } catch (error) {
        if (
          controller.signal.aborted ||
          requestId !== dashboardRequestId.current
        ) {
          return;
        }
        const message =
          error instanceof Error
            ? error.message
            : 'Analytics v2 raporu alınamadı.';
        if (background) setRefreshError(message);
        else setDashboardError(message);
      } finally {
        if (requestId === dashboardRequestId.current) {
          dashboardController.current = null;
          if (background) setDashboardRefreshing(false);
          else setDashboardLoading(false);
        }
      }
    },
    [buildRangeQuery]
  );

  const fetchSessions = useCallback(
    async ({
      cursor = null,
      append = false,
    }: {
      cursor?: string | null;
      append?: boolean;
    } = {}) => {
      const requestId = sessionsRequestId.current + 1;
      sessionsRequestId.current = requestId;
      sessionsController.current?.abort();
      const controller = new AbortController();
      sessionsController.current = controller;

      if (append) setSessionsLoadingMore(true);
      else setSessionsLoading(true);

      try {
        const params = buildRangeQuery();
        params.set('limit', String(SESSION_PAGE_SIZE));
        params.set('trafficClass', trafficFilter);
        if (pathFilter) params.set('path', pathFilter);
        if (cursor) params.set('cursor', cursor);

        const response = await fetch(
          `/api/analytics/sessions?${params.toString()}`,
          {
            headers: adminHeaders(),
            cache: 'no-store',
            signal: controller.signal,
          }
        );
        const payload = (await response
          .json()
          .catch(() => null)) as ApiEnvelope<SessionsData> | null;
        if (!response.ok || !payload?.success || !payload.data) {
          throw new Error(
            apiMessage(payload, 'Son oturumlar alınamadı.')
          );
        }
        if (requestId !== sessionsRequestId.current) return;

        const incoming = payload.data.items || payload.data.sessions || [];
        const pageCursor =
          payload.data.pageInfo?.nextCursor ??
          payload.data.nextCursor ??
          null;
        const pageHasMore =
          payload.data.pageInfo?.hasMore ?? Boolean(pageCursor);

        setAnalyticsSessions((current) =>
          append ? [...current, ...incoming] : incoming
        );
        if (!append) setSelectedSessionRefs(new Set());
        setNextCursor(pageCursor);
        setHasMore(pageHasMore);
        setSessionsError(null);
      } catch (error) {
        if (
          controller.signal.aborted ||
          requestId !== sessionsRequestId.current
        ) {
          return;
        }
        setSessionsError(
          error instanceof Error ? error.message : 'Son oturumlar alınamadı.'
        );
      } finally {
        if (requestId === sessionsRequestId.current) {
          sessionsController.current = null;
          if (append) setSessionsLoadingMore(false);
          else setSessionsLoading(false);
        }
      }
    },
    [buildRangeQuery, pathFilter, trafficFilter]
  );

  const fetchHealth = useCallback(async () => {
    healthController.current?.abort();
    const controller = new AbortController();
    healthController.current = controller;
    try {
      const response = await fetch('/api/analytics/health', {
        headers: adminHeaders(),
        cache: 'no-store',
        signal: controller.signal,
      });
      const payload = (await response
        .json()
        .catch(() => null)) as ApiEnvelope<AnalyticsHealth> | null;
      if (!response.ok || !payload?.success || !payload.data) {
        throw new Error(
          apiMessage(payload, 'Collector sağlık bilgisi alınamadı.')
        );
      }
      if (controller.signal.aborted) return;
      setHealth(payload.data);
      setHealthError(null);
    } catch (error) {
      if (controller.signal.aborted) return;
      setHealthError(
        error instanceof Error
          ? error.message
          : 'Collector sağlık bilgisi alınamadı.'
      );
    }
  }, []);

  const fetchMaintenance = useCallback(async () => {
    maintenanceController.current?.abort();
    const controller = new AbortController();
    maintenanceController.current = controller;
    try {
      const response = await fetch('/api/analytics/maintenance', {
        headers: adminHeaders(),
        cache: 'no-store',
        signal: controller.signal,
      });
      const payload = (await response
        .json()
        .catch(() => null)) as ApiEnvelope<MaintenanceSnapshot> | null;
      if (!response.ok || !payload?.success || !payload.data) {
        throw new Error(
          apiMessage(payload, 'Bakım durumu alınamadı.')
        );
      }
      if (controller.signal.aborted) return;
      setMaintenance(payload.data);
      setMaintenanceError(null);
    } catch (error) {
      if (controller.signal.aborted) return;
      setMaintenanceError(
        error instanceof Error ? error.message : 'Bakım durumu alınamadı.'
      );
    }
  }, []);

  useEffect(() => {
    void fetchDashboard(false);
    return () => dashboardController.current?.abort();
  }, [fetchDashboard]);

  useEffect(() => {
    void fetchSessions();
    return () => sessionsController.current?.abort();
  }, [fetchSessions]);

  useEffect(() => {
    void fetchHealth();
    void fetchMaintenance();
    const interval = window.setInterval(() => void fetchHealth(), 30000);
    return () => {
      window.clearInterval(interval);
      healthController.current?.abort();
      maintenanceController.current?.abort();
    };
  }, [fetchHealth, fetchMaintenance]);

  const refreshAll = async () => {
    setNextCursor(null);
    setHasMore(false);
    renewRangeAnchor();
    await Promise.all([fetchHealth(), fetchMaintenance()]);
  };

  const deleteSelectedSessions = async (sessionRefs: string[]) => {
    const uniqueRefs = Array.from(new Set(sessionRefs)).filter((value) =>
      /^s_[a-f0-9]{16}$/.test(value)
    );
    if (uniqueRefs.length === 0) return;
    if (
      !window.confirm(
        uniqueRefs.length === 1
          ? 'Bu analitik oturumunu ve ilişkili event kayıtlarını kalıcı olarak silmek istiyor musunuz?'
          : `${uniqueRefs.length} analitik oturumunu ve ilişkili event kayıtlarını kalıcı olarak silmek istiyor musunuz?`
      )
    ) {
      return;
    }

    setSessionsDeleting(true);
    try {
      const response = await fetch('/api/analytics/sessions', {
        method: 'DELETE',
        headers: {
          ...adminHeaders(),
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        body: JSON.stringify({ sessionRefs: uniqueRefs }),
      });
      const payload = (await response
        .json()
        .catch(() => null)) as ApiEnvelope<{
        requestedCount: number;
        deletedCount: number;
      }> | null;
      if (!response.ok || !payload?.success || !payload.data) {
        throw new Error(
          apiMessage(payload, 'Seçili analitik oturumları silinemedi.')
        );
      }

      setSelectedSessionRefs(new Set());
      toast.success(
        `${formatNumber(payload.data.deletedCount)} oturum ve ilişkili eventleri silindi.`
      );
      await Promise.all([
        fetchSessions(),
        fetchDashboard(true),
        fetchHealth(),
      ]);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Seçili analitik oturumları silinemedi.'
      );
    } finally {
      setSessionsDeleting(false);
    }
  };

  const toggleSessionSelection = (sessionRef: string) => {
    if (
      !selectedSessionRefs.has(sessionRef) &&
      selectedSessionRefs.size >= 100
    ) {
      toast.error('Tek işlemde en fazla 100 oturum seçilebilir.');
      return;
    }
    setSelectedSessionRefs((current) => {
      const next = new Set(current);
      if (next.has(sessionRef)) next.delete(sessionRef);
      else next.add(sessionRef);
      return next;
    });
  };

  const loadedSessionRefs = analyticsSessions
    .map((session) => session.sessionRef || session.id || '')
    .filter((value) => /^s_[a-f0-9]{16}$/.test(value))
    .slice(0, 100);
  const allLoadedSelected =
    loadedSessionRefs.length > 0 &&
    loadedSessionRefs.every((value) => selectedSessionRefs.has(value));

  const applyCustomRange = (event: FormEvent) => {
    event.preventDefault();
    try {
      resolveDateRange('custom', customFrom, customTo);
      setAppliedCustomRange({ from: customFrom, to: customTo });
      setNextCursor(null);
      setHasMore(false);
      renewRangeAnchor();
      setRangeKey('custom');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Tarih aralığı geçerli değil.'
      );
    }
  };

  const applyPathFilter = (event: FormEvent) => {
    event.preventDefault();
    const normalized = pathInput.trim();
    if (normalized && !normalized.startsWith('/')) {
      toast.error('Sayfa filtresi “/” ile başlamalıdır.');
      return;
    }
    setAnalyticsSessions([]);
    setNextCursor(null);
    setHasMore(false);
    setPathFilter(normalized);
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const params = buildRangeQuery();
      params.set('dataset', exportDataset);
      params.set('limit', '10000');

      const response = await fetch(
        `/api/analytics/export?${params.toString()}`,
        {
          headers: adminHeaders(),
          cache: 'no-store',
        }
      );
      if (!response.ok) {
        const payload = (await response
          .json()
          .catch(() => null)) as ApiEnvelope<unknown> | null;
        throw new Error(
          apiMessage(payload, 'Analytics CSV dosyası hazırlanamadı.')
        );
      }
      const blob = await response.blob();
      if (!blob.size) {
        throw new Error('Sunucu boş bir dışa aktarma dosyası döndürdü.');
      }

      const disposition = response.headers.get('content-disposition') || '';
      const encodedName = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
      const simpleName = disposition.match(/filename="?([^";]+)"?/i)?.[1];
      const filename = encodedName
        ? decodeURIComponent(encodedName)
        : simpleName ||
          `analytics-${exportDataset}-${new Date().toISOString().slice(0, 10)}.csv`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
      toast.success('Analytics CSV dosyası indirildi.');
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Analytics CSV dosyası hazırlanamadı.'
      );
    } finally {
      setExporting(false);
    }
  };

  const runMaintenance = async () => {
    if (
      !window.confirm(
        'Analytics kalite kontrolü, özetleme ve retention bakımını şimdi çalıştırmak istiyor musunuz?'
      )
    ) {
      return;
    }
    setMaintenanceRunning(true);
    try {
      const response = await fetch('/api/analytics/maintenance', {
        method: 'POST',
        headers: adminHeaders(),
      });
      const payload = (await response
        .json()
        .catch(() => null)) as ApiEnvelope<unknown> | null;
      if (!response.ok || !payload?.success) {
        throw new Error(apiMessage(payload, 'Analytics bakımı çalıştırılamadı.'));
      }
      toast.success('Analytics bakımı başarıyla tamamlandı.');
      await Promise.all([
        fetchMaintenance(),
        fetchDashboard(true),
        fetchHealth(),
      ]);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Analytics bakımı çalıştırılamadı.'
      );
    } finally {
      setMaintenanceRunning(false);
    }
  };

  const isEmpty =
    Boolean(dashboard) &&
    (dashboard?.summary.sessions || 0) === 0 &&
    (dashboard?.summary.pageViews || 0) === 0;
  const degraded =
    health?.status === 'degraded' ||
    Boolean(dashboard?.quality.lateEvents);
  const missingPrerequisites = health
    ? [
        !health.prerequisites.enabled ? 'CMS ölçümü kapalı' : null,
        !health.prerequisites.ingestFeatureEnabled
          ? 'collector özellik bayrağı kapalı'
          : null,
        !health.prerequisites.serviceRoleConfigured
          ? 'service role eksik'
          : null,
        !health.prerequisites.hashSecretConfigured
          ? 'hash secret eksik'
          : null,
      ].filter((item): item is string => Boolean(item))
    : [];

  const qualityRunAt = objectField(maintenance?.latestQualityRun, [
    'completedAt',
    'ranAt',
    'createdAt',
    'created_at',
    'updatedAt',
    'updated_at',
    'startedAt',
  ]);
  const qualityRunStatus = objectField(maintenance?.latestQualityRun, [
    'status',
    'result',
    'state',
  ]);
  const qualityRunScore = objectField(maintenance?.latestQualityRun, ['score']);
  const qualityFlags =
    maintenance?.latestQualityRun?.flags &&
    typeof maintenance.latestQualityRun.flags === 'object' &&
    !Array.isArray(maintenance.latestQualityRun.flags)
      ? Object.entries(
          maintenance.latestQualityRun.flags as Record<string, unknown>
        )
      : [];
  const rollupAt = objectField(maintenance?.latestRollup, [
    'completedAt',
    'rolledUpAt',
    'bucketDate',
    'bucket_date',
    'createdAt',
    'updatedAt',
    'updated_at',
  ]);

  return (
    <div className="space-y-6 rounded-2xl border border-stone-200/80 bg-white/90 p-4 shadow-md backdrop-blur-md transition-colors dark:border-stone-800 dark:bg-stone-900/90 sm:p-6 md:p-8">
      <header className="flex flex-col gap-4 border-b border-stone-100 pb-5 dark:border-stone-800 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <Activity className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            <h2 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              Ziyaretçi Analizi
            </h2>
            {health && (
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                  health.status === 'healthy'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : health.status === 'degraded'
                      ? 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300'
                      : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300'
                }`}
              >
                {health.status === 'healthy' ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <AlertTriangle className="h-3 w-3" />
                )}
                {healthLabel(health.status)}
              </span>
            )}
          </div>
          <p className="mt-2 max-w-3xl text-xs leading-relaxed text-stone-500 dark:text-stone-400">
            Consent sonrası toplanan, pseudonim ve botlardan ayrıştırılmış
            Analytics v2 verileri. Ham IP, ziyaretçi anahtarı veya kalıcı kişi
            kimliği bu ekranda gösterilmez.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="analytics-export-dataset" className="sr-only">
            Dışa aktarma veri kümesi
          </label>
          <select
            id="analytics-export-dataset"
            value={exportDataset}
            onChange={(event) =>
              setExportDataset(event.target.value as ExportDataset)
            }
            className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-xs font-semibold text-stone-700 outline-none focus:border-amber-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
          >
            <option value="sessions">Oturumlar</option>
            <option value="pages">Sayfalar</option>
            <option value="acquisition">Edinme</option>
          </select>
          <button
            type="button"
            onClick={() => void exportCsv()}
            disabled={exporting || dashboardLoading}
            className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-xs font-bold text-stone-700 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
          >
            {exporting ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4 text-amber-600" />
            )}
            CSV indir
          </button>
          <button
            type="button"
            onClick={() => void refreshAll()}
            disabled={dashboardLoading || dashboardRefreshing}
            className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-3.5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-amber-600 dark:text-stone-950 dark:hover:bg-amber-500"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                dashboardLoading || dashboardRefreshing ? 'animate-spin' : ''
              }`}
            />
            Yenile
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div
          role="group"
          aria-label="Rapor tarih aralığı"
          className="inline-flex w-full flex-wrap gap-1 rounded-xl border border-stone-200 bg-stone-100 p-1 dark:border-stone-700 dark:bg-stone-800 lg:w-auto"
        >
          {(
            [
              ['7d', 'Son 7 gün'],
              ['30d', 'Son 30 gün'],
              ['90d', 'Son 90 gün'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={rangeKey === value}
              onClick={() => {
                setNextCursor(null);
                setHasMore(false);
                renewRangeAnchor();
                setRangeKey(value);
              }}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold transition-colors lg:flex-none ${
                rangeKey === value
                  ? 'bg-white text-stone-900 shadow-sm dark:bg-stone-700 dark:text-white'
                  : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <form
          onSubmit={applyCustomRange}
          className="flex flex-wrap items-end gap-2"
        >
          <div>
            <label
              htmlFor="analytics-from"
              className="mb-1 block text-[10px] font-bold uppercase text-stone-500"
            >
              Başlangıç
            </label>
            <input
              id="analytics-from"
              type="date"
              value={customFrom}
              max={customTo}
              onChange={(event) => setCustomFrom(event.target.value)}
              className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-700 outline-none focus:border-amber-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
            />
          </div>
          <div>
            <label
              htmlFor="analytics-to"
              className="mb-1 block text-[10px] font-bold uppercase text-stone-500"
            >
              Bitiş
            </label>
            <input
              id="analytics-to"
              type="date"
              value={customTo}
              min={customFrom}
              max={defaultTo}
              onChange={(event) => setCustomTo(event.target.value)}
              className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-700 outline-none focus:border-amber-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
            />
          </div>
          <button
            type="submit"
            className={`rounded-lg border px-3 py-2 text-xs font-bold ${
              rangeKey === 'custom'
                ? 'border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300'
                : 'border-stone-200 bg-white text-stone-700 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200'
            }`}
          >
            Uygula
          </button>
        </form>
      </div>

      {healthError && (
        <div
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300"
        >
          Collector sağlık durumu doğrulanamadı: {healthError}
        </div>
      )}

      {health && (
        <div
          role="status"
          className={`rounded-xl border p-3 text-xs ${
            health.status === 'healthy'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300'
              : health.status === 'degraded'
                ? 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300'
                : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300'
          }`}
        >
          <span className="font-bold">
            Collector {health.collectorVersion}: {healthLabel(health.status)}
          </span>
          <span className="ml-2">
            {formatNumber(health.ingestion.acceptedEvents)} kabul ·{' '}
            {formatNumber(health.ingestion.duplicateEvents)} dedupe ·{' '}
            {formatNumber(health.ingestion.rejectedEvents)} red ·{' '}
            {formatNumber(health.ingestion.failedBatches)} başarısız batch
          </span>
          {missingPrerequisites.length > 0 && (
            <span className="ml-2 font-semibold">
              Eksik: {missingPrerequisites.join(', ')}.
            </span>
          )}
          {health.ingestion.lastFailureCode && (
            <span className="ml-2 font-mono">
              Son hata: {health.ingestion.lastFailureCode}
            </span>
          )}
        </div>
      )}

      {degraded && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"
        >
          <p className="font-bold">Veri kalitesi dikkat gerektiriyor</p>
          <p className="mt-1">
            Geciken/reddedilen event veya collector hatası saptandı. Mevcut
            rapor gösteriliyor; karar vermeden önce kalite ve operasyon
            bölümünü inceleyin.
          </p>
        </div>
      )}

      {refreshError && dashboard && (
        <div
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300"
        >
          Son yenileme başarısız oldu; ekrandaki son başarılı veri korunuyor.{' '}
          {refreshError}
        </div>
      )}

      {dashboardError && !dashboard && (
        <div
          role="alert"
          className="flex flex-col justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300 sm:flex-row sm:items-center"
        >
          <div>
            <p className="font-bold">Analytics v2 raporu yüklenemedi</p>
            <p className="mt-1 text-xs">{dashboardError}</p>
          </div>
          <button
            type="button"
            onClick={() => void fetchDashboard(false)}
            className="shrink-0 rounded-lg border border-rose-300 px-3 py-2 text-xs font-bold hover:bg-rose-100 dark:border-rose-800 dark:hover:bg-rose-900/40"
          >
            Tekrar dene
          </button>
        </div>
      )}

      {dashboardLoading && !dashboard ? (
        <LoadingBlock />
      ) : dashboard ? (
        <>
          {isEmpty && (
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-5 text-center text-xs text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300">
              {health && !health.prerequisites.enabled
                ? 'Analytics v2 CMS anahtarı kapalı. SEO → Performans ve Entegrasyonlar bölümünde “Consent sonrasında analitiği etkinleştir” seçeneğini açıp kaydedin.'
                : 'Bu tarih aralığında henüz insan trafiği kaydı bulunmuyor. Collector sağlıklıysa Türkiye’den ilk birinci taraf ziyaretinde veya diğer ülkelerden ilk izinli ziyarette veriler burada görünür.'}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
            <MetricCard
              label="Ziyaretçi"
              value={formatNumber(dashboard.summary.visitors)}
              icon={<Users className="h-4 w-4" />}
            />
            <MetricCard
              label="Oturum"
              value={formatNumber(dashboard.summary.sessions)}
              icon={<Route className="h-4 w-4" />}
            />
            <MetricCard
              label="Sayfa görüntüleme"
              value={formatNumber(dashboard.summary.pageViews)}
              icon={<Eye className="h-4 w-4" />}
            />
            <MetricCard
              label="Etkileşimli oturum"
              value={formatNumber(dashboard.summary.engagedSessions)}
              icon={<MousePointerClick className="h-4 w-4" />}
              tone="emerald"
            />
            <MetricCard
              label="Etkileşim oranı"
              value={formatPercent(dashboard.summary.engagementRate)}
              icon={<Gauge className="h-4 w-4" />}
              tone="emerald"
            />
            <MetricCard
              label="Ort. etkileşim"
              value={formatDuration(dashboard.summary.avgEngagementSeconds)}
              icon={<Clock3 className="h-4 w-4" />}
            />
            <MetricCard
              label="Dönüşüm"
              value={formatNumber(dashboard.summary.conversions)}
              icon={<CheckCircle2 className="h-4 w-4" />}
              tone="amber"
            />
          </div>

          <SectionCard
            title="Zaman içindeki trafik"
            description={`${formatDateTime(
              dashboard.range.from
            )} – ${formatDateTime(dashboard.range.to)} · ${
              dashboard.range.timezone || TIMEZONE
            }`}
          >
            {dashboard.series.length === 0 ? (
              <p className="rounded-xl bg-stone-50 p-6 text-center text-xs text-stone-500 dark:bg-stone-800/50">
                Zaman serisi için veri yok.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-xs">
                  <caption className="sr-only">
                    Günlük ziyaretçi, oturum, sayfa görüntüleme ve dönüşüm
                    değerleri
                  </caption>
                  <thead>
                    <tr className="border-b border-stone-200 text-[10px] uppercase text-stone-500 dark:border-stone-700">
                      <th scope="col" className="px-3 py-2">
                        Tarih
                      </th>
                      <th scope="col" className="px-3 py-2 text-right">
                        Ziyaretçi
                      </th>
                      <th scope="col" className="px-3 py-2 text-right">
                        Oturum
                      </th>
                      <th scope="col" className="w-2/5 px-3 py-2">
                        Sayfa görüntüleme
                      </th>
                      <th scope="col" className="px-3 py-2 text-right">
                        Dönüşüm
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.series.map((point) => {
                      const maxViews = Math.max(
                        1,
                        ...dashboard.series.map((item) => item.pageViews)
                      );
                      return (
                        <tr
                          key={point.bucket}
                          className="border-b border-stone-100 last:border-0 dark:border-stone-800"
                        >
                          <th
                            scope="row"
                            className="whitespace-nowrap px-3 py-2.5 font-semibold text-stone-700 dark:text-stone-300"
                          >
                            {formatDay(point.bucket)}
                          </th>
                          <td className="px-3 py-2.5 text-right">
                            {formatNumber(point.visitors)}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            {formatNumber(point.sessions)}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <div
                                className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800"
                                aria-hidden="true"
                              >
                                <div
                                  className="h-full rounded-full bg-amber-500"
                                  style={{
                                    width: `${Math.max(
                                      2,
                                      (point.pageViews / maxViews) * 100
                                    )}%`,
                                  }}
                                />
                              </div>
                              <span className="w-12 text-right">
                                {formatNumber(point.pageViews)}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            {formatNumber(point.conversions)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <div className="grid gap-4 xl:grid-cols-2">
            <SectionCard
              title="En çok görüntülenen sayfalar"
              description="Path bazında görüntüleme, oturum, çıkış ve ortalama etkileşim."
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-stone-200 text-[10px] uppercase text-stone-500 dark:border-stone-700">
                      <th className="px-2 py-2" scope="col">
                        Sayfa
                      </th>
                      <th className="px-2 py-2 text-right" scope="col">
                        Görüntüleme
                      </th>
                      <th className="px-2 py-2 text-right" scope="col">
                        Oturum
                      </th>
                      <th className="px-2 py-2 text-right" scope="col">
                        Çıkış
                      </th>
                      <th className="px-2 py-2 text-right" scope="col">
                        Etkileşim
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.topPages.map((page) => (
                      <tr
                        key={page.path}
                        className="border-b border-stone-100 last:border-0 dark:border-stone-800"
                      >
                        <th
                          scope="row"
                          className="max-w-64 truncate px-2 py-2.5 font-mono text-[11px] text-stone-700 dark:text-stone-300"
                          title={page.path}
                        >
                          {page.path}
                        </th>
                        <td className="px-2 py-2.5 text-right">
                          {formatNumber(page.pageViews)}
                        </td>
                        <td className="px-2 py-2.5 text-right">
                          {formatNumber(page.sessions)}
                        </td>
                        <td className="px-2 py-2.5 text-right">
                          {formatNumber(page.exits)}
                        </td>
                        <td className="px-2 py-2.5 text-right">
                          {formatDuration(page.avgEngagementSeconds)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {dashboard.topPages.length === 0 && (
                  <p className="p-5 text-center text-xs text-stone-500">
                    Sayfa verisi yok.
                  </p>
                )}
              </div>
            </SectionCard>

            <SectionCard
              title="Edinme kanalları"
              description="UTM ve referrer sinyallerinden türetilen kanal kırılımı."
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-stone-200 text-[10px] uppercase text-stone-500 dark:border-stone-700">
                      <th className="px-2 py-2" scope="col">
                        Kanal / kaynak
                      </th>
                      <th className="px-2 py-2" scope="col">
                        Kampanya
                      </th>
                      <th className="px-2 py-2 text-right" scope="col">
                        Oturum
                      </th>
                      <th className="px-2 py-2 text-right" scope="col">
                        Sayfa
                      </th>
                      <th className="px-2 py-2 text-right" scope="col">
                        Dönüşüm
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.acquisition.map((row, index) => (
                      <tr
                        key={`${row.channel}-${row.source}-${row.medium}-${row.campaign}-${index}`}
                        className="border-b border-stone-100 last:border-0 dark:border-stone-800"
                      >
                        <th scope="row" className="px-2 py-2.5">
                          <span className="block font-semibold text-stone-700 dark:text-stone-300">
                            {safeText(row.channel, 'Doğrudan')}
                          </span>
                          <span className="text-[10px] text-stone-500">
                            {[row.source, row.medium]
                              .filter(Boolean)
                              .join(' / ') || 'Kaynak yok'}
                          </span>
                        </th>
                        <td className="max-w-40 truncate px-2 py-2.5">
                          {safeText(row.campaign)}
                        </td>
                        <td className="px-2 py-2.5 text-right">
                          {formatNumber(row.sessions)}
                        </td>
                        <td className="px-2 py-2.5 text-right">
                          {formatNumber(row.pageViews)}
                        </td>
                        <td className="px-2 py-2.5 text-right">
                          {formatNumber(row.conversions)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {dashboard.acquisition.length === 0 && (
                  <p className="p-5 text-center text-xs text-stone-500">
                    Edinme verisi yok.
                  </p>
                )}
              </div>
            </SectionCard>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <SectionCard title="Cihaz modelleri">
              <BreakdownBars
                rows={dashboard.technology.deviceModels.map((row) => ({
                  label: safeText(row.name, 'Bilinmiyor'),
                  value: countOf(row),
                }))}
              />
            </SectionCard>
            <SectionCard title="Tarayıcı sürümleri">
              <BreakdownBars
                rows={dashboard.technology.browserVersions.map((row) => ({
                  label: safeText(row.name, 'Bilinmiyor'),
                  value: countOf(row),
                }))}
              />
            </SectionCard>
            <SectionCard title="İşletim sistemi sürümleri">
              <BreakdownBars
                rows={dashboard.technology.operatingSystemVersions.map((row) => ({
                  label: safeText(row.name, 'Bilinmiyor'),
                  value: countOf(row),
                }))}
              />
            </SectionCard>
            <SectionCard title="Cihaz sınıfları">
              <BreakdownBars
                rows={dashboard.technology.devices.map((row) => ({
                  label: safeText(row.name, 'Bilinmiyor'),
                  value: countOf(row),
                }))}
              />
            </SectionCard>
            <SectionCard title="Ekran aralıkları">
              <BreakdownBars
                rows={dashboard.technology.screenBuckets.map((row) => ({
                  label: safeText(row.name, 'Bilinmiyor'),
                  value: countOf(row),
                }))}
              />
            </SectionCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <SectionCard
              title="Coğrafya"
              description="Tarayıcıdan konum izni istenmez. Sunucudaki güvenilir IP bölge/şehir sinyali, Türkiye il kodu ve gerekirse kalıcı olarak saklanmayan IP ağ merkez noktasıyla yaklaşık il çözümlemesi yapılır. Mobil operatör çıkışları fiziksel ili temsil etmeyebilir."
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase text-stone-500">
                    <Globe2 className="h-3.5 w-3.5" />
                    Ülkeler
                  </p>
                  <BreakdownBars
                    rows={dashboard.geography.countries.map((row) => ({
                      label: safeText(
                        row.countryName || row.name,
                        'Bilinmiyor'
                      ),
                      value: countOf(row),
                    }))}
                  />
                </div>
                <div>
                  <p className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase text-stone-500">
                    <Route className="h-3.5 w-3.5" />
                    İl / şehir
                  </p>
                  <BreakdownBars
                    rows={dashboard.geography.cities.map((row) => {
                      const city =
                        row.city && row.city !== 'unknown'
                          ? row.city
                          : null;
                      return {
                        label: safeText(
                          city || row.region,
                          'İl belirlenemedi'
                        ),
                        value: countOf(row),
                        detail:
                          [city ? row.region : null, row.countryCode]
                            .filter(Boolean)
                            .join(' · ') || undefined,
                      };
                    })}
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Olay dağılımı"
              description="Yalnız allowlist içindeki doğrulanmış Analytics v2 olayları."
            >
              <BreakdownBars
                rows={dashboard.events.map((row) => ({
                  label: eventLabel(row.eventType),
                  value: row.count,
                  detail: row.eventType,
                }))}
              />
            </SectionCard>
          </div>

          <SectionCard
            title="Web performansı (p75)"
            description="LCP, CLS, INP, FCP ve TTFB ölçümleri gerçek kullanıcı eventlerinden hesaplanır; az örnekli sonuçlar yönlendirici değildir."
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {dashboard.webVitals.map((vital) => (
                <div
                  key={vital.metric}
                  className={`rounded-xl border p-3 ${
                    vital.rating === 'good'
                      ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/60 dark:bg-emerald-950/25'
                      : vital.rating === 'poor'
                        ? 'border-rose-200 bg-rose-50/60 dark:border-rose-900/60 dark:bg-rose-950/25'
                        : 'border-amber-200 bg-amber-50/60 dark:border-amber-900/60 dark:bg-amber-950/25'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      {vital.metric}
                    </span>
                    <Monitor className="h-4 w-4 text-stone-400" />
                  </div>
                  <p className="mt-2 text-lg font-bold text-stone-900 dark:text-stone-100">
                    {vitalValue(vital.metric, vital.p75)}
                  </p>
                  <p className="mt-1 text-[10px] text-stone-500">
                    {ratingLabel(vital.rating, vital.metric)} ·{' '}
                    {formatNumber(vital.measurements)} ölçüm
                  </p>
                </div>
              ))}
              {dashboard.webVitals.length === 0 && (
                <p className="col-span-full rounded-xl bg-stone-50 p-5 text-center text-xs text-stone-500 dark:bg-stone-800/50">
                  Henüz yeterli gerçek kullanıcı performans ölçümü yok.
                </p>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Veri kalitesi ve operasyon"
            description="Collector, bot ayrıştırması, işleme dayanağı, rollup ve retention görünümü."
          >
            <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <MetricCard
                  label="İnsan oturumu"
                  value={formatNumber(dashboard.quality.humanSessions)}
                  icon={<Users className="h-4 w-4" />}
                  tone="emerald"
                />
                <MetricCard
                  label="Bot / şüpheli"
                  value={formatNumber(dashboard.quality.botSessions)}
                  icon={<ServerCog className="h-4 w-4" />}
                />
                <MetricCard
                  label="Geciken event"
                  value={formatNumber(dashboard.quality.lateEvents)}
                  icon={<Clock3 className="h-4 w-4" />}
                  tone={dashboard.quality.lateEvents ? 'amber' : 'stone'}
                />
                <MetricCard
                  label="Tüm zamanlar dedupe"
                  value={formatNumber(dashboard.quality.duplicateEvents)}
                  icon={<Database className="h-4 w-4" />}
                />
                <MetricCard
                  label="Tüm zamanlar reddedilen"
                  value={formatNumber(dashboard.quality.rejectedEvents)}
                  icon={<AlertTriangle className="h-4 w-4" />}
                  tone={dashboard.quality.rejectedEvents ? 'amber' : 'stone'}
                />
                <MetricCard
                  label="Son başarılı ingest"
                  value={formatDateTime(dashboard.quality.lastSuccessAt)}
                  icon={<CheckCircle2 className="h-4 w-4" />}
                />
              </div>

              <div className="space-y-4 rounded-xl border border-stone-200 bg-stone-50/70 p-4 dark:border-stone-700 dark:bg-stone-800/50">
                <div>
                  <p className="text-[10px] font-bold uppercase text-stone-500">
                    Analitik işleme dayanakları
                  </p>
                  <div className="mt-3">
                    <BreakdownBars
                      rows={dashboard.quality.consentVersions.map((row) => ({
                        label: authorizationBasisLabel(row.version),
                        value: Number(row.count ?? row.sessions ?? 0),
                      }))}
                    />
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-3 border-t border-stone-200 pt-4 text-xs dark:border-stone-700">
                  <div>
                    <dt className="text-[10px] font-bold uppercase text-stone-500">
                      Son kalite çalışması
                    </dt>
                    <dd className="mt-1 font-semibold text-stone-700 dark:text-stone-300">
                      {qualityRunAt
                        ? formatDateTime(String(qualityRunAt))
                        : 'Henüz yok'}
                    </dd>
                    {qualityRunStatus !== null && (
                      <dd className="mt-0.5 text-[10px] text-stone-500">
                        {qualityRunScore !== null
                          ? `${String(qualityRunScore)}/100 · `
                          : ''}
                        {String(qualityRunStatus)}
                      </dd>
                    )}
                    {qualityFlags.length > 0 && (
                      <dd className="mt-1 text-[10px] text-amber-700 dark:text-amber-300">
                        {qualityFlags
                          .map(([key, value]) =>
                            qualityFlagLabel(key, value)
                          )
                          .join(' · ')}
                      </dd>
                    )}
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold uppercase text-stone-500">
                      Son rollup
                    </dt>
                    <dd className="mt-1 font-semibold text-stone-700 dark:text-stone-300">
                      {rollupAt ? formatDateTime(String(rollupAt)) : 'Henüz yok'}
                    </dd>
                    {maintenance?.latestRollup?.timezone && (
                      <dd className="mt-0.5 text-[10px] text-stone-500">
                        {maintenance.latestRollup.timezone}
                      </dd>
                    )}
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold uppercase text-stone-500">
                      Saklama süresi
                    </dt>
                    <dd className="mt-1 font-semibold text-stone-700 dark:text-stone-300">
                      {typeof maintenance?.retentionDays === 'number'
                        ? `${maintenance.retentionDays} gün`
                        : 'Doğrulanamadı'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold uppercase text-stone-500">
                      Collector
                    </dt>
                    <dd className="mt-1 font-semibold text-stone-700 dark:text-stone-300">
                      {health
                        ? `${health.collectorVersion} · ${healthLabel(
                            health.status
                          )}`
                        : 'Doğrulanamadı'}
                    </dd>
                  </div>
                </dl>

                {maintenanceError && (
                  <p role="status" className="text-[11px] text-amber-700 dark:text-amber-300">
                    Bakım bilgisi alınamadı: {maintenanceError}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => void runMaintenance()}
                  disabled={maintenanceRunning}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-xs font-bold text-stone-700 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
                >
                  {maintenanceRunning ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <ServerCog className="h-4 w-4 text-amber-600" />
                  )}
                  Bakımı şimdi çalıştır
                </button>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Son oturumlar"
            description="Pseudonim oturum referansları ve kronolojik yol; ham ziyaretçi veya IP bilgisi içermez."
          >
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <label
                  htmlFor="analytics-traffic-filter"
                  className="mb-1 block text-[10px] font-bold uppercase text-stone-500"
                >
                  Trafik sınıfı
                </label>
                <select
                  id="analytics-traffic-filter"
                  value={trafficFilter}
                  onChange={(event) => {
                    setAnalyticsSessions([]);
                    setNextCursor(null);
                    setHasMore(false);
                    setTrafficFilter(
                      event.target.value as TrafficFilter
                    );
                  }}
                  className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-700 outline-none focus:border-amber-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
                >
                  <option value="human">Yalnız insan</option>
                  <option value="bots">Bot / şüpheli</option>
                  <option value="all">Tüm sınıflar</option>
                </select>
              </div>

              <form
                onSubmit={applyPathFilter}
                className="flex w-full max-w-md items-end gap-2"
              >
                <div className="flex-1">
                  <label
                    htmlFor="analytics-path-filter"
                    className="mb-1 block text-[10px] font-bold uppercase text-stone-500"
                  >
                    Sayfa yolu
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                    <input
                      id="analytics-path-filter"
                      type="search"
                      placeholder="/yayinlar"
                      value={pathInput}
                      onChange={(event) => setPathInput(event.target.value)}
                      className="w-full rounded-lg border border-stone-200 bg-stone-50 py-2 pl-9 pr-3 text-xs text-stone-700 outline-none focus:border-amber-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
                >
                  Filtrele
                </button>
              </form>
            </div>

            {analyticsSessions.length > 0 && (
              <div className="mb-3 flex flex-col justify-between gap-2 rounded-xl border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-800/60 sm:flex-row sm:items-center">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-stone-700 dark:text-stone-200">
                  <input
                    type="checkbox"
                    checked={allLoadedSelected}
                    onChange={() =>
                      setSelectedSessionRefs(
                        allLoadedSelected
                          ? new Set()
                          : new Set(loadedSessionRefs)
                      )
                    }
                    className="h-4 w-4 rounded border-stone-300 accent-amber-600"
                  />
                  Yüklü oturumları seç
                  <span className="font-normal text-stone-500">
                    (en fazla 100)
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() =>
                    void deleteSelectedSessions(
                      Array.from(selectedSessionRefs)
                    )
                  }
                  disabled={
                    selectedSessionRefs.size === 0 || sessionsDeleting
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-900 dark:bg-stone-900 dark:text-rose-300 dark:hover:bg-rose-950/40"
                >
                  {sessionsDeleting ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  {selectedSessionRefs.size > 0
                    ? `${selectedSessionRefs.size} seçili oturumu sil`
                    : 'Seçili oturumları sil'}
                </button>
              </div>
            )}

            {sessionsError && (
              <div
                role="alert"
                className="mb-3 flex flex-col justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300 sm:flex-row sm:items-center"
              >
                <span>{sessionsError}</span>
                <button
                  type="button"
                  onClick={() => void fetchSessions()}
                  className="font-bold underline underline-offset-2"
                >
                  Tekrar dene
                </button>
              </div>
            )}

            {sessionsLoading && analyticsSessions.length === 0 ? (
              <div
                role="status"
                className="flex items-center justify-center gap-2 p-8 text-xs text-stone-500"
              >
                <RefreshCw className="h-4 w-4 animate-spin text-amber-600" />
                Oturumlar yükleniyor…
              </div>
            ) : analyticsSessions.length === 0 ? (
              <p className="rounded-xl bg-stone-50 p-6 text-center text-xs text-stone-500 dark:bg-stone-800/50">
                Bu filtrelerle eşleşen oturum bulunamadı.
              </p>
            ) : (
              <div className="space-y-3">
                {analyticsSessions.map((session, index) => {
                  const reference =
                    session.sessionRef ||
                    session.id ||
                    `oturum-${index + 1}`;
                  const browser =
                    session.browser || session.browserName || 'Bilinmiyor';
                  const operatingSystem =
                    session.operatingSystem ||
                    session.osName ||
                    'Bilinmiyor';
                  const conversionCount =
                    session.conversions ?? session.conversionCount ?? 0;
                  const selectable = /^s_[a-f0-9]{16}$/.test(reference);
                  const device =
                    [session.deviceBrand, session.deviceModel]
                      .filter(Boolean)
                      .join(' ') || session.deviceType || 'Bilinmiyor';
                  const browserDetail = [browser, session.browserVersion]
                    .filter(Boolean)
                    .join(' ');
                  const operatingSystemDetail = [
                    operatingSystem,
                    session.osVersion,
                  ]
                    .filter(Boolean)
                    .join(' ');

                  return (
                    <details
                      key={`${reference}-${session.startedAt}`}
                      className={`group rounded-xl border bg-stone-50/60 p-4 open:border-amber-300 open:bg-amber-50/30 dark:bg-stone-800/45 dark:open:border-amber-800 dark:open:bg-amber-950/10 ${
                        selectedSessionRefs.has(reference)
                          ? 'border-rose-300 ring-1 ring-rose-200 dark:border-rose-800 dark:ring-rose-900/50'
                          : 'border-stone-200 dark:border-stone-700'
                      }`}
                    >
                      <summary className="relative cursor-pointer list-none pr-9">
                        {selectable && (
                          <input
                            type="checkbox"
                            aria-label={`${reference} oturumunu seç`}
                            checked={selectedSessionRefs.has(reference)}
                            onClick={(event) => event.stopPropagation()}
                            onChange={() => toggleSessionSelection(reference)}
                            disabled={sessionsDeleting}
                            className="absolute right-0 top-0.5 h-4 w-4 rounded border-stone-300 accent-amber-600"
                          />
                        )}
                        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-[11px] font-bold text-stone-800 dark:text-stone-200">
                                {reference}
                              </span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  session.isEngaged
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'bg-stone-200 text-stone-600 dark:bg-stone-700 dark:text-stone-300'
                                }`}
                              >
                                {session.isEngaged
                                  ? 'Etkileşimli'
                                  : 'Kısa oturum'}
                              </span>
                              {session.trafficClass &&
                                session.trafficClass !== 'human' && (
                                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                    {session.trafficClass}
                                  </span>
                                )}
                            </div>
                            <p className="mt-1 truncate text-xs text-stone-600 dark:text-stone-400">
                              {safeText(session.landingPath, 'Giriş yolu yok')}{' '}
                              → {safeText(session.exitPath, 'Çıkış yolu yok')}
                            </p>
                          </div>
                          <dl className="grid shrink-0 grid-cols-2 gap-x-5 gap-y-2 text-[11px] sm:grid-cols-4">
                            <div>
                              <dt className="text-stone-400">Başlangıç</dt>
                              <dd className="font-semibold text-stone-700 dark:text-stone-300">
                                {formatDateTime(session.startedAt)}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-stone-400">Sayfa</dt>
                              <dd className="font-semibold text-stone-700 dark:text-stone-300">
                                {formatNumber(session.pageViews)}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-stone-400">Etkileşim</dt>
                              <dd className="font-semibold text-stone-700 dark:text-stone-300">
                                {formatDuration(session.engagementSeconds)}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-stone-400">Dönüşüm</dt>
                              <dd className="font-semibold text-stone-700 dark:text-stone-300">
                                {formatNumber(conversionCount)}
                              </dd>
                            </div>
                          </dl>
                        </div>
                      </summary>

                      <div className="mt-4 border-t border-stone-200 pt-4 dark:border-stone-700">
                        <dl className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
                          <div>
                            <dt className="text-[10px] font-bold uppercase text-stone-400">
                              Edinme
                            </dt>
                            <dd className="mt-1 text-stone-700 dark:text-stone-300">
                              {[session.source, session.medium]
                                .filter(Boolean)
                                .join(' / ') || 'Doğrudan'}
                              {session.campaign
                                ? ` · ${session.campaign}`
                                : ''}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-[10px] font-bold uppercase text-stone-400">
                              Konum
                            </dt>
                            <dd className="mt-1 text-stone-700 dark:text-stone-300">
                              {formatSessionLocation(session)}
                            </dd>
                            <dd className="mt-0.5 text-[10px] text-stone-500">
                              {geoQualityLabel(session)}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-[10px] font-bold uppercase text-stone-400">
                              Teknoloji
                            </dt>
                            <dd className="mt-1 space-y-0.5 text-stone-700 dark:text-stone-300">
                              <span className="block">{device}</span>
                              <span className="block text-[11px] text-stone-500">
                                {operatingSystemDetail}
                              </span>
                              <span className="block text-[11px] text-stone-500">
                                {browserDetail}
                              </span>
                            </dd>
                          </div>
                          <div>
                            <dt className="text-[10px] font-bold uppercase text-stone-400">
                              Oturum
                            </dt>
                            <dd className="mt-1 text-stone-700 dark:text-stone-300">
                              {formatDuration(session.durationSeconds)} ·{' '}
                              {formatNumber(session.eventCount)} event
                              {typeof session.maxScrollPercent === 'number'
                                ? ` · %${session.maxScrollPercent} kaydırma`
                                : ''}
                            </dd>
                          </div>
                        </dl>

                        {selectable && (
                          <div className="mt-4 flex justify-end border-t border-stone-200 pt-3 dark:border-stone-700">
                            <button
                              type="button"
                              onClick={() =>
                                void deleteSelectedSessions([reference])
                              }
                              disabled={sessionsDeleting}
                              className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 text-[11px] font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900 dark:bg-stone-900 dark:text-rose-300 dark:hover:bg-rose-950/40"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Bu oturumu sil
                            </button>
                          </div>
                        )}

                        <div className="mt-4">
                          <p className="mb-2 text-[10px] font-bold uppercase text-stone-500">
                            Kronolojik yol
                          </p>
                          {session.journey?.length ? (
                            <>
                              <ol className="space-y-2 border-l-2 border-amber-300 pl-4 dark:border-amber-800">
                                {session.journey.map((step, stepIndex) => (
                                  <li
                                    key={`${step.occurredAt}-${step.path}-${stepIndex}`}
                                    className="relative rounded-lg border border-stone-200 bg-white p-2.5 text-xs dark:border-stone-700 dark:bg-stone-900/60"
                                  >
                                    <span className="absolute -left-[21px] top-3 h-2.5 w-2.5 rounded-full bg-amber-500" />
                                    <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
                                      <span className="font-mono text-[11px] font-semibold text-stone-700 dark:text-stone-300">
                                        {safeText(
                                          step.path,
                                          'Sayfa yolu yok'
                                        )}
                                      </span>
                                      <time className="text-[10px] text-stone-500">
                                        {formatDateTime(step.occurredAt)}
                                      </time>
                                    </div>
                                    {step.title && (
                                      <p className="mt-1 truncate text-[10px] text-stone-500">
                                        {step.title}
                                      </p>
                                    )}
                                  </li>
                                ))}
                              </ol>
                              {session.journeyTruncated && (
                                <p className="mt-2 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                                  Yol 100 sayfa adımıyla sınırlandırıldı.
                                </p>
                              )}
                            </>
                          ) : (
                            <p className="text-xs text-stone-500">
                              Yol ayrıntısı bulunmuyor.
                            </p>
                          )}
                        </div>
                      </div>
                    </details>
                  );
                })}
              </div>
            )}

            {hasMore && nextCursor && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() =>
                    void fetchSessions({ cursor: nextCursor, append: true })
                  }
                  disabled={sessionsLoading || sessionsLoadingMore}
                  className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-50 disabled:opacity-60 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
                >
                  {sessionsLoadingMore && (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  )}
                  Daha fazla oturum yükle
                </button>
              </div>
            )}
          </SectionCard>
        </>
      ) : null}
    </div>
  );
}
