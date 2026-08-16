import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/index.css";
import App from "@/App";

// Prevent the browser from restoring the previous scroll position on load,
// which can briefly show a lower section (e.g. About Story) before our own
// scroll-to-top runs on first mount. Safari also caches scroll position via
// its back-forward cache, so we hard-reset it here and reset again inside
// ScrollToTop's pageshow listener.
if (typeof window !== 'undefined') {
  if ('scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual';
  }
  try { window.scrollTo(0, 0); } catch (_e) { /* noop */ }
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
