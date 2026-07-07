import React, { useEffect, useState } from 'react';
import { adminListInstagram, adminCreateInstagram, adminUpdateInstagram, adminDeleteInstagram, adminListProducts } from '../../lib/api';
import { toast } from 'sonner';
import { Instagram, Plus, Trash2, Edit3, X, Heart, MessageCircle } from 'lucide-react';

const empty = { caption: '', image: '', permalink: '', likes: 0, comments: 0, product_ids: [], active: true, order: 0 };

const AdminInstagram = () => {
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);

  const load = () => adminListInstagram().then(setItems).catch(() => setItems([]));
  useEffect(() => {
    load();
    adminListProducts().then(setProducts).catch(() => setProducts([]));
  }, []);

  const start = (p) => { setEditing(p ? p.id : 'new'); setForm(p ? { ...empty, ...p } : empty); };
  const close = () => { setEditing(null); setForm(empty); };

  const save = async (e) => {
    e.preventDefault();
    const payload = { ...form, likes: parseInt(form.likes || 0, 10), comments: parseInt(form.comments || 0, 10), order: parseInt(form.order || 0, 10) };
    try {
      if (editing === 'new') await adminCreateInstagram(payload);
      else await adminUpdateInstagram(editing, payload);
      toast.success('Saved'); close(); load();
    } catch (er) { toast.error(er?.response?.data?.detail || 'Failed'); }
  };

  const del = async (id) => {
    if (!window.confirm('Delete this Instagram post?')) return;
    try { await adminDeleteInstagram(id); toast.success('Deleted'); load(); } catch { toast.error('Failed'); }
  };

  const toggleProd = (pid) => {
    const s = new Set(form.product_ids || []);
    if (s.has(pid)) s.delete(pid); else s.add(pid);
    setForm({ ...form, product_ids: Array.from(s) });
  };

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-serif-display text-4xl">Instagram Feed</h1>
          <p className="text-sm text-neutral-600 mt-1">{items.length} curated post(s) · shown on the homepage. Tag products to make posts shoppable.</p>
        </div>
        <button onClick={() => start(null)} data-testid="add-ig-btn" className="inline-flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#B4593F] text-white text-xs uppercase tracking-widest px-5 py-2.5 rounded-full transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add Post
        </button>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-4 mb-6 text-xs">
        <strong>Curated feed — MOCKED.</strong> To auto-sync from your Instagram, connect the Meta Graph API in .env and swap this list with the live pull. For now, manage what appears on the storefront here.
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map(p => (
          <div key={p.id} data-testid={`admin-ig-${p.id}`} className="bg-white rounded-xl border border-[#EBD9CE] overflow-hidden">
            <div className="aspect-square bg-neutral-100 relative">
              <img src={p.image} alt="" className="w-full h-full object-cover" />
              {!p.active && <span className="absolute top-2 left-2 text-[10px] uppercase bg-neutral-800/80 text-white px-2 py-0.5 rounded">Hidden</span>}
              {p.product_ids?.length > 0 && <span className="absolute top-2 right-2 text-[10px] uppercase bg-[#B4593F] text-white px-2 py-0.5 rounded">{p.product_ids.length} shop</span>}
            </div>
            <div className="p-3 text-xs">
              <div className="line-clamp-2 text-neutral-700 min-h-[32px]">{p.caption}</div>
              <div className="mt-2 flex items-center justify-between text-neutral-500">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1"><Heart className="w-3 h-3" /> {p.likes}</span>
                  <span className="inline-flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {p.comments}</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => start(p)} className="p-1.5 hover:bg-[#FDF3EB] rounded" title="Edit"><Edit3 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => del(p.id)} className="p-1.5 hover:bg-rose-50 rounded" title="Delete"><Trash2 className="w-3.5 h-3.5 text-rose-600" /></button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <>
          <div onClick={close} className="fixed inset-0 bg-black/50 z-50" />
          <aside className="fixed top-0 right-0 h-full w-full sm:w-[560px] bg-white z-50 overflow-y-auto shadow-2xl">
            <div className="px-6 py-5 border-b border-[#EBD9CE] flex items-center justify-between">
              <h3 className="font-serif-display text-2xl flex items-center gap-2"><Instagram className="w-5 h-5" /> {editing === 'new' ? 'New Post' : 'Edit Post'}</h3>
              <button onClick={close}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={save} className="px-6 py-5 space-y-4 text-sm">
              <Field label="Image URL"><input required value={form.image} onChange={e => setForm({ ...form, image: e.target.value })} className="input" placeholder="https://..." /></Field>
              {form.image && <img src={form.image} alt="" className="w-full aspect-square object-cover rounded-lg" />}
              <Field label="Caption"><textarea rows="3" value={form.caption} onChange={e => setForm({ ...form, caption: e.target.value })} className="input !rounded-lg" /></Field>
              <Field label="Instagram permalink (optional)"><input value={form.permalink || ''} onChange={e => setForm({ ...form, permalink: e.target.value })} className="input" placeholder="https://www.instagram.com/p/..." /></Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Likes"><input type="number" value={form.likes} onChange={e => setForm({ ...form, likes: e.target.value })} className="input" /></Field>
                <Field label="Comments"><input type="number" value={form.comments} onChange={e => setForm({ ...form, comments: e.target.value })} className="input" /></Field>
                <Field label="Order"><input type="number" value={form.order} onChange={e => setForm({ ...form, order: e.target.value })} className="input" /></Field>
              </div>
              <Field label={`Tagged Products (${form.product_ids?.length || 0}) — shoppable tags`}>
                <div className="max-h-56 overflow-y-auto border border-[#EBD9CE] rounded-lg divide-y divide-[#EBD9CE]">
                  {products.map(pp => (
                    <label key={pp.id} className="flex items-center gap-3 px-3 py-2 hover:bg-[#FDF3EB] cursor-pointer">
                      <input type="checkbox" checked={form.product_ids?.includes(pp.id)} onChange={() => toggleProd(pp.id)} />
                      <img src={pp.image} alt="" className="w-8 h-8 rounded object-cover" />
                      <span className="text-xs flex-1">{pp.name}</span>
                      <span className="text-xs text-[#B4593F]">₹{pp.price}</span>
                    </label>
                  ))}
                </div>
              </Field>
              <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} /> Active</label>
              <div className="pt-2 flex gap-3">
                <button type="submit" className="bg-[#1A1A1A] hover:bg-[#B4593F] text-white text-xs uppercase tracking-widest px-6 py-2.5 rounded-full">Save</button>
                <button type="button" onClick={close} className="text-xs uppercase tracking-widest px-6 py-2.5 rounded-full border border-[#EBD9CE]">Cancel</button>
              </div>
            </form>
          </aside>
        </>
      )}
      <style>{`.input { width:100%; background:#FDF3EB; border:1px solid #EBD9CE; border-radius:9999px; padding:8px 16px; outline:none; }
        .input:focus { border-color:#B4593F; }
        textarea.input, .input.!rounded-lg { border-radius: 12px; }`}</style>
    </div>
  );
};

const Field = ({ label, children }) => (
  <label className="block">
    <span className="text-[11px] uppercase tracking-widest text-neutral-500 block mb-1">{label}</span>
    {children}
  </label>
);

export default AdminInstagram;
