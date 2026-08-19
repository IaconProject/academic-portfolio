import type {
  TabBarActionId,
  TabBarDarkPalette,
  TabBarLightPalette,
  TabBarSettings,
} from './types';

export const TAB_BAR_ACTION_IDS = [
  'home',
  'theme',
  'email',
  'contact',
] as const satisfies readonly TabBarActionId[];

export const TAB_BAR_LIGHT_PALETTES = [
  'ivory',
  'sand',
  'sage',
  'mist',
] as const satisfies readonly TabBarLightPalette[];

export const TAB_BAR_DARK_PALETTES = [
  'obsidian',
  'midnight',
  'forest',
  'plum',
] as const satisfies readonly TabBarDarkPalette[];

export const DEFAULT_TAB_BAR_SETTINGS: TabBarSettings = {
  version: 1,
  enabled: true,
  buttons: TAB_BAR_ACTION_IDS.map((id) => ({ id, visible: true })),
  lightPalette: 'ivory',
  darkPalette: 'midnight',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function includesValue<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && values.includes(value as T);
}

/**
 * Treat database and browser data as untrusted. Unknown actions and palettes are
 * discarded while newly introduced registry actions inherit their safe default.
 */
export function normalizeTabBarSettings(value: unknown): TabBarSettings {
  if (!isRecord(value)) {
    return {
      ...DEFAULT_TAB_BAR_SETTINGS,
      buttons: DEFAULT_TAB_BAR_SETTINGS.buttons.map((button) => ({ ...button })),
    };
  }

  const savedButtons = Array.isArray(value.buttons) ? value.buttons : [];
  const orderedButtons: TabBarSettings['buttons'] = [];
  const seen = new Set<TabBarActionId>();

  for (const button of savedButtons) {
    if (
      isRecord(button) &&
      includesValue(TAB_BAR_ACTION_IDS, button.id) &&
      typeof button.visible === 'boolean' &&
      !seen.has(button.id)
    ) {
      seen.add(button.id);
      orderedButtons.push({ id: button.id, visible: button.visible });
    }
  }

  // Keep the administrator's saved order. Actions added in a future release
  // are appended with their safe default without disturbing that order.
  for (const id of TAB_BAR_ACTION_IDS) {
    if (!seen.has(id)) orderedButtons.push({ id, visible: true });
  }

  return {
    version: 1,
    enabled: typeof value.enabled === 'boolean' ? value.enabled : true,
    buttons: orderedButtons,
    lightPalette: includesValue(TAB_BAR_LIGHT_PALETTES, value.lightPalette)
      ? value.lightPalette
      : DEFAULT_TAB_BAR_SETTINGS.lightPalette,
    darkPalette: includesValue(TAB_BAR_DARK_PALETTES, value.darkPalette)
      ? value.darkPalette
      : DEFAULT_TAB_BAR_SETTINGS.darkPalette,
  };
}
