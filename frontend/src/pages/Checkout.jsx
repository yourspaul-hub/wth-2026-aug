import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { createOrder, validateCoupon, verifyPayment, shippingRates } from '../lib/api';
import { toast } from 'sonner';
import { ArrowRight, Tag, Truck, Lock, CheckCircle2, X, Info } from 'lucide-react';
import SeoHelmet from '../components/SeoHelmet';

const emptyAddr = { full_name: '', email: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '', country: 'India' };

const Checkout = () => {
  const { items, totals, clearCart } = useCart();
  const [addr, setAddr] = useState(emptyAddr);
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState(null);
  const [rates, setRates] = useState(null);
  const [processing, setProcessing] = useState(false);
  const nav = useNavigate();

  useEffect(() => { if (items.length === 0) nav('/shop'); }, [items.length, nav]);

  const shipping_fee = totals.subtotal >= 999 ? 0 : 99;
  const discount = coupon?.discount || 0;
  const total = Math.max(0, totals.subtotal - discount + shipping_fee);

  const applyCoupon = async () => {
    if (!couponCode) return;
    try {
      const r = await validateCoupon(couponCode, totals.subtotal);
      if (r.valid) { setCoupon(r); toast.success(r.message); } else { setCoupon(null); toast.error(r.message); }
    } catch { toast.error('Coupon check failed'); }
  };

  const fetchRates = async (pincode) => {
    if (pincode?.length === 6) {
      try { const r = await shippingRates(pincode, 0.5); setRates(r.rates); } catch { setRates(null); }
    } else setRates(null);
  };

  const canProceed = ['full_name', 'email', 'phone', 'line1', 'city', 'state', 'pincode'].every(k => (addr[k] || '').trim());

  const placeOrder = async () => {
    if (!canProceed) { toast.error('Please fill all shipping fields'); return; }
    setProcessing(true);
    try {
      const payload = {
        items: items.map(it => ({ product_id: it.id, name: it.name, image: it.image, price: it.price, qty: it.qty, verse: it.verse })),
        shipping_address: addr,
        coupon_code: coupon?.code,
      };
      const res = await createOrder(payload);
      // MOCK: Simulate Razorpay flow — auto-verify success
      toast.loading('Processing payment (mocked Razorpay)...', { id: 'pay' });
      await new Promise(r => setTimeout(r, 1200));
      const verified = await verifyPayment({ razorpay_order_id: res.razorpay.order_id, order_number: res.order.order_number });
      toast.dismiss('pay');
      if (verified.ok) {
        clearCart();
        toast.success('Payment successful! (mocked)');
        nav(`/order/${res.order.order_number}`);
      } else {
        toast.error('Payment failed');
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Order failed');
    } finally { setProcessing(false); }
  };

  return (
    <main className="pt-6 pb-16 min-h-screen">
      <SeoHelmet overrides={{ title: 'Checkout | Wear The Hope', robots: 'noindex,follow' }} />
      <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
        <div className="flex items-center gap-3 mb-8">
          <Link to="/" className="font-logo text-lg tracking-[0.3em]">WEAR THE HOPE</Link>
          <span className="text-xs text-neutral-400">/</span>
          <span className="font-serif-display text-3xl">Checkout</span>
        </div>

        <div className="grid lg:grid-cols-5 gap-10">
          {/* Left: form */}
          <div className="lg:col-span-3 space-y-8">
            <div className="bg-white rounded-2xl border border-[#EBD9CE] p-6 md:p-8">
              <h2 className="font-serif-display text-2xl mb-6">Shipping Details</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {[['full_name','Full name'],['email','Email'],['phone','Phone']].map(([k,l]) => (
                  <label key={k} className={`block ${k === 'full_name' ? 'md:col-span-2' : ''}`}>
                    <span className="text-[11px] uppercase tracking-widest text-neutral-600">{l}</span>
                    <input value={addr[k]} onChange={e => setAddr({ ...addr, [k]: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-5 py-3 text-sm outline-none focus:border-[#B4593F]" />
                  </label>
                ))}
                <label className="block md:col-span-2"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Address line 1</span><input value={addr.line1} onChange={e => setAddr({ ...addr, line1: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-5 py-3 text-sm outline-none focus:border-[#B4593F]" /></label>
                <label className="block md:col-span-2"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Address line 2 (optional)</span><input value={addr.line2 || ''} onChange={e => setAddr({ ...addr, line2: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-5 py-3 text-sm outline-none focus:border-[#B4593F]" /></label>
                {[['city','City'],['state','State'],['pincode','Pincode']].map(([k,l]) => (
                  <label key={k} className="block">
                    <span className="text-[11px] uppercase tracking-widest text-neutral-600">{l}</span>
                    <input value={addr[k]} onChange={e => { setAddr({ ...addr, [k]: e.target.value }); if (k === 'pincode') fetchRates(e.target.value); }} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-5 py-3 text-sm outline-none focus:border-[#B4593F]" />
                  </label>
                ))}
              </div>
            </div>

            {rates && (
              <div className="bg-white rounded-2xl border border-[#EBD9CE] p-6 md:p-8">
                <div className="flex items-center gap-2 mb-4"><Truck className="w-4 h-4 text-[#B4593F]" /><h2 className="font-serif-display text-2xl">Shipping Options</h2><span className="text-[10px] uppercase tracking-widest text-neutral-500 bg-yellow-50 text-yellow-800 px-2 py-0.5 rounded">MOCKED</span></div>
                <div className="space-y-2">
                  {rates.map((r, i) => (
                    <label key={i} className="flex items-center justify-between p-3 border border-[#EBD9CE] rounded-lg hover:border-[#B4593F] cursor-pointer">
                      <div className="flex items-center gap-3"><input type="radio" name="rate" defaultChecked={i===0} className="accent-[#B4593F]" /><div><div className="text-sm font-medium">{r.courier}</div><div className="text-xs text-neutral-500">Delivery in {r.eta_days} days</div></div></div>
                      <div className="text-sm font-semibold">₹{r.rate}</div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-[#EBD9CE] p-6 md:p-8">
              <div className="flex items-center gap-2 mb-4"><Lock className="w-4 h-4 text-[#B4593F]" /><h2 className="font-serif-display text-2xl">Payment</h2><span className="text-[10px] uppercase tracking-widest text-neutral-500 bg-yellow-50 text-yellow-800 px-2 py-0.5 rounded">RAZORPAY MOCKED</span></div>
              <p className="text-sm text-neutral-600">You'll be redirected to Razorpay to complete payment. For this preview, payment is auto-simulated as successful.</p>
              <div className="mt-4 flex items-start gap-2 text-xs text-neutral-500 bg-[#FDF3EB] rounded-lg p-3"><Info className="w-3.5 h-3.5 mt-0.5 text-[#B4593F]" /> Add Razorpay Test Key ID + Secret in backend .env to enable live payments.</div>
            </div>
          </div>

          {/* Right: summary */}
          <div className="lg:col-span-2">
            <div className="sticky top-24 bg-white rounded-2xl border border-[#EBD9CE] p-6">
              <h2 className="font-serif-display text-2xl mb-4">Order Summary</h2>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                {items.map(it => (
                  <div key={it.id} className="flex gap-3">
                    <img src={it.image} alt="" className="w-14 h-16 rounded object-cover" />
                    <div className="flex-1 text-sm"><div className="font-medium line-clamp-2">{it.name}</div><div className="text-xs text-neutral-500">Qty: {it.qty}</div></div>
                    <div className="text-sm font-semibold">₹{(it.price * it.qty).toLocaleString('en-IN')}</div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#B4593F]" />
                <input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} placeholder="Coupon code" className="flex-1 bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2 text-sm outline-none focus:border-[#B4593F] font-mono" />
                <button onClick={applyCoupon} className="bg-[#1A1A1A] hover:bg-[#B4593F] text-white text-xs uppercase tracking-widest px-4 py-2 rounded-full transition-colors">Apply</button>
              </div>
              {coupon && (
                <div className="mt-2 flex items-center justify-between bg-[#FDF3EB] rounded-lg px-3 py-2 text-xs">
                  <span className="inline-flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> {coupon.code} applied</span>
                  <button onClick={() => { setCoupon(null); setCouponCode(''); }} className="text-neutral-500 hover:text-red-500"><X className="w-3 h-3" /></button>
                </div>
              )}

              <div className="mt-5 pt-5 border-t border-[#EBD9CE] space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-neutral-600">Subtotal</span><span>₹{totals.subtotal.toLocaleString('en-IN')}</span></div>
                {discount > 0 && <div className="flex justify-between text-[#B4593F]"><span>Discount</span><span>-₹{discount.toLocaleString('en-IN')}</span></div>}
                <div className="flex justify-between"><span className="text-neutral-600">Shipping</span><span>{shipping_fee === 0 ? 'Free' : `₹${shipping_fee}`}</span></div>
                <div className="flex justify-between text-lg font-serif-display pt-3 border-t border-[#EBD9CE]"><span>Total</span><span className="text-[#B4593F]">₹{total.toLocaleString('en-IN')}</span></div>
              </div>

              <button disabled={processing || !canProceed} onClick={placeOrder} className="mt-6 w-full bg-[#1A1A1A] hover:bg-[#B4593F] disabled:bg-neutral-300 text-white py-4 rounded-full text-xs uppercase tracking-widest inline-flex items-center justify-center gap-2 transition-colors">
                {processing ? 'Processing...' : (<>Place Order · ₹{total.toLocaleString('en-IN')} <ArrowRight className="w-4 h-4" /></>)}
              </button>
              <div className="mt-4 text-[10px] uppercase tracking-widest text-neutral-500 text-center inline-flex items-center gap-2 justify-center w-full"><Lock className="w-3 h-3" /> Secure checkout · SSL encrypted</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Checkout;
