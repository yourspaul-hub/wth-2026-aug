import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingBag, Heart, Search, Menu, X, Instagram } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { categories } from '../mock/mock';
import Logo from './Logo';

const Navbar = () => {
  const { totals, setCartOpen, wishlist } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); setShopOpen(false); }, [location.pathname]);

  const submitSearch = (e) => {
    e.preventDefault();
    if (query.trim()) { navigate(`/shop?q=${encodeURIComponent(query.trim())}`); setSearchOpen(false); setQuery(''); }
  };

  return (
    <header className={`sticky top-0 z-40 transition-all duration-500 ${scrolled ? 'bg-[#FDF3EB]/95 backdrop-blur-md shadow-[0_4px_20px_-12px_rgba(180,89,63,0.35)]' : 'bg-[#FDF3EB]/70 backdrop-blur-sm'}`}>
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        <div className="flex items-center justify-between h-20">
          {/* Left: nav */}
          <nav className="hidden lg:flex items-center gap-8 text-[13px] uppercase tracking-[0.15em] text-[#1A1A1A]">
            <Link to="/" className="link-underline">Home</Link>
            <div className="relative" onMouseEnter={() => setShopOpen(true)} onMouseLeave={() => setShopOpen(false)}>
              <button className="link-underline flex items-center gap-1">Shop</button>
              <div className={`absolute left-1/2 -translate-x-1/2 top-full pt-4 transition-all duration-300 ${shopOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'}`}>
                <div className="bg-white rounded-md shadow-2xl border border-[#EBD9CE] p-6 grid grid-cols-2 gap-1 w-[520px]">
                  {categories.map(c => (
                    <Link key={c.id} to={`/shop/${c.slug}`} className="group flex items-center gap-3 px-3 py-2.5 rounded hover:bg-[#FDF3EB] transition-colors">
                      <img src={c.image} alt={c.name} className="w-10 h-10 object-cover rounded" />
                      <div>
                        <div className="text-[13px] font-medium normal-case tracking-normal text-[#1A1A1A] group-hover:text-[#B4593F]">{c.name}</div>
                        <div className="text-[11px] normal-case tracking-normal text-neutral-500">{c.tagline}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
            <Link to="/shop" className="link-underline">Collections</Link>
            <Link to="/about" className="link-underline">About</Link>
            <Link to="/blog" className="link-underline">Journal</Link>
            <Link to="/contact" className="link-underline">Contact</Link>
          </nav>

          {/* Mobile toggle */}
          <button className="lg:hidden p-2 -ml-2" onClick={() => setMobileOpen(v => !v)} aria-label="Menu">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Center: logo */}
          <Link to="/" className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center" aria-label="Wear The Hope home">
            <Logo variant="dark" withTagline className="h-9 md:h-11" />
          </Link>

          {/* Right: icons */}
          <div className="flex items-center gap-1 md:gap-2">
            <button onClick={() => setSearchOpen(v => !v)} className="p-2.5 rounded-full hover:bg-[#F5D0CE]/60 transition-colors" aria-label="Search">
              <Search className="w-4 h-4" />
            </button>
            <a href="https://www.instagram.com/wearthehope" target="_blank" rel="noreferrer" className="hidden md:inline-flex p-2.5 rounded-full hover:bg-[#F5D0CE]/60 transition-colors">
              <Instagram className="w-4 h-4" />
            </a>
            <Link to="/shop?wishlist=1" className="relative p-2.5 rounded-full hover:bg-[#F5D0CE]/60 transition-colors">
              <Heart className="w-4 h-4" />
              {wishlist.length > 0 && <span className="absolute -top-0.5 -right-0.5 bg-[#B4593F] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{wishlist.length}</span>}
            </Link>
            <button onClick={() => setCartOpen(true)} className="relative p-2.5 rounded-full hover:bg-[#F5D0CE]/60 transition-colors">
              <ShoppingBag className="w-4 h-4" />
              {totals.count > 0 && <span className="absolute -top-0.5 -right-0.5 bg-[#B4593F] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{totals.count}</span>}
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className={`overflow-hidden transition-all duration-300 ${searchOpen ? 'max-h-24 pb-4' : 'max-h-0'}`}>
          <form onSubmit={submitSearch} className="flex items-center gap-3 bg-white border border-[#EBD9CE] rounded-full px-5 py-3">
            <Search className="w-4 h-4 text-neutral-500" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search for scripture wallets, tees, mugs..." className="flex-1 bg-transparent outline-none text-sm" />
            <button type="submit" className="text-xs uppercase tracking-widest bg-[#B4593F] hover:bg-[#9E4B32] text-white px-4 py-1.5 rounded-full transition-colors">Search</button>
          </form>
        </div>

        {/* Mobile menu */}
        <div className={`lg:hidden overflow-hidden transition-all duration-500 ${mobileOpen ? 'max-h-[600px] pb-6' : 'max-h-0'}`}>
          <div className="pt-2 flex flex-col gap-1">
            {['Home','Shop','About','Journal','Contact'].map(l => (
              <Link key={l} to={l === 'Home' ? '/' : l === 'Journal' ? '/blog' : `/${l.toLowerCase()}`} className="py-3 border-b border-[#EBD9CE] uppercase text-sm tracking-[0.15em]">{l}</Link>
            ))}
            <div className="grid grid-cols-2 gap-2 pt-4">
              {categories.slice(0,8).map(c => (
                <Link key={c.id} to={`/shop/${c.slug}`} className="text-xs py-2 px-3 rounded bg-white border border-[#EBD9CE]">{c.name}</Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
