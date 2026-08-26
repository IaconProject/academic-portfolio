'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';

interface AdminPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  status: string;
  author_name: string;
  is_featured: boolean;
  published_at?: string;
  scheduled_for?: string;
  updated_at: string;
  category?: { name: string; slug: string } | null;
}

const statuses = [
  { value: '', label: 'Tüm durumlar' },
  { value: 'draft', label: 'Taslak' },
  { value: 'review', label: 'İncelemede' },
  { value: 'scheduled', label: 'Zamanlandı' },
  { value: 'published', label: 'Yayında' },
  { value: 'archived', label: 'Arşivlendi' },
];

const statusStyles: Record<string, string> = {
  draft: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
  review: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300',
  scheduled: 'bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300',
  published: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
  archived: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
};

export function BlogPostsManager() {
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({ page: String(page) });
      if (status) params.set('status', status);
      if (debouncedQuery) params.set('q', debouncedQuery);
      try {
        const response = await fetch(`/api/blog/admin/posts?${params}`);
        const payload = await response.json();
        if (!response.ok || !payload.success) {
          throw new Error(payload?.error?.message || 'Yazılar yüklenemedi.');
        }
        if (!cancelled) {
          setPosts(payload.data.posts);
          setTotal(payload.data.total);
          setTotalPages(payload.data.totalPages);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : 'Yazılar yüklenemedi.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, page, status]);

  async function deletePost(post: AdminPost) {
    if (!window.confirm(`“${post.title}” kalıcı olarak silinsin mi?`)) return;
    const response = await fetch(`/api/blog/admin/posts/${post.id}`, {
      method: 'DELETE',
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success) {
      setError(payload?.error?.message || 'Yazı silinemedi.');
      return;
    }
    setPosts((current) => current.filter((item) => item.id !== post.id));
    setTotal((current) => Math.max(0, current - 1));
  }

  return (
    <main className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700 dark:text-amber-400">İçerik yönetimi</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Yazılar</h1>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">{total} içerik · taslaktan yayına tüm iş akışı</p>
        </div>
        <Link href="/admin/blog/yazilar/yeni" className="inline-flex h-11 items-center gap-2 rounded-xl bg-stone-950 px-5 text-sm font-black text-white dark:bg-amber-500 dark:text-stone-950">
          <Plus className="h-4 w-4" /> Yeni yazı
        </Link>
      </div>

      <div className="mt-7 grid gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:grid-cols-[1fr_14rem]">
        <label className="relative">
          <span className="sr-only">Yazılarda ara</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Başlığa göre ara…" className="h-11 w-full rounded-xl border border-stone-300 bg-stone-50 pl-11 pr-4 text-sm outline-none focus:border-amber-500 dark:border-stone-700 dark:bg-stone-950" />
        </label>
        <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="h-11 rounded-xl border border-stone-300 bg-stone-50 px-3 text-sm font-bold outline-none dark:border-stone-700 dark:bg-stone-950">
          {statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </div>

      {error ? <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">{error}</p> : null}

      <section className="mt-5 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
        {loading ? (
          <p className="p-12 text-center text-sm font-bold text-stone-500">Yazılar yükleniyor…</p>
        ) : posts.length ? (
          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {posts.map((post) => (
              <article key={post.id} className="grid gap-4 p-5 transition hover:bg-stone-50/70 dark:hover:bg-stone-800/35 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${statusStyles[post.status] || statusStyles.draft}`}>
                      {statuses.find((item) => item.value === post.status)?.label || post.status}
                    </span>
                    {post.category ? <span className="text-[11px] font-bold text-stone-500">{post.category.name}</span> : null}
                    {post.is_featured ? <span className="text-[11px] font-black text-amber-700 dark:text-amber-400">Öne çıkan</span> : null}
                  </div>
                  <h2 className="mt-3 truncate text-lg font-black tracking-tight">{post.title}</h2>
                  <p className="mt-1 line-clamp-1 text-sm text-stone-500 dark:text-stone-400">{post.excerpt || 'Özet eklenmemiş.'}</p>
                  <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-stone-400"><CalendarClock className="h-3.5 w-3.5" /> {new Date(post.updated_at).toLocaleString('tr-TR')}</p>
                </div>
                <div className="flex items-center gap-2">
                  {post.status === 'published' ? (
                    <Link href={`/blog/${post.slug}`} target="_blank" className="flex h-10 w-10 items-center justify-center rounded-xl border border-stone-300 bg-white text-stone-600 dark:border-stone-700 dark:bg-stone-950" aria-label="Yazıyı görüntüle"><ExternalLink className="h-4 w-4" /></Link>
                  ) : null}
                  <Link href={`/admin/blog/yazilar/${post.id}`} className="inline-flex h-10 items-center gap-2 rounded-xl bg-stone-950 px-4 text-xs font-black text-white dark:bg-amber-500 dark:text-stone-950"><Pencil className="h-3.5 w-3.5" /> Düzenle</Link>
                  <button type="button" onClick={() => deletePost(post)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300" aria-label="Yazıyı sil"><Trash2 className="h-4 w-4" /></button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="p-14 text-center">
            <FileText className="mx-auto h-10 w-10 text-amber-600" />
            <h2 className="mt-4 text-xl font-black">Yazı bulunamadı</h2>
            <p className="mt-2 text-sm text-stone-500">Filtreleri temizleyin veya ilk yazınızı oluşturun.</p>
          </div>
        )}
      </section>

      {totalPages > 1 ? (
        <nav className="mt-5 flex items-center justify-center gap-3" aria-label="Yazı sayfaları">
          <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="flex h-10 items-center gap-1 rounded-xl border border-stone-300 bg-white px-3 text-xs font-bold disabled:opacity-40 dark:border-stone-700 dark:bg-stone-900"><ChevronLeft className="h-4 w-4" /> Önceki</button>
          <span className="text-xs font-black">{page} / {totalPages}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} className="flex h-10 items-center gap-1 rounded-xl border border-stone-300 bg-white px-3 text-xs font-bold disabled:opacity-40 dark:border-stone-700 dark:bg-stone-900">Sonraki <ChevronRight className="h-4 w-4" /></button>
        </nav>
      ) : null}
    </main>
  );
}
