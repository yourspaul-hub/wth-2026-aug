import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Trash2, Edit3, X, ArrowLeft, FolderTree, GripVertical } from 'lucide-react';
import {
  listAllCategories,
  adminListSubcategories,
  adminCreateSubcategory,
  adminUpdateSubcategory,
  adminDeleteSubcategory,
  adminReorderSubcategories,
} from '../../lib/api';
import { useDragReorder } from '../../hooks/useDragReorder';
import ImageFieldEditor from './ImageFieldEditor';

const empty = { name: '', slug: '', image: '', title: '', description: '', order: 0, active: true };

const AdminSubcategories = () => {
  const { cid } = useParams();
  const [parent, setParent] = useState(null);
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);

  const load = () => {
    adminListSubcategories(cid).then(setItems).catch(() => setItems([]));
    listAllCategories()
      .then(list => setParent(list.find(c => c.id === cid) || null))
      .catch(() => setParent(null));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [cid]);

  const persistOrder = async (ids) => {
    setItems(prev => {
      const map = Object.fromEntries(prev.map(s => [s.id, s]));
      return ids.map((id, i) => ({ ...map[id], order: i }));
    });
    try { await adminReorderSubcategories(cid, ids); toast.success('Order saved'); }
    catch (er) { toast.error(er?.response?.data?.detail || 'Reorder failed'); load(); }
  };
  const { dragProps, draggingId, overId } = useDragReorder(items, persistOrder);

  const start = (s) => setEditing(s ? { ...empty, ...s } : { ...empty });
  const close = () => setEditing(null);

  const save = async (e) => {
    e.preventDefault();
    const payload = {
      ...editing,
      active: editing.active !== false,
    };
    delete payload.order; // managed by drag-and-drop
    try {
      if (editing.id) await adminUpdateSubcategory(editing.id, payload);
      else await adminCreateSubcategory(cid, payload);
      toast.success('Saved'); close(); load();
    } catch (er) { toast.error(er?.response?.data?.detail || 'Failed'); }
  };
  const del = async (s) => {
    if (!window.confirm(`Delete subcategory "${s.name}"?`)) return;
    try { await adminDeleteSubcategory(s.id); toast.success('Deleted'); load(); }
    catch (er) { toast.error(er?.response?.data?.detail || 'Failed'); }
  };

  return (
    <div>
      <Link to="/admin/categories" className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-neutral-500 hover:text-[#B4593F] mb-4">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Categories
      </Link>
      <div className="flex items-end justify-between mb-8 gap-4 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-[#B4593F]">{parent?.name || '—'}</div>
          <h1 className="font-serif-display text-4xl mt-1">Subcategories</h1>
          <p className="text-sm text-neutral-600 mt-1">
            {items.length} subcategor{items.length === 1 ? 'y' : 'ies'} · drag cards to reorder · shown on the {parent?.slug ? `/shop/${parent.slug}` : 'category'} page
          </p>
        </div>
        <button
          onClick={() => start(null)}
          data-testid="add-subcategory-btn"
          className="inline-flex items-center gap-2 bg-[#213a60] hover:bg-[#B4593F] text-white text-xs uppercase tracking-widest px-5 py-2.5 rounded-full"
        >
          <Plus className="w-3.5 h-3.5" /> Add Subcategory
        </button>
      </div>

      {items.length === 0 ? (
        <div className="py-16 text-center text-neutral-500 bg-white rounded-xl border border-[#EBD9CE]">
          <FolderTree className="w-8 h-8 mx-auto mb-3 text-[#B4593F]/50" />
          No subcategories yet. Add one to help shoppers browse this category.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(s => (
            <div
              key={s.id}
              data-testid={`subcategory-${s.id}`}
              {...dragProps(s.id)}
              className={`bg-white rounded-xl border overflow-hidden flex gap-4 p-4 transition-all ${!s.active ? 'opacity-60' : ''} ${draggingId === s.id ? 'opacity-40' : ''} ${overId === s.id && draggingId !== s.id ? 'border-[#B4593F] ring-2 ring-[#B4593F]/30' : 'border-[#EBD9CE]'}`}
            >
              <div className="flex items-center pr-1 -my-4 -ml-4 pl-3 border-r border-[#EBD9CE]/60 cursor-grab active:cursor-grabbing" title="Drag to reorder">
                <GripVertical className="w-4 h-4 text-neutral-400" />
              </div>
              <div className="w-24 h-24 rounded-lg bg-neutral-100 shrink-0 overflow-hidden">
                {s.image && <img src={s.image} alt={s.name} className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="font-serif-display text-xl">{s.name}</div>
                  {!s.active && <span className="text-[9px] uppercase tracking-widest bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded">Hidden</span>}
                  <span className="text-[10px] uppercase tracking-widest bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">{s.product_count || 0} products</span>
                </div>
                <div className="text-[11px] text-neutral-500 mt-1 font-mono">/{parent?.slug || '…'}/{s.slug}</div>
                {s.title && <div className="text-sm text-neutral-700 mt-1">{s.title}</div>}
                {s.description && <p className="text-xs text-neutral-600 mt-1 line-clamp-2">{s.description}</p>}
              </div>
              <div className="flex gap-1 shrink-0 items-start">
                <button onClick={() => start(s)} className="p-2 rounded-full hover:bg-[#FDF3EB]" aria-label="Edit"><Edit3 className="w-4 h-4" /></button>
                <button onClick={() => del(s)} className="p-2 rounded-full hover:bg-rose-50" aria-label="Delete"><Trash2 className="w-4 h-4 text-rose-600" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <>
          <div onClick={close} className="fixed inset-0 bg-black/50 z-50" />
          <aside className="fixed top-0 right-0 h-full w-full sm:w-[500px] bg-white z-50 overflow-y-auto shadow-2xl">
            <div className="px-6 py-5 border-b border-[#EBD9CE] flex items-center justify-between">
              <h3 className="font-serif-display text-2xl">{editing.id ? 'Edit Subcategory' : 'New Subcategory'}</h3>
              <button onClick={close} aria-label="Close"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={save} className="px-6 py-5 space-y-4 text-sm">
              <F label="Name *">
                <input
                  required
                  value={editing.name}
                  onChange={e => setEditing({
                    ...editing,
                    name: e.target.value,
                    slug: editing.id ? editing.slug : e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                  })}
                  className="input"
                  data-testid="subcategory-name"
                />
              </F>
              <F label="Slug * (URL segment inside this category)">
                <input
                  required
                  value={editing.slug}
                  onChange={e => setEditing({ ...editing, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-') })}
                  className="input font-mono"
                  placeholder="mugs"
                  data-testid="subcategory-slug"
                />
              </F>
              <F label="Image">
                <ImageFieldEditor value={editing.image || ''} onChange={(v) => setEditing({ ...editing, image: v })} testKey="subcategory-image" />
              </F>
              {editing.image && <img src={editing.image} alt="" className="w-full aspect-[4/5] object-cover rounded-lg" />}
              <F label="Title (big headline on the subcategory landing)">
                <input value={editing.title || ''} onChange={e => setEditing({ ...editing, title: e.target.value })} className="input" placeholder="Ceramic Mugs" />
              </F>
              <F label="Description">
                <textarea rows="4" value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} className="input !rounded-lg" placeholder="One or two lines shown under the title on the landing page." />
              </F>
              <label className="flex items-start gap-3 bg-[#FDF3EB] border border-[#EBD9CE] rounded-xl px-4 py-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editing.active !== false}
                  onChange={e => setEditing({ ...editing, active: e.target.checked })}
                  className="mt-0.5 accent-[#B4593F]"
                  data-testid="subcategory-active-toggle"
                />
                <span className="flex-1">
                  <span className="block text-sm font-medium text-[#213a60]">Active</span>
                  <span className="block text-[11px] text-neutral-600 mt-0.5">Uncheck to hide this subcategory from the storefront without deleting it.</span>
                </span>
              </label>
              <div className="pt-2 flex gap-3">
                <button type="submit" data-testid="save-subcategory-btn" className="flex-1 bg-[#213a60] hover:bg-[#B4593F] text-white text-xs uppercase tracking-widest px-6 py-2.5 rounded-full">Save</button>
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

export default AdminSubcategories;
