import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getOrder, trackShipment } from '../lib/api';
import { CheckCircle2, Package, Truck, Home, ExternalLink } from 'lucide-react';
import SeoHelmet from '../components/SeoHelmet';

const OrderSuccess = () => {
  const { orderNumber } = useParams();
  const [order, setOrder] = useState(null);
  const [tracking, setTracking] = useState(null);

  useEffect(() => {
    getOrder(orderNumber).then(async (o) => {
      setOrder(o);
      if (o?.shiprocket_awb) {
        try { const t = await trackShipment(o.shiprocket_awb); setTracking(t); } catch { /* noop */ }
      }
    });
  }, [orderNumber]);

  if (!order) return <main className="pt-20 text-center"><div className="w-10 h-10 border-4 border-[#B4593F] border-t-transparent rounded-full animate-spin mx-auto" /></main>;

  return (
    <main className="pt-6 pb-16 min-h-screen bg-[#FDF3EB]">
      <SeoHelmet overrides={{ title: `Order ${order.order_number} | Wear The Hope`, robots: 'noindex,follow' }} />
      <div className="max-w-[900px] mx-auto px-6 lg:px-10">
        <div className="bg-white rounded-3xl border border-[#EBD9CE] p-10 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6"><CheckCircle2 className="w-8 h-8 text-green-600" /></div>
          <h1 className="font-serif-display text-4xl md:text-5xl">Thank you!</h1>
          <p className="text-neutral-600 mt-3">Your order has been placed successfully. A confirmation has been sent to your email.</p>
          <div className="mt-6 inline-flex items-center gap-3 bg-[#FDF3EB] rounded-full px-6 py-3">
            <Package className="w-4 h-4 text-[#B4593F]" />
            <span className="font-mono text-sm">{order.order_number}</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mt-6">
          <div className="bg-white rounded-2xl border border-[#EBD9CE] p-6">
            <div className="text-[11px] uppercase tracking-widest text-[#B4593F] mb-3">Shipping to</div>
            <div className="text-sm leading-relaxed">
              {order.shipping_address.full_name}<br />
              {order.shipping_address.line1}{order.shipping_address.line2 ? ', ' + order.shipping_address.line2 : ''}<br />
              {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.pincode}<br />
              {order.shipping_address.country}<br />
              <span className="text-neutral-500">{order.shipping_address.phone}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#EBD9CE] p-6">
            <div className="text-[11px] uppercase tracking-widest text-[#B4593F] mb-3 inline-flex items-center gap-2"><Truck className="w-3.5 h-3.5" /> Shipment (Shiprocket — MOCKED)</div>
            {order.shiprocket_awb ? (
              <div className="text-sm space-y-1">
                <div><span className="text-neutral-500">AWB:</span> <span className="font-mono">{order.shiprocket_awb}</span></div>
                <div><span className="text-neutral-500">Status:</span> {tracking?.current_status || 'Processing'}</div>
                {order.tracking_url && <a href={order.tracking_url} target="_blank" rel="noreferrer" className="text-[#B4593F] inline-flex items-center gap-1 mt-2">Track parcel <ExternalLink className="w-3 h-3" /></a>}
              </div>
            ) : (
              <div className="text-sm text-neutral-500">Awaiting warehouse pickup.</div>
            )}
          </div>
        </div>

        {tracking && (
          <div className="bg-white rounded-2xl border border-[#EBD9CE] p-6 mt-4">
            <div className="text-[11px] uppercase tracking-widest text-[#B4593F] mb-4">Tracking Timeline</div>
            <ol className="relative border-l border-[#EBD9CE] pl-5 space-y-4">
              {tracking.timeline.map((t, i) => (
                <li key={i} className="relative">
                  <span className={`absolute -left-[26px] w-3.5 h-3.5 rounded-full border-2 ${t.at ? 'bg-[#B4593F] border-[#B4593F]' : 'bg-white border-[#EBD9CE]'}`} />
                  <div className="text-sm font-medium">{t.status}</div>
                  <div className="text-xs text-neutral-500">{t.at ? new Date(t.at).toLocaleString() : 'Pending'}</div>
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-[#EBD9CE] p-6 mt-4">
          <div className="text-[11px] uppercase tracking-widest text-[#B4593F] mb-4">Order Items</div>
          <div className="space-y-3">
            {order.items.map((it, i) => (
              <div key={i} className="flex gap-3 items-center">
                <img src={it.image} alt="" className="w-14 h-16 rounded object-cover" />
                <div className="flex-1 text-sm"><div className="font-medium">{it.name}</div><div className="text-xs text-neutral-500">Qty {it.qty} · ₹{it.price}</div></div>
                <div className="font-semibold">₹{(it.price * it.qty).toLocaleString('en-IN')}</div>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-5 border-t border-[#EBD9CE] space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-neutral-600">Subtotal</span><span>₹{order.subtotal.toLocaleString('en-IN')}</span></div>
            {order.discount > 0 && <div className="flex justify-between text-[#B4593F]"><span>Discount ({order.coupon_code})</span><span>-₹{order.discount.toLocaleString('en-IN')}</span></div>}
            <div className="flex justify-between"><span className="text-neutral-600">Shipping</span><span>{order.shipping_fee === 0 ? 'Free' : `₹${order.shipping_fee}`}</span></div>
            <div className="flex justify-between text-lg font-serif-display pt-2 border-t border-[#EBD9CE]"><span>Total</span><span className="text-[#B4593F]">₹{order.total.toLocaleString('en-IN')}</span></div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#B4593F] text-white px-7 py-3.5 rounded-full text-xs uppercase tracking-widest transition-colors"><Home className="w-4 h-4" /> Continue Shopping</Link>
        </div>
      </div>
    </main>
  );
};

export default OrderSuccess;
