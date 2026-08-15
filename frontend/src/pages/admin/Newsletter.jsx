import React, { useEffect, useState } from 'react';
import { adminNewsletter, adminGetNewsletterSettings, adminUpdateNewsletterSettings } from '../../lib/api';
import { Download, Mail } from 'lucide-react';
import { toast } from 'sonner';

const AdminNewsletter = () => {
  const [subs, setSubs] = useState([]);
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    adminNewsletter().then(setSubs).catch(() => setSubs([]));
    adminGetNewsletterSettings().then(r => setEnabled(!!r?.enabled)).catch(() => setEnabled(false));
  }, []);

  const toggle = async (next) => {
    setSaving(true);
    try {
      const r = await adminUpdateNewsletterSettings({ enabled: next });
      setEnabled(!!r.enabled);
      toast.success(next ? 'Newsletter section now visible on the site' : 'Newsletter section hidden from the site');
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed');
    } finally { setSaving(false); }
  };

  const exportCsv = () => {
    const csv = 'email,subscribed_at\n' + subs.map(s => `${s.email},${s.created_at}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'newsletter-subscribers.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-serif-display text-4xl">Newsletter</h1>
          <p className="text-sm text-neutral-600 mt-1">{subs.length} subscribers</p>
        </div>
        <button onClick={exportCsv} className="inline-flex items-center gap-2 bg-[#213a60] hover:bg-[#B4593F] text-white px-5 py-2.5 rounded-full text-xs uppercase tracking-widest"><Download className="w-4 h-4" /> Export CSV</button>
      </div>

      {/* Enable / disable email capture on the storefront */}
      <div className="bg-white border border-[#EBD9CE] rounded-xl p-5 mb-6 flex items-center gap-4">
        <label className="flex items-center gap-3 cursor-pointer flex-1">
          <input
            type="checkbox"
            checked={enabled}
            disabled={saving}
            onChange={e => toggle(e.target.checked)}
            className="accent-[#B4593F] w-5 h-5"
            data-testid="newsletter-enabled-toggle"
          />
          <div>
            <div className="text-sm font-medium text-[#213a60]">Show "Join our journey of hope" newsletter section on the site</div>
            <div className="text-[11px] text-neutral-600 mt-0.5">
              {enabled
                ? 'Currently visible on the storefront footer. Uncheck to hide immediately.'
                : "Hidden from the storefront. Turn on when you're ready to start collecting emails."}
            </div>
          </div>
        </label>
        <span className={`text-[10px] uppercase tracking-widest px-3 py-1 rounded-full ${enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>
          {enabled ? 'Enabled' : 'Disabled'}
        </span>
      </div>

      <div className="bg-white rounded-xl border border-[#EBD9CE] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#FDF3EB] text-[11px] uppercase tracking-widest text-neutral-600">
            <tr><th className="text-left px-6 py-3">Email</th><th className="text-left px-6 py-3">Subscribed</th></tr>
          </thead>
          <tbody className="divide-y divide-[#EBD9CE]">
            {subs.length === 0 ? <tr><td colSpan="2" className="px-6 py-10 text-center text-neutral-500">No subscribers yet</td></tr> : subs.map((s, i) => (
              <tr key={i} className="hover:bg-[#FDF3EB]/40">
                <td className="px-6 py-3 inline-flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-[#B4593F]" /> {s.email}</td>
                <td className="px-6 py-3 text-xs text-neutral-500">{new Date(s.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminNewsletter;
