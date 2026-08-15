import React, { useEffect, useMemo, useState } from 'react';
import { adminListTaxRates, adminCreateTaxRate, adminUpdateTaxRate, adminDeleteTaxRate, adminListCategories, adminListSubcategories, adminGetCheckoutSettings, adminUpdateCheckoutSettings } from '../../lib/api';
import { toast } from 'sonner';
import { Plus, Edit3, Trash2, X, Percent, ChevronDown, ChevronRight } from 'lucide-react';

const empty = { name: '', percent: 12, scope: 'all', category_ids: [], subcategory_ids: [], active: true, order: 0 };

const AdminTax = () => {
  const [items, setItems] = useState([]);
  const [cats, setCats] = useState([]);
  const [subsByCat, setSubsByCat] = useState({}); // {category_id: [sub, sub]}
  const [editing, setEditing] = useState(null);
  const [checkoutSettings, setCheckoutSettings] = useState({ cod_enabled: true, prices_include_tax: true });

  const load = () => adminListTaxRates().then(setItems).catch(() => setItems([]));
  useEffect(() => {
    load();
    adminGetCheckoutSettings().then(setCheckoutSettings).catch(() => {});
    adminListCategories().then(async (list) => {
      setCats(list);
      const entries = await Promise.all(list.map(c => adminListSubcategories(c.id).then(arr => [c.id, arr]).catch(() => [c.id, []])));
      setSubsByCat(Object.fromEntries(entries));
    });
  }, []);

  const updateCheckoutSetting = async (patch) => {
    const optimistic = { ...checkoutSettings, ...patch };
    setCheckoutSettings(optimistic);
    try {
      const r = await adminUpdateCheckoutSettings(patch);
      setCheckoutSettings(r);
      toast.success('Saved');
    } catch (er) { toast.error(er?.response?.data?.detail || 'Save failed'); }
  };

  const catName = (id) => cats.find(c => c.id === id)?.name || id;
  const subName = (id) => {
    for (const arr of Object.values(subsByCat)) {
      const s = arr.find(x => x.id === id);
      if (s) return s.name;
    }
    return id;
  };

  const toggleId = (arrKey, id) => setEditing(e => {
    const set = new Set(e[arrKey] || []);
    if (set.has(id)) set.delete(id); else set.add(id);
    return { ...e, [arrKey]: [...set] };
  });

  const openEdit = (r) => {
    setEditing(r ? {
      ...empty, ...r,
      // Migrate legacy single-id fields into the multi-select arrays
      category_ids: r.category_ids?.length ? r.category_ids : (r.category_id ? [r.category_id] : []),
      subcategory_ids: r.subcategory_ids?.length ? r.subcategory_ids : (r.subcategory_id ? [r.subcategory_id] : []),
    } : { ...empty });
  };

  const onSave = async () => {
    const isSpecific = editing.scope === 'specific';
    const payload = {
      ...editing,
      percent: +editing.percent,
      order: +editing.order,
      category_ids: isSpecific ? (editing.category_ids || []) : [],
      subcategory_ids: isSpecific ? (editing.subcategory_ids || []) : [],
      category_id: null,
      subcategory_id: null,
    };
    if (isSpecific && !payload.category_ids.length && !payload.subcategory_ids.length) {
      toast.error('Pick at least one category or subcategory'); return;
    }
    try {
      if (editing.id) await adminUpdateTaxRate(editing.id, payload); else await adminCreateTaxRate(payload);
      toast.success('Rate saved'); setEditing(null); load();
    } catch (er) { toast.error(er?.response?.data?.detail || 'Save failed'); }
  };

  const onDelete = async (r) => {
    if (!window.confirm(`Delete ${r.name}?`)) return;
    await adminDeleteTaxRate(r.id); toast.success('Deleted'); load();
  };

  const scopeSummary = (r) => {
    const ids = r.category_ids?.length ? r.category_ids : (r.category_id ? [r.category_id] : []);
    const subs = r.subcategory_ids?.length ? r.subcategory_ids : (r.subcategory_id ? [r.subcategory_id] : []);
    if (r.scope === 'all') return 'All products';
    if (!ids.length && !subs.length) return `${r.scope} (unassigned)`;
    const parts = [];
    if (ids.length) parts.push(`${ids.length} categor${ids.length === 1 ? 'y' : 'ies'}`);
    if (subs.length) parts.push(`${subs.length} subcategor${subs.length === 1 ? 'y' : 'ies'}`);
    return parts.join(' + ');
  };

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-serif-display text-4xl">Tax Rates</h1>
          <p className="text-sm text-neutral-600 mt-1">Global GST slab or per-category / per-subcategory rates. Applied server-side on checkout.</p>
        </div>
        <button onClick={() => openEdit(null)} data-testid="add-tax-rate" className="inline-flex items-center gap-2 bg-[#213a60] hover:bg-[#B4593F] text-white px-5 py-2.5 rounded-full text-xs uppercase tracking-widest"><Plus className="w-4 h-4" /> New Rate</button>
      </div>

      {/* Global checkout toggles */}
      <div className="bg-white border border-[#EBD9CE] rounded-xl p-5 mb-6 grid md:grid-cols-2 gap-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={!!checkoutSettings.prices_include_tax}
            onChange={e => updateCheckoutSetting({ prices_include_tax: e.target.checked })}
            className="mt-1 accent-[#B4593F] w-5 h-5"
            data-testid="toggle-prices-include-tax"
          />
          <span className="flex-1">
            <span className="block text-sm font-medium text-[#213a60]">Prices on the site already include GST</span>
            <span className="block text-[11px] text-neutral-600 mt-0.5">When on, the GST shown at checkout is the amount already baked into the price — no extra tax is added on top.</span>
          </span>
        </label>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={!!checkoutSettings.cod_enabled}
            onChange={e => updateCheckoutSetting({ cod_enabled: e.target.checked })}
            className="mt-1 accent-[#B4593F] w-5 h-5"
            data-testid="toggle-cod-enabled"
          />
          <span className="flex-1">
            <span className="block text-sm font-medium text-[#213a60]">Offer Cash on Delivery at checkout</span>
            <span className="block text-[11px] text-neutral-600 mt-0.5">Turn off to hide COD site-wide. You can also disable COD for a specific product from its edit screen.</span>
          </span>
        </label>
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
            <div className="mt-3 text-xs text-neutral-500">Scope: {scopeSummary(r)}</div>
            <div className="flex items-center gap-2 mt-4">
              <button onClick={() => openEdit(r)} className="flex-1 inline-flex items-center justify-center gap-1 text-xs border border-[#EBD9CE] rounded-full py-2 hover:border-[#B4593F] hover:text-[#B4593F]"><Edit3 className="w-3 h-3" /> Edit</button>
              <button onClick={() => onDelete(r)} className="px-3 py-2 text-xs border border-[#EBD9CE] rounded-full hover:border-red-500 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <>
          <div onClick={() => setEditing(null)} className="fixed inset-0 bg-black/50 z-50" />
          <aside className="fixed top-0 right-0 h-full w-full sm:w-[560px] bg-white z-50 overflow-y-auto shadow-2xl">
            <div className="px-6 py-5 border-b border-[#EBD9CE] flex items-center justify-between"><h3 className="font-serif-display text-2xl">{editing.id ? 'Edit Rate' : 'New Rate'}</h3><button onClick={() => setEditing(null)}><X className="w-5 h-5" /></button></div>
            <div className="px-6 py-5 space-y-4">
              <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Name</span><input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="GST 12%" className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]" /></label>
              <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Percent</span><input type="number" step="0.01" value={editing.percent} onChange={e => setEditing({ ...editing, percent: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]" /></label>
              <label className="block">
                <span className="text-[11px] uppercase tracking-widest text-neutral-600">Scope</span>
                <select value={editing.scope} onChange={e => setEditing({ ...editing, scope: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]">
                  <option value="all">Global (all products)</option>
                  <option value="specific">Specific categories / subcategories</option>
                </select>
              </label>

              {editing.scope === 'specific' && (
                <div className="bg-[#FDF3EB] border border-[#EBD9CE] rounded-xl p-4">
                  <div className="text-[11px] uppercase tracking-widest text-neutral-600 mb-3">Pick which categories or subcategories this rate applies to</div>
                  <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1" data-testid="tax-scope-tree">
                    {cats.map(c => {
                      const subs = subsByCat[c.id] || [];
                      const catChecked = (editing.category_ids || []).includes(c.id);
                      return (
                        <CategoryNode
                          key={c.id}
                          cat={c}
                          subs={subs}
                          catChecked={catChecked}
                          selectedSubs={editing.subcategory_ids || []}
                          onToggleCat={() => toggleId('category_ids', c.id)}
                          onToggleSub={(sid) => toggleId('subcategory_ids', sid)}
                        />
                      );
                    })}
                    {cats.length === 0 && <div className="text-xs text-neutral-500">No categories yet.</div>}
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-3">Selecting a parent category applies the rate to every product in it — including any product placed in one of its subcategories. Ticking a specific subcategory (without the parent) applies the rate to just that subset.</div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 items-end">
                <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Order</span><input type="number" value={editing.order || 0} onChange={e => setEditing({ ...editing, order: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]" /></label>
                <label className="inline-flex items-center gap-2 pb-2"><input type="checkbox" checked={!!editing.active} onChange={e => setEditing({ ...editing, active: e.target.checked })} /> <span className="text-sm">Active</span></label>
              </div>
              <div className="text-[11px] text-neutral-500 bg-[#FDF3EB] rounded-lg p-3">Priority at checkout: subcategory match &gt; category match &gt; global. Lowest "Order" value wins if two rules match.</div>
            </div>
            <div className="px-6 py-5 border-t border-[#EBD9CE] flex gap-3"><button onClick={onSave} data-testid="save-tax-rate" className="flex-1 bg-[#213a60] hover:bg-[#B4593F] text-white py-3 rounded-full text-xs uppercase tracking-widest">Save</button><button onClick={() => setEditing(null)} className="px-6 py-3 border border-[#EBD9CE] rounded-full text-xs uppercase tracking-widest">Cancel</button></div>
          </aside>
        </>
      )}
    </div>
  );
};

// Collapsible category row with its subcategory checkboxes underneath.
const CategoryNode = ({ cat, subs, catChecked, selectedSubs, onToggleCat, onToggleSub }) => {
  const [open, setOpen] = useState(false);
  const selectedInThisCat = subs.filter(s => selectedSubs.includes(s.id)).length;
  return (
    <div className="bg-white rounded-lg border border-[#EBD9CE]">
      <div className="flex items-center gap-2 px-3 py-2">
        <label className="inline-flex items-center gap-2 cursor-pointer flex-1">
          <input
            type="checkbox"
            checked={catChecked}
            onChange={onToggleCat}
            className="accent-[#B4593F]"
            data-testid={`tax-cat-${cat.id}`}
          />
          <span className="text-sm font-medium text-[#213a60]">{cat.name}</span>
          {selectedInThisCat > 0 && !catChecked && (
            <span className="text-[10px] uppercase tracking-widest bg-[#FDF3EB] text-[#B4593F] px-2 py-0.5 rounded">{selectedInThisCat} sub</span>
          )}
        </label>
        {subs.length > 0 && (
          <button type="button" onClick={() => setOpen(o => !o)} className="text-neutral-400 hover:text-[#B4593F]" title={open ? 'Hide subcategories' : 'Show subcategories'}>
            {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        )}
      </div>
      {open && subs.length > 0 && (
        <div className="pl-8 pr-3 pb-2 pt-1 space-y-1 border-t border-[#EBD9CE]/60">
          {subs.map(s => (
            <label key={s.id} className={`flex items-center gap-2 text-sm cursor-pointer ${catChecked ? 'opacity-60' : ''}`}>
              <input
                type="checkbox"
                checked={catChecked || selectedSubs.includes(s.id)}
                disabled={catChecked}
                onChange={() => onToggleSub(s.id)}
                className="accent-[#B4593F]"
                data-testid={`tax-sub-${s.id}`}
              />
              <span>{s.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminTax;
