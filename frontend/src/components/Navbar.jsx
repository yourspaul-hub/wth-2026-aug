import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingBag, Heart, Search, Menu, X, Instagram } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCart } from '../context/CartContext';
import { useCategories } from '../hooks/useCategories';
import Logo from './Logo';
import LangCurrencyMenu from './LangCurrencyMenu';

const Navbar = () => {
  const { totals, setCartOpen, wishlist } = useCart();
  const { items: categories } = useCategories();
  const { t } = useTranslation();
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
        {/* ============ DESKTOP LAYOUT (>= lg) ============ */}
        {/* Logo far-left | Menu centered on screen | Actions far-right */}
        <div className="hidden lg:grid items-center h-20 gap-6 grid-cols-[1fr_auto_1fr]">
          <Link to="/" className="flex flex-col items-start shrink-0" aria-label="Wear The Hope home">
            <Logo variant="dark" withTagline className="h-11" />
          </Link>
          <nav className="flex items-center gap-7 text-[13px] uppercase tracking-[0.15em] text-[#213a60] justify-self-center">
            <Link to="/" className="link-underline">{t('nav.home')}</Link>
            <div className="relative" onMouseEnter={() => setShopOpen(true)} onMouseLeave={() => setShopOpen(false)}>
              <button className="link-underline flex items-center gap-1 uppercase">{t('nav.shop')}</button>
              <div className={`absolute left-1/2 -translate-x-1/2 top-full pt-4 transition-all duration-300 ${shopOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'}`}>
                <div className="bg-white rounded-md shadow-2xl border border-[#EBD9CE] p-6 grid grid-cols-2 gap-1 w-[520px]">
                  {categories.map(c => (
                    <Link key={c.id} to={`/shop/${c.slug}`} className="group flex items-center gap-3 px-3 py-2.5 rounded hover:bg-[#FDF3EB] transition-colors">
                      <img src={c.image} alt={c.name} className="w-10 h-10 object-cover rounded" />
                      <div>
                        <div className="text-[13px] font-medium normal-case tracking-normal text-[#213a60] group-hover:text-[#B4593F]">{c.name}</div>
                        <div className="text-[11px] normal-case tracking-normal text-neutral-500">{c.tagline}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
            <Link to="/shop" className="link-underline">{t('nav.collections')}</Link>
            <Link to="/about" className="link-underline">{t('nav.about')}</Link>
            <Link to="/blog" className="link-underline">{t('nav.blog')}</Link>
            <Link to="/contact" className="link-underline">{t('nav.contact')}</Link>
          </nav>
          <div className="flex items-center gap-2 justify-self-end shrink-0">
            <LangCurrencyMenu />
            <button onClick={() => setSearchOpen(v => !v)} className="p-2.5 rounded-full hover:bg-[#F5D0CE]/60 transition-colors" aria-label={t('nav.search')} data-testid="nav-search-btn">
              <Search className="w-4 h-4" />
            </button>
            <a href="https://www.instagram.com/wearthehope" target="_blank" rel="noreferrer" className="p-2.5 rounded-full hover:bg-[#F5D0CE]/60 transition-colors">
              <Instagram className="w-4 h-4" />
            </a>
            <Link to="/wishlist" className="relative p-2.5 rounded-full hover:bg-[#F5D0CE]/60 transition-colors" aria-label={t('nav.wishlist')} data-testid="nav-wishlist-btn">
              <Heart className="w-4 h-4" />
              {wishlist.length > 0 && <span className="absolute -top-0.5 -right-0.5 bg-[#B4593F] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center" data-testid="nav-wishlist-count">{wishlist.length}</span>}
            </Link>
            <button onClick={() => setCartOpen(true)} className="relative p-2.5 rounded-full hover:bg-[#F5D0CE]/60 transition-colors" aria-label={t('nav.bag')} data-testid="nav-cart-btn">
              <ShoppingBag className="w-4 h-4" />
              {totals.count > 0 && <span className="absolute -top-0.5 -right-0.5 bg-[#B4593F] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{totals.count}</span>}
            </button>
          </div>
        </div>

        {/* ============ TABLET LAYOUT (md .. lg) ============ */}
        {/* Hamburger left | Logo center | Search + Lang/Cur + Cart right */}
        <div className="hidden md:grid lg:hidden grid-cols-[1fr_auto_1fr] items-center h-20 gap-4">
          <div className="flex items-center">
            <button className="p-2 -ml-2" onClick={() => setMobileOpen(v => !v)} aria-label="Menu" data-testid="nav-menu-btn-tablet">
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
          <Link to="/" className="flex flex-col items-center justify-self-center" aria-label="Wear The Hope home">
            <Logo variant="dark" withTagline className="h-10" />
          </Link>
          <div className="flex items-center justify-end gap-1 md:gap-2">
            <button onClick={() => setSearchOpen(v => !v)} className="p-2.5 rounded-full hover:bg-[#F5D0CE]/60 transition-colors" aria-label={t('nav.search')} data-testid="nav-search-btn-tablet">
              <Search className="w-4 h-4" />
            </button>
            <LangCurrencyMenu />
            <button onClick={() => setCartOpen(true)} className="relative p-2.5 rounded-full hover:bg-[#F5D0CE]/60 transition-colors" aria-label={t('nav.bag')} data-testid="nav-cart-btn-tablet">
              <ShoppingBag className="w-4 h-4" />
              {totals.count > 0 && <span className="absolute -top-0.5 -right-0.5 bg-[#B4593F] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{totals.count}</span>}
            </button>
          </div>
        </div>

        {/* ============ MOBILE LAYOUT (< md) ============ */}
        {/* Hamburger left | Logo center | Cart right */}
        <div className="grid md:hidden grid-cols-[1fr_auto_1fr] items-center h-16 gap-4">
          <div className="flex items-center">
            <button className="p-2 -ml-2" onClick={() => setMobileOpen(v => !v)} aria-label="Menu" data-testid="nav-menu-btn">
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
          <Link to="/" className="flex flex-col items-center justify-self-center" aria-label="Wear The Hope home">
            <Logo variant="dark" withTagline className="h-9" />
          </Link>
          <div className="flex items-center justify-end">
            <button onClick={() => setCartOpen(true)} className="relative p-2.5 rounded-full hover:bg-[#F5D0CE]/60 transition-colors" aria-label={t('nav.bag')} data-testid="nav-cart-btn">
              <ShoppingBag className="w-4 h-4" />
              {totals.count > 0 && <span className="absolute -top-0.5 -right-0.5 bg-[#B4593F] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{totals.count}</span>}
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className={`overflow-hidden transition-all duration-300 ${searchOpen ? 'max-h-24 pb-4' : 'max-h-0'}`}>
          <form onSubmit={submitSearch} className="flex items-center gap-3 bg-white border border-[#EBD9CE] rounded-full px-5 py-3">
            <Search className="w-4 h-4 text-neutral-500" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder={t('nav.search_placeholder')} className="flex-1 bg-transparent outline-none text-sm" />
            <button type="submit" className="text-xs uppercase tracking-widest bg-[#B4593F] hover:bg-[#9E4B32] text-white px-4 py-1.5 rounded-full transition-colors">{t('nav.search')}</button>
          </form>
        </div>

        {/* Mobile menu */}
        <div className={`lg:hidden overflow-hidden transition-all duration-500 ${mobileOpen ? 'max-h-[720px] pb-6' : 'max-h-0'}`}>
          <div className="pt-2 flex flex-col gap-1">
            <form onSubmit={submitSearch} className="flex items-center gap-3 bg-white border border-[#EBD9CE] rounded-full px-4 py-2.5 mb-2" data-testid="mobile-search-form">
              <Search className="w-4 h-4 text-neutral-500" />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder={t('nav.search_placeholder')} className="flex-1 bg-transparent outline-none text-sm" />
            </form>
            {['Home','SHOP','About','Blog','Contact'].map(l => (
              <Link key={l} to={l === 'Home' ? '/' : l === 'Blog' ? '/blog' : l === 'SHOP' ? '/shop' : `/${l.toLowerCase()}`} className="py-3 border-b border-[#EBD9CE] uppercase text-sm tracking-[0.15em]">{l}</Link>
            ))}
            <Link to="/wishlist" data-testid="mobile-wishlist-link" className="py-3 border-b border-[#EBD9CE] uppercase text-sm tracking-[0.15em] flex items-center justify-between">
              <span className="inline-flex items-center gap-2"><Heart className="w-4 h-4" /> {t('nav.wishlist')}</span>
              {wishlist.length > 0 && <span className="bg-[#B4593F] text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center">{wishlist.length}</span>}
            </Link>
            <div className="grid grid-cols-2 gap-2 pt-4">
              {categories.slice(0,8).map(c => (
                <Link key={c.id} to={`/shop/${c.slug}`} className="text-xs py-2 px-3 rounded bg-white border border-[#EBD9CE]">{c.name}</Link>
              ))}
            </div>
            <div className="pt-4 flex items-center justify-between border-t border-[#EBD9CE] mt-2">
              <span className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">Language & Currency</span>
              <LangCurrencyMenu />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
