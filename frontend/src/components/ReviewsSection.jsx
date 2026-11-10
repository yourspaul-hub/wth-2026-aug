import React, { useMemo, useState } from 'react';
import { Star, Globe, ChevronDown, MapPin } from 'lucide-react';
import { GOOGLE_REVIEWS } from '../data/googleReviews';

const Stars = ({ n = 5 }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map(i => (
      <Star key={i} className={`w-3.5 h-3.5 ${i <= n ? 'fill-[#F5B342] text-[#F5B342]' : 'text-neutral-300'}`} />
    ))}
  </div>
);

const PAGE_SIZE = 6;

const ReviewsSection = () => {
  const [visible, setVisible] = useState(PAGE_SIZE);
  const items = useMemo(() => GOOGLE_REVIEWS, []);

  if (items.length === 0) return null;

  const average = (items.reduce((s, r) => s + (r.rating || 5), 0) / items.length).toFixed(1);

  return (
    <section className="py-14 md:py-20 bg-white" data-testid="reviews-section">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <div className="text-[11px] uppercase tracking-[0.3em] text-[#B4593F] mb-3 inline-flex items-center gap-2">
            <Globe className="w-3 h-3" /> From Google Business
          </div>
          <h2 className="font-serif-display text-4xl md:text-5xl">What our <span className="italic">community</span> says</h2>
          <div className="flex items-center justify-center gap-3 mt-5">
            <Stars n={5} />
            <span className="text-sm text-neutral-700">
              <strong className="text-[#213a60]">{average}</strong> / 5 · {items.length} verified Google reviews
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="reviews-grid">
          {items.slice(0, visible).map((r, i) => (
            <article
              key={i}
              data-testid={`review-${i}`}
              className="bg-white rounded-2xl border border-[#EBD9CE] p-6 hover:border-[#B4593F]/60 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-[#FDF3EB] flex items-center justify-center text-[#B4593F] font-semibold shrink-0">
                    {r.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{r.name}</div>
                    <div className="text-[10px] text-neutral-500 inline-flex items-center gap-1">
                      <MapPin className="w-2.5 h-2.5" /> {r.location} · {r.when}
                    </div>
                  </div>
                </div>
                <Stars n={r.rating} />
              </div>
              <p className="text-sm text-neutral-700 leading-relaxed">{r.text}</p>
            </article>
          ))}
        </div>

        {visible < items.length && (
          <div className="flex flex-col items-center gap-3 mt-10" data-testid="reviews-load-more-wrap">
            <button
              onClick={() => setVisible(v => v + PAGE_SIZE)}
              className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] bg-[#213a60] hover:bg-[#B4593F] text-white px-6 py-3 rounded-full transition-colors"
              data-testid="reviews-load-more-btn"
            >
              Load more reviews <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <div className="text-[11px] uppercase tracking-widest text-neutral-500">
              Showing <strong>{Math.min(visible, items.length)}</strong> of <strong>{items.length}</strong>
            </div>
          </div>
        )}
        {visible >= items.length && visible > PAGE_SIZE && (
          <div className="text-center mt-10 text-[11px] uppercase tracking-widest text-neutral-500" data-testid="reviews-all-shown">
            You&apos;ve reached the end · {items.length} review{items.length === 1 ? '' : 's'}
          </div>
        )}
      </div>
    </section>
  );
};

export default ReviewsSection;
