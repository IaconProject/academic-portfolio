'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ConsentManager } from '@/components/public/ConsentManager';
import { VisitorTracker } from '@/components/public/VisitorTracker';
import { ANALYTICS_RUNTIME_DISABLED_EVENT } from '@/lib/analytics-contract';

const CONFIG_REFRESH_MS = 30_000;
const MAX_UNVERIFIED_MS = 90_000;

type RuntimeConfigResponse = {
  success?: boolean;
  data?: { enabled?: boolean };
};

export function AnalyticsRuntime({
  initiallyEnabled,
  measurementId,
}: {
  initiallyEnabled: boolean;
  measurementId?: string;
}) {
  const [enabled, setEnabled] = useState(initiallyEnabled);
  const lastVerifiedAt = useRef(initiallyEnabled ? Date.now() : 0);
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
      lastVerifiedAt.current = Date.now();
      setEnabled(nextEnabled);
    } catch {
      if (
        lastVerifiedAt.current === 0 ||
        Date.now() - lastVerifiedAt.current > MAX_UNVERIFIED_MS
      ) {
        setEnabled(false);
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
    const disableImmediately = () => setEnabled(false);

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

  return (
    <>
      <VisitorTracker enabled={enabled} />
      <ConsentManager enabled={enabled} measurementId={measurementId} />
    </>
  );
}
