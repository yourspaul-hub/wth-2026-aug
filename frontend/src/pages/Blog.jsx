import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listBlogPosts } from '../lib/api';
import { imgProps } from '../lib/imgSrc';
import { Clock, ArrowRight } from 'lucide-react';

const Blog = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listBlogPosts({ limit: 30 }).then(d => { setItems(d.items || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const featured = items.find(p => p.featured) || items[0];
  const rest = items.filter(p => !featured || p.id !== featured.id);

  return (
    <main className="pt-6" data-testid="blog-page">
      <section className="gradient-cream py-20">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-10 text-center">
          <div className="text-[11px] uppercase tracking-[0.3em] text-[#B4593F] mb-3">The journal</div>
          <h1 className="font-serif-display text-5xl md:text-6xl">Stories of <span className="italic">hope</span></h1>
          <p className="mt-4 text-neutral-700 max-w-xl mx-auto">Craft notes, gifting guides and stories behind the pieces we make.</p>
        </div>
      </section>

      {loading ? (
        <div className="max-w-[1200px] mx-auto px-6 py-24 text-center text-neutral-500">Loading…</div>
      ) : items.length === 0 ? (
        <div className="max-w-[1200px] mx-auto px-6 py-24 text-center text-neutral-500">No posts yet — check back soon.</div>
      ) : (
        <>
          {featured && (
            <section className="py-16 bg-white">
              <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
                <Link to={`/blog/${featured.slug}`} className="grid md:grid-cols-2 gap-10 group" data-testid="featured-post">
                  <div className="aspect-[5/4] overflow-hidden rounded-2xl">
                    {featured.cover_image && <img {...imgProps(featured.cover_image, { width: 1000, height: 800, sizes: "(max-width: 768px) 100vw, 50vw", eager: true })} alt={featured.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />}
                  </div>
                  <div className="flex flex-col justify-center">
                    <div className="text-[11px] uppercase tracking-[0.3em] text-[#B4593F] mb-3">Featured</div>
                    <h2 className="font-serif-display text-4xl md:text-5xl group-hover:text-[#B4593F] transition-colors">{featured.title}</h2>
                    {featured.excerpt && <p className="mt-4 text-neutral-700 leading-relaxed">{featured.excerpt}</p>}
                    <div className="mt-6 flex items-center gap-4 text-xs text-neutral-500">
                      <span>{featured.author}</span>
                      <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {featured.read_minutes} min read</span>
                    </div>
                    <div className="mt-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#B4593F]">
                      Read the story <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </Link>
              </div>
            </section>
          )}

          {rest.length > 0 && (
            <section className="pb-24 bg-[#FDF3EB]">
              <div className="max-w-[1200px] mx-auto px-6 lg:px-10 pt-16">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rest.map(p => (
                    <Link key={p.id} to={`/blog/${p.slug}`} className="group bg-white rounded-2xl overflow-hidden border border-[#EBD9CE] hover-lift" data-testid={`blog-card-${p.id}`}>
                      <div className="aspect-[16/10] overflow-hidden bg-neutral-100">
                        {p.cover_image && <img {...imgProps(p.cover_image, { width: 500, height: 320, sizes: "(max-width: 768px) 100vw, 33vw" })} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />}
                      </div>
                      <div className="p-5">
                        {p.tags?.[0] && <div className="text-[10px] uppercase tracking-[0.3em] text-[#B4593F] mb-2">{p.tags[0]}</div>}
                        <h3 className="font-serif-display text-2xl leading-tight group-hover:text-[#B4593F] transition-colors">{p.title}</h3>
                        {p.excerpt && <p className="text-sm text-neutral-600 mt-2 line-clamp-2">{p.excerpt}</p>}
                        <div className="mt-4 flex items-center gap-3 text-xs text-neutral-500">
                          <span>{p.author}</span>
                          <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {p.read_minutes} min</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
};

export default Blog;
