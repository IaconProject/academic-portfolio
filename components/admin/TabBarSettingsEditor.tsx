'use client';

import { useEffect, useState } from 'react';
import {
  Check,
  Home,
  Mail,
  MessageSquareText,
  Moon,
  PanelBottom,
  Save,
  Sun,
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
  { id: 'theme', label: 'Tema Değiştirici', description: 'Ziyaretçinin açık ve koyu görünüm arasında geçiş yapmasını sağlar.', icon: Sun },
  { id: 'email', label: 'E-posta', description: 'Profilde kayıtlı e-posta adresini ziyaretçinin mail uygulamasında açar.', icon: Mail },
  { id: 'contact', label: 'İletişim Formu', description: 'Ana sayfadaki “İletişim & Mesaj Gönderin” alanına kaydırır.', icon: MessageSquareText },
];

const LIGHT_PALETTES: Record<TabBarLightPalette, { label: string; description: string; colors: [string, string, string] }> = {
  ivory: { label: 'Fildişi & Bronz', description: 'Akademik ve zamansız sıcak nötrler', colors: ['#f9f6ef', '#946932', '#352e27'] },
  sand: { label: 'Kum & Terakota', description: 'Sıcak ve modern toprak tonları', colors: ['#faf3ea', '#b5562f', '#4b2e21'] },
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
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-stone-900 ${checked ? 'border-stone-900 bg-stone-900 dark:border-amber-500 dark:bg-amber-500' : 'border-stone-300 bg-stone-200 dark:border-stone-600 dark:bg-stone-700'}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform dark:bg-stone-950 ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
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
      <div role="radiogroup" aria-label={title} className="grid gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const palette = palettes[option];
          const selected = value === option;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option)}
              className={`relative flex min-h-24 items-center gap-4 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-amber-500 ${selected ? 'border-stone-900 bg-stone-50 ring-1 ring-stone-900 dark:border-amber-500 dark:bg-stone-800 dark:ring-amber-500' : 'border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900'}`}
            >
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
            </button>
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

  const visibleActions = ACTIONS.filter((action) =>
    draft.buttons.find((button) => button.id === action.id)?.visible
  );

  const setActionVisibility = (id: TabBarActionId, visible: boolean) => {
    setDraft((current) => ({
      ...current,
      buttons: current.buttons.map((button) => button.id === id ? { ...button, visible } : button),
    }));
  };

  return (
    <section className="admin-panel-card space-y-7">
      <div className="flex flex-col gap-4 border-b border-stone-200 pb-6 dark:border-stone-800 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-amber-700 dark:text-amber-500">
            <PanelBottom className="h-5 w-5" />
            <span className="text-[11px] font-black uppercase tracking-[0.18em]">Görünüm & Hızlı Erişim</span>
          </div>
          <h1 className="font-serif text-2xl font-bold text-stone-950 dark:text-stone-50">Tab Bar ve Tema Ayarları</h1>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-stone-600 dark:text-stone-400">
            Ana sayfa ve tüm içerik sayfalarında görünen alt menüyü, butonlarını ve açık/koyu renklerini yönetin. Görünür butonlar her zaman eşit genişlikte ve simetrik yerleşir.
          </p>
        </div>
        <Toggle checked={draft.enabled} onChange={(enabled) => setDraft((current) => ({ ...current, enabled }))} label="Tab bar menüsünü aç veya kapat" />
      </div>

      <div className={`rounded-3xl border p-5 transition-opacity dark:border-stone-700 ${draft.enabled ? 'border-stone-200 bg-stone-50/80 dark:bg-stone-950/50' : 'border-stone-200 bg-stone-100 opacity-55 dark:bg-stone-950'}`}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-stone-900 dark:text-stone-100">Canlı Yerleşim Önizlemesi</h2>
            <p className="mt-1 text-[11px] text-stone-500 dark:text-stone-400">
              {visibleActions.length ? `${visibleActions.length} buton görünür · Profil e-postası: ${email}` : 'Tüm butonlar gizli; menü sitede gösterilmez.'}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-stone-400"><Sun className="h-4 w-4" /><span className="text-[10px] font-black">/</span><Moon className="h-4 w-4" /></div>
        </div>
        <div className="mx-auto flex w-fit max-w-full items-center justify-center gap-1 rounded-[1.35rem] border border-stone-300 bg-white/90 p-1.5 shadow-xl dark:border-stone-600 dark:bg-stone-900/90">
          {visibleActions.length ? visibleActions.map((action) => {
            const Icon = action.id === 'theme' ? Moon : action.icon;
            return (
              <span key={action.id} className="flex h-14 w-14 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl text-[9px] font-bold text-stone-600 dark:text-stone-300 sm:w-16">
                <Icon className="h-4 w-4" /><span className="max-w-full truncate px-1">{action.label}</span>
              </span>
            );
          }) : <span className="px-5 py-3 text-xs font-semibold text-stone-500">Görünür buton yok</span>}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-black text-stone-900 dark:text-stone-100">Buton Görünürlüğü</h2>
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">“Ana Sayfa” butonu, ziyaretçilerin alt sayfalardan hızlı dönüşü için eklenmiş önerilen kısayoldur.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {ACTIONS.map((action) => {
            const Icon = action.icon;
            const visible = draft.buttons.find((button) => button.id === action.id)?.visible ?? true;
            return (
              <div key={action.id} className="flex min-h-28 items-center gap-4 rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-amber-500"><Icon className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-black text-stone-900 dark:text-stone-100">{action.label}</h3>
                  <p className="mt-1 text-[11px] leading-4 text-stone-500 dark:text-stone-400">{action.description}</p>
                </div>
                <Toggle checked={visible} onChange={(checked) => setActionVisibility(action.id, checked)} label={`${action.label} butonunu göster veya gizle`} />
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
