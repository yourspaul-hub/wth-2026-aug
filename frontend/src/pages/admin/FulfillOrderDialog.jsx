import React, { useEffect, useMemo, useState } from 'react';
import { adminListCouriers, adminFulfillOrder } from '../../lib/api';
import { toast } from 'sonner';
import { X, Truck, PackageCheck, Home as HomeIcon, Store, Hand } from 'lucide-react';

const METHOD_OPTIONS = [
  { key: 'courier', label: 'Courier / Shipping partner', Icon: Truck, sub: 'AWB + tracking link', outcome: 'Status → Shipped' },
  { key: 'hand_delivery', label: 'Hand delivery', Icon: Hand, sub: 'Personally delivered', outcome: 'Status → Delivered (closed)' },
  { key: 'door_delivery', label: 'Door delivery', Icon: HomeIcon, sub: 'Own delivery team', outcome: 'Status → Delivered (closed)' },
  { key: 'store_pickup', label: 'Store pickup', Icon: Store, sub: 'Customer collected in-store', outcome: 'Status → Delivered (closed)' },
];

/**
 * Fulfilment dialog. Courier path collects courier + AWB + optional tracking link
 * and marks the order 'shipped'. Hand/door/store path marks the order 'delivered'
 * (closed). In both cases the customer receives an automatic email.
 */
const FulfillOrderDialog = ({ order, onClose, onFulfilled }) => {
  const [method, setMethod] = useState('courier');
  const [couriers, setCouriers] = useState([]);
  const [courier, setCourier] = useState('');
  const [awb, setAwb] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminListCouriers().then(setCouriers).catch(() => setCouriers([]));
  }, []);

  const grouped = useMemo(() => {
    const groups = {};
    couriers.forEach(c => { (groups[c.group || 'Other'] ||= []).push(c); });
    return groups;
  }, [couriers]);

  const canSubmit = method === 'courier' ? Boolean(courier && awb.trim()) : true;

  const submit = async () => {
    if (!canSubmit || saving) return;
    setSaving(true);
    try {
      const payload = { method, notes: notes.trim() || undefined };
      if (method === 'courier') {
        payload.courier = courier;
        payload.awb = awb.trim();
        if (trackingUrl.trim()) payload.tracking_url = trackingUrl.trim();
      }
      const updated = await adminFulfillOrder(order.order_number, payload);
      toast.success(method === 'courier' ? 'Order marked as shipped — email sent' : 'Order delivered — email sent');
      onFulfilled?.(updated);
      onClose?.();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to fulfil order');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-black/60 z-[60]" data-testid="fulfill-order-backdrop" />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" data-testid="fulfill-order-dialog">
          <div className="px-6 py-5 border-b border-[#EBD9CE] flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-[#B4593F]">Fulfil order</div>
              <h3 className="font-serif-display text-2xl mt-1">{order.order_number}</h3>
            </div>
            <button onClick={onClose} aria-label="Close" data-testid="fulfill-order-close"><X className="w-5 h-5" /></button>
          </div>

          <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-neutral-500 mb-3">Delivery method</div>
              <div className="grid grid-cols-2 gap-2">
                {METHOD_OPTIONS.map(({ key, label, Icon, sub, outcome }) => {
                  const active = method === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setMethod(key)}
                      className={`text-left p-3 rounded-lg border transition-colors ${active ? 'border-[#B4593F] bg-[#FDF3EB]' : 'border-[#EBD9CE] hover:border-[#B4593F]/60'}`}
                      data-testid={`fulfill-method-${key}`}
                    >
                      <div className="flex items-center gap-2 mb-1"><Icon className="w-4 h-4 text-[#B4593F]" /><span className="text-sm font-medium">{label}</span></div>
                      <div className="text-[11px] text-neutral-500">{sub}</div>
                      <div className="text-[10px] uppercase tracking-widest text-[#B4593F] mt-1">{outcome}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {method === 'courier' && (
              <div className="space-y-3">
                <label className="block">
                  <div className="text-[11px] uppercase tracking-widest text-neutral-500 mb-1.5">Courier <span className="text-rose-600">*</span></div>
                  <select
                    value={courier}
                    onChange={e => setCourier(e.target.value)}
                    className="w-full bg-white border border-[#EBD9CE] rounded-lg px-3 py-2.5 text-sm"
                    data-testid="fulfill-courier-select"
                  >
                    <option value="">Select courier…</option>
                    {Object.entries(grouped).map(([group, list]) => (
                      <optgroup key={group} label={group}>
                        {list.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <div className="text-[11px] uppercase tracking-widest text-neutral-500 mb-1.5">AWB / Tracking number <span className="text-rose-600">*</span></div>
                  <input
                    value={awb}
                    onChange={e => setAwb(e.target.value)}
                    placeholder="e.g. 1234567890"
                    className="w-full bg-white border border-[#EBD9CE] rounded-lg px-3 py-2.5 text-sm"
                    data-testid="fulfill-awb-input"
                  />
                </label>
                <label className="block">
                  <div className="text-[11px] uppercase tracking-widest text-neutral-500 mb-1.5">Tracking link <span className="text-neutral-400">(optional)</span></div>
                  <input
                    type="url"
                    value={trackingUrl}
                    onChange={e => setTrackingUrl(e.target.value)}
                    placeholder="https://couriersite.com/track/..."
                    className="w-full bg-white border border-[#EBD9CE] rounded-lg px-3 py-2.5 text-sm"
                    data-testid="fulfill-tracking-url-input"
                  />
                  <div className="text-[11px] text-neutral-500 mt-1.5">Paste the courier&apos;s public tracking URL. Included in the email.</div>
                </label>
              </div>
            )}

            <label className="block">
              <div className="text-[11px] uppercase tracking-widest text-neutral-500 mb-1.5">Internal notes <span className="text-neutral-400">(optional)</span></div>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                placeholder="e.g. Left with neighbour, gift-wrapped, expected on Friday…"
                className="w-full bg-white border border-[#EBD9CE] rounded-lg px-3 py-2 text-sm"
                data-testid="fulfill-notes-input"
              />
            </label>

            <div className="text-[11px] text-neutral-500 bg-[#FDF3EB] rounded-lg px-3 py-2">
              An automatic confirmation email is sent to <strong>{order.shipping_address?.email}</strong> when you submit.
            </div>
          </div>

          <div className="px-6 py-4 border-t border-[#EBD9CE] flex items-center justify-end gap-2 bg-[#FDF3EB]/40">
            <button
              type="button"
              onClick={onClose}
              className="text-xs uppercase tracking-widest px-4 py-2.5 rounded-full bg-white border border-[#EBD9CE] hover:border-[#B4593F] transition-colors"
              data-testid="fulfill-cancel-btn"
            >Cancel</button>
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit || saving}
              className="inline-flex items-center gap-2 text-xs uppercase tracking-widest px-5 py-2.5 rounded-full bg-[#1A1A1A] hover:bg-[#B4593F] disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
              data-testid="fulfill-submit-btn"
            >
              <PackageCheck className="w-3.5 h-3.5" />
              {saving ? 'Sending…' : (method === 'courier' ? 'Mark as shipped & email customer' : 'Mark delivered & email customer')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default FulfillOrderDialog;
