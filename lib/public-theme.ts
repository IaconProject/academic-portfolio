import type { TabBarSettings } from '@/lib/types';

export const PUBLIC_THEME_STORAGE_KEY = 'academic_public_theme_v1';
export const PUBLIC_THEME_CHANGE_EVENT = 'academic-public-theme-change';

export type PublicTheme = 'light' | 'dark';

type PublicPaletteSettings = Pick<
  TabBarSettings,
  'lightPalette' | 'darkPalette'
>;

export function readPublicTheme(): PublicTheme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export function readStoredPublicTheme(): PublicTheme {
  const saved = window.localStorage.getItem(PUBLIC_THEME_STORAGE_KEY);
  return saved === 'dark' || saved === 'light' ? saved : 'light';
}

function syncThemeColor(root: HTMLElement) {
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

export function applyPublicTheme(
  theme: PublicTheme,
  palettes?: PublicPaletteSettings
) {
  const root = document.documentElement;

  if (palettes) {
    root.dataset.publicLightPalette = palettes.lightPalette;
    root.dataset.publicDarkPalette = palettes.darkPalette;
  }

  root.classList.toggle('dark', theme === 'dark');
  root.dataset.publicTheme = theme;
  syncThemeColor(root);
  window.dispatchEvent(
    new CustomEvent<PublicTheme>(PUBLIC_THEME_CHANGE_EVENT, { detail: theme })
  );
}

export function togglePublicTheme(
  palettes?: PublicPaletteSettings
): PublicTheme {
  const nextTheme: PublicTheme =
    readPublicTheme() === 'dark' ? 'light' : 'dark';
  window.localStorage.setItem(PUBLIC_THEME_STORAGE_KEY, nextTheme);
  applyPublicTheme(nextTheme, palettes);
  return nextTheme;
}
