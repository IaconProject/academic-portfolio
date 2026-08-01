'use client';

import { useCallback, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useReportWebVitals } from 'next/web-vitals';
import {
  ANALYTICS_CONSENT_EVENT,
  ANALYTICS_STORAGE_KEYS,
  AnalyticsConsentChangeDetail,
  clearAnalyticsClientState,
  readAnalyticsConsent,
} from '@/components/public/ConsentManager';
import {
  ANALYTICS_CONSENT_POLICY_VERSION,
  ANALYTICS_MAX_BATCH_EVENTS,
  ANALYTICS_RUNTIME_DISABLED_EVENT,
  ANALYTICS_SCHEMA_VERSION,
  ANALYTICS_SCROLL_THRESHOLDS,
  ANALYTICS_SESSION_TIMEOUT_MS,
  ANALYTICS_TRACK_EVENT,
  ANALYTICS_WEB_VITAL_NAMES,
  AnalyticsClientEventContract,
  AnalyticsBrowserGeo,
  AnalyticsEventBase,
  AnalyticsEventDetails,
  AnalyticsTrackEventDetail,
  AnalyticsUtmProperties,
  AnalyticsWebVitalName,
  getSafeAnalyticsDownload,
  normalizeAnalyticsClientErrorName,
  normalizeAnalyticsCampaignValue,
  normalizeAnalyticsNavigationType,
  normalizeAnalyticsOutboundHostname,
  normalizeAnalyticsWebVitalRating,
  normalizeAnalyticsWebVitalValue,
} from '@/lib/analytics-contract';
import { analyticsAuthorizationVersion } from '@/lib/analytics-consent-policy';
import {
  ANALYTICS_LOCATION_UPDATED_EVENT,
  clearAnalyticsBrowserGeo,
  getGrantedAnalyticsBrowserGeo,
} from '@/lib/analytics-client-location';

const ANALYTICS_ENDPOINT = '/api/analytics/events';
const MAX_QUEUE_EVENTS = 100;
const MAX_QUEUE_BYTES = 128 * 1024;
const MAX_BATCH_BYTES = 30 * 1024;
const MAX_TITLE_LENGTH = 300;
const MAX_PATH_LENGTH = 500;
const HEARTBEAT_INTERVAL_MS = 30_000;
const MIN_ENGAGEMENT_DURATION_MS = 1_000;
const MAX_INTERACTION_EVENTS_PER_PAGE = 20;
const MAX_CLIENT_ERRORS_PER_RUNTIME = 5;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface StoredSession {
  id: string;
  lastActivityAt: number;
}

interface WebVitalMetric {
  name: string;
  value: number;
  rating?: string;
  navigationType?: string;
}

let volatileQueue: AnalyticsClientEventContract[] = [];
let volatileVisitorId: string | null = null;
let volatileSession: StoredSession | null = null;
let volatileTabId: string | null = null;
let volatileSequence = 0;
let queueStorageDegraded = false;
let queueOverflowReported = false;

function createUuid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function isUuid(value: string | null | undefined): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function safeLocalStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalStorageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // The in-memory queue remains available for this page lifetime.
  }
}

function safeSessionStorageGet(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSessionStorageSet(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Session storage is optional; a fresh in-memory value can still be used.
  }
}

function getOrCreateVisitorId(): string {
  const existing = safeLocalStorageGet(ANALYTICS_STORAGE_KEYS.visitorId);
  if (isUuid(existing)) {
    volatileVisitorId = existing;
    return existing;
  }
  if (isUuid(volatileVisitorId)) return volatileVisitorId;

  const visitorId = createUuid();
  volatileVisitorId = visitorId;
  safeLocalStorageSet(ANALYTICS_STORAGE_KEYS.visitorId, visitorId);
  return visitorId;
}

function parseStoredSession(value: string | null): StoredSession | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<StoredSession>;
    if (
      isUuid(parsed.id) &&
      typeof parsed.lastActivityAt === 'number' &&
      Number.isFinite(parsed.lastActivityAt)
    ) {
      return { id: parsed.id, lastActivityAt: parsed.lastActivityAt };
    }
  } catch {
    // Invalid state is replaced below.
  }
  return null;
}

/**
 * A browser session is renewed after 30 minutes of inactivity. The visitor
 * identifier remains stable until consent is denied/revoked.
 */
