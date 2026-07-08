import React, { useEffect, useMemo, useState } from 'react';
import { fetchReviewsFull } from '../lib/api';
import { imgProps } from '../lib/imgSrc';
import { Star, Globe, ShieldCheck, QrCode, X, ChevronDown, ChevronUp } from 'lucide-react';

const FILTERS = [
  { key: 'all', label: 'All reviews' },
  { key: 'google', label: 'Google' },
  { key: 'qr', label: 'Verified purchase' },
  { key: 'manual', label: 'From our team' },
];

const sourceBadge = (r) => {
  if (r.google_review_id) return { icon: Globe, cls: 'bg-sky-50 text-sky-700', label: r.source || 'Google' };
  if ((r.source || '').toLowerCase() === 'qr') return { icon: QrCode, cls: 'bg-amber-50 text-amber-700', label: 'Verified purchase' };
  return { icon: ShieldCheck, cls: 'bg-emerald-50 text-emerald-700', label: 'Curated' };
};

const Stars = ({ n = 5, size = 3 }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map(i => <Star key={i} className={`w-${size} h-${size} ${i <= n ? 'fill-[#F5B342] text-[#F5B342]' : 'text-neutral-300'}`} />)}
  </div>
);

const ReviewsSection = () => {
  const [data, setData] = useState({ items: [], total: 0, stats: { average: 0, breakdown: {}, total_all_published: 0 } });
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState({});
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    const params = { limit: 60 };
    if (filter !== 'all') params.source = filter;
    fetchReviewsFull(params).then(setData).catch(() => {});
  }, [filter]);

  const stats = data.stats || {};
  const totalPublished = stats.total_all_published || 0;
  const percents = useMemo(() => {
    const t = totalPublished || 1;
    const b = stats.breakdown || {};
    return [5, 4, 3, 2, 1].map(k => ({ k, c: b[String(k)] || 0, pct: Math.round(((b[String(k)] || 0) / t) * 100) }));
  }, [stats, totalPublished]);

  if (totalPublished === 0) return null;

  return (
    <section className="py-20 bg-white" data-testid="reviews-section">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
        <div className="text-center mb-12">
          <div className="text-[11px] uppercase tracking-[0.3em] text-[#B4593F] mb-3">Loved by 1000+ believers</div>
          <h2 className="font-serif-display text-4xl md:text-5xl">What our <span className="italic">community</span> says</h2>
        </div>

        <div className="grid md:grid-cols-[minmax(0,320px)_1fr] gap-10 mb-10 items-start">
          {/* Summary */}
          <div className="bg-[#FDF3EB] rounded-2xl border border-[#EBD9CE] p-6" data-testid="reviews-summary">
            <div className="flex items-baseline gap-3 mb-2">
              <div className="font-serif-display text-5xl">{(stats.average || 0).toFixed(1)}</div>
              <div className="text-sm text-neutral-600">out of 5</div>
            </div>
            <Stars n={Math.round(stats.average || 0)} size={4} />
            <div className="text-xs text-neutral-500 mt-2">Based on {totalPublished} review{totalPublished === 1 ? '' : 's'}</div>
            <div className="mt-5 space-y-1.5">
              {percents.map(({ k, c, pct }) => (
                <div key={k} className="flex items-center gap-2 text-xs">
                  <span className="w-3 text-neutral-600">{k}</span>
                  <Star className="w-3 h-3 fill-[#F5B342] text-[#F5B342]" />
                  <div className="flex-1 h-1.5 bg-white rounded-full overflow-hidden">
                    <div className="h-full bg-[#B4593F]" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-8 text-right text-neutral-500">{c}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Filter chips + intro */}
          <div>
            <p className="text-neutral-700 leading-relaxed">Real words from customers around the world — pulled live from Google Business, verified purchase submissions, and reviews shared by our community.</p>
            <div className="flex flex-wrap gap-2 mt-5" data-testid="reviews-filters">
              {FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  data-testid={`reviews-filter-${f.key}`}
                  className={`text-xs uppercase tracking-widest px-4 py-2 rounded-full transition-colors ${filter === f.key ? 'bg-[#1A1A1A] text-white' : 'bg-white border border-[#EBD9CE] hover:border-[#B4593F]'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Reviews grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {data.items.length === 0 ? (
            <div className="md:col-span-3 text-center py-12 text-neutral-500 text-sm">No reviews match this filter yet.</div>
          ) : data.items.slice(0, 12).map(r => {
            const b = sourceBadge(r);
            const B = b.icon;
            const isLong = (r.text || '').length > 220;
            const isOpen = !!expanded[r.id];
            const text = isLong && !isOpen ? `${r.text.slice(0, 220)}…` : r.text;
            return (
              <article key={r.id} data-testid={`review-${r.id}`} className="bg-white rounded-2xl border border-[#EBD9CE] p-6 hover-lift transition-shadow">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {r.avatar ? (
                      <img {...imgProps(r.avatar, { width: 80, height: 80, sizes: "40px" })} alt={r.name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#FDF3EB] flex items-center justify-center text-[#B4593F] font-semibold">{r.name?.[0]?.toUpperCase() || '?'}</div>
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{r.name}</div>
                      <div className="text-[10px] text-neutral-500">{r.when || 'recently'}</div>
                    </div>
                  </div>
                  <Stars n={r.rating} />
                </div>

                <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                  <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-widest px-2 py-0.5 rounded ${b.cls}`}>
                    <B className="w-2.5 h-2.5" /> {b.label}
                  </span>
                  {r.verified && (
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                      <ShieldCheck className="w-2.5 h-2.5" /> Verified
                    </span>
                  )}
                </div>

                <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-line">{text}</p>
                {isLong && (
                  <button onClick={() => setExpanded({ ...expanded, [r.id]: !isOpen })} className="mt-2 text-xs text-[#B4593F] hover:underline inline-flex items-center gap-1">
                    {isOpen ? <>Show less <ChevronUp className="w-3 h-3" /></> : <>Read more <ChevronDown className="w-3 h-3" /></>}
                  </button>
                )}

                {r.photos?.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {r.photos.slice(0, 4).map((p, i) => (
                      <button key={i} onClick={() => setLightbox(p)} className="w-16 h-16 rounded-lg overflow-hidden bg-neutral-100">
                        <img {...imgProps(p, { width: 200, height: 200, sizes: "64px" })} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                      </button>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {data.items.length > 12 && (
          <div className="text-center mt-8 text-xs text-neutral-500">Showing 12 of {data.total} matching reviews</div>
        )}
      </div>

      {lightbox && (
        <div onClick={() => setLightbox(null)} className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-6 cursor-zoom-out">
          <button className="absolute top-6 right-6 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white"><X className="w-5 h-5" /></button>
          <img src={lightbox} alt="" className="max-w-full max-h-full rounded-lg object-contain" />
        </div>
      )}
    </section>
  );
};

export default ReviewsSection;
