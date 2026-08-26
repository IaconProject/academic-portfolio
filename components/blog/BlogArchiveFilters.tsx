import { RotateCcw, Search } from 'lucide-react';
import Link from 'next/link';
import type {
  BlogCategory,
  BlogSeries,
  BlogTag,
} from '@/lib/blog/types';

export function BlogArchiveFilters({
  action = '/blog/arsiv',
  q,
  category,
  tag,
  series,
  categories,
  tags,
  seriesOptions,
}: {
  action?: string;
  q: string;
  category: string;
  tag: string;
  series: string;
  categories: BlogCategory[];
  tags: BlogTag[];
  seriesOptions: BlogSeries[];
}) {
  const hasFilters = Boolean(q || category || tag || series);
  return (
    <form
      action={action}
      className="grid gap-3 rounded-[1.5rem] border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900 md:grid-cols-2 xl:grid-cols-[1fr_0.55fr_0.55fr_0.55fr_auto]"
      role="search"
    >
      <label className="relative block">
        <span className="sr-only">Blogda ara</span>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-stone-400" />
        <input
          name="q"
          defaultValue={q}
          placeholder="Bir kavram, teknoloji veya soru ara…"
          className="h-12 w-full rounded-xl border border-stone-300 bg-stone-50 pl-11 pr-4 text-sm font-medium outline-none transition focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10 dark:border-stone-700 dark:bg-stone-950 dark:focus:bg-stone-950"
        />
      </label>
      <label>
        <span className="sr-only">Etiket</span>
        <select
          name="etiket"
          defaultValue={tag}
          className="h-12 w-full rounded-xl border border-stone-300 bg-stone-50 px-3 text-sm font-bold outline-none focus:border-amber-500 dark:border-stone-700 dark:bg-stone-950"
        >
          <option value="">Tüm etiketler</option>
          {tags.map((item) => (
            <option key={item.id} value={item.slug}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="sr-only">Kategori</span>
        <select
          name="kategori"
          defaultValue={category}
          className="h-12 w-full rounded-xl border border-stone-300 bg-stone-50 px-3 text-sm font-bold outline-none focus:border-amber-500 dark:border-stone-700 dark:bg-stone-950"
        >
          <option value="">Tüm kategoriler</option>
          {categories.map((item) => (
            <option key={item.id} value={item.slug}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="sr-only">Seri</span>
        <select
          name="seri"
          defaultValue={series}
          className="h-12 w-full rounded-xl border border-stone-300 bg-stone-50 px-3 text-sm font-bold outline-none focus:border-amber-500 dark:border-stone-700 dark:bg-stone-950"
        >
          <option value="">Tüm seriler</option>
          {seriesOptions.map((item) => (
            <option key={item.id} value={item.slug}>
              {item.title}
            </option>
          ))}
        </select>
      </label>
      <div className="flex gap-2">
        <button
          type="submit"
          className="inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-stone-950 px-5 text-sm font-extrabold text-white transition hover:bg-stone-800 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400"
        >
          Filtrele
        </button>
        {hasFilters ? (
          <Link
            href={action}
            className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-stone-300 bg-white text-stone-600 transition hover:text-stone-950 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-300"
            aria-label="Filtreleri temizle"
          >
            <RotateCcw className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
    </form>
  );
}