export function getOrCreateSessionId(now = Date.now()): string {
  if (typeof window === 'undefined') return '';

  const stored =
    parseStoredSession(safeLocalStorageGet(ANALYTICS_STORAGE_KEYS.session)) ||
    volatileSession;
  const session =
    stored &&
    now - stored.lastActivityAt >= 0 &&
    now - stored.lastActivityAt < ANALYTICS_SESSION_TIMEOUT_MS
      ? { ...stored, lastActivityAt: now }
      : { id: createUuid(), lastActivityAt: now };

  volatileSession = session;
  safeLocalStorageSet(ANALYTICS_STORAGE_KEYS.session, JSON.stringify(session));
  return session.id;
}

function getOrCreateTabId(): string {
  const existing = safeSessionStorageGet(ANALYTICS_STORAGE_KEYS.tabId);
  if (isUuid(existing)) {
    volatileTabId = existing;
    return existing;
  }
  if (isUuid(volatileTabId)) return volatileTabId;

  const tabId = createUuid();
  volatileTabId = tabId;
  safeSessionStorageSet(ANALYTICS_STORAGE_KEYS.tabId, tabId);
  return tabId;
}

function nextSequence(): number {
  const stored = Number.parseInt(
    safeSessionStorageGet(ANALYTICS_STORAGE_KEYS.sequence) || '',
    10,
  );
  const current = Number.isSafeInteger(stored) ? stored : volatileSequence;
  const sequence =
    Number.isSafeInteger(current) && current >= 0 && current < 1_000_000
      ? current + 1
      : 1;
  volatileSequence = sequence;
  safeSessionStorageSet(ANALYTICS_STORAGE_KEYS.sequence, String(sequence));
  return sequence;
}

function readQueue(): AnalyticsClientEventContract[] {
  if (queueStorageDegraded) return [...volatileQueue];

  try {
    const raw = localStorage.getItem(ANALYTICS_STORAGE_KEYS.queue);
    if (!raw) {
      volatileQueue = [];
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...volatileQueue];
    volatileQueue = parsed.filter(
      (event): event is AnalyticsClientEventContract =>
        Boolean(event) &&
        typeof event === 'object' &&
        typeof (event as Partial<AnalyticsClientEventContract>).eventId ===
          'string',
    );
    return [...volatileQueue];
  } catch {
    queueStorageDegraded = true;
    return [...volatileQueue];
  }
}

function trimQueue(
  events: AnalyticsClientEventContract[]
): AnalyticsClientEventContract[] {
  const queue: AnalyticsClientEventContract[] = [];

  // A long offline, visible tab can otherwise fill the durable queue with
  // repetitive 30-second heartbeats. Adjacent heartbeats for the same page
  // and tab are losslessly accumulated up to the server's five-minute bound.
  for (const event of events) {
    const previous = queue[queue.length - 1];
    if (
      previous?.eventType === 'heartbeat' &&
      event.eventType === 'heartbeat' &&
      previous.visitorId === event.visitorId &&
      previous.sessionId === event.sessionId &&
      previous.tabId === event.tabId &&
      previous.path === event.path &&
      previous.durationMs + event.durationMs <= 300_000
    ) {
      queue[queue.length - 1] = {
        ...event,
        durationMs: previous.durationMs + event.durationMs,
      };
      continue;
    }
    queue.push(event);
  }

  const priority = (event: AnalyticsClientEventContract): number => {
    switch (event.eventType) {
      case 'contact_submit':
        return 5;
      case 'page_view':
      case 'consent_update':
        return 4;
      case 'download':
      case 'outbound_click':
        return 3;
      case 'engagement':
        return 2;
      case 'scroll_depth':
      case 'web_vital':
      case 'client_error':
        return 1;
      case 'heartbeat':
        return 0;
    }
  };

  let droppedCount = 0;
  let serializedBytes = new TextEncoder().encode(
    JSON.stringify(queue)
  ).byteLength;
  while (
    queue.length > 0 &&
    (queue.length > MAX_QUEUE_EVENTS || serializedBytes > MAX_QUEUE_BYTES)
  ) {
    let candidateIndex = 0;
    let candidatePriority = priority(queue[0]);
    for (let index = 1; index < queue.length; index += 1) {
      const nextPriority = priority(queue[index]);
      if (nextPriority < candidatePriority) {
        candidateIndex = index;
        candidatePriority = nextPriority;
      }
    }
    queue.splice(candidateIndex, 1);
    droppedCount += 1;
    serializedBytes = new TextEncoder().encode(
      JSON.stringify(queue)
    ).byteLength;
  }

  if (droppedCount > 0 && !queueOverflowReported) {
    queueOverflowReported = true;
    console.warn(
      `[analytics] Offline queue capacity reached; ${droppedCount} low-priority event(s) were dropped.`
    );
  }
  return queue;
}

