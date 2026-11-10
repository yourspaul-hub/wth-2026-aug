import React from 'react';
import { Link } from 'react-router-dom';
import { X, Minus, Plus, ShoppingBag, ArrowRight, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';

const CartDrawer = () => {
  const { isCartOpen, setCartOpen, items, updateQty, removeItem, totals, clearCart } = useCart();
  const { format } = useCurrency();
  const { t } = useTranslation();

  return (
    <>
      <div
        onClick={() => setCartOpen(false)}
        className={`fixed inset-0 bg-black/50 z-50 transition-opacity duration-500 ${isCartOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />
      <aside data-testid="cart-drawer" className={`fixed top-0 right-0 h-full w-full sm:w-[440px] bg-[#FDF3EB] z-50 transition-[transform,visibility] duration-500 ${isCartOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full invisible'}`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-6 py-5 border-b border-[#EBD9CE]">
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-5 h-5 text-[#B4593F]" />
              <h3 className="font-serif-display text-2xl">{t('cart.title')} <span className="text-neutral-500 text-base">({totals.count})</span></h3>
            </div>
            <button onClick={() => setCartOpen(false)} data-testid="cart-drawer-close" className="p-2 hover:bg-white rounded-full transition-colors" aria-label="Close"><X className="w-5 h-5" /></button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center mb-4">
                  <ShoppingBag className="w-8 h-8 text-[#B4593F]" />
                </div>
                <div className="font-serif-display text-2xl mb-2">{t('cart.empty_title')}</div>
                <p className="text-sm text-neutral-600 mb-6">{t('cart.empty_subtitle')}</p>
                <Link to="/shop" onClick={() => setCartOpen(false)} className="inline-flex items-center gap-2 bg-[#213a60] hover:bg-[#B4593F] text-white px-6 py-3 rounded-full text-xs uppercase tracking-[0.2em] transition-colors">
                  {t('cart.start_shopping')} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <div className="space-y-5">
                {items.map(it => {
                  const base = it.variant_id ? `${it.id}::${it.variant_id}` : it.id;
                  const key = it.customization ? `${base}##${it.customization}` : base;
                  return (
                  <div key={key} className="flex gap-4 bg-white p-3 rounded-xl border border-[#EBD9CE]">
                    <img src={it.image} alt={it.name} className="w-20 h-24 object-cover rounded-lg" />
                    <div className="flex-1 flex flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-medium line-clamp-2 leading-snug">{it.name}</div>
                          {it.variant_label && <div className="text-[11px] text-neutral-500 mt-0.5">{it.variant_label}</div>}
                          <div className="text-[11px] italic text-neutral-500 mt-0.5">{it.verse}</div>
                          {it.customization && <div className="text-[10px] italic text-[#B4593F] mt-0.5" data-testid="cart-item-customization">✎ {it.customization}{it.personalization_cost ? <span className="not-italic text-neutral-600"> · +{format(it.personalization_cost)}/unit</span> : null}</div>}
                        </div>
                        <button onClick={() => removeItem(key)} aria-label="Remove" className="text-neutral-400 hover:text-[#B4593F] transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                      <div className="mt-auto flex items-center justify-between pt-2">
                        <div className="inline-flex items-center border border-[#EBD9CE] rounded-full">
                          <button onClick={() => updateQty(key, it.qty - 1)} className="w-7 h-7 flex items-center justify-center hover:bg-[#FDF3EB] rounded-full" aria-label="Decrease"><Minus className="w-3 h-3" /></button>
                          <span className="w-8 text-center text-sm">{it.qty}</span>
                          <button onClick={() => updateQty(key, it.qty + 1)} className="w-7 h-7 flex items-center justify-center hover:bg-[#FDF3EB] rounded-full" aria-label="Increase"><Plus className="w-3 h-3" /></button>
                        </div>
                        <div className="text-[#B4593F] font-semibold text-sm">{format(it.price * it.qty)}</div>
                      </div>
                    </div>
                  </div>
                );})}
                <button onClick={clearCart} className="text-xs text-neutral-500 hover:text-[#B4593F] uppercase tracking-widest">{t('cart.clear_bag')}</button>
              </div>
            )}
          </div>

          {items.length > 0 && (
            <div className="px-6 py-5 border-t border-[#EBD9CE] bg-white">
              <div className="flex items-center justify-between mb-3 text-sm">
                <span className="text-neutral-600">{t('common.subtotal')}</span>
                <span className="font-semibold" data-testid="cart-subtotal">{format(totals.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between mb-5 text-xs text-neutral-500">
                <span>{t('common.shipping')}</span>
                <span>{totals.subtotal >= 999 ? t('common.free') : 'Calculated at checkout'}</span>
              </div>
              <Link to="/checkout" onClick={() => setCartOpen(false)} className="w-full bg-[#213a60] hover:bg-[#B4593F] transition-colors text-white py-4 rounded-full text-xs uppercase tracking-[0.2em] inline-flex items-center justify-center gap-2">
                {t('common.proceed_to_checkout')} <ArrowRight className="w-4 h-4" />
              </Link>
              <button onClick={() => setCartOpen(false)} className="w-full mt-3 text-xs uppercase tracking-[0.2em] text-neutral-600 hover:text-[#B4593F]">{t('common.continue_shopping')}</button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default CartDrawer;
