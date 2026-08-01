'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ConsentManager } from '@/components/public/ConsentManager';
import { VisitorTracker } from '@/components/public/VisitorTracker';
import { ANALYTICS_RUNTIME_DISABLED_EVENT } from '@/lib/analytics-contract';
import {
  ANALYTICS_COLLECTION_MODES,
  AnalyticsCollectionMode,
} from '@/lib/analytics-consent-policy';

const CONFIG_REFRESH_MS = 30_000;
const MAX_UNVERIFIED_MS = 90_000;

type RuntimeConfigResponse = {
  success?: boolean;
  data?: {
    enabled?: boolean;
    collectionMode?: AnalyticsCollectionMode;
  };
};

export function AnalyticsRuntime({
  measurementId,
}: {
  measurementId?: string;
}) {
  const [runtimeConfig, setRuntimeConfig] = useState<{
    enabled: boolean;
    collectionMode: AnalyticsCollectionMode;
    verified: boolean;
  }>({
    enabled: false,
    collectionMode: 'consent-required',
    verified: false,
  });
  const lastVerifiedAt = useRef(0);
  const requestInProgress = useRef(false);

  const refreshRuntimeConfig = useCallback(async () => {
    if (requestInProgress.current) return;
    requestInProgress.current = true;

    try {
      const response = await fetch('/api/analytics/config', {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      const payload = (await response
        .json()
        .catch(() => null)) as RuntimeConfigResponse | null;

      if (!response.ok || !payload?.success) {
        throw new Error('ANALYTICS_CONFIG_UNAVAILABLE');
      }

      const nextEnabled = payload.data?.enabled === true;
      const collectionMode = ANALYTICS_COLLECTION_MODES.includes(
        payload.data?.collectionMode as AnalyticsCollectionMode
      )
        ? (payload.data?.collectionMode as AnalyticsCollectionMode)
        : 'consent-required';
      lastVerifiedAt.current = Date.now();
      setRuntimeConfig({
        enabled: nextEnabled,
        collectionMode,
        verified: true,
      });
    } catch {
      if (
        lastVerifiedAt.current === 0 ||
        Date.now() - lastVerifiedAt.current > MAX_UNVERIFIED_MS
      ) {
        setRuntimeConfig((current) => ({
          ...current,
          enabled: false,
          verified: true,
        }));
      }
    } finally {
      requestInProgress.current = false;
    }
  }, []);

  useEffect(() => {
    void refreshRuntimeConfig();
    const intervalId = window.setInterval(
      () => void refreshRuntimeConfig(),
      CONFIG_REFRESH_MS
    );
    const refreshWhenActive = () => {
      if (document.visibilityState === 'visible') {
        void refreshRuntimeConfig();
      }
    };
    const disableImmediately = () =>
      setRuntimeConfig((current) => ({
        ...current,
        enabled: false,
        verified: true,
      }));

    window.addEventListener('focus', refreshWhenActive);
    window.addEventListener('online', refreshWhenActive);
    window.addEventListener('pageshow', refreshWhenActive);
    document.addEventListener('visibilitychange', refreshWhenActive);
    window.addEventListener(
      ANALYTICS_RUNTIME_DISABLED_EVENT,
      disableImmediately
    );

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshWhenActive);
      window.removeEventListener('online', refreshWhenActive);
      window.removeEventListener('pageshow', refreshWhenActive);
      document.removeEventListener('visibilitychange', refreshWhenActive);
      window.removeEventListener(
        ANALYTICS_RUNTIME_DISABLED_EVENT,
        disableImmediately
      );
    };
  }, [refreshRuntimeConfig]);

  if (!runtimeConfig.verified) return null;

  return (
    <>
      <VisitorTracker enabled={runtimeConfig.enabled} />
      <ConsentManager
        enabled={runtimeConfig.enabled}
        measurementId={measurementId}
        collectionMode={runtimeConfig.collectionMode}
      />
    </>
  );
}
