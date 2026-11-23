'use client';

import { useState } from 'react';
import { readSessionItem } from '@/lib/admin-session-storage';
import { AlertTriangle, CheckCircle2, Clock3, Database, LoaderCircle, RefreshCw } from 'lucide-react';

type CacheScope = 'portfolio' | 'blog' | 'seo-insights' | 'all';
type ApiResponse = {
  success: boolean;
  data?: { label: string; invalidatedAt: string };
  error?: { message?: string };
};

const scopes: Array<{
  id: CacheScope;
  title: string;
  description: string;
  ttl: string;
  icon: typeof RefreshCw;
}> = [
  {
    id: 'portfolio',
    title: 'Portfolyo sayfaları',
    description: 'Ana sayfa, yayınlar, projeler ve SEO ile ilişkili içerik sayfaları.',
    ttl: 'Sayfa önbelleği: 5 dakika',
    icon: RefreshCw,
  },
  {
    id: 'blog',
    title: 'Blog sayfaları',
    description: 'Blog ana sayfası, yazılar, kategori, arşiv ve seri sayfaları.',
    ttl: 'Sayfalar: 5 dakika · arama: 1 dakika',
    icon: RefreshCw,
  },
  {
    id: 'seo-insights',
    title: 'Google SEO raporları',
    description: 'Search Console ve Analytics raporlarının sunucu tarafı önbelleği.',
    ttl: 'Rapor önbelleği: 6 saat',
    icon: Clock3,
  },
  {
    id: 'all',
    title: 'Tüm site',
    description: 'Bütün sayfa önbelleğini ve bilinen içerik veri etiketlerini yeniler.',
    ttl: 'Tüm rotalar yeniden oluşturulur, ziyaret edildikçe',
    icon: Database,
  },
];

export function CacheSettingsEditor() {
  const [pending, setPending] = useState<CacheScope | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const invalidate = async (scope: CacheScope) => {
    setPending(scope);
    setMessage(null);
    try {
      const token = readSessionItem('admin_token') || '';
      const response = await fetch('/api/admin/cache', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'X-Admin-Token': token } : {}),
        },
        body: JSON.stringify({ scope }),
      });
      const result = (await response.json()) as ApiResponse;
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Cache yenilenemedi.');
      }
      setMessage({
        type: 'success',
        text: `${result.data?.label || 'Seçilen kapsam'} cache’i yenilendi.`,
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Cache yenilenemedi.',
      });
    } finally {
      setPending(null);
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-amber-700 dark:text-amber-400">Site ayarları</p>
        <h2 className="mt-1 text-2xl font-semibold text-stone-900 dark:text-stone-100">Cache yönetimi</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600 dark:text-stone-400">
          İçerik değişikliklerinden sonra ilgili önbelleği anında yenileyin. Süreler uygulamadaki mevcut cache politikalarını gösterir.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {scopes.map(({ id, title, description, ttl, icon: Icon }) => (
          <article key={id} className="flex flex-col rounded-2xl border border-stone-200 bg-white/80 p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900/70">
            <div className="flex items-start gap-3">
              <span className="rounded-xl bg-amber-100 p-2.5 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-stone-900 dark:text-stone-100">{title}</h3>
                <p className="mt-1 text-sm leading-5 text-stone-600 dark:text-stone-400">{description}</p>
              </div>
            </div>
            <p className="mt-4 text-xs font-medium text-stone-500 dark:text-stone-400">{ttl}</p>
            <button
              type="button"
              onClick={() => void invalidate(id)}
              disabled={pending !== null}
              className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-800 transition hover:border-amber-500 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-stone-700 dark:text-stone-100 dark:hover:bg-stone-800"
            >
              {pending === id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {pending === id ? 'Yenileniyor…' : 'Cache’i şimdi yenile'}
            </button>
          </article>
        ))}
      </div>

      {message && (
        <div role="status" className={`flex items-start gap-2 rounded-xl border p-4 text-sm ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300' : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300'}`}>
          {message.type === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-4 text-sm leading-6 text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
        Cache yenileme yalnızca Next.js sayfa ve veri önbelleğini etkiler. Supabase/veritabanı kayıtları, ziyaretçi analizleri ve CMS içerikleri silinmez veya değiştirilmez.
      </div>
    </section>
  );
}
