import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getBlogPost } from '../lib/api';
import { Clock, ArrowLeft, ArrowRight } from 'lucide-react';

const BlogPost = () => {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setData(null); setNotFound(false);
    getBlogPost(slug).then(setData).catch(() => setNotFound(true));
  }, [slug]);

  if (notFound) {
    return (
      <main className="pt-20 pb-32 text-center max-w-xl mx-auto px-6">
        <div className="text-[11px] uppercase tracking-[0.3em] text-[#B4593F] mb-3">404</div>
        <h1 className="font-serif-display text-4xl">Post not found</h1>
        <Link to="/blog" className="mt-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#B4593F]"><ArrowLeft className="w-3.5 h-3.5" /> Back to journal</Link>
      </main>
    );
  }

  if (!data) return <main className="pt-24 text-center text-neutral-500">Loading…</main>;
  const p = data.post;

  return (
    <main className="pt-6" data-testid="blog-post-page">
      <article>
        <section className="gradient-cream py-16">
          <div className="max-w-[820px] mx-auto px-6 lg:px-10">
            <Link to="/blog" className="text-xs uppercase tracking-[0.2em] text-[#B4593F] inline-flex items-center gap-2 mb-6"><ArrowLeft className="w-3.5 h-3.5" /> Back to journal</Link>
            {p.tags?.[0] && <div className="text-[11px] uppercase tracking-[0.3em] text-[#B4593F] mb-3">{p.tags[0]}</div>}
            <h1 className="font-serif-display text-4xl md:text-5xl leading-tight">{p.title}</h1>
            {p.excerpt && <p className="mt-4 text-lg text-neutral-700 leading-relaxed">{p.excerpt}</p>}
            <div className="mt-6 flex items-center gap-4 text-xs text-neutral-500">
              <span>{p.author}</span>
              <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {p.read_minutes} min read</span>
              {p.published_at && <span>{new Date(p.published_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</span>}
            </div>
          </div>
        </section>

        {p.cover_image && (
          <div className="max-w-[1000px] mx-auto px-6 lg:px-10 -mt-6">
            <div className="aspect-[16/9] rounded-2xl overflow-hidden">
              <img src={p.cover_image} alt={p.title} className="w-full h-full object-cover" />
            </div>
          </div>
        )}

        <section className="py-16 bg-white">
          <div className="max-w-[720px] mx-auto px-6 lg:px-10 prose prose-neutral prose-headings:font-serif-display prose-headings:mt-8" dangerouslySetInnerHTML={{ __html: p.content || '' }} />
        </section>
      </article>

      {data.related?.length > 0 && (
        <section className="py-16 bg-[#FDF3EB]">
          <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
            <h2 className="font-serif-display text-3xl mb-8">Keep reading</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {data.related.map(r => (
                <Link key={r.id} to={`/blog/${r.slug}`} className="group bg-white rounded-2xl overflow-hidden border border-[#EBD9CE] hover-lift">
                  <div className="aspect-[16/10] overflow-hidden bg-neutral-100">
                    {r.cover_image && <img src={r.cover_image} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />}
                  </div>
                  <div className="p-5">
                    <h3 className="font-serif-display text-xl leading-tight group-hover:text-[#B4593F] transition-colors">{r.title}</h3>
                    <div className="mt-4 inline-flex items-center gap-1 text-xs uppercase tracking-[0.2em] text-[#B4593F]">Read <ArrowRight className="w-3 h-3" /></div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
};

export default BlogPost;
