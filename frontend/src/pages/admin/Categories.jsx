import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listAllCategories, adminCreateCategory, adminUpdateCategory, adminDeleteCategory, adminListSubcategories, adminReorderCategories } from '../../lib/api';
import { invalidateCategories } from '../../hooks/useCategories';
import { useDragReorder } from '../../hooks/useDragReorder';
import { toast } from 'sonner';
import { Plus, Trash2, Edit3, X, FolderOpen, FolderTree, ChevronRight, GripVertical } from 'lucide-react';
import ImageFieldEditor from './ImageFieldEditor';

const empty = { name: '', slug: '', description: '', image: '', order: 0, coming_soon: false };

const AdminCategories = () => {
  const [items, setItems] = useState([]);
  const [subCounts, setSubCounts] = useState({});
  const [editing, setEditing] = useState(null);

  const load = async () => {
    try {
      const list = await listAllCategories();
      setItems(list);
      // Load subcategory counts for each category in parallel
      const counts = await Promise.all(
        list.map(c => adminListSubcategories(c.id).then(arr => [c.id, arr.length]).catch(() => [c.id, 0]))
      );
      setSubCounts(Object.fromEntries(counts));
    } catch {
      setItems([]);
      setSubCounts({});
    }
  };
  useEffect(() => { load(); }, []);

  const persistOrder = async (ids) => {
    // optimistic UI
    setItems(prev => {
      const map = Object.fromEntries(prev.map(c => [c.id, c]));
      return ids.map((id, i) => ({ ...map[id], order: i }));
    });
    try { await adminReorderCategories(ids); invalidateCategories(); toast.success('Order saved'); }
    catch (er) { toast.error(er?.response?.data?.detail || 'Reorder failed'); load(); }
  };
  const { dragProps, draggingId, overId } = useDragReorder(items, persistOrder);

  const start = (c) => setEditing(c ? { ...empty, ...c } : { ...empty });
  const close = () => setEditing(null);

  const save = async (e) => {
    e.preventDefault();
    const p = { ...editing, coming_soon: !!editing.coming_soon };
    delete p.order; // order is now managed by drag-and-drop
    try {
      if (editing.id) await adminUpdateCategory(editing.id, p);
      else await adminCreateCategory(p);
      invalidateCategories();
      toast.success('Saved'); close(); load();
    } catch (er) { toast.error(er?.response?.data?.detail || 'Failed'); }
  };
  const del = async (c) => {
    if (!window.confirm(`Delete "${c.name}"?`)) return;
    try { await adminDeleteCategory(c.id); invalidateCategories(); toast.success('Deleted'); load(); }
    catch (er) { toast.error(er?.response?.data?.detail || 'Failed'); }
  };

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-serif-display text-4xl">Categories</h1>
          <p className="text-sm text-neutral-600 mt-1">{items.length} categor{items.length === 1 ? 'y' : 'ies'} · drag cards to reorder · shown in Shop nav & filters</p>
        </div>
        <button onClick={() => start(null)} data-testid="add-category-btn" className="inline-flex items-center gap-2 bg-[#213a60] hover:bg-[#B4593F] text-white text-xs uppercase tracking-widest px-5 py-2.5 rounded-full">
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
          <div
            key={c.id}
            data-testid={`category-${c.id}`}
            {...dragProps(c.id)}
            className={`bg-white rounded-xl border overflow-hidden transition-all ${draggingId === c.id ? 'opacity-40' : ''} ${overId === c.id && draggingId !== c.id ? 'border-[#B4593F] ring-2 ring-[#B4593F]/30' : 'border-[#EBD9CE]'}`}
          >
            <div className="aspect-[16/9] bg-neutral-100 relative">
              {c.image && <img src={c.image} alt={c.name} className="w-full h-full object-cover" />}
              {c.coming_soon && (
                <div className="absolute top-3 left-3 bg-white/95 text-[10px] uppercase tracking-[0.2em] px-3 py-1.5 rounded-full text-[#213a60]" data-testid={`coming-soon-badge-${c.id}`}>Coming Soon</div>
              )}
              <div className="absolute top-3 right-3 bg-white/95 rounded-full p-1.5 shadow-sm cursor-grab active:cursor-grabbing" title="Drag to reorder">
                <GripVertical className="w-4 h-4 text-neutral-500" />
              </div>
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-serif-display text-2xl">{c.name}</div>
                  <div className="text-[11px] text-neutral-500 mt-1 font-mono">/{c.slug}</div>
                  {c.description && <p className="text-xs text-neutral-600 mt-2 line-clamp-2">{c.description}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => start(c)} className="p-2 rounded-full hover:bg-[#FDF3EB]"><Edit3 className="w-4 h-4" /></button>
                  <button onClick={() => del(c)} className="p-2 rounded-full hover:bg-rose-50"><Trash2 className="w-4 h-4 text-rose-600" /></button>
                </div>
              </div>
              <Link
                to={`/admin/categories/${c.id}/subcategories`}
                data-testid={`manage-subcategories-${c.id}`}
                className="mt-4 flex items-center justify-between gap-2 text-xs uppercase tracking-widest text-[#213a60] hover:text-[#B4593F] border-t border-[#EBD9CE] pt-3"
              >
                <span className="inline-flex items-center gap-2">
                  <FolderTree className="w-3.5 h-3.5" />
                  {subCounts[c.id] || 0} subcategor{subCounts[c.id] === 1 ? 'y' : 'ies'}
                </span>
                <span className="inline-flex items-center gap-1">Manage <ChevronRight className="w-3.5 h-3.5" /></span>
              </Link>
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
              <F label="Image"><ImageFieldEditor value={editing.image || ''} onChange={(v) => setEditing({ ...editing, image: v })} testKey="category-image" /></F>
              {editing.image && <img src={editing.image} alt="" className="w-full aspect-[16/9] object-cover rounded-lg" />}
              <F label="Description"><textarea rows="3" value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} className="input !rounded-lg" /></F>
              <label className="flex items-start gap-3 bg-[#FDF3EB] border border-[#EBD9CE] rounded-xl px-4 py-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!editing.coming_soon}
                  onChange={e => setEditing({ ...editing, coming_soon: e.target.checked })}
                  className="mt-0.5 accent-[#B4593F]"
                  data-testid="category-coming-soon-toggle"
                />
                <span className="flex-1">
                  <span className="block text-sm font-medium text-[#213a60]">Mark as "Coming Soon"</span>
                  <span className="block text-[11px] text-neutral-600 mt-0.5">Shows a "Coming Soon" pill on the homepage tile and hides this category from Shop filters until you turn it off.</span>
                </span>
              </label>
              <div className="pt-2 flex gap-3">
                <button type="submit" data-testid="save-category-btn" className="flex-1 bg-[#213a60] hover:bg-[#B4593F] text-white text-xs uppercase tracking-widest px-6 py-2.5 rounded-full">Save</button>
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
