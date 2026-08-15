import React, { useEffect, useMemo, useState, useRef } from 'react';
import { adminListProducts, adminCreateProduct, adminUpdateProduct, adminDeleteProduct, adminListCategories, productTemplateUrl, adminBulkUploadProducts, adminImportFromSheet, adminListSubcategories, adminReorderProducts } from '../../lib/api';
import { toast } from 'sonner';
import { Plus, Edit3, Trash2, X, Search, Layers, Image as ImageIcon, Sparkles, Info, Tag as TagIcon, Upload, Download, FileSpreadsheet, GripVertical, Copy } from 'lucide-react';
import ImageFieldEditor from './ImageFieldEditor';
import { useDragReorder } from '../../hooks/useDragReorder';

const empty = {
  name: '', slug: '', category: '', subcategory: '', collections: [], price: 0, original_price: 0,
  image: '', hover_image: '', gallery: [], videos: [], verse: '',
  tag: '', ribbon: '', colors: [], description: '', stock: 100, sku: '',
  active: true, product_type: 'physical', digital_file_url: '',
  weight_grams: 500,
  personalization_enabled: false, personalization_label: 'Personalize (optional)', personalization_cost: 0, personalization_max_length: 40,
  variant_options: [], variants: [],
  seo_title: '', seo_description: '', seo_keywords: '',
};

const cartesian = (arrs) => arrs.reduce((acc, arr) => acc.flatMap(a => arr.map(v => [...a, v])), [[]]);