function writeQueue(events: AnalyticsClientEventContract[]): void {
  const queue = trimQueue(events);
  volatileQueue = queue;
  if (queueStorageDegraded) return;
  try {
    localStorage.setItem(
      ANALYTICS_STORAGE_KEYS.queue,
      JSON.stringify(queue)
    );
  } catch {
    queueStorageDegraded = true;
  }
}

async function withQueueLock<T>(operation: () => T | Promise<T>): Promise<T> {
  if (navigator.locks?.request) {
    return navigator.locks.request('analytics-event-queue-v2', operation);
  }
  return operation();
}

async function enqueue(
  event: AnalyticsClientEventContract,
  shouldEnqueue: () => boolean
): Promise<void> {
  await withQueueLock(() => {
    if (!shouldEnqueue() || !hasGrantedConsent()) return;
    const queue = readQueue();
    if (!queue.some((queued) => queued.eventId === event.eventId)) {
      queue.push(event);
    }
    writeQueue(queue);
  });
}

async function removeFromQueue(eventIds: Set<string>): Promise<void> {
  await withQueueLock(() => {
    writeQueue(
      readQueue().filter((event) => !eventIds.has(event.eventId))
    );
  });
}

function canonicalPath(pathname: string): string {
  let path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  path = path.replace(/\/{2,}/g, '/');
  if (path.length > 1) path = path.replace(/\/+$/, '');
  return path.slice(0, MAX_PATH_LENGTH) || '/';
}

function referrerDomain(): string | undefined {
  if (!document.referrer) return undefined;
  try {
    const hostname = new URL(document.referrer).hostname.toLowerCase();
    return hostname && hostname !== window.location.hostname.toLowerCase()
      ? hostname.slice(0, 253)
      : undefined;
  } catch {
    return undefined;
  }
}

function screenContext(): AnalyticsEventBase['screen'] {
  const width = Math.min(
    10_000,
    Math.max(0, Math.round(window.screen?.width || window.innerWidth || 0)),
  );
  const height = Math.min(
    10_000,
    Math.max(0, Math.round(window.screen?.height || window.innerHeight || 0)),
  );
  let bucket: AnalyticsEventBase['screen']['bucket'] = 'unknown';
  if (width === 0) bucket = 'unknown';
  else if (width < 480) bucket = 'xs';
  else if (width < 640) bucket = 'sm';
  else if (width < 768) bucket = 'md';
  else if (width < 1024) bucket = 'lg';
  else if (width < 1280) bucket = 'xl';
  else if (width >= 1280) bucket = '2xl';
  return { bucket, width, height };
}

