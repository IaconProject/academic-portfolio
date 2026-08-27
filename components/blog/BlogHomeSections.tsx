import Link from 'next/link';
import type { BlogHomeData, BlogHomeSection } from '@/lib/blog/types';
import { sanitizeBlogHtml } from '@/lib/blog/content';
import { BlogNewsletterForm } from './BlogNewsletterForm';
import { BlogPostCard } from './BlogPostCard';
import { BlogSectionHeading } from './BlogSectionHeading';

function sectionLimit(section: BlogHomeSection, fallback: number) {
  const configured = Number(section.config.limit);
  return Number.isFinite(configured)
    ? Math.min(12, Math.max(1, configured))
    : fallback;
}

const DEFAULT_TOPIC_ROUTES = [
  {
    id: 'bitcoin',
    name: 'Bitcoin',
    description: 'İş kanıtı, arz modeli ve ağın çalışma biçimi',
    href: '/blog/ara?q=Bitcoin',
  },
  {
    id: 'blockchain',
    name: 'Blok zinciri',
    description: 'Dağıtık kayıt, mutabakat ve güven problemi',
    href: '/blog/ara?q=blok+zinciri',
  },
  {
    id: 'ai',
    name: 'Yapay zekâ',
    description: 'Modeller, öğrenme yöntemleri ve üretken sistemler',
    href: '/blog/ara?q=yapay+zeka',
  },
];

