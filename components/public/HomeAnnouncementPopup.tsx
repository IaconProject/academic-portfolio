'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowUpRight, X } from 'lucide-react';
import type { HomePopupSettings } from '@/lib/types';
import { normalizeHomePopupSettings } from '@/lib/home-popup';

const DISMISSED_KEY = 'home_announcement_popup_dismissed_v1';

export function HomeAnnouncementPopup({ settings: rawSettings }: { settings?: HomePopupSettings }) {
  const settings = normalizeHomePopupSettings(rawSettings);
  const [open, setOpen] = useState(false);

  const close = useCallback(() => {
    if (settings.frequency === 'session') window.sessionStorage.setItem(DISMISSED_KEY, '1');
    setOpen(false);
  }, [settings.frequency]);

  useEffect(() => {
    if (!settings.enabled) return;
    if (settings.frequency === 'session' && window.sessionStorage.getItem(DISMISSED_KEY)) return;
    const timer = window.setTimeout(() => setOpen(true), settings.delaySeconds * 1000);
    return () => window.clearTimeout(timer);
  }, [settings.delaySeconds, settings.enabled, settings.frequency]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [close, open]);

  if (!open || !settings.enabled) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-stone-950/55 p-4 backdrop-blur-sm animate-[popupFadeIn_220ms_ease-out]" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="home-popup-title" aria-describedby="home-popup-message" className="relative my-auto w-full max-w-lg overflow-hidden rounded-[1.75rem] border border-white/70 bg-[#fcfaf6] shadow-[0_28px_100px_rgba(20,18,14,0.32)] dark:border-stone-700 dark:bg-stone-900">
        <button type="button" onClick={close} aria-label="Duyuruyu kapat" className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-stone-200/80 bg-white/90 text-stone-700 shadow-sm backdrop-blur transition hover:rotate-90 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:border-stone-700 dark:bg-stone-900/90 dark:text-stone-200"><X className="h-4 w-4" /></button>
        {settings.imageUrl && <div className="relative h-44 overflow-hidden sm:h-56"><img src={settings.imageUrl} alt="" className="h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-stone-950/25 to-transparent" /></div>}
        <div className="p-6 sm:p-9">
          <div className="mb-4 flex items-center gap-2"><span className="h-px w-7 bg-amber-600 dark:bg-amber-400" /><p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-800 dark:text-amber-400">{settings.eyebrow}</p></div>
          <h2 id="home-popup-title" className="max-w-md text-2xl font-black leading-tight tracking-tight text-stone-900 dark:text-stone-50 sm:text-3xl">{settings.title}</h2>
          <p id="home-popup-message" className="mt-4 whitespace-pre-wrap text-sm leading-7 text-stone-600 dark:text-stone-300">{settings.message}</p>
          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
            <button type="button" onClick={close} className="min-h-12 rounded-xl px-4 text-xs font-bold text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-white">Şimdi değil</button>
            {settings.buttonLabel && settings.buttonUrl && <a href={settings.buttonUrl} onClick={close} target={settings.buttonUrl.startsWith('http') ? '_blank' : undefined} rel={settings.buttonUrl.startsWith('http') ? 'noopener noreferrer' : undefined} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-stone-900 px-5 text-xs font-extrabold text-white shadow-lg shadow-stone-900/10 transition hover:-translate-y-0.5 hover:bg-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400">{settings.buttonLabel}<ArrowUpRight className="h-4 w-4" /></a>}
          </div>
        </div>
      </section>
      <style jsx>{`@keyframes popupFadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
    </div>
  );
}
