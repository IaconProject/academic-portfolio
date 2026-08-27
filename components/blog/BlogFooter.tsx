import Link from 'next/link';
import type { BlogNavigationItem, BlogSettings } from '@/lib/blog/types';
import { safeHttpUrl } from '@/lib/url-security';

export function BlogFooter({
  settings,
  navigation,
}: {
  settings: BlogSettings;
  navigation: BlogNavigationItem[];
}) {
  const exploreItems = navigation
    .filter((item) => item.location === 'header' && !item.parentId && item.href.startsWith('/blog'))
    .sort((left, right) => left.sortOrder - right.sortOrder);
  const footerItems = navigation
    .filter((item) => item.location !== 'header' && !item.parentId)
    .sort((left, right) => left.sortOrder - right.sortOrder);
  const socialLinks = settings.socialLinks
    .map((item) => ({ ...item, url: safeHttpUrl(item.url) }))
    .filter((item): item is { label: string; url: string } => Boolean(item.url));

  return (
    <footer className="border-t border-[#cfc5b5] bg-[#eee8dc] text-stone-700 dark:border-stone-800 dark:bg-[#171614] dark:text-stone-300">
      <div className="mx-auto max-w-[76rem] px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 py-12 sm:py-16 md:grid-cols-2 lg:grid-cols-[1.5fr_0.75fr_0.75fr] lg:gap-16">
          <div className="max-w-lg">
            <Link href="/blog" className="blog-focus-ring blog-article-title text-3xl font-medium tracking-[-0.025em] text-stone-950 dark:text-white">
              {settings.siteName}
            </Link>
            <p className="mt-5 text-sm leading-7 text-stone-600 dark:text-stone-400">
              {settings.description}
            </p>
            <Link href="/" className="blog-focus-ring mt-6 inline-block border-b border-stone-500 pb-1 text-sm font-semibold text-stone-800 dark:text-stone-200">
              Muhammed Akan hakkında ↗
            </Link>
          </div>

          <nav aria-label="Footer blog bağlantıları">
            <h2 className="text-sm font-semibold text-stone-950 dark:text-white">Blog</h2>
            <ul className="mt-4 space-y-3">
              {exploreItems.map((item) => (
                <li key={item.id}>
                  <Link href={item.href} className="blog-focus-ring text-sm text-stone-600 transition-colors hover:text-stone-950 dark:text-stone-400 dark:hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Footer yardımcı bağlantıları">
            <h2 className="text-sm font-semibold text-stone-950 dark:text-white">Bağlantılar</h2>
            <ul className="mt-4 space-y-3">
              {footerItems.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    target={item.openInNewTab ? '_blank' : undefined}
                    rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
                    className="blog-focus-ring text-sm text-stone-600 transition-colors hover:text-stone-950 dark:text-stone-400 dark:hover:text-white"
                  >
                    {item.label}{item.openInNewTab ? ' ↗' : ''}
                  </Link>
                </li>
              ))}
              {socialLinks.map((item) => (
                <li key={`${item.label}-${item.url}`}>
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="blog-focus-ring text-sm text-stone-600 transition-colors hover:text-stone-950 dark:text-stone-400 dark:hover:text-white">
                    {item.label} ↗
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="flex flex-col gap-2 border-t border-stone-400/70 py-6 text-xs text-stone-500 dark:border-stone-800 dark:text-stone-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getUTCFullYear()} {settings.authorName}. Tüm hakları saklıdır.</p>
          <p>İstanbul’dan bağımsız olarak yayımlanır.</p>
        </div>
      </div>
    </footer>
  );
}
