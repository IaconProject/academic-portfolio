import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TAB_BAR_SETTINGS,
  normalizeTabBarSettings,
  TAB_BAR_ACTION_IDS,
} from '../lib/tab-bar';

describe('public tab bar settings contract', () => {
  it('returns an independent complete default for missing data', () => {
    const settings = normalizeTabBarSettings(undefined);

    expect(settings).toEqual(DEFAULT_TAB_BAR_SETTINGS);
    expect(settings.buttons).not.toBe(DEFAULT_TAB_BAR_SETTINGS.buttons);
  });

  it('preserves registry order while applying saved visibility', () => {
    const settings = normalizeTabBarSettings({
      version: 99,
      enabled: false,
      buttons: [
        { id: 'contact', visible: false },
        { id: 'home', visible: true },
      ],
      lightPalette: 'sage',
      darkPalette: 'forest',
    });

    expect(settings.version).toBe(1);
    expect(settings.enabled).toBe(false);
    expect(settings.buttons.map((button) => button.id)).toEqual(TAB_BAR_ACTION_IDS);
    expect(settings.buttons.find((button) => button.id === 'contact')?.visible).toBe(false);
    expect(settings.buttons.find((button) => button.id === 'theme')?.visible).toBe(true);
    expect(settings.lightPalette).toBe('sage');
    expect(settings.darkPalette).toBe('forest');
  });

  it('rejects unknown actions, palettes, and non-boolean visibility', () => {
    const settings = normalizeTabBarSettings({
      enabled: 'yes',
      buttons: [
        { id: 'script:alert(1)', visible: true },
        { id: 'email', visible: 'false' },
      ],
      lightPalette: 'custom-css',
      darkPalette: '<style>',
    });

    expect(settings).toEqual(DEFAULT_TAB_BAR_SETTINGS);
  });
});
