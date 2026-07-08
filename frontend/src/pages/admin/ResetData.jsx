import React, { useEffect, useMemo, useState } from 'react';
import { adminListResetTargets, adminResetData } from '../../lib/api';
import { toast } from 'sonner';
import { AlertTriangle, Trash2, ShieldCheck } from 'lucide-react';

const LABELS = {
  orders: { title: 'Orders & abandoned carts', desc: 'All customer orders and unfinished checkouts.' },
  products: { title: 'Products', desc: 'The entire product catalogue.' },
  reviews: { title: 'Reviews & QR tokens', desc: 'Customer reviews and generated QR review tokens.' },
  blog: { title: 'Blog posts', desc: 'All journal / blog articles.' },
  collections: { title: 'Collections', desc: 'Curated product collections.' },
  categories: { title: 'Categories', desc: 'Product categories (Note: seed will re-add defaults on next restart).' },
  instagram: { title: 'Instagram posts', desc: 'Curated Instagram feed items.' },
  newsletter: { title: 'Newsletter subscribers', desc: 'Email list subscribers.' },
  emails: { title: 'Email outbox', desc: 'Sent / queued transactional email log.' },
  analytics: { title: 'Analytics events', desc: 'Page-view and conversion event log.' },
  locations: { title: 'Locations & Google Business', desc: 'Store locations and Google Business Profile links.' },
  shipping_rules: { title: 'Shipping rules & tax rates', desc: 'Configured shipping options and tax slabs.' },
  coupons: { title: 'Coupons', desc: 'All discount coupons.' },
  images: { title: 'Uploaded images (GridFS)', desc: 'Files stored via the image pipeline. Removing here breaks references from any surviving product/blog.' },
  seo: { title: 'SEO overrides & redirects', desc: 'Per-path SEO meta and URL redirects.' },
};

const PRESERVED = [
  'Admin users & sessions (you stay logged in)',
  'Site content / CMS strings (all your Design tab edits)',
  'Settings & integrations (payment keys, SMTP, etc.)',
];

const AdminResetData = () => {
  const [targets, setTargets] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [confirm, setConfirm] = useState('');
  const [resetting, setResetting] = useState(false);

  const load = () => adminListResetTargets().then(setTargets).catch(() => setTargets([]));
  useEffect(() => { load(); }, []);

  const totalSelected = useMemo(
    () => targets.filter(t => selected.has(t.key)).reduce((sum, t) => sum + (t.count || 0), 0),
    [targets, selected],
  );

  const toggle = (key) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(targets.map(t => t.key)));
  const clearAll = () => setSelected(new Set());

  const canReset = selected.size > 0 && confirm === 'RESET' && !resetting;

  const doReset = async () => {
    if (!canReset) return;
    setResetting(true);
    try {
      const res = await adminResetData(Array.from(selected), 'RESET');
      const totalDeleted = Object.values(res.cleared).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
      toast.success(`Cleared ${totalDeleted} documents across ${Object.keys(res.cleared).length} collections`);
      setSelected(new Set());
      setConfirm('');
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Reset failed');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="font-serif-display text-4xl" data-testid="reset-data-title">Reset store data</h1>
        <p className="text-sm text-neutral-600 mt-2">
          Wipe seeded/test data before you go live. Pick the collections to clear, type <strong>RESET</strong>, then confirm.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-300 rounded-xl p-5 mb-6 flex gap-3" data-testid="reset-data-warning">
        <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-900">
          <div className="font-semibold mb-1">This action is destructive and cannot be undone.</div>
          <div>Take a backup of your MongoDB before running this in production.</div>
        </div>
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mb-6 flex gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
        <div className="text-sm text-emerald-900">
          <div className="font-semibold mb-1">Always preserved (never wiped):</div>
          <ul className="list-disc list-inside space-y-0.5">
            {PRESERVED.map(p => <li key={p}>{p}</li>)}
          </ul>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="text-xs uppercase tracking-widest text-neutral-500">Select collections to clear</div>
        <div className="flex gap-2">
          <button onClick={selectAll} className="text-[11px] uppercase tracking-widest text-[#B4593F] hover:underline" data-testid="reset-select-all">Select all</button>
          <span className="text-neutral-300">·</span>
          <button onClick={clearAll} className="text-[11px] uppercase tracking-widest text-neutral-600 hover:underline" data-testid="reset-clear-all">Clear</button>
        </div>
      </div>

      <div className="space-y-2 mb-8">
        {targets.map(t => {
          const meta = LABELS[t.key] || { title: t.key, desc: t.collections.join(', ') };
          const active = selected.has(t.key);
          return (
            <label
              key={t.key}
              className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${active ? 'border-rose-400 bg-rose-50/50' : 'border-[#EBD9CE] bg-white hover:border-[#B4593F]/60'}`}
              data-testid={`reset-target-${t.key}`}
            >
              <input
                type="checkbox"
                checked={active}
                onChange={() => toggle(t.key)}
                className="mt-1 accent-rose-600"
                data-testid={`reset-target-checkbox-${t.key}`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium">{meta.title}</div>
                  <div className="text-[11px] uppercase tracking-widest text-neutral-500 whitespace-nowrap">{t.count} docs</div>
                </div>
                <div className="text-xs text-neutral-500 mt-0.5">{meta.desc}</div>
              </div>
            </label>
          );
        })}
      </div>

      <div className="bg-white border border-[#EBD9CE] rounded-xl p-5">
        <div className="text-sm text-neutral-700 mb-3">
          You are about to permanently delete <strong className="text-rose-600">{totalSelected}</strong> documents across{' '}
          <strong>{selected.size}</strong> target{selected.size === 1 ? '' : 's'}.
        </div>
        <label className="block mb-4">
          <div className="text-[11px] uppercase tracking-widest text-neutral-500 mb-1.5">Type <code className="bg-rose-50 px-1 rounded">RESET</code> to confirm</div>
          <input
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="RESET"
            className="w-full max-w-xs bg-white border border-[#EBD9CE] rounded-lg px-3 py-2.5 text-sm font-mono"
            data-testid="reset-confirm-input"
          />
        </label>
        <button
          onClick={doReset}
          disabled={!canReset}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-widest bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-full transition-colors"
          data-testid="reset-confirm-btn"
        >
          <Trash2 className="w-3.5 h-3.5" /> {resetting ? 'Clearing…' : 'Clear selected data permanently'}
        </button>
      </div>
    </div>
  );
};

export default AdminResetData;
