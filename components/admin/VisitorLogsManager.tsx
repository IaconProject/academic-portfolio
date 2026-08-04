'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { VisitorSession } from '@/lib/types';
import {
  Activity,
  RefreshCw,
  Search,
  Download,
  Trash2,
  ChevronRight,
  Route,
  Compass,
  Zap,
  CheckSquare,
  Square,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AnalyticsV2Dashboard } from './AnalyticsV2Dashboard';

type VisitorStats = {
  storedPageSteps: number;
  legacyPageHistoryTruncated: boolean;
  recordedLegacySessions: number;
  activeLast15Minutes: number;
  topCities: Array<{ name: string; count: number }>;
  topCountries: Array<{ name: string; count: number }>;
  topDevices: Array<{ name: string; count: number }>;
  topBrowsers: Array<{ name: string; count: number }>;
  topISPs: Array<{ name: string; count: number }>;
  topPages: Array<{ name: string; count: number }>;
};

type VisitorsMeta = {
  source: string;
  legacy: boolean;
  isPartial: boolean;
  limit: number;
  sourceCounts?: {
    visitorSessions: number;
    visitorLogs: number;
  };
  displayedSourceCounts?: {
    visitorSessions: number;
    visitorLogs: number;
  };
  activityWindowMinutes: number;
  pageHistoryMayBeTruncated: boolean;
  geoConfidence: 'unverified-legacy';
  generatedAt: string;
};

type VisitorsApiResponse = {
  success: boolean;
  data?: {
    sessions?: VisitorSession[];
    stats?: VisitorStats;
    meta?: VisitorsMeta;
    deletedCount?: number;
  };
  sessions?: VisitorSession[];
  stats?: VisitorStats;
  meta?: VisitorsMeta;
  error?: string | { code?: string; message?: string };
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

function adminHeaders(json = false) {
  const token = sessionStorage.getItem('admin_token') || '';
  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { 'X-Admin-Token': token } : {}),
  };
}

function apiErrorMessage(payload: VisitorsApiResponse | null, fallback: string): string {
  if (typeof payload?.error === 'string') return payload.error;
  if (payload?.error?.message) return payload.error.message;
  return fallback;
}

function displayValue(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed || '—';
}

function maskIpAddress(value: string): string {
  const ip = value.trim();
  if (!ip) return '';

  if (ip.includes(':')) {
    const segments = ip.split(':').filter(Boolean);
    return segments.length > 0 ? `${segments.slice(0, 3).join(':')}::` : '::';
  }

  const segments = ip.split('.');
  if (segments.length === 4) {
    return `${segments[0]}.${segments[1]}.x.x`;
  }
  return 'masked';
}

function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? '' : String(value);
  // Prevent spreadsheet applications from evaluating exported cells as formulas.
  const executablePrefix = text.replace(
    /^[\s\u0000-\u001F\u007F\u200B-\u200D\u202A-\u202E\u2066-\u2069\uFEFF]+/,
    ''
  );
  if (/^[=+\-@]/.test(executablePrefix)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString('tr-TR') : '';
}

function analyticsHealthLabel(status: AnalyticsHealth['status']): string {
  return {
    disabled: 'kapalı',
    idle: 'hazır, event bekliyor',
    degraded: 'sorunlu',
    healthy: 'sağlıklı',
  }[status];
}

function legacySourceLabel(session: VisitorSession): string {
  return session.legacySource === 'visitor_logs'
    ? 'Tarihî sayfa kaydı'
    : 'Legacy oturum';
}

