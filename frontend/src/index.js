import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/index.css";
import App from "@/App";
import { isInAppBrowser } from "@/lib/inAppBrowser";

// Prevent the browser from restoring the previous scroll position on load,
// which can briefly show a lower section (e.g. About Story) before our own
// scroll-to-top runs on first mount. Safari also caches scroll position via
// its back-forward cache, so we hard-reset it here and reset again inside
// ScrollToTop's pageshow listener.
//
// IMPORTANT: Instagram, Facebook & other in-app WebViews reacted badly to
// this override — the page would freeze mid-scroll on the About section and
// tapping was blocked. Skip the override inside those environments so the
// native WebView scrolling stays intact.
if (typeof window !== 'undefined' && !isInAppBrowser()) {
  if ('scrollRestoration' in window.history) {
    try { window.history.scrollRestoration = 'manual'; } catch (_e) { /* noop */ }
  }
  try { window.scrollTo(0, 0); } catch (_e) { /* noop */ }
}

// Runtime preconnect: warm up the TCP+TLS handshake to origins we know we'll
// hit inside the first few hundred ms. Both the API host (from
// REACT_APP_BACKEND_URL) and the CloudFront image CDN (fetched lazily from
// /api/settings/public) are env-dependent, so we inject their <link> tags
// here rather than hard-coding them in index.html.
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const _preconnect = (href, crossOrigin = true) => {
    if (!href) return;
    try {
      const url = new URL(href, window.location.origin);
      const origin = url.origin;
      if (origin === window.location.origin) return; // same-origin, no benefit
      if (document.head.querySelector(`link[data-preconnect="${origin}"]`)) return;
      const pre = document.createElement('link');
      pre.rel = 'preconnect';
      pre.href = origin;
      if (crossOrigin) pre.crossOrigin = 'anonymous';
      pre.setAttribute('data-preconnect', origin);
      document.head.appendChild(pre);
      const dns = document.createElement('link');
      dns.rel = 'dns-prefetch';
      dns.href = origin;
      document.head.appendChild(dns);
    } catch (_e) { /* noop */ }
  };

  const backendUrl = process.env.REACT_APP_BACKEND_URL;
  _preconnect(backendUrl);
  // Fetch the CloudFront domain from public settings and warm that too.
  // We do this via a plain fetch (no axios) so it fires before the React
  // bundle is fully hydrated.
  if (backendUrl) {
    fetch(`${backendUrl}/api/settings/public`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(s => {
        const cdn = s?.image_cdn?.cloudfront || s?.image_cdn?.url;
        if (cdn) _preconnect(cdn);
      })
      .catch(() => { /* silent — dev only */ });
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