export function BlogHomeSections({ data }: { data: BlogHomeData }) {
  const topicRoutes = data.categories.length
    ? data.categories.slice(0, 4).map((category) => ({
        id: category.id,
        name: category.name,
        description: category.description,
        href: `/blog/kategori/${category.slug}`,
      }))
    : DEFAULT_TOPIC_ROUTES;

  return (
    <>
      {data.sections.map((section) => {
        if (section.sectionType === 'hero') {
          return (
            <section
              key={section.id}
              className="border-b border-[#d8cfc0] dark:border-stone-800"
            >
              <div className="mx-auto max-w-[76rem] px-4 pb-12 pt-14 sm:px-6 sm:pb-16 sm:pt-20 lg:px-8 lg:pb-20 lg:pt-24">
                <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end lg:gap-20">
                  <div className="max-w-[52rem]">
                    <p className="text-sm leading-6 text-amber-800 dark:text-amber-300">
                      Muhammed Akan’ın teknoloji notları
                    </p>
                    <h1 className="blog-article-title mt-4 text-[3.15rem] font-medium leading-[0.98] tracking-[-0.045em] text-stone-950 text-balance dark:text-white sm:text-[4.5rem] lg:text-[5.5rem]">
                      {section.heading || data.settings.tagline}
                    </h1>
                    <p className="mt-7 max-w-[43rem] text-lg leading-8 text-stone-600 dark:text-stone-300 sm:text-xl sm:leading-9">
                      {section.subheading || data.settings.description}
                    </p>
                  </div>

                  <form
                    action="/blog/ara"
                    role="search"
                    className="border-t border-stone-400 pt-5 dark:border-stone-700"
                  >
                    <label htmlFor={`blog-search-${section.id}`} className="text-sm text-stone-600 dark:text-stone-400">
                      Belirli bir kavramı mı arıyorsunuz?
                    </label>
                    <div className="mt-3 flex items-center border-b border-stone-500 dark:border-stone-600">
                      <input
                        id={`blog-search-${section.id}`}
                        name="q"
                        className="blog-focus-ring h-12 min-w-0 flex-1 bg-transparent pr-3 text-base text-stone-950 outline-none placeholder:text-stone-500 dark:text-white dark:placeholder:text-stone-500"
                        placeholder="Örn. Bitcoin madenciliği"
                      />
                      <button className="blog-focus-ring h-12 shrink-0 px-1 text-sm font-semibold text-stone-900 transition-colors hover:text-amber-800 dark:text-stone-100 dark:hover:text-amber-300">
                        Ara →
                      </button>
                    </div>
                  </form>
                </div>

                <nav
                  className="mt-12 grid border-t border-stone-300 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4 dark:border-stone-800"
                  aria-label="Blog konu başlıkları"
                >
                  {topicRoutes.map((topic) => (
                    <Link
                      key={topic.id}
                      href={topic.href}
                      className="blog-focus-ring group border-b border-stone-300 py-5 sm:px-5 sm:first:pl-0 lg:border-b-0 lg:border-r lg:last:border-r-0 dark:border-stone-800"
                    >
                      <span className="blog-article-title block text-xl font-medium text-stone-950 transition-colors group-hover:text-amber-800 dark:text-white dark:group-hover:text-amber-300">
                        {topic.name}
                      </span>
                      <span className="mt-1.5 block text-sm leading-6 text-stone-500 dark:text-stone-400">
                        {topic.description}
                      </span>
                    </Link>
                  ))}
                </nav>
              </div>
            </section>
          );
        }

        if (section.sectionType === 'featured_posts') {
          const posts = data.featuredPosts.slice(0, sectionLimit(section, 3));
          if (!posts.length) return null;
          return (
            <section key={section.id} className="mx-auto max-w-[76rem] px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
              <BlogSectionHeading
                eyebrow="Öne çıkan"
                heading={section.heading}
                description={section.subheading}
                href="/blog/arsiv"
              />
              <BlogPostCard post={posts[0]} featured priority />
              {posts.length > 1 ? (
                <div className="mt-12 grid gap-x-10 gap-y-12 md:grid-cols-2">
                  {posts.slice(1).map((post) => (
                    <BlogPostCard key={post.id} post={post} />
                  ))}
                </div>
              ) : null}
            </section>
          );
        }

        if (section.sectionType === 'latest_posts') {
          const posts = data.latestPosts.slice(0, sectionLimit(section, 6));
          return (
            <section key={section.id} className="border-y border-[#d8cfc0] bg-[#fbf8f1] dark:border-stone-800 dark:bg-stone-950/30">
              <div className="mx-auto max-w-[76rem] px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
                <BlogSectionHeading
                  eyebrow="Yeni yazılar"
                  heading={section.heading}
                  description={section.subheading}
                  href="/blog/arsiv"
                />
                {posts.length ? (
                  <div className="grid gap-x-10 gap-y-12 md:grid-cols-2">
                    {posts.map((post) => (
                      <BlogPostCard key={post.id} post={post} />
                    ))}
                  </div>
                ) : (
                  <div className="border-y border-stone-300 py-9 dark:border-stone-700">
                    <h3 className="blog-article-title text-2xl font-medium">İlk yazılar hazırlanıyor.</h3>
                    <p className="mt-2 max-w-2xl text-sm leading-7 text-stone-600 dark:text-stone-300">
                      Blok zinciri ve yapay zekâ temellerini adım adım açıklayan
                      kaynaklı içerikler yakında burada olacak.
                    </p>
                  </div>
                )}
              </div>
            </section>
          );
        }

        if (section.sectionType === 'category_grid') {
          const categories = data.categories.slice(0, sectionLimit(section, 6));
          if (!categories.length) return null;
          return (
            <section key={section.id} className="mx-auto max-w-[76rem] px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
              <BlogSectionHeading
                eyebrow="Konular"
                heading={section.heading}
                description={section.subheading}
              />
              <div className="grid gap-x-12 md:grid-cols-2">
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/blog/kategori/${category.slug}`}
                    className="blog-focus-ring group grid grid-cols-[1fr_auto] gap-6 border-t border-stone-300 py-6 dark:border-stone-700"
                  >
                    <span>
                      <span className="blog-article-title block text-2xl font-medium text-stone-950 transition-colors group-hover:text-amber-800 dark:text-white dark:group-hover:text-amber-300">
                        {category.name}
                      </span>
                      <span className="mt-2 block max-w-md text-sm leading-6 text-stone-600 dark:text-stone-400">
                        {category.description}
                      </span>
                    </span>
                    <span className="pt-1 text-lg text-stone-400 transition-transform group-hover:translate-x-1" aria-hidden="true">
                      →
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          );
        }

        if (section.sectionType === 'series_spotlight') {
          const series = data.series[0];
          if (!series) return null;
          return (
            <section key={section.id} className="border-y border-[#d8cfc0] dark:border-stone-800">
              <div className="mx-auto grid max-w-[76rem] gap-7 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-16 lg:px-8">
                <div>
                  <p className="text-sm text-amber-800 dark:text-amber-300">Yazı serisi</p>
                  <h2 className="blog-article-title mt-2 text-3xl font-medium tracking-[-0.025em] text-stone-950 dark:text-white sm:text-4xl">
                    {series.title}
                  </h2>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-600 dark:text-stone-300">
                    {series.description}
                  </p>
                </div>
                <Link
                  href={`/blog/seri/${series.slug}`}
                  className="blog-focus-ring border-b border-stone-500 pb-1 text-sm font-semibold text-stone-900 transition-colors hover:border-amber-700 hover:text-amber-800 dark:text-stone-100 dark:hover:text-amber-300"
                >
                  Seriyi incele →
                </Link>
              </div>
            </section>
          );
        }

        if (section.sectionType === 'newsletter') {
          if (!data.settings.newsletter.enabled) return null;
          return (
            <section key={section.id} className="mx-auto max-w-[76rem] px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
              <div className="grid gap-10 border-y border-stone-400 py-10 sm:py-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16 dark:border-stone-700">
                <div>
                  <p className="text-sm text-amber-800 dark:text-amber-300">E-posta bülteni</p>
                  <h2 className="blog-article-title mt-2 text-3xl font-medium tracking-[-0.025em] text-stone-950 dark:text-white sm:text-4xl">
                    {section.heading}
                  </h2>
                  <p className="mt-4 max-w-xl text-sm leading-7 text-stone-600 dark:text-stone-300">
                    {section.subheading}
                  </p>
                </div>
                <BlogNewsletterForm />
              </div>
            </section>
          );
        }

        if (section.sectionType === 'rich_text') {
          const html =
            typeof section.config.html === 'string'
              ? sanitizeBlogHtml(section.config.html)
              : '';
          if (!html) return null;
          return (
            <section key={section.id} className="mx-auto max-w-[44rem] px-4 py-14 sm:px-6 lg:px-8">
              <div
                className="blog-prose"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </section>
          );
        }

        return null;
      })}
    </>
  );
}
