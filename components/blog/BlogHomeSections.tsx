import Link from 'next/link';
import {
  ArrowRight,
  Blocks,
  BookOpenCheck,
  BrainCircuit,
  Cpu,
  Search,
} from 'lucide-react';
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

function categoryIcon(icon: string) {
  if (icon === 'brain') return BrainCircuit;
  if (icon === 'cpu') return Cpu;
  return Blocks;
}

const DEFAULT_TOPIC_ROUTES = [
  {
    id: 'bitcoin',
    name: 'Bitcoin’i anlayın',
    description: 'İş kanıtından arz modeline',
    href: '/blog/ara?q=Bitcoin',
    icon: Blocks,
  },
  {
    id: 'blockchain',
    name: 'Blok zincirini çözün',
    description: 'Dağıtık kayıt ve mutabakat',
    href: '/blog/ara?q=blok+zinciri',
    icon: Cpu,
  },
  {
    id: 'ai',
    name: 'Yapay zekâyı keşfedin',
    description: 'Modellerden üretken sistemlere',
    href: '/blog/ara?q=yapay+zeka',
    icon: BrainCircuit,
  },
];

export function BlogHomeSections({ data }: { data: BlogHomeData }) {
  const topicRoutes = data.categories.length
    ? data.categories.slice(0, 4).map((category) => ({
        id: category.id,
        name: category.name,
        description: category.description,
        href: `/blog/kategori/${category.slug}`,
        icon: categoryIcon(category.icon),
      }))
    : DEFAULT_TOPIC_ROUTES;

  return (
    <>
      {data.sections.map((section) => {
        if (section.sectionType === 'hero') {
          return (
            <section
              key={section.id}
              className="relative isolate overflow-hidden border-b border-[#d8cfc0] bg-[#efe8da] dark:border-stone-800 dark:bg-stone-950"
            >
              <div className="blog-signal-field pointer-events-none absolute inset-0 opacity-70 dark:opacity-30" aria-hidden="true" />
              <div className="relative mx-auto grid max-w-[82rem] gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,1.18fr)_minmax(19rem,0.72fr)] lg:items-center lg:gap-16 lg:px-8 lg:py-24">
                <div className="max-w-3xl">
                  <div className="flex items-center gap-3 text-[0.68rem] font-semibold uppercase tracking-[0.17em] text-stone-600 dark:text-stone-300">
                    <span className="h-px w-8 bg-amber-700 dark:bg-amber-400" />
                    Kaynaklı teknoloji notları
                  </div>
                  <h1 className="mt-6 text-[2.65rem] font-bold leading-[0.99] tracking-[-0.052em] text-stone-950 text-balance dark:text-white min-[390px]:text-5xl sm:text-6xl lg:text-[4.65rem]">
                    {section.heading || data.settings.tagline}
                  </h1>
                  <p className="mt-6 max-w-[42rem] text-base leading-7 text-stone-700 dark:text-stone-300 sm:text-lg sm:leading-8">
                    {section.subheading || data.settings.description}
                  </p>

                  <form
                    action="/blog/ara"
                    role="search"
                    className="mt-8 flex max-w-[42rem] flex-col gap-2 border-t border-stone-400/70 pt-4 sm:flex-row dark:border-stone-700"
                  >
                    <label className="relative min-w-0 flex-1">
                      <span className="sr-only">Blogda ara</span>
                      <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-600 dark:text-stone-400" />
                      <input
                        name="q"
                        className="blog-focus-ring h-14 w-full rounded-xl border border-stone-300 bg-[#fffaf1] pl-12 pr-4 text-base font-medium text-stone-950 outline-none placeholder:text-stone-600 dark:border-stone-700 dark:bg-stone-900 dark:text-white dark:placeholder:text-stone-400"
                        placeholder="Örn. Bitcoin madenciliği"
                      />
                    </label>
                    <button className="blog-focus-ring inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-stone-950 px-6 text-sm font-bold text-white transition-colors hover:bg-stone-800 dark:bg-amber-400 dark:text-stone-950 dark:hover:bg-amber-300">
                      Yazıyı bul
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </form>
                </div>

                <aside className="border border-stone-800 bg-stone-950 p-5 text-white shadow-2xl shadow-stone-950/15 sm:p-7 dark:border-stone-700">
                  <div className="flex items-center justify-between gap-4 border-b border-stone-800 pb-4">
                    <div>
                      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.17em] text-amber-300">
                        Başlangıç rotaları
                      </p>
                      <h2 className="mt-1.5 text-xl font-bold tracking-[-0.02em]">
                        Nereden başlamak istersiniz?
                      </h2>
                    </div>
                    <span className="font-mono text-xs text-stone-400" aria-hidden="true">
                      00→
                    </span>
                  </div>
                  <ol className="divide-y divide-stone-800">
                    {topicRoutes.map((topic, index) => {
                      const Icon = topic.icon;
                      return (
                        <li key={topic.id}>
                          <Link
                            href={topic.href}
                            className="blog-focus-ring group grid min-h-[5.25rem] grid-cols-[2rem_1fr_auto] items-center gap-3 rounded-lg py-3 text-left"
                          >
                            <span className="font-mono text-[0.65rem] text-stone-400">
                              {String(index + 1).padStart(2, '0')}
                            </span>
                            <span>
                              <span className="block text-sm font-semibold text-stone-100 transition-colors group-hover:text-amber-300">
                                {topic.name}
                              </span>
                              <span className="mt-1 block line-clamp-1 text-xs leading-5 text-stone-400">
                                {topic.description}
                              </span>
                            </span>
                            <span className="flex h-9 w-9 items-center justify-center border border-stone-700 text-stone-400 transition-colors group-hover:border-amber-400 group-hover:text-amber-300">
                              <Icon className="h-4 w-4" aria-hidden="true" />
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ol>
                </aside>
              </div>
            </section>
          );
        }

        if (section.sectionType === 'featured_posts') {
          const posts = data.featuredPosts.slice(0, sectionLimit(section, 3));
          if (!posts.length) return null;
          return (
            <section key={section.id} className="mx-auto max-w-[82rem] px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
              <BlogSectionHeading
                eyebrow="Editör seçkisi"
                heading={section.heading}
                description={section.subheading}
                href="/blog/arsiv"
              />
              <div className="space-y-8">
                <BlogPostCard post={posts[0]} featured priority />
                {posts.length > 1 ? (
                  <div className="grid gap-8 md:grid-cols-2">
                    {posts.slice(1).map((post) => (
                      <BlogPostCard key={post.id} post={post} />
                    ))}
                  </div>
                ) : null}
              </div>
            </section>
          );
        }

        if (section.sectionType === 'latest_posts') {
          const posts = data.latestPosts.slice(0, sectionLimit(section, 6));
          return (
            <section key={section.id} className="border-y border-[#d8cfc0] bg-[#fffcf6] dark:border-stone-800 dark:bg-stone-950/35">
              <div className="mx-auto max-w-[82rem] px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
                <BlogSectionHeading
                  eyebrow="Güncel"
                  heading={section.heading}
                  description={section.subheading}
                  href="/blog/arsiv"
                />
                {posts.length ? (
                  <div className="grid gap-x-7 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
                    {posts.map((post) => (
                      <BlogPostCard key={post.id} post={post} />
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-7 border-t border-dashed border-stone-300 py-10 sm:grid-cols-[auto_1fr_auto] sm:items-center dark:border-stone-700">
                    <span className="flex h-12 w-12 items-center justify-center border border-stone-300 text-amber-700 dark:border-stone-700 dark:text-amber-300">
                      <BookOpenCheck className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="text-lg font-bold">İlk yazılar yayına hazırlanıyor</h3>
                      <p className="mt-1 max-w-2xl text-sm leading-6 text-stone-600 dark:text-stone-300">
                        Blok zinciri ve yapay zekâ temellerini adım adım açıklayan,
                        kaynaklı içerikler yakında burada olacak.
                      </p>
                    </div>
                    <Link
                      href="/blog/arsiv"
                      className="blog-focus-ring inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-bold text-stone-800 dark:text-stone-100"
                    >
                      Arşivi kontrol et <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
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
            <section key={section.id} className="mx-auto max-w-[82rem] px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
              <BlogSectionHeading
                eyebrow="Öğrenme yolları"
                heading={section.heading}
                description={section.subheading}
              />
              <div className="grid border-l border-t border-stone-300 sm:grid-cols-2 lg:grid-cols-3 dark:border-stone-700">
                {categories.map((category, index) => {
                  const Icon = categoryIcon(category.icon);
                  return (
                    <Link
                      key={category.id}
                      href={`/blog/kategori/${category.slug}`}
                      className="blog-focus-ring group min-h-64 border-b border-r border-stone-300 bg-[#fffcf6] p-6 transition-colors hover:bg-amber-50 dark:border-stone-700 dark:bg-stone-900 dark:hover:bg-stone-800 sm:p-7"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <span className="flex h-11 w-11 items-center justify-center border border-stone-300 bg-white text-stone-800 dark:border-stone-700 dark:bg-stone-950 dark:text-amber-300">
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <span className="font-mono text-[0.65rem] text-stone-400">
                          /{String(index + 1).padStart(2, '0')}
                        </span>
                      </div>
                      <h3 className="mt-8 text-xl font-bold tracking-[-0.025em] text-stone-950 dark:text-white">
                        {category.name}
                      </h3>
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-stone-600 dark:text-stone-300">
                        {category.description}
                      </p>
                      <span className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-stone-700 dark:text-stone-200">
                        Yazıları keşfet
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        }

        if (section.sectionType === 'series_spotlight') {
          const series = data.series[0];
          if (!series) return null;
          return (
            <section key={section.id} className="mx-auto max-w-[82rem] px-4 py-14 sm:px-6 lg:px-8">
              <div className="relative overflow-hidden bg-stone-950 p-7 text-white sm:p-11 lg:grid lg:grid-cols-[1fr_auto] lg:items-end lg:gap-12">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-amber-400 via-cyan-400 to-transparent" />
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.17em] text-amber-300">
                    Derin okuma · Yazı serisi
                  </p>
                  <h2 className="mt-3 text-3xl font-bold tracking-[-0.035em] sm:text-4xl">
                    {series.title}
                  </h2>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-300">
                    {series.description}
                  </p>
                </div>
                <Link
                  href={`/blog/seri/${series.slug}`}
                  className="blog-focus-ring mt-7 inline-flex min-h-12 items-center gap-2 rounded-xl bg-amber-400 px-5 text-sm font-bold text-stone-950 transition-colors hover:bg-amber-300 lg:mt-0"
                >
                  Seriyi aç <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </section>
          );
        }

        if (section.sectionType === 'newsletter') {
          if (!data.settings.newsletter.enabled) return null;
          return (
            <section key={section.id} className="mx-auto max-w-[82rem] px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
              <div className="grid gap-9 border border-stone-800 bg-stone-950 p-7 text-white shadow-2xl shadow-stone-950/10 sm:p-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:p-12">
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.17em] text-amber-300">
                    Sade · Seyrek · Kaynaklı
                  </p>
                  <h2 className="mt-3 text-3xl font-bold tracking-[-0.035em] sm:text-4xl">
                    {section.heading}
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-stone-300">
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
            <section key={section.id} className="mx-auto max-w-[46rem] px-4 py-14 sm:px-6 lg:px-8">
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
