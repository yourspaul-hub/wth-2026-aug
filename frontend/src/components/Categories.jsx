import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useCategories } from '../hooks/useCategories';
import { useContentText } from '../context/ContentContext';

const Categories = () => {
  const containerRef = useRef(null);
  const { items: cats, loading } = useCategories();
  const eyebrow = useContentText('home.categories.eyebrow');
  const title = useContentText('home.categories.title');
  const titleAccent = useContentText('home.categories.title_accent');
  const subtitle = useContentText('home.categories.subtitle');

  useEffect(() => {
    const els = containerRef.current?.querySelectorAll('.reveal');
    if (!els) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in-view'); });
    }, { threshold: 0.1 });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, [cats]);

  if (loading || !cats.length) return null;

  return (
    <section id="categories" ref={containerRef} className="relative py-24 bg-[#FDF3EB]">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        <div className="flex flex-wrap items-end justify-between gap-6 mb-14">
          <div className="reveal">
            <div className="text-[11px] uppercase tracking-[0.3em] text-[#B4593F] mb-3">{eyebrow}</div>
            <h2 className="font-serif-display text-4xl md:text-5xl text-[#213a60] leading-tight max-w-xl">{title}{titleAccent && <> <span className="italic">{titleAccent}</span></>}</h2>
            {subtitle && <p className="mt-4 text-neutral-600 max-w-lg text-sm">{subtitle}</p>}
          </div>
          <Link to="/shop" className="text-xs uppercase tracking-[0.2em] link-underline text-[#213a60] reveal">View All Collections</Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
          {cats.map((c, i) => (
            <Link
              key={c.id}
              to={c.comingSoon ? '#' : `/shop/${c.slug}`}
              className={`group relative reveal ${c.comingSoon ? 'pointer-events-none' : ''}`}
              style={{ transitionDelay: `${i * 60}ms` }}
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-[#F5D0CE]/40 border border-[#EBD9CE]/60">
                <img src={c.image} alt={c.name} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-70 group-hover:opacity-90 transition-opacity duration-500" />
                {c.comingSoon && (
                  <div className="absolute top-3 left-3 bg-white/95 text-[10px] uppercase tracking-[0.2em] px-3 py-1.5 rounded-full text-[#213a60]">Coming Soon</div>
                )}
                {!c.comingSoon && (
                  <div className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-1 group-hover:translate-y-0">
                    <ArrowUpRight className="w-4 h-4 text-[#B4593F]" />
                  </div>
                )}
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <div className="font-serif-display text-2xl leading-tight">{c.name}</div>
                  <div className="text-[11px] uppercase tracking-[0.15em] opacity-90 mt-1">{c.tagline}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Categories;
