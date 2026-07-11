import React, { useEffect, useState } from 'react';
import { adminListShippingRules, adminCreateShippingRule, adminUpdateShippingRule, adminDeleteShippingRule } from '../../lib/api';
import { toast } from 'sonner';
import { Plus, Edit3, Trash2, X, Truck, Store, Zap, Gift } from 'lucide-react';

const empty = { name: '', kind: 'flat', price: 0, min_subtotal: 0, max_weight_grams: null, eta_days: '3-5', states: [], pincodes: [], pickup_address: '', active: true, order: 0 };

const kindIcon = { flat: Truck, free: Gift, pickup: Store, express: Zap };

const AdminShipping = () => {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);

  const load = () => adminListShippingRules().then(setItems).catch(() => setItems([]));
  useEffect(() => { load(); }, []);

  const onSave = async () => {
    const p = { ...editing, price: +editing.price, min_subtotal: +editing.min_subtotal, order: +editing.order, states: typeof editing.states === 'string' ? editing.states.split(',').map(s => s.trim()).filter(Boolean) : editing.states, pincodes: typeof editing.pincodes === 'string' ? editing.pincodes.split(',').map(s => s.trim()).filter(Boolean) : editing.pincodes };
    try {
      if (editing.id) await adminUpdateShippingRule(editing.id, p); else await adminCreateShippingRule(p);
      toast.success('Rule saved'); setEditing(null); load();
    } catch { toast.error('Save failed'); }
  };
  const onDelete = async (r) => {
    if (!window.confirm(`Delete ${r.name}?`)) return;
    await adminDeleteShippingRule(r.id); toast.success('Deleted'); load();
  };

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-serif-display text-4xl">Shipping Rules</h1>
          <p className="text-sm text-neutral-600 mt-1">Flat rates, free-shipping thresholds, express and local pickup options.</p>
        </div>
        <button onClick={() => setEditing({ ...empty })} className="inline-flex items-center gap-2 bg-[#213a60] hover:bg-[#B4593F] text-white px-5 py-2.5 rounded-full text-xs uppercase tracking-widest"><Plus className="w-4 h-4" /> New Rule</button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(r => {
          const I = kindIcon[r.kind] || Truck;
          return (
            <div key={r.id} className="bg-white rounded-xl border border-[#EBD9CE] p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#FDF3EB] flex items-center justify-center border border-[#EBD9CE]"><I className="w-4 h-4 text-[#B4593F]" /></div>
                  <div>
                    <div className="text-sm font-medium">{r.name}</div>
                    <div className="text-[11px] uppercase tracking-widest text-[#B4593F] mt-0.5">{r.kind}</div>
                  </div>
                </div>
                <span className={`text-[10px] uppercase px-2 py-0.5 rounded ${r.active ? 'bg-green-50 text-green-700' : 'bg-neutral-100 text-neutral-500'}`}>{r.active ? 'Active' : 'Off'}</span>
              </div>
              <div className="mt-4 space-y-1 text-xs text-neutral-600">
                <div>Price: {r.kind === 'free' ? 'Free' : `₹${r.price}`}</div>
                {r.min_subtotal > 0 && <div>Min order: ₹{r.min_subtotal}</div>}
                <div>ETA: {r.eta_days} days</div>
                {r.states?.length > 0 && <div>States: {r.states.join(', ')}</div>}
                {r.kind === 'pickup' && r.pickup_address && <div>📍 {r.pickup_address}</div>}
              </div>
              <div className="flex items-center gap-2 mt-4">
                <button onClick={() => setEditing({ ...r, states: (r.states || []).join(', '), pincodes: (r.pincodes || []).join(', ') })} className="flex-1 inline-flex items-center justify-center gap-1 text-xs border border-[#EBD9CE] rounded-full py-2 hover:border-[#B4593F] hover:text-[#B4593F]"><Edit3 className="w-3 h-3" /> Edit</button>
                <button onClick={() => onDelete(r)} className="px-3 py-2 text-xs border border-[#EBD9CE] rounded-full hover:border-red-500 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <>
          <div onClick={() => setEditing(null)} className="fixed inset-0 bg-black/50 z-50" />
          <aside className="fixed top-0 right-0 h-full w-full sm:w-[520px] bg-white z-50 overflow-y-auto shadow-2xl">
            <div className="px-6 py-5 border-b border-[#EBD9CE] flex items-center justify-between"><h3 className="font-serif-display text-2xl">{editing.id ? 'Edit Rule' : 'New Rule'}</h3><button onClick={() => setEditing(null)}><X className="w-5 h-5" /></button></div>
            <div className="px-6 py-5 space-y-4">
              <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Name</span><input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]" /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Kind</span><select value={editing.kind} onChange={e => setEditing({ ...editing, kind: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]"><option value="flat">Flat rate</option><option value="free">Free shipping</option><option value="express">Express</option><option value="pickup">Local pickup</option></select></label>
                <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Price ₹</span><input type="number" value={editing.price} onChange={e => setEditing({ ...editing, price: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]" /></label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Min subtotal ₹</span><input type="number" value={editing.min_subtotal} onChange={e => setEditing({ ...editing, min_subtotal: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]" /></label>
                <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">ETA days</span><input value={editing.eta_days} onChange={e => setEditing({ ...editing, eta_days: e.target.value })} placeholder="3-5" className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]" /></label>
              </div>
              <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">States (comma sep, empty = all)</span><input value={editing.states || ''} onChange={e => setEditing({ ...editing, states: e.target.value })} placeholder="Maharashtra, Karnataka" className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]" /></label>
              {editing.kind === 'pickup' && (
                <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Pickup Address</span><textarea rows="2" value={editing.pickup_address || ''} onChange={e => setEditing({ ...editing, pickup_address: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]" /></label>
              )}
              <div className="grid grid-cols-2 gap-3 items-end">
                <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Order</span><input type="number" value={editing.order || 0} onChange={e => setEditing({ ...editing, order: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]" /></label>
                <label className="inline-flex items-center gap-2 pb-2"><input type="checkbox" checked={!!editing.active} onChange={e => setEditing({ ...editing, active: e.target.checked })} /> <span className="text-sm">Active</span></label>
              </div>
            </div>
            <div className="px-6 py-5 border-t border-[#EBD9CE] flex gap-3"><button onClick={onSave} className="flex-1 bg-[#213a60] hover:bg-[#B4593F] text-white py-3 rounded-full text-xs uppercase tracking-widest">Save</button><button onClick={() => setEditing(null)} className="px-6 py-3 border border-[#EBD9CE] rounded-full text-xs uppercase tracking-widest">Cancel</button></div>
          </aside>
        </>
      )}
    </div>
  );
};

export default AdminShipping;
