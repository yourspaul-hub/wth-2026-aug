import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Edit3, X, Ruler, Search, GripVertical } from 'lucide-react';
import {
  adminListSizeCharts,
  adminCreateSizeChart,
  adminUpdateSizeChart,
  adminDeleteSizeChart,
  adminReorderSizeCharts,
} from '../../lib/api';
import { useDragReorder } from '../../hooks/useDragReorder';
import ImageFieldEditor from './ImageFieldEditor';

const empty = {
  name: '', slug: '', section: '', description: '', image: '', unit: 'in',
  table_headers: ['Size', 'Chest (in)', 'Length (in)', 'Shoulder (in)', 'Sleeve (in)'],
  table_rows: [],
  notes: '',
  order: 0,
  active: true,
};

const SECTIONS = ["Men's T-Shirts", "Women's Tops & Dresses", "Kids' Wear", 'Unisex Loungewear', 'All-Over Print (AOP) Collection', 'Other'];

const AdminSizeCharts = () => {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');

  const load = () => adminListSizeCharts().then(setItems).catch(() => setItems([]));
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => items.filter(c =>
    (!q || c.name.toLowerCase().includes(q.toLowerCase())) &&
    (!sectionFilter || c.section === sectionFilter)
  ), [items, q, sectionFilter]);

  const persistOrder = async (ids) => {
    setItems(prev => { const map = Object.fromEntries(prev.map(c => [c.id, c])); return ids.map(id => map[id]).filter(Boolean); });
    try { await adminReorderSizeCharts(ids); toast.success('Order saved'); }
    catch (er) { toast.error(er?.response?.data?.detail || 'Reorder failed'); load(); }
  };
  const dragEnabled = !q.trim() && !sectionFilter;
  const { dragProps, draggingId, overId } = useDragReorder(items, persistOrder);

  const start = (c) => setEditing(c ? { ...empty, ...c, table_headers: c.table_headers?.length ? c.table_headers : empty.table_headers, table_rows: c.table_rows || [] } : { ...empty });
  const close = () => setEditing(null);

  const save = async (e) => {
    e.preventDefault();
    const payload = { ...editing, table_headers: editing.table_headers || [], table_rows: editing.table_rows || [], active: editing.active !== false };
    delete payload.order;
    try {
      if (editing.id) await adminUpdateSizeChart(editing.id, payload);
      else await adminCreateSizeChart(payload);
      toast.success('Saved'); close(); load();
    } catch (er) { toast.error(er?.response?.data?.detail || 'Failed'); }
  };
  const del = async (c) => {
    if (!window.confirm(`Delete size chart "${c.name}"?`)) return;
    try { await adminDeleteSizeChart(c.id); toast.success('Deleted'); load(); }
    catch (er) { toast.error(er?.response?.data?.detail || 'Failed'); }
  };

  // Table editing helpers (rows/columns of the chart)
  const setHeaders = (headers) => setEditing(e => ({ ...e, table_headers: headers }));
  const setRows = (rows) => setEditing(e => ({ ...e, table_rows: rows }));
  const addColumn = () => {
    const h = [...(editing.table_headers || []), 'New column'];
    const r = (editing.table_rows || []).map(row => [...row, '']);
    setEditing(e => ({ ...e, table_headers: h, table_rows: r }));
  };
  const removeColumn = (idx) => {
    const h = (editing.table_headers || []).filter((_, i) => i !== idx);
    const r = (editing.table_rows || []).map(row => row.filter((_, i) => i !== idx));
    setEditing(e => ({ ...e, table_headers: h, table_rows: r }));
  };
  const addRow = () => setRows([...(editing.table_rows || []), (editing.table_headers || []).map(() => '')]);
  const removeRow = (idx) => setRows((editing.table_rows || []).filter((_, i) => i !== idx));
  const updateCell = (ri, ci, v) => setRows((editing.table_rows || []).map((row, i) => i === ri ? row.map((c, j) => j === ci ? v : c) : row));

  return (
    <div>
      <div className="flex items-end justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="font-serif-display text-4xl">Size Charts</h1>
          <p className="text-sm text-neutral-600 mt-1">{items.length} chart{items.length === 1 ? '' : 's'}{dragEnabled ? ' · drag rows to reorder' : ' · clear filters to reorder'} · attach any chart to a product from the Products screen</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search charts..." className="pl-9 pr-4 py-2.5 bg-white border border-[#EBD9CE] rounded-full text-sm outline-none focus:border-[#B4593F]" />
          </div>
          <select value={sectionFilter} onChange={e => setSectionFilter(e.target.value)} className="bg-white border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]">
            <option value="">All sections</option>
            {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={() => start(null)} data-testid="add-size-chart-btn" className="inline-flex items-center gap-2 bg-[#213a60] hover:bg-[#B4593F] text-white text-xs uppercase tracking-widest px-5 py-2.5 rounded-full">
            <Plus className="w-3.5 h-3.5" /> Add Chart
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center text-neutral-500 bg-white rounded-xl border border-[#EBD9CE]">
          <Ruler className="w-8 h-8 mx-auto mb-3 text-[#B4593F]/50" />
          No size charts match your filters.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => (
            <div
              key={c.id}
              data-testid={`size-chart-${c.id}`}
              {...(dragEnabled ? dragProps(c.id) : {})}
              className={`bg-white rounded-xl border overflow-hidden flex gap-4 p-4 transition-all ${!c.active ? 'opacity-60' : ''} ${draggingId === c.id ? 'opacity-40' : ''} ${overId === c.id && draggingId !== c.id ? 'border-[#B4593F] ring-2 ring-[#B4593F]/30' : 'border-[#EBD9CE]'}`}
            >
              {dragEnabled && (
                <div className="flex items-center pr-1 -my-4 -ml-4 pl-3 border-r border-[#EBD9CE]/60 cursor-grab active:cursor-grabbing" title="Drag to reorder">
                  <GripVertical className="w-4 h-4 text-neutral-400" />
                </div>
              )}
              <div className="w-20 h-20 rounded-lg bg-neutral-100 shrink-0 overflow-hidden">
                {c.image
                  ? <img src={c.image} alt={c.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-neutral-300"><Ruler className="w-6 h-6" /></div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="font-serif-display text-xl">{c.name}</div>
                  {!c.active && <span className="text-[9px] uppercase tracking-widest bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded">Hidden</span>}
                  <span className="text-[10px] uppercase tracking-widest bg-[#FDF3EB] text-[#B4593F] px-2 py-0.5 rounded">{c.section || '—'}</span>
                  <span className="text-[10px] uppercase tracking-widest bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">{c.product_count || 0} products</span>
                  <span className="text-[10px] uppercase tracking-widest bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{(c.table_rows || []).length} rows</span>
                </div>
                <div className="text-[11px] text-neutral-500 mt-1 font-mono">/{c.slug}</div>
                {c.description && <p className="text-xs text-neutral-600 mt-1 line-clamp-2">{c.description}</p>}
              </div>
              <div className="flex gap-1 shrink-0 items-start">
                <button onClick={() => start(c)} className="p-2 rounded-full hover:bg-[#FDF3EB]" aria-label="Edit"><Edit3 className="w-4 h-4" /></button>
                <button onClick={() => del(c)} className="p-2 rounded-full hover:bg-rose-50" aria-label="Delete"><Trash2 className="w-4 h-4 text-rose-600" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <>
          <div onClick={close} className="fixed inset-0 bg-black/50 z-50" />
          <aside className="fixed top-0 right-0 h-full w-full sm:w-[720px] bg-white z-50 overflow-y-auto shadow-2xl">
            <div className="px-6 py-5 border-b border-[#EBD9CE] flex items-center justify-between">
              <h3 className="font-serif-display text-2xl">{editing.id ? 'Edit Size Chart' : 'New Size Chart'}</h3>
              <button onClick={close} aria-label="Close"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={save} className="px-6 py-5 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <F label="Name *">
                  <input required value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value, slug: editing.id ? editing.slug : e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-') })} className="input" data-testid="size-chart-name" />
                </F>
                <F label="Slug *">
                  <input required value={editing.slug} onChange={e => setEditing({ ...editing, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-') })} className="input font-mono" />
                </F>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <F label="Section">
                  <select value={editing.section || ''} onChange={e => setEditing({ ...editing, section: e.target.value })} className="input">
                    <option value="">— None —</option>
                    {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </F>
                <F label="Unit"><select value={editing.unit || 'in'} onChange={e => setEditing({ ...editing, unit: e.target.value })} className="input"><option value="in">inches</option><option value="cm">centimetres</option></select></F>
              </div>
              <F label="Image (garment illustration OR full chart infographic)">
                <ImageFieldEditor value={editing.image || ''} onChange={(v) => setEditing({ ...editing, image: v })} testKey="size-chart-image" />
              </F>
              {editing.image && <img src={editing.image} alt="" className="w-full max-h-64 object-contain rounded-lg border border-[#EBD9CE] bg-white" />}
              <F label="Description / How to measure">
                <textarea rows="3" value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} className="input !rounded-lg" />
              </F>

              {/* Table editor */}
              <div className="border border-[#EBD9CE] rounded-xl p-3">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-widest text-neutral-600">Size table</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Columns and rows are freely editable — use "in" or "cm" values that match the chosen unit.</div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={addColumn} className="text-[11px] uppercase tracking-widest text-[#B4593F] hover:text-[#213a60] inline-flex items-center gap-1"><Plus className="w-3 h-3" /> Column</button>
                    <button type="button" onClick={addRow} data-testid="add-row-btn" className="text-[11px] uppercase tracking-widest text-[#B4593F] hover:text-[#213a60] inline-flex items-center gap-1"><Plus className="w-3 h-3" /> Row</button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr>
                        {(editing.table_headers || []).map((h, i) => (
                          <th key={i} className="p-1">
                            <div className="flex items-center gap-1">
                              <input value={h} onChange={e => setHeaders((editing.table_headers || []).map((x, j) => j === i ? e.target.value : x))} className="w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded px-2 py-1 font-medium text-[#213a60]" />
                              <button type="button" onClick={() => removeColumn(i)} className="text-neutral-400 hover:text-rose-600" title="Delete column"><Trash2 className="w-3 h-3" /></button>
                            </div>
                          </th>
                        ))}
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(editing.table_rows || []).map((row, ri) => (
                        <tr key={ri}>
                          {(editing.table_headers || []).map((_, ci) => (
                            <td key={ci} className="p-1">
                              <input
                                value={row[ci] ?? ''}
                                onChange={e => updateCell(ri, ci, e.target.value)}
                                className="w-full bg-white border border-[#EBD9CE] rounded px-2 py-1"
                                placeholder={ci === 0 ? 'e.g. M' : '—'}
                              />
                            </td>
                          ))}
                          <td className="p-1 text-center">
                            <button type="button" onClick={() => removeRow(ri)} className="text-neutral-400 hover:text-rose-600" title="Delete row" data-testid={`delete-row-${ri}`}><Trash2 className="w-3.5 h-3.5" /></button>
                          </td>
                        </tr>
                      ))}
                      {(editing.table_rows || []).length === 0 && (
                        <tr><td colSpan={(editing.table_headers || []).length + 1} className="text-center text-[11px] text-neutral-400 py-3">No rows yet. Click "+ Row" to add sizes.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <F label="Footnote / notes (shown below the table)">
                <textarea rows="2" value={editing.notes || ''} onChange={e => setEditing({ ...editing, notes: e.target.value })} className="input !rounded-lg" placeholder="Optional — e.g., allow ±1 inch tolerance for handmade garments." />
              </F>

              <label className="flex items-start gap-3 bg-[#FDF3EB] border border-[#EBD9CE] rounded-xl px-4 py-3 cursor-pointer">
                <input type="checkbox" checked={editing.active !== false} onChange={e => setEditing({ ...editing, active: e.target.checked })} className="mt-0.5 accent-[#B4593F]" />
                <span className="flex-1">
                  <span className="block text-sm font-medium text-[#213a60]">Active</span>
                  <span className="block text-[11px] text-neutral-600 mt-0.5">Uncheck to hide this chart from the storefront and the Product Size Chart dropdown.</span>
                </span>
              </label>

              <div className="pt-2 flex gap-3 sticky bottom-0 bg-white pb-2">
                <button type="submit" data-testid="save-size-chart-btn" className="flex-1 bg-[#213a60] hover:bg-[#B4593F] text-white text-xs uppercase tracking-widest px-6 py-2.5 rounded-full">Save</button>
                <button type="button" onClick={close} className="px-6 py-2.5 border border-[#EBD9CE] rounded-full text-xs uppercase tracking-widest">Cancel</button>
              </div>
            </form>
          </aside>
        </>
      )}
      <style>{`.input { width:100%; background:#FDF3EB; border:1px solid #EBD9CE; border-radius:9999px; padding:8px 16px; outline:none; font-size:14px; }
        .input:focus { border-color:#B4593F; }
        textarea.input, .input.\\!rounded-lg { border-radius: 12px; }`}</style>
    </div>
  );
};

const F = ({ label, children }) => (
  <label className="block">
    <span className="text-[11px] uppercase tracking-widest text-neutral-500 block mb-1">{label}</span>
    {children}
  </label>
);

export default AdminSizeCharts;