const LegacyVisitorLogsManager: React.FC<{
  onOpenAnalyticsV2: () => void;
}> = ({ onOpenAnalyticsV2 }) => {
  const [sessions, setSessions] = useState<VisitorSession[]>([]);
  const [stats, setStats] = useState<VisitorStats | null>(null);
  const [meta, setMeta] = useState<VisitorsMeta | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [mutating, setMutating] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [analyticsHealth, setAnalyticsHealth] =
    useState<AnalyticsHealth | null>(null);
  const [analyticsHealthError, setAnalyticsHealthError] = useState<
    string | null
  >(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'mobile' | 'active' | 'desktop'>('all');
  const [selectedSession, setSelectedSession] = useState<VisitorSession | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const latestRequestId = useRef(0);
  const activeRequest = useRef<AbortController | null>(null);

  const fetchLogs = useCallback(async (background = false) => {
    const requestId = latestRequestId.current + 1;
    latestRequestId.current = requestId;
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;

    if (background) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await fetch('/api/visitors?t=' + Date.now(), {
        headers: adminHeaders(),
        cache: 'no-store',
        signal: controller.signal,
      });

      const payload = (await res.json().catch(() => null)) as VisitorsApiResponse | null;
      if (!res.ok || !payload?.success) {
        throw new Error(
          apiErrorMessage(
            payload,
            res.status === 401
              ? 'Oturumunuz geçersiz. Lütfen yönetim paneline yeniden giriş yapın.'
              : 'Ziyaretçi analizi verileri alınamadı.'
          )
        );
      }

      const result = payload.data || payload;
      if (!Array.isArray(result.sessions) || !result.stats) {
        throw new Error('Sunucu geçerli bir ziyaretçi analizi yanıtı döndürmedi.');
      }
      if (requestId !== latestRequestId.current) return;

      setSessions(result.sessions);
      setStats(result.stats);
      setMeta(result.meta || null);
      setLoadError(null);
      setRefreshError(null);
    } catch (error) {
      if (
        controller.signal.aborted ||
        requestId !== latestRequestId.current
      ) {
        return;
      }
      const message =
        error instanceof Error ? error.message : 'Ziyaretçi analizi verileri alınamadı.';
      if (background) {
        setRefreshError(message);
      } else {
        setLoadError(message);
      }
    } finally {
      if (requestId === latestRequestId.current) {
        activeRequest.current = null;
        if (background) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    }
  }, []);

  const fetchAnalyticsHealth = useCallback(async () => {
    try {
      const response = await fetch('/api/analytics/health', {
        headers: adminHeaders(),
        cache: 'no-store',
      });
      const payload = (await response
        .json()
        .catch(() => null)) as {
        success?: boolean;
        data?: AnalyticsHealth;
        error?: { message?: string };
      } | null;
      if (!response.ok || !payload?.success || !payload.data) {
        throw new Error(
          payload?.error?.message ||
            'Analytics v2 sağlık bilgisi alınamadı.'
        );
      }
      setAnalyticsHealth(payload.data);
      setAnalyticsHealthError(null);
    } catch (error) {
      setAnalyticsHealthError(
        error instanceof Error
          ? error.message
          : 'Analytics v2 sağlık bilgisi alınamadı.'
      );
    }
  }, []);

  useEffect(() => {
    void fetchLogs(false);
    void fetchAnalyticsHealth();
    const interval = window.setInterval(() => {
      void fetchLogs(true);
    }, 20000);
    const healthInterval = window.setInterval(
      () => void fetchAnalyticsHealth(),
      30000
    );
    return () => {
      clearInterval(interval);
      clearInterval(healthInterval);
      activeRequest.current?.abort();
    };
  }, [fetchAnalyticsHealth, fetchLogs]);

  const handleDeleteSession = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Bu kaydedilmiş legacy oturumu kalıcı olarak silmek istiyor musunuz?')) {
      return;
    }

    activeRequest.current?.abort();
    latestRequestId.current += 1;
    setRefreshing(false);
    setMutating(true);
    try {
      const res = await fetch(`/api/visitors?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: adminHeaders(),
      });
      const payload = (await res.json().catch(() => null)) as VisitorsApiResponse | null;
      if (!res.ok || !payload?.success) {
        throw new Error(apiErrorMessage(payload, 'Oturum silinemedi.'));
      }

      setSessions((prev) => prev.filter((session) => session.id !== id));
      setSelectedIds((prev) => prev.filter((item) => item !== id));
      if (selectedSession?.id === id) setSelectedSession(null);
      toast.success('Kaydedilmiş oturum silindi.');
      void fetchLogs(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Oturum silinemedi.');
    } finally {
      setMutating(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (
      !window.confirm(
        `${selectedIds.length} kaydedilmiş legacy oturumu kalıcı olarak silmek istiyor musunuz?`
      )
    ) {
      return;
    }

    const idsToDelete = [...selectedIds];
    const deleteSet = new Set(idsToDelete);
    activeRequest.current?.abort();
    latestRequestId.current += 1;
    setRefreshing(false);
    setMutating(true);
    try {
      const res = await fetch('/api/visitors', {
        method: 'DELETE',
        headers: adminHeaders(true),
        body: JSON.stringify({ ids: idsToDelete }),
      });
      const payload = (await res.json().catch(() => null)) as VisitorsApiResponse | null;
      if (!res.ok || !payload?.success) {
        throw new Error(apiErrorMessage(payload, 'Seçilen oturumlar silinemedi.'));
      }

      setSessions((prev) => prev.filter((session) => !deleteSet.has(session.id)));
      setSelectedIds([]);
      if (selectedSession && deleteSet.has(selectedSession.id)) setSelectedSession(null);
      toast.success(`${idsToDelete.length} kaydedilmiş oturum silindi.`);
      void fetchLogs(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Seçilen oturumlar silinemedi.');
    } finally {
      setMutating(false);
    }
  };

  const handleClearAll = async () => {
    if (sessions.length === 0) return;
    if (
      !window.confirm(
        'Tüm kaydedilmiş legacy ziyaretçi oturumlarını kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.'
      )
    ) {
      return;
    }

    activeRequest.current?.abort();
    latestRequestId.current += 1;
    setRefreshing(false);
    setMutating(true);
    try {
      const res = await fetch('/api/visitors?clearAll=true', {
        method: 'DELETE',
        headers: adminHeaders(),
      });
      const payload = (await res.json().catch(() => null)) as VisitorsApiResponse | null;
      if (!res.ok || !payload?.success) {
        throw new Error(apiErrorMessage(payload, 'Ziyaretçi kayıtları temizlenemedi.'));
      }

      setSessions([]);
      setStats(null);
      setMeta(null);
      setSelectedSession(null);
      setSelectedIds([]);
      toast.success('Tüm kaydedilmiş oturumlar silindi.');
      void fetchLogs(true);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Ziyaretçi kayıtları temizlenemedi.'
      );
    } finally {
      setMutating(false);
    }
  };

  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const visibleIds = filteredSessions.map((session) => session.id);
    const allVisibleSelected = visibleIds.every((id) => selectedIds.includes(id));
    if (allVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleExportCSV = () => {
    if (sessions.length === 0) {
      toast.error('İndirilecek oturum verisi yok.');
      return;
    }

    const headers = [
      'Oturum ID',
      'Tarih',
      'Son Aktivite',
      'Maskeli IP',
      'Ülke',
      'Şehir',
      'Servis Sağlayıcı (ISP)',
      'Mobil Ağ',
      'Cihaz Tipi',
      'Cihaz Markası',
      'Cihaz Modeli',
      'İşletim Sistemi',
      'Tarayıcı',
      'Gezilen Sayfa Sayısı',
      'Gezinti Yolu',
      'Veri Kaynağı',
      'Kapsam Notu',
      'Geo / ISP Güveni',
    ];

    const rows = sessions.map((session) => {
      const journey = (session.pages || [])
        .map((page) => `${page.path} (${formatDate(page.timestamp)})`)
        .join(' -> ');
      return [
        session.id,
        formatDate(session.createdAt),
        formatDate(session.updatedAt),
        maskIpAddress(session.ip),
        session.country,
        session.city,
        session.isp,
        session.isMobileNetwork ? 'Evet' : 'Hayır',
        session.deviceType,
        session.deviceBrand,
        session.deviceModel,
        `${session.osName} ${session.osVersion}`.trim(),
        `${session.browserName} ${session.browserVersion}`.trim(),
        (session.pages || []).length,
        journey,
        legacySourceLabel(session),
        meta?.isPartial
          ? `Yalnız en güncel ${meta.limit} oturumdan dışa aktarıldı`
          : 'Yüklenen legacy oturum kapsamı',
        'Doğrulanmamış legacy; eski collector sahte fallback içerebilir',
      ];
    });

    const csvContent =
      '\uFEFF' +
      [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ziyaretci_oturum_loglari_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    toast.success('Maskeli IP içeren oturum CSV dosyası indirildi.');
  };

  const fifteenMinsAgo = Date.now() - 15 * 60 * 1000;
  const filteredSessions = sessions.filter((s) => {
    const belongsToMobileGroup =
      s.deviceType === 'Mobile' || s.deviceType === 'Tablet' || s.isMobileNetwork;
    if (filterType === 'mobile') {
      if (!belongsToMobileGroup) return false;
    }
    if (filterType === 'desktop') {
      if (belongsToMobileGroup || s.deviceType !== 'Desktop') return false;
    }
    if (filterType === 'active') {
      const updated = new Date(s.updatedAt || s.createdAt).getTime();
      if (!Number.isFinite(updated) || updated < fifteenMinsAgo) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLocaleLowerCase('tr-TR');
      const includesQuery = (value: string | null | undefined) =>
        (value || '').toLocaleLowerCase('tr-TR').includes(q);
      const journeyMatch = (s.pages || []).some(
        (page) => includesQuery(page.path) || includesQuery(page.title)
      );
      return (
        includesQuery(s.ip) ||
        includesQuery(s.city) ||
        includesQuery(s.country) ||
        includesQuery(s.isp) ||
        includesQuery(s.deviceBrand) ||
        includesQuery(s.deviceModel) ||
        includesQuery(s.osName) ||
        includesQuery(s.browserName) ||
        journeyMatch
      );
    }
    return true;
  });

  const isAllSelected =
    filteredSessions.length > 0 &&
    filteredSessions.every((session) => selectedIds.includes(session.id));

  useEffect(() => {
    if (!selectedSession) return;

    const previousActiveElement = document.activeElement as HTMLElement | null;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedSession(null);
    };

    document.addEventListener('keydown', onKeyDown);
    window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previousActiveElement?.focus();
    };
  }, [selectedSession]);

  return (
    <div className="admin-panel-card space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 dark:border-stone-800 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
              Eski Sistem Analitik Arşivi
            </h2>
            {(stats?.activeLast15Minutes || 0) > 0 && (
              <span className="px-2.5 py-0.5 bg-emerald-600 text-white text-xs font-bold rounded-full shadow-sm flex items-center gap-1">
                <Zap className="w-3 h-3 fill-white" />
                <span>{stats?.activeLast15Minutes} Son 15 dk etkin</span>
              </span>
            )}
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            30 Temmuz 2026 öncesindeki eski collector kayıtları. Bu veriler
            tekil kişi ölçümü değildir.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBatchDelete}
              disabled={mutating}
              className="inline-flex items-center gap-1.5 py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-all shadow-md"
            >
              <Trash2 className="w-4 h-4" />
              <span>Seçilenleri Sil ({selectedIds.length})</span>
            </button>
          )}

          <button
            onClick={() => void fetchLogs(true)}
            disabled={loading || refreshing || mutating}
            className="p-2.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 rounded-xl border border-stone-200 dark:border-stone-700 transition-colors"
            title="Ziyaretçi kayıtlarını yenile"
            aria-label="Ziyaretçi kayıtlarını yenile"
          >
            <RefreshCw className={`w-4 h-4 ${loading || refreshing ? 'animate-spin text-amber-600 dark:text-amber-400' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            disabled={loading || sessions.length === 0}
            className="inline-flex items-center gap-1.5 py-2.5 px-4 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-bold rounded-xl border border-stone-200 dark:border-stone-700 transition-colors"
          >
            <Download className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>CSV İndir</span>
          </button>
        </div>
      </div>

      <div
        role="status"
        className="flex flex-col gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-xs text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200 sm:flex-row sm:items-center sm:justify-between"
      >
        <p>
          Bu alan tarihî ve salt arşiv niteliğindedir; yeni masaüstü veya
          mobil ziyaretler buraya yazılmaz. Güncel ziyaretler, oturumlar ve
          sayfa hareketleri <strong>Analytics v2</strong> alanında görünür.
          Bu nedenle arşiv sayısının artmaması bir kayıt hatası değildir.
        </p>
        <button
          type="button"
          onClick={onOpenAnalyticsV2}
          className="shrink-0 rounded-lg bg-sky-900 px-3 py-2 font-bold text-white hover:bg-sky-800 dark:bg-sky-200 dark:text-sky-950"
        >
          Analytics v2’ye geç
        </button>
      </div>

      {analyticsHealth ? (
        <div
          role="status"
          className={`rounded-xl border p-3 text-xs ${
            analyticsHealth.status === 'healthy'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200'
              : analyticsHealth.status === 'degraded'
                ? 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200'
                : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200'
          }`}
        >
          <span className="font-bold">
            Analytics v2: {analyticsHealthLabel(analyticsHealth.status)}
          </span>
          <span className="ml-2">
            {analyticsHealth.ingestion.acceptedEvents} kabul ·{' '}
            {analyticsHealth.ingestion.duplicateEvents} dedupe ·{' '}
            {analyticsHealth.ingestion.rejectedEvents} red ·{' '}
            {analyticsHealth.ingestion.failedBatches} başarısız batch
          </span>
          {analyticsHealth.ingestion.lastFailureCode && (
            <span className="ml-2 font-mono">
              ({analyticsHealth.ingestion.lastFailureCode})
            </span>
          )}
        </div>
      ) : analyticsHealthError ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200"
        >
          Analytics v2 doğrulanamadı: {analyticsHealthError}
        </div>
      ) : null}

      {loadError && (
        <div
          role="alert"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 p-4 text-sm text-rose-800 dark:text-rose-200"
        >
          <div>
            <p className="font-bold">Ziyaretçi analizi yüklenemedi</p>
            <p className="mt-1 text-xs">{loadError}</p>
          </div>
          <button
            type="button"
            onClick={() => void fetchLogs(false)}
            disabled={loading}
            className="shrink-0 rounded-lg border border-rose-300 dark:border-rose-800 px-3 py-2 text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-900/50"
          >
            Tekrar dene
          </button>
        </div>
      )}

      {refreshError && !loadError && (
        <div
          role="status"
          className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-800 dark:text-amber-200"
        >
          Son arka plan yenilemesi başarısız oldu; mevcut veriler korunuyor. {refreshError}
        </div>
      )}

      {meta?.isPartial && (
        <div
          role="status"
          className="rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50 dark:bg-sky-950/30 p-3 text-xs text-sky-800 dark:text-sky-200"
        >
          Bu legacy görünüm yalnızca en güncel {meta.limit} kaydı kapsıyor; metrikler tüm zamanları
          temsil etmeyebilir.
        </div>
      )}

      {meta?.pageHistoryMayBeTruncated && (
        <div
          role="status"
          className="rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50 dark:bg-sky-950/30 p-3 text-xs text-sky-800 dark:text-sky-200"
        >
          En az bir legacy oturum 100 adımlık eski saklama sınırına ulaşmış;
          “Saklanan Sayfa Adımı” metriği gerçek page-view toplamından düşük
          olabilir.
        </div>
      )}

      {meta?.sourceCounts && (
        <div
          role="status"
          className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs text-stone-700 dark:border-stone-700 dark:bg-stone-800/60 dark:text-stone-300"
        >
          Legacy kaynakları birlikte okunuyor: <strong>{meta.sourceCounts.visitorLogs}</strong>{' '}
          tarihî sayfa kaydı (<code>visitor_logs</code>) ve{' '}
          <strong>{meta.sourceCounts.visitorSessions}</strong> oturum kaydı
          (<code>visitor_sessions</code>). Ham IP ve User-Agent tarayıcıya gönderilmez.
        </div>
      )}

      {meta?.geoConfidence === 'unverified-legacy' && (
        <div
          role="status"
          className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-800 dark:text-amber-200"
        >
          Legacy şehir, ülke ve ISP alanlarında kaynak/güven bilgisi yoktur;
          eski collector tarafından üretilmiş varsayılan değerler bulunabilir.
          Bu boyutlar doğrulanmış coğrafi gerçek olarak yorumlanmamalıdır.
        </div>
      )}

      {/* Analytics Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 font-sans">
        <div className="p-3.5 bg-stone-50 dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-700/80 rounded-xl space-y-1">
          <span className="text-[10px] text-stone-500 dark:text-stone-400 uppercase font-bold">Saklanan Sayfa Adımı</span>
          <div className="text-xl font-bold text-stone-900 dark:text-stone-100">{stats?.storedPageSteps || 0}</div>
        </div>

        <div className="p-3.5 bg-stone-50 dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-700/80 rounded-xl space-y-1">
          <span className="text-[10px] text-stone-500 dark:text-stone-400 uppercase font-bold">Gösterilen Legacy Kayıt</span>
          <div className="text-xl font-bold text-stone-900 dark:text-stone-100">{stats?.recordedLegacySessions || 0}</div>
        </div>

        <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/50 rounded-xl space-y-1">
          <span className="text-[10px] text-emerald-800 dark:text-emerald-400 uppercase font-bold">Son 15 dk Etkin</span>
          <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{stats?.activeLast15Minutes || 0}</span>
          </div>
        </div>

        <div className="p-3.5 bg-stone-50 dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-700/80 rounded-xl space-y-1">
          <span className="text-[10px] text-stone-500 dark:text-stone-400 uppercase font-bold">Legacy Şehir*</span>
          <div className="text-xs font-bold text-stone-800 dark:text-stone-200 truncate">
            {stats?.topCities?.[0]?.name || '—'}
          </div>
        </div>

        <div className="p-3.5 bg-stone-50 dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-700/80 rounded-xl space-y-1">
          <span className="text-[10px] text-stone-500 dark:text-stone-400 uppercase font-bold">En Çok Cihaz</span>
          <div className="text-xs font-bold text-amber-700 dark:text-amber-400 truncate">
            {stats?.topDevices?.[0]?.name || '—'}
          </div>
        </div>

        <div className="p-3.5 bg-stone-50 dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-700/80 rounded-xl space-y-1">
          <span className="text-[10px] text-stone-500 dark:text-stone-400 uppercase font-bold">Legacy ISP*</span>
          <div className="text-xs font-bold text-stone-800 dark:text-stone-200 truncate">
            {stats?.topISPs?.[0]?.name || '—'}
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 font-sans">
        <div className="admin-tabs flex max-w-full shrink-0 items-center gap-2 overflow-x-auto rounded-xl border border-stone-200 bg-stone-100 p-1 dark:border-stone-700 dark:bg-stone-800">
          <button
            onClick={() => setFilterType('all')}
            className={`min-h-10 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              filterType === 'all' ? 'bg-stone-900 dark:bg-amber-600 text-stone-50 dark:text-stone-950' : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            Tümü ({sessions.length})
          </button>
          <button
            onClick={() => setFilterType('active')}
            className={`min-h-10 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              filterType === 'active' ? 'bg-emerald-600 text-white' : 'text-stone-600 dark:text-stone-400 hover:text-emerald-600'
            }`}
          >
            Son 15 dk Etkin ({stats?.activeLast15Minutes || 0})
          </button>
          <button
            onClick={() => setFilterType('mobile')}
            className={`min-h-10 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              filterType === 'mobile' ? 'bg-stone-900 dark:bg-amber-600 text-stone-50 dark:text-stone-950' : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            Mobil / Tablet / GSM
          </button>
          <button
            onClick={() => setFilterType('desktop')}
            className={`min-h-10 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              filterType === 'desktop' ? 'bg-stone-900 dark:bg-amber-600 text-stone-50 dark:text-stone-950' : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            Masaüstü
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <label htmlFor="visitor-log-search" className="sr-only">
            Ziyaretçi oturumlarında ara
          </label>
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
          <input
            id="visitor-log-search"
            type="text"
            placeholder="Maskeli IP, şehir, operatör veya cihazda ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-stone-100 focus:border-stone-900 dark:focus:border-amber-400 outline-none"
          />
        </div>
      </div>

      {/* Selection Control Bar */}
      {filteredSessions.length > 0 && (
        <div className="flex flex-col gap-3 pt-3 text-xs text-stone-500 dark:text-stone-400 border-t border-stone-100 dark:border-stone-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleSelectAll}
              className="inline-flex items-center gap-1.5 text-stone-800 dark:text-stone-200 hover:text-stone-950 font-bold transition-colors"
            >
              {isAllSelected ? (
                <>
                  <CheckSquare className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Tüm Seçimleri Kaldır</span>
                </>
              ) : (
                <>
                  <Square className="w-4 h-4 text-stone-400" />
                  <span>Tümünü Seç ({filteredSessions.length})</span>
                </>
              )}
            </button>
            {selectedIds.length > 0 && (
              <span className="text-stone-700 dark:text-stone-300 font-bold">
                ({selectedIds.length} oturum seçildi)
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span>Gösterilen: <strong className="text-stone-800 dark:text-stone-200">{filteredSessions.length}</strong> / {sessions.length}</span>
            <button
              onClick={handleClearAll}
              disabled={mutating}
              className="hover:text-rose-600 inline-flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Tüm Logları Temizle</span>
            </button>
          </div>
        </div>
      )}

      {/* Sessions List Cards */}
      <div className="space-y-3 font-sans">
        {loading ? (
          <div className="p-12 text-center text-stone-400 text-xs flex flex-col items-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-amber-600 dark:text-amber-400" />
            <span>Oturum logları yükleniyor...</span>
          </div>
        ) : loadError && sessions.length === 0 ? (
          <div className="p-12 text-center bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-700 dark:text-rose-300 text-xs">
            Veriler yüklenemedi. Yukarıdaki hata ayrıntısını kontrol edin.
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="p-12 text-center bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 rounded-xl text-stone-500 text-xs">
            {searchQuery ? 'Aramanıza uygun ziyaretçi oturumu bulunamadı.' : 'Henüz kaydedilmiş ziyaretçi oturumu bulunmuyor.'}
          </div>
        ) : (
          filteredSessions.map((sess) => {
            const pageSteps = Array.isArray(sess.pages) ? sess.pages : [];
            const isLive = new Date(sess.updatedAt || sess.createdAt).getTime() >= fifteenMinsAgo;
            const isSelected = selectedIds.includes(sess.id);
            const locationLabel =
              [sess.city, sess.countryCode].filter(Boolean).join(', ') || '—';
            const deviceLabel =
              [sess.deviceBrand, sess.deviceModel].filter(Boolean).join(' / ') || '—';
            const systemLabel =
              [
                [sess.osName, sess.osVersion].filter(Boolean).join(' '),
                sess.browserName,
              ]
                .filter(Boolean)
                .join(' / ') || '—';

            return (
              <div
                key={sess.id}
                onClick={() => setSelectedSession(sess)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isSelected
                    ? 'bg-amber-50/80 dark:bg-stone-800 border-amber-500 shadow-md'
                    : isLive
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50 hover:border-emerald-400'
                    : 'bg-stone-50/60 dark:bg-stone-800/40 border-stone-200/80 dark:border-stone-700/60 hover:border-stone-400'
                }`}
              >
                {/* Left Selection Checkbox & Info Column */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <button
                    onClick={(e) => handleToggleSelect(sess.id, e)}
                    className="pt-0.5 text-stone-400 hover:text-amber-600 transition-colors shrink-0"
                    title="Seç"
                    aria-label={isSelected ? 'Oturum seçimini kaldır' : 'Oturumu seç'}
                  >
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    ) : (
                      <Square className="w-5 h-5 text-stone-400" />
                    )}
                  </button>

                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-stone-900 dark:text-stone-100 text-sm font-mono">
                        {displayValue(maskIpAddress(sess.ip))}
                      </span>
                      <span className="text-[10px] font-bold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 px-2 py-0.5 rounded border border-sky-200 dark:border-sky-900/60">
                        {legacySourceLabel(sess)}
                      </span>
                      {isLive && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          SON 15 DK ETKİN
                        </span>
                      )}
                      <span className="text-[10px] font-bold bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 px-2 py-0.5 rounded">
                        📍 {locationLabel}
                      </span>
                      <span className="text-[10px] font-bold bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 px-2 py-0.5 rounded border border-stone-200 dark:border-stone-700">
                        ⚡ {displayValue(sess.isp)}
                      </span>
                    </div>

                    {/* Device & OS */}
                    <div className="flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400 flex-wrap">
                      <span className="text-amber-700 dark:text-amber-400 font-semibold">📱 {deviceLabel}</span>
                      <span>•</span>
                      <span className="text-stone-700 dark:text-stone-300 font-semibold">💻 {systemLabel}</span>
                    </div>

                    {/* Navigation Steps Preview */}
                    <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-300 pt-1">
                      <Route className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="font-bold">{pageSteps.length} Sayfa Gezindi:</span>
                      <div className="flex items-center gap-1.5 overflow-hidden text-[11px]">
                        {pageSteps.slice(0, 3).map((step, idx) => (
                          <span key={idx} className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-2 py-0.5 rounded text-stone-700 dark:text-stone-300 font-mono">
                            {step.path}
                          </span>
                        ))}
                        {pageSteps.length > 3 && (
                          <span className="text-amber-700 dark:text-amber-400 font-bold">+{pageSteps.length - 3} daha</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Action Column */}
                <div className="flex items-center gap-3 shrink-0 justify-between md:justify-end border-t md:border-t-0 border-stone-200 dark:border-stone-800 pt-2 md:pt-0">
                  <div className="text-right text-[11px] text-stone-500 dark:text-stone-400 space-y-0.5">
                    <div>{new Date(sess.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
                    <div className="text-[10px] text-stone-400">Giriş Yapıldı</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedSession(sess)}
                      className="inline-flex items-center gap-1 py-1.5 px-3 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-bold rounded-lg border border-stone-200 dark:border-stone-700"
                    >
                      <span>Gezinti Akışı</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => handleDeleteSession(sess.id, e)}
                      disabled={mutating}
                      className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                      title="Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Session Journey Drawer Modal */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="visitor-session-dialog-title"
            className="w-full max-w-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl font-sans text-stone-900 dark:text-stone-100 max-h-[90vh] overflow-y-auto relative"
          >
            <div className="flex items-start justify-between gap-4 border-b border-stone-100 dark:border-stone-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                    {legacySourceLabel(selectedSession)} · Gezinti Akışı
                  </span>
                </div>
                <h3
                  id="visitor-session-dialog-title"
                  className="text-lg font-bold text-stone-900 dark:text-stone-100 mt-1 flex items-center gap-2 font-mono"
                >
                  <span>{displayValue(maskIpAddress(selectedSession.ip))}</span>
                  <span className="text-xs font-sans text-stone-500 font-normal">
                    ({[selectedSession.city, selectedSession.country].filter(Boolean).join(', ') || '—'})
                  </span>
                </h3>
              </div>

              <button
                ref={closeButtonRef}
                onClick={() => setSelectedSession(null)}
                className="p-2 text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 bg-stone-100 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-bold"
              >
                ✕ Kapat
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs p-4 bg-stone-50 dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-700/80 rounded-xl">
              <div>
                <span className="text-stone-400 text-[10px] uppercase font-bold block">SERVİS SAĞLAYICI</span>
                <span className="text-stone-800 dark:text-stone-200 font-bold">{displayValue(selectedSession.isp)}</span>
              </div>
              <div>
                <span className="text-stone-400 text-[10px] uppercase font-bold block">CİHAZ MARKA / MODEL</span>
                <span className="text-amber-700 dark:text-amber-400 font-bold">
                  {[selectedSession.deviceBrand, selectedSession.deviceModel].filter(Boolean).join(' / ') || '—'}
                </span>
              </div>
              <div>
                <span className="text-stone-400 text-[10px] uppercase font-bold block">İŞLETİM SİSTEMİ</span>
                <span className="text-stone-800 dark:text-stone-200 font-bold">
                  {[selectedSession.osName, selectedSession.osVersion].filter(Boolean).join(' ') || '—'}
                </span>
              </div>
              <div>
                <span className="text-stone-400 text-[10px] uppercase font-bold block">TARAYICI</span>
                <span className="text-stone-800 dark:text-stone-200 font-bold">
                  {[selectedSession.browserName, selectedSession.browserVersion].filter(Boolean).join(' ') || '—'}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <Compass className="w-4 h-4" />
                <span>Kronolojik Sayfa Gezinti Yolu</span>
              </h4>

              <div className="relative pl-6 border-l-2 border-amber-300 dark:border-amber-700 space-y-4 pt-2">
                {(selectedSession.pages || []).map((step, idx) => {
                  const stepTime = new Date(step.timestamp);
                  const isFirst = idx === 0;
                  const isLast = idx === (selectedSession.pages || []).length - 1;

                  return (
                    <div key={idx} className="relative group">
                      <span className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        isFirst
                          ? 'bg-emerald-500 border-emerald-400'
                          : isLast
                          ? 'bg-amber-500 border-amber-400'
                          : 'bg-stone-300 dark:bg-stone-700 border-stone-400'
                      }`} />

                      <div className="p-3.5 bg-stone-50 dark:bg-stone-800/90 border border-stone-200 dark:border-stone-700 rounded-xl space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold font-mono text-stone-900 dark:text-stone-100">{step.path}</span>
                            <span className="text-[10px] text-stone-400">({step.title})</span>
                          </div>
                          <span className="text-[11px] text-amber-700 dark:text-amber-400 font-bold font-mono">
                            {stepTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>

                        {isFirst && (
                          <span className="inline-block text-[10px] text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 mt-1">
                            🏁 Siteye Giriş Adımı
                          </span>
                        )}
                        {isLast && (
                          <span className="inline-block text-[10px] text-amber-700 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800 mt-1">
                            📍 Son Görüntülenen Adım
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-stone-100 dark:border-stone-800 flex justify-between items-center">
              <button
                onClick={() => handleDeleteSession(selectedSession.id)}
                disabled={mutating}
                className="py-2 px-4 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-xl border border-rose-200 dark:border-rose-900/50"
              >
                Sil
              </button>

              <button
                onClick={() => setSelectedSession(null)}
                className="py-2 px-5 bg-stone-900 hover:bg-stone-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-stone-50 dark:text-stone-950 text-xs font-bold rounded-xl shadow-md"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const VisitorLogsManager: React.FC = () => {
  const [activeView, setActiveView] = useState<'v2' | 'legacy'>('v2');

  return (
    <section className="space-y-4">
      <div
        role="tablist"
        aria-label="Ziyaretçi analizi veri kaynağı"
        className="flex w-full max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-stone-200 bg-white/90 p-1 shadow-sm dark:border-stone-800 dark:bg-stone-900/90 sm:inline-flex sm:w-auto"
      >
        <button
          type="button"
          role="tab"
          id="analytics-v2-tab"
          aria-selected={activeView === 'v2'}
          aria-controls="analytics-v2-panel"
          tabIndex={0}
          onClick={() => setActiveView('v2')}
          className={`min-h-10 flex-1 whitespace-nowrap rounded-lg px-4 py-2 text-xs font-bold transition-colors sm:flex-none ${
            activeView === 'v2'
              ? 'bg-stone-900 text-white dark:bg-amber-600 dark:text-stone-950'
              : 'text-stone-600 hover:text-stone-950 dark:text-stone-400 dark:hover:text-stone-100'
          }`}
        >
          Analytics v2
        </button>
        <button
          type="button"
          role="tab"
          id="analytics-legacy-tab"
          aria-selected={activeView === 'legacy'}
          aria-controls="analytics-legacy-panel"
          tabIndex={0}
          onClick={() => setActiveView('legacy')}
          className={`min-h-10 flex-1 whitespace-nowrap rounded-lg px-4 py-2 text-xs font-bold transition-colors sm:flex-none ${
            activeView === 'legacy'
              ? 'bg-stone-900 text-white dark:bg-amber-600 dark:text-stone-950'
              : 'text-stone-600 hover:text-stone-950 dark:text-stone-400 dark:hover:text-stone-100'
          }`}
        >
          Arşiv (eski sistem)
        </button>
      </div>

      <p className="max-w-3xl text-xs leading-5 text-stone-500 dark:text-stone-400">
        {activeView === 'v2'
          ? 'Analytics v2 aktif ölçüm sistemidir; yeni ziyaret, etkileşim, performans ve edinme kayıtları burada üretilir.'
          : 'Arşiv, Analytics v2 öncesinde visitor_logs ve visitor_sessions tablolarına yazılmış tarihî kayıtlardır. Yeni ziyaretler bu eski tablolara eklenmez; alan yalnız geçmiş veriyi incelemek veya temizlemek için korunur.'}
      </p>

      <div
        role="tabpanel"
        id={activeView === 'v2' ? 'analytics-v2-panel' : 'analytics-legacy-panel'}
        aria-labelledby={
          activeView === 'v2' ? 'analytics-v2-tab' : 'analytics-legacy-tab'
        }
      >
        {activeView === 'v2' ? (
          <AnalyticsV2Dashboard />
        ) : (
          <LegacyVisitorLogsManager
            onOpenAnalyticsV2={() => setActiveView('v2')}
          />
        )}
      </div>
    </section>
  );
};
