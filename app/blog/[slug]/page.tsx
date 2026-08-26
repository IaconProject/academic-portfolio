import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  BookOpenCheck,
  CalendarDays,
  Clock3,
  ExternalLink,
  Hash,
  Library,
  UserRound,
} from 'lucide-react';
import {
  BlogReadingProgress,
  BlogShareButton,
} from '@/components/blog/BlogArticleTools';
import { BlogCover } from '@/components/blog/BlogCover';
import { BlogJsonLd } from '@/components/blog/BlogJsonLd';
import { BlogNewsletterForm } from '@/components/blog/BlogNewsletterForm';
import { BlogMathRenderer } from '@/components/blog/BlogMathRenderer';
import { BlogPostCard } from '@/components/blog/BlogPostCard';
import { BlogPostAnalytics } from '@/components/blog/BlogPostAnalytics';
import { renderBlogContentHtml } from '@/lib/blog/content';
import { getBlogChrome, getBlogPostBySlug } from '@/lib/blog/repository';
import { breadcrumbJsonLd, blogRobots } from '@/lib/blog/seo';
import { absoluteUrl } from '@/lib/seo';
import { safeHttpUrl } from '@/lib/url-security';

export const revalidate = 300;

interface PageProps {
  params: Promise<{ slug: string }>;
}

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Istanbul',
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const [post, { settings }] = await Promise.all([
    getBlogPostBySlug(slug),
    getBlogChrome(),
  ]);
  if (!post) return { robots: { index: false, follow: false } };

  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.excerpt;
  const canonical = safeHttpUrl(post.canonicalUrl) || `/blog/${post.slug}`;
  const cover = safeHttpUrl(post.coverImageUrl);
  return {
    title,
    description,
    authors: [{ name: post.authorName, url: '/' }],
    category: post.category?.name,
    keywords: [
      post.focusKeyword,
      ...post.relatedKeywords,
      ...post.tags.map((tag) => tag.name),
    ].filter((value): value is string => Boolean(value)),
    alternates: { canonical },
    robots: blogRobots(settings, post.allowIndexing),
    openGraph: {
      type: 'article',
      locale: 'tr_TR',
      url: canonical,
      siteName: settings.siteName,
      title,
      description,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.authorName],
      section: post.category?.name,
      tags: post.tags.map((tag) => tag.name),
      images: cover ? [{ url: cover, alt: post.coverImageAlt }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: cover ? [cover] : undefined,
    },
  };
}

function sourceUrl(url?: string, doi?: string) {
  return safeHttpUrl(url) || (doi ? safeHttpUrl(`https://doi.org/${doi}`) : undefined);
}

