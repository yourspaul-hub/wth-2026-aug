import { useLayoutEffect, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Force an INSTANT scroll to the top on every route change and on Safari
 * bfcache restore (pageshow). We temporarily override `scroll-behavior`
 * so the global `html { scroll-behavior: smooth }` doesn't animate the
 * reset — otherwise the visitor briefly sees mid-page sections during the
 * animation.
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

const ScrollToTop = () => {
  const { pathname, hash } = useLocation();
  useLayoutEffect(() => {
    if (hash) return;
    _hardScrollTop();
  }, [pathname, hash]);

  useEffect(() => {
    const onShow = () => { if (!window.location.hash) _hardScrollTop(); };
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
  }, []);
  return null;
};

export default ScrollToTop;
