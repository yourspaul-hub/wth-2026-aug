import React, { useEffect, useState } from 'react';
import { adminListRedirects, adminCreateRedirect, adminUpdateRedirect, adminDeleteRedirect } from '../../lib/api';
import { toast } from 'sonner';
import { Plus, Trash2, X, ArrowRight } from 'lucide-react';

const empty = { from_path: '', to_path: '', code: 301, active: true };

const AdminRedirects = () => {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);

  const load = () => adminListRedirects().then(setItems).catch(() => setItems([]));
  useEffect(() => { load(); }, []);

  const onSave = async () => {
    try {
      const p = { ...editing, code: +editing.code };
      if (editing.id) await adminUpdateRedirect(editing.id, p); else await adminCreateRedirect(p);
      toast.success('Redirect saved'); setEditing(null); load();
    } catch { toast.error('Save failed'); }
  };
  const onDelete = async (r) => {
    if (!window.confirm(`Delete redirect from ${r.from_path}?`)) return;
    await adminDeleteRedirect(r.id); toast.success('Deleted'); load();
  };

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-serif-display text-4xl">Redirects</h1>
          <p className="text-sm text-neutral-600 mt-1">Manage 301/302 redirects. Applied on client route change.</p>
        </div>
        <button onClick={() => setEditing({ ...empty })} className="inline-flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#B4593F] text-white px-5 py-2.5 rounded-full text-xs uppercase tracking-widest"><Plus className="w-4 h-4" /> New</button>
      </div>

      <div className="bg-white rounded-xl border border-[#EBD9CE] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#FDF3EB] text-[11px] uppercase tracking-widest text-neutral-600">
            <tr><th className="text-left px-6 py-3">From</th><th className="text-left px-6 py-3">To</th><th className="text-left px-6 py-3">Code</th><th className="text-left px-6 py-3">Active</th><th /></tr>
          </thead>
          <tbody className="divide-y divide-[#EBD9CE]">
            {items.length === 0 ? <tr><td colSpan="5" className="px-6 py-10 text-center text-neutral-500">No redirects yet</td></tr> : items.map(r => (
              <tr key={r.id} className="hover:bg-[#FDF3EB]/40">
                <td className="px-6 py-3 font-mono text-xs">{r.from_path}</td>
                <td className="px-6 py-3 font-mono text-xs text-[#B4593F] inline-flex items-center gap-1"><ArrowRight className="w-3 h-3" /> {r.to_path}</td>
                <td className="px-6 py-3">{r.code}</td>
                <td className="px-6 py-3"><span className={r.active ? 'text-green-600' : 'text-neutral-400'}>{r.active ? 'Active' : 'Off'}</span></td>
                <td className="px-6 py-3"><button onClick={() => onDelete(r)} className="text-xs border border-[#EBD9CE] px-3 py-1.5 rounded-full hover:border-red-500"><Trash2 className="w-3 h-3" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <>
          <div onClick={() => setEditing(null)} className="fixed inset-0 bg-black/50 z-50" />
          <aside className="fixed top-0 right-0 h-full w-full sm:w-[440px] bg-white z-50 overflow-y-auto shadow-2xl">
            <div className="px-6 py-5 border-b border-[#EBD9CE] flex items-center justify-between"><h3 className="font-serif-display text-2xl">New Redirect</h3><button onClick={() => setEditing(null)}><X className="w-5 h-5" /></button></div>
            <div className="px-6 py-5 space-y-4">
              <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">From path</span><input placeholder="/old-collection" value={editing.from_path} onChange={e => setEditing({ ...editing, from_path: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F] font-mono" /></label>
              <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">To path</span><input placeholder="/shop/clothing" value={editing.to_path} onChange={e => setEditing({ ...editing, to_path: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F] font-mono" /></label>
              <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Status code</span><select value={editing.code} onChange={e => setEditing({ ...editing, code: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]"><option value="301">301 - Permanent</option><option value="302">302 - Temporary</option></select></label>
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!editing.active} onChange={e => setEditing({ ...editing, active: e.target.checked })} /> <span className="text-sm">Active</span></label>
            </div>
            <div className="px-6 py-5 border-t border-[#EBD9CE] flex gap-3"><button onClick={onSave} className="flex-1 bg-[#1A1A1A] hover:bg-[#B4593F] text-white py-3 rounded-full text-xs uppercase tracking-widest">Save</button><button onClick={() => setEditing(null)} className="px-6 py-3 border border-[#EBD9CE] rounded-full text-xs uppercase tracking-widest">Cancel</button></div>
          </aside>
        </>
      )}
    </div>
  );
};

export default AdminRedirects;
