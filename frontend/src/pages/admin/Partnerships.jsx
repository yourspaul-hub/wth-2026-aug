import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, ChevronUp, ChevronDown, Eye, EyeOff, Save, X, Handshake, ExternalLink, Copy } from 'lucide-react';
import {
  adminListPartnerships, adminCreatePartnership, adminUpdatePartnership,
  adminDeletePartnership, adminReorderPartnerships,
} from '../../lib/api';
import ImageFieldEditor from './ImageFieldEditor';

const BACKEND = process.env.REACT_APP_BACKEND_URL || '';
const resolveSrc = (u) => (u && u.startsWith('/api/') ? `${BACKEND}${u}` : u);

const emptyDraft = { name: '', location: '', description: '', image: '', website: '', active: true };

/**
 * Admin — Partnerships CRUD for the About page "Business is ministry" section.
 * Each partnership card supports an image, description, and external website link.
 */
const AdminPartnerships = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // id | 'new' | null
  const [draft, setDraft] = useState(emptyDraft);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    return adminListPartnerships()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const startNew = () => { setEditing('new'); setDraft(emptyDraft); };
  const startEdit = (p) => {
    setEditing(p.id);
    setDraft({
      name: p.name || '', location: p.location || '', description: p.description || '',
      image: p.image || '', website: p.website || '', active: p.active !== false,
    });
  };
  const cancel = () => { setEditing(null); setDraft(emptyDraft); };

  const submit = async () => {
    if (!draft.name.trim()) { toast.error('Partnership name is required'); return; }
    setSaving(true);
    try {
      if (editing === 'new') {
        await adminCreatePartnership(draft);
        toast.success('Partnership added');
      } else {
        await adminUpdatePartnership(editing, draft);
        toast.success('Partnership updated');
      }
      setEditing(null); setDraft(emptyDraft);
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete partnership "${p.name}"? This cannot be undone.`)) return;
    try {
      await adminDeletePartnership(p.id);
      toast.success('Partnership deleted');
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Delete failed'); }
  };

  const duplicate = async (p) => {
    try {
      const created = await adminCreatePartnership({
        name: `${p.name} (copy)`,
        location: p.location || '', description: p.description || '',
        image: p.image || '', website: p.website || '', active: false,
      });
      toast.success('Duplicated — starts hidden');
      await load();
      if (created?.id) startEdit(created);
    } catch (e) { toast.error(e?.response?.data?.detail || 'Duplicate failed'); }
  };

  const toggleActive = async (p) => {
    try {
      await adminUpdatePartnership(p.id, { active: !p.active });
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Update failed'); }
  };

  const move = async (idx, dir) => {
    const j = idx + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[idx], next[j]] = [next[j], next[idx]];
    setItems(next); // optimistic
    try { await adminReorderPartnerships(next.map(p => p.id)); }
    catch { toast.error('Reorder failed'); load(); }
  };

  return (
    <div className="max-w-5xl">
      <div className="flex items-end justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="font-serif-display text-4xl" data-testid="partnerships-title">Partnerships</h1>
          <p className="text-sm text-neutral-600 mt-2 max-w-xl">
            Cards shown in the <em>Business is ministry</em> section on the About page. Add photo, description, and a website link — visitors can click through to each partner.
          </p>
        </div>
        {editing === null && (
          <button
            onClick={startNew}
            className="inline-flex items-center gap-2 text-xs uppercase tracking-widest bg-[#B4593F] hover:bg-[#9E4B32] text-white px-5 py-2.5 rounded-full transition-colors"
            data-testid="partnerships-add-btn"
          >
            <Plus className="w-4 h-4" /> Add partnership
          </button>
        )}
      </div>

      {editing !== null && (
        <div className="bg-white border border-[#EBD9CE] rounded-2xl p-6 mb-8" data-testid="partnership-editor">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[11px] uppercase tracking-widest text-[#B4593F] flex items-center gap-2">
              <Handshake className="w-3.5 h-3.5" /> {editing === 'new' ? 'New partnership' : 'Edit partnership'}
            </div>
            <button onClick={cancel} aria-label="Cancel" className="text-neutral-500 hover:text-[#213a60]"><X className="w-4 h-4" /></button>
          </div>

          <div className="mb-5">
            <div className="text-[11px] uppercase tracking-widest text-neutral-500 mb-2">Photo <span className="text-neutral-400">(optional but recommended — 16:10 works best)</span></div>
            <ImageFieldEditor value={draft.image} onChange={(v) => setDraft(d => ({ ...d, image: v }))} testKey="partnership-image" />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <label className="block md:col-span-2">
              <div className="text-[11px] uppercase tracking-widest text-neutral-500 mb-1.5">Partnership name <span className="text-rose-600">*</span></div>
              <input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="e.g. Project Arise" className="w-full bg-neutral-50 border border-neutral-200 rounded-full px-5 py-2.5 text-sm outline-none focus:border-[#B4593F]" data-testid="partnership-name" />
            </label>
            <label className="block md:col-span-2">
              <div className="text-[11px] uppercase tracking-widest text-neutral-500 mb-1.5">Location / affiliation</div>
              <input value={draft.location} onChange={e => setDraft(d => ({ ...d, location: e.target.value }))} placeholder="Believers Church Medical College Hospital · Kerala" className="w-full bg-neutral-50 border border-neutral-200 rounded-full px-5 py-2.5 text-sm outline-none focus:border-[#B4593F]" data-testid="partnership-location" />
            </label>
            <label className="block md:col-span-2">
              <div className="text-[11px] uppercase tracking-widest text-neutral-500 mb-1.5">Description</div>
              <textarea rows={3} value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} placeholder="What the partnership does and the impact you're creating together…" className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-[#B4593F]" data-testid="partnership-description" />
            </label>
            <label className="block md:col-span-2">
              <div className="text-[11px] uppercase tracking-widest text-neutral-500 mb-1.5">Website (optional)</div>
              <input type="url" value={draft.website} onChange={e => setDraft(d => ({ ...d, website: e.target.value }))} placeholder="https://…" className="w-full bg-neutral-50 border border-neutral-200 rounded-full px-5 py-2.5 text-sm outline-none focus:border-[#B4593F]" data-testid="partnership-website" />
            </label>
            <label className="inline-flex items-center gap-2 text-sm md:col-span-2 mt-1">
              <input type="checkbox" checked={draft.active} onChange={e => setDraft(d => ({ ...d, active: e.target.checked }))} className="accent-[#B4593F]" data-testid="partnership-active" />
              Show this partnership on the About page
            </label>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2 pt-4 border-t border-[#EBD9CE]">
            <button onClick={cancel} className="text-xs uppercase tracking-widest px-4 py-2.5 rounded-full bg-white border border-[#EBD9CE] hover:border-[#B4593F] transition-colors">Cancel</button>
            <button onClick={submit} disabled={saving || !draft.name.trim()} className="inline-flex items-center gap-2 text-xs uppercase tracking-widest bg-[#213a60] hover:bg-[#B4593F] disabled:opacity-40 text-white px-5 py-2.5 rounded-full transition-colors" data-testid="partnership-save">
              <Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : (editing === 'new' ? 'Add partnership' : 'Save changes')}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-neutral-500 text-sm py-12 text-center">Loading…</div>
      ) : items.length === 0 && editing === null ? (
        <div className="bg-white border border-dashed border-[#EBD9CE] rounded-2xl p-12 text-center">
          <div className="text-sm text-neutral-500 mb-4">No partnerships yet.</div>
          <button onClick={startNew} className="inline-flex items-center gap-2 text-xs uppercase tracking-widest bg-[#B4593F] hover:bg-[#9E4B32] text-white px-5 py-2.5 rounded-full transition-colors">
            <Plus className="w-4 h-4" /> Add your first partnership
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((p, i) => (
            <div key={p.id} className={`bg-white border rounded-2xl p-4 flex items-center gap-4 ${p.active ? 'border-[#EBD9CE]' : 'border-neutral-200 opacity-60'}`} data-testid={`partnership-row-${p.id}`}>
              <div className="flex flex-col gap-1">
                <button onClick={() => move(i, -1)} disabled={i === 0} className="w-7 h-7 flex items-center justify-center rounded hover:bg-neutral-100 disabled:opacity-30" aria-label="Move up"><ChevronUp className="w-4 h-4" /></button>
                <button onClick={() => move(i, 1)} disabled={i === items.length - 1} className="w-7 h-7 flex items-center justify-center rounded hover:bg-neutral-100 disabled:opacity-30" aria-label="Move down"><ChevronDown className="w-4 h-4" /></button>
              </div>
              <div className="w-24 h-24 shrink-0 rounded-lg overflow-hidden bg-[#FDF3EB] flex items-center justify-center">
                {p.image ? (
                  <img src={resolveSrc(p.image)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Handshake className="w-6 h-6 text-[#B4593F]/40" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-serif-display text-lg leading-tight text-[#213a60] truncate">{p.name}</div>
                {p.location && <div className="text-[10px] uppercase tracking-[0.2em] text-[#B4593F] mt-1 truncate">{p.location}</div>}
                {p.description && <div className="text-xs text-neutral-500 mt-1.5 line-clamp-2">{p.description}</div>}
                {p.website && (
                  <a href={p.website} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-[#B4593F] hover:underline">
                    {p.website.slice(0, 60)} <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => toggleActive(p)} title={p.active ? 'Hide from About page' : 'Show on About page'} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors">
                  {p.active ? <Eye className="w-4 h-4 text-emerald-600" /> : <EyeOff className="w-4 h-4 text-neutral-400" />}
                </button>
                <button onClick={() => startEdit(p)} className="text-xs uppercase tracking-widest px-3 py-2 rounded-full bg-white border border-[#EBD9CE] hover:border-[#B4593F] transition-colors" data-testid={`partnership-edit-${p.id}`}>Edit</button>
                <button onClick={() => duplicate(p)} title="Duplicate" className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-neutral-100 text-[#213a60] transition-colors" data-testid={`partnership-duplicate-${p.id}`}>
                  <Copy className="w-4 h-4" />
                </button>
                <button onClick={() => remove(p)} title="Delete" className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-rose-50 text-rose-600 transition-colors" data-testid={`partnership-delete-${p.id}`}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminPartnerships;
