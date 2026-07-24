'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

function getGpuRenderer(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
      }
    }
  } catch (e) {
    // WebGL not available or blocked
  }
  return '';
}

export function VisitorTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return;

    // Do not log admin dashboard visits to avoid cluttering public traffic stats
    if (pathname && pathname.startsWith('/admin')) return;

    // Throttle logging slightly per session (30 seconds)
    const sessionKey = `visitor_log_session_${pathname}`;
    const lastLogged = sessionStorage.getItem(sessionKey);
    const now = Date.now();

    if (lastLogged && now - parseInt(lastLogged, 10) < 30 * 1000) {
      return;
    }

    const sendLog = async () => {
      try {
        sessionStorage.setItem(sessionKey, now.toString());

        let clientHintModel = '';
        let clientHintPlatform = '';
        
        // Extract High Entropy Client Hints if available (Chrome / Android / Chromium)
        const uaData = (navigator as any).userAgentData;
        if (uaData && typeof uaData.getHighEntropyValues === 'function') {
          try {
            const hints = await uaData.getHighEntropyValues(['model', 'platform', 'platformVersion']);
            if (hints.model) clientHintModel = hints.model;
            if (hints.platform) clientHintPlatform = hints.platform;
          } catch (e) {
            // Ignore
          }
        }

        const nav = navigator as any;
        const connectionType = nav.connection?.effectiveType || nav.connection?.type || '';
        const isMobileConnection = nav.connection?.type === 'cellular' || nav.connection?.saveData === true;

        const payload = {
          screenResolution: `${window.screen.width}x${window.screen.height}`,
          viewportSize: `${window.innerWidth}x${window.innerHeight}`,
          devicePixelRatio: window.devicePixelRatio || 1,
          gpuRenderer: getGpuRenderer(),
          platform: navigator.platform || '',
          maxTouchPoints: navigator.maxTouchPoints || 0,
          connectionType,
          isMobileConnection,
          clientHintModel,
          clientHintPlatform,
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
    };

    sendLog();
  }, [pathname]);

  return null;
}
