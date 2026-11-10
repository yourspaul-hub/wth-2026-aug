import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { imgProps } from '../lib/imgSrc';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import { toast } from 'sonner';

const ProductCard = ({ product }) => {
  const [hover, setHover] = useState(false);
  const { addToCart, toggleWishlist, inWishlist } = useCart();
  const { format } = useCurrency();
  const { t } = useTranslation();
  const wished = inWishlist(product.id);
  const discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);

  const onAdd = (e) => {
    e.preventDefault();
    addToCart(product, 1);
    toast.success(`${product.name} ${t('common.added_to_bag')}`);
  };
  const onWish = (e) => {
    e.preventDefault();
    toggleWishlist(product);
    toast(wished ? t('common.removed_from_wishlist') : t('common.added_to_wishlist'));
  };

  return (
    <Link
      to={`/product/${product.id}`}
      className="group block"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-white border border-[#EBD9CE]/70">
        <img {...imgProps(product.image, { width: 600, height: 750, sizes: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw' })} alt={product.name} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${hover ? 'opacity-0' : 'opacity-100'}`} />
        {product.hoverImage && <img {...imgProps(product.hoverImage, { width: 600, height: 750, sizes: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw' })} alt={product.name} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${hover ? 'opacity-100' : 'opacity-0'}`} />}

        {/* Ribbon */}
        {(product.ribbon || product.tag) && (
          <span className={`absolute top-3 left-3 text-white text-[10px] uppercase tracking-[0.15em] px-3 py-1 rounded-full ${(product.ribbon === 'Sale' || product.ribbon === 'Best Seller' || product.tag?.toLowerCase().includes('bestseller')) ? 'shimmer-badge' : product.ribbon === 'New' ? 'bg-emerald-600' : product.ribbon === 'Trending' ? 'bg-[#B4593F]' : product.ribbon === 'Personalise' ? 'bg-[#213a60]' : 'shimmer-badge'}`}>
            {product.ribbon || product.tag}
          </span>
        )}
        {discount > 0 && (
          <span className="absolute top-3 right-3 bg-[#213a60] text-white text-[10px] uppercase tracking-[0.15em] px-3 py-1 rounded-full">-{discount}%</span>
        )}

        {/* Actions overlay */}
        <div className="absolute right-3 top-14 hidden md:flex flex-col gap-2 opacity-0 translate-x-3 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500">
          <button onClick={onWish} aria-label="Wishlist" className={`w-9 h-9 rounded-full bg-white shadow flex items-center justify-center hover:bg-[#B4593F] hover:text-white transition-colors ${wished ? 'text-[#B4593F]' : 'text-neutral-700'}`}>
            <Heart className={`w-4 h-4 ${wished ? 'fill-current' : ''}`} />
          </button>
          <button aria-label="Quick view" className="w-9 h-9 rounded-full bg-white shadow flex items-center justify-center hover:bg-[#B4593F] hover:text-white transition-colors text-neutral-700">
            <Eye className="w-4 h-4" />
          </button>
        </div>

        {/* Add to bag CTA */}
        <button
          onClick={onAdd}
          className="absolute bottom-3 left-3 right-3 bg-[#213a60] hover:bg-[#B4593F] text-white text-[11px] uppercase tracking-[0.2em] py-3 rounded-full hidden md:flex items-center justify-center gap-2 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500"
          data-testid={`product-card-add-${product.id}`}
        >
          <ShoppingBag className="w-3.5 h-3.5" /> {t('common.add_to_bag')}
        </button>
      </div>

      <div className="pt-4">
        <h3 className="text-sm font-medium text-[#213a60] group-hover:text-[#B4593F] transition-colors line-clamp-1">{product.name}</h3>
        <p className="text-[11px] italic text-neutral-500 mt-1 line-clamp-1">{product.verse}</p>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[#B4593F] font-semibold" data-testid={`product-card-price-${product.id}`}>{format(product.price)}</span>
          {product.originalPrice > product.price && (
            <span className="text-[12px] text-neutral-400 line-through">{format(product.originalPrice)}</span>
          )}
        </div>
        {product.colors?.length > 0 && (
          <div className="flex gap-1 mt-2">
            {product.colors.map((c, i) => (
              <span key={i} className="w-3 h-3 rounded-full border border-neutral-300" style={{ background: c }} />
            ))}
          </div>
        )}
      </div>
    </Link>
  );
};

export default ProductCard;
