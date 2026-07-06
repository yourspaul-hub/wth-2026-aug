import React, { useEffect, useMemo, useState } from 'react';
import { adminListProducts, adminCreateProduct, adminUpdateProduct, adminDeleteProduct, adminListCategories } from '../../lib/api';
import { toast } from 'sonner';
import { Plus, Edit3, Trash2, X, Search } from 'lucide-react';

const empty = { name: '', slug: '', category: '', price: 0, original_price: 0, image: '', hover_image: '', verse: '', tag: '', description: '', colors: '', stock: 100, active: true, seo_title: '', seo_description: '', seo_keywords: '' };

const AdminProducts = () => {
  const [items, setItems] = useState([]);
  const [cats, setCats] = useState([]);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null);

  const load = () => adminListProducts().then(setItems).catch(() => setItems([]));
  useEffect(() => { load(); adminListCategories().then(setCats); }, []);

  const filtered = useMemo(() => items.filter(p => !q || p.name.toLowerCase().includes(q.toLowerCase())), [items, q]);

  const onSave = async () => {
    const payload = { ...editing, price: +editing.price, original_price: +editing.original_price, stock: +editing.stock, colors: (editing.colors || '').split(',').map(s => s.trim()).filter(Boolean) };
    try {
      if (editing.id) await adminUpdateProduct(editing.id, payload); else await adminCreateProduct(payload);
      toast.success(editing.id ? 'Product updated' : 'Product created');
      setEditing(null); load();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Save failed'); }
  };
  const onDelete = async (p) => {
    if (!window.confirm(`Delete ${p.name}?`)) return;
    await adminDeleteProduct(p.id);
    toast.success('Deleted'); load();
  };

  const startEdit = (p) => {
    setEditing(p ? { ...p, colors: (p.colors || []).join(', ') } : { ...empty });
  };

  return (
    <div>
      <div className="flex items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="font-serif-display text-4xl">Products</h1>
          <p className="text-sm text-neutral-600 mt-1">{items.length} total</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search products" className="pl-10 pr-4 py-2.5 bg-white border border-[#EBD9CE] rounded-full text-sm outline-none focus:border-[#B4593F] w-64" />
          </div>
          <button onClick={() => startEdit(null)} className="inline-flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#B4593F] text-white px-5 py-2.5 rounded-full text-xs uppercase tracking-widest transition-colors"><Plus className="w-4 h-4" /> New</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map(p => (
          <div key={p.id} className="bg-white rounded-xl border border-[#EBD9CE] overflow-hidden group">
            <div className="aspect-square overflow-hidden bg-neutral-100"><img src={p.image} alt={p.name} className="w-full h-full object-cover" /></div>
            <div className="p-4">
              <div className="text-sm font-medium line-clamp-1">{p.name}</div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[#B4593F] font-semibold text-sm">₹{p.price}</span>
                <span className={`text-[10px] uppercase px-2 py-0.5 rounded ${p.active ? 'bg-green-50 text-green-700' : 'bg-neutral-100 text-neutral-500'}`}>{p.active ? 'Active' : 'Hidden'}</span>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <button onClick={() => startEdit(p)} className="flex-1 inline-flex items-center justify-center gap-1 text-xs border border-[#EBD9CE] rounded-full py-2 hover:border-[#B4593F] hover:text-[#B4593F]"><Edit3 className="w-3 h-3" /> Edit</button>
                <button onClick={() => onDelete(p)} className="px-3 py-2 text-xs border border-[#EBD9CE] rounded-full hover:border-red-500 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
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
              <h3 className="font-serif-display text-2xl">{editing.id ? 'Edit Product' : 'New Product'}</h3>
              <button onClick={() => setEditing(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {[['name','Name'],['slug','Slug'],['verse','Verse/Subtitle'],['image','Image URL'],['hover_image','Hover Image URL'],['description','Description','textarea'],['colors','Colors (comma separated)'],['tag','Tag (e.g. Bestseller)'],['seo_title','SEO Title'],['seo_description','SEO Description','textarea'],['seo_keywords','SEO Keywords']].map(([k,label,type]) => (
                <label key={k} className="block">
                  <span className="text-[11px] uppercase tracking-widest text-neutral-600">{label}</span>
                  {type === 'textarea' ? (
                    <textarea rows="3" value={editing[k] || ''} onChange={e => setEditing({ ...editing, [k]: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]" />
                  ) : (
                    <input value={editing[k] || ''} onChange={e => setEditing({ ...editing, [k]: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]" />
                  )}
                </label>
              ))}
              <div className="grid grid-cols-3 gap-3">
                <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Price</span><input type="number" value={editing.price} onChange={e => setEditing({ ...editing, price: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]" /></label>
                <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">MRP</span><input type="number" value={editing.original_price} onChange={e => setEditing({ ...editing, original_price: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]" /></label>
                <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Stock</span><input type="number" value={editing.stock} onChange={e => setEditing({ ...editing, stock: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]" /></label>
              </div>
              <label className="block">
                <span className="text-[11px] uppercase tracking-widest text-neutral-600">Category</span>
                <select value={editing.category} onChange={e => setEditing({ ...editing, category: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]">
                  <option value="">Select category</option>
                  {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!editing.active} onChange={e => setEditing({ ...editing, active: e.target.checked })} /> <span className="text-sm">Active (visible on storefront)</span></label>
            </div>
            <div className="px-6 py-5 border-t border-[#EBD9CE] flex items-center gap-3">
              <button onClick={onSave} className="flex-1 bg-[#1A1A1A] hover:bg-[#B4593F] text-white py-3 rounded-full text-xs uppercase tracking-widest transition-colors">Save</button>
              <button onClick={() => setEditing(null)} className="px-6 py-3 border border-[#EBD9CE] rounded-full text-xs uppercase tracking-widest">Cancel</button>
            </div>
          </aside>
        </>
      )}
    </div>
  );
};

export default AdminProducts;
