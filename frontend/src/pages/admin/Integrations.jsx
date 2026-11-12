import React, { useEffect, useState } from 'react';
import { adminListIntegrations, adminSaveIntegration, adminRevealIntegration, adminClearIntegration } from '../../lib/api';
import { toast } from 'sonner';
import { Puzzle, Save, Eye, EyeOff, ExternalLink, X, RotateCcw, ShieldCheck, AlertCircle, MinusCircle } from 'lucide-react';

const catIcon = { instagram: '📸', shipping: '🚚', payments: '💳', email: '📧', analytics: '📈', google: '🔎', general: '⚙️' };

const AdminIntegrations = () => {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reveal, setReveal] = useState({});   // key -> value
  const [drafts, setDrafts] = useState({});   // key -> value (unsaved)
  const [saving, setSaving] = useState(null);

  const load = () => adminListIntegrations().then(d => { setSections(d.sections); setLoading(false); }).catch(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const toggleReveal = async (k) => {
    if (reveal[k] !== undefined) { setReveal({ ...reveal, [k]: undefined }); return; }
    try {
      const r = await adminRevealIntegration(k);
      setReveal({ ...reveal, [k]: r.value });
    } catch { toast.error('Failed to reveal'); }
  };
  const save = async (k) => {
    const v = drafts[k];
    if (v === undefined) return;
    setSaving(k);
    try {
      await adminSaveIntegration(k, v);
      toast.success('Saved');
      setDrafts(d => { const nd = { ...d }; delete nd[k]; return nd; });
      setReveal(r => { const nr = { ...r }; delete nr[k]; return nr; });
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Save failed'); }
    finally { setSaving(null); }
  };
  const clear = async (k) => {
    if (!window.confirm('Clear this value?')) return;
    try {
      await adminClearIntegration(k);
      toast.success('Cleared');
      setDrafts(d => { const nd = { ...d }; delete nd[k]; return nd; });
      setReveal(r => { const nr = { ...r }; delete nr[k]; return nr; });
      load();
    } catch { toast.error('Failed'); }
  };

  const status = (s) => s === 'configured' ? { cls: 'bg-emerald-50 text-emerald-700', icon: ShieldCheck, label: 'Live' }
    : s === 'saved_not_connected' ? { cls: 'bg-amber-50 text-amber-700', icon: AlertCircle, label: 'Saved · not yet connected' }
    : s === 'partial' ? { cls: 'bg-amber-50 text-amber-700', icon: AlertCircle, label: 'Partial' }
    : { cls: 'bg-neutral-100 text-neutral-500', icon: MinusCircle, label: 'Not connected' };

  if (loading) return <div className="py-16 text-center text-neutral-500">Loading integrations…</div>;

  return (
    <div data-testid="integrations-hub">
      <div className="mb-8">
        <h1 className="font-serif-display text-4xl flex items-center gap-3"><Puzzle className="w-8 h-8 text-[#B4593F]" /> Integrations Hub</h1>
        <p className="text-sm text-neutral-600 mt-2 max-w-2xl">One place for every third-party API key. Values stored here override `.env`. Anything left blank stays switched off — fill in real keys to go live per integration, at your own pace.</p>
      </div>

      <div className="space-y-5">
        {sections.map((s, i) => {
          const st = status(s.status);
          const StI = st.icon;
          return (
            <div key={i} className="bg-white rounded-2xl border border-[#EBD9CE] overflow-hidden" data-testid={`integration-${s.category}-${i}`}>
              <div className="px-6 py-5 border-b border-[#EBD9CE] flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xl">{catIcon[s.category] || '🔌'}</span>
                    <h3 className="font-serif-display text-2xl">{s.label}</h3>
                    <span className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest px-2 py-1 rounded-full ${st.cls}`}>
                      <StI className="w-3 h-3" /> {st.label}
                    </span>
                    <span className="text-[10px] text-neutral-500">{s.filled}/{s.total} fields</span>
                  </div>
                  {s.description && <p className="text-xs text-neutral-600 mt-2 leading-relaxed max-w-2xl">{s.description}</p>}
                </div>
                {s.docs_url && (
                  <a href={s.docs_url} target="_blank" rel="noreferrer" className="shrink-0 text-xs text-[#B4593F] hover:underline inline-flex items-center gap-1 whitespace-nowrap">
                    Docs <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <div className="divide-y divide-[#EBD9CE]">
                {s.fields.map(f => {
                  const draft = drafts[f.key];
                  const isDirty = draft !== undefined;
                  const revealed = reveal[f.key];
                  const displayVal = isDirty ? draft : (revealed !== undefined ? revealed : (f.secret ? f.display_value : (f.display_value || '')));
                  return (
                    <div key={f.key} className="px-6 py-4 md:flex md:items-center gap-4">
                      <div className="md:w-64 shrink-0 mb-2 md:mb-0">
                        <div className="text-sm">{f.label}</div>
                        <div className="text-[10px] text-neutral-500 font-mono">{f.key}</div>
                        {f.source !== 'none' && !isDirty && <div className="text-[10px] text-neutral-400 mt-0.5">from {f.source}</div>}
                      </div>
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type={f.secret && !revealed && !isDirty ? 'password' : 'text'}
                          placeholder={f.placeholder}
                          value={isDirty ? draft : (revealed !== undefined ? revealed : (f.secret ? '' : (f.display_value || '')))}
                          onChange={e => setDrafts({ ...drafts, [f.key]: e.target.value })}
                          data-testid={`integration-input-${f.key}`}
                          className="flex-1 bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2 text-sm font-mono outline-none focus:border-[#B4593F]"
                        />
                        {f.secret && f.has_value && !isDirty && (
                          <button onClick={() => toggleReveal(f.key)} className="p-2 rounded-full hover:bg-[#FDF3EB]" title={revealed ? 'Hide' : 'Reveal'}>
                            {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        )}
                        {f.secret && !f.has_value && !isDirty && (
                          <span className="text-[10px] uppercase tracking-widest text-neutral-400 mr-1">{f.display_value || 'not set'}</span>
                        )}
                        <button
                          onClick={() => save(f.key)}
                          disabled={!isDirty || saving === f.key}
                          data-testid={`save-${f.key}`}
                          className={`inline-flex items-center gap-1 text-xs uppercase tracking-widest px-3 py-2 rounded-full transition-colors ${isDirty ? 'bg-[#213a60] hover:bg-[#B4593F] text-white' : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'}`}
                        >
                          <Save className="w-3 h-3" /> {saving === f.key ? '…' : 'Save'}
                        </button>
                        {isDirty && (
                          <button onClick={() => setDrafts(d => { const nd = { ...d }; delete nd[f.key]; return nd; })} className="p-2 rounded-full hover:bg-[#FDF3EB]" title="Discard"><X className="w-4 h-4" /></button>
                        )}
                        {f.has_value && !isDirty && f.source === 'db' && (
                          <button onClick={() => clear(f.key)} className="p-2 rounded-full hover:bg-rose-50" title="Clear"><RotateCcw className="w-4 h-4 text-rose-600" /></button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminIntegrations;
