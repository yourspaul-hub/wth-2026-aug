import React, { useEffect, useState } from 'react';
import { adminListSeo, adminCreateSeo, adminUpdateSeo, adminDeleteSeo } from '../../lib/api';
import { toast } from 'sonner';
import { Plus, Edit3, Trash2, X, ExternalLink } from 'lucide-react';

const empty = { path: '/', title: '', description: '', keywords: '', og_image: '', canonical: '', robots: 'index,follow' };

const AdminSeo = () => {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);

  const load = () => adminListSeo().then(setItems).catch(() => setItems([]));
  useEffect(() => { load(); }, []);

  const onSave = async () => {
    try {
      if (editing.id) await adminUpdateSeo(editing.id, editing); else await adminCreateSeo(editing);
      toast.success('SEO saved'); setEditing(null); load();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Save failed'); }
  };
  const onDelete = async (r) => {
    if (!window.confirm(`Delete SEO for ${r.path}?`)) return;
    await adminDeleteSeo(r.id); toast.success('Deleted'); load();
  };

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-serif-display text-4xl">SEO Manager</h1>
          <p className="text-sm text-neutral-600 mt-1">Meta tags per URL path · sitemap auto-generated at /sitemap.xml</p>
        </div>
        <div className="flex items-center gap-3">
          <a href="/api/sitemap.xml" target="_blank" rel="noreferrer" className="text-xs uppercase tracking-widest inline-flex items-center gap-1 border border-[#EBD9CE] px-4 py-2.5 rounded-full hover:border-[#B4593F]">Sitemap <ExternalLink className="w-3 h-3" /></a>
          <a href="/api/robots.txt" target="_blank" rel="noreferrer" className="text-xs uppercase tracking-widest inline-flex items-center gap-1 border border-[#EBD9CE] px-4 py-2.5 rounded-full hover:border-[#B4593F]">Robots <ExternalLink className="w-3 h-3" /></a>
          <button onClick={() => setEditing({ ...empty })} className="inline-flex items-center gap-2 bg-[#213a60] hover:bg-[#B4593F] text-white px-5 py-2.5 rounded-full text-xs uppercase tracking-widest"><Plus className="w-4 h-4" /> Add</button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#EBD9CE] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#FDF3EB] text-[11px] uppercase tracking-widest text-neutral-600">
            <tr>
              <th className="text-left px-6 py-3">Path</th>
              <th className="text-left px-6 py-3">Title</th>
              <th className="text-left px-6 py-3">Robots</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EBD9CE]">
            {items.map(s => (
              <tr key={s.id} className="hover:bg-[#FDF3EB]/40">
                <td className="px-6 py-3 font-mono text-xs text-[#B4593F]">{s.path}</td>
                <td className="px-6 py-3">{s.title}<div className="text-[11px] text-neutral-500 line-clamp-1">{s.description}</div></td>
                <td className="px-6 py-3 text-xs">{s.robots}</td>
                <td className="px-6 py-3 flex gap-2 justify-end">
                  <button onClick={() => setEditing(s)} className="text-xs border border-[#EBD9CE] px-3 py-1.5 rounded-full hover:border-[#B4593F]"><Edit3 className="w-3 h-3" /></button>
                  <button onClick={() => onDelete(s)} className="text-xs border border-[#EBD9CE] px-3 py-1.5 rounded-full hover:border-red-500"><Trash2 className="w-3 h-3" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <>
          <div onClick={() => setEditing(null)} className="fixed inset-0 bg-black/50 z-50" />
          <aside className="fixed top-0 right-0 h-full w-full sm:w-[560px] bg-white z-50 overflow-y-auto shadow-2xl">
            <div className="px-6 py-5 border-b border-[#EBD9CE] flex items-center justify-between">
              <h3 className="font-serif-display text-2xl">{editing.id ? 'Edit SEO' : 'New SEO Entry'}</h3>
              <button onClick={() => setEditing(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Path (e.g. /shop or /product/p_001)</span><input value={editing.path} onChange={e => setEditing({ ...editing, path: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F] font-mono" /></label>
              <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Title</span><input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]" /></label>
              <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Description</span><textarea rows="3" value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]" /></label>
              <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Keywords</span><input value={editing.keywords || ''} onChange={e => setEditing({ ...editing, keywords: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]" /></label>
              <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Open Graph Image URL</span><input value={editing.og_image || ''} onChange={e => setEditing({ ...editing, og_image: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]" /></label>
              <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Canonical URL (optional)</span><input value={editing.canonical || ''} onChange={e => setEditing({ ...editing, canonical: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]" /></label>
              <label className="block"><span className="text-[11px] uppercase tracking-widest text-neutral-600">Robots</span><select value={editing.robots} onChange={e => setEditing({ ...editing, robots: e.target.value })} className="mt-1 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B4593F]"><option value="index,follow">index,follow</option><option value="noindex,follow">noindex,follow</option><option value="index,nofollow">index,nofollow</option><option value="noindex,nofollow">noindex,nofollow</option></select></label>
            </div>
            <div className="px-6 py-5 border-t border-[#EBD9CE] flex gap-3"><button onClick={onSave} className="flex-1 bg-[#213a60] hover:bg-[#B4593F] text-white py-3 rounded-full text-xs uppercase tracking-widest">Save</button><button onClick={() => setEditing(null)} className="px-6 py-3 border border-[#EBD9CE] rounded-full text-xs uppercase tracking-widest">Cancel</button></div>
          </aside>
        </>
      )}
    </div>
  );
};

export default AdminSeo;
