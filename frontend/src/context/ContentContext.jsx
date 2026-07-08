import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { CONTENT_DEFAULTS } from '../lib/contentRegistry';

const ContentContext = createContext(null);

/**
 * Site-wide editable text. Loads DB overrides from /api/content once at mount,
 * and merges them on top of CONTENT_DEFAULTS.
 * Consumers use `useContentText(key, fallback?)` to read text by slug.
 */
export const ContentProvider = ({ children }) => {
  const [overrides, setOverrides] = useState({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.get('/content')
      .then(r => { if (!cancelled) setOverrides(r.data?.items || {}); })
      .catch(() => { /* keep defaults */ })
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  // Live-refresh signal, dispatched from the admin Design tab after saves.
  useEffect(() => {
    const onSaved = (e) => {
      const patch = (e && e.detail) || {};
      setOverrides(prev => ({ ...prev, ...patch }));
    };
    window.addEventListener('wth:content-saved', onSaved);
    return () => window.removeEventListener('wth:content-saved', onSaved);
  }, []);

  const get = useCallback((key, fallback = '') => {
    if (Object.prototype.hasOwnProperty.call(overrides, key) && overrides[key] !== '') return overrides[key];
    if (Object.prototype.hasOwnProperty.call(CONTENT_DEFAULTS, key)) return CONTENT_DEFAULTS[key];
    return fallback;
  }, [overrides]);

  const value = useMemo(() => ({ get, overrides, loaded }), [get, overrides, loaded]);
  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
};

export const useContent = () => {
  const ctx = useContext(ContentContext);
  if (!ctx) throw new Error('useContent must be used within ContentProvider');
  return ctx;
};

/** Convenience hook: returns a resolved string. */
export const useContentText = (key, fallback = '') => {
  const { get } = useContent();
  return get(key, fallback);
};
