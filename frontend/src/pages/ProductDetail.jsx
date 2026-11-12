import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { fetchProduct } from '../lib/api';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed';
import { Heart, ShoppingBag, Minus, Plus, Truck, Sparkles, RefreshCw, Share2, ChevronRight, Play, Package, Download, Ruler } from 'lucide-react';
import SizeChartModal from '../components/SizeChartModal';
import RelatedProducts from '../components/RelatedProducts';
import RecentlyViewed from '../components/RecentlyViewed';
import { toast } from 'sonner';

const normalize = (p) => ({ ...p, originalPrice: p.original_price ?? p.originalPrice, hoverImage: p.hover_image ?? p.hoverImage });

const youtubeEmbed = (url) => {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
};

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart, toggleWishlist, inWishlist } = useCart();
  const { format } = useCurrency();
  const { track } = useRecentlyViewed();
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [tab, setTab] = useState('shipping');
  const [customName, setCustomName] = useState('');
  const [selectedOptions, setSelectedOptions] = useState({});
  const [sizeChartOpen, setSizeChartOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchProduct(id).then(({ product, related }) => {
      const norm = normalize(product);
      setProduct(norm);
      setRelated((related || []).map(normalize));
      setLoading(false);
      track(norm);
      // Auto-select first variant options
      if (product?.variant_options?.length) {
        const init = {};
        product.variant_options.forEach(opt => { init[opt.name] = opt.values[0]; });
        setSelectedOptions(init);
      } else {
        setSelectedOptions({});
      }
    }).catch(() => {
      setProduct(null);
      setRelated([]);
      setLoading(false);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setActiveImg(0); setQty(1); setCustomName('');
  }, [id, track]);

  // Compute active variant based on selected options
  const activeVariant = useMemo(() => {
    if (!product?.variants?.length) return null;
    return product.variants.find(v => {
      const attrs = v.attrs || {};
      return Object.keys(selectedOptions).every(k => attrs[k] === selectedOptions[k]);
    }) || null;
  }, [product, selectedOptions]);

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

  const gallery = [product.image, product.hoverImage, ...(product.gallery || [])].filter((v, i, a) => v && a.indexOf(v) === i);
  const videos = product.videos || [];
  const wished = inWishlist(product.id);
  const displayPrice = activeVariant?.price ?? product.price;
  const displayOriginal = activeVariant?.original_price ?? product.originalPrice;
  const displaySku = activeVariant?.sku || product.sku || `WTH-${product.id.toUpperCase()}`;
  const displayStock = activeVariant?.stock ?? product.stock ?? 0;
  const inStock = displayStock > 0;

  const handleAdd = () => {
    if (product.variants?.length && !activeVariant) { toast.error('Please select all options'); return; }
    if (!inStock) { toast.error('Out of stock'); return; }
    const variantLabel = activeVariant ? Object.entries(activeVariant.attrs || {}).map(([k,v]) => `${k}: ${v}`).join(', ') : null;
    const trimmedCustom = (customName || '').trim();
    const persCost = (trimmedCustom && product.personalization_enabled) ? Math.max(0, +(product.personalization_cost || 0)) : 0;
    addToCart({
      ...product,
      variant_id: activeVariant?.id,
      variant_label: variantLabel,
      price: displayPrice + persCost,
      base_price: displayPrice,
      personalization_cost: persCost,
      image: activeVariant?.image || product.image,
      customization: trimmedCustom || undefined,
    }, qty);
    if (window.innerWidth >= 768) toast.success(`Added ${qty} × ${product.name}${variantLabel ? ' (' + variantLabel + ')' : ''} to bag`);
  };

  const productJsonLd = {
    '@context': 'https://schema.org', '@type': 'Product',
    'name': product.name,
    'image': gallery,
    'description': product.description,
    'sku': displaySku,
    'brand': { '@type': 'Brand', 'name': 'Wear The Hope' },
    'offers': {
      '@type': 'Offer', 'price': displayPrice, 'priceCurrency': 'INR',
      'availability': inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
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
        <nav className="text-[11px] uppercase tracking-[0.2em] text-neutral-500 mb-5 md:mb-8 leading-loose">
          <Link to="/" className="hover:text-[#B4593F]">Home</Link>
          <ChevronRight className="inline w-3 h-3 mx-2" />
          <Link to="/shop" className="hover:text-[#B4593F]">Shop</Link>
          {product.category_slug && (<><ChevronRight className="inline w-3 h-3 mx-2" /><Link to={`/shop/${product.category_slug}`} className="hover:text-[#B4593F]">{product.category_name}</Link></>)}
          <span className="hidden sm:inline"><ChevronRight className="inline w-3 h-3 mx-2" /><span className="text-[#B4593F]">{product.name}</span></span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          <div className="flex gap-4 min-w-0">
            <div className="hidden md:flex flex-col gap-3 w-20 shrink-0">
              {gallery.map((img, i) => (
                <button key={i} onClick={() => setActiveImg(i)} className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${activeImg === i ? 'border-[#B4593F]' : 'border-transparent'}`}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
              {videos.map((v, i) => (
                <button key={'v'+i} onClick={() => setVideoOpen(v)} className="aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-[#B4593F] bg-black relative">
                  <Play className="w-6 h-6 text-white absolute inset-0 m-auto" />
                  <div className="absolute inset-0 flex items-center justify-center text-[10px] text-white/70 uppercase">Video</div>
                </button>
              ))}
            </div>
            <div className="flex-1 min-w-0">
            <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-white border border-[#EBD9CE] relative">
              <img src={gallery[activeImg]} alt={product.name} className="w-full h-full object-cover transition-opacity duration-500" />
              {product.ribbon && (
                <span className="absolute top-4 left-4 shimmer-badge text-white text-xs uppercase tracking-[0.15em] px-4 py-1.5 rounded-full">{product.ribbon}</span>
              )}
              {videos.length > 0 && (
                <button onClick={() => setVideoOpen(videos[0])} className="absolute bottom-4 right-4 w-12 h-12 rounded-full bg-white/95 backdrop-blur flex items-center justify-center shadow-lg hover:bg-[#B4593F] hover:text-white transition-colors group" aria-label="Play video">
                  <Play className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </button>
              )}
            </div>
            {gallery.length > 1 && (
              <div className="md:hidden flex gap-2 mt-3 overflow-x-auto pb-1" data-testid="pd-mobile-thumbs">
                {gallery.map((img, i) => (
                  <button key={i} onClick={() => setActiveImg(i)} data-testid={`pd-mobile-thumb-${i}`} className={`w-16 h-16 shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${activeImg === i ? 'border-[#B4593F]' : 'border-transparent'}`}>
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {product.ribbon && <span className="shimmer-badge text-white text-[10px] uppercase tracking-[0.15em] px-3 py-1 rounded-full">{product.ribbon}</span>}
              {product.product_type === 'digital' && <span className="bg-emerald-600 text-white text-[10px] uppercase tracking-[0.15em] px-3 py-1 rounded-full inline-flex items-center gap-1"><Download className="w-3 h-3" /> Digital</span>}
              <span className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">SKU: {displaySku}</span>
            </div>
            <h1 className="font-serif-display text-3xl sm:text-4xl md:text-5xl text-[#213a60] leading-tight break-words">{product.name}</h1>
            {product.verse && <div className="italic text-neutral-600 mt-2">{product.verse}</div>}

            <div className="flex items-center gap-3 mt-4">
              <span className={`text-[11px] uppercase tracking-[0.15em] px-3 py-1 rounded-full ${inStock ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'}`}>{inStock ? `In stock (${displayStock})` : 'Out of stock'}</span>
            </div>

            <div className="flex items-baseline gap-3 mt-6">
              <div className="text-3xl font-serif-display text-[#B4593F]" data-testid="product-price">{format(displayPrice)}</div>
              {displayOriginal > displayPrice && (
                <>
                  <div className="text-lg text-neutral-400 line-through">{format(displayOriginal)}</div>
                  <div className="text-xs uppercase tracking-widest text-[#B4593F]">Save {Math.round(((displayOriginal - displayPrice) / displayOriginal) * 100)}%</div>
                </>
              )}
            </div>
            <div className="text-xs text-neutral-500 mt-1">Inclusive of all taxes</div>

            <p className="mt-6 text-neutral-700 leading-relaxed">{product.description}</p>

            {/* Variant options */}
            {product.variant_options?.map(opt => (
              <div key={opt.name} className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-neutral-600">{opt.name}: <span className="text-[#B4593F]">{selectedOptions[opt.name]}</span></div>
                  {product.size_chart_id && opt.name.toLowerCase().includes('size') && (
                    <button
                      type="button"
                      onClick={() => setSizeChartOpen(true)}
                      data-testid="pd-open-size-chart"
                      className="text-[11px] uppercase tracking-widest text-[#B4593F] hover:text-[#213a60] inline-flex items-center gap-1 underline-offset-4 hover:underline"
                    >
                      <Ruler className="w-3.5 h-3.5" /> Size Chart
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {opt.values.map(val => {
                    const isSelected = selectedOptions[opt.name] === val;
                    return (
                      <button
                        key={val}
                        onClick={() => setSelectedOptions(prev => ({ ...prev, [opt.name]: val }))}
                        className={`px-4 py-2 rounded-full text-xs uppercase tracking-wider border transition-colors ${isSelected ? 'border-[#B4593F] bg-[#B4593F] text-white' : 'border-[#EBD9CE] bg-white hover:border-[#B4593F]'}`}
                      >{val}</button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Size Chart trigger when there are no variant options but a chart is still linked */}
            {product.size_chart_id && !product.variant_options?.some(o => o.name.toLowerCase().includes('size')) && (
              <button
                type="button"
                onClick={() => setSizeChartOpen(true)}
                data-testid="pd-open-size-chart-standalone"
                className="mt-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#B4593F] hover:text-[#213a60]"
              >
                <Ruler className="w-4 h-4" /> View Size Chart
              </button>
            )}

            {/* Static colors (if no variants) */}
            {(!product.variant_options?.length && product.colors?.length > 0) && (
              <div className="mt-6">
                <div className="text-[11px] uppercase tracking-[0.2em] text-neutral-600 mb-2">Color</div>
                <div className="flex gap-2">
                  {product.colors.map((c, i) => (
                    <button key={i} className="w-9 h-9 rounded-full border-2 border-white ring-1 ring-[#EBD9CE] hover:ring-[#B4593F] transition-colors" style={{ background: c }} aria-label="Color" />
                  ))}
                </div>
              </div>
            )}

            {product.personalization_enabled && (
              <div className="mt-6 bg-[#FDF3EB] border border-[#EBD9CE] rounded-xl p-5">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[#B4593F] mb-3">
                  <Sparkles className="w-3.5 h-3.5" /> {product.personalization_label || 'Personalize (optional)'}
                  {product.personalization_cost > 0 && (
                    <span className="ml-auto text-[10px] normal-case tracking-normal text-neutral-600" data-testid="pd-personalization-cost">+ ₹{product.personalization_cost} per unit</span>
                  )}
                </div>
                <input
                  value={customName}
                  onChange={e => setCustomName(e.target.value.slice(0, product.personalization_max_length || 40))}
                  placeholder="Type name or short verse to engrave"
                  className="w-full bg-white border border-[#EBD9CE] rounded-full px-5 py-3 text-sm outline-none focus:border-[#B4593F] transition-colors"
                />
                <div className="text-[11px] text-neutral-500 mt-2 flex justify-between">
                  <span>{product.personalization_cost > 0 ? `+ ₹${product.personalization_cost} per unit` : 'Free customization'} · Adds 2-3 days to delivery</span>
                  <span>{customName.length}/{product.personalization_max_length || 40}</span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 mt-8">
              <div className="inline-flex items-center border border-[#EBD9CE] rounded-full bg-white">
                <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-11 h-12 flex items-center justify-center hover:bg-[#FDF3EB] rounded-l-full"><Minus className="w-4 h-4" /></button>
                <span className="w-12 text-center">{qty}</span>
                <button onClick={() => setQty(q => Math.min(displayStock || 99, q + 1))} className="w-11 h-12 flex items-center justify-center hover:bg-[#FDF3EB] rounded-r-full"><Plus className="w-4 h-4" /></button>
              </div>
              <button disabled={!inStock} onClick={handleAdd} data-testid="pd-add-to-bag" className="flex-1 min-w-0 bg-[#213a60] hover:bg-[#B4593F] disabled:bg-neutral-300 disabled:cursor-not-allowed transition-colors text-white px-6 py-4 rounded-full text-xs uppercase tracking-[0.2em] inline-flex items-center justify-center gap-2 whitespace-nowrap">
                <ShoppingBag className="w-4 h-4" /> {inStock ? 'Add to Bag' : 'Out of Stock'}
              </button>
              <button onClick={() => toggleWishlist(product)} className={`hidden md:flex w-12 h-12 rounded-full border border-[#EBD9CE] items-center justify-center hover:border-[#B4593F] transition-colors ${wished ? 'text-[#B4593F]' : ''}`} aria-label="Wishlist">
                <Heart className={`w-4 h-4 ${wished ? 'fill-current' : ''}`} />
              </button>
              <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied'); }} className="w-12 h-12 rounded-full border border-[#EBD9CE] flex items-center justify-center hover:border-[#B4593F] transition-colors" aria-label="Share"><Share2 className="w-4 h-4" /></button>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-8 pt-6 border-t border-[#EBD9CE]">
              {product.product_type === 'digital' ? [
                { icon: Download, l: 'Instant Access', s: 'Delivered by email' },
                { icon: RefreshCw, l: 'Lifetime Access', s: 'Re-download anytime' },
              ] : [
                { icon: Truck, l: 'Free Shipping', s: 'On orders ₹999+' },
                { icon: RefreshCw, l: 'Easy Returns', s: '7-day window' },
              ].map((a, i) => {
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
                {['shipping'].map(t => (
                  <button key={t} onClick={() => setTab(t)} className={`pb-3 border-b-2 transition-colors ${tab === t ? 'border-[#B4593F] text-[#B4593F]' : 'border-transparent text-neutral-500'}`}>{t}</button>
                ))}
              </div>
              <div className="pt-5 text-sm text-neutral-700 leading-relaxed">
                {tab === 'shipping' && <p>{product.product_type === 'digital' ? 'This is a digital product. You will receive a download link on your email within minutes of purchase.' : 'We ship pan-India within 3-5 business days. International shipping available (7-14 business days). Free shipping on all orders over ₹999.'}</p>}
              </div>
            </div>
          </div>
        </div>

        {related.length === 0 ? (
          <RelatedProducts productId={product.id} limit={8} />
        ) : (
          <RelatedProducts productId={product.id} limit={8} />
        )}

        <RecentlyViewed excludeId={product.id} />
      </div>

      {/* Video modal */}
      {videoOpen && (
        <>
          <div onClick={() => setVideoOpen(false)} className="fixed inset-0 bg-black/80 z-50" />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <div className="w-full max-w-4xl aspect-video bg-black rounded-2xl overflow-hidden">
              {youtubeEmbed(videoOpen) ? (
                <iframe src={youtubeEmbed(videoOpen) + '?autoplay=1'} title="Product video" allowFullScreen allow="autoplay" className="w-full h-full" />
              ) : (
                <video src={videoOpen} controls autoPlay className="w-full h-full" />
              )}
            </div>
          </div>
        </>
      )}
      <SizeChartModal chartId={product.size_chart_id} open={sizeChartOpen} onClose={() => setSizeChartOpen(false)} />
    </main>
  );
};

export default ProductDetail;
