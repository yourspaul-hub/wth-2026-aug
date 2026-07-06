import React, { useEffect, useRef, useState } from 'react';
import { Instagram, Heart, ExternalLink } from 'lucide-react';
import { instagramFeed } from '../mock/mock';

const InstagramFeed = () => {
  const ref = useRef(null);
  const [visibleCount, setVisibleCount] = useState(10);

  useEffect(() => {
    const els = ref.current?.querySelectorAll('.reveal');
    if (!els) return;
    const io = new IntersectionObserver((entries) => entries.forEach(e => e.isIntersecting && e.target.classList.add('in-view')), { threshold: 0.05 });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, [visibleCount]);

  return (
    <section ref={ref} className="py-24 bg-white">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 mb-4 reveal">
            <Instagram className="w-5 h-5 text-[#B4593F]" />
            <span className="text-[11px] uppercase tracking-[0.3em] text-[#B4593F]">Follow us on Instagram</span>
          </div>
          <h2 className="font-serif-display text-4xl md:text-5xl text-[#1A1A1A] reveal">
            <a href="https://www.instagram.com/wearthehope" target="_blank" rel="noreferrer" className="inline-flex items-center gap-3 hover:text-[#B4593F] transition-colors">
              @wearthehope <ExternalLink className="w-6 h-6" />
            </a>
          </h2>
          <p className="mt-4 text-neutral-600 max-w-xl mx-auto reveal">Tag us in your Wear The Hope moments and get featured. Join a community of over 10K+ believers spreading love and hope.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
          {instagramFeed.slice(0, visibleCount).map((post, i) => (
            <a
              key={post.id}
              href="https://www.instagram.com/wearthehope"
              target="_blank"
              rel="noreferrer"
              className={`group relative overflow-hidden aspect-square rounded-lg reveal ${i === 0 || i === 5 ? 'lg:col-span-2 lg:row-span-2 lg:aspect-square' : ''}`}
              style={{ transitionDelay: `${i * 40}ms` }}
            >
              <img src={post.image} alt={post.caption} className="w-full h-full object-cover transition-transform duration-[900ms] group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-4">
                <div className="flex items-center gap-2 text-white text-xs mb-2">
                  <Heart className="w-3.5 h-3.5 fill-white" /> {post.likes}
                </div>
                <p className="text-white text-[11px] line-clamp-3">{post.caption}</p>
              </div>
              <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/95 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
                <Instagram className="w-4 h-4 text-[#B4593F]" />
              </div>
            </a>
          ))}
        </div>

        {visibleCount < instagramFeed.length && (
          <div className="text-center mt-10">
            <button onClick={() => setVisibleCount(instagramFeed.length)} className="inline-flex items-center gap-2 border border-[#B4593F] text-[#B4593F] hover:bg-[#B4593F] hover:text-white transition-colors rounded-full px-8 py-3 text-xs uppercase tracking-[0.2em]">
              Load More
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default InstagramFeed;
