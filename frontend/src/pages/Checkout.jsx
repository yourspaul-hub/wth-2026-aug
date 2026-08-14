import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import { createOrder, validateCoupon, verifyPayment, fetchShippingOptions } from '../lib/api';
import { toast } from 'sonner';
import { ArrowRight, Tag, Truck, Lock, CheckCircle2, X, Info, CreditCard, Store, Wallet } from 'lucide-react';
import SeoHelmet from '../components/SeoHelmet';
import Logo from '../components/Logo';

const emptyAddr = { full_name: '', email: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '', country: 'India' };

const PAYMENT_METHODS = [
  { id: 'razorpay', label: 'Razorpay', desc: 'UPI, Cards, Netbanking, Wallets', icon: Wallet, badge: 'MOCKED' },
  { id: 'stripe', label: 'Stripe', desc: 'International Credit/Debit Cards', icon: CreditCard, badge: 'MOCKED' },
  { id: 'paypal', label: 'PayPal', desc: 'PayPal Balance or Card', icon: Wallet, badge: 'MOCKED' },
  { id: 'cod', label: 'Cash on Delivery', desc: 'Pay when you receive (India only)', icon: Store, badge: null },
];

const Checkout = () => {
  const { items, totals, clearCart } = useCart();
  const { format, current, code: currencyCode } = useCurrency();
  const [addr, setAddr] = useState(emptyAddr);
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState(null);
  const [shippingOptions, setShippingOptions] = useState([]);
  const [selectedShip, setSelectedShip] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [paymentProvider, setPaymentProvider] = useState('razorpay');
  const nav = useNavigate();

  useEffect(() => { if (!orderPlaced && items.length === 0) nav('/shop'); }, [items.length, nav, orderPlaced]);

  // Fetch shipping options when address changes enough
  useEffect(() => {
    fetchShippingOptions({ pincode: addr.pincode || undefined, subtotal: totals.subtotal, state: addr.state || undefined })
      .then(r => {
        setShippingOptions(r.options || []);
        if (!selectedShip && r.options?.length) {
          const free = r.options.find(o => o.kind === 'free');
          setSelectedShip(free || r.options[0]);
        }
      })
      .catch(() => setShippingOptions([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addr.pincode, addr.state, totals.subtotal]);

  const discount = coupon?.discount || 0;
  const shipping_fee = selectedShip ? (selectedShip.kind === 'free' ? 0 : selectedShip.effective_price ?? selectedShip.price) : 0;
  // Approximate tax preview @ 12% GST (server recalculates authoritatively)
  const taxable = Math.max(0, totals.subtotal - discount);
  const tax_preview = Math.round(taxable * 0.12);
  const total = Math.max(0, totals.subtotal - discount + shipping_fee + tax_preview);

  const applyCoupon = async () => {
    if (!couponCode) return;
    try {
      const r = await validateCoupon(couponCode, totals.subtotal);
      if (r.valid) { setCoupon(r); toast.success(r.message); } else { setCoupon(null); toast.error(r.message); }
    } catch { toast.error('Coupon check failed'); }
  };

  const canProceed = ['full_name', 'email', 'phone', 'line1', 'city', 'state', 'pincode'].every(k => (addr[k] || '').trim());

  const placeOrder = async () => {
    if (!canProceed) { toast.error('Please fill all shipping fields'); return; }
    if (!selectedShip) { toast.error('Please select a shipping method'); return; }
    setProcessing(true);
    try {
      const payload = {
        items: items.map(it => ({ product_id: it.id, variant_id: it.variant_id, variant_label: it.variant_label, name: it.name, image: it.image, price: it.price, qty: it.qty, verse: it.verse, customization: it.customization })),
        shipping_address: addr,
        coupon_code: coupon?.code,
        shipping_option_id: selectedShip.id,
        payment_provider: paymentProvider,
      };
      const res = await createOrder(payload);
      toast.loading(`Processing ${paymentProvider.toUpperCase()} payment (mocked)...`, { id: 'pay' });
      await new Promise(r => setTimeout(r, 1200));
      const verifyBody = { order_number: res.order.order_number, provider: paymentProvider };
      if (paymentProvider === 'razorpay') verifyBody.razorpay_order_id = res.payment.order_id;
      if (paymentProvider === 'stripe') verifyBody.stripe_session_id = res.payment.session_id;
      if (paymentProvider === 'paypal') verifyBody.paypal_order_id = res.payment.paypal_order_id;
      const verified = await verifyPayment(verifyBody);
      toast.dismiss('pay');
      if (verified.ok) {
        setOrderPlaced(true);
        nav(`/order/${res.order.order_number}`);
        clearCart();
        toast.success(`Payment successful via ${paymentProvider.toUpperCase()}!`);
      } else toast.error('Payment failed');
    } catch (e) {
      toast.dismiss('pay');
      toast.error(e?.response?.data?.detail || 'Order failed');
    } finally { setProcessing(false); }
  };

  return (
    <main className="pt-6 pb-16 min-h-screen">
      <SeoHelmet overrides={{ title: 'Checkout | Wear The Hope', robots: 'noindex,follow' }} />
      <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
        <div className="flex items-center gap-3 mb-8">
          <Link to="/" aria-label="Wear The Hope home"><Logo variant="dark" className="h-8" /></Link>
          <span className="text-xs text-neutral-400">/</span>
          <span className="font-serif-display text-3xl">Checkout</span>
        </div>

        <div className="grid lg:grid-cols-5 gap-10">
          <div className="lg:col-span-3 space-y-8">
            <div className="bg-white rounded-2xl border border-[#EBD9CE] p-6 md:p-8">
              <h2 className="font-serif-display text-2xl mb-6">Shipping Details</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <label className="block md:col-span-2"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Full name</span><input value={addr.full_name} onChange={e => setAddr({ ...addr, full_name: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-5 py-3 text-sm outline-none focus:border-[#B4593F]" /></label>
                <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Email</span><input value={addr.email} onChange={e => setAddr({ ...addr, email: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-5 py-3 text-sm outline-none focus:border-[#B4593F]" /></label>
                <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Phone</span><input value={addr.phone} onChange={e => setAddr({ ...addr, phone: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-5 py-3 text-sm outline-none focus:border-[#B4593F]" /></label>
                <label className="block md:col-span-2"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Address line 1</span><input value={addr.line1} onChange={e => setAddr({ ...addr, line1: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-5 py-3 text-sm outline-none focus:border-[#B4593F]" /></label>
                <label className="block md:col-span-2"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Address line 2 (optional)</span><input value={addr.line2 || ''} onChange={e => setAddr({ ...addr, line2: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-5 py-3 text-sm outline-none focus:border-[#B4593F]" /></label>
                <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">City</span><input value={addr.city} onChange={e => setAddr({ ...addr, city: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-5 py-3 text-sm outline-none focus:border-[#B4593F]" /></label>
                <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">State</span><input value={addr.state} onChange={e => setAddr({ ...addr, state: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-5 py-3 text-sm outline-none focus:border-[#B4593F]" /></label>
                <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Pincode</span><input value={addr.pincode} onChange={e => setAddr({ ...addr, pincode: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-5 py-3 text-sm outline-none focus:border-[#B4593F]" /></label>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#EBD9CE] p-6 md:p-8">
              <div className="flex items-center gap-2 mb-4"><Truck className="w-4 h-4 text-[#B4593F]" /><h2 className="font-serif-display text-2xl">Shipping Method</h2></div>
              {shippingOptions.length === 0 ? (
                <div className="text-sm text-neutral-500">Enter your pincode to see shipping options.</div>
              ) : (
                <div className="space-y-2">
                  {shippingOptions.map(opt => (
                    <label key={opt.id} className={`flex items-center justify-between gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${selectedShip?.id === opt.id ? 'border-[#B4593F] bg-[#FDF3EB]' : 'border-[#EBD9CE] hover:border-[#B4593F]'}`}>
                      <div className="flex items-start gap-3">
                        <input type="radio" name="ship" checked={selectedShip?.id === opt.id} onChange={() => setSelectedShip(opt)} className="accent-[#B4593F] mt-1" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{opt.name}</span>
                            {opt.kind === 'pickup' && <span className="text-[10px] uppercase tracking-widest bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">Pickup</span>}
                            {opt.kind === 'free' && <span className="text-[10px] uppercase tracking-widest bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">Free</span>}
                            {opt.kind === 'express' && <span className="text-[10px] uppercase tracking-widest bg-[#FDF3EB] text-[#B4593F] px-2 py-0.5 rounded">Express</span>}
                          </div>
                          <div className="text-xs text-neutral-500 mt-0.5">{opt.kind === 'pickup' ? opt.pickup_address : `Delivery in ${opt.eta_days} days`}</div>
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-[#B4593F]">{(opt.effective_price ?? opt.price) === 0 ? 'Free' : `₹${opt.effective_price ?? opt.price}`}</div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-[#EBD9CE] p-6 md:p-8">
              <div className="flex items-center gap-2 mb-4"><Lock className="w-4 h-4 text-[#B4593F]" /><h2 className="font-serif-display text-2xl">Payment Method</h2></div>
              <div className="grid sm:grid-cols-2 gap-3">
                {PAYMENT_METHODS.map(pm => {
                  const I = pm.icon;
                  const active = paymentProvider === pm.id;
                  return (
                    <button key={pm.id} onClick={() => setPaymentProvider(pm.id)} className={`flex items-center gap-3 p-4 border rounded-xl text-left transition-colors ${active ? 'border-[#B4593F] bg-[#FDF3EB]' : 'border-[#EBD9CE] hover:border-[#B4593F]'}`}>
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-[#EBD9CE]"><I className="w-4 h-4 text-[#B4593F]" /></div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{pm.label}</span>
                          {pm.badge && <span className="text-[9px] uppercase tracking-widest bg-yellow-50 text-yellow-800 px-2 py-0.5 rounded">{pm.badge}</span>}
                        </div>
                        <div className="text-[11px] text-neutral-500 mt-0.5">{pm.desc}</div>
                      </div>
                      {active && <CheckCircle2 className="w-4 h-4 text-[#B4593F]" />}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex items-start gap-2 text-xs text-neutral-500 bg-[#FDF3EB] rounded-lg p-3"><Info className="w-3.5 h-3.5 mt-0.5 text-[#B4593F]" /> All online payments are MOCKED. Add live API keys to backend .env to enable real transactions.</div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="sticky top-24 bg-white rounded-2xl border border-[#EBD9CE] p-6">
              <h2 className="font-serif-display text-2xl mb-4">Order Summary</h2>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                {items.map(it => {
                  const base = it.variant_id ? `${it.id}::${it.variant_id}` : it.id;
                  const key = it.customization ? `${base}##${it.customization}` : base;
                  return (
                  <div key={key} className="flex gap-3">
                    <img src={it.image} alt="" className="w-14 h-16 rounded object-cover" />
                    <div className="flex-1 text-sm">
                      <div className="font-medium line-clamp-2">{it.name}</div>
                      {it.variant_label && <div className="text-[11px] text-neutral-500">{it.variant_label}</div>}
                      {it.customization && <div className="text-[11px] italic text-[#B4593F]" data-testid="checkout-item-customization">✎ {it.customization}{it.personalization_cost ? <span className="not-italic text-neutral-600"> · +{format(it.personalization_cost)}/unit</span> : null}</div>}
                      <div className="text-xs text-neutral-500">Qty: {it.qty}</div>
                    </div>
                    <div className="text-sm font-semibold">{format(it.price * it.qty)}</div>
                  </div>
                );})}
              </div>

              <div className="mt-5 flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#B4593F]" />
                <input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} placeholder="Coupon code" className="flex-1 bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2 text-sm outline-none focus:border-[#B4593F] font-mono" />
                <button onClick={applyCoupon} className="bg-[#213a60] hover:bg-[#B4593F] text-white text-xs uppercase tracking-widest px-4 py-2 rounded-full transition-colors">Apply</button>
              </div>
              {coupon && (
                <div className="mt-2 flex items-center justify-between bg-[#FDF3EB] rounded-lg px-3 py-2 text-xs">
                  <span className="inline-flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> {coupon.code} applied</span>
                  <button onClick={() => { setCoupon(null); setCouponCode(''); }} className="text-neutral-500 hover:text-red-500"><X className="w-3 h-3" /></button>
                </div>
              )}

              <div className="mt-5 pt-5 border-t border-[#EBD9CE] space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-neutral-600">Subtotal</span><span>{format(totals.subtotal)}</span></div>
                {discount > 0 && <div className="flex justify-between text-[#B4593F]"><span>Discount</span><span>-{format(discount)}</span></div>}
                <div className="flex justify-between"><span className="text-neutral-600">Shipping</span><span>{shipping_fee === 0 ? 'Free' : format(shipping_fee)}</span></div>
                <div className="flex justify-between text-xs text-neutral-600"><span>GST 12% (est.)</span><span>{format(tax_preview)}</span></div>
                <div className="flex justify-between text-lg font-serif-display pt-3 border-t border-[#EBD9CE]"><span>Total</span><span className="text-[#B4593F]" data-testid="checkout-total">{format(total)}</span></div>
                {currencyCode !== 'INR' && (
                  <div className="text-[10px] text-neutral-500">Payment is processed in INR. Amount converted from ₹{total.toLocaleString('en-IN')}.</div>
                )}
                <div className="text-[10px] text-neutral-500">Final tax computed on server</div>
              </div>

              <button disabled={processing || !canProceed} onClick={placeOrder} className="mt-6 w-full bg-[#213a60] hover:bg-[#B4593F] disabled:bg-neutral-300 text-white py-4 rounded-full text-xs uppercase tracking-widest inline-flex items-center justify-center gap-2 transition-colors">
                {processing ? 'Processing...' : (<>Pay via {PAYMENT_METHODS.find(p => p.id === paymentProvider)?.label} · {format(total)} <ArrowRight className="w-4 h-4" /></>)}
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
