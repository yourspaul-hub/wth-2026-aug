import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { imgProps, preloadHref } from '../lib/imgSrc';
import { Helmet } from 'react-helmet-async';
import { useContent } from '../context/ContentContext';
import { fetchHeroSlides } from '../lib/api';

const BACKEND = process.env.REACT_APP_BACKEND_URL || '';
const resolveSrc = (u) => (u && u.startsWith('/api/') ? `${BACKEND}${u}` : u);

/**
 * Hero carousel — admin-managed via /admin/hero-slides. Unlimited slide count;
 * text fields (eyebrow + stat badges + secondary CTA) still come from the CMS
 * so admins can edit them from the Design tab.
 */
const Hero = () => {
  const [idx, setIdx] = useState(0);
  const [slides, setSlides] = useState([]);
  const [loadState, setLoadState] = useState('loading'); // loading | ready | error
  const { get } = useContent();

  const loadSlides = useCallback(() => {
    setLoadState('loading');
    fetchHeroSlides()
      .then(list => { setSlides(list || []); setLoadState('ready'); })
      .catch(() => { setSlides([]); setLoadState('error'); });
  }, []);

  useEffect(() => { loadSlides(); }, [loadSlides]);

  const displaySlides = useMemo(
    () => slides.filter(s => s.image && String(s.image).trim()).map(s => ({ ...s, image: resolveSrc(s.image) })),
    [slides],
  );

  const total = displaySlides.length;

  useEffect(() => {
    if (total < 2) return undefined;
    const t = setInterval(() => setIdx(i => (i + 1) % total), 6000);
    return () => clearInterval(t);
  }, [total]);

  const slide = displaySlides[Math.min(idx, Math.max(0, total - 1))];

  const eyebrow = get('home.hero.eyebrow', 'Since December 2018');
  const secondaryCta = get('home.hero.cta.secondary', 'Our Story');
  const stat1v = get('home.hero.stat1.value', '10K+');
  const stat1l = get('home.hero.stat1.label', 'Happy Customers');
  const stat2v = get('home.hero.stat2.value', '180+');
  const stat2l = get('home.hero.stat2.label', 'Unique Designs');
  const stat3v = get('home.hero.stat3.value', '4.9★');
  const stat3l = get('home.hero.stat3.label', 'Google Rating');

  // Reserve layout height even before the first slide arrives — otherwise
  // the DOM starts short (only sections below the fold), the browser paints
  // "Our Story" at the top of the viewport, and by the time the hero images
  // and slides load the visitor is already scrolled mid-page.
  if (!slide) {
    return (
      <section
        className="relative overflow-hidden gradient-cream"
        data-testid="hero-section"
        aria-busy={loadState === 'loading'}
        style={{ minHeight: 'clamp(520px, 72vh, 780px)' }}
      >
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-16 md:py-24 grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="h-6 w-40 rounded-full bg-white/50" />
            <div className="h-14 w-3/4 rounded-lg bg-white/50" />
            <div className="h-14 w-2/3 rounded-lg bg-white/40" />
            <div className="h-4 w-5/6 rounded bg-white/40" />
            <div className="h-4 w-4/6 rounded bg-white/30" />
            {loadState === 'error' ? (
              <div className="mt-6 flex flex-col gap-3" data-testid="hero-error">
                <p className="text-sm text-[#B4593F]">We couldn&apos;t reach our store just now. Please check your connection and try again.</p>
                <button
                  onClick={loadSlides}
                  className="inline-flex items-center gap-2 bg-[#B4593F] hover:bg-[#213a60] text-white px-6 py-3 rounded-full text-xs uppercase tracking-[0.2em] transition-colors w-fit"
                  data-testid="hero-retry"
                >Try again</button>
              </div>
            ) : (
              <div className="h-12 w-48 rounded-full bg-white/50 mt-6" />
            )}
          </div>
          <div className="h-[420px] md:h-[560px] rounded-[24px] bg-white/40" />
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden gradient-cream" data-testid="hero-section">
      <Helmet>
        {displaySlides[0]?.image && <link rel="preload" as="image" href={preloadHref(displaySlides[0].image, 900)} />}
      </Helmet>
      <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, rgba(232,136,100,0.15), transparent 50%), radial-gradient(circle at 80% 70%, rgba(245,208,206,0.4), transparent 50%)" }} />

      <div className="relative max-w-[1400px] mx-auto px-6 lg:px-10 py-16 md:py-24 grid lg:grid-cols-2 gap-12 items-center">
        {/* Left content */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur border border-[#EBD9CE] rounded-full px-4 py-1.5 mb-6 animate-fade-up">
            <Sparkles className="w-3.5 h-3.5 text-[#B4593F]" />
            <span className="text-[11px] uppercase tracking-[0.2em] text-[#213a60]">{eyebrow}</span>
          </div>

          <h1 key={slide.id} className="font-serif-display text-5xl md:text-6xl lg:text-7xl leading-[1.05] text-[#213a60] animate-fade-up">
            {slide.heading}<br />
            <span className="italic text-[#B4593F]">{slide.accent}</span>
          </h1>

          <p key={slide.id + '-p'} className="mt-6 text-neutral-700 text-lg max-w-lg leading-relaxed animate-fade-up">
            {slide.subtitle}
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4 animate-fade-up">
            <Link to={slide.href || '/shop'} className="group inline-flex items-center gap-3 bg-[#213a60] hover:bg-[#B4593F] text-white px-7 py-4 rounded-full text-xs uppercase tracking-[0.2em] transition-colors duration-500" data-testid="hero-cta-primary">
              {slide.cta}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link to="/about" className="text-xs uppercase tracking-[0.2em] link-underline text-[#213a60]">{secondaryCta}</Link>
          </div>

          <div className="mt-12 flex flex-wrap gap-6 text-[11px] uppercase tracking-[0.15em] text-neutral-600">
            <div><span className="text-[#B4593F] font-semibold text-lg block">{stat1v}</span>{stat1l}</div>
            <div><span className="text-[#B4593F] font-semibold text-lg block">{stat2v}</span>{stat2l}</div>
            <div><span className="text-[#B4593F] font-semibold text-lg block">{stat3v}</span>{stat3l}</div>
          </div>
        </div>

        {/* Right visual */}
        <div className="relative h-[420px] md:h-[560px]">
          <div className="absolute inset-0 flex">
            {displaySlides.map((s, i) => (
              <div key={s.id} className={`absolute inset-0 transition-all duration-1000 ${i === idx ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                <div className="relative w-full h-full">
                  <div className="absolute -top-8 -right-6 w-56 h-56 rounded-full bg-[#F5D0CE] blur-2xl opacity-70" />
                  <div className="absolute -bottom-6 -left-6 w-64 h-64 rounded-full bg-[#E88864]/30 blur-2xl" />
                  <img {...imgProps(s.image, { width: 900, height: 900, sizes: '(max-width: 768px) 100vw, 50vw', eager: i === 0 })} alt={s.accent || s.heading || 'Wear The Hope'} className="relative w-full h-full object-cover rounded-[24px] shadow-2xl border border-white/60" />
                  {s.accent && (
                    <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur rounded-lg px-4 py-3 shadow-lg">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-[#B4593F]">Featured</div>
                      <div className="font-serif-display text-xl text-[#213a60] italic">{s.accent}</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {total > 1 && (
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
              {displaySlides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  aria-label={`Show slide ${i + 1}`}
                  data-testid={`hero-dot-${i}`}
                  className={`h-1.5 transition-all duration-500 rounded-full ${i === idx ? 'w-8 bg-[#B4593F]' : 'w-1.5 bg-[#B4593F]/30'}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Hero;
