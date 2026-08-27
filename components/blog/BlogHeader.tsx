'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Moon, Search, Sun, X } from 'lucide-react';
import type { BlogNavigationItem, BlogSettings } from '@/lib/blog/types';

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
    <header className="blog-header sticky top-0 z-50 border-b border-[#d8cfc0]/90 bg-[#f6f2e9]/95 backdrop-blur-lg dark:border-stone-800 dark:bg-[#121110]/95">
      <a
        href="#blog-content"
        className="blog-focus-ring sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-[70] focus:bg-stone-950 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        İçeriğe geç
      </a>

      <div className="mx-auto flex h-16 max-w-[76rem] items-center px-4 sm:h-[4.5rem] sm:px-6 lg:px-8">
        <Link
          href="/blog"
          onClick={() => setMenuOpen(false)}
          className="blog-focus-ring flex min-w-0 items-baseline gap-3"
          aria-label={`${settings.siteName} ana sayfa`}
        >
          <span className="blog-article-title max-w-[13rem] truncate text-[1.4rem] font-medium tracking-[-0.025em] text-stone-950 dark:text-white sm:max-w-none sm:text-[1.55rem]">
            {settings.siteName}
          </span>
          <span className="hidden border-l border-stone-400 pl-3 text-xs text-stone-500 dark:border-stone-700 dark:text-stone-400 sm:inline">
            Yazılar
          </span>
        </Link>

        <nav className="ml-auto hidden items-center gap-7 lg:flex" aria-label="Blog ana menüsü">
          {headerItems.map((item) => {
            const current = isCurrent(item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                target={item.openInNewTab ? '_blank' : undefined}
                rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
                aria-current={current ? 'page' : undefined}
                className="blog-focus-ring border-b border-transparent py-1 text-sm text-stone-600 transition-colors hover:text-stone-950 aria-[current=page]:border-stone-800 aria-[current=page]:text-stone-950 dark:text-stone-300 dark:hover:text-white dark:aria-[current=page]:border-stone-200 dark:aria-[current=page]:text-white"
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1 lg:ml-7">
          <Link
            href="/blog/ara"
            onClick={() => setMenuOpen(false)}
            className="blog-focus-ring inline-flex h-10 w-10 items-center justify-center text-stone-600 transition-colors hover:text-stone-950 dark:text-stone-300 dark:hover:text-white"
            aria-label="Blogda ara"
          >
            <Search className="h-[1.1rem] w-[1.1rem]" aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={toggleTheme}
            className="blog-focus-ring hidden h-10 w-10 items-center justify-center text-stone-600 transition-colors hover:text-stone-950 dark:text-stone-300 dark:hover:text-white lg:inline-flex"
            aria-label="Renk temasını değiştir"
            title="Renk temasını değiştir"
          >
            <Sun className="h-[1.1rem] w-[1.1rem] dark:hidden" aria-hidden="true" />
            <Moon className="hidden h-[1.1rem] w-[1.1rem] dark:block" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="blog-focus-ring inline-flex h-10 w-10 items-center justify-center text-stone-700 dark:text-stone-200 lg:hidden"
            aria-label={menuOpen ? 'Blog menüsünü kapat' : 'Blog menüsünü aç'}
            aria-controls="blog-mobile-navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <>
          <button
            type="button"
            aria-label="Blog menüsünü kapat"
            className="fixed inset-x-0 bottom-0 top-16 z-[-1] cursor-default bg-stone-950/20 sm:top-[4.5rem] lg:hidden"
            onClick={() => setMenuOpen(false)}
          />
          <div
            id="blog-mobile-navigation"
            className="absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-stone-300 bg-[#f6f2e9] px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 shadow-lg shadow-stone-950/10 dark:border-stone-800 dark:bg-[#121110] sm:max-h-[calc(100dvh-4.5rem)] sm:px-6 lg:hidden"
          >
            <nav aria-label="Mobil blog menüsü">
              <ul className="border-t border-stone-300 dark:border-stone-800">
                {headerItems.map((item) => {
                  const current = isCurrent(item.href);
                  return (
                    <li key={item.id} className="border-b border-stone-300 dark:border-stone-800">
                      <Link
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        target={item.openInNewTab ? '_blank' : undefined}
                        rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
                        aria-current={current ? 'page' : undefined}
                        className="blog-focus-ring flex min-h-14 items-center justify-between py-3 text-base text-stone-800 aria-[current=page]:font-semibold dark:text-stone-100"
                      >
                        {item.label}
                        <span aria-hidden="true">{item.openInNewTab ? '↗' : '→'}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <form action="/blog/ara" role="search" onSubmit={() => setMenuOpen(false)} className="mt-7">
              <label htmlFor="blog-mobile-search" className="text-sm text-stone-600 dark:text-stone-400">
                Yazılarda ara
              </label>
              <div className="mt-2 flex border-b border-stone-500 dark:border-stone-600">
                <input
                  id="blog-mobile-search"
                  name="q"
                  className="blog-focus-ring h-12 min-w-0 flex-1 bg-transparent pr-3 text-base text-stone-950 outline-none placeholder:text-stone-500 dark:text-white"
                  placeholder="Bir kavram yazın"
                />
                <button className="blog-focus-ring px-1 text-sm font-semibold">Ara →</button>
              </div>
            </form>

            <button
              type="button"
              onClick={toggleTheme}
              className="blog-focus-ring mt-6 flex min-h-11 items-center gap-3 text-sm text-stone-600 dark:text-stone-300"
            >
              <span className="flex h-8 w-8 items-center justify-center border border-stone-300 dark:border-stone-700" aria-hidden="true">
                <Sun className="h-4 w-4 dark:hidden" />
                <Moon className="hidden h-4 w-4 dark:block" />
              </span>
              Renk temasını değiştir
            </button>
          </div>
        </>
      ) : null}
    </header>
  );
}
