import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Heart, ShoppingBag, Trash2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import { imgProps } from '../lib/imgSrc';
import RecentlyViewed from '../components/RecentlyViewed';

const Wishlist = () => {
  const { t } = useTranslation();
  const { wishlist, toggleWishlist, addToCart } = useCart();
  const { format } = useCurrency();

  const clearAll = () => {
    if (!wishlist.length) return;
    if (!window.confirm('Remove all items from wishlist?')) return;
    wishlist.forEach(p => toggleWishlist(p));
    toast('Wishlist cleared');
  };

  const moveAll = () => {
    if (!wishlist.length) return;
    const count = wishlist.length;
    wishlist.forEach(p => { addToCart(p, 1); toggleWishlist(p); });
    toast.success(`${count} item(s) moved to bag`);
  };

  const moveOne = (p) => {
    addToCart(p, 1);
    toggleWishlist(p);
    toast.success(`${p.name} moved to bag`);
  };

  return (
    <main className="pt-6 pb-24" data-testid="wishlist-page">
      <Helmet>
        <title>{`${t('wishlist.title')} | Wear The Hope`}</title>
        <meta name="robots" content="noindex,follow" />
      </Helmet>

      <div className="bg-gradient-to-b from-[#F5D0CE]/40 to-[#FDF3EB] py-14">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
          <nav className="text-[11px] uppercase tracking-[0.2em] text-neutral-500 mb-4">
            <Link to="/" className="hover:text-[#B4593F]">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-[#B4593F]">{t('wishlist.title')}</span>
          </nav>
          <h1 className="font-serif-display text-5xl md:text-6xl text-[#1A1A1A] flex items-center gap-4">
            <Heart className="w-10 h-10 text-[#B4593F]" />
            {t('wishlist.title')}
          </h1>
          <p className="text-neutral-600 mt-3">{t('wishlist.subtitle')} · <span data-testid="wishlist-count">{t('wishlist.items_saved', { count: wishlist.length })}</span></p>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 pt-10">
        {wishlist.length === 0 ? (
          <div className="text-center py-20 max-w-md mx-auto" data-testid="wishlist-empty">
            <div className="w-20 h-20 rounded-full bg-white mx-auto mb-5 flex items-center justify-center border border-[#EBD9CE]">
              <Heart className="w-8 h-8 text-[#B4593F]" />
            </div>
            <h2 className="font-serif-display text-3xl mb-3">{t('wishlist.empty_title')}</h2>
            <p className="text-neutral-600 mb-6">{t('wishlist.empty_subtitle')}</p>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#B4593F] text-white px-6 py-3 rounded-full text-xs uppercase tracking-[0.2em] transition-colors"
              data-testid="wishlist-browse-shop"
            >
              {t('wishlist.browse_shop')} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-end gap-3 mb-6">
              <button
                onClick={moveAll}
                className="inline-flex items-center gap-2 bg-[#B4593F] hover:bg-[#9E4B32] text-white px-5 py-2.5 rounded-full text-[11px] uppercase tracking-[0.2em] transition-colors"
                data-testid="wishlist-move-all"
              >
                <ShoppingBag className="w-3.5 h-3.5" /> {t('wishlist.move_all_to_bag')}
              </button>
              <button
                onClick={clearAll}
                className="inline-flex items-center gap-2 text-neutral-500 hover:text-red-500 px-3 py-2.5 text-[11px] uppercase tracking-[0.2em] transition-colors"
                data-testid="wishlist-clear"
              >
                <Trash2 className="w-3.5 h-3.5" /> {t('wishlist.clear')}
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-7" data-testid="wishlist-grid">
              {wishlist.map(p => (
                <div key={p.id} className="group" data-testid={`wishlist-item-${p.id}`}>
                  <Link to={`/product/${p.id}`} className="block relative aspect-[4/5] overflow-hidden rounded-xl bg-white border border-[#EBD9CE]/70">
                    <img
                      {...imgProps(p.image, { width: 600, height: 750, sizes: '(max-width: 768px) 50vw, 25vw' })}
                      alt={p.name}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <button
                      onClick={(e) => { e.preventDefault(); toggleWishlist(p); toast(`Removed ${p.name} from wishlist`); }}
                      aria-label="Remove from wishlist"
                      className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 hover:bg-[#B4593F] hover:text-white shadow flex items-center justify-center transition-colors"
                      data-testid={`wishlist-remove-${p.id}`}
                    >
                      <Heart className="w-4 h-4 fill-current text-[#B4593F] group-hover:text-white" />
                    </button>
                  </Link>
                  <div className="pt-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-medium line-clamp-1 group-hover:text-[#B4593F] transition-colors">{p.name}</h3>
                    </div>
                    {p.verse && <p className="text-[11px] italic text-neutral-500 mt-1 line-clamp-1">{p.verse}</p>}
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="text-[#B4593F] font-semibold text-sm">{format(p.price)}</span>
                      {p.originalPrice > p.price && (
                        <span className="text-xs text-neutral-400 line-through">{format(p.originalPrice)}</span>
                      )}
                    </div>
                    <button
                      onClick={() => moveOne(p)}
                      className="mt-3 w-full inline-flex items-center justify-center gap-2 bg-[#1A1A1A] hover:bg-[#B4593F] text-white text-[10px] uppercase tracking-[0.2em] py-2.5 rounded-full transition-colors"
                      data-testid={`wishlist-move-${p.id}`}
                    >
                      <ShoppingBag className="w-3 h-3" /> {t('common.move_to_bag')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <RecentlyViewed />
      </div>
    </main>
  );
};

export default Wishlist;
