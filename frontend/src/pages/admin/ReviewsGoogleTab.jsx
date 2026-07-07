import React, { useEffect, useState } from 'react';
import {
  adminListGoogleLocations, adminCreateGoogleLocation, adminUpdateGoogleLocation,
  adminDeleteGoogleLocation, adminSyncGoogleLocation, adminSyncAllGoogleLocations,
} from '../../lib/api';
import { toast } from 'sonner';
import { Globe, Plus, Trash2, Edit3, RefreshCw, X, Star, MapPin } from 'lucide-react';

const empty = { label: '', place_id: '', address: '', map_url: '', auto_publish: true, min_rating_to_publish: 4, active: true, order: 0 };

const ReviewsGoogleTab = () => {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [syncing, setSyncing] = useState(null);
  const [syncingAll, setSyncingAll] = useState(false);

  const load = () => adminListGoogleLocations().then(setItems).catch(() => setItems([]));
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    const payload = { ...editing, order: parseInt(editing.order || 0, 10), min_rating_to_publish: parseInt(editing.min_rating_to_publish || 4, 10) };
    try {
      if (editing.id) await adminUpdateGoogleLocation(editing.id, payload);
      else await adminCreateGoogleLocation(payload);
      toast.success('Saved'); setEditing(null); load();
    } catch (e2) { toast.error(e2?.response?.data?.detail || 'Failed'); }
  };
  const del = async (id) => {
    if (!window.confirm('Remove this Google Business location?')) return;
    try { await adminDeleteGoogleLocation(id); toast.success('Removed'); load(); } catch { toast.error('Failed'); }
  };
  const sync = async (id) => {
    setSyncing(id);
    try {
      const res = await adminSyncGoogleLocation(id);
      toast.success(`Synced: ${res.imported} new · ${res.updated} updated${res.mocked ? ' (MOCKED)' : ''}`);
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Sync failed'); }
    finally { setSyncing(null); }
  };
  const syncAll = async () => {
    setSyncingAll(true);
    try {
      const res = await adminSyncAllGoogleLocations();
      const totalImp = res.results.reduce((s, r) => s + (r.imported || 0), 0);
      const totalUpd = res.results.reduce((s, r) => s + (r.updated || 0), 0);
      toast.success(`All locations synced · ${totalImp} new · ${totalUpd} updated`);
      load();
    } catch { toast.error('Sync all failed'); }
    finally { setSyncingAll(false); }
  };

  return (
    <div>
      <div className="bg-[#FDF3EB] border border-[#EBD9CE] rounded-xl p-4 mb-5 text-xs text-neutral-700 flex items-start gap-3">
        <Globe className="w-4 h-4 text-[#B4593F] mt-0.5 shrink-0" />
        <div>
          Add every Google Business Profile you have. Each sync fetches the latest customer reviews and imports them into your Reviews Hub — auto-published if rating ≥ threshold. When <code>GOOGLE_PLACES_API_KEY</code> is set in <code>backend/.env</code>, syncs pull live reviews from Google Places API v1; otherwise they use a realistic <strong>MOCKED</strong> feed so you can see the flow.
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-neutral-600">{items.length} location(s)</div>
        <div className="flex gap-2">
          <button onClick={syncAll} disabled={syncingAll || items.length === 0} data-testid="sync-all-btn" className="inline-flex items-center gap-2 bg-white border border-[#EBD9CE] hover:border-[#B4593F] text-xs uppercase tracking-widest px-5 py-2.5 rounded-full disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${syncingAll ? 'animate-spin' : ''}`} /> {syncingAll ? 'Syncing all…' : 'Sync all'}
          </button>
          <button onClick={() => setEditing({ ...empty })} data-testid="add-gbl-btn" className="inline-flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#B4593F] text-white text-xs uppercase tracking-widest px-5 py-2.5 rounded-full">
            <Plus className="w-3.5 h-3.5" /> Add Location
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {items.length === 0 && (
          <div className="md:col-span-2 py-16 text-center text-neutral-500">
            <Globe className="w-8 h-8 mx-auto mb-3 text-[#B4593F]/50" />
            <div>Add your first Google Business Profile to start syncing reviews.</div>
          </div>
        )}
        {items.map(l => (
          <div key={l.id} data-testid={`gbl-card-${l.id}`} className="bg-white rounded-xl border border-[#EBD9CE] p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-[#B4593F] mb-1 flex items-center gap-2">
                  <Globe className="w-3 h-3" /> Google Business
                  {!l.active && <span className="text-neutral-500">· Inactive</span>}
                </div>
                <div className="font-serif-display text-2xl">{l.label}</div>
                {l.address && <div className="text-xs text-neutral-600 mt-1 flex items-start gap-1"><MapPin className="w-3 h-3 mt-0.5 shrink-0" /> {l.address}</div>}
                <div className="mt-3 flex items-center gap-4 text-sm">
                  {l.rating != null ? (
                    <span className="inline-flex items-center gap-1"><Star className="w-4 h-4 fill-[#F5B342] stroke-[#F5B342]" /> <strong>{l.rating}</strong> <span className="text-neutral-500">({l.review_count})</span></span>
                  ) : (
                    <span className="text-xs text-neutral-500">Not synced yet</span>
                  )}
                </div>
                <div className="mt-2 text-[11px] text-neutral-500">
                  {l.last_synced_at ? <>Last sync: {new Date(l.last_synced_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</> : 'Never synced'}
                </div>
                <div className="mt-2 text-[11px] text-neutral-500 font-mono truncate" title={l.place_id}>{l.place_id}</div>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <button onClick={() => sync(l.id)} disabled={syncing === l.id} data-testid={`sync-${l.id}`} className="p-2 rounded-full hover:bg-[#FDF3EB] disabled:opacity-40" title="Sync now">
                  <RefreshCw className={`w-4 h-4 text-[#B4593F] ${syncing === l.id ? 'animate-spin' : ''}`} />
                </button>
                <button onClick={() => setEditing(l)} className="p-2 rounded-full hover:bg-[#FDF3EB]" title="Edit"><Edit3 className="w-4 h-4" /></button>
                <button onClick={() => del(l.id)} className="p-2 rounded-full hover:bg-rose-50" title="Remove"><Trash2 className="w-4 h-4 text-rose-600" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <>
          <div onClick={() => setEditing(null)} className="fixed inset-0 bg-black/50 z-50" />
          <aside className="fixed top-0 right-0 h-full w-full sm:w-[520px] bg-white z-50 overflow-y-auto shadow-2xl">
            <div className="px-6 py-5 border-b border-[#EBD9CE] flex items-center justify-between">
              <h3 className="font-serif-display text-2xl flex items-center gap-2"><Globe className="w-5 h-5" /> {editing.id ? 'Edit Location' : 'New Location'}</h3>
              <button onClick={() => setEditing(null)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={save} className="px-6 py-5 space-y-4 text-sm">
              <F label="Label (visible in admin)"><input required value={editing.label} onChange={e => setEditing({ ...editing, label: e.target.value })} className="input" placeholder="Mumbai — Design Center" data-testid="gbl-label" /></F>
              <F label="Google Place ID *">
                <input required value={editing.place_id} onChange={e => setEditing({ ...editing, place_id: e.target.value })} className="input font-mono" placeholder="ChIJ..." data-testid="gbl-place-id" />
                <a href="https://developers.google.com/maps/documentation/places/web-service/place-id" target="_blank" rel="noreferrer" className="text-[11px] text-[#B4593F] hover:underline">Where do I find my Place ID?</a>
              </F>
              <F label="Address (display)"><input value={editing.address || ''} onChange={e => setEditing({ ...editing, address: e.target.value })} className="input" /></F>
              <F label="Google Maps URL"><input value={editing.map_url || ''} onChange={e => setEditing({ ...editing, map_url: e.target.value })} className="input" placeholder="https://maps.google.com/..." /></F>
              <div className="grid grid-cols-2 gap-3">
                <F label="Min rating to auto-publish"><input type="number" min="1" max="5" value={editing.min_rating_to_publish} onChange={e => setEditing({ ...editing, min_rating_to_publish: e.target.value })} className="input" /></F>
                <F label="Order"><input type="number" value={editing.order} onChange={e => setEditing({ ...editing, order: e.target.value })} className="input" /></F>
              </div>
              <div className="flex items-center gap-5 pt-1">
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={editing.auto_publish} onChange={e => setEditing({ ...editing, auto_publish: e.target.checked })} /> Auto-publish good reviews</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={editing.active} onChange={e => setEditing({ ...editing, active: e.target.checked })} /> Active</label>
              </div>
              <div className="pt-2 flex gap-3">
                <button type="submit" data-testid="save-gbl-btn" className="flex-1 bg-[#1A1A1A] hover:bg-[#B4593F] text-white text-xs uppercase tracking-widest px-6 py-2.5 rounded-full">Save</button>
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

const F = ({ label, children }) => (
  <label className="block">
    <span className="text-[11px] uppercase tracking-widest text-neutral-500 block mb-1">{label}</span>
    {children}
  </label>
);

export default ReviewsGoogleTab;
