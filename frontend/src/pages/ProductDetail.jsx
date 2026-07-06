import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { products as mockProducts } from '../mock/mock';
import { fetchProduct } from '../lib/api';
import { useCart } from '../context/CartContext';
import { Heart, ShoppingBag, Minus, Plus, Truck, Sparkles, RefreshCw, Star, Share2, ChevronRight } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { toast } from 'sonner';

const normalize = (p) => ({ ...p, originalPrice: p.original_price ?? p.originalPrice, hoverImage: p.hover_image ?? p.hoverImage });

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart, toggleWishlist, inWishlist } = useCart();
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [tab, setTab] = useState('details');
  const [customName, setCustomName] = useState('');

  useEffect(() => {
    setLoading(true);
    fetchProduct(id).then(({ product, related }) => {
      setProduct(normalize(product));
      setRelated((related || []).map(normalize));
      setLoading(false);
    }).catch(() => {
      const fallback = mockProducts.find(p => p.id === id);
      if (fallback) setProduct(fallback);
      setRelated([]);
      setLoading(false);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setActiveImg(0); setQty(1);
  }, [id]);

  if (loading) return <main className="min-h-[60vh] flex items-center justify-center"><div className="w-10 h-10 border-4 border-[#B4593F] border-t-transparent rounded-full animate-spin" /></main>;

  if (!product) {
    return (
      <main className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="font-serif-display text-4xl mb-3">Product not found</div>
          <button onClick={() => navigate('/shop')} className="text-sm underline">Back to shop</button>
        </div>
      </main>
    );
  }

  const gallery = [product.image, product.hoverImage, product.image].filter(Boolean);
  const wished = inWishlist(product.id);

  const handleAdd = () => {
    addToCart({ ...product, customization: customName || undefined }, qty);
    toast.success(`Added ${qty} × ${product.name} to bag`);
  };

  const productJsonLd = {
    '@context': 'https://schema.org', '@type': 'Product',
    'name': product.name,
    'image': [product.image, product.hoverImage].filter(Boolean),
    'description': product.description,
    'sku': product.id,
    'brand': { '@type': 'Brand', 'name': 'Wear The Hope' },
    'offers': {
      '@type': 'Offer', 'price': product.price, 'priceCurrency': 'INR',
      'availability': (product.stock ?? 100) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
    'aggregateRating': { '@type': 'AggregateRating', 'ratingValue': product.rating, 'reviewCount': product.reviews },
  };

  return (
    <main className="pt-6 pb-24">
      <Helmet>
        <title>{product.seo_title || `${product.name} | Wear The Hope`}</title>
        <meta name="description" content={product.seo_description || product.description?.slice(0, 160)} />
        {product.seo_keywords && <meta name="keywords" content={product.seo_keywords} />}
        <meta property="og:type" content="product" />
        <meta property="og:title" content={product.name} />
        <meta property="og:description" content={product.description} />
        <meta property="og:image" content={product.image} />
        <script type="application/ld+json">{JSON.stringify(productJsonLd)}</script>
      </Helmet>

      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        <nav className="text-[11px] uppercase tracking-[0.2em] text-neutral-500 mb-8">
          <Link to="/" className="hover:text-[#B4593F]">Home</Link>
          <ChevronRight className="inline w-3 h-3 mx-2" />
          <Link to="/shop" className="hover:text-[#B4593F]">Shop</Link>
          {product.category_slug && (<><ChevronRight className="inline w-3 h-3 mx-2" /><Link to={`/shop/${product.category_slug}`} className="hover:text-[#B4593F]">{product.category_name}</Link></>)}
          <ChevronRight className="inline w-3 h-3 mx-2" />
          <span className="text-[#B4593F]">{product.name}</span>
        </nav>

        <div className="grid lg:grid-cols-2 gap-12">
          <div className="flex gap-4">
            <div className="hidden md:flex flex-col gap-3 w-20 shrink-0">
              {gallery.map((img, i) => (
                <button key={i} onClick={() => setActiveImg(i)} className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${activeImg === i ? 'border-[#B4593F]' : 'border-transparent'}`}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
            <div className="flex-1 aspect-[4/5] rounded-2xl overflow-hidden bg-white border border-[#EBD9CE]">
              <img src={gallery[activeImg]} alt={product.name} className="w-full h-full object-cover transition-opacity duration-500" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              {product.tag && <span className="shimmer-badge text-white text-[10px] uppercase tracking-[0.15em] px-3 py-1 rounded-full">{product.tag}</span>}
              <span className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">SKU: WTH-{product.id.toUpperCase()}</span>
            </div>
            <h1 className="font-serif-display text-4xl md:text-5xl text-[#1A1A1A] leading-tight">{product.name}</h1>
            <div className="italic text-neutral-600 mt-2">{product.verse}</div>

            <div className="flex items-center gap-3 mt-4">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => <Star key={i} className={`w-4 h-4 ${i < Math.round(product.rating) ? 'fill-[#E8B364] stroke-[#E8B364]' : 'stroke-neutral-300'}`} />)}
              </div>
              <span className="text-sm text-neutral-600">{product.rating} ({product.reviews} reviews)</span>
            </div>

            <div className="flex items-baseline gap-3 mt-6">
              <div className="text-3xl font-serif-display text-[#B4593F]">₹{product.price.toLocaleString('en-IN')}</div>
              {product.originalPrice > product.price && (
                <>
                  <div className="text-lg text-neutral-400 line-through">₹{product.originalPrice.toLocaleString('en-IN')}</div>
                  <div className="text-xs uppercase tracking-widest text-[#B4593F]">Save {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%</div>
                </>
              )}
            </div>
            <div className="text-xs text-neutral-500 mt-1">Inclusive of all taxes</div>

            <p className="mt-6 text-neutral-700 leading-relaxed">{product.description}</p>

            {product.colors?.length > 0 && (
              <div className="mt-6">
                <div className="text-[11px] uppercase tracking-[0.2em] text-neutral-600 mb-2">Color</div>
                <div className="flex gap-2">
                  {product.colors.map((c, i) => (
                    <button key={i} className="w-9 h-9 rounded-full border-2 border-white ring-1 ring-[#EBD9CE] hover:ring-[#B4593F] transition-colors" style={{ background: c }} aria-label="Color" />
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 bg-[#FDF3EB] border border-[#EBD9CE] rounded-xl p-5">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[#B4593F] mb-3">
                <Sparkles className="w-3.5 h-3.5" /> Personalize (optional)
              </div>
              <input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="Type name or short verse to engrave" className="w-full bg-white border border-[#EBD9CE] rounded-full px-5 py-3 text-sm outline-none focus:border-[#B4593F] transition-colors" />
              <div className="text-[11px] text-neutral-500 mt-2">Free customization · Adds 2-3 days to delivery</div>
            </div>

            <div className="flex items-center gap-3 mt-8">
              <div className="inline-flex items-center border border-[#EBD9CE] rounded-full bg-white">
                <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-11 h-12 flex items-center justify-center hover:bg-[#FDF3EB] rounded-l-full"><Minus className="w-4 h-4" /></button>
                <span className="w-12 text-center">{qty}</span>
                <button onClick={() => setQty(q => q + 1)} className="w-11 h-12 flex items-center justify-center hover:bg-[#FDF3EB] rounded-r-full"><Plus className="w-4 h-4" /></button>
              </div>
              <button onClick={handleAdd} className="flex-1 bg-[#1A1A1A] hover:bg-[#B4593F] transition-colors text-white py-4 rounded-full text-xs uppercase tracking-[0.2em] inline-flex items-center justify-center gap-2">
                <ShoppingBag className="w-4 h-4" /> Add to Bag
              </button>
              <button onClick={() => toggleWishlist(product)} className={`w-12 h-12 rounded-full border border-[#EBD9CE] flex items-center justify-center hover:border-[#B4593F] transition-colors ${wished ? 'text-[#B4593F]' : ''}`} aria-label="Wishlist">
                <Heart className={`w-4 h-4 ${wished ? 'fill-current' : ''}`} />
              </button>
              <button className="w-12 h-12 rounded-full border border-[#EBD9CE] flex items-center justify-center hover:border-[#B4593F] transition-colors" aria-label="Share"><Share2 className="w-4 h-4" /></button>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-8 pt-6 border-t border-[#EBD9CE]">
              {[{ icon: Truck, l: 'Free Shipping', s: 'On orders ₹999+' }, { icon: RefreshCw, l: 'Easy Returns', s: '7-day window' }, { icon: Sparkles, l: 'Customize', s: 'Any language' }].map((a, i) => {
                const I = a.icon;
                return (
                  <div key={i} className="text-center">
                    <I className="w-5 h-5 text-[#B4593F] mx-auto mb-2" />
                    <div className="text-xs font-medium">{a.l}</div>
                    <div className="text-[10px] text-neutral-500">{a.s}</div>
                  </div>
                );
              })}
            </div>

            <div className="mt-10 border-t border-[#EBD9CE] pt-6">
              <div className="flex gap-6 text-xs uppercase tracking-[0.2em]">
                {['details', 'shipping', 'reviews'].map(t => (
                  <button key={t} onClick={() => setTab(t)} className={`pb-3 border-b-2 transition-colors ${tab === t ? 'border-[#B4593F] text-[#B4593F]' : 'border-transparent text-neutral-500'}`}>{t}</button>
                ))}
              </div>
              <div className="pt-5 text-sm text-neutral-700 leading-relaxed">
                {tab === 'details' && <p>Made with the finest materials and handcrafted attention to detail. Every design carries an intentional message drawn from scripture, meant to inspire and uplift.</p>}
                {tab === 'shipping' && <p>We ship pan-India within 3-5 business days. International shipping available (7-14 business days). Free shipping on all orders over ₹999 in India.</p>}
                {tab === 'reviews' && <p>Rated {product.rating}/5 across {product.reviews} customer reviews. Verified buyers love the quality and thoughtful presentation.</p>}
              </div>
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <div className="mt-24">
            <div className="flex items-end justify-between mb-8">
              <h2 className="font-serif-display text-3xl md:text-4xl">You may also love</h2>
              <Link to="/shop" className="text-xs uppercase tracking-[0.2em] link-underline">Shop All</Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-7">
              {related.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default ProductDetail;
