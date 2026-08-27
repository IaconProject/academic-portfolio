import Link from 'next/link';
import type { BlogPostSummary } from '@/lib/blog/types';
import { BlogCover } from './BlogCover';

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Istanbul',
});

function PostMeta({ post }: { post: BlogPostSummary }) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-stone-500 dark:text-stone-400">
      {post.category ? (
        <Link
          href={`/blog/kategori/${post.category.slug}`}
          className="blog-focus-ring transition-colors hover:text-amber-800 dark:hover:text-amber-300"
        >
          {post.category.name}
        </Link>
      ) : (
        <span>Teknoloji</span>
      )}
      {post.publishedAt ? (
        <>
          <span aria-hidden="true">·</span>
          <time dateTime={post.publishedAt}>
            {dateFormatter.format(new Date(post.publishedAt))}
          </time>
        </>
      ) : null}
      <span aria-hidden="true">·</span>
      <span>{post.readingMinutes} dk okuma</span>
    </p>
  );
}

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
      <article className="group grid border-y border-stone-400 dark:border-stone-700 md:grid-cols-[1.15fr_0.85fr]">
        <Link
          href={path}
          className="blog-focus-ring block min-h-64 md:py-7 md:pr-8"
          aria-label={`${post.title} yazısını oku`}
        >
          <BlogCover
            src={post.coverImageUrl}
            alt={post.coverImageAlt || post.title}
            priority={priority}
            className="aspect-[16/10] h-full min-h-64"
          />
        </Link>
        <div className="flex flex-col justify-center border-t border-stone-300 py-8 md:border-l md:border-t-0 md:pl-8 dark:border-stone-800">
          <PostMeta post={post} />
          <h3 className="blog-article-title mt-5 text-3xl font-medium leading-[1.08] tracking-[-0.03em] text-stone-950 text-balance dark:text-white sm:text-4xl lg:text-[2.8rem]">
            <Link
              href={path}
              className="blog-focus-ring transition-colors hover:text-amber-800 dark:hover:text-amber-300"
            >
              {post.title}
            </Link>
          </h3>
          {post.subtitle ? (
            <p className="mt-4 text-base leading-7 text-stone-700 dark:text-stone-300">
              {post.subtitle}
            </p>
          ) : null}
          <p className="mt-4 line-clamp-3 text-sm leading-7 text-stone-500 dark:text-stone-400">
            {post.excerpt}
          </p>
          <Link
            href={path}
            className="blog-focus-ring mt-7 w-fit border-b border-stone-500 pb-1 text-sm font-semibold text-stone-900 transition-colors hover:border-amber-700 hover:text-amber-800 dark:text-stone-100 dark:hover:text-amber-300"
          >
            Yazıyı oku →
          </Link>
        </div>
      </article>
    );
  }

  return (
    <article className="group flex h-full flex-col border-t border-stone-400 pt-5 dark:border-stone-700">
      <Link
        href={path}
        className="blog-focus-ring block overflow-hidden"
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
        <PostMeta post={post} />
        <h3 className="blog-article-title mt-3 text-[1.75rem] font-medium leading-[1.16] tracking-[-0.025em] text-stone-950 text-balance dark:text-white">
          <Link
            href={path}
            className="blog-focus-ring transition-colors hover:text-amber-800 dark:hover:text-amber-300"
          >
            {post.title}
          </Link>
        </h3>
        <p className="mt-3 line-clamp-3 text-sm leading-7 text-stone-600 dark:text-stone-400">
          {post.excerpt}
        </p>
      </div>
    </article>
  );
}
