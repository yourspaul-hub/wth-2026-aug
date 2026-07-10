import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { imgProps, preloadHref } from '../lib/imgSrc';
import { Helmet } from 'react-helmet-async';
import { useContent } from '../context/ContentContext';

/**
 * Hero carousel — every field on every slide is admin-editable via the Design tab
 * (see `home.hero.*` and `home.hero.slideN.*` keys). Slides without an image
 * configured are skipped so admins can run a 1-, 2- or 3-slide carousel.
 */
const Hero = () => {
  const [idx, setIdx] = useState(0);
  const { get } = useContent();

  const slides = useMemo(() => {
    const raw = [
      {
        id: 'h1',
        image: get('home.hero.slide1.image'),
        eyebrow: get('home.hero.eyebrow'),
        heading: get('home.hero.title'),
        accent: get('home.hero.accent'),
        subheading: get('home.hero.subtitle'),
        cta: get('home.hero.cta.primary'),
        href: get('home.hero.href', '/shop'),
      },
      {
        id: 'h2',
        image: get('home.hero.slide2.image'),
        eyebrow: get('home.hero.eyebrow'),
        heading: get('home.hero.slide2.heading'),
        accent: get('home.hero.slide2.accent'),
        subheading: get('home.hero.slide2.subtitle'),
        cta: get('home.hero.slide2.cta'),
        href: get('home.hero.slide2.href', '/shop'),
      },
      {
        id: 'h3',
        image: get('home.hero.slide3.image'),
        eyebrow: get('home.hero.eyebrow'),
        heading: get('home.hero.slide3.heading'),
        accent: get('home.hero.slide3.accent'),
        subheading: get('home.hero.slide3.subtitle'),
        cta: get('home.hero.slide3.cta'),
        href: get('home.hero.slide3.href', '/shop'),
      },
    ];
    return raw.filter(s => s.image && String(s.image).trim());
  }, [get]);

  const total = slides.length;

  useEffect(() => {
    if (total < 2) return undefined;
    const t = setInterval(() => setIdx(i => (i + 1) % total), 6000);
    return () => clearInterval(t);
  }, [total]);

  const slide = slides[Math.min(idx, Math.max(0, total - 1))] || slides[0];

  const secondaryCta = get('home.hero.cta.secondary', 'Our Story');
  const stat1v = get('home.hero.stat1.value', '10K+');
  const stat1l = get('home.hero.stat1.label', 'Happy Customers');
  const stat2v = get('home.hero.stat2.value', '180+');
  const stat2l = get('home.hero.stat2.label', 'Unique Designs');
  const stat3v = get('home.hero.stat3.value', '4.9★');
  const stat3l = get('home.hero.stat3.label', 'Google Rating');

  if (!slide) return null;

  return (
    <section className="relative overflow-hidden gradient-cream" data-testid="hero-section">
      <Helmet>
        {slides[0]?.image && <link rel="preload" as="image" href={preloadHref(slides[0].image, 900)} />}
      </Helmet>
      <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, rgba(232,136,100,0.15), transparent 50%), radial-gradient(circle at 80% 70%, rgba(245,208,206,0.4), transparent 50%)" }} />

      <div className="relative max-w-[1400px] mx-auto px-6 lg:px-10 py-16 md:py-24 grid lg:grid-cols-2 gap-12 items-center">
        {/* Left content */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur border border-[#EBD9CE] rounded-full px-4 py-1.5 mb-6 animate-fade-up">
            <Sparkles className="w-3.5 h-3.5 text-[#B4593F]" />
            <span className="text-[11px] uppercase tracking-[0.2em] text-[#1A1A1A]">{slide.eyebrow}</span>
          </div>

          <h1 key={slide.id} className="font-serif-display text-5xl md:text-6xl lg:text-7xl leading-[1.05] text-[#1A1A1A] animate-fade-up">
            {slide.heading}<br />
            <span className="italic text-[#B4593F]">{slide.accent}</span>
          </h1>

          <p key={slide.id + '-p'} className="mt-6 text-neutral-700 text-lg max-w-lg leading-relaxed animate-fade-up">
            {slide.subheading}
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4 animate-fade-up">
            <Link to={slide.href} className="group inline-flex items-center gap-3 bg-[#1A1A1A] hover:bg-[#B4593F] text-white px-7 py-4 rounded-full text-xs uppercase tracking-[0.2em] transition-colors duration-500" data-testid="hero-cta-primary">
              {slide.cta}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link to="/about" className="text-xs uppercase tracking-[0.2em] link-underline text-[#1A1A1A]">{secondaryCta}</Link>
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
            {slides.map((s, i) => (
              <div key={s.id} className={`absolute inset-0 transition-all duration-1000 ${i === idx ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                <div className="relative w-full h-full">
                  <div className="absolute -top-8 -right-6 w-56 h-56 rounded-full bg-[#F5D0CE] blur-2xl opacity-70" />
                  <div className="absolute -bottom-6 -left-6 w-64 h-64 rounded-full bg-[#E88864]/30 blur-2xl" />
                  <img {...imgProps(s.image, { width: 900, height: 900, sizes: '(max-width: 768px) 100vw, 50vw', eager: i === 0 })} alt={s.accent || 'Wear The Hope'} className="relative w-full h-full object-cover rounded-[24px] shadow-2xl border border-white/60" />
                  {s.accent && (
                    <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur rounded-lg px-4 py-3 shadow-lg">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-[#B4593F]">Featured</div>
                      <div className="font-serif-display text-xl text-[#1A1A1A] italic">{s.accent}</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {total > 1 && (
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
              {slides.map((_, i) => (
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
