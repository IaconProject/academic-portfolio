import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
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
        <li key={`${item.id}-${item.text}`} className={item.level > 2 ? 'pl-3' : undefined}>
          <a
            href={`#${encodeURIComponent(item.id)}`}
            className="blog-focus-ring block py-0.5 text-xs leading-5 text-stone-500 transition-colors hover:text-stone-950 dark:text-stone-400 dark:hover:text-white"
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
  const dek = post.subtitle || post.excerpt;
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
      datePublished: source.publicationYear ? String(source.publicationYear) : undefined,
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
        <header className="border-b border-[#d8cfc0] dark:border-stone-800">
          <div className="mx-auto max-w-[59rem] px-4 pb-12 pt-10 sm:px-6 sm:pb-16 sm:pt-14 lg:px-8 lg:pb-20 lg:pt-16">
            <Link
              href="/blog/arsiv"
              className="blog-focus-ring text-sm text-stone-500 transition-colors hover:text-stone-950 dark:text-stone-400 dark:hover:text-white"
            >
              ← Yazı arşivi
            </Link>

            <div className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-amber-800 dark:text-amber-300">
              {post.category ? (
                <Link href={`/blog/kategori/${post.category.slug}`} className="blog-focus-ring hover:underline hover:underline-offset-4">
                  {post.category.name}
                </Link>
              ) : null}
              {post.category && post.series ? <span className="text-stone-400" aria-hidden="true">·</span> : null}
              {post.series ? (
                <Link href={`/blog/seri/${post.series.slug}`} className="blog-focus-ring hover:underline hover:underline-offset-4">
                  {post.series.title}
                </Link>
              ) : null}
            </div>

            <h1 className="blog-article-title mt-5 text-[2.8rem] font-medium leading-[1.02] tracking-[-0.045em] text-stone-950 text-balance dark:text-white sm:text-[4rem] lg:text-[4.8rem]">
              {post.title}
            </h1>
            <p className="blog-article-title mt-7 max-w-[42rem] text-xl leading-[1.5] text-stone-600 dark:text-stone-300 sm:text-[1.45rem]">
              {dek}
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-x-2 gap-y-3 border-t border-stone-300 pt-5 text-sm text-stone-500 dark:border-stone-700 dark:text-stone-400">
              <span>{post.authorName}</span>
              {post.publishedAt ? (
                <>
                  <span aria-hidden="true">·</span>
                  <time dateTime={post.publishedAt}>{dateFormatter.format(new Date(post.publishedAt))}</time>
                </>
              ) : null}
              <span aria-hidden="true">·</span>
              <span>{post.readingMinutes} dk okuma</span>
              <span className="basis-full sm:ml-auto sm:basis-auto">
                <BlogShareButton title={post.title} />
              </span>
            </div>
          </div>
        </header>

        <figure className="mx-auto max-w-[72rem] px-4 pt-8 sm:px-6 sm:pt-12 lg:px-8">
          <BlogCover
            src={post.coverImageUrl}
            alt={post.coverImageAlt || post.title}
            priority
            sizes="(max-width: 1152px) 100vw, 1152px"
            className="aspect-[16/9]"
          />
          {post.coverImageAlt && post.coverImageAlt !== post.title ? (
            <figcaption className="mt-3 text-xs leading-5 text-stone-500 dark:text-stone-400">
              {post.coverImageAlt}
            </figcaption>
          ) : null}
        </figure>

        <div className="mx-auto grid max-w-[72rem] justify-center gap-12 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,44rem)_15rem] lg:gap-20 lg:px-8 lg:py-20">
          <div className="min-w-0">
            {toc.length ? (
              <details className="group mb-10 border-y border-stone-300 py-2 dark:border-stone-700 lg:hidden">
                <summary className="blog-focus-ring flex min-h-11 cursor-pointer list-none items-center justify-between py-2 text-sm font-semibold text-stone-800 marker:content-none dark:text-stone-100 [&::-webkit-details-marker]:hidden">
                  Bu yazıda
                  <span className="transition-transform group-open:rotate-90" aria-hidden="true">→</span>
                </summary>
                <TableOfContents items={toc} />
              </details>
            ) : null}

            <div className="blog-prose" dangerouslySetInnerHTML={{ __html: contentHtml }} />

            {post.sources.length ? (
              <section className="mt-16 border-t border-stone-400 pt-9 dark:border-stone-700" aria-labelledby="kaynaklar-basligi">
                <h2 id="kaynaklar-basligi" className="blog-article-title text-3xl font-medium tracking-[-0.025em]">
                  Kaynaklar
                </h2>
                <p className="mt-2 text-sm leading-6 text-stone-500 dark:text-stone-400">
                  Yazıda başvurulan çalışmalar ve birincil kaynaklar.
                </p>
                <ol className="mt-7 list-decimal space-y-6 border-t border-stone-300 py-6 pl-6 marker:text-stone-400 dark:border-stone-700">
                  {post.sources.map((source) => {
                    const href = sourceUrl(source.url, source.doi);
                    return (
                      <li key={source.id} className="pl-2 text-sm leading-6">
                        <p className="font-semibold text-stone-900 dark:text-white">{source.title}</p>
                        <p className="mt-1 text-xs leading-5 text-stone-500 dark:text-stone-400">
                          {[source.authors.join(', '), source.publisher, source.publicationYear].filter(Boolean).join(' · ')}
                        </p>
                        {href ? (
                          <a href={href} target="_blank" rel="noopener noreferrer" className="blog-focus-ring mt-2 inline-block text-xs font-semibold text-stone-700 underline decoration-stone-400 underline-offset-4 dark:text-stone-300">
                            Kaynağı aç ↗
                          </a>
                        ) : null}
                      </li>
                    );
                  })}
                </ol>
              </section>
            ) : null}

            {post.tags.length ? (
              <nav className="mt-10 flex flex-wrap items-baseline gap-x-3 gap-y-2 border-t border-stone-300 pt-6 text-sm dark:border-stone-700" aria-label="Yazı etiketleri">
                <span className="text-stone-500 dark:text-stone-400">Konular:</span>
                {post.tags.map((tag) => (
                  <Link key={tag.id} href={`/blog/etiket/${tag.slug}`} className="blog-focus-ring border-b border-stone-400 text-stone-800 transition-colors hover:border-amber-700 hover:text-amber-800 dark:text-stone-200 dark:hover:text-amber-300">
                    {tag.name}
                  </Link>
                ))}
              </nav>
            ) : null}
          </div>

          {toc.length ? (
            <aside className="hidden lg:block">
              <nav className="sticky top-28 border-t border-stone-400 pt-4 dark:border-stone-700" aria-label="İçindekiler">
                <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">Bu yazıda</p>
                <TableOfContents items={toc} />
              </nav>
            </aside>
          ) : null}
        </div>
      </article>

      {settings.newsletter.enabled ? (
        <section className="border-y border-[#d8cfc0] bg-[#fbf8f1] dark:border-stone-800 dark:bg-stone-950/30">
          <div className="mx-auto grid max-w-[59rem] items-center gap-9 px-4 py-12 sm:px-6 md:grid-cols-[0.85fr_1.15fr] md:py-16 lg:gap-14 lg:px-8">
            <div>
              <p className="text-sm text-amber-800 dark:text-amber-300">E-posta bülteni</p>
              <h2 className="blog-article-title mt-2 text-3xl font-medium tracking-[-0.025em]">
                Yeni yazıları kaçırmayın
              </h2>
            </div>
            <BlogNewsletterForm compact source="blog-post" postId={post.id} />
          </div>
        </section>
      ) : null}

      {post.relatedPosts.length ? (
        <section className="mx-auto max-w-[76rem] px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <div className="border-t border-stone-400 pt-5 dark:border-stone-700">
            <p className="text-sm text-amber-800 dark:text-amber-300">Okuma listesi</p>
            <h2 className="blog-article-title mt-2 text-3xl font-medium tracking-[-0.03em] sm:text-[2.6rem]">Buradan devam edin</h2>
          </div>
          <div className="mt-10 grid gap-x-10 gap-y-12 md:grid-cols-2">
            {post.relatedPosts.map((related) => (
              <BlogPostCard key={related.id} post={related} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
