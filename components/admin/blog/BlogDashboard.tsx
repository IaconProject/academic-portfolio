'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  BarChart3,
  Clock3,
  FileCheck2,
  FilePenLine,
  MailCheck,
  Plus,
  RefreshCw,
} from 'lucide-react';

interface DashboardData {
  counts: Record<string, number>;
  subscribers: number;
  views30d: number;
  recentPosts: Array<{
    id: string;
    title: string;
    status: string;
    updated_at: string;
  }>;
}

const statusLabels: Record<string, string> = {
  draft: 'Taslak',
  review: 'İncelemede',
  scheduled: 'Zamanlandı',
  published: 'Yayında',
  archived: 'Arşivlendi',
};

export function BlogDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/blog/admin/dashboard')
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok || !payload.success) {
          throw new Error(payload?.error?.message || 'Veriler alınamadı.');
        }
        setData(payload.data);
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'Veriler alınamadı.'));
  }, []);

  if (!data && !error) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <RefreshCw className="h-7 w-7 animate-spin text-amber-600" />
      </div>
    );
  }

  if (error) {
    return <p className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-800">{error}</p>;
  }

  const cards = [
    { label: 'Yayındaki yazı', value: data?.counts.published || 0, icon: FileCheck2 },
    { label: 'Aktif taslak', value: (data?.counts.draft || 0) + (data?.counts.review || 0), icon: FilePenLine },
    { label: '30 günlük görüntülenme', value: data?.views30d || 0, icon: BarChart3 },
    { label: 'Bülten abonesi', value: data?.subscribers || 0, icon: MailCheck },
  ];

  return (
    <main className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700 dark:text-amber-400">Yayın merkezi</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Blog genel bakış</h1>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">İçerik akışını, bülteni ve performansı tek yerden yönetin.</p>
        </div>
        <Link href="/admin/blog/yazilar/yeni" className="inline-flex h-11 items-center gap-2 rounded-xl bg-stone-950 px-5 text-sm font-black text-white dark:bg-amber-500 dark:text-stone-950">
          <Plus className="h-4 w-4" /> Yeni yazı
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <section key={card.label} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-stone-500 dark:text-stone-400">{card.label}</p>
                  <p className="mt-3 text-3xl font-black tracking-tight">{new Intl.NumberFormat('tr-TR').format(card.value)}</p>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"><Icon className="h-5 w-5" /></span>
              </div>
            </section>
          );
        })}
      </div>

      <section className="mt-7 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4 dark:border-stone-800">
          <h2 className="font-black">Son güncellenen yazılar</h2>
          <Link href="/admin/blog/yazilar" className="text-xs font-black text-amber-700 dark:text-amber-400">Tümünü gör</Link>
        </div>
        {data?.recentPosts.length ? (
          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {data.recentPosts.map((post) => (
              <Link key={post.id} href={`/admin/blog/yazilar/${post.id}`} className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-stone-50 dark:hover:bg-stone-800/50">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{post.title}</p>
                  <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-stone-500"><Clock3 className="h-3 w-3" /> {new Date(post.updated_at).toLocaleString('tr-TR')}</p>
                </div>
                <span className="shrink-0 rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-black uppercase text-stone-600 dark:bg-stone-800 dark:text-stone-300">{statusLabels[post.status] || post.status}</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="p-8 text-center text-sm text-stone-500">Henüz yazı yok.</p>
        )}
      </section>
    </main>
  );
}
