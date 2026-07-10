import { useEffect, useState } from 'react';
import { fetchCategories } from '../lib/api';

// In-memory session cache so Navbar / Footer / Categories / Shop all share one fetch
// (rather than each component hitting /api/categories on mount).
let CACHE = null;
let INFLIGHT = null;
const SUBSCRIBERS = new Set();

const load = () => {
  if (CACHE) return Promise.resolve(CACHE);
  if (INFLIGHT) return INFLIGHT;
  INFLIGHT = fetchCategories()
    .then(list => {
      CACHE = (list || []).map(c => ({ ...c, comingSoon: c.coming_soon }));
      SUBSCRIBERS.forEach(fn => fn(CACHE));
      return CACHE;
    })
    .catch(() => {
      CACHE = [];
      SUBSCRIBERS.forEach(fn => fn(CACHE));
      return CACHE;
    })
    .finally(() => { INFLIGHT = null; });
  return INFLIGHT;
};

/** Invalidate the cache after an admin edit so the next mount refetches fresh data. */
export const invalidateCategories = () => { CACHE = null; };

/**
 * Categories, loaded once per session from /api/categories. Every component that
 * needs the category list should use this hook — never import from mock.
 * Returns { items, loading }. Items are already normalized (comingSoon alias).
 */
export const useCategories = () => {
  const [items, setItems] = useState(CACHE || []);
  const [loading, setLoading] = useState(!CACHE);

  useEffect(() => {
    let mounted = true;
    const handler = (next) => { if (mounted) { setItems(next); setLoading(false); } };
    SUBSCRIBERS.add(handler);
    load().then(list => { if (mounted) { setItems(list); setLoading(false); } });
    return () => { mounted = false; SUBSCRIBERS.delete(handler); };
  }, []);

  return { items, loading };
};
