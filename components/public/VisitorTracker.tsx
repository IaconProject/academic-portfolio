'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function VisitorTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return;

    // Throttle logging per page change / session to avoid spamming
    const sessionKey = `visitor_log_session_${pathname}`;
    const lastLogged = sessionStorage.getItem(sessionKey);
    const now = Date.now();

    // If logged within last 10 minutes for this route, skip
    if (lastLogged && now - parseInt(lastLogged, 10) < 10 * 60 * 1000) {
      return;
    }

    try {
      sessionStorage.setItem(sessionKey, now.toString());

      const payload = {
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        language: navigator.language || '',
        pagePath: pathname || '/',
        referrer: document.referrer || 'Direkt Giriş',
        userAgent: navigator.userAgent,
      };

      fetch('/api/visitors/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch((err) => {
        console.warn('Visitor tracking request error:', err);
      });
    } catch (e) {
      console.warn('Visitor tracker error:', e);
    }
  }, [pathname]);

  return null;
}
