import { useLayoutEffect, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { isInAppBrowser } from '../lib/inAppBrowser';

/**
 * Force an INSTANT scroll to the top on every route change and on Safari
 * bfcache restore (pageshow). We temporarily override `scroll-behavior`
 * so the global `html { scroll-behavior: smooth }` doesn't animate the
 * reset — otherwise the visitor briefly sees mid-page sections during the
 * animation.
 *
 * We do NOT run any of this inside embedded WebViews (Instagram, Facebook,
 * etc.) — those environments reacted badly to programmatic scroll
 * overrides, which caused the site to appear frozen on the About section
 * with buttons unresponsive.
 */
const _hardScrollTop = () => {
  if (typeof window === 'undefined') return;
  const html = document.documentElement;
  const body = document.body;
  const prevHtml = html.style.scrollBehavior;
  const prevBody = body.style.scrollBehavior;
  html.style.scrollBehavior = 'auto';
  body.style.scrollBehavior = 'auto';
  window.scrollTo(0, 0);
  html.scrollTop = 0;
  body.scrollTop = 0;
  // Restore next tick so intentional in-page smooth-scrolls still work.
  requestAnimationFrame(() => {
    html.style.scrollBehavior = prevHtml;
    body.style.scrollBehavior = prevBody;
  });
};

const _simpleScrollTop = () => {
  if (typeof window === 'undefined') return;
  try { window.scrollTo(0, 0); } catch (_e) { /* noop */ }
};

const ScrollToTop = () => {
  const { pathname, hash } = useLocation();
  const embedded = typeof window !== 'undefined' && isInAppBrowser();

  useLayoutEffect(() => {
    if (hash) return;
    if (embedded) {
      // Use a gentle scroll only — no style overrides — inside IG / FB WebViews.
      _simpleScrollTop();
      return;
    }
    _hardScrollTop();
  }, [pathname, hash, embedded]);

  useEffect(() => {
    if (embedded) return undefined;
    const onShow = () => { if (!window.location.hash) _hardScrollTop(); };
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
  }, [embedded]);
  return null;
};

export default ScrollToTop;
