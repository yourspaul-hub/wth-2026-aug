import React, { useEffect, useState } from 'react';
import { adminListCoupons, adminCreateCoupon, adminUpdateCoupon, adminDeleteCoupon } from '../../lib/api';
import { toast } from 'sonner';
import { Plus, Edit3, Trash2, X, Copy } from 'lucide-react';

const empty = { code: '', kind: 'percent', value: 10, min_subtotal: 0, max_discount: null, usage_limit: null, active: true };

const AdminCoupons = () => {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);

  const load = () => adminListCoupons().then(setItems).catch(() => setItems([]));
  useEffect(() => { load(); }, []);

  const onSave = async () => {
    const p = { ...editing, value: +editing.value, min_subtotal: +editing.min_subtotal, max_discount: editing.max_discount ? +editing.max_discount : null, usage_limit: editing.usage_limit ? +editing.usage_limit : null };
    try {
      if (editing.id) await adminUpdateCoupon(editing.id, p); else await adminCreateCoupon(p);
      toast.success('Coupon saved'); setEditing(null); load();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Save failed'); }
  };
  const onDelete = async (c) => {
    if (!window.confirm(`Delete ${c.code}?`)) return;
    await adminDeleteCoupon(c.id); toast.success('Deleted'); load();
  };

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-serif-display text-4xl">Coupons</h1>
          <p className="text-sm text-neutral-600 mt-1">{items.length} coupon(s)</p>
        </div>
        <button onClick={() => setEditing({ ...empty })} className="inline-flex items-center gap-2 bg-[#213a60] hover:bg-[#B4593F] text-white px-5 py-2.5 rounded-full text-xs uppercase tracking-widest"><Plus className="w-4 h-4" /> New Coupon</button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(c => (
          <div key={c.id} className="bg-white rounded-xl border-2 border-dashed border-[#EBD9CE] p-6 relative">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-mono text-2xl font-bold text-[#B4593F] tracking-wider">{c.code}</div>
                <div className="text-xs text-neutral-500 mt-1">{c.kind === 'percent' ? `${c.value}% off` : `₹${c.value} off`} {c.max_discount ? `· max ₹${c.max_discount}` : ''}</div>
              </div>
              <button onClick={() => { navigator.clipboard.writeText(c.code); toast.success('Copied'); }} className="p-2 hover:bg-[#FDF3EB] rounded-full"><Copy className="w-3.5 h-3.5" /></button>
            </div>
            <div className="mt-4 text-xs text-neutral-600 space-y-1">
              <div>Min order: ₹{c.min_subtotal || 0}</div>
              <div>Used: {c.used_count || 0}{c.usage_limit ? ` / ${c.usage_limit}` : ''}</div>
              <div>Status: <span className={c.active ? 'text-green-600' : 'text-neutral-400'}>{c.active ? 'Active' : 'Inactive'}</span></div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <button onClick={() => setEditing(c)} className="flex-1 inline-flex items-center justify-center gap-1 text-xs border border-[#EBD9CE] rounded-full py-2 hover:border-[#B4593F] hover:text-[#B4593F]"><Edit3 className="w-3 h-3" /> Edit</button>
              <button onClick={() => onDelete(c)} className="px-3 py-2 text-xs border border-[#EBD9CE] rounded-full hover:border-red-500 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <>
          <div onClick={() => setEditing(null)} className="fixed inset-0 bg-black/50 z-50" />
          <aside className="fixed top-0 right-0 h-full w-full sm:w-[480px] bg-white z-50 overflow-y-auto shadow-2xl">
            <div className="px-6 py-5 border-b border-[#EBD9CE] flex items-center justify-between">
              <h3 className="font-serif-display text-2xl">{editing.id ? 'Edit Coupon' : 'New Coupon'}</h3>
              <button onClick={() => setEditing(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Code</span><input value={editing.code} onChange={e => setEditing({ ...editing, code: e.target.value.toUpperCase() })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F] font-mono" /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Kind</span><select value={editing.kind} onChange={e => setEditing({ ...editing, kind: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]"><option value="percent">Percent %</option><option value="flat">Flat ₹</option></select></label>
                <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Value</span><input type="number" value={editing.value} onChange={e => setEditing({ ...editing, value: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]" /></label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Min subtotal</span><input type="number" value={editing.min_subtotal || 0} onChange={e => setEditing({ ...editing, min_subtotal: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]" /></label>
                <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Max discount</span><input type="number" value={editing.max_discount || ''} onChange={e => setEditing({ ...editing, max_discount: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]" /></label>
              </div>
              <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Usage limit (optional)</span><input type="number" value={editing.usage_limit || ''} onChange={e => setEditing({ ...editing, usage_limit: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]" /></label>
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!editing.active} onChange={e => setEditing({ ...editing, active: e.target.checked })} /> <span className="text-sm">Active</span></label>
            </div>
            <div className="px-6 py-5 border-t border-[#EBD9CE] flex gap-3"><button onClick={onSave} className="flex-1 bg-[#213a60] hover:bg-[#B4593F] text-white py-3 rounded-full text-xs uppercase tracking-widest">Save</button><button onClick={() => setEditing(null)} className="px-6 py-3 border border-[#EBD9CE] rounded-full text-xs uppercase tracking-widest">Cancel</button></div>
          </aside>
        </>
      )}
    </div>
  );
};

export default AdminCoupons;
