import React, { useEffect, useRef, useState } from 'react';
import { listInstagram, api } from '../lib/api';
import { imgProps } from '../lib/imgSrc';
import { Instagram, Heart, MessageCircle, ExternalLink, ShoppingBag } from 'lucide-react';
import { useContentText } from '../context/ContentContext';

/**
 * Storefront Instagram section — three provider modes controlled from admin
 * (Admin → Instagram Settings → Provider):
 *   - 'behold'    : embed a Behold.so widget by feed id
 *   - 'elfsight'  : embed an Elfsight widget by widget id
 *   - 'curated'   : (default) render manually-added posts from the admin
 */
const BeholdEmbed = ({ feedId }) => {
  useEffect(() => {
    if (document.querySelector('script[src*="behold.so"]')) return;
    const s = document.createElement('script');
    s.src = 'https://w.behold.so/widget.js';
    s.type = 'module';
    document.head.appendChild(s);
  }, []);
  if (!feedId) return null;
  return React.createElement('behold-widget', { 'feed-id': feedId, 'data-testid': 'instagram-behold' });
};

const ElfsightEmbed = ({ widgetId }) => {
  useEffect(() => {
    if (document.querySelector('script[src*="elfsight.com/platform"]')) return;
    const s = document.createElement('script');
    s.src = 'https://elfsightcdn.com/platform.js';
    s.async = true;
    document.head.appendChild(s);
  }, []);
  if (!widgetId) return null;
  return <div className={`elfsight-app-${widgetId}`} data-elfsight-app-lazy data-testid="instagram-elfsight" />;
};

const InstagramFeed = ({ limit = 6, showHeader = true }) => {
  const [posts, setPosts] = useState([]);
  const [settings, setSettings] = useState({ provider: 'curated', behold_feed_id: '', elfsight_widget_id: '' });
  const eyebrow = useContentText('home.instagram.eyebrow');
  const titleMain = useContentText('home.instagram.title_main', '@');
  const titleAccent = useContentText('home.instagram.title_accent', 'wearthehope');
  const body = useContentText('home.instagram.body', 'Tag us in your Wear The Hope moments and get featured — over 10K+ believers spreading love and hope.');
  const igUrl = useContentText('home.instagram.url', 'https://www.instagram.com/wearthehope');
  const loaded = useRef(false);

  useEffect(() => {
    api.get('/settings/public').then(r => setSettings(r.data?.instagram || {})).catch(() => {});
  }, []);

  useEffect(() => {
    if (settings.provider !== 'curated' || loaded.current) return;
    loaded.current = true;
    listInstagram(limit).then(setPosts).catch(() => setPosts([]));
  }, [settings.provider, limit]);

  const provider = settings.provider || 'curated';
  const hasWidget = (provider === 'behold' && settings.behold_feed_id) || (provider === 'elfsight' && settings.elfsight_widget_id);
  if (provider === 'curated' && posts.length === 0) return null;
  if (provider !== 'curated' && !hasWidget) return null;

  return (
    <section className="py-20 bg-white" data-testid="instagram-feed">
      <div className="max-w-[1300px] mx-auto px-6 lg:px-10">
        {showHeader && (
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-[#B4593F] mb-3">
              <Instagram className="w-3.5 h-3.5" /> {eyebrow}
            </div>
            <h2 className="font-serif-display text-4xl md:text-5xl">
              <a href={igUrl} target="_blank" rel="noreferrer" className="hover:text-[#B4593F] transition-colors inline-flex items-center gap-3">
                {titleMain}<span className="italic">{titleAccent}</span> <ExternalLink className="w-5 h-5" />
              </a>
            </h2>
            <p className="mt-3 text-neutral-600 max-w-lg mx-auto text-sm">{body}</p>
          </div>
        )}

        {provider === 'behold' && (
          <div className="w-full" data-testid="instagram-widget-behold"><BeholdEmbed feedId={settings.behold_feed_id} /></div>
        )}
        {provider === 'elfsight' && (
          <div className="w-full" data-testid="instagram-widget-elfsight"><ElfsightEmbed widgetId={settings.elfsight_widget_id} /></div>
        )}
        {provider === 'curated' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {posts.map(p => (
            <a
              key={p.id}
              href={p.permalink || 'https://www.instagram.com/wearthehope'}
              target="_blank"
              rel="noreferrer"
              className="group relative aspect-square overflow-hidden rounded-lg bg-neutral-100"
              data-testid={`ig-post-${p.id}`}
            >
              <img {...imgProps(p.image, { width: 400, height: 400, sizes: '(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 16vw' })} alt={p.caption?.slice(0, 60) || 'Instagram post'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                <div className="flex items-center gap-3 text-white text-xs">
                  <span className="inline-flex items-center gap-1"><Heart className="w-3 h-3 fill-current" /> {p.likes}</span>
                  <span className="inline-flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {p.comments}</span>
                </div>
              </div>
              {p.product_ids?.length > 0 && (
                <div className="absolute top-2 right-2 bg-white/95 backdrop-blur-sm rounded-full px-2 py-1 text-[10px] uppercase tracking-widest flex items-center gap-1 shadow">
                  <ShoppingBag className="w-3 h-3 text-[#B4593F]" /> Shop
                </div>
              )}
            </a>
          ))}
        </div>
        )}
      </div>
    </section>
  );
};

export default InstagramFeed;
