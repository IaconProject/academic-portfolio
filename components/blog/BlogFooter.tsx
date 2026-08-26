import Link from 'next/link';
import { ArrowUpRight, Network, Rss } from 'lucide-react';
import type {
  BlogNavigationItem,
  BlogSettings,
} from '@/lib/blog/types';
import { safeHttpUrl } from '@/lib/url-security';

export function BlogFooter({
  settings,
  navigation,
}: {
  settings: BlogSettings;
  navigation: BlogNavigationItem[];
}) {
  const exploreItems = navigation
    .filter(
      (item) =>
        item.location === 'header' &&
        !item.parentId &&
        item.href.startsWith('/blog')
    )
    .sort((left, right) => left.sortOrder - right.sortOrder);
  const footerItems = navigation
    .filter((item) => item.location !== 'header' && !item.parentId)
    .sort((left, right) => left.sortOrder - right.sortOrder);
  const socialLinks = settings.socialLinks
    .map((item) => ({ ...item, url: safeHttpUrl(item.url) }))
    .filter((item): item is { label: string; url: string } => Boolean(item.url));

  return (
    <footer className="border-t border-stone-800 bg-[#171717] text-stone-300">
      <div className="mx-auto max-w-[82rem] px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-14 items-center gap-3 border-b border-stone-800 py-3 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-stone-400">
          <span className="relative flex h-3 w-3 items-center justify-center" aria-hidden="true">
            <span className="absolute h-3 w-3 animate-ping rounded-full bg-cyan-400/25 motion-reduce:animate-none" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-cyan-400" />
          </span>
          Bağımsız teknoloji yayını
          <span className="ml-auto hidden font-mono text-[0.62rem] text-stone-400 sm:block">
            BTC · BLOCKCHAIN · AI
          </span>
        </div>

        <div className="grid gap-12 py-12 sm:py-16 md:grid-cols-2 lg:grid-cols-[1.65fr_0.75fr_0.75fr] lg:gap-16">
          <div className="max-w-xl">
            <Link
              href="/blog"
              className="blog-focus-ring inline-flex items-center gap-3 rounded-lg"
              aria-label={`${settings.siteName} ana sayfa`}
            >
              <span className="blog-brand-mark flex h-11 w-11 items-center justify-center border border-amber-400 bg-amber-400 text-stone-950">
                <Network className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-lg font-bold tracking-[-0.02em] text-white">
                {settings.siteName}
              </span>
            </Link>
            <p className="mt-5 max-w-lg text-[0.95rem] leading-7 text-stone-400">
              {settings.description}
            </p>
            <p className="mt-5 border-l border-amber-400/70 pl-4 text-sm leading-6 text-stone-300">
              Karmaşık teknolojileri pazarlama gürültüsünden ayıran; kaynaklı,
              açık ve uzun ömürlü notlar.
            </p>
          </div>

          <nav aria-label="Footer blog bağlantıları">
            <h2 className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-amber-300">
              Keşfet
            </h2>
            <ul className="mt-5 space-y-1">
              {exploreItems.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="blog-focus-ring group flex min-h-10 items-center justify-between rounded-lg py-2 text-sm font-medium text-stone-300 transition-colors hover:text-white"
                  >
                    {item.label}
                    <span className="h-px w-4 bg-stone-700 transition-all group-hover:w-6 group-hover:bg-amber-400" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Footer yardımcı bağlantıları">
            <h2 className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-amber-300">
              Bağlantılar
            </h2>
            <ul className="mt-5 space-y-1">
              {footerItems.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    target={item.openInNewTab ? '_blank' : undefined}
                    rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
                    className="blog-focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg py-2 text-sm font-medium text-stone-300 transition-colors hover:text-white"
                  >
                    {item.href.includes('feed') ? (
                      <Rss className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
                    ) : null}
                    {item.label}
                    {item.openInNewTab ? (
                      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : null}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/"
                  className="blog-focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg py-2 text-sm font-medium text-stone-300 transition-colors hover:text-white"
                >
                  Muhammed Akan
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </li>
              {socialLinks.map((item) => (
                <li key={`${item.label}-${item.url}`}>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="blog-focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg py-2 text-sm font-medium text-stone-300 transition-colors hover:text-white"
                  >
                    {item.label}
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="flex flex-col gap-3 border-t border-stone-800 py-6 text-xs leading-5 text-stone-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getUTCFullYear()} {settings.authorName}. Tüm hakları
            saklıdır.
          </p>
          <p>Kaynak · Bağlam · Açıklık</p>
        </div>
      </div>
    </footer>
  );
}
