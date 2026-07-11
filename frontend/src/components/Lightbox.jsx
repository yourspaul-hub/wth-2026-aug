import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { api } from '../lib/api';

const BACKEND = process.env.REACT_APP_BACKEND_URL || '';
const resolveSrc = (u) => (u && u.startsWith('/api/') ? `${BACKEND}${u}` : u);
const STORAGE_KEY = 'wth_lightbox_dismissed';

/**
 * Homepage lightbox — desktop-only promotional overlay controlled from
 * Admin → Lightbox. Fetches `/api/settings/public.lightbox`; renders only
 * when enabled + image is set + viewport width ≥ 1024px + not previously
 * dismissed at the current admin `version`.
 */
const Lightbox = () => {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (typeof window === 'undefined') return undefined;
    if (window.innerWidth < 1024) return undefined; // desktop only

    api.get('/settings/public').then(r => {
      if (!mounted) return;
      const lb = r.data?.lightbox;
      if (!lb || !lb.enabled || !lb.image) return;

      // Respect the "show once per version" preference
      if (lb.show_once) {
        let dismissed = '';
        try { dismissed = localStorage.getItem(STORAGE_KEY) || ''; } catch { /* noop */ }
        if (dismissed && dismissed === String(lb.version)) return;
      }
      setData(lb);
      // Small delay so the visitor sees the page first, then the overlay fades in
      setTimeout(() => { if (mounted) setOpen(true); }, 900);
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') dismiss(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open]);

  const dismiss = () => {
    setOpen(false);
    if (data?.show_once && data?.version) {
      try { localStorage.setItem(STORAGE_KEY, String(data.version)); } catch { /* noop */ }
    }
  };

  if (!data || !open) return null;

  const hasCta = data.cta_label && data.cta_href;
  const isExternal = hasCta && /^https?:/i.test(data.cta_href);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center px-6"
      role="dialog"
      aria-modal="true"
      aria-label={data.heading || 'Announcement'}
      data-testid="homepage-lightbox"
    >
      {/* Backdrop */}
      <div
        onClick={dismiss}
        className="absolute inset-0 bg-[#213a60]/70 backdrop-blur-sm animate-fade-in"
        data-testid="homepage-lightbox-backdrop"
      />

      <div className="relative w-full max-w-2xl bg-white rounded-2xl overflow-hidden shadow-2xl border border-white/40 animate-fade-up">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          data-testid="homepage-lightbox-close"
          className="absolute top-3 right-3 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/95 hover:bg-[#213a60] hover:text-white text-[#213a60] shadow-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="bg-[#FDF3EB]">
          <img
            src={resolveSrc(data.image)}
            alt={data.heading || 'Announcement'}
            className="w-full h-auto max-h-[62vh] object-cover"
            data-testid="homepage-lightbox-image"
          />
        </div>

        {(data.heading || data.subtitle || hasCta) && (
          <div className="p-8 md:p-10 text-center">
            {data.heading && (
              <h2 className="font-serif-display text-3xl md:text-4xl text-[#213a60] leading-tight" data-testid="homepage-lightbox-heading">{data.heading}</h2>
            )}
            {data.subtitle && (
              <p className="mt-3 text-neutral-600 text-sm md:text-base max-w-lg mx-auto leading-relaxed" data-testid="homepage-lightbox-subtitle">{data.subtitle}</p>
            )}
            {hasCta && (
              <div className="mt-6">
                {isExternal ? (
                  <a
                    href={data.cta_href}
                    target="_blank"
                    rel="noreferrer"
                    onClick={dismiss}
                    data-testid="homepage-lightbox-cta"
                    className="inline-flex items-center gap-2 bg-[#213a60] hover:bg-[#B4593F] transition-colors text-white px-8 py-3.5 rounded-full text-xs uppercase tracking-[0.25em]"
                  >
                    {data.cta_label}
                  </a>
                ) : (
                  <Link
                    to={data.cta_href}
                    onClick={dismiss}
                    data-testid="homepage-lightbox-cta"
                    className="inline-flex items-center gap-2 bg-[#213a60] hover:bg-[#B4593F] transition-colors text-white px-8 py-3.5 rounded-full text-xs uppercase tracking-[0.25em]"
                  >
                    {data.cta_label}
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Lightbox;
