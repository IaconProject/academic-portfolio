'use client';

import { useEffect } from 'react';
import {
  ANALYTICS_RUNTIME_DISABLED_EVENT,
  ANALYTICS_CONSENT_POLICY_VERSION,
} from '@/lib/analytics-contract';
import {
  ANALYTICS_CONSENT_EVENT,
  AnalyticsConsentChangeDetail,
  readAnalyticsConsent,
} from '@/components/public/ConsentManager';
import { analyticsAuthorizationVersion } from '@/lib/analytics-consent-policy';

function createEventId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function BlogPostAnalytics({ postId }: { postId: string }) {
  useEffect(() => {
    if (navigator.doNotTrack === '1') return;

    let disposed = false;
    let runtimeEnabled = false;
    let viewSent = false;
    let engagedSent = false;
    let visibleStartedAt =
      document.visibilityState === 'visible' ? performance.now() : null;
    let visibleTotalMs = 0;
    let sentReadSeconds = 0;

    function authorizationVersion() {
      const consent = readAnalyticsConsent();
      if (consent?.state !== 'granted') return null;
      return analyticsAuthorizationVersion(
        ANALYTICS_CONSENT_POLICY_VERSION,
        consent.basis
      );
    }

    function currentVisibleMs() {
      return (
        visibleTotalMs +
        (visibleStartedAt === null ? 0 : performance.now() - visibleStartedAt)
      );
    }

    function send(
      metric: 'view' | 'engaged_view' | 'read_seconds',
      value: number
    ) {
      const currentAuthorization = authorizationVersion();
      if (!runtimeEnabled || !currentAuthorization || disposed) return;
      void fetch('/api/blog/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        keepalive: true,
        body: JSON.stringify({
          eventId: createEventId(),
          postId,
          metric,
          value,
          authorizationVersion: currentAuthorization,
        }),
      }).catch(() => undefined);
    }

    function maybeStart() {
      if (!runtimeEnabled || !authorizationVersion()) return;
      if (!viewSent) {
        viewSent = true;
        send('view', 1);
      }
    }

    function maybeEngage() {
      if (engagedSent || !viewSent) return;
      const root = document.documentElement;
      const scrollable = Math.max(1, root.scrollHeight - window.innerHeight);
      const depth = Math.min(1, window.scrollY / scrollable);
      if (currentVisibleMs() >= 30_000 || depth >= 0.5) {
        engagedSent = true;
        send('engaged_view', 1);
      }
    }

    function flushReadTime() {
      if (!viewSent) return;
      const totalSeconds = Math.min(
        1800,
        Math.floor(currentVisibleMs() / 1000)
      );
      const delta = totalSeconds - sentReadSeconds;
      if (delta < 5) return;
      sentReadSeconds = totalSeconds;
      send('read_seconds', delta);
    }

    function handleVisibility() {
      if (document.visibilityState === 'hidden') {
        if (visibleStartedAt !== null) {
          visibleTotalMs += performance.now() - visibleStartedAt;
          visibleStartedAt = null;
        }
        flushReadTime();
      } else if (visibleStartedAt === null) {
        visibleStartedAt = performance.now();
      }
    }

    function handleConsent(event: Event) {
      const detail = (event as CustomEvent<AnalyticsConsentChangeDetail>).detail;
      if (detail?.state === 'granted') maybeStart();
    }

    function disableRuntime() {
      runtimeEnabled = false;
    }

    void fetch('/api/analytics/config', {
      cache: 'no-store',
      credentials: 'same-origin',
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!disposed && response.ok && payload?.data?.enabled === true) {
          runtimeEnabled = true;
          maybeStart();
        }
      })
      .catch(() => undefined);

    const engagementInterval = window.setInterval(maybeEngage, 5_000);
    window.addEventListener('scroll', maybeEngage, { passive: true });
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', flushReadTime);
    window.addEventListener(ANALYTICS_CONSENT_EVENT, handleConsent);
    window.addEventListener(
      ANALYTICS_RUNTIME_DISABLED_EVENT,
      disableRuntime
    );

    return () => {
      flushReadTime();
      disposed = true;
      window.clearInterval(engagementInterval);
      window.removeEventListener('scroll', maybeEngage);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', flushReadTime);
      window.removeEventListener(ANALYTICS_CONSENT_EVENT, handleConsent);
      window.removeEventListener(
        ANALYTICS_RUNTIME_DISABLED_EVENT,
        disableRuntime
      );
    };
  }, [postId]);

  return null;
}
