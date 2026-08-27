'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import {
  PUBLIC_THEME_CHANGE_EVENT,
  readPublicTheme,
  togglePublicTheme,
  type PublicTheme,
} from '@/lib/public-theme';

export function PublicThemeToggle() {
  const [theme, setTheme] = useState<PublicTheme>('light');

  useEffect(() => {
    const syncTheme = (event?: Event) => {
      const changedTheme = (event as CustomEvent<PublicTheme> | undefined)?.detail;
      setTheme(
        changedTheme === 'dark' || changedTheme === 'light'
          ? changedTheme
          : readPublicTheme()
      );
    };

    syncTheme();
    window.addEventListener(PUBLIC_THEME_CHANGE_EVENT, syncTheme);
    return () => window.removeEventListener(PUBLIC_THEME_CHANGE_EVENT, syncTheme);
  }, []);

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={() => togglePublicTheme()}
      aria-label={isDark ? 'Açık temaya geç' : 'Koyu temaya geç'}
      aria-pressed={isDark}
      className="group flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-academic-sidebar-border bg-academic-sidebar-surface/80 px-4 py-2.5 text-left text-sm font-semibold text-academic-sidebar-ink shadow-sm transition-[background-color,color,border-color,box-shadow,transform] duration-200 hover:-translate-y-px hover:bg-academic-sidebar-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-academic-accent focus-visible:ring-offset-2 focus-visible:ring-offset-academic-sidebar-bg motion-reduce:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-academic-sidebar-hover text-academic-sidebar-ink transition-colors group-hover:bg-academic-sidebar-active motion-reduce:transition-none">
          {isDark ? (
            <Sun className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Moon className="h-4 w-4" aria-hidden="true" />
          )}
        </span>
        <span>{isDark ? 'Açık görünüm' : 'Koyu görünüm'}</span>
      </span>
      <span className="text-[10px] font-black uppercase tracking-[0.14em] text-academic-sidebar-muted">
        {isDark ? 'Aç' : 'Koyu'}
      </span>
    </button>
  );
}
