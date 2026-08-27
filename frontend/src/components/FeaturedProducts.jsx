import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from './ProductCard';
import { fetchProducts } from '../lib/api';
import { ArrowRight } from 'lucide-react';

// Normalize API product shape to match ProductCard expectations
const normalize = (p) => ({
  ...p,
  originalPrice: p.original_price ?? p.originalPrice,
  hoverImage: p.hover_image ?? p.hoverImage,
});

const FeaturedProducts = ({ title = 'Bestsellers', subtitle = 'Handpicked for you', filter = null, limit = 8, viewAllHref = '/shop', apiTag = null }) => {
  const ref = useRef(null);
  const [items, setItems] = useState([]);
  const [loadState, setLoadState] = useState('loading'); // loading | ready | error

  const load = useCallback(() => {
    setLoadState('loading');
    fetchProducts({ limit: 50, tag: apiTag || undefined })
      .then(res => { setItems((res.items || []).map(normalize)); setLoadState('ready'); })
      .catch(() => { setItems([]); setLoadState('error'); });
  }, [apiTag]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const els = ref.current?.querySelectorAll('.reveal');
    if (!els) return;
    const io = new IntersectionObserver((entries) => entries.forEach(e => e.isIntersecting && e.target.classList.add('in-view')), { threshold: 0.08 });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, [items]);

  const list = (filter ? items.filter(filter) : items).slice(0, limit);

  // Reserve section height with skeletons on the very first paint so the
  // page height is stable before the products API responds. On network
  // failure we swap the last skeleton row for a retry state instead of
  // hiding the section entirely — leaving the shopper staring at a blank
  // gap was the "products not loading on certain mobiles" bug.
  if (loadState !== 'ready') {
    return (
      <section className="py-14 md:py-24 bg-gradient-to-b from-[#FDF3EB] via-[#F9E7DC] to-[#FDF3EB]" data-testid="featured-products-loading" aria-busy={loadState === 'loading'}>
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
          <div className="flex flex-wrap items-end justify-between gap-6 mb-12">
            <div>
              <div className="h-4 w-40 rounded-full bg-white/70 mb-3" />
              <div className="h-10 w-72 rounded-lg bg-white/70" />
            </div>
            <div className="h-4 w-32 rounded-full bg-white/70" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-7">
            {Array.from({ length: Math.min(limit, 8) }).map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="aspect-[4/5] rounded-2xl bg-white/60" />
                <div className="h-4 w-3/4 rounded bg-white/60" />
                <div className="h-4 w-1/3 rounded bg-white/60" />
              </div>
            ))}
          </div>
          {loadState === 'error' && (
            <div className="mt-10 flex flex-col items-center gap-3 text-center" data-testid="featured-products-error">
              <p className="text-sm text-[#B4593F]">We couldn&apos;t load our products right now. Please check your connection.</p>
              <button onClick={load} className="inline-flex items-center gap-2 bg-[#B4593F] hover:bg-[#213a60] text-white px-6 py-3 rounded-full text-xs uppercase tracking-[0.2em] transition-colors" data-testid="featured-products-retry">Try again</button>
            </div>
          )}
        </div>
      </section>
    );
  }
  if (list.length === 0) return null;

  return (
    <section ref={ref} className="py-14 md:py-24 bg-gradient-to-b from-[#FDF3EB] via-[#F9E7DC] to-[#FDF3EB]">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        <div className="flex flex-wrap items-end justify-between gap-6 mb-12">
          <div className="reveal">
            <div className="text-[11px] uppercase tracking-[0.3em] text-[#B4593F] mb-3">{subtitle}</div>
            <h2 className="font-serif-display text-4xl md:text-5xl text-[#213a60]">{title}</h2>
          </div>
          <Link to={viewAllHref} className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] link-underline reveal">
            Shop All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-7">
          {list.map((p, i) => (
            <div key={p.id} className="reveal" style={{ transitionDelay: `${i * 60}ms` }}>
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;
