import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed';
import { useCurrency } from '../context/CurrencyContext';
import { imgProps } from '../lib/imgSrc';

/**
 * Compact "Recently viewed" strip. Hidden when list is empty or when
 * the current product should be excluded (via `excludeId`).
 */
const RecentlyViewed = ({ excludeId, title, className = '', testid = 'recently-viewed' }) => {
  const { t } = useTranslation();
  const { items, remove } = useRecentlyViewed();
  const { format } = useCurrency();

  const list = items.filter(p => p.id !== excludeId).slice(0, 8);
  if (list.length === 0) return null;

  return (
    <section className={`mt-16 ${className}`} data-testid={testid}>
      <div className="flex items-end justify-between mb-6">
        <h2 className="font-serif-display text-2xl md:text-3xl">{title || t('product.recently_viewed')}</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {list.map(p => (
          <div key={p.id} className="relative group" data-testid={`recently-viewed-item-${p.id}`}>
            <button
              onClick={() => remove(p.id)}
              aria-label="Remove from recently viewed"
              className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-white/95 hover:bg-[#B4593F] hover:text-white shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              data-testid={`recently-viewed-remove-${p.id}`}
            >
              <X className="w-3 h-3" />
            </button>
            <Link to={`/product/${p.id}`} className="block">
              <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-white border border-[#EBD9CE]/70">
                <img
                  {...imgProps(p.image, { width: 400, height: 500, sizes: '(max-width: 768px) 50vw, 20vw' })}
                  alt={p.name}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="pt-2">
                <div className="text-xs font-medium line-clamp-1 group-hover:text-[#B4593F] transition-colors">{p.name}</div>
                <div className="text-xs text-[#B4593F] font-semibold mt-0.5">{format(p.price)}</div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
};

export default RecentlyViewed;
