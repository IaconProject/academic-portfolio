'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  BarChart3,
  Clock3,
  Eye,
  Loader2,
  MailCheck,
  ShieldCheck,
} from 'lucide-react';

interface AnalyticsData {
  days: number;
  totals: {
    views: number;
    engagedViews: number;
    readSeconds: number;
    signups: number;
  };
  engagementRate: number;
  averageReadSeconds: number;
  daily: Array<{
    date: string;
    views: number;
    engagedViews: number;
    readSeconds: number;
    signups: number;
  }>;
  posts: Array<{
    id: string;
    title: string;
    slug: string;
    views: number;
    engagedViews: number;
    readSeconds: number;
    signups: number;
  }>;
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds} sn`;
  return `${Math.floor(seconds / 60)} dk ${seconds % 60} sn`;
}

export function BlogAnalyticsDashboard() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/blog/admin/analytics?days=${days}`, { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok || !payload.success) {
          throw new Error(payload?.error?.message || 'Analitik yüklenemedi.');
        }
        if (!cancelled) setData(payload.data);
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(
            caught instanceof Error ? caught.message : 'Analitik yüklenemedi.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days]);

  const maxViews = Math.max(1, ...(data?.daily.map((day) => day.views) || [1]));

  return (
    <main className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700 dark:text-amber-400">
            Gizlilik odaklı ölçüm
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            Blog analitiği
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600 dark:text-stone-300">
            Yazı görüntülemeleri, etkileşim ve görünür okuma süresi günlük
            toplamlar olarak tutulur; ham IP ve kalıcı blog izleme kimliği
            saklanmaz.
          </p>
        </div>
        <select
          value={days}
          onChange={(event) => {
            setLoading(true);
            setError('');
            setDays(Number(event.target.value));
          }}
          className="h-11 rounded-xl border border-stone-300 bg-white px-4 text-sm font-black dark:border-stone-700 dark:bg-stone-900"
        >
          <option value={7}>Son 7 gün</option>
          <option value={30}>Son 30 gün</option>
          <option value={90}>Son 90 gün</option>
          <option value={365}>Son 365 gün</option>
        </select>
      </div>

      {error ? (
        <p className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">
          {error}
        </p>
      ) : null}
      {loading || !data ? (
        <div className="mt-8 flex min-h-64 items-center justify-center rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
          <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
        </div>
      ) : (
        <>
          <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Görüntüleme', value: data.totals.views.toLocaleString('tr-TR'), icon: Eye },
              { label: 'Etkileşim oranı', value: `%${Math.round(data.engagementRate * 100)}`, icon: BarChart3 },
              { label: 'Ort. görünür okuma', value: formatDuration(data.averageReadSeconds), icon: Clock3 },
              { label: 'Yazıdan bülten kaydı', value: data.totals.signups.toLocaleString('tr-TR'), icon: MailCheck },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <article key={card.label} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                  <Icon className="h-5 w-5 text-amber-600" />
                  <p className="mt-4 text-2xl font-black">{card.value}</p>
                  <p className="mt-1 text-xs font-bold text-stone-500">{card.label}</p>
                </article>
              );
            })}
          </section>

          <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black">Günlük görüntülemeler</h2>
                <p className="mt-1 text-xs text-stone-500">Seçilen dönemin günlük toplamları</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5" /> Toplu veri
              </span>
            </div>
            <div className="mt-7 flex h-52 items-end gap-1 overflow-hidden" aria-label="Günlük görüntüleme grafiği">
              {data.daily.map((day) => (
                <div key={day.date} className="group relative flex h-full min-w-1 flex-1 items-end">
                  <div
                    className="w-full rounded-t bg-amber-400 transition group-hover:bg-amber-500"
                    style={{ height: `${Math.max(2, (day.views / maxViews) * 100)}%` }}
                    title={`${new Date(`${day.date}T00:00:00Z`).toLocaleDateString('tr-TR')}: ${day.views}`}
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="mt-6 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <div className="border-b border-stone-200 p-5 dark:border-stone-800">
              <h2 className="text-lg font-black">Yazı performansı</h2>
            </div>
            {data.posts.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-stone-50 text-[10px] font-black uppercase tracking-[0.12em] text-stone-500 dark:bg-stone-950">
                    <tr><th className="px-5 py-3">Yazı</th><th className="px-4 py-3">Görüntüleme</th><th className="px-4 py-3">Etkileşim</th><th className="px-4 py-3">Ort. okuma</th><th className="px-4 py-3">Bülten</th></tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                    {data.posts.map((post) => (
                      <tr key={post.id}>
                        <td className="px-5 py-4 font-black"><Link href={`/blog/${post.slug}`} target="_blank" className="hover:text-amber-700 dark:hover:text-amber-400">{post.title}</Link></td>
                        <td className="px-4 py-4 font-bold">{post.views.toLocaleString('tr-TR')}</td>
                        <td className="px-4 py-4">%{post.views ? Math.round((post.engagedViews / post.views) * 100) : 0}</td>
                        <td className="px-4 py-4">{formatDuration(post.engagedViews ? Math.round(post.readSeconds / post.engagedViews) : 0)}</td>
                        <td className="px-4 py-4">{post.signups}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="p-10 text-center text-sm text-stone-500">Bu aralıkta henüz ölçüm yok.</p>
            )}
          </section>
        </>
      )}
    </main>
  );
}
