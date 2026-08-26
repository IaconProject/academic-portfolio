import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookMarked, Layers3 } from 'lucide-react';
import { BlogJsonLd } from '@/components/blog/BlogJsonLd';
import { getBlogArchive, getBlogChrome } from '@/lib/blog/repository';
import { blogRobots } from '@/lib/blog/seo';
import { absoluteUrl } from '@/lib/seo';

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getBlogChrome();
  const title = 'Öğrenme serileri';
  const description =
    'Karmaşık teknolojileri doğru sırayla öğrenmek için hazırlanmış adım adım blog serileri.';
  return {
    title,
    description,
    alternates: { canonical: '/blog/seriler' },
    robots: blogRobots(settings),
    openGraph: {
      type: 'website',
      url: '/blog/seriler',
      title,
      description,
      siteName: settings.siteName,
      locale: 'tr_TR',
    },
  };
}

export default async function BlogSeriesPage() {
  const { series } = await getBlogArchive({ pageSize: 3 });
  const description =
    'Bir konuyu parçalı yazılar arasında kaybolmadan, temelden ileri seviyeye doğru izleyin.';

  return (
    <main id="blog-content" className="mx-auto w-full max-w-7xl flex-1 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <BlogJsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Öğrenme serileri',
          description,
          url: absoluteUrl('/blog/seriler'),
          mainEntity: {
            '@type': 'ItemList',
            numberOfItems: series.length,
            itemListElement: series.map((item, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: item.title,
              url: absoluteUrl(`/blog/seri/${item.slug}`),
            })),
          },
        }}
      />
      <header className="max-w-3xl">
        <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-amber-700 dark:text-amber-400">
          <Layers3 className="h-4 w-4" /> Yapılandırılmış öğrenme
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.045em] text-stone-950 dark:text-white sm:text-5xl">
          Öğrenme serileri
        </h1>
        <p className="mt-4 text-base leading-7 text-stone-600 dark:text-stone-300 sm:text-lg">
          {description}
        </p>
      </header>

      {series.length ? (
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {series.map((item, index) => (
            <article
              key={item.id}
              className="group flex min-h-72 flex-col overflow-hidden rounded-[1.75rem] border border-stone-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-amber-400 hover:shadow-xl dark:border-stone-800 dark:bg-stone-900 dark:hover:border-amber-700"
            >
              <div className="flex items-start justify-between gap-5">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-950 text-amber-300 dark:bg-amber-500 dark:text-stone-950">
                  <BookMarked className="h-5 w-5" />
                </span>
                <span className="text-5xl font-black tracking-tighter text-stone-100 dark:text-stone-800">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>
              <h2 className="mt-8 text-2xl font-black tracking-tight text-stone-950 dark:text-white">
                {item.title}
              </h2>
              <p className="mt-3 line-clamp-4 text-sm leading-6 text-stone-600 dark:text-stone-300">
                {item.description}
              </p>
              <Link
                href={`/blog/seri/${item.slug}`}
                className="mt-auto inline-flex items-center gap-2 pt-7 text-sm font-black text-stone-900 transition group-hover:text-amber-700 dark:text-stone-100 dark:group-hover:text-amber-400"
              >
                Seriyi aç <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <section className="mt-10 rounded-[2rem] border border-dashed border-stone-300 bg-white px-6 py-16 text-center dark:border-stone-700 dark:bg-stone-900">
          <BookMarked className="mx-auto h-11 w-11 text-amber-600" />
          <h2 className="mt-5 text-2xl font-black">İlk seri hazırlanıyor</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-stone-600 dark:text-stone-300">
            Bitcoin ve yapay zekâ temelleri için adım adım öğrenme yolları
            yayınlandığında burada yer alacak.
          </p>
        </section>
      )}
    </main>
  );
}
