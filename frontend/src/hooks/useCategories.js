import { useCallback, useEffect, useState } from 'react';
import { fetchCategories } from '../lib/api';

// In-memory session cache so Navbar / Footer / Categories / Shop all share one fetch
// (rather than each component hitting /api/categories on mount).
let CACHE = null;
let INFLIGHT = null;
let LAST_ERROR = false;
const SUBSCRIBERS = new Set();

const load = () => {
  if (CACHE && !LAST_ERROR) return Promise.resolve({ items: CACHE, error: false });
  if (INFLIGHT) return INFLIGHT;
  INFLIGHT = fetchCategories()
    .then(list => {
      CACHE = (list || []).map(c => ({ ...c, comingSoon: c.coming_soon }));
      LAST_ERROR = false;
      SUBSCRIBERS.forEach(fn => fn({ items: CACHE, error: false }));
      return { items: CACHE, error: false };
    })
    .catch(() => {
      // Keep whatever we had cached (if any) so the storefront doesn't flash
      // empty on a brief network blip. Mark as errored so the retry button
      // surfaces to the shopper.
      CACHE = CACHE || [];
      LAST_ERROR = true;
      SUBSCRIBERS.forEach(fn => fn({ items: CACHE, error: true }));
      return { items: CACHE, error: true };
    })
    .finally(() => { INFLIGHT = null; });
  return INFLIGHT;
};

/** Invalidate the cache after an admin edit so the next mount refetches fresh data. */
export const invalidateCategories = () => { CACHE = null; LAST_ERROR = false; };

/**
 * Categories, loaded once per session from /api/categories. Every component that
 * needs the category list should use this hook — never import from mock.
 * Returns { items, loading, error, retry }. Items are already normalized (comingSoon alias).
 */
export const useCategories = () => {
  const [items, setItems] = useState(CACHE || []);
  const [loading, setLoading] = useState(!CACHE);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    const handler = (next) => { if (mounted) { setItems(next.items); setError(next.error); setLoading(false); } };
    SUBSCRIBERS.add(handler);
    load().then(({ items: list, error: err }) => {
      if (mounted) { setItems(list); setError(err); setLoading(false); }
    });
    return () => { mounted = false; SUBSCRIBERS.delete(handler); };
  }, []);

  const retry = useCallback(() => {
    LAST_ERROR = false;
    CACHE = null;
    setLoading(true);
    setError(false);
    load();
  }, []);

  return { items, loading, error, retry };
};
