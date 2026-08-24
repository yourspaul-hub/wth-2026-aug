import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackEvent } from '../lib/api';

const SESSION_KEY = 'wth_session_id';

/** Persist a lightweight session id per tab so backend can compute
 *  entry / exit pages, bounce rate and pages per session. */
const _getSessionId = () => {
  if (typeof window === 'undefined') return null;
  try {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch (_e) {
    return null;
  }
};

// Fires a single analytics page_view per route change. React.StrictMode
// double-mounts effects in dev — the `lastPathRef` guard makes sure we
// don't send the same session+path twice in a row, which would otherwise
// inflate page_views and hide bounces in the analytics dashboard.
const AnalyticsTracker = () => {
  const location = useLocation();
  const lastPathRef = useRef(null);
  useEffect(() => {
    if (location.pathname.startsWith('/admin')) return;
    const full = location.pathname + location.search;
    if (lastPathRef.current === full) return;
    lastPathRef.current = full;
    trackEvent({
      name: 'page_view',
      path: full,
      referrer: document.referrer || null,
      session_id: _getSessionId(),
    });
  }, [location.pathname, location.search]);
  return null;
};

export default AnalyticsTracker;
