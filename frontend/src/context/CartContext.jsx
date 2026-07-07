import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('wth_cart') || '[]'); } catch { return []; }
  });
  const [wishlist, setWishlist] = useState(() => {
    try { return JSON.parse(localStorage.getItem('wth_wish') || '[]'); } catch { return []; }
  });
  const [isCartOpen, setCartOpen] = useState(false);

  useEffect(() => { localStorage.setItem('wth_cart', JSON.stringify(items)); }, [items]);
  useEffect(() => { localStorage.setItem('wth_wish', JSON.stringify(wishlist)); }, [wishlist]);

  const addToCart = (product, qty = 1) => {
    setItems(prev => {
      const key = product.variant_id ? `${product.id}::${product.variant_id}` : product.id;
      const found = prev.find(p => (p.variant_id ? `${p.id}::${p.variant_id}` : p.id) === key);
      if (found) return prev.map(p => (p.variant_id ? `${p.id}::${p.variant_id}` : p.id) === key ? { ...p, qty: p.qty + qty } : p);
      return [...prev, { ...product, qty }];
    });
    setCartOpen(true);
  };

  const _keyOf = (p) => p.variant_id ? `${p.id}::${p.variant_id}` : p.id;
  const removeItem = (key) => setItems(prev => prev.filter(p => _keyOf(p) !== key));
  const updateQty = (key, qty) => setItems(prev => prev.map(p => _keyOf(p) === key ? { ...p, qty: Math.max(1, qty) } : p));
  const clearCart = () => setItems([]);

  const toggleWishlist = (product) => {
    setWishlist(prev => {
      const exists = prev.find(p => p.id === product.id);
      if (exists) return prev.filter(p => p.id !== product.id);
      return [...prev, product];
    });
  };
  const inWishlist = (id) => wishlist.some(p => p.id === id);

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, p) => s + (p.price * p.qty), 0);
    const count = items.reduce((s, p) => s + p.qty, 0);
    return { subtotal, count };
  }, [items]);

  return (
    <CartContext.Provider value={{ items, wishlist, isCartOpen, setCartOpen, addToCart, removeItem, updateQty, clearCart, toggleWishlist, inWishlist, totals }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
};
