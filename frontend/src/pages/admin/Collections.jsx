import React, { useEffect, useState } from 'react';
import { adminListCollections, adminCreateCollection, adminUpdateCollection, adminDeleteCollection, adminListProducts } from '../../lib/api';
import { toast } from 'sonner';
import { Plus, Edit3, Trash2, X, Star } from 'lucide-react';

const empty = { name: '', slug: '', tagline: '', description: '', image: '', product_ids: [], featured: false, active: true, order: 0, seo_title: '', seo_description: '' };

const AdminCollections = () => {
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [editing, setEditing] = useState(null);

  const load = () => adminListCollections().then(setItems).catch(() => setItems([]));
  useEffect(() => { load(); adminListProducts().then(setProducts); }, []);

  const onSave = async () => {
    try {
      if (editing.id) await adminUpdateCollection(editing.id, editing); else await adminCreateCollection(editing);
      toast.success('Collection saved'); setEditing(null); load();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Save failed'); }
  };
  const onDelete = async (c) => {
    if (!window.confirm(`Delete ${c.name}?`)) return;
    await adminDeleteCollection(c.id); toast.success('Deleted'); load();
  };

  const togglePid = (pid) => {
    setEditing(e => ({ ...e, product_ids: e.product_ids.includes(pid) ? e.product_ids.filter(x => x !== pid) : [...e.product_ids, pid] }));
  };

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-serif-display text-4xl">Collections</h1>
          <p className="text-sm text-neutral-600 mt-1">Curated groupings for landing sections and marketing.</p>
        </div>
        <button onClick={() => setEditing({ ...empty })} className="inline-flex items-center gap-2 bg-[#213a60] hover:bg-[#B4593F] text-white px-5 py-2.5 rounded-full text-xs uppercase tracking-widest"><Plus className="w-4 h-4" /> New Collection</button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(c => (
          <div key={c.id} className="bg-white rounded-xl border border-[#EBD9CE] overflow-hidden group">
            <div className="aspect-[16/9] bg-neutral-100 overflow-hidden">{c.image ? <img src={c.image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-neutral-400 text-sm">No image</div>}</div>
            <div className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-serif-display text-xl">{c.name}</span>
                    {c.featured && <Star className="w-3.5 h-3.5 fill-[#E8B364] stroke-[#E8B364]" />}
                  </div>
                  <div className="text-xs text-neutral-500 mt-0.5">/{c.slug} · {c.product_ids?.length || 0} products</div>
                </div>
                <span className={`text-[10px] uppercase px-2 py-0.5 rounded ${c.active ? 'bg-green-50 text-green-700' : 'bg-neutral-100 text-neutral-500'}`}>{c.active ? 'Active' : 'Hidden'}</span>
              </div>
              <p className="text-xs text-neutral-600 mt-2 line-clamp-2">{c.tagline}</p>
              <div className="flex items-center gap-2 mt-4">
                <button onClick={() => setEditing({ ...c, product_ids: c.product_ids || [] })} className="flex-1 inline-flex items-center justify-center gap-1 text-xs border border-[#EBD9CE] rounded-full py-2 hover:border-[#B4593F] hover:text-[#B4593F]"><Edit3 className="w-3 h-3" /> Edit</button>
                <button onClick={() => onDelete(c)} className="px-3 py-2 text-xs border border-[#EBD9CE] rounded-full hover:border-red-500 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <>
          <div onClick={() => setEditing(null)} className="fixed inset-0 bg-black/50 z-50" />
          <aside className="fixed top-0 right-0 h-full w-full sm:w-[600px] bg-white z-50 overflow-y-auto shadow-2xl">
            <div className="px-6 py-5 border-b border-[#EBD9CE] flex items-center justify-between">
              <h3 className="font-serif-display text-2xl">{editing.id ? 'Edit Collection' : 'New Collection'}</h3>
              <button onClick={() => setEditing(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Name</span><input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]" /></label>
                <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Slug</span><input value={editing.slug} onChange={e => setEditing({ ...editing, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F] font-mono" /></label>
              </div>
              <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Tagline</span><input value={editing.tagline || ''} onChange={e => setEditing({ ...editing, tagline: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]" /></label>
              <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Description</span><textarea rows="3" value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]" /></label>
              <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Image URL</span><input value={editing.image || ''} onChange={e => setEditing({ ...editing, image: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]" /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Order</span><input type="number" value={editing.order || 0} onChange={e => setEditing({ ...editing, order: +e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]" /></label>
                <div className="pt-6 space-y-2">
                  <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={!!editing.featured} onChange={e => setEditing({ ...editing, featured: e.target.checked })} /> Featured on homepage</label>
                  <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={!!editing.active} onChange={e => setEditing({ ...editing, active: e.target.checked })} /> Active</label>
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-widest text-neutral-600 mb-2">Products in this collection ({editing.product_ids?.length || 0})</div>
                <div className="max-h-72 overflow-y-auto border border-[#EBD9CE] rounded-xl divide-y divide-[#EBD9CE]">
                  {products.map(p => (
                    <label key={p.id} className="flex items-center gap-3 p-3 hover:bg-[#FDF3EB] cursor-pointer">
                      <input type="checkbox" checked={editing.product_ids?.includes(p.id)} onChange={() => togglePid(p.id)} />
                      <img src={p.image} alt="" className="w-9 h-9 rounded object-cover" />
                      <span className="text-sm flex-1">{p.name}</span>
                      <span className="text-xs text-neutral-500">₹{p.price}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 py-5 border-t border-[#EBD9CE] flex gap-3">
              <button onClick={onSave} className="flex-1 bg-[#213a60] hover:bg-[#B4593F] text-white py-3 rounded-full text-xs uppercase tracking-widest">Save</button>
              <button onClick={() => setEditing(null)} className="px-6 py-3 border border-[#EBD9CE] rounded-full text-xs uppercase tracking-widest">Cancel</button>
            </div>
          </aside>
        </>
      )}
    </div>
  );
};

export default AdminCollections;
