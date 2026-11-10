import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { fetchProducts, fetchSubcategories, fetchSubcategory } from '../lib/api';
import { SlidersHorizontal, ChevronDown, X, ArrowLeft } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useContentText } from '../context/ContentContext';
import { useCategories } from '../hooks/useCategories';

const normalize = (p) => ({ ...p, originalPrice: p.original_price ?? p.originalPrice, hoverImage: p.hover_image ?? p.hoverImage });

const Shop = () => {
  const { categorySlug, subSlug } = useParams();
  const [searchParams] = useSearchParams();
  const q = (searchParams.get('q') || '').toLowerCase();
  const wishlistView = searchParams.get('wishlist') === '1';
  const { wishlist } = useCart();
  const [sort, setSort] = useState('featured');
  const [priceRange, setPriceRange] = useState([0, 5000]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [products, setProducts] = useState([]);
  // Load state for the product fetch (mirrors the pattern used on Home so
  // the shop grid recovers gracefully when a mobile network drops packets).
  const [loadState, setLoadState] = useState('loading'); // loading | ready | error
  const [subcategories, setSubcategories] = useState([]);
  const [subDetail, setSubDetail] = useState(null);   // hydrated when subSlug is present
  const { items: cats } = useCategories();
  const shopTitle = useContentText('shop.title');
  const shopSubtitle = useContentText('shop.subtitle');
  const filtersLabel = useContentText('shop.filters.title');
  const emptyTitle = useContentText('shop.empty.title');
  const emptyBody = useContentText('shop.empty.body');

  const loadProducts = useCallback(() => {
    setLoadState('loading');
    fetchProducts({ category: categorySlug || undefined, subcategory: subSlug || undefined, q: q || undefined, sort, limit: 100 })
      .then(res => { setProducts((res.items || []).map(normalize)); setLoadState('ready'); })
      .catch(() => { setProducts([]); setLoadState('error'); });
  }, [categorySlug, subSlug, q, sort]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  // Load subcategories for the current parent category (used both to render the strip on the category page and for nav on the subcategory page)
  useEffect(() => {
    if (!categorySlug) { setSubcategories([]); return; }
    fetchSubcategories(categorySlug).then(setSubcategories).catch(() => setSubcategories([]));
  }, [categorySlug]);

  // Load subcategory detail when we're on a subcategory page
  useEffect(() => {
    if (!subSlug || !categorySlug) { setSubDetail(null); return; }
    fetchSubcategory(subSlug, categorySlug).then(setSubDetail).catch(() => setSubDetail(null));
  }, [subSlug, categorySlug]);

  const currentCategory = cats.find(c => c.slug === categorySlug);

  const list = useMemo(() => {
    let arr = wishlistView ? wishlist : products;
    arr = arr.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1]);
    return arr;
  }, [products, priceRange, wishlist, wishlistView]);

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [categorySlug, subSlug]);

  const title = wishlistView
    ? 'Your Wishlist'
    : subDetail
      ? (subDetail.title || subDetail.name)
      : currentCategory
        ? currentCategory.name
        : q ? `Search: "${q}"` : shopTitle;
  const subtitle = wishlistView
    ? 'Saved items just for you'
    : subDetail
      ? (subDetail.description || '')
      : currentCategory?.tagline || shopSubtitle;

  return (
    <main className="pt-6 pb-24">
      <div className="bg-gradient-to-b from-[#F5D0CE]/40 to-[#FDF3EB] py-14">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
          <nav className="text-[11px] uppercase tracking-[0.2em] text-neutral-500 mb-4">
            <Link to="/" className="hover:text-[#B4593F]">Home</Link>
            <span className="mx-2">/</span>
            <Link to="/shop" className="hover:text-[#B4593F]">Shop</Link>
            {currentCategory && (
              <>
                <span className="mx-2">/</span>
                {subDetail ? (
                  <Link to={`/shop/${currentCategory.slug}`} className="hover:text-[#B4593F]">{currentCategory.name}</Link>
                ) : (
                  <span className="text-[#B4593F]">{currentCategory.name}</span>
                )}
              </>
            )}
            {subDetail && (<><span className="mx-2">/</span><span className="text-[#B4593F]">{subDetail.name}</span></>)}
          </nav>
          <div className="flex items-start gap-6 flex-wrap">
            {subDetail?.image && (
              <img src={subDetail.image} alt={subDetail.name} className="w-32 h-40 md:w-40 md:h-48 rounded-2xl object-cover border border-[#EBD9CE] shrink-0" data-testid="subcategory-hero-image" />
            )}
            <div className="min-w-0">
              <h1 className="font-serif-display text-5xl md:text-6xl text-[#213a60]" data-testid="shop-title">{title}</h1>
              {subtitle && <p className="text-neutral-600 mt-3 max-w-2xl">{subtitle}</p>}
              {subDetail && (
                <Link to={`/shop/${currentCategory.slug}`} className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#B4593F] hover:text-[#213a60] mt-4">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to {currentCategory.name}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Subcategory strip — shown on the category landing when subcategories exist */}
      {!wishlistView && !subDetail && currentCategory && subcategories.length > 0 && (
        <section className="max-w-[1400px] mx-auto px-6 lg:px-10 py-10">
          <div className="text-[11px] uppercase tracking-[0.3em] text-[#B4593F] mb-4" data-testid="subcategory-strip-eyebrow">Browse by type</div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {subcategories.map(s => (
              <Link
                key={s.id}
                to={`/shop/${currentCategory.slug}/${s.slug}`}
                data-testid={`subcategory-tile-${s.slug}`}
                className="group relative block overflow-hidden rounded-2xl border border-[#EBD9CE]/60 bg-[#F5D0CE]/30"
              >
                <div className="aspect-[4/5] relative">
                  {s.image && (
                    <img src={s.image} alt={s.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <div className="font-serif-display text-2xl leading-tight">{s.name}</div>
                    <div className="text-[10px] uppercase tracking-[0.15em] opacity-90 mt-1">{s.product_count || 0} item{s.product_count === 1 ? '' : 's'}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!wishlistView && (
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-2" />
      )}

      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 flex items-center justify-between gap-3 border-y border-[#EBD9CE] py-3 md:py-4 mb-6 md:mb-8">
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          <button onClick={() => setFilterOpen(true)} data-testid="shop-filters-btn" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] py-2.5">
            <SlidersHorizontal className="w-4 h-4" /> {filtersLabel}
          </button>
          <span className="text-xs text-neutral-500 whitespace-nowrap" data-testid="shop-product-count">{list.length} products</span>
        </div>
        <div className="relative shrink-0">
          <select value={sort} onChange={e => setSort(e.target.value)} data-testid="shop-sort-select" className="appearance-none bg-transparent border border-[#EBD9CE] rounded-full pl-4 md:pl-5 pr-9 md:pr-10 py-2.5 text-[11px] md:text-xs uppercase tracking-[0.1em] md:tracking-[0.15em] cursor-pointer hover:border-[#B4593F] transition-colors max-w-[150px] md:max-w-none">
            <option value="featured">Featured</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
          <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500" />
        </div>
      </div>

      <div onClick={() => setFilterOpen(false)} className={`fixed inset-0 bg-black/50 z-40 transition-opacity ${filterOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} />
      <aside className={`fixed top-0 left-0 h-full w-full sm:w-[360px] bg-white z-40 p-6 overflow-y-auto transition-[transform,visibility] duration-500 ${filterOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full invisible'}`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-serif-display text-2xl">Filters</h3>
          <button onClick={() => setFilterOpen(false)} data-testid="shop-filters-close" className="w-10 h-10 -mr-2 flex items-center justify-center" aria-label="Close filters"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-6">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-[#B4593F] mb-3">Price Range</div>
            <input type="range" min="0" max="5000" step="100" value={priceRange[1]} onChange={e => setPriceRange([0, +e.target.value])} className="w-full accent-[#B4593F]" />
            <div className="flex justify-between text-xs text-neutral-600 mt-2"><span>₹0</span><span>₹{priceRange[1].toLocaleString('en-IN')}</span></div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-[#B4593F] mb-3">Category</div>
            <div className="space-y-2">
              {cats.filter(c => !c.comingSoon).map(c => (
                <Link key={c.id} to={`/shop/${c.slug}`} onClick={() => setFilterOpen(false)} className={`block text-sm px-4 py-2 rounded ${currentCategory?.slug === c.slug ? 'bg-[#FDF3EB] text-[#B4593F]' : 'hover:bg-[#FDF3EB]'}`}>{c.name}</Link>
              ))}
            </div>
          </div>
        </div>
      </aside>

      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        {list.length === 0 ? (
          <div className="text-center py-20">
            <div className="font-serif-display text-3xl mb-3">{emptyTitle}</div>
            <p className="text-neutral-600 mb-6">{emptyBody}</p>
            <Link to="/shop" className="inline-flex items-center gap-2 bg-[#213a60] hover:bg-[#B4593F] text-white px-6 py-3 rounded-full text-xs uppercase tracking-[0.2em] transition-colors">Browse All</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-7">
            {list.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </main>
  );
};

export default Shop;
