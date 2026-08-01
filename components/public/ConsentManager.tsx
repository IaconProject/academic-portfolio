'use client';

import Link from 'next/link';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ANALYTICS_CONSENT_POLICY_VERSION } from '@/lib/analytics-contract';
import {
  AnalyticsAuthorizationBasis,
  AnalyticsCollectionMode,
} from '@/lib/analytics-consent-policy';

export type ConsentValue = 'granted' | 'denied';
export type ConsentChangeReason =
  | 'user-choice'
  | 'user-revoked'
  | 'expired'
  | 'invalid'
  | 'analytics-disabled'
  | 'regional-policy'
  | 'restored';

export interface AnalyticsConsentRecord {
  state: ConsentValue;
  basis: AnalyticsAuthorizationBasis;
  policyVersion: string;
  decidedAt: string;
  expiresAt: string;
}

export interface AnalyticsConsentChangeDetail {
  state: ConsentValue;
  basis: AnalyticsAuthorizationBasis | null;
  policyVersion: string;
  reason: ConsentChangeReason;
}

export { ANALYTICS_CONSENT_POLICY_VERSION };
export const ANALYTICS_CONSENT_KEY = 'analytics_consent';
export const ANALYTICS_CONSENT_EVENT = 'analytics-consent-changed';
export const ANALYTICS_PREFERENCES_OPEN_EVENT =
  'analytics-preferences-open';

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
    (record.basis === 'consent' ||
      record.basis === 'first-party-analytics') &&
    record.policyVersion === ANALYTICS_CONSENT_POLICY_VERSION &&
    typeof record.decidedAt === 'string' &&
    Number.isFinite(Date.parse(record.decidedAt)) &&
    typeof record.expiresAt === 'string' &&
    Number.isFinite(Date.parse(record.expiresAt))
  );
}

/** Removes every first-party analytics identifier and pending event. */
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
    // Session storage is optional.
  }
}

