import React, { useEffect, useState } from 'react';
import { adminListLocations, adminCreateLocation, adminUpdateLocation, adminDeleteLocation } from '../../lib/api';
import { toast } from 'sonner';
import { MapPin, Plus, Trash2, Edit3, X, Star } from 'lucide-react';

const empty = {
  label: '', name: '', address_lines: [''], city: '', state: '', pincode: '',
  country: 'India', phone: '', whatsapp: '', email: '', hours: '', map_url: '',
  is_primary: false, active: true, order: 0,
};

const AdminLocations = () => {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);

  const load = () => adminListLocations().then(setItems).catch(() => setItems([]));
  useEffect(() => { load(); }, []);

  const startNew = () => { setEditing('new'); setForm(empty); };
  const startEdit = (loc) => {
    setEditing(loc.id);
    setForm({ ...empty, ...loc, address_lines: loc.address_lines?.length ? loc.address_lines : [''] });
  };
  const close = () => { setEditing(null); setForm(empty); };

  const submit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      address_lines: form.address_lines.filter(x => x && x.trim()),
      order: parseInt(form.order || 0, 10),
    };
    try {
      if (editing === 'new') await adminCreateLocation(payload);
      else await adminUpdateLocation(editing, payload);
      toast.success('Location saved');
      close(); load();
    } catch (e2) {
      toast.error(e2?.response?.data?.detail || 'Failed');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this location?')) return;
    try { await adminDeleteLocation(id); toast.success('Deleted'); load(); }
    catch { toast.error('Failed'); }
  };

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-serif-display text-4xl">Store Locations</h1>
          <p className="text-sm text-neutral-600 mt-1">{items.length} location(s) · shown on the Contact page</p>
        </div>
        <button onClick={startNew} data-testid="add-location-btn" className="inline-flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#B4593F] text-white text-xs uppercase tracking-widest px-5 py-2.5 rounded-full transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add Location
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {items.length === 0 ? (
          <div className="md:col-span-2 text-center py-16 text-neutral-500">
            <MapPin className="w-8 h-8 mx-auto mb-3 text-[#B4593F]/50" />
            No locations yet. Add your first branch above.
          </div>
        ) : items.map(loc => (
          <div key={loc.id} data-testid={`admin-location-${loc.id}`} className="bg-white rounded-xl border border-[#EBD9CE] p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="text-[10px] uppercase tracking-widest text-[#B4593F]">{loc.label}</div>
                  {loc.is_primary && <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest bg-[#B4593F] text-white px-2 py-0.5 rounded-full"><Star className="w-2.5 h-2.5 fill-current" /> Primary</span>}
                  {!loc.active && <span className="text-[10px] uppercase tracking-widest bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full">Inactive</span>}
                </div>
                <div className="font-serif-display text-xl">{loc.name || 'Wear The Hope'}</div>
                <div className="text-xs text-neutral-600 mt-2 leading-relaxed">
                  {(loc.address_lines || []).join(', ')}<br />
                  {[loc.city, loc.state].filter(Boolean).join(', ')} {loc.pincode || ''} · {loc.country}
                </div>
                <div className="mt-2 text-xs text-neutral-500 space-y-0.5">
                  {loc.whatsapp && <div>WA: {loc.whatsapp}</div>}
                  {loc.email && <div>{loc.email}</div>}
                  {loc.hours && <div>{loc.hours}</div>}
                </div>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button onClick={() => startEdit(loc)} className="p-2 rounded-full hover:bg-[#FDF3EB]" title="Edit"><Edit3 className="w-4 h-4 text-neutral-600" /></button>
                <button onClick={() => remove(loc.id)} className="p-2 rounded-full hover:bg-rose-50" title="Delete"><Trash2 className="w-4 h-4 text-rose-600" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <>
          <div onClick={close} className="fixed inset-0 bg-black/50 z-50" />
          <aside className="fixed top-0 right-0 h-full w-full sm:w-[560px] bg-white z-50 overflow-y-auto shadow-2xl">
            <div className="px-6 py-5 border-b border-[#EBD9CE] flex items-center justify-between">
              <h3 className="font-serif-display text-2xl">{editing === 'new' ? 'New Location' : 'Edit Location'}</h3>
              <button onClick={close}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={submit} className="px-6 py-5 space-y-4 text-sm">
              <Field label="Label (e.g. Design Center, Registered Office)">
                <input required value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} data-testid="loc-label-input" className="input" />
              </Field>
              <Field label="Name / brand line (optional)">
                <input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} className="input" placeholder="Wear The Hope" />
              </Field>
              <Field label="Address lines">
                {form.address_lines.map((line, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input value={line} onChange={e => {
                      const arr = [...form.address_lines]; arr[i] = e.target.value; setForm({ ...form, address_lines: arr });
                    }} className="input flex-1" placeholder={i === 0 ? 'Street / area' : 'Additional line'} />
                    {form.address_lines.length > 1 && (
                      <button type="button" onClick={() => {
                        const arr = form.address_lines.filter((_, k) => k !== i); setForm({ ...form, address_lines: arr });
                      }} className="text-rose-600 px-2">×</button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => setForm({ ...form, address_lines: [...form.address_lines, ''] })} className="text-xs text-[#B4593F] hover:underline">+ Add another line</button>
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="City"><input required value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className="input" /></Field>
                <Field label="State"><input value={form.state || ''} onChange={e => setForm({ ...form, state: e.target.value })} className="input" /></Field>
                <Field label="Pincode"><input value={form.pincode || ''} onChange={e => setForm({ ...form, pincode: e.target.value })} className="input" /></Field>
              </div>
              <Field label="Country"><input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} className="input" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Phone"><input value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} className="input" /></Field>
                <Field label="WhatsApp"><input value={form.whatsapp || ''} onChange={e => setForm({ ...form, whatsapp: e.target.value })} className="input" placeholder="+91 90043 73305" /></Field>
              </div>
              <Field label="Email"><input type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} className="input" /></Field>
              <Field label="Hours"><input value={form.hours || ''} onChange={e => setForm({ ...form, hours: e.target.value })} className="input" placeholder="Mon–Sat, 10 AM – 7 PM IST" /></Field>
              <Field label="Google Maps URL"><input value={form.map_url || ''} onChange={e => setForm({ ...form, map_url: e.target.value })} className="input" placeholder="https://maps.google.com/..." /></Field>
              <div className="flex items-center gap-6 pt-2">
                <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_primary} onChange={e => setForm({ ...form, is_primary: e.target.checked })} /> Primary</label>
                <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} /> Active</label>
                <label className="inline-flex items-center gap-2 text-sm">Order <input type="number" value={form.order} onChange={e => setForm({ ...form, order: e.target.value })} className="input w-20 py-1.5" /></label>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="submit" data-testid="save-location-btn" className="bg-[#1A1A1A] hover:bg-[#B4593F] text-white text-xs uppercase tracking-widest px-6 py-2.5 rounded-full transition-colors">Save</button>
                <button type="button" onClick={close} className="text-xs uppercase tracking-widest px-6 py-2.5 rounded-full border border-[#EBD9CE] hover:bg-[#FDF3EB]">Cancel</button>
              </div>
            </form>
          </aside>
        </>
      )}
      <style>{`.input { width:100%; background:#FDF3EB; border:1px solid #EBD9CE; border-radius:9999px; padding:8px 16px; outline:none; transition:border-color .15s; }
        .input:focus { border-color:#B4593F; }`}</style>
    </div>
  );
};

const Field = ({ label, children }) => (
  <label className="block">
    <span className="text-[11px] uppercase tracking-widest text-neutral-500 block mb-1">{label}</span>
    {children}
  </label>
);

export default AdminLocations;
