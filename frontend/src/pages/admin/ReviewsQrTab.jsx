import React, { useEffect, useState } from 'react';
import { adminGenerateQr, adminListQrTokens, adminDeleteQrToken, qrImageUrl, adminListProducts, adminGetGenericQr, genericQrImageUrl } from '../../lib/api';
import { toast } from 'sonner';
import { QrCode, Plus, Trash2, Copy, Check, Download, X, ExternalLink, Share2 } from 'lucide-react';

const ReviewsQrTab = () => {
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ customer_name: '', customer_email: '', order_number: '', product_id: '', expires_days: 90 });
  const [copiedTok, setCopiedTok] = useState('');
  const [preview, setPreview] = useState(null);
  const [genericQr, setGenericQr] = useState(null);

  const load = () => adminListQrTokens().then(setItems).catch(() => setItems([]));
  useEffect(() => {
    load();
    adminListProducts().then(setProducts).catch(() => setProducts([]));
    adminGetGenericQr().then(setGenericQr).catch(() => setGenericQr(null));
  }, []);

  const generate = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, expires_days: parseInt(form.expires_days || 90, 10) };
      Object.keys(payload).forEach(k => { if (payload[k] === '' || payload[k] === null) delete payload[k]; });
      const res = await adminGenerateQr(payload);
      toast.success('QR generated');
      setCreating(false);
      setForm({ customer_name: '', customer_email: '', order_number: '', product_id: '', expires_days: 90 });
      setPreview(res);
      load();
    } catch (e2) { toast.error(e2?.response?.data?.detail || 'Failed'); }
  };

  const copy = async (tok, url) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedTok(tok);
      setTimeout(() => setCopiedTok(''), 1500);
    } catch { toast.error('Copy failed'); }
  };

  const del = async (tok) => {
    if (!window.confirm('Revoke this QR code?')) return;
    try { await adminDeleteQrToken(tok); toast.success('Revoked'); load(); } catch { toast.error('Failed'); }
  };

  return (
    <div>
      {genericQr && (
        <div className="bg-gradient-to-br from-[#FDF3EB] to-white border border-[#EBD9CE] rounded-2xl p-6 mb-6" data-testid="generic-qr-card">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="bg-white p-3 rounded-xl border border-[#EBD9CE] shrink-0">
              <img src={genericQrImageUrl()} alt="Generic review QR" className="w-32 h-32" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] uppercase tracking-[0.3em] text-[#B4593F] mb-2 inline-flex items-center gap-2"><Share2 className="w-3.5 h-3.5" /> Public / shareable</div>
              <h3 className="font-serif-display text-2xl">One QR for everyone</h3>
              <p className="text-sm text-neutral-700 mt-2 max-w-lg leading-relaxed">{genericQr.description}</p>
              <div className="mt-3 text-[11px] text-neutral-500 font-mono break-all">{genericQr.review_url}</div>
              <div className="mt-4 flex flex-wrap gap-2">
                <a href={genericQrImageUrl()} download="wth-review-qr.png" data-testid="generic-qr-download" className="inline-flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#B4593F] text-white text-xs uppercase tracking-widest px-5 py-2.5 rounded-full transition-colors">
                  <Download className="w-3.5 h-3.5" /> Download PNG
                </a>
                <button onClick={() => copy('generic', genericQr.review_url)} className="inline-flex items-center gap-2 bg-white border border-[#EBD9CE] hover:border-[#B4593F] text-xs uppercase tracking-widest px-5 py-2.5 rounded-full transition-colors">
                  {copiedTok === 'generic' ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy link</>}
                </button>
                <a href={genericQr.review_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-white border border-[#EBD9CE] hover:border-[#B4593F] text-xs uppercase tracking-widest px-5 py-2.5 rounded-full transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" /> Preview form
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#FDF3EB] border border-[#EBD9CE] rounded-xl p-4 mb-5 text-xs text-neutral-700 flex items-start gap-3">
        <QrCode className="w-4 h-4 text-[#B4593F] mt-0.5 shrink-0" />
        <div>
          Generate a QR code and send it to your customer (via WhatsApp, email, or printed on the packing slip). When they scan it, they land on a pre-filled review form. Each QR is single-use and expires after the days you set.
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-neutral-600">{items.length} QR code(s) generated · {items.filter(i => i.used).length} submitted · {items.filter(i => !i.used).length} pending</div>
        <button onClick={() => setCreating(true)} data-testid="gen-qr-btn" className="inline-flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#B4593F] text-white text-xs uppercase tracking-widest px-5 py-2.5 rounded-full">
          <Plus className="w-3.5 h-3.5" /> Generate QR
        </button>
      </div>

      <div className="bg-white rounded-xl border border-[#EBD9CE] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#FDF3EB] text-[11px] uppercase tracking-widest text-neutral-600">
            <tr>
              <th className="text-left px-6 py-3">Customer</th>
              <th className="text-left px-6 py-3">Order / Product</th>
              <th className="text-left px-6 py-3">Status</th>
              <th className="text-left px-6 py-3">Expires</th>
              <th className="text-left px-6 py-3">Link</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EBD9CE]">
            {items.length === 0 && <tr><td colSpan="6" className="px-6 py-10 text-center text-neutral-500">No QR codes yet — generate one above.</td></tr>}
            {items.map(t => (
              <tr key={t.token} className="hover:bg-[#FDF3EB]/50" data-testid={`qr-row-${t.token}`}>
                <td className="px-6 py-3">
                  <div className="text-sm">{t.customer_name || '—'}</div>
                  <div className="text-[11px] text-neutral-500">{t.customer_email || ''}</div>
                </td>
                <td className="px-6 py-3 text-xs text-neutral-600">
                  {t.order_number && <div>Order: {t.order_number}</div>}
                  {t.product_id && <div>Product: {products.find(p => p.id === t.product_id)?.name || t.product_id}</div>}
                  {!t.order_number && !t.product_id && '—'}
                </td>
                <td className="px-6 py-3">
                  {t.used ? (
                    <span className="text-[10px] uppercase tracking-widest bg-emerald-50 text-emerald-700 px-2 py-1 rounded inline-flex items-center gap-1"><Check className="w-3 h-3" /> Submitted</span>
                  ) : (
                    <span className="text-[10px] uppercase tracking-widest bg-amber-50 text-amber-700 px-2 py-1 rounded">Pending</span>
                  )}
                </td>
                <td className="px-6 py-3 text-xs text-neutral-500">{t.expires_at ? new Date(t.expires_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                <td className="px-6 py-3">
                  <button onClick={() => copy(t.token, t.review_url)} className="text-xs text-[#B4593F] hover:underline inline-flex items-center gap-1">
                    {copiedTok === t.token ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy link</>}
                  </button>
                </td>
                <td className="px-6 py-3 text-right whitespace-nowrap">
                  <button onClick={() => setPreview({ token: t.token, review_url: t.review_url, customer_name: t.customer_name })} className="p-2 rounded-full hover:bg-[#FDF3EB]" title="View QR"><QrCode className="w-4 h-4" /></button>
                  <button onClick={() => del(t.token)} className="p-2 rounded-full hover:bg-rose-50" title="Revoke"><Trash2 className="w-4 h-4 text-rose-600" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {creating && (
        <>
          <div onClick={() => setCreating(false)} className="fixed inset-0 bg-black/50 z-50" />
          <aside className="fixed top-0 right-0 h-full w-full sm:w-[500px] bg-white z-50 overflow-y-auto shadow-2xl">
            <div className="px-6 py-5 border-b border-[#EBD9CE] flex items-center justify-between">
              <h3 className="font-serif-display text-2xl flex items-center gap-2"><QrCode className="w-5 h-5" /> New QR Code</h3>
              <button onClick={() => setCreating(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={generate} className="px-6 py-5 space-y-4 text-sm">
              <F label="Customer name (optional)"><input value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} className="input" placeholder="Anita Sharma" data-testid="qr-cust-name" /></F>
              <F label="Customer email (optional)"><input type="email" value={form.customer_email} onChange={e => setForm({ ...form, customer_email: e.target.value })} className="input" placeholder="anita@example.com" /></F>
              <F label="Order number (optional)"><input value={form.order_number} onChange={e => setForm({ ...form, order_number: e.target.value })} className="input" placeholder="WTH-20250207-XXXXX" /></F>
              <F label="Product (optional — pre-fills the form)">
                <select value={form.product_id} onChange={e => setForm({ ...form, product_id: e.target.value })} className="input">
                  <option value="">— none —</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </F>
              <F label="Expires in (days)"><input type="number" min="1" value={form.expires_days} onChange={e => setForm({ ...form, expires_days: e.target.value })} className="input" /></F>
              <div className="pt-2 flex gap-3">
                <button type="submit" data-testid="qr-submit-btn" className="flex-1 bg-[#1A1A1A] hover:bg-[#B4593F] text-white text-xs uppercase tracking-widest px-6 py-2.5 rounded-full">Generate</button>
                <button type="button" onClick={() => setCreating(false)} className="px-6 py-2.5 border border-[#EBD9CE] rounded-full text-xs uppercase tracking-widest">Cancel</button>
              </div>
            </form>
          </aside>
        </>
      )}

      {preview && (
        <>
          <div onClick={() => setPreview(null)} className="fixed inset-0 bg-black/60 z-50" />
          <div className="fixed inset-x-4 top-16 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[440px] z-50 bg-white rounded-2xl shadow-2xl overflow-hidden" data-testid="qr-preview-modal">
            <div className="px-6 py-4 border-b border-[#EBD9CE] flex items-center justify-between">
              <h3 className="font-serif-display text-xl">Scan me to review</h3>
              <button onClick={() => setPreview(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 text-center">
              {preview.customer_name && <div className="text-sm text-neutral-600 mb-4">For <strong>{preview.customer_name}</strong></div>}
              <div className="inline-block bg-white p-4 rounded-xl border border-[#EBD9CE]">
                <img src={qrImageUrl(preview.token)} alt="QR code" className="w-64 h-64" />
              </div>
              <div className="mt-4 text-xs text-neutral-500 break-all">{preview.review_url}</div>
              <div className="mt-5 flex gap-2 justify-center">
                <a
                  href={qrImageUrl(preview.token)}
                  download={`wth-qr-${preview.token}.png`}
                  className="inline-flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#B4593F] text-white text-xs uppercase tracking-widest px-5 py-2.5 rounded-full transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Download PNG
                </a>
                <button
                  onClick={() => copy(preview.token, preview.review_url)}
                  className="inline-flex items-center gap-2 bg-white border border-[#EBD9CE] hover:border-[#B4593F] text-xs uppercase tracking-widest px-5 py-2.5 rounded-full transition-colors"
                >
                  {copiedTok === preview.token ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy link</>}
                </button>
                <a href={preview.review_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-white border border-[#EBD9CE] hover:border-[#B4593F] text-xs uppercase tracking-widest px-5 py-2.5 rounded-full transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" /> Preview
                </a>
              </div>
            </div>
          </div>
        </>
      )}
      <style>{`.input { width:100%; background:#FDF3EB; border:1px solid #EBD9CE; border-radius:9999px; padding:8px 16px; outline:none; font-size:14px; }
        .input:focus { border-color:#B4593F; }`}</style>
    </div>
  );
};

const F = ({ label, children }) => (
  <label className="block">
    <span className="text-[11px] uppercase tracking-widest text-neutral-500 block mb-1">{label}</span>
    {children}
  </label>
);

export default ReviewsQrTab;
