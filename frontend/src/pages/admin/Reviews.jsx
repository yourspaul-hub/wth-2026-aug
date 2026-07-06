import React, { useEffect, useState } from 'react';
import { adminListReviews, adminCreateReview, adminUpdateReview, adminDeleteReview } from '../../lib/api';
import { toast } from 'sonner';
import { Plus, Edit3, Trash2, X, Star, Eye, EyeOff } from 'lucide-react';

const empty = { name: '', rating: 5, text: '', when: 'recently', avatar: '', source: 'Google', published: true, order: 0 };

const AdminReviews = () => {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);

  const load = () => adminListReviews().then(setItems).catch(() => setItems([]));
  useEffect(() => { load(); }, []);

  const onSave = async () => {
    const p = { ...editing, rating: +editing.rating, order: +editing.order };
    try {
      if (editing.id) await adminUpdateReview(editing.id, p); else await adminCreateReview(p);
      toast.success('Review saved'); setEditing(null); load();
    } catch (e) { toast.error('Save failed'); }
  };
  const onDelete = async (r) => {
    if (!window.confirm(`Delete review by ${r.name}?`)) return;
    await adminDeleteReview(r.id); toast.success('Deleted'); load();
  };
  const togglePublish = async (r) => {
    const updated = await adminUpdateReview(r.id, { published: !r.published });
    setItems(prev => prev.map(x => x.id === r.id ? updated : x));
  };

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-serif-display text-4xl">Reviews</h1>
          <p className="text-sm text-neutral-600 mt-1">Manually paste Google reviews here · {items.length} total</p>
        </div>
        <button onClick={() => setEditing({ ...empty })} className="inline-flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#B4593F] text-white px-5 py-2.5 rounded-full text-xs uppercase tracking-widest"><Plus className="w-4 h-4" /> Add Review</button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {items.map(r => (
          <div key={r.id} className="bg-white rounded-xl border border-[#EBD9CE] p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {r.avatar && <img src={r.avatar} alt="" className="w-10 h-10 rounded-full" />}
                <div>
                  <div className="font-medium text-sm">{r.name}</div>
                  <div className="text-[11px] text-neutral-500">{r.when} · {r.source}</div>
                </div>
              </div>
              <div className="flex gap-1">{[...Array(5)].map((_, i) => <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? 'fill-[#E8B364] stroke-[#E8B364]' : 'stroke-neutral-300'}`} />)}</div>
            </div>
            <p className="text-sm text-neutral-700 mt-3 line-clamp-3">{r.text}</p>
            <div className="flex items-center gap-2 mt-4">
              <button onClick={() => setEditing(r)} className="flex-1 inline-flex items-center justify-center gap-1 text-xs border border-[#EBD9CE] rounded-full py-2 hover:border-[#B4593F] hover:text-[#B4593F]"><Edit3 className="w-3 h-3" /> Edit</button>
              <button onClick={() => togglePublish(r)} className="px-3 py-2 text-xs border border-[#EBD9CE] rounded-full hover:border-[#B4593F] hover:text-[#B4593F]">{r.published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}</button>
              <button onClick={() => onDelete(r)} className="px-3 py-2 text-xs border border-[#EBD9CE] rounded-full hover:border-red-500 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <>
          <div onClick={() => setEditing(null)} className="fixed inset-0 bg-black/50 z-50" />
          <aside className="fixed top-0 right-0 h-full w-full sm:w-[520px] bg-white z-50 overflow-y-auto shadow-2xl">
            <div className="px-6 py-5 border-b border-[#EBD9CE] flex items-center justify-between">
              <h3 className="font-serif-display text-2xl">{editing.id ? 'Edit Review' : 'New Review'}</h3>
              <button onClick={() => setEditing(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Customer name</span><input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]" /></label>
              <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Review text</span><textarea rows="5" value={editing.text} onChange={e => setEditing({ ...editing, text: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]" /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Rating (1-5)</span><input type="number" min="1" max="5" value={editing.rating} onChange={e => setEditing({ ...editing, rating: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]" /></label>
                <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">When (e.g. 3 months ago)</span><input value={editing.when} onChange={e => setEditing({ ...editing, when: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]" /></label>
              </div>
              <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Avatar URL (optional)</span><input value={editing.avatar || ''} onChange={e => setEditing({ ...editing, avatar: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]" /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Source</span><input value={editing.source || 'Google'} onChange={e => setEditing({ ...editing, source: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]" /></label>
                <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Order</span><input type="number" value={editing.order || 0} onChange={e => setEditing({ ...editing, order: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]" /></label>
              </div>
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!editing.published} onChange={e => setEditing({ ...editing, published: e.target.checked })} /> <span className="text-sm">Published (visible on storefront)</span></label>
            </div>
            <div className="px-6 py-5 border-t border-[#EBD9CE] flex gap-3"><button onClick={onSave} className="flex-1 bg-[#1A1A1A] hover:bg-[#B4593F] text-white py-3 rounded-full text-xs uppercase tracking-widest">Save</button><button onClick={() => setEditing(null)} className="px-6 py-3 border border-[#EBD9CE] rounded-full text-xs uppercase tracking-widest">Cancel</button></div>
          </aside>
        </>
      )}
    </div>
  );
};

export default AdminReviews;
