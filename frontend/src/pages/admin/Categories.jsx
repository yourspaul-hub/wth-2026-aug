import React, { useEffect, useState } from 'react';
import { listAllCategories, adminCreateCategory, adminUpdateCategory, adminDeleteCategory } from '../../lib/api';
import { toast } from 'sonner';
import { Plus, Trash2, Edit3, X, FolderOpen } from 'lucide-react';

const empty = { name: '', slug: '', description: '', image: '', order: 0 };

const AdminCategories = () => {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);

  const load = () => listAllCategories().then(setItems).catch(() => setItems([]));
  useEffect(() => { load(); }, []);

  const start = (c) => setEditing(c ? { ...empty, ...c } : { ...empty });
  const close = () => setEditing(null);

  const save = async (e) => {
    e.preventDefault();
    const p = { ...editing, order: parseInt(editing.order || 0, 10) };
    try {
      if (editing.id) await adminUpdateCategory(editing.id, p);
      else await adminCreateCategory(p);
      toast.success('Saved'); close(); load();
    } catch (er) { toast.error(er?.response?.data?.detail || 'Failed'); }
  };
  const del = async (c) => {
    if (!window.confirm(`Delete "${c.name}"?`)) return;
    try { await adminDeleteCategory(c.id); toast.success('Deleted'); load(); }
    catch (er) { toast.error(er?.response?.data?.detail || 'Failed'); }
  };

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-serif-display text-4xl">Categories</h1>
          <p className="text-sm text-neutral-600 mt-1">{items.length} categor{items.length === 1 ? 'y' : 'ies'} · shown in Shop nav & filters</p>
        </div>
        <button onClick={() => start(null)} data-testid="add-category-btn" className="inline-flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#B4593F] text-white text-xs uppercase tracking-widest px-5 py-2.5 rounded-full">
          <Plus className="w-3.5 h-3.5" /> Add Category
        </button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.length === 0 ? (
          <div className="md:col-span-3 py-16 text-center text-neutral-500">
            <FolderOpen className="w-8 h-8 mx-auto mb-3 text-[#B4593F]/50" />
            No categories yet.
          </div>
        ) : items.map(c => (
          <div key={c.id} data-testid={`category-${c.id}`} className="bg-white rounded-xl border border-[#EBD9CE] overflow-hidden">
            <div className="aspect-[16/9] bg-neutral-100">
              {c.image && <img src={c.image} alt={c.name} className="w-full h-full object-cover" />}
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-widest text-[#B4593F]">Order {c.order || 0}</div>
                  <div className="font-serif-display text-2xl mt-0.5">{c.name}</div>
                  <div className="text-[11px] text-neutral-500 mt-1 font-mono">/{c.slug}</div>
                  {c.description && <p className="text-xs text-neutral-600 mt-2 line-clamp-2">{c.description}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => start(c)} className="p-2 rounded-full hover:bg-[#FDF3EB]"><Edit3 className="w-4 h-4" /></button>
                  <button onClick={() => del(c)} className="p-2 rounded-full hover:bg-rose-50"><Trash2 className="w-4 h-4 text-rose-600" /></button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <>
          <div onClick={close} className="fixed inset-0 bg-black/50 z-50" />
          <aside className="fixed top-0 right-0 h-full w-full sm:w-[500px] bg-white z-50 overflow-y-auto shadow-2xl">
            <div className="px-6 py-5 border-b border-[#EBD9CE] flex items-center justify-between">
              <h3 className="font-serif-display text-2xl">{editing.id ? 'Edit Category' : 'New Category'}</h3>
              <button onClick={close}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={save} className="px-6 py-5 space-y-4 text-sm">
              <F label="Name *"><input required value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value, slug: editing.id ? editing.slug : e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-') })} className="input" /></F>
              <F label="Slug * (URL segment)"><input required value={editing.slug} onChange={e => setEditing({ ...editing, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-') })} className="input font-mono" placeholder="drinkware" /></F>
              <F label="Image URL"><input value={editing.image || ''} onChange={e => setEditing({ ...editing, image: e.target.value })} className="input" /></F>
              {editing.image && <img src={editing.image} alt="" className="w-full aspect-[16/9] object-cover rounded-lg" />}
              <F label="Description"><textarea rows="3" value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} className="input !rounded-lg" /></F>
              <F label="Order"><input type="number" value={editing.order || 0} onChange={e => setEditing({ ...editing, order: e.target.value })} className="input w-32" /></F>
              <div className="pt-2 flex gap-3">
                <button type="submit" data-testid="save-category-btn" className="flex-1 bg-[#1A1A1A] hover:bg-[#B4593F] text-white text-xs uppercase tracking-widest px-6 py-2.5 rounded-full">Save</button>
                <button type="button" onClick={close} className="px-6 py-2.5 border border-[#EBD9CE] rounded-full text-xs uppercase tracking-widest">Cancel</button>
              </div>
            </form>
          </aside>
        </>
      )}
      <style>{`.input { width:100%; background:#FDF3EB; border:1px solid #EBD9CE; border-radius:9999px; padding:8px 16px; outline:none; font-size:14px; }
        .input:focus { border-color:#B4593F; }
        textarea.input, .input.!rounded-lg { border-radius: 12px; }`}</style>
    </div>
  );
};
const F = ({ label, children }) => (<label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-500 block mb-1">{label}</span>{children}</label>);

export default AdminCategories;
