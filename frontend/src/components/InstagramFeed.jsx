import React, { useEffect, useState } from 'react';
import { listInstagram } from '../lib/api';
import { imgProps } from '../lib/imgSrc';
import { Instagram, Heart, MessageCircle, ExternalLink, ShoppingBag } from 'lucide-react';

const InstagramFeed = ({ limit = 6, showHeader = true }) => {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    listInstagram(limit).then(setPosts).catch(() => setPosts([]));
  }, [limit]);

  if (posts.length === 0) return null;

  return (
    <section className="py-20 bg-white" data-testid="instagram-feed">
      <div className="max-w-[1300px] mx-auto px-6 lg:px-10">
        {showHeader && (
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-[#B4593F] mb-3">
              <Instagram className="w-3.5 h-3.5" /> Follow along
            </div>
            <h2 className="font-serif-display text-4xl md:text-5xl">
              <a href="https://www.instagram.com/wearthehope" target="_blank" rel="noreferrer" className="hover:text-[#B4593F] transition-colors inline-flex items-center gap-3">
                @<span className="italic">wearthehope</span> <ExternalLink className="w-5 h-5" />
              </a>
            </h2>
            <p className="mt-3 text-neutral-600 max-w-lg mx-auto text-sm">Tag us in your Wear The Hope moments and get featured — over 10K+ believers spreading love and hope.</p>
          </div>
        )}

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
      </div>
    </section>
  );
};

export default InstagramFeed;
