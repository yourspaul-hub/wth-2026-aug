import React, { useEffect, useState } from 'react';
import { adminListAbandonedCarts, adminSendRecovery } from '../../lib/api';
import { toast } from 'sonner';
import { Mail, ShoppingBag, Clock, CheckCircle2, Send } from 'lucide-react';

const AdminAbandonedCarts = () => {
  const [data, setData] = useState({ stale: [], all: [] });
  const [tab, setTab] = useState('stale');

  const load = () => adminListAbandonedCarts().then(setData).catch(() => setData({ stale: [], all: [] }));
  useEffect(() => { load(); }, []);

  const doSend = async (c) => {
    if (!window.confirm(`Send recovery email to ${c.email}?`)) return;
    try { await adminSendRecovery(c.id); toast.success('Recovery email queued (mocked)'); load(); }
    catch { toast.error('Failed'); }
  };

  const list = tab === 'stale' ? data.stale : data.all;

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-serif-display text-4xl">Abandoned Carts</h1>
          <p className="text-sm text-neutral-600 mt-1">{data.stale.length} stale (≥30 min old) · {data.all.length} total</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab('stale')} className={`text-xs uppercase tracking-widest px-4 py-2 rounded-full ${tab === 'stale' ? 'bg-[#213a60] text-white' : 'bg-white border border-[#EBD9CE]'}`}>Stale</button>
          <button onClick={() => setTab('all')} className={`text-xs uppercase tracking-widest px-4 py-2 rounded-full ${tab === 'all' ? 'bg-[#213a60] text-white' : 'bg-white border border-[#EBD9CE]'}`}>All</button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {list.length === 0 ? (
          <div className="md:col-span-2 text-center py-16 text-neutral-500">
            <ShoppingBag className="w-8 h-8 mx-auto mb-3 text-[#B4593F]/50" />
            No abandoned carts here.
          </div>
        ) : list.map(c => (
          <div key={c.id} className="bg-white rounded-xl border border-[#EBD9CE] p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium"><Mail className="w-3.5 h-3.5 text-[#B4593F]" /> {c.email}</div>
                <div className="text-xs text-neutral-500 mt-0.5">{c.name || 'Guest'} · {c.items?.length || 0} items</div>
                <div className="text-xs text-neutral-500 mt-0.5 inline-flex items-center gap-1"><Clock className="w-3 h-3" /> Updated {new Date(c.updated_at).toLocaleString()}</div>
              </div>
              <div className="text-lg font-serif-display text-[#B4593F]">₹{(c.subtotal || 0).toLocaleString('en-IN')}</div>
            </div>
            <div className="mt-3 space-y-1">
              {(c.items || []).slice(0, 3).map((it, i) => (
                <div key={i} className="flex items-center gap-2 text-xs"><img src={it.image} alt="" className="w-8 h-8 rounded object-cover" /> <span className="flex-1 line-clamp-1">{it.name}</span> <span className="text-neutral-500">×{it.qty}</span></div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2">
              {c.recovered ? (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full"><CheckCircle2 className="w-3 h-3" /> Recovered</span>
              ) : c.recovery_email_sent ? (
                <span className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full"><Send className="w-3 h-3" /> Recovery sent</span>
              ) : (
                <button onClick={() => doSend(c)} className="inline-flex items-center gap-2 text-xs uppercase tracking-widest bg-[#213a60] hover:bg-[#B4593F] text-white px-4 py-2 rounded-full transition-colors"><Send className="w-3 h-3" /> Send Recovery Email</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminAbandonedCarts;
