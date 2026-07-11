import React, { useEffect, useState } from 'react';
import { adminListBlog, adminCreateBlog, adminUpdateBlog, adminDeleteBlog } from '../../lib/api';
import { toast } from 'sonner';
import { FileText, Plus, Trash2, Edit3, X, Eye, EyeOff, Star } from 'lucide-react';

const empty = {
  slug: '', title: '', excerpt: '', content: '', cover_image: '', author: 'Wear The Hope',
  tags: [], published: false, featured: false, read_minutes: 4, seo_title: '', seo_description: '',
};

const AdminBlog = () => {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);

  const load = () => adminListBlog().then(setItems).catch(() => setItems([]));
  useEffect(() => { load(); }, []);

  const start = (p) => {
    setEditing(p ? p.id : 'new');
    setForm(p ? { ...empty, ...p, tags: p.tags?.join(', ') || '' } : empty);
  };
  const close = () => { setEditing(null); setForm(empty); };

  const save = async (e) => {
    e.preventDefault();
    const payload = { ...form, read_minutes: parseInt(form.read_minutes || 4, 10), tags: typeof form.tags === 'string' ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : (form.tags || []) };
    try {
      if (editing === 'new') await adminCreateBlog(payload);
      else await adminUpdateBlog(editing, payload);
      toast.success('Saved'); close(); load();
    } catch (er) { toast.error(er?.response?.data?.detail || 'Failed'); }
  };

  const del = async (id) => {
    if (!window.confirm('Delete this post?')) return;
    try { await adminDeleteBlog(id); toast.success('Deleted'); load(); } catch { toast.error('Failed'); }
  };

  const toggle = async (p, field) => {
    try {
      const upd = await adminUpdateBlog(p.id, { [field]: !p[field] });
      setItems(items.map(x => x.id === p.id ? upd : x));
    } catch { toast.error('Failed'); }
  };

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-serif-display text-4xl">Blog</h1>
          <p className="text-sm text-neutral-600 mt-1">{items.length} post(s) · {items.filter(i => i.published).length} published</p>
        </div>
        <button onClick={() => start(null)} data-testid="add-post-btn" className="inline-flex items-center gap-2 bg-[#213a60] hover:bg-[#B4593F] text-white text-xs uppercase tracking-widest px-5 py-2.5 rounded-full">
          <Plus className="w-3.5 h-3.5" /> New Post
        </button>
      </div>

      <div className="bg-white rounded-xl border border-[#EBD9CE] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#FDF3EB] text-[11px] uppercase tracking-widest text-neutral-600">
            <tr><th className="text-left px-6 py-3">Title</th><th className="text-left px-6 py-3">Tags</th><th className="text-left px-6 py-3">Status</th><th className="text-left px-6 py-3">Featured</th><th className="text-left px-6 py-3">Published</th><th /></tr>
          </thead>
          <tbody className="divide-y divide-[#EBD9CE]">
            {items.length === 0 ? <tr><td colSpan="6" className="px-6 py-10 text-center text-neutral-500">No posts yet</td></tr> : items.map(p => (
              <tr key={p.id} className="hover:bg-[#FDF3EB]/50">
                <td className="px-6 py-3">
                  <div className="flex items-center gap-3">
                    {p.cover_image && <img src={p.cover_image} alt="" className="w-10 h-10 rounded object-cover" />}
                    <div>
                      <div className="font-medium">{p.title}</div>
                      <div className="text-[10px] text-neutral-500">/blog/{p.slug}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-3 text-xs text-neutral-600">{(p.tags || []).join(', ')}</td>
                <td className="px-6 py-3">
                  <button onClick={() => toggle(p, 'published')} className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded inline-flex items-center gap-1 ${p.published ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-600'}`}>
                    {p.published ? <><Eye className="w-3 h-3" /> Published</> : <><EyeOff className="w-3 h-3" /> Draft</>}
                  </button>
                </td>
                <td className="px-6 py-3">
                  <button onClick={() => toggle(p, 'featured')} className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded inline-flex items-center gap-1 ${p.featured ? 'bg-[#B4593F] text-white' : 'bg-neutral-100 text-neutral-600'}`}>
                    <Star className={`w-3 h-3 ${p.featured ? 'fill-current' : ''}`} /> {p.featured ? 'Featured' : 'Feature'}
                  </button>
                </td>
                <td className="px-6 py-3 text-xs text-neutral-500">{p.published_at ? new Date(p.published_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                <td className="px-6 py-3 text-right">
                  <button onClick={() => start(p)} className="p-2 rounded-full hover:bg-[#FDF3EB]"><Edit3 className="w-4 h-4" /></button>
                  <button onClick={() => del(p.id)} className="p-2 rounded-full hover:bg-rose-50"><Trash2 className="w-4 h-4 text-rose-600" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <>
          <div onClick={close} className="fixed inset-0 bg-black/50 z-50" />
          <aside className="fixed top-0 right-0 h-full w-full sm:w-[720px] bg-white z-50 overflow-y-auto shadow-2xl">
            <div className="px-6 py-5 border-b border-[#EBD9CE] flex items-center justify-between">
              <h3 className="font-serif-display text-2xl flex items-center gap-2"><FileText className="w-5 h-5" /> {editing === 'new' ? 'New Post' : 'Edit Post'}</h3>
              <button onClick={close}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={save} className="px-6 py-5 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Title *"><input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input" /></Field>
                <Field label="Slug * (URL segment)"><input required value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-') })} className="input" placeholder="the-story-of-hope" /></Field>
              </div>
              <Field label="Excerpt (short description)"><textarea rows="2" value={form.excerpt || ''} onChange={e => setForm({ ...form, excerpt: e.target.value })} className="input !rounded-lg" /></Field>
              <Field label="Content (HTML)"><textarea rows="10" value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} className="input !rounded-lg font-mono text-xs" placeholder="<p>Your post content...</p>" /></Field>
              <Field label="Cover image URL"><input value={form.cover_image || ''} onChange={e => setForm({ ...form, cover_image: e.target.value })} className="input" /></Field>
              {form.cover_image && <img src={form.cover_image} alt="" className="w-full aspect-[16/9] object-cover rounded-lg" />}
              <div className="grid grid-cols-3 gap-3">
                <Field label="Author"><input value={form.author} onChange={e => setForm({ ...form, author: e.target.value })} className="input" /></Field>
                <Field label="Read time (min)"><input type="number" value={form.read_minutes} onChange={e => setForm({ ...form, read_minutes: e.target.value })} className="input" /></Field>
                <Field label="Tags (comma sep)"><input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} className="input" placeholder="brand, story" /></Field>
              </div>
              <details className="border border-[#EBD9CE] rounded-lg p-3">
                <summary className="text-xs uppercase tracking-widest text-neutral-600 cursor-pointer">SEO</summary>
                <div className="mt-3 space-y-3">
                  <Field label="SEO Title"><input value={form.seo_title || ''} onChange={e => setForm({ ...form, seo_title: e.target.value })} className="input" /></Field>
                  <Field label="SEO Description"><textarea rows="2" value={form.seo_description || ''} onChange={e => setForm({ ...form, seo_description: e.target.value })} className="input !rounded-lg" /></Field>
                </div>
              </details>
              <div className="flex items-center gap-6 pt-2">
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.published} onChange={e => setForm({ ...form, published: e.target.checked })} /> Published</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.featured} onChange={e => setForm({ ...form, featured: e.target.checked })} /> Featured</label>
              </div>
              <div className="pt-2 flex gap-3">
                <button type="submit" className="bg-[#213a60] hover:bg-[#B4593F] text-white text-xs uppercase tracking-widest px-6 py-2.5 rounded-full">Save</button>
                <button type="button" onClick={close} className="text-xs uppercase tracking-widest px-6 py-2.5 rounded-full border border-[#EBD9CE]">Cancel</button>
              </div>
            </form>
          </aside>
        </>
      )}
      <style>{`.input { width:100%; background:#FDF3EB; border:1px solid #EBD9CE; border-radius:9999px; padding:8px 16px; outline:none; }
        .input:focus { border-color:#B4593F; }
        textarea.input, .input.!rounded-lg { border-radius: 12px; }`}</style>
    </div>
  );
};

const Field = ({ label, children }) => (
  <label className="block">
    <span className="text-[11px] uppercase tracking-widest text-neutral-500 block mb-1">{label}</span>
    {children}
  </label>
);

export default AdminBlog;
