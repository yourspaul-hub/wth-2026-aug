import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ProductCard from './ProductCard';
import { fetchRecommendations } from '../lib/api';

const normalize = (p) => ({ ...p, originalPrice: p.original_price ?? p.originalPrice, hoverImage: p.hover_image ?? p.hoverImage });

/**
 * "You may also love" — server-driven picks for a product.
 * Falls back gracefully; renders nothing if no items.
 */
const RelatedProducts = ({ productId, limit = 8, title, testid = 'related-products' }) => {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    fetchRecommendations(productId, limit)
      .then(res => setItems((res?.items || []).map(normalize)))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [productId, limit]);

  if (!loading && items.length === 0) return null;

  return (
    <section className="mt-24" data-testid={testid}>
      <div className="flex items-end justify-between mb-8">
        <h2 className="font-serif-display text-3xl md:text-4xl">{title || t('product.recommendations')}</h2>
      </div>
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-7">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="aspect-[4/5] bg-white/60 border border-[#EBD9CE] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-7">
          {items.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </section>
  );
};

export default RelatedProducts;