const AdminProducts = () => {
  const [items, setItems] = useState([]);
  const [cats, setCats] = useState([]);
  const [subs, setSubs] = useState([]);  // subcategories for the currently-edited product's category
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null);
  const [tab, setTab] = useState('basic');
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const fileRef = useRef(null);

  const load = () => adminListProducts().then(setItems).catch(() => setItems([]));
  useEffect(() => { load(); adminListCategories().then(setCats); }, []);

  // Load subcategories whenever the editing product's category changes
  useEffect(() => {
    if (!editing?.category) { setSubs([]); return; }
    adminListSubcategories(editing.category).then(setSubs).catch(() => setSubs([]));
  }, [editing?.category]);

  const doBulk = async (file) => {
    if (!file) return;
    setUploading(true); setBulkResult(null);
    try {
      const res = await adminBulkUploadProducts(file);
      setBulkResult(res);
      toast.success(`Bulk upload: ${res.created} created · ${res.updated} updated · ${res.errors?.length || 0} errors`);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const doSheetImport = async () => {
    if (!sheetUrl.trim()) return;
    setUploading(true); setBulkResult(null);
    try {
      const res = await adminImportFromSheet(sheetUrl.trim());
      setBulkResult(res);
      toast.success(`Sheet import: ${res.created} created · ${res.updated} updated · ${res.errors?.length || 0} errors`);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Sheet import failed');
    } finally {
      setUploading(false);
    }
  };

  const filtered = useMemo(() => items.filter(p => !q || p.name.toLowerCase().includes(q.toLowerCase()) || (p.sku || '').toLowerCase().includes(q.toLowerCase())), [items, q]);

  const persistOrder = async (ids) => {
    // Optimistic reorder — only meaningful when search is empty
    setItems(prev => {
      const map = Object.fromEntries(prev.map(p => [p.id, p]));
      return ids.map(id => map[id]).filter(Boolean);
    });
    try { await adminReorderProducts(ids); toast.success('Order saved'); }
    catch (er) { toast.error(er?.response?.data?.detail || 'Reorder failed'); load(); }
  };
  const dragEnabled = !q.trim();
  const { dragProps, draggingId, overId } = useDragReorder(items, persistOrder);

  const startEdit = (p) => {
    setTab('basic');
    setEditing(p ? {
      ...empty, ...p,
      gallery: p.gallery || [], videos: p.videos || [], variants: p.variants || [], variant_options: p.variant_options || [],
      colors: (p.colors || []).join(', '),
    } : { ...empty });
  };

  const startClone = (p) => {
    setTab('basic');
    const rand = Math.random().toString(36).slice(2, 8);
    // Strip id/timestamps/order so we create a brand new product; prefix identifying fields with "Copy of"
    const { id, sku, created_at, display_order, seo_title, ...rest } = p; // eslint-disable-line no-unused-vars
    setEditing({
      ...empty, ...rest,
      name: `Copy of ${p.name || ''}`.trim(),
      slug: `copy-of-${p.slug || rand}-${rand}`,
      sku: '',
      seo_title: p.seo_title ? `Copy of ${p.seo_title}` : '',
      gallery: [...(p.gallery || [])],
      videos: [...(p.videos || [])],
      variants: (p.variants || []).map(v => ({ ...v, id: undefined })),
      variant_options: [...(p.variant_options || [])],
      colors: (p.colors || []).join(', '),
    });
    toast.info('Cloned — edit and save to create the copy');
  };

  const onSave = async () => {
    const payload = {
      ...editing,
      price: +editing.price, original_price: +editing.original_price, stock: +editing.stock,
      weight_grams: +editing.weight_grams,
      colors: typeof editing.colors === 'string' ? editing.colors.split(',').map(s => s.trim()).filter(Boolean) : (editing.colors || []),
      personalization_max_length: +editing.personalization_max_length,
      personalization_cost: Math.max(0, +(editing.personalization_cost || 0)),
      subcategory: editing.subcategory || null,
    };
    try {
      if (editing.id) await adminUpdateProduct(editing.id, payload); else await adminCreateProduct(payload);
      toast.success(editing.id ? 'Product updated' : 'Product created');
      setEditing(null); load();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Save failed'); }
  };

  const onDelete = async (p) => {
    if (!window.confirm(`Delete ${p.name}?`)) return;
    await adminDeleteProduct(p.id); toast.success('Deleted'); load();
  };

  // Variant helpers
  const addOption = () => setEditing(e => ({ ...e, variant_options: [...(e.variant_options || []), { name: '', values: [] }] }));
  const updateOption = (idx, patch) => setEditing(e => {
    const opts = [...(e.variant_options || [])];
    const before = { ...opts[idx] };
    opts[idx] = { ...opts[idx], ...patch };
    const after = opts[idx];
    // If values list shrank, prune combinations whose attr value is no longer allowed.
    let variants = e.variants || [];
    if ('values' in patch && before.name) {
      const allowed = new Set((after.values || []));
      variants = variants.filter(v => !v.attrs || !(before.name in v.attrs) || allowed.has(v.attrs[before.name]));
    }
    // If option name changed, rename the attr key across all combinations.
    if ('name' in patch && before.name && before.name !== after.name && after.name) {
      variants = variants.map(v => {
        if (!v.attrs || !(before.name in v.attrs)) return v;
        const { [before.name]: val, ...rest } = v.attrs;
        return { ...v, attrs: { ...rest, [after.name]: val } };
      });
    }
    return { ...e, variant_options: opts, variants };
  });
  const removeOption = (idx) => setEditing(e => {
    const removed = (e.variant_options || [])[idx];
    const opts = (e.variant_options || []).filter((_, i) => i !== idx);
    // Drop every combination that referenced this option.
    const variants = removed?.name
      ? (e.variants || []).filter(v => !v.attrs || !(removed.name in v.attrs))
      : (e.variants || []);
    return { ...e, variant_options: opts, variants };
  });

  const generateVariants = () => {
    const opts = (editing.variant_options || []).filter(o => o.name && o.values?.length);
    if (opts.length === 0) { toast.error('Add at least one option with values'); return; }
    const combos = cartesian(opts.map(o => o.values.map(v => [o.name, v])));
    const skuBase = editing.sku || `WTH-${(editing.name || 'PROD').toUpperCase().slice(0, 8).replace(/\s+/g, '')}`;
    const variants = combos.map((combo, idx) => {
      const attrs = Object.fromEntries(combo);
      const suffix = combo.map(([, v]) => v.slice(0, 3).toUpperCase()).join('-');
      const existing = (editing.variants || []).find(v => Object.keys(attrs).every(k => v.attrs?.[k] === attrs[k]));
      return existing || {
        id: `v_${Date.now()}_${idx}`,
        attrs, price: +editing.price, original_price: +editing.original_price,
        stock: 10, sku: `${skuBase}-${suffix}`, image: editing.image,
      };
    });
    setEditing(e => ({ ...e, variants }));
    toast.success(`Generated ${variants.length} variants`);
  };

  const updateVariant = (idx, patch) => setEditing(e => { const v = [...e.variants]; v[idx] = { ...v[idx], ...patch }; return { ...e, variants: v }; });
  const removeVariant = (idx) => setEditing(e => ({ ...e, variants: (e.variants || []).filter((_, i) => i !== idx) }));

  const setListField = (field, arr) => setEditing(e => ({ ...e, [field]: arr }));

  const TABS = [
    { id: 'basic', label: 'Basic', icon: Info },
    { id: 'media', label: 'Media', icon: ImageIcon },
    { id: 'pricing', label: 'Pricing & SKU', icon: TagIcon },
    { id: 'variants', label: 'Variants', icon: Layers },
    { id: 'personalization', label: 'Personalization', icon: Sparkles },
    { id: 'seo', label: 'SEO', icon: Search },
  ];

  return (
    <div>
      <div className="flex items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="font-serif-display text-4xl">Products</h1>
          <p className="text-sm text-neutral-600 mt-1">{items.length} total{dragEnabled ? ' · drag cards to reorder' : ' · clear search to reorder'}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Name or SKU" className="pl-10 pr-4 py-2.5 bg-white border border-[#EBD9CE] rounded-full text-sm outline-none focus:border-[#B4593F] w-64" />
          </div>
          <button
            onClick={() => { setBulkOpen(true); setBulkResult(null); }}
            data-testid="bulk-upload-btn"
            className="inline-flex items-center gap-2 bg-white border border-[#EBD9CE] hover:border-[#B4593F] text-[#213a60] px-5 py-2.5 rounded-full text-xs uppercase tracking-widest transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" /> Bulk Upload
          </button>
          <button onClick={() => startEdit(null)} className="inline-flex items-center gap-2 bg-[#213a60] hover:bg-[#B4593F] text-white px-5 py-2.5 rounded-full text-xs uppercase tracking-widest transition-colors"><Plus className="w-4 h-4" /> New</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map(p => (
          <div
            key={p.id}
            {...(dragEnabled ? dragProps(p.id) : {})}
            className={`bg-white rounded-xl border overflow-hidden transition-all ${draggingId === p.id ? 'opacity-40' : ''} ${overId === p.id && draggingId !== p.id ? 'border-[#B4593F] ring-2 ring-[#B4593F]/30' : 'border-[#EBD9CE]'}`}
          >
            <div className="aspect-square overflow-hidden bg-neutral-100 relative">
              <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
              {p.ribbon && <span className="absolute top-2 left-2 shimmer-badge text-white text-[9px] uppercase tracking-widest px-2 py-0.5 rounded">{p.ribbon}</span>}
              {p.variants?.length > 0 && <span className="absolute bottom-2 left-2 bg-white/90 text-[10px] uppercase tracking-widest px-2 py-0.5 rounded">{p.variants.length} variants</span>}
              {dragEnabled && (
                <div className="absolute top-2 right-2 bg-white/95 rounded-full p-1.5 shadow-sm cursor-grab active:cursor-grabbing" title="Drag to reorder">
                  <GripVertical className="w-3.5 h-3.5 text-neutral-500" />
                </div>
              )}
            </div>
            <div className="p-4">
              <div className="text-sm font-medium line-clamp-1">{p.name}</div>
              <div className="text-[10px] font-mono text-neutral-500 mt-0.5">{p.sku || '—'}</div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[#B4593F] font-semibold text-sm">₹{p.price}</span>
                <span className={`text-[10px] uppercase px-2 py-0.5 rounded ${p.active ? 'bg-green-50 text-green-700' : 'bg-neutral-100 text-neutral-500'}`}>{p.active ? 'Active' : 'Hidden'}</span>
              </div>
              <div className="text-[11px] text-neutral-500 mt-1">Stock: {p.stock ?? 0}</div>
              <div className="flex items-center gap-2 mt-3">
                <button onClick={() => startEdit(p)} className="flex-1 inline-flex items-center justify-center gap-1 text-xs border border-[#EBD9CE] rounded-full py-2 hover:border-[#B4593F] hover:text-[#B4593F]"><Edit3 className="w-3 h-3" /> Edit</button>
                <button onClick={() => startClone(p)} title="Duplicate this product" data-testid={`clone-product-${p.id}`} className="px-3 py-2 text-xs border border-[#EBD9CE] rounded-full hover:border-[#B4593F] hover:text-[#B4593F] inline-flex items-center gap-1"><Copy className="w-3 h-3" /></button>
                <button onClick={() => onDelete(p)} className="px-3 py-2 text-xs border border-[#EBD9CE] rounded-full hover:border-red-500 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <>
          <div onClick={() => setEditing(null)} className="fixed inset-0 bg-black/50 z-50" />
          <aside className="fixed top-0 right-0 h-full w-full sm:w-[720px] bg-white z-50 overflow-y-auto shadow-2xl flex flex-col">
            <div className="px-6 py-5 border-b border-[#EBD9CE] flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-serif-display text-2xl">{editing.id ? 'Edit Product' : (editing.name && editing.name.startsWith('Copy of ') ? 'Clone Product' : 'New Product')}</h3>
                {editing.sku && <div className="text-[11px] font-mono text-neutral-500 mt-0.5">{editing.sku}</div>}
              </div>
              <button onClick={() => setEditing(null)}><X className="w-5 h-5" /></button>
            </div>

            <div className="border-b border-[#EBD9CE] px-6 shrink-0 overflow-x-auto">
              <div className="flex gap-1">
                {TABS.map(t => {
                  const I = t.icon;
                  return (
                    <button key={t.id} onClick={() => setTab(t.id)} className={`inline-flex items-center gap-1.5 px-4 py-3 text-xs uppercase tracking-widest border-b-2 whitespace-nowrap transition-colors ${tab === t.id ? 'border-[#B4593F] text-[#B4593F]' : 'border-transparent text-neutral-500 hover:text-[#213a60]'}`}>
                      <I className="w-3.5 h-3.5" /> {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {tab === 'basic' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block col-span-2"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Name</span><input value={editing.name || ''} onChange={e => setEditing({ ...editing, name: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]" /></label>
                    <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Slug</span><input value={editing.slug || ''} onChange={e => setEditing({ ...editing, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F] font-mono" /></label>
                    <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Category</span><select value={editing.category || ''} onChange={e => setEditing({ ...editing, category: e.target.value, subcategory: '' })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]"><option value="">Select</option>{cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
                    <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Subcategory <span className="text-neutral-400 normal-case">(optional)</span></span><select disabled={!editing.category || subs.length === 0} value={editing.subcategory || ''} onChange={e => setEditing({ ...editing, subcategory: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F] disabled:opacity-60" data-testid="product-subcategory-select"><option value="">— None —</option>{subs.map(s => <option key={s.id} value={s.id}>{s.name}{!s.active ? ' (hidden)' : ''}</option>)}</select></label>
                  </div>
                  <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Verse / Subtitle</span><input value={editing.verse || ''} onChange={e => setEditing({ ...editing, verse: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]" /></label>
                  <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Description</span><textarea rows="4" value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]" /></label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Ribbon</span><select value={editing.ribbon || ''} onChange={e => setEditing({ ...editing, ribbon: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]"><option value="">None</option><option value="New">New</option><option value="Sale">Sale</option><option value="Best Seller">Best Seller</option><option value="Trending">Trending</option><option value="Signature">Signature</option><option value="Personalise">Personalise</option></select></label>
                    <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Product Type</span><select value={editing.product_type || 'physical'} onChange={e => setEditing({ ...editing, product_type: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]"><option value="physical">Physical</option><option value="digital">Digital</option></select></label>
                  </div>
                  {editing.product_type === 'digital' && (
                    <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Digital File URL (delivered on purchase)</span><input value={editing.digital_file_url || ''} onChange={e => setEditing({ ...editing, digital_file_url: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F] font-mono" /></label>
                  )}
                  <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!editing.active} onChange={e => setEditing({ ...editing, active: e.target.checked })} /> <span className="text-sm">Active (visible on storefront)</span></label>
                </>
              )}

              {tab === 'media' && (
                <>
                  <div>
                    <div className="text-[11px] uppercase tracking-widest text-neutral-600 mb-2">Primary Image <span className="text-rose-600">*</span></div>
                    <ImageFieldEditor
                      value={editing.image || ''}
                      onChange={(v) => setEditing({ ...editing, image: v })}
                      testKey="product-primary-image"
                    />
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-widest text-neutral-600 mb-2">Hover Image <span className="text-neutral-400">(optional — shown on card hover)</span></div>
                    <ImageFieldEditor
                      value={editing.hover_image || ''}
                      onChange={(v) => setEditing({ ...editing, hover_image: v })}
                      testKey="product-hover-image"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] uppercase tracking-widest text-neutral-600">Gallery Images</span>
                      <button onClick={() => setListField('gallery', [...(editing.gallery || []), ''])} className="text-xs text-[#B4593F] inline-flex items-center gap-1"><Plus className="w-3 h-3" /> Add</button>
                    </div>
                    <div className="space-y-4">
                      {(editing.gallery || []).map((g, i) => (
                        <div key={i} className="flex gap-3 items-start bg-white/50 border border-[#EBD9CE] rounded-xl p-3">
                          <div className="flex-1 min-w-0">
                            <ImageFieldEditor
                              value={g}
                              onChange={(v) => { const arr = [...(editing.gallery || [])]; arr[i] = v; setListField('gallery', arr); }}
                              testKey={`product-gallery-${i}`}
                            />
                          </div>
                          <button onClick={() => setListField('gallery', editing.gallery.filter((_, k) => k !== i))} title="Remove" className="w-9 h-9 flex items-center justify-center rounded-full text-neutral-500 hover:text-red-500 hover:bg-rose-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] uppercase tracking-widest text-neutral-600">Videos (YouTube URLs)</span>
                      <button onClick={() => setListField('videos', [...(editing.videos || []), ''])} className="text-xs text-[#B4593F] inline-flex items-center gap-1"><Plus className="w-3 h-3" /> Add</button>
                    </div>
                    <div className="space-y-2">
                      {(editing.videos || []).map((v, i) => (
                        <div key={i} className="flex gap-2">
                          <input value={v} onChange={e => { const arr = [...editing.videos]; arr[i] = e.target.value; setListField('videos', arr); }} placeholder="https://youtube.com/watch?v=..." className="flex-1 bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2 text-sm outline-none focus:border-[#B4593F]" />
                          <button onClick={() => setListField('videos', editing.videos.filter((_, k) => k !== i))} className="px-3 border border-[#EBD9CE] rounded-full text-neutral-500 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {tab === 'pricing' && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Price ₹</span><input type="number" value={editing.price} onChange={e => setEditing({ ...editing, price: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]" /></label>
                    <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">MRP ₹</span><input type="number" value={editing.original_price} onChange={e => setEditing({ ...editing, original_price: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]" /></label>
                    <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Stock</span><input type="number" value={editing.stock} onChange={e => setEditing({ ...editing, stock: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]" /></label>
                  </div>
                  <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">SKU</span><input value={editing.sku || ''} onChange={e => setEditing({ ...editing, sku: e.target.value.toUpperCase() })} placeholder="WTH-XXXXX" className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F] font-mono" /></label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Weight (grams)</span><input type="number" value={editing.weight_grams || 500} onChange={e => setEditing({ ...editing, weight_grams: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]" /></label>
                    <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Colors (comma sep)</span><input value={editing.colors || ''} onChange={e => setEditing({ ...editing, colors: e.target.value })} placeholder="#000, #fff" className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]" /></label>
                  </div>
                </>
              )}

              {tab === 'variants' && (
                <>
                  <div className="bg-[#FDF3EB] rounded-xl p-4 text-xs text-neutral-600">
                    Define variant options (e.g. Size, Color). Then click <b>Generate Combinations</b> to auto-create all variants with individual price/stock/SKU.
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] uppercase tracking-widest text-neutral-600">Option Types</span>
                      <button onClick={addOption} className="text-xs text-[#B4593F] inline-flex items-center gap-1"><Plus className="w-3 h-3" /> Add Option</button>
                    </div>
                    <div className="space-y-3">
                      {(editing.variant_options || []).map((opt, i) => (
                        <div key={i} className="border border-[#EBD9CE] rounded-xl p-3 space-y-2">
                          <div className="flex gap-2">
                            <input value={opt.name} onChange={e => updateOption(i, { name: e.target.value })} placeholder="Option name (Size, Color…)" className="flex-1 bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2 text-sm outline-none focus:border-[#B4593F]" />
                            <button onClick={() => removeOption(i)} className="px-3 border border-[#EBD9CE] rounded-full text-neutral-500 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                          <input value={(opt.values || []).join(', ')} onChange={e => updateOption(i, { values: e.target.value.split(',').map(v => v.trim()).filter(Boolean) })} placeholder="Values (comma separated) e.g. S, M, L" className="w-full bg-white border border-[#EBD9CE] rounded-full px-4 py-2 text-sm outline-none focus:border-[#B4593F]" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <button onClick={generateVariants} className="w-full border border-dashed border-[#B4593F] text-[#B4593F] rounded-full py-3 text-xs uppercase tracking-widest hover:bg-[#B4593F] hover:text-white transition-colors">Generate Combinations</button>

                  {(editing.variants || []).length > 0 && (
                    <div>
                      <div className="text-[11px] uppercase tracking-widest text-neutral-600 mb-2">Variants ({editing.variants.length})</div>
                      <div className="border border-[#EBD9CE] rounded-xl overflow-hidden">
                        <table className="w-full text-xs">
                          <thead className="bg-[#FDF3EB] text-neutral-600">
                            <tr><th className="text-left px-3 py-2">Options</th><th className="text-left px-3 py-2">Price</th><th className="text-left px-3 py-2">Stock</th><th className="text-left px-3 py-2">SKU</th><th className="w-10"></th></tr>
                          </thead>
                          <tbody className="divide-y divide-[#EBD9CE]">
                            {editing.variants.map((v, i) => (
                              <tr key={v.id || i} data-testid={`variant-row-${i}`}>
                                <td className="px-3 py-2">{Object.entries(v.attrs || {}).map(([k, val]) => `${k}: ${val}`).join(', ')}</td>
                                <td className="px-3 py-2"><input type="number" value={v.price} onChange={e => updateVariant(i, { price: +e.target.value })} className="w-20 bg-transparent border border-[#EBD9CE] rounded px-2 py-1" /></td>
                                <td className="px-3 py-2"><input type="number" value={v.stock} onChange={e => updateVariant(i, { stock: +e.target.value })} className="w-20 bg-transparent border border-[#EBD9CE] rounded px-2 py-1" /></td>
                                <td className="px-3 py-2"><input value={v.sku || ''} onChange={e => updateVariant(i, { sku: e.target.value })} className="w-40 bg-transparent border border-[#EBD9CE] rounded px-2 py-1 font-mono" /></td>
                                <td className="px-2 py-2">
                                  <button
                                    type="button"
                                    onClick={() => removeVariant(i)}
                                    data-testid={`delete-variant-${i}`}
                                    title="Delete this combination"
                                    className="p-1.5 rounded-full text-neutral-400 hover:bg-rose-50 hover:text-rose-600"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}

              {tab === 'personalization' && (
                <>
                  <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!editing.personalization_enabled} onChange={e => setEditing({ ...editing, personalization_enabled: e.target.checked })} /> <span className="text-sm">Enable personalization on this product</span></label>
                  {editing.personalization_enabled && (
                    <>
                      <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Field label</span><input value={editing.personalization_label || ''} onChange={e => setEditing({ ...editing, personalization_label: e.target.value })} placeholder="e.g. Engrave a name or verse" className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]" /></label>
                      <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Max length</span><input type="number" value={editing.personalization_max_length || 40} onChange={e => setEditing({ ...editing, personalization_max_length: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]" /></label>
                      <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Extra cost (₹) — added per unit when the customer personalizes</span><input type="number" min="0" value={editing.personalization_cost ?? 0} onChange={e => setEditing({ ...editing, personalization_cost: e.target.value })} placeholder="0 = no surcharge" className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]" data-testid="product-personalization-cost" /></label>
                    </>
                  )}
                </>
              )}

              {tab === 'seo' && (
                <>
                  <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">SEO Title</span><input value={editing.seo_title || ''} onChange={e => setEditing({ ...editing, seo_title: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]" /></label>
                  <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">SEO Description</span><textarea rows="3" value={editing.seo_description || ''} onChange={e => setEditing({ ...editing, seo_description: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]" /></label>
                  <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">SEO Keywords (comma separated)</span><input value={editing.seo_keywords || ''} onChange={e => setEditing({ ...editing, seo_keywords: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]" /></label>
                </>
              )}
            </div>

            <div className="px-6 py-5 border-t border-[#EBD9CE] flex items-center gap-3 shrink-0 bg-white">
              <button onClick={onSave} className="flex-1 bg-[#213a60] hover:bg-[#B4593F] text-white py-3 rounded-full text-xs uppercase tracking-widest transition-colors">Save Product</button>
              <button onClick={() => setEditing(null)} className="px-6 py-3 border border-[#EBD9CE] rounded-full text-xs uppercase tracking-widest">Cancel</button>
            </div>
          </aside>
        </>
      )}

      {bulkOpen && (
        <>
          <div onClick={() => setBulkOpen(false)} className="fixed inset-0 bg-black/60 z-50" />
          <div className="fixed inset-x-4 top-16 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[640px] z-50 bg-white rounded-2xl shadow-2xl overflow-hidden" data-testid="bulk-upload-modal">
            <div className="px-6 py-5 border-b border-[#EBD9CE] flex items-center justify-between">
              <div>
                <h3 className="font-serif-display text-2xl">Bulk Product Upload</h3>
                <p className="text-xs text-neutral-500 mt-0.5">Upload a CSV (from Google Sheets) or Excel (.xlsx) to bulk create / update products.</p>
              </div>
              <button onClick={() => setBulkOpen(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-6 space-y-5">
              <div className="bg-[#FDF3EB] border border-[#EBD9CE] rounded-xl p-4 flex items-start gap-3">
                <Info className="w-4 h-4 text-[#B4593F] mt-0.5 shrink-0" />
                <div className="text-xs text-neutral-700 leading-relaxed">
                  <strong>Step 1:</strong> Download the template below. It includes column headers with sample rows.<br />
                  <strong>Step 2:</strong> Fill your product data. Remove the sample rows and any lines starting with <code>#</code>.<br />
                  <strong>Step 3:</strong> Export as CSV or .xlsx, then upload here.<br />
                  <strong>Images:</strong> Use <code>image_1</code>–<code>image_4</code> columns. Each accepts a public URL or a <strong>Google Drive share link</strong>. Drive links are auto-fetched, resized to 1600px, converted to WebP, and served from our CDN. Set Drive sharing to <em>"Anyone with the link — Viewer"</em>. At least one image is required.<br />
                  Rows matching an existing <strong>SKU</strong> or <strong>slug</strong> will be updated; others will be created.
                </div>
              </div>

              <a
                href={productTemplateUrl()}
                download
                data-testid="download-template-btn"
                className="inline-flex items-center gap-2 bg-white border border-[#EBD9CE] hover:border-[#B4593F] text-[#213a60] px-5 py-3 rounded-full text-xs uppercase tracking-widest transition-colors"
              >
                <Download className="w-4 h-4" /> Download CSV Template
              </a>

              <div className="border-2 border-dashed border-[#EBD9CE] rounded-2xl p-8 text-center bg-[#FDF3EB]/40">
                <FileSpreadsheet className="w-8 h-8 mx-auto text-[#B4593F] mb-3" />
                <label className="inline-flex items-center gap-2 cursor-pointer bg-[#213a60] hover:bg-[#B4593F] text-white px-5 py-2.5 rounded-full text-xs uppercase tracking-widest transition-colors">
                  <Upload className="w-4 h-4" /> {uploading ? 'Uploading…' : 'Choose CSV / Excel file'}
                  <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" data-testid="bulk-upload-input" disabled={uploading} onChange={e => doBulk(e.target.files?.[0])} className="hidden" />
                </label>
                <div className="text-[11px] text-neutral-500 mt-3">Accepts .csv, .xlsx, .xls · max ~2 MB recommended</div>
              </div>

              <div className="relative flex items-center gap-3 py-1">
                <span className="flex-1 border-t border-[#EBD9CE]" />
                <span className="text-[10px] uppercase tracking-widest text-neutral-500">Or import directly from Google Sheets</span>
                <span className="flex-1 border-t border-[#EBD9CE]" />
              </div>

              <div className="bg-white border border-[#EBD9CE] rounded-2xl p-5 space-y-3">
                <div className="text-xs text-neutral-600 leading-relaxed">
                  In Google Sheets: <strong>Share → Anyone with the link → Viewer</strong>. Paste the sheet URL below and we'll pull the rows live.
                </div>
                <div className="flex gap-2">
                  <input
                    value={sheetUrl}
                    onChange={e => setSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    data-testid="sheet-url-input"
                    className="flex-1 bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]"
                  />
                  <button
                    onClick={doSheetImport}
                    disabled={uploading || !sheetUrl.trim()}
                    data-testid="sheet-import-btn"
                    className="inline-flex items-center gap-2 bg-[#213a60] hover:bg-[#B4593F] disabled:bg-neutral-300 text-white px-5 py-2.5 rounded-full text-xs uppercase tracking-widest transition-colors whitespace-nowrap"
                  >
                    {uploading ? 'Importing…' : 'Import Sheet'}
                  </button>
                </div>
              </div>

              {bulkResult && (
                <div className="rounded-xl border border-[#EBD9CE] overflow-hidden" data-testid="bulk-upload-result">
                  <div className="px-4 py-3 bg-emerald-50 text-emerald-800 text-sm flex items-center justify-between">
                    <div><strong>{bulkResult.created}</strong> created · <strong>{bulkResult.updated}</strong> updated · <strong>{bulkResult.errors?.length || 0}</strong> errors · Total rows: {bulkResult.total_rows}</div>
                  </div>
                  {bulkResult.errors?.length > 0 && (
                    <div className="max-h-52 overflow-y-auto divide-y divide-[#EBD9CE] text-xs">
                      {bulkResult.errors.map((e, i) => (
                        <div key={i} className="px-4 py-2 flex gap-3 text-rose-700 bg-rose-50/40">
                          <span className="font-mono text-[10px] w-12 shrink-0">row {e.row}</span>
                          <span>{e.error}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminProducts;
