'use client';

import { SlidersHorizontal } from 'lucide-react';
import { ANALYTICS_PREFERENCES_OPEN_EVENT } from '@/components/public/ConsentManager';

export function AnalyticsPreferencesControl() {
  return (
    <button
      type="button"
      onClick={() =>
        window.dispatchEvent(
          new Event(ANALYTICS_PREFERENCES_OPEN_EVENT)
        )
      }
      className="inline-flex items-center gap-2 rounded-xl border border-[#cfc8b8] bg-white px-4 py-2.5 text-xs font-bold text-[#24211e] transition-colors hover:bg-[#f2eee5] focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2"
    >
      <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
      Analitik tercihini değiştir
    </button>
  );
}