function TableOfContents({
  items,
}: {
  items: Array<{ id: string; text: string; level: number }>;
}) {
  return (
    <ol className="mt-4 space-y-2.5 border-l border-stone-300 pl-4 dark:border-stone-700">
      {items.map((item) => (
        <li
          key={`${item.id}-${item.text}`}
          className={item.level > 2 ? 'pl-3' : undefined}
        >
          <a
            href={`#${encodeURIComponent(item.id)}`}
            className="blog-focus-ring block rounded-md py-0.5 text-xs font-medium leading-5 text-stone-600 transition-colors hover:text-amber-800 dark:text-stone-300 dark:hover:text-amber-300"
          >
            {item.text}
          </a>
        </li>
      ))}
    </ol>
  );
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const [post, { settings }] = await Promise.all([
    getBlogPostBySlug(slug),
    getBlogChrome(),
  ]);
  if (!post) notFound();

  const path = `/blog/${post.slug}`;
  const canonical = safeHttpUrl(post.canonicalUrl) || absoluteUrl(path);
  const description = post.seoDescription || post.excerpt;
  const contentHtml = renderBlogContentHtml(post.contentHtml, post.contentText);
  const toc = post.tableOfContents.filter(
    (item) =>
      item &&
      typeof item.id === 'string' &&
      typeof item.text === 'string' &&
      Number.isFinite(item.level)
  );
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    '@id': `${canonical}#article`,
    mainEntityOfPage: canonical,
    headline: post.title,
    alternativeHeadline: post.subtitle || undefined,
    description,
    image: safeHttpUrl(post.coverImageUrl) || undefined,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    inLanguage: 'tr-TR',
    articleSection: post.category?.name,
    keywords: [
      post.focusKeyword,
      ...post.relatedKeywords,
      ...post.tags.map((tag) => tag.name),
    ].filter(Boolean),
    wordCount: post.wordCount || undefined,
    timeRequired: `PT${post.readingMinutes}M`,
    author: {
      '@type': 'Person',
      '@id': `${absoluteUrl('/')}#person`,
      name: post.authorName,
      url: absoluteUrl('/'),
    },
    publisher: {
      '@type': 'Person',
      '@id': `${absoluteUrl('/')}#person`,
      name: settings.authorName,
    },
    citation: post.sources.map((source) => ({
      '@type': 'CreativeWork',
      name: source.title,
      author: source.authors.join(', ') || undefined,
      publisher: source.publisher || undefined,
      datePublished: source.publicationYear
        ? String(source.publicationYear)
        : undefined,
      url: sourceUrl(source.url, source.doi),
    })),
  };

  return (
    <main id="blog-content" className="flex-1" data-blog-article>
      <BlogPostAnalytics postId={post.id} />
      <BlogReadingProgress />
      <BlogMathRenderer />
      <BlogJsonLd data={articleJsonLd} />
      <BlogJsonLd
        data={breadcrumbJsonLd([
          { name: 'Blog', path: '/blog' },
          { name: 'Yazı arşivi', path: '/blog/arsiv' },
          { name: post.title, path },
        ])}
      />

      <article>
        <header className="relative overflow-hidden border-b border-[#d8cfc0] dark:border-stone-800">
          <div className="blog-signal-field pointer-events-none absolute inset-0 opacity-45 dark:opacity-20" aria-hidden="true" />
          <div className="relative mx-auto max-w-[74rem] px-4 pb-10 pt-9 sm:px-6 sm:pb-14 sm:pt-12 lg:px-8 lg:pb-16">
            <Link
              href="/blog/arsiv"
              className="blog-focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg text-[0.68rem] font-semibold uppercase tracking-[0.15em] text-stone-600 transition-colors hover:text-amber-800 dark:text-stone-400 dark:hover:text-amber-300"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Arşive dön
            </Link>

            <div className="mt-5 flex flex-wrap items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.14em]">
              {post.category ? (
                <Link
                  href={`/blog/kategori/${post.category.slug}`}
                  className="blog-focus-ring rounded-md bg-amber-200/70 px-3 py-1.5 text-amber-950 transition-colors hover:bg-amber-200 dark:bg-amber-500/15 dark:text-amber-300"
                >
                  {post.category.name}
                </Link>
              ) : null}
              {post.series ? (
                <Link
                  href={`/blog/seri/${post.series.slug}`}
                  className="blog-focus-ring rounded-md border border-stone-300 px-3 py-1.5 text-stone-600 transition-colors hover:border-stone-500 dark:border-stone-700 dark:text-stone-300"
                >
                  Seri · {post.series.title}
                </Link>
              ) : null}
            </div>

            <h1 className="blog-article-title mt-6 max-w-[18ch] text-[2.55rem] font-semibold leading-[1.02] tracking-[-0.042em] text-stone-950 text-balance dark:text-white sm:text-5xl lg:text-[4.15rem]">
              {post.title}
            </h1>
            {post.subtitle ? (
              <p className="mt-5 max-w-[46rem] text-lg font-medium leading-8 text-stone-700 dark:text-stone-200 sm:text-xl">
                {post.subtitle}
              </p>
            ) : null}
            <p className="mt-5 max-w-[44rem] text-base leading-7 text-stone-600 dark:text-stone-300 sm:text-lg sm:leading-8">
              {post.excerpt}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-stone-300 pt-5 text-xs font-medium text-stone-600 dark:border-stone-700 dark:text-stone-400 sm:gap-x-5">
              <span className="inline-flex min-h-8 items-center gap-2">
                <UserRound className="h-4 w-4 text-stone-500" aria-hidden="true" />
                {post.authorName}
              </span>
              {post.publishedAt ? (
                <time dateTime={post.publishedAt} className="inline-flex min-h-8 items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-stone-500" aria-hidden="true" />
                  {dateFormatter.format(new Date(post.publishedAt))}
                </time>
              ) : null}
              <span className="inline-flex min-h-8 items-center gap-2">
                <Clock3 className="h-4 w-4 text-stone-500" aria-hidden="true" />
                {post.readingMinutes} dk okuma
              </span>
              <span className="sm:ml-auto">
                <BlogShareButton title={post.title} />
              </span>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[78rem] px-4 pt-7 sm:px-6 sm:pt-10 lg:px-8">
          <BlogCover
            src={post.coverImageUrl}
            alt={post.coverImageAlt || post.title}
            priority
            sizes="(max-width: 1280px) 100vw, 1248px"
            className="aspect-[16/8.5] rounded-2xl shadow-2xl shadow-stone-950/10 sm:rounded-3xl"
          />
        </div>

        <div className="mx-auto grid max-w-[78rem] justify-center gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,46rem)_17rem] lg:gap-16 lg:px-8 lg:py-20">
          <div className="min-w-0">
            {toc.length ? (
              <details className="group mb-9 border-y border-stone-300 py-2 dark:border-stone-700 lg:hidden">
                <summary className="blog-focus-ring flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 rounded-lg py-2 text-sm font-bold text-stone-800 marker:content-none dark:text-stone-100 [&::-webkit-details-marker]:hidden">
                  <span className="inline-flex items-center gap-2">
                    <BookOpenCheck className="h-4 w-4 text-amber-700 dark:text-amber-300" aria-hidden="true" />
                    Bu yazıda
                  </span>
                  <span className="font-mono text-xs text-stone-500 group-open:rotate-90" aria-hidden="true">→</span>
                </summary>
                <TableOfContents items={toc} />
              </details>
            ) : null}

            <div
              className="blog-prose"
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />

            {post.sources.length ? (
              <section
                className="mt-16 border-t border-stone-300 pt-9 dark:border-stone-700"
                aria-labelledby="kaynaklar-basligi"
              >
                <div className="flex items-center gap-3">
                  <Library className="h-5 w-5 text-amber-700 dark:text-amber-300" aria-hidden="true" />
                  <h2 id="kaynaklar-basligi" className="text-2xl font-bold tracking-[-0.025em]">
                    Kaynaklar
                  </h2>
                </div>
                <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-400">
                  Yazıda başvurulan çalışmalar ve birincil kaynaklar.
                </p>
                <ol className="mt-6 border-t border-stone-300 dark:border-stone-700">
                  {post.sources.map((source, index) => {
                    const href = sourceUrl(source.url, source.doi);
                    return (
                      <li key={source.id} className="grid grid-cols-[2rem_1fr] gap-3 border-b border-stone-300 py-5 text-sm leading-6 dark:border-stone-700">
                        <span className="font-mono text-xs font-bold text-amber-800 dark:text-amber-300">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-stone-900 dark:text-white">{source.title}</p>
                          <p className="mt-1 text-xs leading-5 text-stone-600 dark:text-stone-400">
                            {[source.authors.join(', '), source.publisher, source.publicationYear]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                          {href ? (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="blog-focus-ring mt-2 inline-flex max-w-full items-center gap-1.5 rounded-md text-xs font-bold text-cyan-800 underline decoration-cyan-800/30 underline-offset-4 dark:text-cyan-300"
                            >
                              Kaynağı aç <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            </a>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>
            ) : null}

            {post.tags.length ? (
              <nav className="mt-9 flex flex-wrap gap-2" aria-label="Yazı etiketleri">
                {post.tags.map((tag) => (
                  <Link
                    key={tag.id}
                    href={`/blog/etiket/${tag.slug}`}
                    className="blog-focus-ring inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-stone-300 px-3 text-xs font-semibold text-stone-600 transition-colors hover:border-amber-600 hover:text-stone-950 dark:border-stone-700 dark:text-stone-300 dark:hover:text-white"
                  >
                    <Hash className="h-3.5 w-3.5" aria-hidden="true" /> {tag.name}
                  </Link>
                ))}
              </nav>
            ) : null}
          </div>

          {toc.length ? (
            <aside className="hidden lg:block">
              <nav className="sticky top-28 border-t-2 border-stone-900 pt-4 dark:border-stone-200" aria-label="İçindekiler">
                <p className="inline-flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.15em] text-stone-600 dark:text-stone-400">
                  <BookOpenCheck className="h-4 w-4" aria-hidden="true" /> Bu yazıda
                </p>
                <TableOfContents items={toc} />
              </nav>
            </aside>
          ) : null}
        </div>
      </article>

      {settings.newsletter.enabled ? (
        <section className="border-y border-stone-800 bg-stone-950 text-white">
          <div className="mx-auto grid max-w-[70rem] items-center gap-8 px-4 py-10 sm:px-6 md:grid-cols-[0.85fr_1.15fr] md:py-12 lg:px-8">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-amber-300">Yeni yazılar</p>
              <h2 className="mt-2 text-2xl font-bold tracking-[-0.025em] sm:text-3xl">
                Araştırma notlarını e-postanızda alın
              </h2>
            </div>
            <BlogNewsletterForm compact source="blog-post" postId={post.id} />
          </div>
        </section>
      ) : null}

      {post.relatedPosts.length ? (
        <section className="mx-auto max-w-[82rem] px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="border-t border-stone-300 pt-5 dark:border-stone-700">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-amber-800 dark:text-amber-300">Sonraki rota</p>
            <h2 className="mt-2 text-3xl font-bold tracking-[-0.035em]">Okumaya devam edin</h2>
          </div>
          <div className="mt-9 grid gap-x-7 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
            {post.relatedPosts.map((related) => (
              <BlogPostCard key={related.id} post={related} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
