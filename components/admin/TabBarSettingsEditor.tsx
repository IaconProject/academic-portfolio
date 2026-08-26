'use client';

import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Check,
  GripVertical,
  Home,
  Mail,
  Menu,
  MessageSquareText,
  Moon,
  PanelBottom,
  Save,
  Sun,
  X,
} from 'lucide-react';
import type {
  TabBarActionId,
  TabBarDarkPalette,
  TabBarLightPalette,
  TabBarSettings,
} from '@/lib/types';
import {
  normalizeTabBarSettings,
  TAB_BAR_DARK_PALETTES,
  TAB_BAR_LIGHT_PALETTES,
} from '@/lib/tab-bar';

const ACTIONS: Array<{
  id: TabBarActionId;
  label: string;
  description: string;
  icon: typeof Home;
}> = [
  { id: 'home', label: 'Ana Sayfa', description: 'Tüm sayfalardan biyografi ana sayfasına hızlı dönüş sağlar.', icon: Home },
  { id: 'blog', label: 'Blog', description: 'Ziyaretçiyi teknik yazılar ve araştırma notlarının bulunduğu bloga yönlendirir.', icon: BookOpen },
  { id: 'theme', label: 'Tema Değiştirici', description: 'Ziyaretçinin açık ve koyu görünüm arasında geçiş yapmasını sağlar.', icon: Sun },
  { id: 'email', label: 'E-posta', description: 'Profilde kayıtlı e-posta adresini ziyaretçinin mail uygulamasında açar.', icon: Mail },
  { id: 'contact', label: 'İletişim Formu', description: 'Ana sayfadaki “İletişim & Mesaj Gönderin” alanına kaydırır.', icon: MessageSquareText },
];

const ACTIONS_BY_ID = Object.fromEntries(
  ACTIONS.map((action) => [action.id, action])
) as Record<TabBarActionId, (typeof ACTIONS)[number]>;

const LIGHT_PALETTES: Record<TabBarLightPalette, { label: string; description: string; colors: [string, string, string] }> = {
  ivory: { label: 'Fildişi & Bronz', description: 'Akademik ve zamansız sıcak nötrler', colors: ['#f9f6ef', '#946932', '#352e27'] },
  sand: { label: 'Klasik Akademik · Eski Varsayılan', description: 'Tema seçeneklerinden önceki özgün sıcak bej ve koyu navigasyon', colors: ['#f3efe6', '#1c2128', '#29241f'] },
  sage: { label: 'Adaçayı', description: 'Sakin ve rafine doğal yeşiller', colors: ['#f1f5ed', '#426f4b', '#2b3e2a'] },
  mist: { label: 'Sis Mavisi', description: 'Temiz ve güven veren serin tonlar', colors: ['#f1f6f9', '#30698b', '#263743'] },
};

const DARK_PALETTES: Record<TabBarDarkPalette, { label: string; description: string; colors: [string, string, string] }> = {
  obsidian: { label: 'Obsidyen & Altın', description: 'Klasik, güçlü ve yüksek kontrastlı', colors: ['#191919', '#e8b152', '#f5f1e8'] },
  midnight: { label: 'Gece Mavisi', description: 'Modern ve odaklı koyu mavi', colors: ['#131b26', '#66b2ff', '#edf4fb'] },
  forest: { label: 'Gece Ormanı', description: 'Derin yeşil ve canlı zümrüt', colors: ['#13201c', '#5fd39e', '#ebf6ef'] },
  plum: { label: 'Erik Moru', description: 'Seçkin ve yaratıcı mor tonları', colors: ['#1f1826', '#cf89f4', '#f6eefa'] },
};

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <label
      className="relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center"
      title={label}
    >
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        aria-label={label}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={`absolute inset-0 rounded-full border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-amber-500 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-white dark:peer-focus-visible:ring-offset-stone-900 ${checked ? 'border-stone-900 bg-stone-900 dark:border-amber-500 dark:bg-amber-500' : 'border-stone-300 bg-stone-200 dark:border-stone-600 dark:bg-stone-700'}`}
      />
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform dark:bg-stone-950 ${checked ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </label>
  );
}

