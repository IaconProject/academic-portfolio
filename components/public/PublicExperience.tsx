'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Mail, MessageSquareText, Moon, Plus, Sun } from 'lucide-react';
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
    !pathname.startsWith('/admin') && settings.enabled && visibleActions.length > 0;

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
  const renderAction = (
    id: TabBarActionId,
    mode: 'desktop' | 'fab',
    index: number,
    isCenter = false
  ) => {
    const isFab = mode === 'fab';
    const isActive = activeAction === id;
    const className = isFab
      ? 'public-fab-bar__action'
      : 'public-tab-bar__item';
    const iconClassName = isFab ? 'h-[18px] w-[18px]' : 'h-[19px] w-[19px]';
    const sharedProps = {
      className,
      'data-active': isActive || undefined,
      'data-center': !isFab && isCenter ? true : undefined,
      style: isFab ? ({ '--fab-delay': `${index * 42}ms` } as CSSProperties) : undefined,
      tabIndex: isFab && !isFabOpen ? -1 : undefined,
    };
    const closeFab = () => {
      if (isFab) setIsFabOpen(false);
    };
    const label = (
      <span className={isFab ? 'public-fab-bar__label' : undefined}>
        {ACTION_LABELS[id]}
      </span>
    );

    if (id === 'theme') {
      return (
        <button
          key={`${mode}-${id}`}
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
          {isFab ? label : null}
          <span className={isFab ? 'public-fab-bar__action-icon' : undefined}>
            <span className="public-tab-bar__icon-stack" aria-hidden="true">
              <Sun className={`public-tab-bar__sun ${iconClassName}`} />
              <Moon className={`public-tab-bar__moon ${iconClassName}`} />
            </span>
          </span>
          {isFab ? null : label}
        </button>
      );
    }

    const Icon =
      id === 'home' ? Home : id === 'email' ? Mail : MessageSquareText;
    const icon = (
      <span className={isFab ? 'public-fab-bar__action-icon' : undefined}>
        <Icon className={iconClassName} aria-hidden="true" />
      </span>
    );

    if (id === 'email') {
      return (
        <a
          key={`${mode}-${id}`}
          href={`mailto:${email}`}
          onClick={() => {
            setActiveAction('email');
            closeFab();
          }}
          aria-label={`${email} adresine e-posta gönder`}
          title="E-posta gönder"
          {...sharedProps}
        >
          {isFab ? label : icon}
          {isFab ? icon : label}
        </a>
      );
    }

    if (id === 'contact') {
      return (
        <button
          key={`${mode}-${id}`}
          type="button"
          onClick={() => {
            closeFab();
            openContactSection();
          }}
          aria-label="İletişim ve mesaj formuna git"
          title={ACTION_LABELS[id]}
          {...sharedProps}
        >
          {isFab ? label : icon}
          {isFab ? icon : label}
        </button>
      );
    }

    return (
      <Link
        key={`${mode}-${id}`}
        href="/"
        onClick={() => {
          setActiveAction('home');
          closeFab();
        }}
        aria-current={isActive ? 'page' : undefined}
        title={ACTION_LABELS[id]}
        {...sharedProps}
      >
        {isFab ? label : icon}
        {isFab ? icon : label}
      </Link>
    );
  };

  return (
    <>
      {children}
      {shouldShow && (
        <>
          <div
            className="pointer-events-none fixed inset-x-0 bottom-0 z-[55] hidden justify-center px-2 pb-[max(0.65rem,env(safe-area-inset-bottom))] lg:left-72 lg:flex"
            data-public-tab-bar
          >
            <nav
              aria-label="Masaüstü hızlı erişim menüsü"
              data-light-palette={settings.lightPalette}
              data-dark-palette={settings.darkPalette}
              data-odd={hasRaisedCenter || undefined}
              className="public-tab-bar public-tab-bar__surface pointer-events-auto grid"
              style={
                {
                  gridTemplateColumns: `repeat(${visibleActions.length}, minmax(0, 1fr))`,
                  width: `${visibleActions.length * 76 + 16}px`,
                } as CSSProperties
              }
            >
              {visibleActions.map(({ id }, index) =>
                renderAction(
                  id,
                  'desktop',
                  index,
                  hasRaisedCenter && index === Math.floor(visibleActions.length / 2)
                )
              )}
            </nav>
          </div>

          {isFabOpen && (
            <button
              type="button"
              aria-label="Mobil hızlı menüyü kapat"
              className="fixed inset-0 z-[53] bg-academic-overlay/10 backdrop-blur-[1px] lg:hidden"
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
                renderAction(id, 'fab', index)
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
              <Plus className="public-fab-bar__launcher-icon h-6 w-6" aria-hidden="true" />
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
