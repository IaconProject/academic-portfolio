import Link from 'next/link';
import { ArrowRight, Clock3 } from 'lucide-react';
import type { BlogPostSummary } from '@/lib/blog/types';
import { BlogCover } from './BlogCover';

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Istanbul',
});

export function BlogPostCard({
  post,
  featured = false,
  priority = false,
}: {
  post: BlogPostSummary;
  featured?: boolean;
  priority?: boolean;
}) {
  const path = `/blog/${post.slug}`;

  if (featured) {
    return (
      <article className="group overflow-hidden bg-stone-950 text-white md:grid md:grid-cols-[1.08fr_0.92fr]">
        <Link href={path} className="blog-focus-ring block min-h-64" aria-label={`${post.title} yazısını oku`}>
          <BlogCover
            src={post.coverImageUrl}
            alt={post.coverImageAlt || post.title}
            priority={priority}
            className="aspect-[16/10] h-full min-h-64 border-r border-stone-800"
          />
        </Link>
        <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-stone-400">
            {post.category ? (
              <Link
                href={`/blog/kategori/${post.category.slug}`}
                className="blog-focus-ring rounded-md text-amber-300 transition-colors hover:text-amber-200"
              >
                {post.category.name}
              </Link>
            ) : (
              <span className="text-amber-300">Teknoloji</span>
            )}
            <span aria-hidden="true">/</span>
            <span>Editör seçkisi</span>
          </div>

          <h3 className="mt-5 text-3xl font-bold leading-[1.08] tracking-[-0.035em] text-white text-balance lg:text-[2.5rem]">
            <Link
              href={path}
              className="blog-focus-ring rounded-md decoration-amber-400 decoration-2 underline-offset-4 hover:underline"
            >
              {post.title}
            </Link>
          </h3>
          {post.subtitle ? (
            <p className="mt-3 text-sm font-medium leading-6 text-stone-300">
              {post.subtitle}
            </p>
          ) : null}
          <p className="mt-4 line-clamp-3 text-[0.95rem] leading-7 text-stone-400">
            {post.excerpt}
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-stone-800 pt-5 text-xs text-stone-400">
            <span>
              {post.publishedAt
                ? dateFormatter.format(new Date(post.publishedAt))
                : post.authorName}
            </span>
            <Link
              href={path}
              className="blog-focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg font-bold text-stone-100 transition-colors hover:text-amber-300"
            >
              {post.readingMinutes} dk okuma
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="group flex h-full flex-col border-t-2 border-stone-900 pt-4 dark:border-stone-200">
      <Link
        href={path}
        className="blog-focus-ring block overflow-hidden rounded-xl"
        aria-label={`${post.title} yazısını oku`}
      >
        <BlogCover
          src={post.coverImageUrl}
          alt={post.coverImageAlt || post.title}
          priority={priority}
          className="aspect-[16/9]"
        />
      </Link>
      <div className="flex flex-1 flex-col pt-5">
        <div className="flex min-h-6 flex-wrap items-center gap-x-2 gap-y-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-stone-600 dark:text-stone-400">
          {post.category ? (
            <Link
              href={`/blog/kategori/${post.category.slug}`}
              className="blog-focus-ring rounded-md text-amber-800 transition-colors hover:text-amber-950 dark:text-amber-300 dark:hover:text-amber-200"
            >
              {post.category.name}
            </Link>
          ) : (
            <span className="text-amber-800 dark:text-amber-300">Teknoloji</span>
          )}
          {post.publishedAt ? (
            <>
              <span aria-hidden="true">/</span>
              <time dateTime={post.publishedAt}>
                {dateFormatter.format(new Date(post.publishedAt))}
              </time>
            </>
          ) : null}
        </div>

        <h3 className="mt-3 text-[1.35rem] font-bold leading-[1.18] tracking-[-0.025em] text-stone-950 text-balance dark:text-white">
          <Link
            href={path}
            className="blog-focus-ring rounded-md decoration-amber-500 decoration-2 underline-offset-4 hover:underline"
          >
            {post.title}
          </Link>
        </h3>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-stone-600 dark:text-stone-300">
          {post.excerpt}
        </p>

        <div className="mt-auto flex items-center justify-between gap-4 pt-5 text-xs text-stone-600 dark:text-stone-400">
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
            {post.readingMinutes} dk
          </span>
          <Link
            href={path}
            className="blog-focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg font-bold text-stone-700 transition-colors hover:text-stone-950 dark:text-stone-200 dark:hover:text-white"
            aria-label={`${post.title} yazısını okumaya başla`}
          >
            Oku
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}
