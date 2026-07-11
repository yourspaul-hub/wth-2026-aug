import React, { useEffect, useState } from 'react';
import { adminListUsers, adminInviteUser, adminUpdateUser, adminDeleteUser, adminListRoles } from '../../lib/api';
import { toast } from 'sonner';
import { Users, Plus, Trash2, Edit3, X, Shield, Package, FileText, Mail } from 'lucide-react';

const roleIcon = { admin: Shield, store_manager: Package, blogger: FileText };
const roleColor = { admin: 'bg-[#B4593F] text-white', store_manager: 'bg-emerald-100 text-emerald-800', blogger: 'bg-sky-100 text-sky-800' };

const AdminUsers = () => {
  const [items, setItems] = useState([]);
  const [roles, setRoles] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ email: '', name: '', role: 'store_manager' });

  const load = () => adminListUsers().then(setItems).catch(() => setItems([]));
  useEffect(() => {
    load();
    adminListRoles().then(d => setRoles(d.roles)).catch(() => setRoles([]));
  }, []);

  const invite = async (e) => {
    e.preventDefault();
    try {
      await adminInviteUser(form);
      toast.success(`Invited ${form.email} as ${form.role}`);
      setEditing(null); setForm({ email: '', name: '', role: 'store_manager' });
      load();
    } catch (er) { toast.error(er?.response?.data?.detail || 'Invite failed'); }
  };
  const changeRole = async (u, role) => {
    try {
      const updated = await adminUpdateUser(u.user_id, { role });
      setItems(items.map(x => x.user_id === u.user_id ? updated : x));
      toast.success('Role updated');
    } catch (er) { toast.error(er?.response?.data?.detail || 'Failed'); }
  };
  const del = async (u) => {
    if (!window.confirm(`Remove ${u.email}? Their sessions will be revoked immediately.`)) return;
    try { await adminDeleteUser(u.user_id); toast.success('Removed'); load(); }
    catch (er) { toast.error(er?.response?.data?.detail || 'Failed'); }
  };

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-serif-display text-4xl">Team & Access</h1>
          <p className="text-sm text-neutral-600 mt-1">{items.length} team member(s) · role-based access to admin panel</p>
        </div>
        <button onClick={() => setEditing('new')} data-testid="invite-user-btn" className="inline-flex items-center gap-2 bg-[#213a60] hover:bg-[#B4593F] text-white text-xs uppercase tracking-widest px-5 py-2.5 rounded-full">
          <Plus className="w-3.5 h-3.5" /> Invite User
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {roles.map(r => {
          const I = roleIcon[r.key] || Shield;
          return (
            <div key={r.key} className="bg-white rounded-xl border border-[#EBD9CE] p-5">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${roleColor[r.key] || 'bg-neutral-100'}`}>
                <I className="w-5 h-5" />
              </div>
              <div className="font-serif-display text-xl">{r.label}</div>
              <p className="text-xs text-neutral-600 mt-1 leading-relaxed">{r.description}</p>
              <div className="mt-2 text-[10px] text-neutral-500">{items.filter(u => u.role === r.key).length} user(s)</div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-[#EBD9CE] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#FDF3EB] text-[11px] uppercase tracking-widest text-neutral-600">
            <tr><th className="text-left px-6 py-3">User</th><th className="text-left px-6 py-3">Role</th><th className="text-left px-6 py-3">Invited</th><th /></tr>
          </thead>
          <tbody className="divide-y divide-[#EBD9CE]">
            {items.length === 0 ? <tr><td colSpan="4" className="px-6 py-10 text-center text-neutral-500">No users yet — invite one above.</td></tr> : items.map(u => (
              <tr key={u.user_id} data-testid={`user-row-${u.user_id}`} className="hover:bg-[#FDF3EB]/50">
                <td className="px-6 py-3">
                  <div className="flex items-center gap-3">
                    {u.picture ? <img src={u.picture} alt="" className="w-9 h-9 rounded-full object-cover" /> : <div className="w-9 h-9 rounded-full bg-[#FDF3EB] flex items-center justify-center text-[#B4593F] font-semibold">{u.name?.[0]?.toUpperCase() || '?'}</div>}
                    <div>
                      <div className="font-medium">{u.name}</div>
                      <div className="text-[11px] text-neutral-500 inline-flex items-center gap-1"><Mail className="w-3 h-3" /> {u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-3">
                  <select value={u.role} onChange={e => changeRole(u, e.target.value)} className={`text-[11px] uppercase tracking-widest px-3 py-1.5 rounded-full outline-none border border-[#EBD9CE] ${roleColor[u.role] || ''}`}>
                    {roles.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                  </select>
                </td>
                <td className="px-6 py-3 text-xs text-neutral-500">{u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                <td className="px-6 py-3 text-right">
                  <button onClick={() => del(u)} className="p-2 rounded-full hover:bg-rose-50"><Trash2 className="w-4 h-4 text-rose-600" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing === 'new' && (
        <>
          <div onClick={() => setEditing(null)} className="fixed inset-0 bg-black/50 z-50" />
          <aside className="fixed top-0 right-0 h-full w-full sm:w-[480px] bg-white z-50 shadow-2xl overflow-y-auto">
            <div className="px-6 py-5 border-b border-[#EBD9CE] flex items-center justify-between">
              <h3 className="font-serif-display text-2xl flex items-center gap-2"><Users className="w-5 h-5" /> Invite Team Member</h3>
              <button onClick={() => setEditing(null)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={invite} className="px-6 py-5 space-y-4 text-sm">
              <div className="text-xs text-neutral-600 bg-[#FDF3EB] border border-[#EBD9CE] rounded-lg p-3">
                They'll be able to sign in with their Google account. Access is scoped to their role — you can change or revoke it anytime.
              </div>
              <F label="Email *"><input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input" placeholder="teammate@yourbrand.com" data-testid="invite-email" /></F>
              <F label="Name (optional)"><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input" /></F>
              <F label="Role *">
                <div className="space-y-2">
                  {roles.map(r => {
                    const I = roleIcon[r.key] || Shield;
                    return (
                      <label key={r.key} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${form.role === r.key ? 'border-[#B4593F] bg-[#FDF3EB]' : 'border-[#EBD9CE] hover:border-[#B4593F]'}`}>
                        <input type="radio" name="role" checked={form.role === r.key} onChange={() => setForm({ ...form, role: r.key })} className="mt-1" />
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${roleColor[r.key] || 'bg-neutral-100'}`}><I className="w-4 h-4" /></div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{r.label}</div>
                          <div className="text-[11px] text-neutral-600">{r.description}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </F>
              <div className="pt-2 flex gap-3">
                <button type="submit" data-testid="send-invite-btn" className="flex-1 bg-[#213a60] hover:bg-[#B4593F] text-white text-xs uppercase tracking-widest px-6 py-2.5 rounded-full">Send Invite</button>
                <button type="button" onClick={() => setEditing(null)} className="px-6 py-2.5 border border-[#EBD9CE] rounded-full text-xs uppercase tracking-widest">Cancel</button>
              </div>
            </form>
          </aside>
        </>
      )}
      <style>{`.input { width:100%; background:#FDF3EB; border:1px solid #EBD9CE; border-radius:9999px; padding:8px 16px; outline:none; font-size:14px; }
        .input:focus { border-color:#B4593F; }`}</style>
    </div>
  );
};
const F = ({ label, children }) => (<label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-500 block mb-1">{label}</span>{children}</label>);

export default AdminUsers;
