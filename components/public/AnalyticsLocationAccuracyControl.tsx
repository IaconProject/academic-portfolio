'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2, LocateFixed } from 'lucide-react';
import { readAnalyticsConsent } from '@/components/public/ConsentManager';
import {
  dispatchAnalyticsLocationUpdate,
  requestAnalyticsBrowserGeo,
} from '@/lib/analytics-client-location';

type LocationState = 'idle' | 'loading' | 'success' | 'error' | 'analytics-off';

function accuracyLabel(accuracyMeters: number): string {
  if (accuracyMeters < 1_000) return `±${Math.round(accuracyMeters)} m`;
  return `±${(accuracyMeters / 1_000).toFixed(1)} km`;
}

export function AnalyticsLocationAccuracyControl() {
  const [state, setState] = useState<LocationState>('idle');
  const [accuracy, setAccuracy] = useState<number | null>(null);

  async function improveLocation() {
    if (readAnalyticsConsent()?.state !== 'granted') {
      setState('analytics-off');
      return;
    }

    setState('loading');
    const geo = await requestAnalyticsBrowserGeo();
    if (!geo) {
      setState('error');
      return;
    }

    setAccuracy(geo.accuracyMeters);
    dispatchAnalyticsLocationUpdate(geo);
    setState('success');
  }

  return (
    <div className="rounded-xl border border-[#d8d0bf] bg-white/70 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-bold text-[#24211e]">Konum doğruluğu</p>
          <p className="mt-1 max-w-xl text-xs leading-5 text-[#6b665e]">
            IP konumu yanlışsa, açık izninizle cihazın bildirdiği konumu yalnız
            Türkiye ili düzeyine indirgeyebiliriz. Koordinatlar analitik
            veritabanına kaydedilmez.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void improveLocation()}
          disabled={state === 'loading'}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[#b8ad98] bg-[#f2eee5] px-4 py-2.5 text-xs font-bold text-[#24211e] transition-colors hover:bg-[#e9e2d5] focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
        >
          {state === 'loading' ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : state === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-700" aria-hidden="true" />
          ) : (
            <LocateFixed className="h-4 w-4" aria-hidden="true" />
          )}
          {state === 'loading'
            ? 'Konum alınıyor…'
            : state === 'success'
              ? 'Konum alındı'
              : 'Konumu doğrula'}
        </button>
      </div>

      <div aria-live="polite" className="mt-2 min-h-5 text-xs">
        {state === 'success' && accuracy !== null ? (
          <p className="text-emerald-800">
            Cihaz konumu {accuracyLabel(accuracy)} doğrulukla alındı; yeni
            ölçüm il düzeyinde güncellendi.
          </p>
        ) : state === 'error' ? (
          <p className="text-amber-800">
            Konum alınamadı. Tarayıcı/site konum iznini denetleyip yeniden
            deneyebilirsiniz; izin olmadan IP tabanlı yaklaşık konum kullanılır.
          </p>
        ) : state === 'analytics-off' ? (
          <p className="text-amber-800">
            Önce analitik ölçümü etkinleştirin, ardından konumu doğrulayın.
          </p>
        ) : null}
      </div>
    </div>
  );
}
