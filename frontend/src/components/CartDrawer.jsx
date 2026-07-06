import React from 'react';
import { Link } from 'react-router-dom';
import { X, Minus, Plus, ShoppingBag, ArrowRight, Trash2 } from 'lucide-react';
import { useCart } from '../context/CartContext';

const CartDrawer = () => {
  const { isCartOpen, setCartOpen, items, updateQty, removeItem, totals, clearCart } = useCart();

  return (
    <>
      <div
        onClick={() => setCartOpen(false)}
        className={`fixed inset-0 bg-black/50 z-50 transition-opacity duration-500 ${isCartOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />
      <aside className={`fixed top-0 right-0 h-full w-full sm:w-[440px] bg-[#FDF3EB] z-50 shadow-2xl transition-transform duration-500 ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-6 py-5 border-b border-[#EBD9CE]">
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-5 h-5 text-[#B4593F]" />
              <h3 className="font-serif-display text-2xl">Your Bag <span className="text-neutral-500 text-base">({totals.count})</span></h3>
            </div>
            <button onClick={() => setCartOpen(false)} className="p-2 hover:bg-white rounded-full transition-colors" aria-label="Close"><X className="w-5 h-5" /></button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center mb-4">
                  <ShoppingBag className="w-8 h-8 text-[#B4593F]" />
                </div>
                <div className="font-serif-display text-2xl mb-2">Your bag is empty</div>
                <p className="text-sm text-neutral-600 mb-6">Let's fill it with hope and grace.</p>
                <Link to="/shop" onClick={() => setCartOpen(false)} className="inline-flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#B4593F] text-white px-6 py-3 rounded-full text-xs uppercase tracking-[0.2em] transition-colors">
                  Start Shopping <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <div className="space-y-5">
                {items.map(it => (
                  <div key={it.id} className="flex gap-4 bg-white p-3 rounded-xl border border-[#EBD9CE]">
                    <img src={it.image} alt={it.name} className="w-20 h-24 object-cover rounded-lg" />
                    <div className="flex-1 flex flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-medium line-clamp-2 leading-snug">{it.name}</div>
                          <div className="text-[11px] italic text-neutral-500 mt-0.5">{it.verse}</div>
                        </div>
                        <button onClick={() => removeItem(it.id)} aria-label="Remove" className="text-neutral-400 hover:text-[#B4593F] transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                      <div className="mt-auto flex items-center justify-between pt-2">
                        <div className="inline-flex items-center border border-[#EBD9CE] rounded-full">
                          <button onClick={() => updateQty(it.id, it.qty - 1)} className="w-7 h-7 flex items-center justify-center hover:bg-[#FDF3EB] rounded-full" aria-label="Decrease"><Minus className="w-3 h-3" /></button>
                          <span className="w-8 text-center text-sm">{it.qty}</span>
                          <button onClick={() => updateQty(it.id, it.qty + 1)} className="w-7 h-7 flex items-center justify-center hover:bg-[#FDF3EB] rounded-full" aria-label="Increase"><Plus className="w-3 h-3" /></button>
                        </div>
                        <div className="text-[#B4593F] font-semibold text-sm">₹{(it.price * it.qty).toLocaleString('en-IN')}</div>
                      </div>
                    </div>
                  </div>
                ))}
                <button onClick={clearCart} className="text-xs text-neutral-500 hover:text-[#B4593F] uppercase tracking-widest">Clear bag</button>
              </div>
            )}
          </div>

          {items.length > 0 && (
            <div className="px-6 py-5 border-t border-[#EBD9CE] bg-white">
              <div className="flex items-center justify-between mb-3 text-sm">
                <span className="text-neutral-600">Subtotal</span>
                <span className="font-semibold">₹{totals.subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between mb-5 text-xs text-neutral-500">
                <span>Shipping</span>
                <span>{totals.subtotal >= 999 ? 'Free' : 'Calculated at checkout'}</span>
              </div>
              <button className="w-full bg-[#1A1A1A] hover:bg-[#B4593F] transition-colors text-white py-4 rounded-full text-xs uppercase tracking-[0.2em] inline-flex items-center justify-center gap-2">
                Proceed to Checkout <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={() => setCartOpen(false)} className="w-full mt-3 text-xs uppercase tracking-[0.2em] text-neutral-600 hover:text-[#B4593F]">Continue Shopping</button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default CartDrawer;
