import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Save, Eye, EyeOff, Monitor } from 'lucide-react';
import { adminGetLightbox, adminUpdateLightbox } from '../../lib/api';
import ImageFieldEditor from './ImageFieldEditor';

const BACKEND = process.env.REACT_APP_BACKEND_URL || '';
const resolveSrc = (u) => (u && u.startsWith('/api/') ? `${BACKEND}${u}` : u);

/**
 * Admin — Homepage Lightbox editor. A single-record settings screen. The
 * public storefront reads these values from `/api/settings/public.lightbox`
 * and shows the overlay on desktop only, honouring the "show once" flag.
 */
const AdminLightbox = () => {
  const [state, setState] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => adminGetLightbox().then(setState).catch(() => setState(null));
  useEffect(() => { load(); }, []);

  const set = (patch) => setState(s => ({ ...s, ...patch }));

  const save = async () => {
    if (state.enabled && !state.image) { toast.error('Please upload a lightbox image before enabling'); return; }
    setSaving(true);
    try {
      const next = await adminUpdateLightbox({
        enabled: !!state.enabled,
        image: state.image || '',
        heading: state.heading || '',
        subtitle: state.subtitle || '',
        cta_label: state.cta_label || '',
        cta_href: state.cta_href || '',
        show_once: state.show_once !== false,
      });
      setState(next);
      toast.success('Lightbox saved — visit the homepage to preview');
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (!state) return <div className="text-neutral-500 text-sm py-12 text-center">Loading…</div>;

  return (
    <div className="max-w-4xl">
      <div className="flex items-end justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="font-serif-display text-4xl" data-testid="lightbox-title">Lightbox</h1>
          <p className="text-sm text-neutral-600 mt-2 max-w-xl">
            Show a promotional pop-up to homepage visitors on <strong>desktop</strong>.
            Upload a graphic, add a heading, subtitle, and a CTA — visitors see it once per version until you change the content.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => set({ enabled: !state.enabled })}
            className={`inline-flex items-center gap-2 text-xs uppercase tracking-widest px-4 py-2.5 rounded-full transition-colors ${state.enabled ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-white border border-[#EBD9CE] text-[#213a60] hover:border-[#B4593F]'}`}
            data-testid="lightbox-toggle-enabled"
          >
            {state.enabled ? <><Eye className="w-3.5 h-3.5" /> Live</> : <><EyeOff className="w-3.5 h-3.5" /> Off</>}
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 text-xs uppercase tracking-widest bg-[#213a60] hover:bg-[#B4593F] disabled:opacity-40 text-white px-5 py-2.5 rounded-full transition-colors"
            data-testid="lightbox-save-btn"
          >
            <Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-8">
        <div className="space-y-6">
          <section className="bg-white border border-[#EBD9CE] rounded-2xl p-6">
            <div className="text-[11px] uppercase tracking-widest text-neutral-500 mb-3">Graphic <span className="text-rose-600">*</span></div>
            <ImageFieldEditor value={state.image} onChange={(v) => set({ image: v })} testKey="lightbox-image" />
            <div className="mt-3 text-[11px] text-neutral-500">Recommended: 1200×800 landscape (JPG or PNG). Uploaded files are optimized to WebP automatically.</div>
          </section>

          <section className="bg-white border border-[#EBD9CE] rounded-2xl p-6 space-y-4">
            <label className="block">
              <div className="text-[11px] uppercase tracking-widest text-neutral-500 mb-1.5">Heading</div>
              <input value={state.heading || ''} onChange={e => set({ heading: e.target.value })} placeholder="Diwali sale — 20% off everything" className="w-full bg-neutral-50 border border-neutral-200 rounded-full px-5 py-2.5 text-sm outline-none focus:border-[#B4593F]" data-testid="lightbox-heading" />
            </label>
            <label className="block">
              <div className="text-[11px] uppercase tracking-widest text-neutral-500 mb-1.5">Subtitle</div>
              <textarea rows={2} value={state.subtitle || ''} onChange={e => set({ subtitle: e.target.value })} placeholder="A short line of copy (optional)" className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-[#B4593F]" data-testid="lightbox-subtitle" />
            </label>
            <div className="grid md:grid-cols-2 gap-4">
              <label className="block">
                <div className="text-[11px] uppercase tracking-widest text-neutral-500 mb-1.5">CTA button label</div>
                <input value={state.cta_label || ''} onChange={e => set({ cta_label: e.target.value })} placeholder="Shop the sale" className="w-full bg-neutral-50 border border-neutral-200 rounded-full px-5 py-2.5 text-sm outline-none focus:border-[#B4593F]" data-testid="lightbox-cta-label" />
              </label>
              <label className="block">
                <div className="text-[11px] uppercase tracking-widest text-neutral-500 mb-1.5">CTA link</div>
                <input value={state.cta_href || ''} onChange={e => set({ cta_href: e.target.value })} placeholder="/shop or https://…" className="w-full bg-neutral-50 border border-neutral-200 rounded-full px-5 py-2.5 text-sm outline-none focus:border-[#B4593F]" data-testid="lightbox-cta-href" />
              </label>
            </div>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={state.show_once !== false} onChange={e => set({ show_once: e.target.checked })} className="accent-[#B4593F]" data-testid="lightbox-show-once" />
              Show only once per visitor (until you change the image / text)
            </label>
          </section>

          <div className="bg-[#FDF3EB] border border-[#EBD9CE] rounded-2xl p-5 text-sm text-neutral-700">
            <div className="flex items-start gap-2">
              <Monitor className="w-4 h-4 text-[#B4593F] mt-0.5 shrink-0" />
              <div>
                <strong>Desktop only</strong> — the lightbox is hidden on tablets and phones (viewport &lt; 1024 px wide) to avoid disrupting the mobile shopping flow.
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        <aside className="lg:sticky lg:top-6 self-start">
          <div className="text-[11px] uppercase tracking-widest text-neutral-500 mb-3">Preview</div>
          <div className="bg-[#213a60]/70 rounded-2xl p-6 min-h-[320px] relative flex items-center justify-center">
            <div className="w-full bg-white rounded-xl overflow-hidden shadow-lg" data-testid="lightbox-preview">
              {state.image ? (
                <img src={resolveSrc(state.image)} alt="preview" className="w-full h-40 object-cover" />
              ) : (
                <div className="w-full h-40 bg-neutral-100 flex items-center justify-center text-xs text-neutral-400">Upload an image →</div>
              )}
              {(state.heading || state.subtitle || (state.cta_label && state.cta_href)) && (
                <div className="p-5 text-center">
                  {state.heading && <div className="font-serif-display text-lg text-[#213a60]">{state.heading}</div>}
                  {state.subtitle && <div className="text-xs text-neutral-600 mt-1">{state.subtitle}</div>}
                  {state.cta_label && state.cta_href && (
                    <div className="inline-block mt-3 bg-[#213a60] text-white px-4 py-2 rounded-full text-[10px] uppercase tracking-widest">{state.cta_label}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default AdminLightbox;
