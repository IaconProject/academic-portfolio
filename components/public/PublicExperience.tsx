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

  useEffect(() => {
    if (pathname.startsWith('/admin')) return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const saved = window.localStorage.getItem(PUBLIC_THEME_STORAGE_KEY);
    const initialTheme: PublicTheme =
      saved === 'light' || saved === 'dark'
        ? saved
        : media.matches
          ? 'dark'
          : 'light';

    setTheme(initialTheme);
    applyTheme(initialTheme);

    const followSystemTheme = (event: MediaQueryListEvent) => {
      if (window.localStorage.getItem(PUBLIC_THEME_STORAGE_KEY)) return;
      const nextTheme = event.matches ? 'dark' : 'light';
      setTheme(nextTheme);
      applyTheme(nextTheme);
    };

    media.addEventListener('change', followSystemTheme);
    return () => media.removeEventListener('change', followSystemTheme);
  }, [pathname]);

  const visibleActions = settings.buttons.filter((button) => button.visible);
  const shouldShow =
    !pathname.startsWith('/admin') && settings.enabled && visibleActions.length > 0;

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    window.localStorage.setItem(PUBLIC_THEME_STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
  };

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
            className="public-tab-bar public-tab-bar__surface pointer-events-auto grid"
            style={
              {
                gridTemplateColumns: `repeat(${visibleActions.length}, minmax(0, 1fr))`,
                width: `min(calc(100vw - 1rem), ${visibleActions.length * 76 + 16}px)`,
              } as CSSProperties
            }
          >
            {visibleActions.map(({ id }) => {
              if (id === 'theme') {
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={toggleTheme}
                    aria-label={`${theme === 'dark' ? 'Açık' : 'Koyu'} temaya geç`}
                    title={`${theme === 'dark' ? 'Açık' : 'Koyu'} temaya geç`}
                    className="public-tab-bar__item"
                  >
                    <span className="public-tab-bar__icon-stack" aria-hidden="true">
                      <Sun className="public-tab-bar__sun h-[19px] w-[19px]" />
                      <Moon className="public-tab-bar__moon h-[19px] w-[19px]" />
                    </span>
                    <span>{ACTION_LABELS[id]}</span>
                  </button>
                );
              }

              const href =
                id === 'home'
                  ? '/'
                  : id === 'email'
                    ? `mailto:${email}`
                    : '/#iletisim';
              const Icon =
                id === 'home' ? Home : id === 'email' ? Mail : MessageSquareText;
              const isCurrent = id === 'home' && pathname === '/';

              if (id === 'email') {
                return (
                  <a
                    key={id}
                    href={href}
                    aria-label={`${email} adresine e-posta gönder`}
                    title="E-posta gönder"
                    className="public-tab-bar__item"
                  >
                    <Icon className="h-[19px] w-[19px]" aria-hidden="true" />
                    <span>{ACTION_LABELS[id]}</span>
                  </a>
                );
              }

              return (
                <Link
                  key={id}
                  href={href}
                  aria-current={isCurrent ? 'page' : undefined}
                  title={ACTION_LABELS[id]}
                  className="public-tab-bar__item"
                  data-active={isCurrent || undefined}
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
      : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.dataset.publicTheme = theme;
  } catch (_) {}
})();`;
