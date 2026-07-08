import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { heroSlides } from '../mock/mock';
import { imgProps, preloadHref } from '../lib/imgSrc';
import { Helmet } from 'react-helmet-async';
import { useContent } from '../context/ContentContext';

const Hero = () => {
  const [idx, setIdx] = useState(0);
  const { get } = useContent();
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % heroSlides.length), 6000);
    return () => clearInterval(t);
  }, []);
  const raw = heroSlides[idx];
  // For the primary (first) slide, allow the admin to override the text bits via Design tab.
  // heading = main line before the italic accent | subheading = paragraph below | cta = primary CTA label
  const slide = idx === 0 ? {
    ...raw,
    heading: get('home.hero.title', raw.heading),
    subheading: get('home.hero.subtitle', raw.subheading),
    cta: get('home.hero.cta.primary', raw.cta),
  } : raw;
  const secondaryCta = get('home.hero.cta.secondary', 'Our Story');

  return (
    <section className="relative overflow-hidden gradient-cream">
      <Helmet>
        {heroSlides[0]?.image && <link rel="preload" as="image" href={preloadHref(heroSlides[0].image, 900)} />}
      </Helmet>
      <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, rgba(232,136,100,0.15), transparent 50%), radial-gradient(circle at 80% 70%, rgba(245,208,206,0.4), transparent 50%)" }} />

      <div className="relative max-w-[1400px] mx-auto px-6 lg:px-10 py-16 md:py-24 grid lg:grid-cols-2 gap-12 items-center">
        {/* Left content */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur border border-[#EBD9CE] rounded-full px-4 py-1.5 mb-6 animate-fade-up">
            <Sparkles className="w-3.5 h-3.5 text-[#B4593F]" />
            <span className="text-[11px] uppercase tracking-[0.2em] text-[#1A1A1A]">Since December 2018</span>
          </div>

          <h1 key={slide.id} className="font-serif-display text-5xl md:text-6xl lg:text-7xl leading-[1.05] text-[#1A1A1A] animate-fade-up">
            {slide.heading}<br />
            <span className="italic text-[#B4593F]">{slide.accent}</span>
          </h1>

          <p key={slide.id + '-p'} className="mt-6 text-neutral-700 text-lg max-w-lg leading-relaxed animate-fade-up">
            {slide.subheading}
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4 animate-fade-up">
            <Link to={slide.href} className="group inline-flex items-center gap-3 bg-[#1A1A1A] hover:bg-[#B4593F] text-white px-7 py-4 rounded-full text-xs uppercase tracking-[0.2em] transition-colors duration-500">
              {slide.cta}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link to="/about" className="text-xs uppercase tracking-[0.2em] link-underline text-[#1A1A1A]">{secondaryCta}</Link>
          </div>

          {/* Trust badges */}
          <div className="mt-12 flex flex-wrap gap-6 text-[11px] uppercase tracking-[0.15em] text-neutral-600">
            <div><span className="text-[#B4593F] font-semibold text-lg block">10K+</span>Happy Customers</div>
            <div><span className="text-[#B4593F] font-semibold text-lg block">180+</span>Unique Designs</div>
            <div><span className="text-[#B4593F] font-semibold text-lg block">4.9★</span>Google Rating</div>
          </div>
        </div>

        {/* Right visual */}
        <div className="relative h-[420px] md:h-[560px]">
          <div className="absolute inset-0 flex">
            {heroSlides.map((s, i) => (
              <div key={s.id} className={`absolute inset-0 transition-all duration-1000 ${i === idx ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                <div className="relative w-full h-full">
                  <div className="absolute -top-8 -right-6 w-56 h-56 rounded-full bg-[#F5D0CE] blur-2xl opacity-70" />
                  <div className="absolute -bottom-6 -left-6 w-64 h-64 rounded-full bg-[#E88864]/30 blur-2xl" />
                  <img {...imgProps(s.image, { width: 900, height: 900, sizes: '(max-width: 768px) 100vw, 50vw', eager: i === 0 })} alt={s.accent} className="relative w-full h-full object-cover rounded-[24px] shadow-2xl border border-white/60" />
                  <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur rounded-lg px-4 py-3 shadow-lg">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-[#B4593F]">Featured</div>
                    <div className="font-serif-display text-xl text-[#1A1A1A] italic">{s.accent}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Slide indicators */}
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
            {heroSlides.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)} className={`h-1.5 transition-all duration-500 rounded-full ${i === idx ? 'w-8 bg-[#B4593F]' : 'w-1.5 bg-[#B4593F]/30'}`} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
