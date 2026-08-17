'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, CalendarDays, ExternalLink, Search, Sparkles, X } from 'lucide-react';
import { isOptimizableContentImage } from '@/lib/content-images';
import { safeHttpUrl } from '@/lib/url-security';

export interface ArchiveEntry {
  id: string;
  title: string;
  excerpt: string;
  href?: string;
  externalUrl?: string;
  category: string;
  dateLabel: string;
  tags: string[];
  imageUrl?: string;
  imageAlt?: string;
  featured?: boolean;
}

interface ContentArchiveExplorerProps {
  items: ArchiveEntry[];
  searchPlaceholder: string;
  itemLabel: string;
  emptyTitle: string;
  emptyDescription: string;
}

function normalize(value: string): string {
  return value.toLocaleLowerCase('tr-TR').normalize('NFKD');
}

export function ContentArchiveExplorer({
  items,
  searchPlaceholder,
  itemLabel,
  emptyTitle,
  emptyDescription,
}: ContentArchiveExplorerProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const categories = useMemo(
    () => Array.from(new Set(items.map((item) => item.category).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'tr')),
    [items]
  );
  const filtered = useMemo(() => {
    const needle = normalize(query.trim());
    return items.filter((item) => {
      if (category !== 'all' && item.category !== category) return false;
      if (!needle) return true;
      return normalize([item.title, item.excerpt, item.category, ...item.tags].join(' ')).includes(needle);
    });
  }, [category, items, query]);

  if (!items.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <section aria-label={`${itemLabel} arşivi`}>
      <div className="mb-7 rounded-2xl border border-academic-border bg-academic-surface p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Arşivde ara</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#78716c]" />
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder} className="h-12 w-full rounded-xl border border-academic-border bg-academic-surface-muted pl-10 pr-10 text-sm text-academic-ink outline-none transition placeholder:text-[#8b847b] focus:border-amber-700 focus:ring-2 focus:ring-amber-700/10" />
            {query && (
              <button type="button" onClick={() => setQuery('')} aria-label="Aramayı temizle" className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#78716c] hover:bg-black/5">
                <X className="h-4 w-4" />
              </button>
            )}
          </label>
          {categories.length > 1 && (
            <label className="md:w-56">
              <span className="sr-only">Kategori seç</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)} className="h-12 w-full rounded-xl border border-academic-border bg-academic-surface-muted px-3.5 text-sm font-semibold text-academic-ink outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-700/10">
                <option value="all">Tüm kategoriler</option>
                {categories.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
          )}
        </div>
        <p aria-live="polite" className="mt-3 text-xs font-semibold text-academic-slate">{filtered.length} {itemLabel.toLocaleLowerCase('tr-TR')} gösteriliyor</p>
      </div>

      {filtered.length ? (
        <div className="grid gap-5 md:grid-cols-2">
          {filtered.map((item) => {
            const externalUrl = safeHttpUrl(item.externalUrl);
            return (
            <article key={item.id} className={`${item.featured ? 'border-amber-300 bg-[#fbf6e8]' : 'border-academic-border bg-academic-surface'} group flex min-w-0 flex-col overflow-hidden rounded-3xl border shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md`}>
              {isOptimizableContentImage(item.imageUrl) && (
                <div className="relative aspect-[16/8.5] overflow-hidden border-b border-academic-border bg-academic-surface-muted">
                  <Image src={item.imageUrl!} alt={item.imageAlt || ''} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover transition duration-500 group-hover:scale-[1.025]" />
                </div>
              )}
              <div className="flex flex-1 flex-col p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-academic-slate">
                  <span className="rounded-full border border-academic-border bg-academic-surface-muted px-2.5 py-1">{item.category}</span>
                  <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{item.dateLabel}</span>
                  {item.featured && <span className="inline-flex items-center gap-1 rounded-full bg-amber-200/70 px-2.5 py-1 text-amber-900"><Sparkles className="h-3 w-3" />Öne çıkan</span>}
                </div>
                <h2 className="mt-4 font-serif text-xl font-bold leading-snug tracking-tight text-academic-ink sm:text-2xl">
                  {item.href ? <Link href={item.href} className="decoration-2 underline-offset-4 hover:underline">{item.title}</Link> : item.title}
                </h2>
                <p className="mt-3 line-clamp-4 text-sm leading-7 text-academic-slate">{item.excerpt}</p>
                {!!item.tags.length && (
                  <ul aria-label="Etiketler" className="mt-4 flex flex-wrap gap-1.5">
                    {item.tags.slice(0, 5).map((tag) => <li key={tag} className="rounded-lg bg-[#ebe4d8] px-2.5 py-1 text-[11px] font-semibold text-[#514a43]">{tag}</li>)}
                  </ul>
                )}
                <div className="mt-auto flex flex-wrap items-center gap-4 pt-6 text-xs font-black">
                  {item.href && <Link href={item.href} className="inline-flex items-center gap-1.5 text-[#1c2128] hover:underline">Detayı oku <ArrowUpRight className="h-3.5 w-3.5" /></Link>}
                  {externalUrl && <a href={externalUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-academic-slate hover:text-academic-ink hover:underline">Dış kaynak <ExternalLink className="h-3.5 w-3.5" /></a>}
                </div>
              </div>
            </article>
            );
          })}
        </div>
      ) : (
        <EmptyState title="Eşleşen içerik bulunamadı" description="Arama ifadesini veya kategori filtresini değiştirerek yeniden deneyin." />
      )}
    </section>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-[#c9bead] bg-academic-surface p-10 text-center sm:p-14">
      <Search className="mx-auto h-8 w-8 text-[#9b9286]" />
      <h2 className="mt-4 font-serif text-xl font-bold text-academic-ink">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-academic-slate">{description}</p>
    </div>
  );
}
