import React, { useEffect, useRef, useState } from 'react';
import { adminListOrders, adminUpdateOrder, refundOrder, invoiceUrl, adminImportPastOrders, pastOrdersTemplateUrl } from '../../lib/api';
import { toast } from 'sonner';
import { X, Truck, ExternalLink, FileText, RotateCcw, PackageCheck, Upload, Download } from 'lucide-react';
import FulfillOrderDialog from './FulfillOrderDialog';

const STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded'];

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [fulfilling, setFulfilling] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);

  const load = () => adminListOrders(filter || undefined).then(setOrders).catch(() => setOrders([]));
  useEffect(() => { load(); }, [filter]);

  // Escape closes the item preview modal on top of any other panel.
  useEffect(() => {
    if (!previewItem) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setPreviewItem(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [previewItem]);

  const updateStatus = async (order_number, patch) => {
    try {
      const updated = await adminUpdateOrder(order_number, patch);
      toast.success('Order updated');
      setOrders(prev => prev.map(o => o.order_number === order_number ? updated : o));
      if (selected?.order_number === order_number) setSelected(updated);
    } catch { toast.error('Failed to update'); }
  };

  const doRefund = async (order) => {
    const reason = window.prompt('Refund reason (optional):', '');
    if (reason === null) return;
    try {
      const res = await refundOrder(order.order_number, reason);
      toast.success('Refund processed (mocked)');
      setOrders(prev => prev.map(o => o.order_number === order.order_number ? res.order : o));
      setSelected(res.order);
    } catch (e) { toast.error(e?.response?.data?.detail || 'Refund failed'); }
  };

  const fileRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const onImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImporting(true);
    try {
      const res = await adminImportPastOrders(file);
      const errCount = res.errors?.length || 0;
      toast.success(`Imported: ${res.created} new, ${res.updated} updated${errCount ? ` — ${errCount} row error${errCount === 1 ? '' : 's'}` : ''}`);
      if (errCount) console.warn('[import errors]', res.errors);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif-display text-4xl">Orders</h1>
          <p className="text-sm text-neutral-600 mt-1">{orders.length} orders</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={pastOrdersTemplateUrl()}
            className="inline-flex items-center gap-2 text-xs uppercase tracking-widest bg-white border border-[#EBD9CE] hover:border-[#B4593F] text-[#213a60] px-4 py-2.5 rounded-full transition-colors"
            data-testid="orders-download-template-btn"
          >
            <Download className="w-3.5 h-3.5" /> Template
          </a>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={onImportFile} className="hidden" data-testid="orders-import-input" />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="inline-flex items-center gap-2 text-xs uppercase tracking-widest bg-white border border-[#EBD9CE] hover:border-[#B4593F] disabled:opacity-40 text-[#213a60] px-4 py-2.5 rounded-full transition-colors"
            data-testid="orders-import-btn"
          >
            <Upload className="w-3.5 h-3.5" /> {importing ? 'Importing…' : 'Import past orders'}
          </button>
          <select value={filter} onChange={e => setFilter(e.target.value)} className="bg-white border border-[#EBD9CE] rounded-full px-5 py-2.5 text-xs uppercase tracking-widest" data-testid="orders-status-filter">
            <option value="">All statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#EBD9CE] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#FDF3EB] text-[11px] uppercase tracking-widest text-neutral-600">
            <tr>
              <th className="text-left px-6 py-3">Order</th>
              <th className="text-left px-6 py-3">Customer</th>
              <th className="text-left px-6 py-3">Total</th>
              <th className="text-left px-6 py-3">Payment</th>
              <th className="text-left px-6 py-3">Status</th>
              <th className="text-left px-6 py-3">Date</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EBD9CE]">
            {orders.length === 0 ? (
              <tr><td colSpan="7" className="px-6 py-10 text-center text-neutral-500">No orders</td></tr>
            ) : orders.map(o => (
              <tr key={o.order_number} className="hover:bg-[#FDF3EB]/50" data-testid={`order-row-${o.order_number}`}>
                <td className="px-6 py-3 font-medium">{o.order_number}</td>
                <td className="px-6 py-3">{o.shipping_address?.full_name}<div className="text-[11px] text-neutral-500">{o.shipping_address?.email}</div></td>
                <td className="px-6 py-3 font-semibold">₹{o.total.toLocaleString('en-IN')}</td>
                <td className="px-6 py-3"><span className={`text-[10px] uppercase px-2 py-1 rounded ${o.payment_status === 'paid' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>{o.payment_status}</span></td>
                <td className="px-6 py-3">
                  <select value={o.status} onChange={e => updateStatus(o.order_number, { status: e.target.value })} className="bg-transparent border border-[#EBD9CE] rounded px-2 py-1 text-xs">
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-6 py-3 text-xs text-neutral-500">{new Date(o.created_at).toLocaleDateString()}</td>
                <td className="px-6 py-3"><button onClick={() => setSelected(o)} className="text-xs text-[#B4593F] hover:underline" data-testid={`order-details-btn-${o.order_number}`}>Details</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <>
          <div onClick={() => setSelected(null)} className="fixed inset-0 bg-black/50 z-50" />
          <aside className="fixed top-0 right-0 h-full w-full sm:w-[520px] bg-white z-50 overflow-y-auto shadow-2xl">
            <div className="px-6 py-5 border-b border-[#EBD9CE] flex items-center justify-between">
              <div>
                <h3 className="font-serif-display text-2xl">{selected.order_number}</h3>
                <div className="text-xs text-neutral-500">{new Date(selected.created_at).toLocaleString()}</div>
              </div>
              <button onClick={() => setSelected(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-5 space-y-5">
              <div>
                <div className="text-[11px] uppercase tracking-widest text-[#B4593F] mb-2">Customer</div>
                <div className="text-sm">{selected.shipping_address.full_name}<br />{selected.shipping_address.email}<br />{selected.shipping_address.phone}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-widest text-[#B4593F] mb-2">Shipping Address</div>
                <div className="text-sm">{selected.shipping_address.line1}{selected.shipping_address.line2 ? ', ' + selected.shipping_address.line2 : ''}<br />{selected.shipping_address.city}, {selected.shipping_address.state} {selected.shipping_address.pincode}<br />{selected.shipping_address.country}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-widest text-[#B4593F] mb-2">Items</div>
                <div className="space-y-3">
                  {selected.items.map((it, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => setPreviewItem(it)}
                      className="w-full text-left flex items-center gap-3 border border-[#EBD9CE] hover:border-[#B4593F] hover:bg-[#FDF3EB]/60 rounded-lg p-2 transition-colors"
                      data-testid={`order-item-row-${i}`}
                    >
                      <img src={it.image} alt="" className="w-14 h-14 rounded object-cover" />
                      <div className="flex-1 text-sm">
                        <div className="font-medium">{it.name}</div>
                        <div className="text-xs text-neutral-500">Qty: {it.qty} · ₹{it.price}{it.variant_label ? ` · ${it.variant_label}` : ''}</div>
                        {it.customization && <div className="text-[11px] italic text-[#B4593F]">{it.customization}</div>}
                      </div>
                      <div className="font-semibold">₹{(it.price * it.qty).toLocaleString('en-IN')}</div>
                    </button>
                  ))}
                </div>
                <div className="text-[11px] text-neutral-500 mt-2">Tip: click any item to see the full product image + details.</div>
              </div>
              <div className="bg-[#FDF3EB] rounded-lg p-4 text-sm space-y-2">
                <div className="flex justify-between"><span>Subtotal</span><span>₹{selected.subtotal.toLocaleString('en-IN')}</span></div>
                {selected.discount > 0 && <div className="flex justify-between text-[#B4593F]"><span>Discount ({selected.coupon_code})</span><span>-₹{selected.discount.toLocaleString('en-IN')}</span></div>}
                <div className="flex justify-between"><span>Shipping</span><span>₹{selected.shipping_fee}</span></div>
                <div className="flex justify-between font-semibold pt-2 border-t border-[#EBD9CE]"><span>Total</span><span>₹{selected.total.toLocaleString('en-IN')}</span></div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-widest text-[#B4593F] mb-2 flex items-center gap-2"><Truck className="w-3 h-3" /> Fulfilment</div>
                <div className="text-sm space-y-1" data-testid="order-fulfillment-details">
                  {selected.fulfillment_method ? (
                    <>
                      <div>Method: <strong>{selected.fulfillment_method.replace(/_/g, ' ').replace(/\b\w/g, m => m.toUpperCase())}</strong></div>
                      {selected.fulfillment_courier && <div>Courier: <strong>{selected.fulfillment_courier}</strong></div>}
                      {selected.shiprocket_awb && <div>AWB: <strong>{selected.shiprocket_awb}</strong></div>}
                      {selected.tracking_url && <a href={selected.tracking_url} target="_blank" rel="noreferrer" className="text-[#B4593F] inline-flex items-center gap-1">Track parcel <ExternalLink className="w-3 h-3" /></a>}
                      {selected.fulfilled_at && <div className="text-xs text-neutral-500">Fulfilled {new Date(selected.fulfilled_at).toLocaleString()}</div>}
                    </>
                  ) : (
                    <div className="text-neutral-500 text-xs">Not fulfilled yet.</div>
                  )}
                </div>
              </div>
              <div className="pt-4 border-t border-[#EBD9CE] flex flex-wrap gap-2">
                <a
                  href={invoiceUrl(selected.order_number)}
                  target="_blank"
                  rel="noreferrer"
                  data-testid="order-invoice-btn"
                  className="inline-flex items-center gap-2 text-xs uppercase tracking-widest bg-white border border-[#EBD9CE] hover:border-[#B4593F] text-[#213a60] px-4 py-2.5 rounded-full transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" /> Invoice / Print
                </a>
                {!['delivered', 'cancelled', 'refunded'].includes(selected.status) && (
                  <button
                    onClick={() => setFulfilling(selected)}
                    data-testid="order-fulfill-btn"
                    className="inline-flex items-center gap-2 text-xs uppercase tracking-widest bg-[#213a60] hover:bg-[#B4593F] text-white px-4 py-2.5 rounded-full transition-colors"
                  >
                    <PackageCheck className="w-3.5 h-3.5" /> {selected.status === 'shipped' ? 'Update fulfilment' : 'Fulfil order'}
                  </button>
                )}
                {selected.payment_status === 'paid' && selected.status !== 'refunded' && (
                  <button
                    onClick={() => doRefund(selected)}
                    data-testid="order-refund-btn"
                    className="inline-flex items-center gap-2 text-xs uppercase tracking-widest bg-white border border-rose-300 hover:bg-rose-50 text-rose-700 px-4 py-2.5 rounded-full transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Refund
                  </button>
                )}
                {selected.status === 'refunded' && (
                  <span className="inline-flex items-center gap-2 text-xs uppercase tracking-widest bg-rose-50 text-rose-700 px-4 py-2.5 rounded-full">
                    <RotateCcw className="w-3.5 h-3.5" /> Refunded
                  </span>
                )}
              </div>
            </div>
          </aside>
        </>
      )}

      {fulfilling && (
        <FulfillOrderDialog
          order={fulfilling}
          onClose={() => setFulfilling(null)}
          onFulfilled={(updated) => {
            setOrders(prev => prev.map(o => o.order_number === updated.order_number ? updated : o));
            if (selected?.order_number === updated.order_number) setSelected(updated);
          }}
        />
      )}

      {previewItem && (
        <>
          <div onClick={() => setPreviewItem(null)} className="fixed inset-0 bg-black/70 z-[60]" data-testid="order-item-preview-backdrop" />
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-8 pointer-events-none" onClick={() => setPreviewItem(null)}>
            <div className="pointer-events-auto bg-white rounded-2xl overflow-hidden shadow-2xl border border-white/40 max-w-3xl w-full max-h-full flex flex-col" data-testid="order-item-preview" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#EBD9CE]">
                <h3 className="font-serif-display text-xl truncate pr-4">{previewItem.name}</h3>
                <button onClick={() => setPreviewItem(null)} className="p-1 rounded hover:bg-neutral-100" data-testid="order-item-preview-close"><X className="w-5 h-5" /></button>
              </div>
              <div className="grid md:grid-cols-2 gap-6 p-6 overflow-y-auto">
                <div className="bg-[#FDF3EB] rounded-xl overflow-hidden flex items-center justify-center min-h-[240px]">
                  {previewItem.image
                    ? <img src={previewItem.image} alt={previewItem.name} className="w-full h-auto max-h-[70vh] object-contain" data-testid="order-item-preview-image" />
                    : <div className="text-sm text-neutral-500 py-16 px-6 text-center">No image on file for this product.</div>}
                </div>
                <div className="text-sm space-y-3">
                  <div><span className="text-[11px] uppercase tracking-widest text-[#B4593F]">Product</span><div className="font-medium">{previewItem.name}</div></div>
                  {previewItem.sku && <div><span className="text-[11px] uppercase tracking-widest text-[#B4593F]">SKU</span><div>{previewItem.sku}</div></div>}
                  {previewItem.variant_label && <div><span className="text-[11px] uppercase tracking-widest text-[#B4593F]">Variant</span><div>{previewItem.variant_label}</div></div>}
                  <div className="grid grid-cols-2 gap-3">
                    <div><span className="text-[11px] uppercase tracking-widest text-[#B4593F]">Quantity</span><div className="font-medium">{previewItem.qty}</div></div>
                    <div><span className="text-[11px] uppercase tracking-widest text-[#B4593F]">Unit price</span><div className="font-medium">₹{previewItem.price?.toLocaleString('en-IN')}</div></div>
                  </div>
                  <div><span className="text-[11px] uppercase tracking-widest text-[#B4593F]">Line total</span><div className="font-semibold">₹{((previewItem.price || 0) * (previewItem.qty || 1)).toLocaleString('en-IN')}</div></div>
                  {previewItem.customization && (
                    <div className="border-t border-[#EBD9CE] pt-3">
                      <span className="text-[11px] uppercase tracking-widest text-[#B4593F]">Personalisation</span>
                      <div className="italic text-[#B4593F]">{previewItem.customization}</div>
                    </div>
                  )}
                  {previewItem.product_id && (
                    <a href={`/product/${previewItem.product_id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs uppercase tracking-widest bg-white border border-[#EBD9CE] hover:border-[#B4593F] text-[#213a60] px-4 py-2.5 rounded-full transition-colors mt-3" data-testid="order-item-preview-view-product">
                      <ExternalLink className="w-3.5 h-3.5" /> View product page
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminOrders;
