import React, { useEffect, useRef, useState } from 'react';
import { Star, Quote, ChevronLeft, ChevronRight } from 'lucide-react';
import { testimonials as mockReviews } from '../mock/mock';
import { fetchReviews } from '../lib/api';
import { useContentText } from '../context/ContentContext';

const Testimonials = () => {
  const [items, setItems] = useState(mockReviews);
  const [i, setI] = useState(0);
  const ref = useRef(null);
  const eyebrow = useContentText('home.testimonials.eyebrow');
  const title = useContentText('home.testimonials.title');
  const parts = title.split(' ');
  const titleMain = parts.length > 1 ? parts.slice(0, -1).join(' ') + ' ' : title;
  const titleAccent = parts.length > 1 ? parts.slice(-1)[0] : '';

  useEffect(() => {
    fetchReviews().then(rs => { if (rs && rs.length) setItems(rs); }).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setInterval(() => setI(x => (x + 1) % items.length), 6000);
    return () => clearInterval(t);
  }, [items.length]);

  const prev = () => setI(x => (x - 1 + items.length) % items.length);
  const next = () => setI(x => (x + 1) % items.length);

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'AggregateRating',
    'ratingValue': (items.reduce((s, t) => s + t.rating, 0) / Math.max(1, items.length)).toFixed(1),
    'reviewCount': items.length,
    'itemReviewed': { '@type': 'Organization', 'name': 'Wear The Hope' },
  };

  if (items.length === 0) return null;

  return (
    <section ref={ref} className="py-24 relative overflow-hidden gradient-blush">
      <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.5), transparent 50%)' }} />
      <div className="max-w-[1200px] mx-auto px-6 lg:px-10 relative">
        <div className="text-center mb-14">
          <div className="text-[11px] uppercase tracking-[0.3em] text-[#B4593F] mb-3">{eyebrow}</div>
          <h2 className="font-serif-display text-4xl md:text-5xl text-[#1A1A1A]">{titleMain}<span className="italic">{titleAccent}</span></h2>
          <div className="flex items-center justify-center gap-1 mt-4">
            {[...Array(5)].map((_, k) => <Star key={k} className="w-4 h-4 fill-[#E8B364] stroke-[#E8B364]" />)}
            <span className="ml-3 text-sm text-neutral-700">4.9 / 5 on Google Reviews</span>
          </div>
        </div>

        <div className="relative">
          <div className="grid md:grid-cols-3 gap-6">
            {[-1, 0, 1].map((offset) => {
              const idx = (i + offset + items.length) % items.length;
              const t = items[idx];
              const isCenter = offset === 0;
              return (
                <div key={(t.id || idx) + '-' + offset} className={`transition-all duration-700 ${isCenter ? 'md:scale-105 z-10' : 'md:scale-95 md:opacity-70 hidden md:block'}`}>
                  <div className={`bg-white/95 backdrop-blur rounded-2xl p-8 h-full border border-white shadow-[0_20px_50px_-30px_rgba(180,89,63,0.4)] ${isCenter ? 'ring-1 ring-[#B4593F]/20' : ''}`}>
                    <Quote className="w-8 h-8 text-[#B4593F]/30 mb-4" />
                    <div className="flex gap-0.5 mb-4">{[...Array(t.rating)].map((_, k) => <Star key={k} className="w-3.5 h-3.5 fill-[#E8B364] stroke-[#E8B364]" />)}</div>
                    <p className="text-neutral-700 leading-relaxed text-[15px] mb-6 line-clamp-6">{t.text}</p>
                    <div className="flex items-center gap-3 pt-4 border-t border-[#EBD9CE]">
                      {t.avatar && <img src={t.avatar} alt={t.name} className="w-11 h-11 rounded-full object-cover" />}
                      <div>
                        <div className="font-medium text-sm text-[#1A1A1A]">{t.name}</div>
                        <div className="text-[11px] text-neutral-500">{t.when} · {t.source || 'Google Review'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-4 mt-10">
            <button onClick={prev} className="w-11 h-11 rounded-full bg-white hover:bg-[#B4593F] hover:text-white transition-colors border border-[#EBD9CE] flex items-center justify-center" aria-label="Previous"><ChevronLeft className="w-4 h-4" /></button>
            <div className="flex gap-2">
              {items.map((_, k) => (
                <button key={k} onClick={() => setI(k)} className={`h-1.5 rounded-full transition-all duration-500 ${k === i ? 'w-8 bg-[#B4593F]' : 'w-1.5 bg-[#B4593F]/30'}`} />
              ))}
            </div>
            <button onClick={next} className="w-11 h-11 rounded-full bg-white hover:bg-[#B4593F] hover:text-white transition-colors border border-[#EBD9CE] flex items-center justify-center" aria-label="Next"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