function removeAnalyticsConsentRecord(): void {
  volatileConsent = null;
  try {
    localStorage.removeItem(ANALYTICS_CONSENT_KEY);
  } catch {
    // The in-memory record is still removed for this page lifetime.
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

    const parsed: unknown = JSON.parse(raw);
    if (
      !isConsentRecord(parsed) ||
      Date.parse(parsed.expiresAt) <= Date.now()
    ) {
      removeAnalyticsConsentRecord();
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

function writeAnalyticsConsent(
  state: ConsentValue,
  basis: AnalyticsAuthorizationBasis
): AnalyticsConsentRecord {
  const decidedAt = new Date();
  const record: AnalyticsConsentRecord = {
    state,
    basis,
    policyVersion: ANALYTICS_CONSENT_POLICY_VERSION,
    decidedAt: decidedAt.toISOString(),
    expiresAt: new Date(
      decidedAt.getTime() + CONSENT_LIFETIME_MS
    ).toISOString(),
  };

  volatileConsent = record;
  try {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, JSON.stringify(record));
  } catch {
    // The decision remains valid in memory for this page lifetime.
  }
  return record;
}

function dispatchConsentChange(
  state: ConsentValue,
  reason: ConsentChangeReason,
  basis: AnalyticsAuthorizationBasis | null
): void {
  window.dispatchEvent(
    new CustomEvent<AnalyticsConsentChangeDetail>(ANALYTICS_CONSENT_EVENT, {
      detail: {
        state,
        basis,
        policyVersion: ANALYTICS_CONSENT_POLICY_VERSION,
        reason,
      },
    })
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

function recordAppliesToMode(
  record: AnalyticsConsentRecord,
  collectionMode: AnalyticsCollectionMode
): boolean {
  return !(
    record.state === 'granted' &&
    record.basis === 'first-party-analytics' &&
    collectionMode !== 'first-party-analytics'
  );
}

export function ConsentManager({
  measurementId,
  enabled,
  collectionMode,
}: {
  measurementId?: string;
  enabled: boolean;
  collectionMode: AnalyticsCollectionMode;
}) {
  const pathname = usePathname();
  const [consent, setConsent] = useState<ConsentValue | null>(null);
  const [basis, setBasis] = useState<AnalyticsAuthorizationBasis | null>(
    null
  );
  const [open, setOpen] = useState(false);
  const consentChannelRef = useRef<BroadcastChannel | null>(null);
  const safeMeasurementId = useMemo(
    () => normalizeMeasurementId(measurementId),
    [measurementId]
  );
  const isAdminRoute =
    pathname === '/admin' || pathname.startsWith('/admin/');
  const analyticsActive = enabled && !isAdminRoute;

  const activateRecord = useCallback(
    (record: AnalyticsConsentRecord, reason: ConsentChangeReason) => {
      setConsent(record.state);
      setBasis(record.basis);
      setOpen(false);

      const googleConsentGranted =
        analyticsActive &&
        record.state === 'granted' &&
        record.basis === 'consent';
      applyGoogleConsent(googleConsentGranted ? 'granted' : 'denied');

      if (record.state === 'denied' || !analyticsActive) {
        clearAnalyticsClientState();
      }
      if (!googleConsentGranted) resetGoogleAnalyticsRuntime();

      dispatchConsentChange(
        analyticsActive ? record.state : 'denied',
        analyticsActive ? reason : 'analytics-disabled',
        analyticsActive ? record.basis : null
      );
    },
    [analyticsActive]
  );

  const activateFallback = useCallback(
    (reason: 'expired' | 'invalid') => {
      if (
        analyticsActive &&
        collectionMode === 'first-party-analytics'
      ) {
        const regionalRecord = writeAnalyticsConsent(
          'granted',
          'first-party-analytics'
        );
        consentChannelRef.current?.postMessage(regionalRecord);
        activateRecord(regionalRecord, 'regional-policy');
        return;
      }

      setConsent(null);
      setBasis(null);
      setOpen(analyticsActive);
      applyGoogleConsent('denied');
      clearAnalyticsClientState();
      resetGoogleAnalyticsRuntime();
      dispatchConsentChange(
        'denied',
        analyticsActive ? reason : 'analytics-disabled',
        null
      );
    },
    [activateRecord, analyticsActive, collectionMode]
  );

  const readApplicableRecord = useCallback(() => {
    const saved = readAnalyticsConsent();
    if (!saved || recordAppliesToMode(saved, collectionMode)) return saved;

    removeAnalyticsConsentRecord();
    clearAnalyticsClientState();
    return null;
  }, [collectionMode]);

  useEffect(() => {
    ensureGtag()('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      wait_for_update: 500,
    });

    const saved = readApplicableRecord();
    if (saved) {
      activateRecord(saved, 'restored');
    } else {
      activateFallback('invalid');
    }
  }, [activateFallback, activateRecord, readApplicableRecord]);

  useEffect(() => {
    const applyExternalRecord = (record: AnalyticsConsentRecord | null) => {
      const validRecord =
        record &&
        isConsentRecord(record) &&
        Date.parse(record.expiresAt) > Date.now() &&
        recordAppliesToMode(record, collectionMode)
          ? record
          : null;
      volatileConsent = validRecord;

      if (validRecord) {
        activateRecord(validRecord, 'restored');
      } else {
        removeAnalyticsConsentRecord();
        activateFallback('invalid');
      }
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

    const openPreferences = () => setOpen(analyticsActive);
    window.addEventListener('storage', handleStorage);
    window.addEventListener(
      ANALYTICS_PREFERENCES_OPEN_EVENT,
      openPreferences
    );
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(
        ANALYTICS_PREFERENCES_OPEN_EVENT,
        openPreferences
      );
      channel?.close();
      if (consentChannelRef.current === channel) {
        consentChannelRef.current = null;
      }
    };
  }, [activateFallback, activateRecord, analyticsActive, collectionMode]);

  useEffect(() => {
    if (consent === null) return;

    const enforceExpiry = () => {
      if (readApplicableRecord()) return;
      consentChannelRef.current?.postMessage(null);
      activateFallback('expired');
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
  }, [activateFallback, consent, readApplicableRecord]);

  function choose(value: ConsentValue) {
    const record = writeAnalyticsConsent(value, 'consent');
    consentChannelRef.current?.postMessage(record);
    activateRecord(
      record,
      value === 'denied' ? 'user-revoked' : 'user-choice'
    );
  }

  const loadAnalytics =
    analyticsActive &&
    Boolean(safeMeasurementId) &&
    consent === 'granted' &&
    basis === 'consent';

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

  const isRegionalFirstPartyMode =
    collectionMode === 'first-party-analytics';

  return (
    <>
      {loadAnalytics && safeMeasurementId ? (
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(safeMeasurementId)}`}
          strategy="afterInteractive"
          onReady={initializeGoogleAnalytics}
        />
      ) : null}

      {open && analyticsActive ? (
        <aside
          aria-label="Analitik tercihleri"
          className="fixed inset-x-4 bottom-4 z-[100] mx-auto max-w-3xl rounded-2xl border border-stone-300 bg-white/95 p-5 shadow-2xl backdrop-blur-md dark:border-stone-700 dark:bg-stone-900/95"
        >
          <p className="text-sm font-black text-stone-900 dark:text-stone-100">
            Gizlilik tercihiniz
          </p>
          <p className="mt-2 text-xs leading-5 text-stone-600 dark:text-stone-300">
            {isRegionalFirstPartyMode
              ? 'Türkiye için site içi, birinci taraf ve siteler arası takip yapmayan performans ölçümü etkindir. İsterseniz bu ölçümü kapatabilir veya Google Analytics için ayrıca izin verebilirsiniz. Reklam depolaması kullanılmaz.'
              : 'Site içi ölçüm ve Google Analytics yalnız izninizle çalışır. Reklam depolaması kullanılmaz.'}{' '}
            Ayrıntılar için{' '}
            <Link
              href="/gizlilik"
              className="font-bold underline underline-offset-2"
            >
              gizlilik ve analitik metnini
            </Link>{' '}
            inceleyebilirsiniz.
          </p>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => choose('denied')}
              className="rounded-xl border border-stone-300 px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
            >
              {isRegionalFirstPartyMode
                ? 'Site içi analitiği kapat'
                : 'Yalnız zorunlu'}
            </button>
            <button
              type="button"
              onClick={() => choose('granted')}
              className="rounded-xl bg-stone-900 px-4 py-2 text-xs font-bold text-white hover:bg-stone-800 dark:bg-amber-600 dark:text-stone-950"
            >
              Analitiğe izin ver
            </button>
          </div>
        </aside>
      ) : null}
    </>
  );
}
