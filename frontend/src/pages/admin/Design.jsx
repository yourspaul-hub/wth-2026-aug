import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Palette, Save, ExternalLink, RotateCcw, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { CONTENT_SECTIONS, CONTENT_DEFAULTS, PAGES } from '../../lib/contentRegistry';
import { fetchSiteContent, adminSaveSiteContent, adminResetSiteContentKey } from '../../lib/api';
import CatalogueUploader from './CatalogueUploader';

/**
 * Admin — Design tab. Edit every editable text string on the storefront,
 * grouped by section. Saves are bulk-PUT to /api/admin/content and broadcast
 * via `window.dispatchEvent('wth:content-saved')` so the current tab hot-updates.
 */
const AdminDesign = () => {
  const [values, setValues] = useState({});   // full working set (defaults + overrides)
  const [overrides, setOverrides] = useState({}); // what's persisted in DB
  const [dirty, setDirty] = useState({});     // keys pending save
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState('');
  const [pageFilter, setPageFilter] = useState('all');
  const [openSection, setOpenSection] = useState('announcement');

  useEffect(() => {
    fetchSiteContent().then(res => {
      const ov = res?.items || {};
      setOverrides(ov);
      setValues({ ...CONTENT_DEFAULTS, ...ov });
    }).catch(() => {
      setValues({ ...CONTENT_DEFAULTS });
      toast.error('Could not load site content — showing defaults.');
    });
  }, []);

  const dirtyCount = Object.keys(dirty).length;

  const onChange = (key, val) => {
    setValues(v => ({ ...v, [key]: val }));
    setDirty(d => ({ ...d, [key]: val }));
  };

  const onResetKey = async (key) => {
    if (!window.confirm('Reset this field to the default text?')) return;
    try {
      await adminResetSiteContentKey(key);
      const { [key]: _removed, ...rest } = overrides;
      setOverrides(rest);
      setValues(v => ({ ...v, [key]: CONTENT_DEFAULTS[key] || '' }));
      setDirty(d => { const { [key]: __, ...r } = d; return r; });
      window.dispatchEvent(new CustomEvent('wth:content-saved', { detail: { [key]: CONTENT_DEFAULTS[key] || '' } }));
      toast.success('Reset to default');
    } catch {
      toast.error('Reset failed');
    }
  };

  const onSaveAll = async () => {
    if (dirtyCount === 0) return;
    setSaving(true);
    try {
      await adminSaveSiteContent(dirty);
      setOverrides(o => ({ ...o, ...dirty }));
      window.dispatchEvent(new CustomEvent('wth:content-saved', { detail: dirty }));
      setDirty({});
      toast.success(`Saved ${dirtyCount} change${dirtyCount === 1 ? '' : 's'}`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = CONTENT_SECTIONS;
    if (pageFilter !== 'all') list = list.filter(s => s.page === pageFilter);
    if (!term) return list;
    return list
      .map(s => ({ ...s, items: s.items.filter(it => it.key.toLowerCase().includes(term) || (values[it.key] || '').toLowerCase().includes(term) || (it.default || '').toLowerCase().includes(term)) }))
      .filter(s => s.items.length > 0 || s.label.toLowerCase().includes(term));
  }, [q, pageFilter, values]);

  return (
    <div className="p-6 lg:p-10 max-w-[1100px] mx-auto" data-testid="admin-design-page">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-[#B4593F] mb-2">
            <Palette className="w-3.5 h-3.5" /> Site content
          </div>
          <h1 className="font-serif-display text-4xl">Design & Copy</h1>
          <p className="mt-2 text-sm text-neutral-600 max-w-2xl">Edit every text string on the storefront. Fonts, layout and colors stay unchanged — only the words update. Reset any field to bring the original copy back.</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] bg-white border border-neutral-200 hover:border-[#B4593F] px-4 py-2.5 rounded-full transition-colors"
            data-testid="design-preview-site"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Preview site
          </a>
          <button
            onClick={onSaveAll}
            disabled={saving || dirtyCount === 0}
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] bg-[#B4593F] disabled:bg-neutral-300 hover:bg-[#9E4B32] text-white px-5 py-2.5 rounded-full transition-colors"
            data-testid="design-save-btn"
          >
            <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : `Save${dirtyCount ? ` (${dirtyCount})` : ''}`}
          </button>
        </div>
      </div>

      {/* Page filter + Search */}
      <div className="grid md:grid-cols-[240px_1fr] gap-3 mb-6">
        <select
          value={pageFilter}
          onChange={e => setPageFilter(e.target.value)}
          className="bg-white border border-neutral-200 rounded-full px-5 py-3 text-sm outline-none focus:border-[#B4593F]"
          data-testid="design-page-filter"
        >
          <option value="all">All pages</option>
          {PAGES.map(p => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search fields by key, current value, or default text..."
            className="w-full bg-white border border-neutral-200 rounded-full pl-11 pr-5 py-3 text-sm outline-none focus:border-[#B4593F]"
            data-testid="design-search"
          />
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {(pageFilter === 'all' || pageFilter === 'home') && <CatalogueUploader />}
        {filtered.map(section => {
          const open = openSection === section.id || q.trim().length > 0 || pageFilter !== 'all';
          const dirtyInSection = section.items.filter(it => it.key in dirty).length;
          return (
            <div key={section.id} className="bg-white rounded-2xl border border-neutral-200 overflow-hidden" data-testid={`design-section-${section.id}`}>
              <button
                onClick={() => setOpenSection(o => o === section.id ? '' : section.id)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-neutral-50 text-left"
                data-testid={`design-section-toggle-${section.id}`}
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{section.label}</span>
                    <span className="text-[10px] uppercase tracking-[0.15em] bg-[#FDF3EB] text-[#B4593F] px-2 py-0.5 rounded-full">{(PAGES.find(p => p.id === section.page) || {}).label || section.page}</span>
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">{section.items.length} field{section.items.length === 1 ? '' : 's'} · <code className="text-neutral-400">{section.id}.*</code></div>
                </div>
                <div className="flex items-center gap-3">
                  {dirtyInSection > 0 && <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.2em] bg-[#B4593F]/10 text-[#B4593F] px-2 py-1 rounded-full">{dirtyInSection} pending</span>}
                  {open ? <ChevronUp className="w-4 h-4 text-neutral-500" /> : <ChevronDown className="w-4 h-4 text-neutral-500" />}
                </div>
              </button>

              {open && (
                <div className="px-5 pb-5 space-y-4 border-t border-neutral-100">
                  {section.items.map(item => {
                    const val = values[item.key] ?? '';
                    const def = item.default || '';
                    const isOverridden = item.key in overrides;
                    const isDirty = item.key in dirty;
                    const multi = def.length > 90 || def.includes('\n');
                    return (
                      <div key={item.key} className="pt-4" data-testid={`design-field-${item.key}`}>
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                          <label htmlFor={`f-${item.key}`} className="text-[11px] uppercase tracking-[0.2em] text-neutral-500 font-mono normal-case">{item.key}</label>
                          <div className="flex items-center gap-2">
                            {isDirty && <span className="text-[10px] text-[#B4593F]">unsaved</span>}
                            {isOverridden && !isDirty && <span className="text-[10px] text-neutral-400">customized</span>}
                            {isOverridden && (
                              <button
                                onClick={() => onResetKey(item.key)}
                                className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-neutral-500 hover:text-[#B4593F]"
                                title="Reset to default"
                                data-testid={`design-reset-${item.key}`}
                              >
                                <RotateCcw className="w-3 h-3" /> Reset
                              </button>
                            )}
                          </div>
                        </div>
                        {multi ? (
                          <textarea
                            id={`f-${item.key}`}
                            value={val}
                            onChange={e => onChange(item.key, e.target.value)}
                            rows={Math.min(6, Math.max(2, Math.ceil(val.length / 90)))}
                            className={`w-full bg-neutral-50 border rounded-xl px-4 py-3 text-sm outline-none focus:border-[#B4593F] transition-colors resize-y ${isDirty ? 'border-[#B4593F]' : 'border-neutral-200'}`}
                          />
                        ) : (
                          <input
                            id={`f-${item.key}`}
                            value={val}
                            onChange={e => onChange(item.key, e.target.value)}
                            className={`w-full bg-neutral-50 border rounded-full px-5 py-2.5 text-sm outline-none focus:border-[#B4593F] transition-colors ${isDirty ? 'border-[#B4593F]' : 'border-neutral-200'}`}
                          />
                        )}
                        {(item.hint || (val !== def)) && (
                          <div className="mt-1.5 text-[11px] text-neutral-500 flex flex-wrap items-center gap-2">
                            {item.hint && <span>{item.hint}</span>}
                            {val !== def && (
                              <span className="text-neutral-400">Default: <span className="italic">{def.slice(0, 120)}{def.length > 120 ? '…' : ''}</span></span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-neutral-200 p-10 text-center text-neutral-500 text-sm">No fields match &quot;{q}&quot;.</div>
        )}
      </div>

      {/* Sticky save bar when dirty */}
      {dirtyCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 bg-[#1A1A1A] text-white rounded-full pl-5 pr-2 py-2 flex items-center gap-4 shadow-2xl" data-testid="design-sticky-save">
          <span className="text-xs">{dirtyCount} unsaved change{dirtyCount === 1 ? '' : 's'}</span>
          <button
            onClick={onSaveAll}
            disabled={saving}
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] bg-[#B4593F] hover:bg-[#E88864] disabled:bg-neutral-500 text-white px-5 py-2 rounded-full transition-colors"
          >
            <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save all'}
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminDesign;
