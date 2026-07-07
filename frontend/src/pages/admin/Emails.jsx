import React, { useEffect, useState } from 'react';
import { adminListEmails, adminGetEmail } from '../../lib/api';
import { Mail, X, Info, Search } from 'lucide-react';

const TEMPLATES = [
  { id: '', label: 'All' },
  { id: 'order_placed', label: 'Order Placed' },
  { id: 'order_paid', label: 'Order Paid' },
  { id: 'order_shipped', label: 'Order Shipped' },
  { id: 'order_refunded', label: 'Refund' },
  { id: 'abandoned_cart', label: 'Abandoned Cart' },
];

const templateColors = {
  order_placed: 'bg-blue-50 text-blue-700',
  order_paid: 'bg-emerald-50 text-emerald-700',
  order_shipped: 'bg-amber-50 text-amber-700',
  order_refunded: 'bg-rose-50 text-rose-700',
  abandoned_cart: 'bg-purple-50 text-purple-700',
};

const AdminEmails = () => {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('');
  const [q, setQ] = useState('');
  const [preview, setPreview] = useState(null);

  const load = () => adminListEmails(filter || undefined).then(setItems).catch(() => setItems([]));
  useEffect(() => { load(); }, [filter]);

  const openPreview = async (e) => {
    const full = await adminGetEmail(e.id);
    setPreview(full);
  };

  const filtered = items.filter(e => !q || e.to.toLowerCase().includes(q.toLowerCase()) || e.subject.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <div className="flex items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="font-serif-display text-4xl">Email Outbox</h1>
          <p className="text-sm text-neutral-600 mt-1">{items.length} emails · all MOCKED (written to DB, not delivered)</p>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search recipient / subject" className="pl-10 pr-4 py-2.5 bg-white border border-[#EBD9CE] rounded-full text-sm outline-none focus:border-[#B4593F] w-72" />
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {TEMPLATES.map(t => (
          <button key={t.id} onClick={() => setFilter(t.id)} className={`text-xs uppercase tracking-widest px-4 py-2 rounded-full transition-colors ${filter === t.id ? 'bg-[#1A1A1A] text-white' : 'bg-white border border-[#EBD9CE] hover:border-[#B4593F]'}`}>{t.label}</button>
        ))}
      </div>

      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-4 mb-4 text-sm flex items-start gap-3">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <div>All emails are <strong>MOCKED</strong> — stored in the database with rendered HTML so you can preview exactly what customers would see. Provide Gmail SMTP credentials (or OAuth) in backend .env and switch <code>provider='gmail'</code> to enable delivery.</div>
      </div>

      <div className="bg-white rounded-xl border border-[#EBD9CE] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#FDF3EB] text-[11px] uppercase tracking-widest text-neutral-600">
            <tr><th className="text-left px-6 py-3">Recipient</th><th className="text-left px-6 py-3">Subject</th><th className="text-left px-6 py-3">Type</th><th className="text-left px-6 py-3">Status</th><th className="text-left px-6 py-3">Created</th><th /></tr>
          </thead>
          <tbody className="divide-y divide-[#EBD9CE]">
            {filtered.length === 0 ? <tr><td colSpan="6" className="px-6 py-10 text-center text-neutral-500">No emails yet</td></tr> : filtered.map(e => (
              <tr key={e.id} className="hover:bg-[#FDF3EB]/50 cursor-pointer" onClick={() => openPreview(e)}>
                <td className="px-6 py-3 flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-[#B4593F]" /> {e.to}</td>
                <td className="px-6 py-3">{e.subject}</td>
                <td className="px-6 py-3"><span className={`text-[10px] uppercase px-2 py-1 rounded ${templateColors[e.template] || 'bg-neutral-100 text-neutral-600'}`}>{e.template.replace('_',' ')}</span></td>
                <td className="px-6 py-3"><span className="text-[10px] uppercase tracking-widest bg-yellow-50 text-yellow-800 px-2 py-0.5 rounded">{e.status}</span></td>
                <td className="px-6 py-3 text-xs text-neutral-500">{new Date(e.created_at).toLocaleString()}</td>
                <td className="px-6 py-3 text-right"><button className="text-xs text-[#B4593F]">Preview</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {preview && (
        <>
          <div onClick={() => setPreview(null)} className="fixed inset-0 bg-black/60 z-50" />
          <div className="fixed inset-4 md:inset-10 z-50 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-[#EBD9CE] flex items-center justify-between shrink-0">
              <div>
                <div className="font-serif-display text-xl">{preview.subject}</div>
                <div className="text-xs text-neutral-500 mt-0.5">To: {preview.to} · Template: {preview.template} · {new Date(preview.created_at).toLocaleString()}</div>
              </div>
              <button onClick={() => setPreview(null)}><X className="w-5 h-5" /></button>
            </div>
            <iframe title="email preview" srcDoc={preview.html} className="flex-1 w-full border-0 bg-white" />
          </div>
        </>
      )}
    </div>
  );
};

export default AdminEmails;
