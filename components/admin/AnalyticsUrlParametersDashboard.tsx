'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity, Link2, RefreshCw, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { readSessionItem } from '@/lib/admin-session-storage';

type RangeDays = 7 | 30 | 90;
type ParameterRow = {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  term: string | null;
  content: string | null;
  landingPath: string;
  visitors: number;
  sessions: number;
  pageViews: number;
};
type Report = {
  range: { from: string; to: string; days: number };
  summary: { visitors: number; sessions: number; pageViews: number; parameterizedUrls: number };
  rows: ParameterRow[];
};
type ApiResponse = { success?: boolean; data?: Report; error?: string | { message?: string } };

function headers(): Record<string, string> {
  const token = readSessionItem('admin_token') || '';
  return token ? { 'X-Admin-Token': token } : {};
}

function valueOrDash(value: string | null) {
  return value?.trim() || '—';
}

export function AnalyticsUrlParametersDashboard() {
  const [days, setDays] = useState<RangeDays>(30);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async (background = false) => {
    if (background) setRefreshing(true);
    else setLoading(true);
    try {
      const response = await fetch(`/api/analytics/parameters?days=${days}`, {
        headers: headers(),
        cache: 'no-store',
      });
      const payload = (await response.json().catch(() => null)) as ApiResponse | null;
      if (!response.ok || !payload?.success || !payload.data) {
        const message = typeof payload?.error === 'string' ? payload.error : payload?.error?.message;
        throw new Error(message || 'URL parametre raporu alınamadı.');
      }
      setReport(payload.data);
      setError(null);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'URL parametre raporu alınamadı.';
      setError(message);
      if (background) toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [days]);

  useEffect(() => { void loadReport(); }, [loadReport]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
        <div>
          <h2 className="text-sm font-black text-stone-900 dark:text-stone-100">UTM parametreli ziyaretler</h2>
          <p className="mt-1 max-w-2xl text-[11px] leading-5 text-stone-500 dark:text-stone-400">/7 dışındaki UTM kampanya alanları bu sekmede raporlanır. Ham URL sorgusu kaydedilmez; yeni sayfa görüntülemeleri yalnız açık analitik izninden sonra toplanır.</p>
        </div>
        <div className="flex items-center gap-2">
          <select aria-label="Rapor dönemi" value={days} onChange={(event) => setDays(Number(event.target.value) as RangeDays)} className="h-10 rounded-xl border border-stone-200 bg-white px-3 text-xs font-bold text-stone-700 outline-none focus:border-amber-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-200">
            <option value={7}>Son 7 gün</option>
            <option value={30}>Son 30 gün</option>
            <option value={90}>Son 90 gün</option>
          </select>
          <button type="button" onClick={() => void loadReport(true)} disabled={refreshing || loading} className="inline-flex h-10 items-center gap-2 rounded-xl bg-stone-900 px-3 text-xs font-bold text-white disabled:opacity-50 dark:bg-amber-500 dark:text-stone-950">
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />Yenile
          </button>
        </div>
      </div>

      {error && !report ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
          <p className="font-bold">Rapor yüklenemedi</p><p className="mt-1 text-xs">{error}</p>
          <button type="button" onClick={() => void loadReport()} className="mt-3 rounded-lg bg-white px-3 py-2 text-xs font-bold dark:bg-stone-900">Tekrar dene</button>
        </div>
      ) : loading && !report ? (
        <div className="flex min-h-52 items-center justify-center gap-3 rounded-2xl border border-stone-200 bg-white text-sm text-stone-500 dark:border-stone-800 dark:bg-stone-900"><RefreshCw className="h-5 w-5 animate-spin" />Rapor yükleniyor…</div>
      ) : report ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Ziyaretçi" value={report.summary.visitors} icon={Users} />
            <Metric label="Oturum" value={report.summary.sessions} icon={Activity} />
            <Metric label="Sayfa görüntüleme" value={report.summary.pageViews} icon={Link2} />
            <Metric label="Parametreli sayfa" value={report.summary.parameterizedUrls} icon={Link2} />
          </div>
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
            <div className="flex items-center justify-between gap-3 border-b border-stone-100 px-4 py-3 dark:border-stone-800">
              <h3 className="text-xs font-black text-stone-800 dark:text-stone-100">Kampanya ve açılış sayfası</h3>
              <span className="text-[10px] text-stone-500">En çok 100 satır</span>
            </div>
            {report.rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[940px] text-left text-xs">
              <thead className="bg-stone-50 text-[10px] uppercase tracking-wider text-stone-500 dark:bg-stone-950"><tr>{['Kaynak', 'Ortam', 'Kampanya', 'Arama terimi', 'İçerik', 'Açılış sayfası', 'Ziyaretçi', 'Oturum', 'Görüntüleme'].map((heading) => <th key={heading} className="px-3 py-3 font-black">{heading}</th>)}</tr></thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">{report.rows.map((row, index) => <tr key={`${row.source}-${row.medium}-${row.campaign}-${row.landingPath}-${index}`} className="text-stone-700 dark:text-stone-300"><td className="px-3 py-3 font-bold">{valueOrDash(row.source)}</td><td className="px-3 py-3">{valueOrDash(row.medium)}</td><td className="max-w-40 truncate px-3 py-3">{valueOrDash(row.campaign)}</td><td className="max-w-32 truncate px-3 py-3">{valueOrDash(row.term)}</td><td className="max-w-32 truncate px-3 py-3">{valueOrDash(row.content)}</td><td className="max-w-56 truncate px-3 py-3 font-mono text-[10px]" title={row.landingPath}>{row.landingPath}</td><td className="px-3 py-3 tabular-nums">{row.visitors}</td><td className="px-3 py-3 tabular-nums">{row.sessions}</td><td className="px-3 py-3 tabular-nums">{row.pageViews}</td></tr>)}</tbody>
            </table></div> : <div className="px-5 py-12 text-center"><Link2 className="mx-auto h-7 w-7 text-stone-300 dark:text-stone-700" /><p className="mt-3 text-sm font-bold text-stone-600 dark:text-stone-300">Bu dönemde UTM parametreli ziyaret yok</p><p className="mt-1 text-xs text-stone-500">Yeni ziyaretler, ziyaretçinin analitik izni vermesiyle raporda görünür.</p></div>}
          </div>
        </>
      ) : null}
    </section>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Users }) {
  return <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900"><div className="flex items-center justify-between"><span className="text-[10px] font-black uppercase tracking-wider text-stone-500">{label}</span><Icon className="h-4 w-4 text-amber-600 dark:text-amber-400" /></div><p className="mt-3 text-2xl font-black tabular-nums text-stone-900 dark:text-stone-100">{value.toLocaleString('tr-TR')}</p></div>;
}
