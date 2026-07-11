import React, { useEffect, useState } from 'react';
import { adminListTaxRates, adminCreateTaxRate, adminUpdateTaxRate, adminDeleteTaxRate, adminListCategories } from '../../lib/api';
import { toast } from 'sonner';
import { Plus, Edit3, Trash2, X, Percent } from 'lucide-react';

const empty = { name: '', percent: 12, scope: 'all', category_id: null, active: true, order: 0 };

const AdminTax = () => {
  const [items, setItems] = useState([]);
  const [cats, setCats] = useState([]);
  const [editing, setEditing] = useState(null);

  const load = () => adminListTaxRates().then(setItems).catch(() => setItems([]));
  useEffect(() => { load(); adminListCategories().then(setCats); }, []);

  const onSave = async () => {
    const p = { ...editing, percent: +editing.percent, order: +editing.order, category_id: editing.scope === 'category' ? editing.category_id : null };
    try {
      if (editing.id) await adminUpdateTaxRate(editing.id, p); else await adminCreateTaxRate(p);
      toast.success('Rate saved'); setEditing(null); load();
    } catch { toast.error('Save failed'); }
  };
  const onDelete = async (r) => {
    if (!window.confirm(`Delete ${r.name}?`)) return;
    await adminDeleteTaxRate(r.id); toast.success('Deleted'); load();
  };

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-serif-display text-4xl">Tax Rates</h1>
          <p className="text-sm text-neutral-600 mt-1">Global GST slab or per-category rates. Applied server-side on checkout.</p>
        </div>
        <button onClick={() => setEditing({ ...empty })} className="inline-flex items-center gap-2 bg-[#213a60] hover:bg-[#B4593F] text-white px-5 py-2.5 rounded-full text-xs uppercase tracking-widest"><Plus className="w-4 h-4" /> New Rate</button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(r => (
          <div key={r.id} className="bg-white rounded-xl border border-[#EBD9CE] p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#FDF3EB] flex items-center justify-center border border-[#EBD9CE]"><Percent className="w-4 h-4 text-[#B4593F]" /></div>
                <div>
                  <div className="text-sm font-medium">{r.name}</div>
                  <div className="text-2xl font-serif-display text-[#B4593F] mt-0.5">{r.percent}%</div>
                </div>
              </div>
              <span className={`text-[10px] uppercase px-2 py-0.5 rounded ${r.active ? 'bg-green-50 text-green-700' : 'bg-neutral-100 text-neutral-500'}`}>{r.active ? 'Active' : 'Off'}</span>
            </div>
            <div className="mt-3 text-xs text-neutral-500">Scope: {r.scope}{r.scope === 'category' && r.category_id ? ` → ${cats.find(c => c.id === r.category_id)?.name || r.category_id}` : ''}</div>
            <div className="flex items-center gap-2 mt-4">
              <button onClick={() => setEditing(r)} className="flex-1 inline-flex items-center justify-center gap-1 text-xs border border-[#EBD9CE] rounded-full py-2 hover:border-[#B4593F] hover:text-[#B4593F]"><Edit3 className="w-3 h-3" /> Edit</button>
              <button onClick={() => onDelete(r)} className="px-3 py-2 text-xs border border-[#EBD9CE] rounded-full hover:border-red-500 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <>
          <div onClick={() => setEditing(null)} className="fixed inset-0 bg-black/50 z-50" />
          <aside className="fixed top-0 right-0 h-full w-full sm:w-[440px] bg-white z-50 overflow-y-auto shadow-2xl">
            <div className="px-6 py-5 border-b border-[#EBD9CE] flex items-center justify-between"><h3 className="font-serif-display text-2xl">{editing.id ? 'Edit Rate' : 'New Rate'}</h3><button onClick={() => setEditing(null)}><X className="w-5 h-5" /></button></div>
            <div className="px-6 py-5 space-y-4">
              <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Name</span><input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="GST 12%" className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]" /></label>
              <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Percent</span><input type="number" step="0.01" value={editing.percent} onChange={e => setEditing({ ...editing, percent: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]" /></label>
              <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Scope</span><select value={editing.scope} onChange={e => setEditing({ ...editing, scope: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]"><option value="all">Global (all products)</option><option value="category">Per category</option></select></label>
              {editing.scope === 'category' && (
                <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Category</span><select value={editing.category_id || ''} onChange={e => setEditing({ ...editing, category_id: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]"><option value="">Select</option>{cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
              )}
              <div className="grid grid-cols-2 gap-3 items-end">
                <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Order</span><input type="number" value={editing.order || 0} onChange={e => setEditing({ ...editing, order: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]" /></label>
                <label className="inline-flex items-center gap-2 pb-2"><input type="checkbox" checked={!!editing.active} onChange={e => setEditing({ ...editing, active: e.target.checked })} /> <span className="text-sm">Active</span></label>
              </div>
              <div className="text-[11px] text-neutral-500 bg-[#FDF3EB] rounded-lg p-3">If multiple global rates are active, the one with lowest order is used. Per-category rates always take priority over global.</div>
            </div>
            <div className="px-6 py-5 border-t border-[#EBD9CE] flex gap-3"><button onClick={onSave} className="flex-1 bg-[#213a60] hover:bg-[#B4593F] text-white py-3 rounded-full text-xs uppercase tracking-widest">Save</button><button onClick={() => setEditing(null)} className="px-6 py-3 border border-[#EBD9CE] rounded-full text-xs uppercase tracking-widest">Cancel</button></div>
          </aside>
        </>
      )}
    </div>
  );
};

export default AdminTax;