function allowedUtmProperties(): AnalyticsUtmProperties | undefined {
  const params = new URLSearchParams(window.location.search);
  const mapping = {
    source: 'utm_source',
    medium: 'utm_medium',
    campaign: 'utm_campaign',
    term: 'utm_term',
    content: 'utm_content',
  } as const;
  const result: AnalyticsUtmProperties = {};

  for (const [key, parameter] of Object.entries(mapping) as Array<
    [
      keyof AnalyticsUtmProperties,
      (typeof mapping)[keyof typeof mapping],
    ]
  >) {
    const value = normalizeAnalyticsCampaignValue(params.get(parameter));
    if (value) result[key] = value;
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function currentTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function hasGrantedConsent(): boolean {
  return readAnalyticsConsent()?.state === 'granted';
}

function currentAnalyticsAuthorizationVersion(): string | null {
  const record = readAnalyticsConsent();
  if (record?.state !== 'granted') return null;
  return analyticsAuthorizationVersion(
    ANALYTICS_CONSENT_POLICY_VERSION,
    record.basis
  );
}

function hasExplicitAnalyticsConsent(): boolean {
  const record = readAnalyticsConsent();
  return record?.state === 'granted' && record.basis === 'consent';
}

function trackGooglePageView(
  event: AnalyticsClientEventContract,
  path: string
): void {
  const safeLocation = new URL(path, window.location.origin);
  const campaignParameters = {
    source: 'utm_source',
    medium: 'utm_medium',
    campaign: 'utm_campaign',
    term: 'utm_term',
    content: 'utm_content',
  } as const;
  Object.entries(campaignParameters).forEach(([key, parameter]) => {
    const value = event.utm?.[key as keyof AnalyticsUtmProperties];
    if (value) safeLocation.searchParams.set(parameter, value);
  });

  const pageView: AnalyticsGaPageView = {
    eventId: event.eventId,
    page_path: path,
    page_title: event.title,
    // Only allowlisted UTM parameters survive; arbitrary query input is never
    // forwarded to GA4.
    page_location: safeLocation.toString(),
  };

  if (window.__analyticsGaReady && window.gtag) {
    const { eventId: _eventId, ...parameters } = pageView;
    window.gtag('event', 'page_view', parameters);
    return;
  }

  const pending = window.__analyticsPendingGaPageViews || [];
  if (!pending.some((item) => item.eventId === pageView.eventId)) {
    pending.push(pageView);
  }
  window.__analyticsPendingGaPageViews = pending.slice(-20);
}

function createBatchPayload(queue: AnalyticsClientEventContract[]): {
  batch: AnalyticsClientEventContract[];
  payload: string;
} {
  const batch: AnalyticsClientEventContract[] = [];
  let payload = '';
  const authorizationVersion = queue[0]?.consentVersion;
  if (!authorizationVersion) return { batch, payload };

  for (const event of queue.slice(0, ANALYTICS_MAX_BATCH_EVENTS)) {
    if (event.consentVersion !== authorizationVersion) break;
    const candidate = JSON.stringify({
      schemaVersion: ANALYTICS_SCHEMA_VERSION,
      consentVersion: authorizationVersion,
      events: [...batch, event],
    });
    if (new TextEncoder().encode(candidate).byteLength > MAX_BATCH_BYTES) break;
    batch.push(event);
    payload = candidate;
  }

  return { batch, payload };
}

function retryAfterMilliseconds(value: string | null): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(
      Math.max(seconds * 1000, 1000),
      5 * 60 * 1000
    );
  }
  const date = Date.parse(value);
  if (!Number.isFinite(date)) return null;
  return Math.min(
    Math.max(date - Date.now(), 1000),
    5 * 60 * 1000
  );
}

