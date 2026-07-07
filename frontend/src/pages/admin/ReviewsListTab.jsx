import React, { useEffect, useMemo, useState } from 'react';
import { adminListReviews, adminCreateReview, adminUpdateReview, adminDeleteReview } from '../../lib/api';
import { toast } from 'sonner';
import { Plus, Edit3, Trash2, X, Star, Eye, EyeOff, Check, QrCode, Globe, ShieldCheck } from 'lucide-react';

const empty = { name: '', rating: 5, text: '', when: 'recently', avatar: '', source: 'Manual', published: true, order: 0 };

const sourceBadge = (src) => {
  const s = (src || '').toLowerCase();
  if (s === 'qr') return { icon: QrCode, cls: 'bg-amber-50 text-amber-700', label: 'QR' };
  if (s === 'manual') return { icon: ShieldCheck, cls: 'bg-emerald-50 text-emerald-700', label: 'Manual' };
  return { icon: Globe, cls: 'bg-sky-50 text-sky-700', label: src || 'Google' };
};

const ReviewsListTab = () => {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('all');

  const load = () => adminListReviews().then(setItems).catch(() => setItems([]));
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (filter === 'pending') return items.filter(r => !r.published);
    if (filter === 'qr') return items.filter(r => (r.source || '').toLowerCase() === 'qr');
    if (filter === 'google') return items.filter(r => r.google_review_id);
    if (filter === 'manual') return items.filter(r => !r.google_review_id && (r.source || '').toLowerCase() !== 'qr');
    return items;
  }, [items, filter]);

  const counts = useMemo(() => ({
    all: items.length,
    pending: items.filter(r => !r.published).length,
    qr: items.filter(r => (r.source || '').toLowerCase() === 'qr').length,
    google: items.filter(r => r.google_review_id).length,
    manual: items.filter(r => !r.google_review_id && (r.source || '').toLowerCase() !== 'qr').length,
  }), [items]);

  const onSave = async () => {
    const p = { ...editing, rating: +editing.rating, order: +editing.order };
    try {
      if (editing.id) await adminUpdateReview(editing.id, p); else await adminCreateReview(p);
      toast.success('Saved'); setEditing(null); load();
    } catch { toast.error('Save failed'); }
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
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex flex-wrap gap-2">
          {[
            { k: 'all', l: 'All' },
            { k: 'pending', l: 'Pending', warn: true },
            { k: 'qr', l: 'QR' },
            { k: 'google', l: 'Google' },
            { k: 'manual', l: 'Manual' },
          ].map(f => (
            <button
              key={f.k}
              onClick={() => setFilter(f.k)}
              data-testid={`filter-${f.k}`}
              className={`text-xs uppercase tracking-widest px-4 py-2 rounded-full inline-flex items-center gap-2 ${filter === f.k ? 'bg-[#1A1A1A] text-white' : 'bg-white border border-[#EBD9CE] hover:border-[#B4593F]'} ${f.warn && counts[f.k] > 0 && filter !== f.k ? 'ring-1 ring-amber-400' : ''}`}
            >
              {f.l} <span className="text-[10px] opacity-70">{counts[f.k]}</span>
            </button>
          ))}
        </div>
        <button onClick={() => setEditing({ ...empty })} data-testid="add-review-btn" className="inline-flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#B4593F] text-white px-5 py-2.5 rounded-full text-xs uppercase tracking-widest">
          <Plus className="w-4 h-4" /> Add Review
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {filtered.length === 0 && <div className="md:col-span-2 py-12 text-center text-neutral-500 text-sm">No reviews match this filter yet.</div>}
        {filtered.map(r => {
          const b = sourceBadge(r.source);
          const B = b.icon;
          return (
            <div key={r.id} className="bg-white rounded-xl border border-[#EBD9CE] p-5" data-testid={`review-card-${r.id}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {r.avatar ? <img src={r.avatar} alt="" className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 rounded-full bg-[#FDF3EB] flex items-center justify-center text-[#B4593F] font-semibold">{r.name?.[0]?.toUpperCase() || '?'}</div>}
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{r.name}</div>
                    <div className="text-[11px] text-neutral-500 flex items-center gap-2 flex-wrap">
                      <span>{r.when}</span>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${b.cls}`}><B className="w-2.5 h-2.5" /> {b.label}</span>
                      {r.verified && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700"><Check className="w-2.5 h-2.5" /> Verified</span>}
                      {!r.published && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">Pending</span>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-0.5 shrink-0">
                  {[...Array(5)].map((_, i) => <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? 'fill-[#F5B342] stroke-[#F5B342]' : 'stroke-neutral-300'}`} />)}
                </div>
              </div>
              <p className="text-sm text-neutral-700 mt-3 line-clamp-4">{r.text}</p>
              <div className="flex items-center gap-2 mt-4">
                <button onClick={() => togglePublish(r)} className={`flex-1 inline-flex items-center justify-center gap-1 text-xs rounded-full py-2 ${r.published ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'}`}>
                  {r.published ? <><Eye className="w-3 h-3" /> Published</> : <><EyeOff className="w-3 h-3" /> Publish</>}
                </button>
                <button onClick={() => setEditing(r)} className="p-2 border border-[#EBD9CE] rounded-full hover:border-[#B4593F]"><Edit3 className="w-3 h-3" /></button>
                <button onClick={() => onDelete(r)} className="p-2 border border-[#EBD9CE] rounded-full hover:border-red-500 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <>
          <div onClick={() => setEditing(null)} className="fixed inset-0 bg-black/50 z-50" />
          <aside className="fixed top-0 right-0 h-full w-full sm:w-[520px] bg-white z-50 overflow-y-auto shadow-2xl">
            <div className="px-6 py-5 border-b border-[#EBD9CE] flex items-center justify-between">
              <h3 className="font-serif-display text-2xl">{editing.id ? 'Edit Review' : 'New Review'}</h3>
              <button onClick={() => setEditing(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-5 space-y-4 text-sm">
              <Field label="Customer name"><input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} className="input" /></Field>
              <Field label="Review text"><textarea rows="5" value={editing.text} onChange={e => setEditing({ ...editing, text: e.target.value })} className="input !rounded-lg" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Rating (1-5)"><input type="number" min="1" max="5" value={editing.rating} onChange={e => setEditing({ ...editing, rating: e.target.value })} className="input" /></Field>
                <Field label="When"><input value={editing.when} onChange={e => setEditing({ ...editing, when: e.target.value })} className="input" placeholder="3 months ago" /></Field>
              </div>
              <Field label="Avatar URL (optional)"><input value={editing.avatar || ''} onChange={e => setEditing({ ...editing, avatar: e.target.value })} className="input" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Source"><input value={editing.source || 'Manual'} onChange={e => setEditing({ ...editing, source: e.target.value })} className="input" placeholder="Manual / Google / QR" /></Field>
                <Field label="Order"><input type="number" value={editing.order || 0} onChange={e => setEditing({ ...editing, order: e.target.value })} className="input" /></Field>
              </div>
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!editing.published} onChange={e => setEditing({ ...editing, published: e.target.checked })} /> <span>Published (visible on storefront)</span></label>
            </div>
            <div className="px-6 py-5 border-t border-[#EBD9CE] flex gap-3">
              <button onClick={onSave} data-testid="save-review-btn" className="flex-1 bg-[#1A1A1A] hover:bg-[#B4593F] text-white py-3 rounded-full text-xs uppercase tracking-widest">Save</button>
              <button onClick={() => setEditing(null)} className="px-6 py-3 border border-[#EBD9CE] rounded-full text-xs uppercase tracking-widest">Cancel</button>
            </div>
          </aside>
        </>
      )}
      <style>{`.input { width:100%; background:#FDF3EB; border:1px solid #EBD9CE; border-radius:9999px; padding:8px 16px; outline:none; font-size:14px; }
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

export default ReviewsListTab;
