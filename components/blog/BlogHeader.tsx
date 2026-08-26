'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, Menu, Moon, Network, Search, Sun, X } from 'lucide-react';
import type {
  BlogNavigationItem,
  BlogSettings,
} from '@/lib/blog/types';

export function BlogHeader({
  settings,
  navigation,
}: {
  settings: BlogSettings;
  navigation: BlogNavigationItem[];
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const headerItems = navigation
    .filter((item) => item.location === 'header' && !item.parentId)
    .sort((left, right) => left.sortOrder - right.sortOrder);

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    const closeAtDesktop = () => {
      if (window.innerWidth >= 1024) setMenuOpen(false);
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    window.addEventListener('resize', closeAtDesktop);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('resize', closeAtDesktop);
    };
  }, [menuOpen]);

  function isCurrent(href: string) {
    if (href === '/blog') return pathname === href;
    return href.startsWith('/blog') && pathname.startsWith(href);
  }

  function toggleTheme() {
    const root = document.documentElement;
    const dark = !root.classList.contains('dark');
    root.classList.toggle('dark', dark);
    root.dataset.publicTheme = dark ? 'dark' : 'light';
    window.localStorage.setItem('academic_public_theme_v1', dark ? 'dark' : 'light');

    window.requestAnimationFrame(() => {
      const background = window
        .getComputedStyle(root)
        .getPropertyValue('--academic-bg')
        .trim();
      if (!background) return;
      document
        .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
        .forEach((meta) => meta.setAttribute('content', `rgb(${background})`));
    });
  }

  return (
    <header className="blog-header sticky top-0 z-50 border-b border-[#d8cfc0]/85 bg-[#f6f2e9]/95 backdrop-blur-xl dark:border-stone-800 dark:bg-[#121110]/95">
      <a
        href="#blog-content"
        className="blog-focus-ring sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-[70] focus:rounded-lg focus:bg-stone-950 focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white"
      >
        İçeriğe geç
      </a>

      <div className="mx-auto flex h-16 max-w-[82rem] items-center gap-2.5 px-3 sm:h-[4.5rem] sm:gap-4 sm:px-6 lg:px-8">
        <Link
          href="/blog"
          onClick={() => setMenuOpen(false)}
          className="blog-focus-ring group flex min-w-0 items-center gap-2.5 rounded-lg sm:gap-3"
          aria-label={`${settings.siteName} ana sayfa`}
        >
          <span className="blog-brand-mark flex h-10 w-10 shrink-0 items-center justify-center border border-stone-950 bg-stone-950 text-amber-300 transition-transform duration-200 group-hover:-rotate-2 dark:border-amber-400 dark:bg-amber-400 dark:text-stone-950 sm:h-11 sm:w-11">
            <Network className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block max-w-[9rem] truncate text-[0.82rem] font-bold tracking-[-0.015em] text-stone-950 dark:text-white min-[390px]:max-w-[11rem] sm:max-w-none sm:text-[0.95rem]">
              {settings.siteName}
            </span>
            <span className="mt-0.5 hidden items-center gap-1.5 text-[0.65rem] font-medium uppercase tracking-[0.12em] text-stone-600 dark:text-stone-400 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-700 dark:bg-cyan-400" />
              Teknik yayın
            </span>
          </span>
        </Link>

        <nav
          className="ml-auto hidden items-center gap-0.5 lg:flex"
          aria-label="Blog ana menüsü"
        >
          {headerItems.map((item) => {
            const current = isCurrent(item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                target={item.openInNewTab ? '_blank' : undefined}
                rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
                aria-current={current ? 'page' : undefined}
                className="blog-focus-ring relative rounded-lg px-3.5 py-2.5 text-[0.82rem] font-semibold text-stone-600 transition-colors hover:bg-white/75 hover:text-stone-950 aria-[current=page]:text-stone-950 dark:text-stone-300 dark:hover:bg-stone-900 dark:hover:text-white dark:aria-[current=page]:text-white"
              >
                {item.label}
                {current ? (
                  <span className="absolute inset-x-3 bottom-1 h-px bg-amber-600 dark:bg-amber-400" />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/blog/ara"
          onClick={() => setMenuOpen(false)}
          className="blog-focus-ring ml-auto inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white/75 px-3 text-sm font-semibold text-stone-700 transition-colors hover:border-stone-500 hover:bg-white hover:text-stone-950 dark:border-stone-700 dark:bg-stone-900/80 dark:text-stone-200 dark:hover:border-stone-500 dark:hover:text-white lg:ml-3"
          aria-label="Blogda ara"
        >
          <Search className="h-[1.125rem] w-[1.125rem]" aria-hidden="true" />
          <span className="hidden xl:inline">Yazılarda ara</span>
        </Link>

        <button
          type="button"
          onClick={toggleTheme}
          className="blog-focus-ring hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-stone-300 bg-white/75 text-stone-700 transition-colors hover:border-stone-500 hover:bg-white hover:text-stone-950 dark:border-stone-700 dark:bg-stone-900/80 dark:text-stone-200 dark:hover:border-stone-500 dark:hover:text-white lg:inline-flex"
          aria-label="Renk temasını değiştir"
          title="Renk temasını değiştir"
        >
          <Sun className="h-[1.125rem] w-[1.125rem] dark:hidden" aria-hidden="true" />
          <Moon className="hidden h-[1.125rem] w-[1.125rem] dark:block" aria-hidden="true" />
        </button>

        <button
          type="button"
          className="blog-focus-ring inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-stone-300 bg-white/75 text-stone-700 transition-colors hover:border-stone-500 hover:bg-white hover:text-stone-950 dark:border-stone-700 dark:bg-stone-900/80 dark:text-stone-200 dark:hover:border-stone-500 dark:hover:text-white lg:hidden"
          aria-label={menuOpen ? 'Blog menüsünü kapat' : 'Blog menüsünü aç'}
          aria-controls="blog-mobile-navigation"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>

      {menuOpen ? (
        <>
          <button
            type="button"
            aria-label="Blog menüsünü kapat"
            className="fixed inset-x-0 bottom-0 top-16 z-[-1] cursor-default bg-stone-950/25 backdrop-blur-[2px] sm:top-[4.5rem] lg:hidden"
            onClick={() => setMenuOpen(false)}
          />
          <div
            id="blog-mobile-navigation"
            className="absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-stone-200 bg-[#fffaf1] px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 shadow-2xl shadow-stone-950/15 dark:border-stone-800 dark:bg-stone-950 sm:max-h-[calc(100dvh-4.5rem)] sm:px-6 lg:hidden"
          >
            <form
              action="/blog/ara"
              role="search"
              onSubmit={() => setMenuOpen(false)}
              className="flex items-center rounded-xl border border-stone-300 bg-white p-1.5 dark:border-stone-700 dark:bg-stone-900"
            >
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">Blogda ara</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-stone-600 dark:text-stone-400" />
                <input
                  name="q"
                  className="blog-focus-ring h-11 w-full rounded-lg bg-transparent pl-10 pr-3 text-base font-medium text-stone-950 outline-none placeholder:text-stone-600 dark:text-white dark:placeholder:text-stone-400"
                  placeholder="Bir kavram arayın"
                />
              </label>
              <button className="blog-focus-ring h-11 rounded-lg bg-stone-950 px-4 text-sm font-bold text-white dark:bg-amber-400 dark:text-stone-950">
                Ara
              </button>
            </form>

            <nav className="mt-4" aria-label="Mobil blog menüsü">
              <ul className="divide-y divide-stone-200 border-y border-stone-200 dark:divide-stone-800 dark:border-stone-800">
                {headerItems.map((item, index) => {
                  const current = isCurrent(item.href);
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        target={item.openInNewTab ? '_blank' : undefined}
                        rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
                        aria-current={current ? 'page' : undefined}
                        className="blog-focus-ring flex min-h-14 items-center justify-between gap-4 rounded-lg px-2 py-3 text-base font-semibold text-stone-800 aria-[current=page]:text-amber-800 dark:text-stone-100 dark:aria-[current=page]:text-amber-300"
                      >
                        <span className="flex items-center gap-3">
                          <span className="w-5 font-mono text-[0.65rem] text-stone-400">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          {item.label}
                        </span>
                        {item.openInNewTab ? (
                          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <span
                            className={`h-2 w-2 rounded-full ${current ? 'bg-amber-600' : 'border border-stone-400'}`}
                            aria-hidden="true"
                          />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <button
              type="button"
              onClick={toggleTheme}
              className="blog-focus-ring mt-4 flex min-h-12 w-full items-center justify-between rounded-lg border border-stone-300 px-3 text-sm font-semibold text-stone-700 dark:border-stone-700 dark:text-stone-200"
            >
              Renk temasını değiştir
              <span className="flex h-8 w-8 items-center justify-center" aria-hidden="true">
                <Sun className="h-4.5 w-4.5 dark:hidden" />
                <Moon className="hidden h-4.5 w-4.5 dark:block" />
              </span>
            </button>

            <p className="mt-4 text-xs leading-5 text-stone-600 dark:text-stone-400">
              Blok zinciri, Bitcoin ve yapay zekâyı kaynaklarıyla açıklayan
              bağımsız teknoloji notları.
            </p>
          </div>
        </>
      ) : null}
    </header>
  );
}
