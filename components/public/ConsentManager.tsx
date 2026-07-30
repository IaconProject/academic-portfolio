'use client';

import Link from 'next/link';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ANALYTICS_CONSENT_POLICY_VERSION } from '@/lib/analytics-contract';

export type ConsentValue = 'granted' | 'denied';
export type ConsentChangeReason =
  | 'user-choice'
  | 'user-revoked'
  | 'expired'
  | 'invalid'
  | 'analytics-disabled'
  | 'restored';

export interface AnalyticsConsentRecord {
  state: ConsentValue;
  policyVersion: string;
  decidedAt: string;
  expiresAt: string;
}

export interface AnalyticsConsentChangeDetail {
  state: ConsentValue;
  policyVersion: string;
  reason: ConsentChangeReason;
}

export { ANALYTICS_CONSENT_POLICY_VERSION };
export const ANALYTICS_CONSENT_KEY = 'analytics_consent';
export const ANALYTICS_CONSENT_EVENT = 'analytics-consent-changed';

export const ANALYTICS_STORAGE_KEYS = {
  visitorId: 'analytics_visitor_id_v2',
  session: 'analytics_session_v2',
  queue: 'analytics_event_queue_v2',
  tabId: 'analytics_tab_id_v2',
  sequence: 'analytics_event_sequence_v2',
  legacySessionId: 'tracker_session_id',
} as const;

const CONSENT_LIFETIME_MS = 180 * 24 * 60 * 60 * 1000;
const GA_MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]{6,20}$/;
const CONSENT_BROADCAST_CHANNEL = 'analytics-consent-v2';
let volatileConsent: AnalyticsConsentRecord | null = null;

declare global {
  interface AnalyticsGaPageView {
    eventId: string;
    page_path: string;
    page_title: string;
    page_location: string;
  }

  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __analyticsGaReady?: boolean;
    __analyticsPendingGaPageViews?: AnalyticsGaPageView[];
  }
}

function isConsentRecord(value: unknown): value is AnalyticsConsentRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<AnalyticsConsentRecord>;
  return (
    (record.state === 'granted' || record.state === 'denied') &&
    record.policyVersion === ANALYTICS_CONSENT_POLICY_VERSION &&
    typeof record.decidedAt === 'string' &&
    Number.isFinite(Date.parse(record.decidedAt)) &&
    typeof record.expiresAt === 'string' &&
    Number.isFinite(Date.parse(record.expiresAt))
  );
}

/**
 * Removes every first-party analytics identifier and pending event.
 * The consent choice itself is intentionally retained unless it is invalid/expired.
 */
export function clearAnalyticsClientState(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(ANALYTICS_STORAGE_KEYS.visitorId);
    localStorage.removeItem(ANALYTICS_STORAGE_KEYS.session);
    localStorage.removeItem(ANALYTICS_STORAGE_KEYS.queue);
    localStorage.removeItem(ANALYTICS_STORAGE_KEYS.legacySessionId);
  } catch {
    // Storage may be blocked. The tracker also clears its in-memory queue.
  }

  try {
    sessionStorage.removeItem(ANALYTICS_STORAGE_KEYS.tabId);
    sessionStorage.removeItem(ANALYTICS_STORAGE_KEYS.sequence);
  } catch {
    // Storage may be blocked.
  }
}

export function readAnalyticsConsent(): AnalyticsConsentRecord | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(ANALYTICS_CONSENT_KEY);
    if (!raw) {
      if (
        volatileConsent &&
        isConsentRecord(volatileConsent) &&
        Date.parse(volatileConsent.expiresAt) > Date.now()
      ) {
        return volatileConsent;
      }
      volatileConsent = null;
      return null;
    }

    // Plain `granted`/`denied` values belong to the legacy, unversioned policy.
    // Re-consent is required rather than silently carrying them forward.
    const parsed: unknown = JSON.parse(raw);
    if (!isConsentRecord(parsed)) {
      localStorage.removeItem(ANALYTICS_CONSENT_KEY);
      volatileConsent = null;
      clearAnalyticsClientState();
      return null;
    }

    if (Date.parse(parsed.expiresAt) <= Date.now()) {
      localStorage.removeItem(ANALYTICS_CONSENT_KEY);
      volatileConsent = null;
      clearAnalyticsClientState();
      return null;
    }

    volatileConsent = parsed;
    return parsed;
  } catch {
    if (
      volatileConsent &&
      isConsentRecord(volatileConsent) &&
      Date.parse(volatileConsent.expiresAt) > Date.now()
    ) {
      return volatileConsent;
    }
    volatileConsent = null;
    return null;
  }
}

