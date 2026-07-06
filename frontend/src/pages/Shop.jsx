import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { products as mockProducts, categories as mockCategories } from '../mock/mock';
import { fetchProducts, fetchCategories } from '../lib/api';
import { SlidersHorizontal, ChevronDown, X } from 'lucide-react';
import { useCart } from '../context/CartContext';

const normalize = (p) => ({ ...p, originalPrice: p.original_price ?? p.originalPrice, hoverImage: p.hover_image ?? p.hoverImage });

const Shop = () => {
  const { categorySlug } = useParams();
  const [searchParams] = useSearchParams();
  const q = (searchParams.get('q') || '').toLowerCase();
  const wishlistView = searchParams.get('wishlist') === '1';
  const { wishlist } = useCart();
  const [sort, setSort] = useState('featured');
  const [priceRange, setPriceRange] = useState([0, 5000]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [cats, setCats] = useState(mockCategories);

  useEffect(() => {
    fetchCategories().then(cs => { if (cs?.length) setCats(cs.map(c => ({ ...c, comingSoon: c.coming_soon }))); }).catch(() => {});
  }, []);

  useEffect(() => {
    fetchProducts({ category: categorySlug || undefined, q: q || undefined, sort, limit: 100 })
      .then(res => {
        const list = (res.items || []).map(normalize);
        setProducts(list);
      })
      .catch(() => setProducts(mockProducts));
  }, [categorySlug, q, sort]);

  const currentCategory = cats.find(c => c.slug === categorySlug);

  const list = useMemo(() => {
    let arr = wishlistView ? wishlist : products;
    arr = arr.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1]);
    return arr;
  }, [products, priceRange, wishlist, wishlistView]);

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [categorySlug]);

  const title = wishlistView ? 'Your Wishlist' : currentCategory ? currentCategory.name : q ? `Search: "${q}"` : 'All Collections';
  const subtitle = wishlistView ? 'Saved items just for you' : currentCategory?.tagline || 'Explore our full range';

  return (
    <main className="pt-6 pb-24">
      <div className="bg-gradient-to-b from-[#F5D0CE]/40 to-[#FDF3EB] py-14">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
          <nav className="text-[11px] uppercase tracking-[0.2em] text-neutral-500 mb-4">
            <Link to="/" className="hover:text-[#B4593F]">Home</Link>
            <span className="mx-2">/</span>
            <Link to="/shop" className="hover:text-[#B4593F]">Shop</Link>
            {currentCategory && <><span className="mx-2">/</span><span className="text-[#B4593F]">{currentCategory.name}</span></>}
          </nav>
          <h1 className="font-serif-display text-5xl md:text-6xl text-[#1A1A1A]">{title}</h1>
          <p className="text-neutral-600 mt-3">{subtitle}</p>
        </div>
      </div>

      {!wishlistView && (
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-6 flex flex-wrap gap-2 overflow-x-auto">
          <Link to="/shop" className={`text-xs uppercase tracking-[0.15em] px-5 py-2.5 rounded-full transition-colors ${!currentCategory ? 'bg-[#1A1A1A] text-white' : 'bg-white border border-[#EBD9CE] hover:border-[#B4593F]'}`}>All</Link>
          {cats.filter(c => !c.comingSoon).map(c => (
            <Link key={c.id} to={`/shop/${c.slug}`} className={`text-xs uppercase tracking-[0.15em] px-5 py-2.5 rounded-full transition-colors whitespace-nowrap ${currentCategory?.slug === c.slug ? 'bg-[#1A1A1A] text-white' : 'bg-white border border-[#EBD9CE] hover:border-[#B4593F]'}`}>{c.name}</Link>
          ))}
        </div>
      )}

      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 flex items-center justify-between border-y border-[#EBD9CE] py-4 mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => setFilterOpen(true)} className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em]">
            <SlidersHorizontal className="w-4 h-4" /> Filters
          </button>
          <span className="text-xs text-neutral-500">{list.length} products</span>
        </div>
        <div className="relative">
          <select value={sort} onChange={e => setSort(e.target.value)} className="appearance-none bg-transparent border border-[#EBD9CE] rounded-full pl-5 pr-10 py-2.5 text-xs uppercase tracking-[0.15em] cursor-pointer hover:border-[#B4593F] transition-colors">
            <option value="featured">Featured</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="rating">Top Rated</option>
          </select>
          <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500" />
        </div>
      </div>

      <div onClick={() => setFilterOpen(false)} className={`fixed inset-0 bg-black/50 z-40 transition-opacity ${filterOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} />
      <aside className={`fixed top-0 left-0 h-full w-full sm:w-[360px] bg-white z-40 shadow-2xl p-6 overflow-y-auto transition-transform duration-500 ${filterOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-serif-display text-2xl">Filters</h3>
          <button onClick={() => setFilterOpen(false)}><X className="w-5 h-5" /></button>
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
            <div className="font-serif-display text-3xl mb-3">Nothing here yet</div>
            <p className="text-neutral-600 mb-6">Try adjusting your filters or explore other collections.</p>
            <Link to="/shop" className="inline-flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#B4593F] text-white px-6 py-3 rounded-full text-xs uppercase tracking-[0.2em] transition-colors">Browse All</Link>
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