function PaletteSelector<T extends TabBarLightPalette | TabBarDarkPalette>({
  title,
  value,
  options,
  palettes,
  onChange,
}: {
  title: string;
  value: T;
  options: readonly T[];
  palettes: Record<T, { label: string; description: string; colors: [string, string, string] }>;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-3 text-sm font-black text-stone-900 dark:text-stone-100">{title}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const palette = palettes[option];
          const selected = value === option;
          return (
            <label
              key={option}
              className={`relative flex min-h-24 cursor-pointer items-center gap-4 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md focus-within:ring-2 focus-within:ring-amber-500 ${selected ? 'border-stone-900 bg-stone-50 ring-1 ring-stone-900 dark:border-amber-500 dark:bg-stone-800 dark:ring-amber-500' : 'border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900'}`}
            >
              <input
                type="radio"
                name={title}
                value={option}
                checked={selected}
                onChange={() => onChange(option)}
                className="sr-only"
              />
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border shadow-inner" style={{ background: palette.colors[0], borderColor: palette.colors[1], color: palette.colors[2] }}>
                <span className="h-4 w-4 rounded-full" style={{ backgroundColor: palette.colors[1] }} />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-black text-stone-900 dark:text-stone-100">{palette.label}</span>
                <span className="mt-1 block text-[11px] leading-4 text-stone-500 dark:text-stone-400">{palette.description}</span>
              </span>
              {selected && (
                <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-stone-900 text-white dark:bg-amber-500 dark:text-stone-950">
                  <Check className="h-3 w-3" />
                </span>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function TabBarSettingsEditor({
  settings,
  email,
  isSaving,
  onSave,
}: {
  settings: TabBarSettings;
  email: string;
  isSaving: boolean;
  onSave: (settings: TabBarSettings) => void;
}) {
  const [draft, setDraft] = useState(() => normalizeTabBarSettings(settings));

  useEffect(() => setDraft(normalizeTabBarSettings(settings)), [settings]);

  const orderedActions = draft.buttons.map((button) => ({
    ...ACTIONS_BY_ID[button.id],
    visible: button.visible,
  }));
  const visibleActions = orderedActions.filter((action) => action.visible);

  const setActionVisibility = (id: TabBarActionId, visible: boolean) => {
    setDraft((current) => ({
      ...current,
      buttons: current.buttons.map((button) => button.id === id ? { ...button, visible } : button),
    }));
  };

  const moveAction = (id: TabBarActionId, direction: -1 | 1) => {
    setDraft((current) => {
      const index = current.buttons.findIndex((button) => button.id === id);
      const targetIndex = index + direction;
      if (index < 0 || targetIndex < 0 || targetIndex >= current.buttons.length) {
        return current;
      }

      const buttons = [...current.buttons];
      [buttons[index], buttons[targetIndex]] = [buttons[targetIndex], buttons[index]];
      return { ...current, buttons };
    });
  };

  return (
    <section className="admin-panel-card space-y-7">
      <div className="flex flex-col gap-4 border-b border-stone-200 pb-6 dark:border-stone-800 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-amber-700 dark:text-amber-500">
            <PanelBottom className="h-5 w-5" />
            <span className="text-[11px] font-black uppercase tracking-[0.18em]">Görünüm & Hızlı Erişim</span>
          </div>
          <h1 className="font-serif text-2xl font-bold text-stone-950 dark:text-stone-50">Mobil FAB Bar ve Tema Ayarları</h1>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-stone-600 dark:text-stone-400">
            Mobil cihazlardaki açılır hızlı erişim menüsünü, buton sırasını ve sitenin açık/koyu renklerini yönetin. Masaüstünde hızlı erişim menüsü gösterilmez.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start rounded-full border border-stone-200 bg-stone-50 px-3 py-2 dark:border-stone-700 dark:bg-stone-950">
          <span className="text-[10px] font-black uppercase tracking-wider text-stone-600 dark:text-stone-300">
            {draft.enabled ? 'Menü açık' : 'Menü kapalı'}
          </span>
          <Toggle checked={draft.enabled} onChange={(enabled) => setDraft((current) => ({ ...current, enabled }))} label="Mobil FAB Bar menüsünü aç veya kapat" />
        </div>
      </div>

      <div className={`rounded-3xl border p-5 transition-opacity dark:border-stone-700 ${draft.enabled ? 'border-stone-200 bg-stone-50/80 dark:bg-stone-950/50' : 'border-stone-200 bg-stone-100 opacity-55 dark:bg-stone-950'}`}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-stone-900 dark:text-stone-100">Mobil FAB Bar Önizlemesi</h2>
            <p className="mt-1 text-[11px] text-stone-500 dark:text-stone-400">
              {visibleActions.length ? `${visibleActions.length} buton görünür · Profil e-postası: ${email}` : 'Tüm butonlar gizli; menü sitede gösterilmez.'}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-stone-400"><Sun className="h-4 w-4" /><span className="text-[10px] font-black">/</span><Moon className="h-4 w-4" /></div>
        </div>
        <div className="mx-auto max-w-xl">
          <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900">
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.16em] text-stone-500 dark:text-stone-400">Mobil · Açık FAB Bar</p>
            <div className="relative mx-auto h-72 max-w-xs overflow-hidden rounded-[2rem] border border-stone-300 bg-gradient-to-b from-stone-100 to-stone-200 shadow-inner dark:border-stone-700 dark:from-stone-800 dark:to-stone-950">
              <span className="absolute left-1/2 top-3 h-1.5 w-16 -translate-x-1/2 rounded-full bg-stone-300 dark:bg-stone-700" />
              {visibleActions.length ? (
                <nav
                  aria-label="Mobil FAB Bar yerleşim önizlemesi"
                  data-light-palette={draft.lightPalette}
                  data-dark-palette={draft.darkPalette}
                  data-open="true"
                  className="public-fab-bar public-fab-bar--preview absolute bottom-5 right-5 flex flex-col items-end"
                >
                  <div className="public-fab-bar__actions">
                    {visibleActions.map((action, index) => {
                      const Icon = action.id === 'theme' ? Moon : action.icon;
                      return (
                        <span
                          key={action.id}
                          className="public-fab-bar__action"
                          data-active={action.id === 'home' || undefined}
                          style={{ '--fab-delay': `${index * 42}ms` } as CSSProperties}
                        >
                          <span className="public-fab-bar__label">{action.label}</span>
                          <span className="public-fab-bar__action-icon">
                            <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                          </span>
                        </span>
                      );
                    })}
                  </div>
                  <span className="public-fab-bar__launcher" aria-hidden="true">
                    <Menu className="public-fab-bar__launcher-menu h-5 w-5" />
                    <X className="public-fab-bar__launcher-close h-5 w-5" />
                  </span>
                </nav>
              ) : (
                <span className="absolute inset-0 flex items-center justify-center px-5 text-xs font-semibold text-stone-500">Görünür buton yok</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-black text-stone-900 dark:text-stone-100">Buton Sırası ve Görünürlüğü</h2>
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">Oklarla mobil FAB Bar buton sırasını değiştirin. Gizlenen butonlar sıralamadaki yerini korur ve menü düzenini bozmaz.</p>
        <div className="mt-4 grid gap-3">
          {orderedActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <div key={action.id} className="flex min-h-24 items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3.5 dark:border-stone-700 dark:bg-stone-900 sm:gap-4 sm:p-4">
                <span className="flex shrink-0 items-center text-stone-400" aria-hidden="true">
                  <GripVertical className="h-4 w-4" />
                  <span className="w-5 text-center text-[10px] font-black">{index + 1}</span>
                </span>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-amber-500"><Icon className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-black text-stone-900 dark:text-stone-100">{action.label}</h3>
                  <p className="mt-1 text-[11px] leading-4 text-stone-500 dark:text-stone-400">{action.description}</p>
                </div>
                <div className="flex shrink-0 flex-col items-center gap-1 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => moveAction(action.id, -1)}
                    disabled={index === 0}
                    aria-label={`${action.label} butonunu yukarı taşı`}
                    title="Yukarı taşı"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 text-stone-600 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-30 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveAction(action.id, 1)}
                    disabled={index === orderedActions.length - 1}
                    aria-label={`${action.label} butonunu aşağı taşı`}
                    title="Aşağı taşı"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 text-stone-600 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-30 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </div>
                <Toggle checked={action.visible} onChange={(checked) => setActionVisibility(action.id, checked)} label={`${action.label} butonunu göster veya gizle`} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-7 border-t border-stone-200 pt-7 dark:border-stone-800 lg:grid-cols-2">
        <PaletteSelector title="Açık Tema Renk Kombinasyonu" value={draft.lightPalette} options={TAB_BAR_LIGHT_PALETTES} palettes={LIGHT_PALETTES} onChange={(lightPalette) => setDraft((current) => ({ ...current, lightPalette }))} />
        <PaletteSelector title="Koyu Tema Renk Kombinasyonu" value={draft.darkPalette} options={TAB_BAR_DARK_PALETTES} palettes={DARK_PALETTES} onChange={(darkPalette) => setDraft((current) => ({ ...current, darkPalette }))} />
      </div>

      <div className="flex justify-end border-t border-stone-200 pt-6 dark:border-stone-800">
        <button type="button" disabled={isSaving} onClick={() => onSave(normalizeTabBarSettings(draft))} className="seo-primary-button min-w-40">
          <Save className="h-4 w-4" />{isSaving ? 'Kaydediliyor…' : 'Ayarları Kaydet'}
        </button>
      </div>
    </section>
  );
}
