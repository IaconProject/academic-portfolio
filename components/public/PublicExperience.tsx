'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Mail, MessageSquareText, Moon, Sun } from 'lucide-react';
import type { TabBarActionId, TabBarSettings } from '@/lib/types';
import { normalizeTabBarSettings } from '@/lib/tab-bar';

const PUBLIC_THEME_STORAGE_KEY = 'academic_public_theme_v1';
type PublicTheme = 'light' | 'dark';

const ACTION_LABELS: Record<TabBarActionId, string> = {
  home: 'Ana Sayfa',
  theme: 'Tema',
  email: 'E-posta',
  contact: 'İletişim',
};

function applyTheme(theme: PublicTheme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.dataset.publicTheme = theme;
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
  const settings = useMemo(
    () => normalizeTabBarSettings(rawSettings),
    [rawSettings]
  );
  const [theme, setTheme] = useState<PublicTheme>('light');
  const [activeAction, setActiveAction] = useState<TabBarActionId | null>(
    pathname === '/' ? 'home' : null
  );

  useEffect(() => {
    if (pathname.startsWith('/admin')) return;

    const saved = window.localStorage.getItem(PUBLIC_THEME_STORAGE_KEY);
    const initialTheme: PublicTheme =
      saved === 'light' || saved === 'dark' ? saved : 'light';

    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, [pathname]);

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

  const visibleActions = settings.buttons.filter((button) => button.visible);
  const shouldShow =
    !pathname.startsWith('/admin') && settings.enabled && visibleActions.length > 0;

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setActiveAction('theme');
    setTheme(nextTheme);
    window.localStorage.setItem(PUBLIC_THEME_STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
  };

  const openContactSection = () => {
    setActiveAction('contact');

    if (pathname !== '/') {
      window.location.assign('/#iletisim');
      return;
    }

    const target = document.getElementById('iletisim');
    if (!target) {
      window.location.assign('/#iletisim');
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

  const hasRaisedCenter = visibleActions.length % 2 === 1;

  return (
    <>
      {children}
      {shouldShow && (
        <div
          className="pointer-events-none fixed inset-x-0 bottom-0 z-[55] flex justify-center px-2 pb-[max(0.65rem,env(safe-area-inset-bottom))] lg:left-72"
          data-public-tab-bar
        >
          <nav
            aria-label="Hızlı erişim menüsü"
            data-light-palette={settings.lightPalette}
            data-dark-palette={settings.darkPalette}
            data-odd={hasRaisedCenter || undefined}
            className="public-tab-bar public-tab-bar__surface pointer-events-auto grid"
            style={
              {
                gridTemplateColumns: `repeat(${visibleActions.length}, minmax(0, 1fr))`,
                width: `min(calc(100vw - 1rem), ${visibleActions.length * 76 + 16}px)`,
              } as CSSProperties
            }
          >
            {visibleActions.map(({ id }, index) => {
              const isCenter =
                hasRaisedCenter && index === Math.floor(visibleActions.length / 2);
              const isActive = activeAction === id;

              if (id === 'theme') {
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={toggleTheme}
                    aria-label={`${theme === 'dark' ? 'Açık' : 'Koyu'} temaya geç`}
                    aria-pressed={theme === 'dark'}
                    title={`${theme === 'dark' ? 'Açık' : 'Koyu'} temaya geç`}
                    className="public-tab-bar__item"
                    data-active={isActive || undefined}
                    data-center={isCenter || undefined}
                  >
                    <span className="public-tab-bar__icon-stack" aria-hidden="true">
                      <Sun className="public-tab-bar__sun h-[19px] w-[19px]" />
                      <Moon className="public-tab-bar__moon h-[19px] w-[19px]" />
                    </span>
                    <span>{ACTION_LABELS[id]}</span>
                  </button>
                );
              }

              const Icon =
                id === 'home' ? Home : id === 'email' ? Mail : MessageSquareText;

              if (id === 'email') {
                return (
                  <a
                    key={id}
                    href={`mailto:${email}`}
                    onClick={() => setActiveAction('email')}
                    aria-label={`${email} adresine e-posta gönder`}
                    title="E-posta gönder"
                    className="public-tab-bar__item"
                    data-active={isActive || undefined}
                    data-center={isCenter || undefined}
                  >
                    <Icon className="h-[19px] w-[19px]" aria-hidden="true" />
                    <span>{ACTION_LABELS[id]}</span>
                  </a>
                );
              }

              if (id === 'contact') {
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={openContactSection}
                    aria-label="İletişim ve mesaj formuna git"
                    title={ACTION_LABELS[id]}
                    className="public-tab-bar__item"
                    data-active={isActive || undefined}
                    data-center={isCenter || undefined}
                  >
                    <Icon className="h-[19px] w-[19px]" aria-hidden="true" />
                    <span>{ACTION_LABELS[id]}</span>
                  </button>
                );
              }

              return (
                <Link
                  key={id}
                  href="/"
                  onClick={() => setActiveAction('home')}
                  aria-current={isActive ? 'page' : undefined}
                  title={ACTION_LABELS[id]}
                  className="public-tab-bar__item"
                  data-active={isActive || undefined}
                  data-center={isCenter || undefined}
                >
                  <Icon className="h-[19px] w-[19px]" aria-hidden="true" />
                  <span>{ACTION_LABELS[id]}</span>
                </Link>
              );
            })}
          </nav>
        </div>
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
