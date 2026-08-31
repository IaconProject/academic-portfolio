'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BookOpen, Home, Mail, Menu, MessageSquareText, Moon, Sun, X } from 'lucide-react';
import type { TabBarActionId, TabBarSettings } from '@/lib/types';
import { normalizeTabBarSettings } from '@/lib/tab-bar';

const PUBLIC_THEME_STORAGE_KEY = 'academic_public_theme_v1';
type PublicTheme = 'light' | 'dark';

const ACTION_LABELS: Record<TabBarActionId, string> = {
  home: 'Ana Sayfa',
  blog: 'Blog',
  theme: 'Tema',
  email: 'E-posta',
  contact: 'İletişim',
};

function applyTheme(theme: PublicTheme, settings: TabBarSettings) {
  const root = document.documentElement;
  root.dataset.publicLightPalette = settings.lightPalette;
  root.dataset.publicDarkPalette = settings.darkPalette;
  root.classList.toggle('dark', theme === 'dark');
  root.dataset.publicTheme = theme;

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

export function PublicExperience({
  children,
  settings: rawSettings,
  email,
}: {
  children: ReactNode;
  settings: TabBarSettings;
  email: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const settings = useMemo(
    () => normalizeTabBarSettings(rawSettings),
    [rawSettings]
  );
  const [theme, setTheme] = useState<PublicTheme>('light');
  const [activeAction, setActiveAction] = useState<TabBarActionId | null>(
    pathname === '/' ? 'home' : null
  );
  const [isFabOpen, setIsFabOpen] = useState(false);

  useEffect(() => {
    if (pathname.startsWith('/admin')) return;

    const saved = window.localStorage.getItem(PUBLIC_THEME_STORAGE_KEY);
    const initialTheme: PublicTheme =
      saved === 'light' || saved === 'dark' ? saved : 'light';

    setTheme(initialTheme);
    applyTheme(initialTheme, settings);
  }, [pathname, settings]);

  useEffect(() => {
    if (pathname.startsWith('/admin')) return;

    let frame = 0;
    const syncLocationState = () => {
      const isContactTarget =
        pathname === '/' && window.location.hash === '#iletisim';
      setActiveAction(isContactTarget ? 'contact' : pathname === '/' ? 'home' : null);

      if (isContactTarget) {
        frame = window.requestAnimationFrame(() => {
          document.getElementById('iletisim')?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        });
      }
    };

    syncLocationState();
    window.addEventListener('hashchange', syncLocationState);
    return () => {
      window.removeEventListener('hashchange', syncLocationState);
      window.cancelAnimationFrame(frame);
    };
  }, [pathname]);

  useEffect(() => {
    setIsFabOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isFabOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsFabOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isFabOpen]);

  const visibleActions = settings.buttons.filter((button) => button.visible);
  const shouldShow =
    !pathname.startsWith('/admin') &&
    !pathname.startsWith('/blog') &&
    settings.enabled &&
    visibleActions.length > 0;

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setActiveAction('theme');
    setTheme(nextTheme);
    window.localStorage.setItem(PUBLIC_THEME_STORAGE_KEY, nextTheme);
    applyTheme(nextTheme, settings);
  };

  const openContactSection = () => {
    setActiveAction('contact');

    if (pathname !== '/') {
      router.push('/#iletisim');
      return;
    }

    const target = document.getElementById('iletisim');
    if (!target) {
      router.push('/#iletisim');
      return;
    }

    const nextUrl = new URL(window.location.href);
    nextUrl.hash = 'iletisim';
    window.history.replaceState(
      window.history.state,
      '',
      `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`
    );
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const renderAction = (id: TabBarActionId, index: number) => {
    const isActive = activeAction === id;
    const sharedProps = {
      className: 'public-fab-bar__action',
      'data-active': isActive || undefined,
      style: ({ '--fab-delay': `${index * 38}ms` } as CSSProperties),
      tabIndex: !isFabOpen ? -1 : undefined,
    };
    const closeFab = () => setIsFabOpen(false);
    const label = (
      <span className="public-fab-bar__label">
        {ACTION_LABELS[id]}
      </span>
    );

    if (id === 'theme') {
      return (
        <button
          key={id}
          type="button"
          onClick={() => {
            toggleTheme();
            closeFab();
          }}
          aria-label={`${theme === 'dark' ? 'Açık' : 'Koyu'} temaya geç`}
          aria-pressed={theme === 'dark'}
          title={`${theme === 'dark' ? 'Açık' : 'Koyu'} temaya geç`}
          {...sharedProps}
        >
          {label}
          <span className="public-fab-bar__action-icon">
            <span className="public-fab-bar__icon-stack" aria-hidden="true">
              <Sun className="public-fab-bar__sun h-[17px] w-[17px]" />
              <Moon className="public-fab-bar__moon h-[17px] w-[17px]" />
            </span>
          </span>
        </button>
      );
    }

    const Icon =
      id === 'home'
        ? Home
        : id === 'blog'
          ? BookOpen
          : id === 'email'
            ? Mail
            : MessageSquareText;
    const icon = (
      <span className="public-fab-bar__action-icon">
        <Icon className="h-[17px] w-[17px]" aria-hidden="true" />
      </span>
    );

    if (id === 'email') {
      return (
        <a
          key={id}
          href={`mailto:${email}`}
          onClick={() => {
            setActiveAction('email');
            closeFab();
          }}
          aria-label={`${email} adresine e-posta gönder`}
          title="E-posta gönder"
          {...sharedProps}
        >
          {label}
          {icon}
        </a>
      );
    }

    if (id === 'contact') {
      return (
        <button
          key={id}
          type="button"
          onClick={() => {
            closeFab();
            openContactSection();
          }}
          aria-label="İletişim ve mesaj formuna git"
          title={ACTION_LABELS[id]}
          {...sharedProps}
        >
          {label}
          {icon}
        </button>
      );
    }

    return (
      <Link
        key={id}
        href={id === 'blog' ? '/blog' : '/'}
        onClick={() => {
          setActiveAction(id);
          closeFab();
        }}
        aria-current={isActive ? 'page' : undefined}
        title={ACTION_LABELS[id]}
        {...sharedProps}
      >
        {label}
        {icon}
      </Link>
    );
  };

  return (
    <>
      {children}
      {shouldShow && (
        <>
          {isFabOpen && (
            <button
              type="button"
              aria-label="Mobil hızlı menüyü kapat"
              className="fixed inset-0 z-[53] bg-academic-overlay/5 backdrop-blur-[1px] lg:hidden"
              onClick={() => setIsFabOpen(false)}
            />
          )}
          <nav
            aria-label="Mobil FAB hızlı erişim menüsü"
            data-light-palette={settings.lightPalette}
            data-dark-palette={settings.darkPalette}
            data-open={isFabOpen || undefined}
            className="public-fab-bar fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-[55] flex flex-col items-end lg:hidden"
            data-public-fab-bar
          >
            <div
              id="public-fab-actions"
              aria-hidden={!isFabOpen}
              className="public-fab-bar__actions"
            >
              {visibleActions.map(({ id }, index) =>
                renderAction(id, index)
              )}
            </div>
            <button
              type="button"
              aria-label={isFabOpen ? 'Hızlı menüyü kapat' : 'Hızlı menüyü aç'}
              aria-controls="public-fab-actions"
              aria-expanded={isFabOpen}
              title={isFabOpen ? 'Menüyü kapat' : 'Hızlı menü'}
              className="public-fab-bar__launcher"
              onClick={() => setIsFabOpen((open) => !open)}
            >
              <Menu className="public-fab-bar__launcher-menu h-5 w-5" aria-hidden="true" />
              <X className="public-fab-bar__launcher-close h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Hızlı menü</span>
            </button>
          </nav>
        </>
      )}
    </>
  );
}

export const publicThemeBootScript = `
(function () {
  try {
    if (window.location.pathname.indexOf('/admin') === 0) return;
    var saved = window.localStorage.getItem('${PUBLIC_THEME_STORAGE_KEY}');
    var theme = saved === 'light' || saved === 'dark'
      ? saved
      : 'light';
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.dataset.publicTheme = theme;
  } catch (_) {}
})();`;