export function VisitorTracker({ enabled }: { enabled: boolean }) {
  const pathname = usePathname();
  const lastTrackedPath = useRef('');
  const flushInProgress = useRef(false);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryAttempt = useRef(0);
  const runtimeGeneration = useRef(0);
  const interactionEventCount = useRef(0);
  const interactionCooldowns = useRef(new Map<string, number>());
  const trackedScrollThresholds = useRef(new Set<number>());
  const trackedWebVitals = useRef(new Set<string>());
  const clientErrorCount = useRef(0);
  const browserGeo = useRef<AnalyticsBrowserGeo | null>(null);

  const clearRuntimeState = useCallback(() => {
    runtimeGeneration.current += 1;
    volatileQueue = [];
    volatileVisitorId = null;
    volatileSession = null;
    volatileTabId = null;
    volatileSequence = 0;
    queueStorageDegraded = false;
    retryAttempt.current = 0;
    lastTrackedPath.current = '';
    interactionEventCount.current = 0;
    interactionCooldowns.current.clear();
    trackedScrollThresholds.current.clear();
    trackedWebVitals.current.clear();
    clientErrorCount.current = 0;
    browserGeo.current = null;
    clearAnalyticsBrowserGeo();
    if (retryTimer.current) {
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }
    clearAnalyticsClientState();
  }, []);

  const flushQueue = useCallback(async (useBeacon = false) => {
    if (
      !enabled ||
      !hasGrantedConsent() ||
      flushInProgress.current ||
      (!useBeacon &&
        (navigator.onLine === false ||
          document.visibilityState === 'hidden'))
    ) {
      return;
    }
    const queue = useBeacon
      ? readQueue()
      : await withQueueLock(() => readQueue());
    const { batch, payload } = createBatchPayload(queue);
    if (batch.length === 0) return;

    if (useBeacon && typeof navigator.sendBeacon === 'function') {
      try {
        // Keep the queue: the next successful fetch safely retries these
        // idempotent event IDs if the browser did not deliver the beacon.
        navigator.sendBeacon(
          ANALYTICS_ENDPOINT,
          new Blob([payload], { type: 'application/json' }),
        );
      } catch {
        // A future online/page-view event retries the persisted queue.
      }
      return;
    }

    flushInProgress.current = true;
    let batchResolved = false;
    let retryAfterMs: number | null = null;
    try {
      const response = await fetch(ANALYTICS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Analytics-Schema': String(ANALYTICS_SCHEMA_VERSION),
        },
        body: payload,
        credentials: 'same-origin',
        keepalive: true,
      });

      if (response.ok) {
        const result = (await response.json().catch(() => null)) as {
          success?: boolean;
          data?: {
            acceptedCount?: number;
            duplicateCount?: number;
            rejectedCount?: number;
            filtered?: string;
          };
        } | null;
        const acceptedCount = Number(result?.data?.acceptedCount);
        const duplicateCount = Number(
          result?.data?.duplicateCount ?? 0
        );
        const rejectedCount = Number(
          result?.data?.rejectedCount ?? 0
        );
        const filtered = result?.data?.filtered;
        const intentionalFilter =
          (filtered === 'preview_environment' ||
            filtered === 'verified_bot') &&
          acceptedCount === 0;
        const persistedBatch =
          Number.isSafeInteger(acceptedCount) &&
          acceptedCount >= 0 &&
          Number.isSafeInteger(duplicateCount) &&
          duplicateCount >= 0 &&
          Number.isSafeInteger(rejectedCount) &&
          rejectedCount === 0 &&
          acceptedCount + duplicateCount === batch.length;

        // A generic/proxied 2xx is not proof of durable persistence. Events
        // leave the queue only after the collector's count invariant passes,
        // or after an explicitly enumerated environment/bot filter.
        if (
          result?.success === true &&
          (persistedBatch || intentionalFilter)
        ) {
          await removeFromQueue(
            new Set(batch.map((event) => event.eventId))
          );
          batchResolved = true;
        }
      } else if (response.status === 403) {
        window.dispatchEvent(
          new Event(ANALYTICS_RUNTIME_DISABLED_EVENT)
        );
        await removeFromQueue(
          new Set(batch.map((event) => event.eventId))
        );
        batchResolved = true;
      } else if (response.status === 429) {
        retryAfterMs = retryAfterMilliseconds(
          response.headers.get('retry-after')
        );
      } else if (
        // Permanent validation/auth failures must not poison every future batch.
        response.status >= 400 &&
        response.status < 500 &&
        ![408, 409, 425, 429].includes(response.status)
      ) {
        await removeFromQueue(
          new Set(batch.map((event) => event.eventId))
        );
        batchResolved = true;
      }
    } catch {
      // Offline/network failure: the bounded queue is retried later.
    } finally {
      flushInProgress.current = false;
    }

    if (batchResolved) {
      retryAttempt.current = 0;
      const hasMore = await withQueueLock(
        () => readQueue().length > 0
      );
      if (hasMore) void flushQueue();
      return;
    }

    const hasPendingEvents = await withQueueLock(
      () => readQueue().length > 0
    );
    if (
      enabled &&
      hasPendingEvents &&
      hasGrantedConsent() &&
      navigator.onLine !== false &&
      document.visibilityState === 'visible' &&
      retryTimer.current === null
    ) {
      const exponentialDelay = Math.min(
        60_000,
        5_000 * 2 ** Math.min(retryAttempt.current, 4)
      );
      const jitteredDelay = Math.round(
        exponentialDelay * (0.8 + Math.random() * 0.4)
      );
      const delay = retryAfterMs ?? jitteredDelay;
      retryAttempt.current += 1;
      retryTimer.current = setTimeout(() => {
        retryTimer.current = null;
        void flushQueue();
      }, delay);
    }
  }, [enabled]);

  const emitAnalyticsEvent = useCallback(
    async (
      details: AnalyticsEventDetails,
      pathOverride = canonicalPath(pathname),
      useBeacon = false
    ): Promise<AnalyticsClientEventContract | null> => {
      if (
        typeof window === 'undefined' ||
        !enabled ||
        pathOverride === '/admin' ||
        pathOverride.startsWith('/admin/') ||
        !hasGrantedConsent()
      ) {
        return null;
      }

      const generation = runtimeGeneration.current;
      const identity = await withQueueLock(() => ({
        visitorId: getOrCreateVisitorId(),
        sessionId: getOrCreateSessionId(),
        tabId: getOrCreateTabId(),
        sequence: nextSequence(),
      }));
      if (
        runtimeGeneration.current !== generation ||
        !enabled ||
        !hasGrantedConsent()
      ) {
        return null;
      }

      const authorizationVersion =
        currentAnalyticsAuthorizationVersion();
      if (!authorizationVersion) return null;

      const event = {
        eventId: createUuid(),
        ...identity,
        occurredAt: new Date().toISOString(),
        path: canonicalPath(pathOverride),
        title: (
          document.title || 'Muhammed AKAN | Akademik Portfolyo'
        ).slice(0, MAX_TITLE_LENGTH),
        referrerDomain: referrerDomain(),
        screen: screenContext(),
        language: (navigator.language || 'tr').slice(0, 35),
        timezone: currentTimezone().slice(0, 100),
        consentVersion: authorizationVersion,
        utm: allowedUtmProperties(),
        geo: browserGeo.current || undefined,
        ...details,
      } as AnalyticsClientEventContract;

      if (
        event.eventType === 'page_view' &&
        hasExplicitAnalyticsConsent()
      ) {
        trackGooglePageView(event, event.path);
      }
      await enqueue(
        event,
        () => runtimeGeneration.current === generation && enabled
      );
      if (runtimeGeneration.current === generation && enabled) {
        void flushQueue(useBeacon);
      }
      return event;
    },
    [enabled, flushQueue, pathname]
  );

  const allowInteractionEvent = useCallback(
    (key: string, cooldownMs = 1_000): boolean => {
      if (
        interactionEventCount.current >=
        MAX_INTERACTION_EVENTS_PER_PAGE
      ) {
        return false;
      }

      const now = Date.now();
      const lastOccurredAt = interactionCooldowns.current.get(key) || 0;
      if (now - lastOccurredAt < cooldownMs) return false;
      interactionCooldowns.current.set(key, now);
      interactionEventCount.current += 1;
      return true;
    },
    []
  );

  const trackCurrentPage = useCallback(async () => {
    if (
      typeof window === 'undefined' ||
      !enabled ||
      pathname === '/admin' ||
      pathname.startsWith('/admin/') ||
      !hasGrantedConsent()
    ) {
      if (
        !enabled ||
        pathname === '/admin' ||
        pathname.startsWith('/admin/') ||
        !hasGrantedConsent()
      ) {
        clearRuntimeState();
      }
      return;
    }

    const path = canonicalPath(pathname);
    if (lastTrackedPath.current === path) return;
    const grantedGeo = await getGrantedAnalyticsBrowserGeo();
    if (grantedGeo) browserGeo.current = grantedGeo;
    lastTrackedPath.current = path;
    const event = await emitAnalyticsEvent(
      { eventType: 'page_view' },
      path
    );
    if (!event) {
      lastTrackedPath.current = '';
    }
  }, [clearRuntimeState, emitAnalyticsEvent, enabled, pathname]);

  const reportWebVital = useCallback(
    (metric: WebVitalMetric) => {
      if (
        !enabled ||
        !hasGrantedConsent() ||
        !ANALYTICS_WEB_VITAL_NAMES.includes(
          metric.name as AnalyticsWebVitalName
        )
      ) {
        return;
      }

      const value = normalizeAnalyticsWebVitalValue(
        metric.name,
        metric.value
      );
      const path = canonicalPath(pathname);
      const dedupeKey = `${path}:${metric.name}`;
      if (value === null || trackedWebVitals.current.has(dedupeKey)) {
        return;
      }
      trackedWebVitals.current.add(dedupeKey);

      const metricName = metric.name as AnalyticsWebVitalName;
      void emitAnalyticsEvent(
        {
          eventType: 'web_vital',
          contentType: 'web_vital',
          contentKey: metricName,
          durationMs: value,
          properties: {
            metric_name: metricName,
            rating: normalizeAnalyticsWebVitalRating(metric.rating),
            navigation_type: normalizeAnalyticsNavigationType(
              metric.navigationType
            ),
          },
        },
        path
      );
    },
    [emitAnalyticsEvent, enabled, pathname]
  );

  useReportWebVitals(reportWebVital);

  useEffect(() => {
    if (!enabled) {
      clearRuntimeState();
      return;
    }

    interactionEventCount.current = 0;
    interactionCooldowns.current.clear();
    trackedScrollThresholds.current.clear();
    trackedWebVitals.current.clear();
    void trackCurrentPage();

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        lastTrackedPath.current = '';
        void trackCurrentPage();
      }
    };
    const handleOnline = () => void flushQueue();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void flushQueue();
    };
    const handlePageHide = () => void flushQueue(true);
    const handleConsent = (event: Event) => {
      const detail = (event as CustomEvent<AnalyticsConsentChangeDetail>).detail;
      if (detail?.state === 'granted' && enabled) {
        void trackCurrentPage();
      } else {
        clearRuntimeState();
      }
    };
    const handleLocationUpdate = (event: Event) => {
      const geo = (event as CustomEvent<AnalyticsBrowserGeo>).detail;
      if (
        !enabled ||
        !hasGrantedConsent() ||
        geo?.source !== 'browser-geolocation'
      ) {
        return;
      }
      browserGeo.current = geo;
      void emitAnalyticsEvent({
        eventType: 'consent_update',
        contentType: 'privacy_preference',
        contentKey: 'coarse_location',
      });
    };

    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('online', handleOnline);
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener(ANALYTICS_CONSENT_EVENT, handleConsent);
    window.addEventListener(
      ANALYTICS_LOCATION_UPDATED_EVENT,
      handleLocationUpdate
    );

    return () => {
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener(
        'visibilitychange',
        handleVisibility
      );
      window.removeEventListener(ANALYTICS_CONSENT_EVENT, handleConsent);
      window.removeEventListener(
        ANALYTICS_LOCATION_UPDATED_EVENT,
        handleLocationUpdate
      );
    };
  }, [
    clearRuntimeState,
    emitAnalyticsEvent,
    enabled,
    flushQueue,
    trackCurrentPage,
  ]);

  useEffect(() => {
    if (
      !enabled ||
      pathname === '/admin' ||
      pathname.startsWith('/admin/')
    ) {
      return;
    }

    const path = canonicalPath(pathname);
    const contentKey = path.slice(0, 200);
    let scrollFrame: number | null = null;

    const measureScrollDepth = () => {
      scrollFrame = null;
      if (
        document.visibilityState !== 'visible' ||
        !hasGrantedConsent()
      ) {
        return;
      }

      const root = document.documentElement;
      const documentHeight = Math.max(
        root.scrollHeight,
        document.body?.scrollHeight || 0
      );
      const viewportBottom = window.scrollY + window.innerHeight;
      const percent =
        documentHeight <= window.innerHeight
          ? 100
          : Math.min(
              100,
              Math.max(
                0,
                Math.round((viewportBottom / documentHeight) * 100)
              )
            );

      for (const threshold of ANALYTICS_SCROLL_THRESHOLDS) {
        if (
          percent >= threshold &&
          !trackedScrollThresholds.current.has(threshold)
        ) {
          trackedScrollThresholds.current.add(threshold);
          void emitAnalyticsEvent(
            {
              eventType: 'scroll_depth',
              contentType: 'page',
              contentKey,
              scrollPercent: threshold,
            },
            path
          );
        }
      }
    };

    const handleScroll = () => {
      if (scrollFrame === null) {
        scrollFrame = window.requestAnimationFrame(measureScrollDepth);
      }
    };

    const handleClick = (event: MouseEvent) => {
      const target =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>('a[href]')
          : null;
      if (!target || !hasGrantedConsent()) return;

      const href = target.getAttribute('href') || '';
      const download = getSafeAnalyticsDownload(
        href,
        window.location.href
      );
      if (
        download &&
        allowInteractionEvent(
          `download:${download.path}:${download.extension}`
        )
      ) {
        void emitAnalyticsEvent(
          {
            eventType: 'download',
            contentType: 'download',
            contentKey: download.path,
            properties: {
              file_extension: download.extension,
            },
          },
          path
        );
        return;
      }

      const hostname = normalizeAnalyticsOutboundHostname(
        href,
        window.location.href
      );
      if (
        hostname &&
        allowInteractionEvent(`outbound:${hostname}`)
      ) {
        void emitAnalyticsEvent(
          {
            eventType: 'outbound_click',
            contentType: 'outbound_host',
            contentKey: hostname,
          },
          path
        );
      }
    };

    const handleTrackedEvent = (event: Event) => {
      const detail = (
        event as CustomEvent<AnalyticsTrackEventDetail>
      ).detail;
      if (
        detail?.eventType !== 'contact_submit' ||
        detail.contentType !== 'form' ||
        detail.contentKey !== 'contact_form' ||
        !allowInteractionEvent('contact_submit:contact_form', 5_000)
      ) {
        return;
      }
      void emitAnalyticsEvent(detail, path);
    };
    const handleInteractionConsent = (event: Event) => {
      const detail = (
        event as CustomEvent<AnalyticsConsentChangeDetail>
      ).detail;
      if (detail?.state === 'granted') handleScroll();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('click', handleClick);
    window.addEventListener(ANALYTICS_TRACK_EVENT, handleTrackedEvent);
    window.addEventListener(
      ANALYTICS_CONSENT_EVENT,
      handleInteractionConsent
    );
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('click', handleClick);
      window.removeEventListener(
        ANALYTICS_TRACK_EVENT,
        handleTrackedEvent
      );
      window.removeEventListener(
        ANALYTICS_CONSENT_EVENT,
        handleInteractionConsent
      );
      if (scrollFrame !== null) {
        window.cancelAnimationFrame(scrollFrame);
      }
    };
  }, [
    allowInteractionEvent,
    emitAnalyticsEvent,
    enabled,
    pathname,
  ]);

  useEffect(() => {
    if (
      !enabled ||
      pathname === '/admin' ||
      pathname.startsWith('/admin/')
    ) {
      return;
    }

    const path = canonicalPath(pathname);
    let visibleSince =
      document.visibilityState === 'visible' &&
      hasGrantedConsent()
        ? Date.now()
        : null;

    const emitVisibleDuration = async (
      eventType: 'heartbeat' | 'engagement',
      useBeacon = false
    ) => {
      if (visibleSince === null || !hasGrantedConsent()) return;
      const now = Date.now();
      const durationMs = Math.min(
        300_000,
        Math.max(0, Math.round(now - visibleSince))
      );
      visibleSince =
        document.visibilityState === 'visible' ? now : null;
      if (durationMs < MIN_ENGAGEMENT_DURATION_MS) return;
      await emitAnalyticsEvent(
        { eventType, durationMs },
        path,
        useBeacon
      );
    };

    const heartbeatTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void emitVisibleDuration('heartbeat');
      }
    }, HEARTBEAT_INTERVAL_MS);

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        void emitVisibleDuration('engagement', true);
      } else if (hasGrantedConsent()) {
        visibleSince = Date.now();
      }
    };
    const handlePageHide = () => {
      void emitVisibleDuration('engagement', true);
    };
    const handleConsent = (event: Event) => {
      const detail = (
        event as CustomEvent<AnalyticsConsentChangeDetail>
      ).detail;
      visibleSince =
        detail?.state === 'granted' &&
        document.visibilityState === 'visible'
          ? Date.now()
          : null;
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener(ANALYTICS_CONSENT_EVENT, handleConsent);

    return () => {
      window.clearInterval(heartbeatTimer);
      document.removeEventListener(
        'visibilitychange',
        handleVisibility
      );
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener(
        ANALYTICS_CONSENT_EVENT,
        handleConsent
      );
      if (visibleSince !== null && hasGrantedConsent()) {
        void emitVisibleDuration('engagement', true);
      }
    };
  }, [emitAnalyticsEvent, enabled, pathname]);

  useEffect(() => {
    if (
      !enabled ||
      pathname === '/admin' ||
      pathname.startsWith('/admin/')
    ) {
      return;
    }

    const path = canonicalPath(pathname);
    const emitClientError = (
      source: 'window_error' | 'unhandled_rejection',
      name: string | undefined,
      isNonErrorRejection = false
    ) => {
      if (
        !hasGrantedConsent() ||
        clientErrorCount.current >= MAX_CLIENT_ERRORS_PER_RUNTIME
      ) {
        return;
      }
      clientErrorCount.current += 1;
      const errorName = normalizeAnalyticsClientErrorName(
        name,
        isNonErrorRejection
      );
      void emitAnalyticsEvent(
        {
          eventType: 'client_error',
          contentType: 'client_error',
          contentKey: source,
          properties: {
            error_name: errorName,
            error_source: source,
          },
        },
        path
      );
    };

    const handleError = (event: ErrorEvent) => {
      const errorName =
        event.error instanceof Error ? event.error.name : undefined;
      emitClientError('window_error', errorName);
    };
    const handleUnhandledRejection = (
      event: PromiseRejectionEvent
    ) => {
      const isError = event.reason instanceof Error;
      emitClientError(
        'unhandled_rejection',
        isError ? event.reason.name : undefined,
        !isError
      );
    };

    window.addEventListener('error', handleError);
    window.addEventListener(
      'unhandledrejection',
      handleUnhandledRejection
    );
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener(
        'unhandledrejection',
        handleUnhandledRejection
      );
    };
  }, [emitAnalyticsEvent, enabled, pathname]);

  return null;
}
