import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, ChevronUp, ChevronDown, Eye, EyeOff, Save, X, Sparkles, Copy } from 'lucide-react';
import { adminListHeroSlides, adminCreateHeroSlide, adminUpdateHeroSlide, adminDeleteHeroSlide, adminReorderHeroSlides } from '../../lib/api';
import ImageFieldEditor from './ImageFieldEditor';

/**
 * Admin — Hero carousel manager. Full CRUD + reorder + toggle visibility for
 * the homepage hero. No cap on slide count; the public storefront skips slides
 * with no image or `active=false`.
 */
const emptyDraft = { image: '', heading: '', accent: '', subtitle: '', cta: 'Shop the Collection', href: '/shop', active: true };

const AdminHeroSlides = () => {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // slide id or 'new'
  const [draft, setDraft] = useState(emptyDraft);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    return adminListHeroSlides()
      .then(setSlides)
      .catch(() => setSlides([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const startNew = () => { setEditing('new'); setDraft(emptyDraft); };
  const startEdit = (s) => { setEditing(s.id); setDraft({ image: s.image, heading: s.heading || '', accent: s.accent || '', subtitle: s.subtitle || '', cta: s.cta || '', href: s.href || '/shop', active: s.active !== false }); };
  const cancel = () => { setEditing(null); setDraft(emptyDraft); };

  const submit = async () => {
    if (!draft.image.trim()) { toast.error('Please upload or set a slide image'); return; }
    setSaving(true);
    try {
      if (editing === 'new') {
        await adminCreateHeroSlide(draft);
        toast.success('Slide added');
      } else {
        await adminUpdateHeroSlide(editing, draft);
        toast.success('Slide updated');
      }
      setEditing(null); setDraft(emptyDraft);
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (s) => {
    if (!window.confirm(`Delete slide "${s.heading || s.accent || 'untitled'}"? This cannot be undone.`)) return;
    try {
      await adminDeleteHeroSlide(s.id);
      toast.success('Slide deleted');
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Delete failed'); }
  };

  const duplicate = async (s) => {
    try {
      const clone = {
        image: s.image,
        heading: s.heading || '',
        accent: s.accent || '',
        subtitle: s.subtitle || '',
        cta: s.cta || 'Shop the Collection',
        href: s.href || '/shop',
        active: false, // duplicates start hidden so the admin can review before publishing
      };
      const created = await adminCreateHeroSlide(clone);
      toast.success('Slide duplicated (hidden until you publish)');
      await load();
      // Open the new slide in the editor for quick tweaking
      if (created?.id) startEdit(created);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Duplicate failed');
    }
  };

  const toggleActive = async (s) => {
    try {
      await adminUpdateHeroSlide(s.id, { active: !s.active });
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Update failed'); }
  };

  const move = async (idx, dir) => {
    const j = idx + dir;
    if (j < 0 || j >= slides.length) return;
    const next = [...slides];
    [next[idx], next[j]] = [next[j], next[idx]];
    setSlides(next); // optimistic
    try {
      await adminReorderHeroSlides(next.map(s => s.id));
    } catch (e) {
      toast.error('Reorder failed');
      load();
    }
  };

  return (
    <div className="max-w-5xl">
      <div className="flex items-end justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="font-serif-display text-4xl" data-testid="hero-slides-title">Hero Slides</h1>
          <p className="text-sm text-neutral-600 mt-2 max-w-xl">
            The homepage carousel — add as many slides as you like, reorder them, or hide slides temporarily without deleting.
            Only slides with an image and <em>Active</em> = on are shown to visitors.
          </p>
        </div>
        {editing === null && (
          <button
            onClick={startNew}
            className="inline-flex items-center gap-2 text-xs uppercase tracking-widest bg-[#B4593F] hover:bg-[#9E4B32] text-white px-5 py-2.5 rounded-full transition-colors"
            data-testid="hero-slides-add-btn"
          >
            <Plus className="w-4 h-4" /> Add slide
          </button>
        )}
      </div>

      {editing !== null && (
        <div className="bg-white border border-[#EBD9CE] rounded-2xl p-6 mb-8" data-testid="hero-slide-editor">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[11px] uppercase tracking-widest text-[#B4593F] flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" /> {editing === 'new' ? 'New slide' : 'Edit slide'}
            </div>
            <button onClick={cancel} aria-label="Cancel" className="text-neutral-500 hover:text-[#213a60]" data-testid="hero-slide-editor-close"><X className="w-4 h-4" /></button>
          </div>

          <div className="mb-5">
            <div className="text-[11px] uppercase tracking-widest text-neutral-500 mb-2">Slide image <span className="text-rose-600">*</span></div>
            <ImageFieldEditor value={draft.image} onChange={(v) => setDraft(d => ({ ...d, image: v }))} testKey="hero-slide-image" />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <label className="block">
              <div className="text-[11px] uppercase tracking-widest text-neutral-500 mb-1.5">Heading (first line)</div>
              <input value={draft.heading} onChange={e => setDraft(d => ({ ...d, heading: e.target.value }))} placeholder="Share the Message of" className="w-full bg-neutral-50 border border-neutral-200 rounded-full px-5 py-2.5 text-sm outline-none focus:border-[#B4593F]" data-testid="hero-slide-heading" />
            </label>
            <label className="block">
              <div className="text-[11px] uppercase tracking-widest text-neutral-500 mb-1.5">Accent (italic second line)</div>
              <input value={draft.accent} onChange={e => setDraft(d => ({ ...d, accent: e.target.value }))} placeholder="Love & Hope" className="w-full bg-neutral-50 border border-neutral-200 rounded-full px-5 py-2.5 text-sm outline-none focus:border-[#B4593F]" data-testid="hero-slide-accent" />
            </label>
            <label className="block md:col-span-2">
              <div className="text-[11px] uppercase tracking-widest text-neutral-500 mb-1.5">Subtitle (paragraph)</div>
              <textarea rows={2} value={draft.subtitle} onChange={e => setDraft(d => ({ ...d, subtitle: e.target.value }))} placeholder="Faith-driven products, crafted to impact lives" className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-[#B4593F]" data-testid="hero-slide-subtitle" />
            </label>
            <label className="block">
              <div className="text-[11px] uppercase tracking-widest text-neutral-500 mb-1.5">CTA button label</div>
              <input value={draft.cta} onChange={e => setDraft(d => ({ ...d, cta: e.target.value }))} placeholder="Shop the Collection" className="w-full bg-neutral-50 border border-neutral-200 rounded-full px-5 py-2.5 text-sm outline-none focus:border-[#B4593F]" data-testid="hero-slide-cta" />
            </label>
            <label className="block">
              <div className="text-[11px] uppercase tracking-widest text-neutral-500 mb-1.5">CTA link (URL or /path)</div>
              <input value={draft.href} onChange={e => setDraft(d => ({ ...d, href: e.target.value }))} placeholder="/shop" className="w-full bg-neutral-50 border border-neutral-200 rounded-full px-5 py-2.5 text-sm outline-none focus:border-[#B4593F]" data-testid="hero-slide-href" />
            </label>
            <label className="inline-flex items-center gap-2 text-sm md:col-span-2 mt-1">
              <input type="checkbox" checked={draft.active} onChange={e => setDraft(d => ({ ...d, active: e.target.checked }))} className="accent-[#B4593F]" data-testid="hero-slide-active" />
              Show this slide on the homepage
            </label>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2 pt-4 border-t border-[#EBD9CE]">
            <button onClick={cancel} className="text-xs uppercase tracking-widest px-4 py-2.5 rounded-full bg-white border border-[#EBD9CE] hover:border-[#B4593F] transition-colors" data-testid="hero-slide-cancel">Cancel</button>
            <button onClick={submit} disabled={saving || !draft.image} className="inline-flex items-center gap-2 text-xs uppercase tracking-widest bg-[#213a60] hover:bg-[#B4593F] disabled:opacity-40 text-white px-5 py-2.5 rounded-full transition-colors" data-testid="hero-slide-save">
              <Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : (editing === 'new' ? 'Add slide' : 'Save changes')}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-neutral-500 text-sm py-12 text-center">Loading…</div>
      ) : slides.length === 0 && editing === null ? (
        <div className="bg-white border border-dashed border-[#EBD9CE] rounded-2xl p-12 text-center">
          <div className="text-sm text-neutral-500 mb-4">No hero slides configured yet.</div>
          <button onClick={startNew} className="inline-flex items-center gap-2 text-xs uppercase tracking-widest bg-[#B4593F] hover:bg-[#9E4B32] text-white px-5 py-2.5 rounded-full transition-colors">
            <Plus className="w-4 h-4" /> Add your first slide
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {slides.map((s, i) => (
            <div key={s.id} className={`bg-white border rounded-2xl p-4 flex items-center gap-4 ${s.active ? 'border-[#EBD9CE]' : 'border-neutral-200 opacity-60'}`} data-testid={`hero-slide-row-${s.id}`}>
              <div className="flex flex-col gap-1">
                <button onClick={() => move(i, -1)} disabled={i === 0} className="w-7 h-7 flex items-center justify-center rounded hover:bg-neutral-100 disabled:opacity-30" aria-label="Move up"><ChevronUp className="w-4 h-4" /></button>
                <button onClick={() => move(i, 1)} disabled={i === slides.length - 1} className="w-7 h-7 flex items-center justify-center rounded hover:bg-neutral-100 disabled:opacity-30" aria-label="Move down"><ChevronDown className="w-4 h-4" /></button>
              </div>
              <div className="w-24 h-24 shrink-0 rounded-lg overflow-hidden bg-neutral-100">
                {s.image ? (
                  <img
                    src={s.image.startsWith('/api/') ? (process.env.REACT_APP_BACKEND_URL || '') + s.image : s.image}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] uppercase tracking-widest text-neutral-400">No image</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-serif-display text-lg leading-tight truncate">{s.heading || <span className="text-neutral-400 italic">No heading</span>} {s.accent && <em className="text-[#B4593F]">{s.accent}</em>}</div>
                <div className="text-xs text-neutral-500 truncate mt-1">{s.subtitle || '—'}</div>
                <div className="text-[11px] text-neutral-400 mt-1 truncate">CTA: <strong>{s.cta || '—'}</strong> → {s.href || '/'}</div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => toggleActive(s)} title={s.active ? 'Hide from homepage' : 'Show on homepage'} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors" data-testid={`hero-slide-toggle-${s.id}`}>
                  {s.active ? <Eye className="w-4 h-4 text-emerald-600" /> : <EyeOff className="w-4 h-4 text-neutral-400" />}
                </button>
                <button onClick={() => startEdit(s)} className="text-xs uppercase tracking-widest px-3 py-2 rounded-full bg-white border border-[#EBD9CE] hover:border-[#B4593F] transition-colors" data-testid={`hero-slide-edit-${s.id}`}>Edit</button>
                <button onClick={() => duplicate(s)} title="Duplicate slide" className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-neutral-100 text-[#213a60] transition-colors" data-testid={`hero-slide-duplicate-${s.id}`}>
                  <Copy className="w-4 h-4" />
                </button>
                <button onClick={() => remove(s)} title="Delete slide" className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-rose-50 text-rose-600 transition-colors" data-testid={`hero-slide-delete-${s.id}`}>
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

export default AdminHeroSlides;
