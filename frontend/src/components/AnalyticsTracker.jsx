import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { trackEvent, fetchPublicSettings } from '../lib/api';

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

const loadScript = (src) => {
  const s = document.createElement('script');
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
};

// Inject GA4 + Meta Pixel once, using IDs saved in Admin → Integrations.
const installTags = ({ ga4_id, fb_pixel_id }) => {
  if (ga4_id && !window.gtag) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', ga4_id, { send_page_view: false });
    loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4_id)}`);
  }
  if (fb_pixel_id && !window.fbq) {
    const fbq = function fbq() { fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments); };
    fbq.push = fbq; fbq.loaded = true; fbq.version = '2.0'; fbq.queue = [];
    window.fbq = fbq; window._fbq = fbq;
    loadScript('https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', fb_pixel_id);
  }
};

// Fires a single analytics page_view per route change (store DB + GA4 + Pixel).
const AnalyticsTracker = () => {
  const location = useLocation();
  const lastPathRef = useRef(null);
  const [tags, setTags] = useState(null);

  useEffect(() => {
    fetchPublicSettings()
      .then(r => { const t = r?.tracking || {}; installTags(t); setTags(t); })
      .catch(() => setTags({}));
  }, []);

  useEffect(() => {
    if (!tags || location.pathname.startsWith('/admin')) return;
    const full = location.pathname + location.search;
    if (lastPathRef.current === full) return;
    lastPathRef.current = full;
    trackEvent({
      name: 'page_view',
      path: full,
      referrer: document.referrer || null,
      session_id: _getSessionId(),
    });
    if (tags.ga4_id && window.gtag) window.gtag('event', 'page_view', { page_path: full, page_location: window.location.href, page_title: document.title });
    if (tags.fb_pixel_id && window.fbq) window.fbq('track', 'PageView');
  }, [location.pathname, location.search, tags]);
  return null;
};

export default AnalyticsTracker;
