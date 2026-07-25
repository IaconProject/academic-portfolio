'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let s = localStorage.getItem('tracker_session_id');
    if (!s) {
      s = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      localStorage.setItem('tracker_session_id', s);
    }
    return s;
  } catch (e) {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }
}

function getGpuRenderer(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        return (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
      }
    }
  } catch (e) {}
  return '';
}

/**
 * Send tracking payload with retry logic.
 * Falls back to navigator.sendBeacon if fetch fails (useful on mobile page unload).
 */
async function sendTrackingData(payload: Record<string, unknown>, retries = 2): Promise<void> {
  const url = '/api/app-sync';
  const bodyStr = JSON.stringify(payload);

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: bodyStr,
        keepalive: true,
      });

      if (res.ok) return; // Success

      // If server error (5xx), retry after a brief delay
      if (res.status >= 500 && attempt < retries) {
        await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
        continue;
      }

      return; // Client error (4xx) — don't retry
    } catch (e) {
      // Network failure — try sendBeacon as last resort on final attempt
      if (attempt === retries) {
        try {
          if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
            navigator.sendBeacon(url, new Blob([bodyStr], { type: 'application/json' }));
          }
        } catch (beaconErr) {
          // Silently fail — tracking should never break the user experience
        }
        return;
      }
      // Wait before retry
      await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
    }
  }
}

export function VisitorTracker() {
  const pathname = usePathname();
  const lastTrackedPath = useRef<string>('');

  useEffect(() => {
    const trackCurrentPage = () => {
      if (typeof window === 'undefined') return;

      // Admin panele yapılan ziyaretleri takip etme (login hariç)
      if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
        return;
      }

      const currentPath = `${pathname}${window.location.hash || ''}`;
      if (lastTrackedPath.current === currentPath) return;
      lastTrackedPath.current = currentPath;

      const sessionId = getOrCreateSessionId();
      const screenResolution = `${window.screen?.width || 0}x${window.screen?.height || 0}`;
      const gpuRenderer = getGpuRenderer();
      const pageTitle = document.title || 'Muhammed AKAN | Akademik Portfolyo';

      const payload = {
        sessionId,
        path: currentPath || '/',
        title: pageTitle,
        screenResolution,
        gpuRenderer,
        referrer: document.referrer || '',
      };

      sendTrackingData(payload);
    };

    // Track on route mount
    trackCurrentPage();

    // Track hash navigation
    const handleHashChange = () => trackCurrentPage();
    window.addEventListener('hashchange', handleHashChange);

    // Track when restoring from back/forward cache (common on mobile)
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        lastTrackedPath.current = ''; // Reset to ensure it tracks
        trackCurrentPage();
      }
    };
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [pathname]);

  return null;
}
