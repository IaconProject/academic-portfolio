import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function pageHref(
  pathname: string,
  page: number,
  query: Record<string, string>
) {
  const params = new URLSearchParams(
    Object.entries(query).filter(([, value]) => Boolean(value))
  );
  if (page > 1) params.set('sayfa', String(page));
  return `${pathname}${params.size ? `?${params.toString()}` : ''}`;
}

export function BlogPagination({
  pathname,
  page,
  totalPages,
  query,
}: {
  pathname: string;
  page: number;
  totalPages: number;
  query: Record<string, string>;
}) {
  if (totalPages <= 1) return null;
  const visiblePages = Array.from(
    new Set([1, page - 1, page, page + 1, totalPages])
  ).filter((value) => value >= 1 && value <= totalPages);

  return (
    <nav className="mt-10 flex flex-wrap items-center justify-center gap-2" aria-label="Sayfalama">
      {page > 1 ? (
        <Link
          href={pageHref(pathname, page - 1, query)}
          className="inline-flex h-10 items-center gap-1 rounded-xl border border-stone-300 bg-white px-3 text-sm font-bold dark:border-stone-700 dark:bg-stone-900"
        >
          <ChevronLeft className="h-4 w-4" /> Önceki
        </Link>
      ) : null}
      {visiblePages.map((value, index) => {
        const previous = visiblePages[index - 1];
        return (
          <span key={value} className="contents">
            {previous && value - previous > 1 ? (
              <span className="px-1 text-stone-400">…</span>
            ) : null}
            <Link
              href={pageHref(pathname, value, query)}
              aria-current={value === page ? 'page' : undefined}
              className={`inline-flex h-10 min-w-10 items-center justify-center rounded-xl border px-3 text-sm font-black ${
                value === page
                  ? 'border-stone-950 bg-stone-950 text-white dark:border-amber-500 dark:bg-amber-500 dark:text-stone-950'
                  : 'border-stone-300 bg-white text-stone-700 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200'
              }`}
            >
              {value}
            </Link>
          </span>
        );
      })}
      {page < totalPages ? (
        <Link
          href={pageHref(pathname, page + 1, query)}
          className="inline-flex h-10 items-center gap-1 rounded-xl border border-stone-300 bg-white px-3 text-sm font-bold dark:border-stone-700 dark:bg-stone-900"
        >
          Sonraki <ChevronRight className="h-4 w-4" />
        </Link>
      ) : null}
    </nav>
  );
}
