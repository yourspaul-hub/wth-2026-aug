import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Save, Instagram, ExternalLink, Info } from 'lucide-react';
import { adminGetInstagramSettings, adminUpdateInstagramSettings } from '../../lib/api';

const PROVIDERS = [
  {
    key: 'curated',
    title: 'Admin-curated feed',
    desc: 'Manually add Instagram posts under Admin → Instagram. Full control, zero external dependencies.',
  },
  {
    key: 'behold',
    title: 'Behold.so widget',
    desc: 'Auto-syncs your Instagram once you connect it at behold.so. Free tier: 1 feed, 9 posts, daily refresh. Just paste the feed id.',
    setupUrl: 'https://behold.so/',
  },
  {
    key: 'elfsight',
    title: 'Elfsight widget',
    desc: 'More layout options (grid / slider / masonry). Free tier is limited but works for a small store. Paste the widget id from your Elfsight app.',
    setupUrl: 'https://elfsight.com/instagram-feed-instashow/',
  },
];

const AdminInstagramSettings = () => {
  const [state, setState] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => adminGetInstagramSettings().then(setState).catch(() => setState(null));
  useEffect(() => { load(); }, []);

  const set = (patch) => setState(s => ({ ...s, ...patch }));

  const save = async () => {
    setSaving(true);
    try {
      const next = await adminUpdateInstagramSettings(state);
      setState(next);
      toast.success('Instagram settings saved');
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (!state) return <div className="text-neutral-500 text-sm py-12 text-center">Loading…</div>;

  return (
    <div className="max-w-4xl">
      <div className="flex items-end justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="font-serif-display text-4xl" data-testid="ig-settings-title">Instagram Feed</h1>
          <p className="text-sm text-neutral-600 mt-2 max-w-xl">
            Choose how your Instagram section on the homepage is populated. Switch anytime — the storefront picks up the change on the next page load.
          </p>
        </div>
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 text-xs uppercase tracking-widest bg-[#213a60] hover:bg-[#B4593F] disabled:opacity-40 text-white px-5 py-2.5 rounded-full transition-colors" data-testid="ig-settings-save">
          <Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-3 mb-8">
        {PROVIDERS.map(p => {
          const active = state.provider === p.key;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => set({ provider: p.key })}
              className={`text-left p-4 rounded-xl border transition-colors ${active ? 'border-[#B4593F] bg-[#FDF3EB]' : 'border-[#EBD9CE] bg-white hover:border-[#B4593F]/60'}`}
              data-testid={`ig-provider-${p.key}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Instagram className="w-4 h-4 text-[#B4593F]" />
                <div className="text-sm font-medium">{p.title}</div>
              </div>
              <div className="text-[11px] text-neutral-600 leading-relaxed">{p.desc}</div>
              {p.setupUrl && (
                <a href={p.setupUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="inline-flex items-center gap-1 mt-2 text-[11px] uppercase tracking-widest text-[#B4593F] hover:underline">
                  Sign up <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </button>
          );
        })}
      </div>

      {state.provider === 'behold' && (
        <div className="bg-white border border-[#EBD9CE] rounded-2xl p-6 mb-6" data-testid="ig-behold-block">
          <div className="text-[11px] uppercase tracking-widest text-[#B4593F] mb-3">Behold.so setup</div>
          <ol className="text-sm text-neutral-700 space-y-2 mb-5 list-decimal list-inside">
            <li>Sign up (free) at <a href="https://behold.so/" target="_blank" rel="noreferrer" className="text-[#B4593F] hover:underline">behold.so</a> and connect your Instagram account.</li>
            <li>Create a new feed, then open its embed panel.</li>
            <li>Copy the <strong>feed id</strong> (the string inside <code className="bg-neutral-100 px-1 rounded">feed-id="…"</code>) and paste it below.</li>
          </ol>
          <label className="block">
            <div className="text-[11px] uppercase tracking-widest text-neutral-500 mb-1.5">Behold Feed ID</div>
            <input value={state.behold_feed_id || ''} onChange={e => set({ behold_feed_id: e.target.value.trim() })} placeholder="e.g. 8XyzAbc123" className="w-full bg-neutral-50 border border-neutral-200 rounded-full px-5 py-2.5 text-sm font-mono outline-none focus:border-[#B4593F]" data-testid="ig-behold-feed-id" />
          </label>
        </div>
      )}

      {state.provider === 'elfsight' && (
        <div className="bg-white border border-[#EBD9CE] rounded-2xl p-6 mb-6" data-testid="ig-elfsight-block">
          <div className="text-[11px] uppercase tracking-widest text-[#B4593F] mb-3">Elfsight setup</div>
          <ol className="text-sm text-neutral-700 space-y-2 mb-5 list-decimal list-inside">
            <li>Sign up (free) at <a href="https://elfsight.com/instagram-feed-instashow/" target="_blank" rel="noreferrer" className="text-[#B4593F] hover:underline">elfsight.com</a> and create an Instagram Feed app.</li>
            <li>Connect your Instagram account and design the layout.</li>
            <li>Copy the <strong>widget id</strong> from the install snippet (the string after <code className="bg-neutral-100 px-1 rounded">elfsight-app-</code>) and paste it below.</li>
          </ol>
          <label className="block">
            <div className="text-[11px] uppercase tracking-widest text-neutral-500 mb-1.5">Elfsight Widget ID</div>
            <input value={state.elfsight_widget_id || ''} onChange={e => set({ elfsight_widget_id: e.target.value.trim() })} placeholder="e.g. abc12345-6789-1abc-de23-f4567g8h9i0j" className="w-full bg-neutral-50 border border-neutral-200 rounded-full px-5 py-2.5 text-sm font-mono outline-none focus:border-[#B4593F]" data-testid="ig-elfsight-widget-id" />
          </label>
        </div>
      )}

      <div className="bg-white border border-[#EBD9CE] rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-neutral-500 mb-1">
          <Info className="w-3.5 h-3.5" /> Public profile info (shown on the About + Contact pages)
        </div>
        <label className="block">
          <div className="text-[11px] uppercase tracking-widest text-neutral-500 mb-1.5">Instagram profile URL</div>
          <input type="url" value={state.profile_url || ''} onChange={e => set({ profile_url: e.target.value })} placeholder="https://www.instagram.com/wearthehope.co/" className="w-full bg-neutral-50 border border-neutral-200 rounded-full px-5 py-2.5 text-sm outline-none focus:border-[#B4593F]" data-testid="ig-profile-url" />
        </label>
        <label className="block">
          <div className="text-[11px] uppercase tracking-widest text-neutral-500 mb-1.5">Handle (with @)</div>
          <input value={state.handle || ''} onChange={e => set({ handle: e.target.value })} placeholder="@wearthehope" className="w-full bg-neutral-50 border border-neutral-200 rounded-full px-5 py-2.5 text-sm outline-none focus:border-[#B4593F]" data-testid="ig-handle" />
        </label>
      </div>
    </div>
  );
};

export default AdminInstagramSettings;
