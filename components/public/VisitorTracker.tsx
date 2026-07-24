'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function VisitorTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return;

    // Do not log admin dashboard visits to avoid cluttering public traffic stats
    if (pathname && pathname.startsWith('/admin')) return;

    // Throttle logging slightly per session (60 seconds) to avoid duplicate spam on re-renders
    const sessionKey = `visitor_log_session_${pathname}`;
    const lastLogged = sessionStorage.getItem(sessionKey);
    const now = Date.now();

    if (lastLogged && now - parseInt(lastLogged, 10) < 60 * 1000) {
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
