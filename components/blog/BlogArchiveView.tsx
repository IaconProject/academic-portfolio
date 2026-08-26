import { BookOpen, Filter, SearchX } from 'lucide-react';
import type { BlogArchiveResult } from '@/lib/blog/types';
import { BlogArchiveFilters } from './BlogArchiveFilters';
import { BlogPagination } from './BlogPagination';
import { BlogPostCard } from './BlogPostCard';

export function BlogArchiveView({
  result,
  pathname,
  action = pathname,
  eyebrow,
  title,
  description,
  showFilters = true,
}: {
  result: BlogArchiveResult;
  pathname: string;
  action?: string;
  eyebrow: string;
  title: string;
  description: string;
  showFilters?: boolean;
}) {
  const { q, category, tag, series } = result.query;

  return (
    <main id="blog-content" className="mx-auto w-full max-w-7xl flex-1 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <header className="max-w-3xl">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700 dark:text-amber-400">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.045em] text-stone-950 dark:text-white sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 text-base leading-7 text-stone-600 dark:text-stone-300 sm:text-lg">
          {description}
        </p>
      </header>

      {showFilters ? (
        <div className="mt-9">
          <BlogArchiveFilters
            action={action}
            q={q}
            category={category}
            tag={tag}
            series={series}
            categories={result.categories}
            tags={result.tags}
            seriesOptions={result.series}
          />
        </div>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-4 dark:border-stone-800">
        <p className="inline-flex items-center gap-2 text-sm font-bold text-stone-700 dark:text-stone-200">
          <BookOpen className="h-4 w-4 text-amber-600" />
          {result.total} yazı
          {result.total > 0 && result.totalPages > 1 ? (
            <span className="font-medium text-stone-600 dark:text-stone-400">
              · {result.page}/{result.totalPages}. sayfa
            </span>
          ) : null}
        </p>
        {q || category || tag || series ? (
          <p className="inline-flex items-center gap-2 text-xs font-semibold text-stone-600 dark:text-stone-400">
            <Filter className="h-3.5 w-3.5" /> Etkin filtreler uygulanıyor
          </p>
        ) : null}
      </div>

      {result.posts.length ? (
        <div className="mt-7 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {result.posts.map((post, index) => (
            <BlogPostCard key={post.id} post={post} priority={index < 3} />
          ))}
        </div>
      ) : (
        <section className="mt-8 rounded-[2rem] border border-dashed border-stone-300 bg-white px-6 py-16 text-center dark:border-stone-700 dark:bg-stone-900">
          <SearchX className="mx-auto h-11 w-11 text-amber-600" />
          <h2 className="mt-5 text-2xl font-black tracking-tight">
            Eşleşen yazı bulunamadı
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-stone-600 dark:text-stone-300">
            Arama ifadesini sadeleştirin veya kategori, etiket ve seri
            filtrelerinden birini kaldırın.
          </p>
        </section>
      )}

      <BlogPagination
        pathname={pathname}
        page={result.page}
        totalPages={result.totalPages}
        query={{ q, kategori: category, etiket: tag, seri: series }}
      />
    </main>
  );
}
