'use client';

import Link from 'next/link';
import Script from 'next/script';
import { useEffect, useState } from 'react';

type ConsentValue = 'granted' | 'denied';

const CONSENT_KEY = 'analytics_consent';
const CONSENT_EVENT = 'analytics-consent-changed';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: any[]) => void;
  }
}

function applyGoogleConsent(value: ConsentValue) {
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag(...args: any[]) {
    window.dataLayer?.push(args);
  };
  window.gtag('consent', 'update', {
    analytics_storage: value,
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
}

export function ConsentManager({
  measurementId,
  enabled,
}: {
  measurementId?: string;
  enabled: boolean;
}) {
  const [consent, setConsent] = useState<ConsentValue | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag(...args: any[]) {
      window.dataLayer?.push(args);
    };
    window.gtag('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      wait_for_update: 500,
    });
    const saved = localStorage.getItem(CONSENT_KEY);
    if (saved === 'granted' || saved === 'denied') {
      setConsent(saved);
      applyGoogleConsent(saved);
    } else {
      setOpen(true);
    }
  }, []);

  function choose(value: ConsentValue) {
    localStorage.setItem(CONSENT_KEY, value);
    setConsent(value);
    setOpen(false);
    applyGoogleConsent(value);
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
  }

  const loadAnalytics = enabled && Boolean(measurementId) && consent === 'granted';

  return (
    <>
      {loadAnalytics && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId || '')}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-config" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('js',new Date());gtag('config','${measurementId}',{anonymize_ip:true});`}
          </Script>
        </>
      )}

      {open ? (
        <aside
          aria-label="Analitik çerez tercihleri"
          className="fixed inset-x-4 bottom-4 z-[100] mx-auto max-w-3xl rounded-2xl border border-stone-300 bg-white/95 p-5 shadow-2xl backdrop-blur-md dark:border-stone-700 dark:bg-stone-900/95"
        >
          <p className="text-sm font-black text-stone-900 dark:text-stone-100">Gizlilik tercihiniz</p>
          <p className="mt-2 text-xs leading-5 text-stone-600 dark:text-stone-300">
            Site, zorunlu olmayan analitik ölçümü yalnız izninizle çalıştırır. Reklam depolaması kullanılmaz.
            Ayrıntılar için <Link href="/gizlilik" className="font-bold underline underline-offset-2">gizlilik ve çerez metnini</Link> inceleyebilirsiniz.
          </p>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => choose('denied')} className="rounded-xl border border-stone-300 px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800">
              Yalnız zorunlu
            </button>
            <button type="button" onClick={() => choose('granted')} className="rounded-xl bg-stone-900 px-4 py-2 text-xs font-bold text-white hover:bg-stone-800 dark:bg-amber-600 dark:text-stone-950">
              Analitiğe izin ver
            </button>
          </div>
        </aside>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-3 right-3 z-50 rounded-full border border-stone-300 bg-white/90 px-3 py-2 text-[10px] font-bold text-stone-600 shadow-sm backdrop-blur hover:bg-white dark:border-stone-700 dark:bg-stone-900/90 dark:text-stone-300"
        >
          Çerez tercihleri
        </button>
      )}
    </>
  );
}
