import React, { useEffect, useRef, useState } from 'react';
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

  useEffect(() => {
    fetchProducts({ limit: 50, tag: apiTag || undefined })
      .then(res => setItems((res.items || []).map(normalize)))
      .catch(() => setItems([]));
  }, [apiTag]);

  useEffect(() => {
    const els = ref.current?.querySelectorAll('.reveal');
    if (!els) return;
    const io = new IntersectionObserver((entries) => entries.forEach(e => e.isIntersecting && e.target.classList.add('in-view')), { threshold: 0.08 });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, [items]);

  const list = (filter ? items.filter(filter) : items).slice(0, limit);
  if (list.length === 0) return null;

  return (
    <section ref={ref} className="py-24 bg-gradient-to-b from-[#FDF3EB] via-[#F9E7DC] to-[#FDF3EB]">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        <div className="flex flex-wrap items-end justify-between gap-6 mb-12">
          <div className="reveal">
            <div className="text-[11px] uppercase tracking-[0.3em] text-[#B4593F] mb-3">{subtitle}</div>
            <h2 className="font-serif-display text-4xl md:text-5xl text-[#1A1A1A]">{title}</h2>
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