function writeAnalyticsConsent(state: ConsentValue): AnalyticsConsentRecord {
  const decidedAt = new Date();
  const record: AnalyticsConsentRecord = {
    state,
    policyVersion: ANALYTICS_CONSENT_POLICY_VERSION,
    decidedAt: decidedAt.toISOString(),
    expiresAt: new Date(decidedAt.getTime() + CONSENT_LIFETIME_MS).toISOString(),
  };

  volatileConsent = record;
  try {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, JSON.stringify(record));
  } catch {
    // A blocked storage API must not prevent the user's choice being applied
    // for the current page. It simply cannot persist across navigations.
  }
  return record;
}

function dispatchConsentChange(state: ConsentValue, reason: ConsentChangeReason): void {
  window.dispatchEvent(
    new CustomEvent<AnalyticsConsentChangeDetail>(ANALYTICS_CONSENT_EVENT, {
      detail: {
        state,
        policyVersion: ANALYTICS_CONSENT_POLICY_VERSION,
        reason,
      },
    }),
  );
}

function ensureGtag(): NonNullable<Window['gtag']> {
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer?.push(args);
    };
  }
  return window.gtag;
}

function applyGoogleConsent(value: ConsentValue): void {
  ensureGtag()('consent', 'update', {
    analytics_storage: value,
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
}

function resetGoogleAnalyticsRuntime(): void {
  window.__analyticsGaReady = false;
  window.__analyticsPendingGaPageViews = [];
}

function normalizeMeasurementId(value?: string): string | null {
  const candidate = value?.trim().toUpperCase() || '';
  return GA_MEASUREMENT_ID_PATTERN.test(candidate) ? candidate : null;
}

export function ConsentManager({
  measurementId,
  enabled,
}: {
  measurementId?: string;
  enabled: boolean;
}) {
  const pathname = usePathname();
  const [consent, setConsent] = useState<ConsentValue | null>(null);
  const [open, setOpen] = useState(false);
  const consentChannelRef = useRef<BroadcastChannel | null>(null);
  const safeMeasurementId = useMemo(() => normalizeMeasurementId(measurementId), [measurementId]);
  const isAdminRoute =
    pathname === '/admin' || pathname.startsWith('/admin/');
  const analyticsActive = enabled && !isAdminRoute;

  useEffect(() => {
    ensureGtag()('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      wait_for_update: 500,
    });

    const saved = readAnalyticsConsent();
    if (saved) {
      setConsent(saved.state);
      applyGoogleConsent(analyticsActive ? saved.state : 'denied');
      if (saved.state === 'denied') clearAnalyticsClientState();
      dispatchConsentChange(
        analyticsActive ? saved.state : 'denied',
        analyticsActive ? 'restored' : 'analytics-disabled',
      );
      if (!analyticsActive || saved.state === 'denied') {
        resetGoogleAnalyticsRuntime();
      }
      return;
    }

    setConsent(null);
    applyGoogleConsent('denied');
    clearAnalyticsClientState();
    resetGoogleAnalyticsRuntime();
    dispatchConsentChange(
      'denied',
      analyticsActive ? 'invalid' : 'analytics-disabled',
    );
    setOpen(analyticsActive);
  }, [analyticsActive]);

  useEffect(() => {
    const applyExternalRecord = (
      record: AnalyticsConsentRecord | null
    ) => {
      const validRecord =
        record &&
        isConsentRecord(record) &&
        Date.parse(record.expiresAt) > Date.now()
          ? record
          : null;
      volatileConsent = validRecord;

      if (validRecord) {
        setConsent(validRecord.state);
        setOpen(false);
        applyGoogleConsent(
          analyticsActive ? validRecord.state : 'denied'
        );
        if (validRecord.state === 'denied' || !analyticsActive) {
          clearAnalyticsClientState();
          resetGoogleAnalyticsRuntime();
        }
        dispatchConsentChange(
          analyticsActive ? validRecord.state : 'denied',
          analyticsActive ? 'restored' : 'analytics-disabled'
        );
        return;
      }

      setConsent(null);
      setOpen(analyticsActive);
      applyGoogleConsent('denied');
      clearAnalyticsClientState();
      resetGoogleAnalyticsRuntime();
      dispatchConsentChange(
        'denied',
        analyticsActive ? 'invalid' : 'analytics-disabled'
      );
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== ANALYTICS_CONSENT_KEY) return;
      applyExternalRecord(readAnalyticsConsent());
    };

    let channel: BroadcastChannel | null = null;
    if ('BroadcastChannel' in window) {
      channel = new BroadcastChannel(CONSENT_BROADCAST_CHANNEL);
      channel.onmessage = (event: MessageEvent<unknown>) => {
        applyExternalRecord(
          isConsentRecord(event.data) ? event.data : null
        );
      };
      consentChannelRef.current = channel;
    }

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      channel?.close();
      if (consentChannelRef.current === channel) {
        consentChannelRef.current = null;
      }
    };
  }, [analyticsActive]);

  useEffect(() => {
    if (consent === null) return;

    const enforceExpiry = () => {
      if (readAnalyticsConsent()) return;
      setConsent(null);
      setOpen(analyticsActive);
      applyGoogleConsent('denied');
      clearAnalyticsClientState();
      resetGoogleAnalyticsRuntime();
      consentChannelRef.current?.postMessage(null);
      dispatchConsentChange('denied', 'expired');
    };
    const intervalId = window.setInterval(enforceExpiry, 60_000);
    const enforceWhenVisible = () => {
      if (document.visibilityState === 'visible') enforceExpiry();
    };
    window.addEventListener('focus', enforceExpiry);
    window.addEventListener('pageshow', enforceExpiry);
    document.addEventListener('visibilitychange', enforceWhenVisible);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', enforceExpiry);
      window.removeEventListener('pageshow', enforceExpiry);
      document.removeEventListener(
        'visibilitychange',
        enforceWhenVisible
      );
    };
  }, [analyticsActive, consent]);

  function choose(value: ConsentValue) {
    const record = writeAnalyticsConsent(value);
    consentChannelRef.current?.postMessage(record);
    setConsent(value);
    setOpen(false);
    applyGoogleConsent(analyticsActive ? value : 'denied');

    if (value === 'denied' || !analyticsActive) {
      clearAnalyticsClientState();
      resetGoogleAnalyticsRuntime();
    }

    dispatchConsentChange(
      analyticsActive ? value : 'denied',
      value === 'denied'
        ? 'user-revoked'
        : analyticsActive
          ? 'user-choice'
          : 'analytics-disabled',
    );
  }

  const loadAnalytics =
    analyticsActive && Boolean(safeMeasurementId) && consent === 'granted';

  function initializeGoogleAnalytics() {
    if (!loadAnalytics || !safeMeasurementId) return;

    const gtag = ensureGtag();
    gtag('js', new Date());
    gtag('config', safeMeasurementId, {
      anonymize_ip: true,
      send_page_view: false,
    });
    window.__analyticsGaReady = true;

    const pending = window.__analyticsPendingGaPageViews || [];
    window.__analyticsPendingGaPageViews = [];
    pending.forEach(({ eventId: _eventId, ...pageView }) => {
      gtag('event', 'page_view', pageView);
    });
  }

  return (
    <>
      {loadAnalytics && safeMeasurementId && (
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(safeMeasurementId)}`}
          strategy="afterInteractive"
          onReady={initializeGoogleAnalytics}
        />
      )}

      {open && analyticsActive ? (
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
      ) : analyticsActive ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-3 right-3 z-50 rounded-full border border-stone-300 bg-white/90 px-3 py-2 text-[10px] font-bold text-stone-600 shadow-sm backdrop-blur hover:bg-white dark:border-stone-700 dark:bg-stone-900/90 dark:text-stone-300"
        >
          Çerez tercihleri
        </button>
      ) : null}
    </>
  );
}
