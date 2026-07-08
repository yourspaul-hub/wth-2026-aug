import { useCallback, useEffect, useState } from 'react';

const KEY = 'wth_recently_viewed';
const MAX = 12;

const read = () => {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
};

const write = (list) => {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* noop */ }
};

/**
 * Recently viewed product tracking (localStorage-backed).
 * @returns { items, track(product), remove(id), clear() }
 */
export const useRecentlyViewed = () => {
  const [items, setItems] = useState(read);

  useEffect(() => {
    const onStorage = (e) => { if (e.key === KEY) setItems(read()); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const track = useCallback((product) => {
    if (!product?.id) return;
    setItems(prev => {
      const trimmed = { id: product.id, name: product.name, image: product.image, price: product.price, originalPrice: product.originalPrice ?? product.original_price, verse: product.verse, hoverImage: product.hoverImage ?? product.hover_image, rating: product.rating };
      const next = [trimmed, ...prev.filter(p => p.id !== product.id)].slice(0, MAX);
      write(next);
      return next;
    });
  }, []);

  const remove = useCallback((id) => {
    setItems(prev => {
      const next = prev.filter(p => p.id !== id);
      write(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => { write([]); setItems([]); }, []);

  return { items, track, remove, clear };
};
