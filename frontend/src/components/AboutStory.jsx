import React from 'react';
import { Link } from 'react-router-dom';
import { Download, ArrowRight, Heart } from 'lucide-react';
import { useContentText } from '../context/ContentContext';

const AboutStory = () => {
  const eyebrow = useContentText('home.about.eyebrow');
  const title = useContentText('home.about.title');
  const body = useContentText('home.about.body');
  const cta = useContentText('home.about.cta');

  // Split last word of title for accent, so admin edit still keeps the italic style working
  const parts = title.split(' ');
  const titleMain = parts.length > 1 ? parts.slice(0, -1).join(' ') + ' ' : title;
  const titleAccent = parts.length > 1 ? parts.slice(-1)[0] : '';

  return (
    <section className="py-24 bg-[#FDF3EB] relative overflow-hidden" data-testid="home-about">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
        <div className="grid md:grid-cols-2 gap-14 items-center">
          <div className="relative">
            <div className="relative aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl">
              <img src="https://images.unsplash.com/photo-1509021436665-8f07dbf5bf1d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NjV8MHwxfHNlYXJjaHwyfHxiaWJsZXxlbnwwfHx8fDE3ODMzMjYxMTd8MA&ixlib=rb-4.1.0&q=85" alt="Our story" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
            </div>
            <div className="absolute -bottom-6 -right-6 bg-white rounded-2xl p-6 shadow-xl border border-[#EBD9CE] max-w-[240px]">
              <Heart className="w-6 h-6 text-[#B4593F] mb-2" />
              <div className="font-serif-display text-2xl text-[#1A1A1A] italic leading-tight">Since 2018</div>
              <div className="text-xs text-neutral-600 mt-1">A hobby project turned mission</div>
            </div>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-[0.3em] text-[#B4593F] mb-3">{eyebrow}</div>
            <h2 className="font-serif-display text-4xl md:text-5xl text-[#1A1A1A] leading-tight">
              {titleMain}<span className="italic">{titleAccent}</span>
            </h2>
            <div className="mt-6 space-y-5 text-neutral-700 leading-relaxed whitespace-pre-line">
              <p>{body}</p>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a href="#" onClick={(e) => e.preventDefault()} className="inline-flex items-center gap-2 bg-[#B4593F] hover:bg-[#9E4B32] text-white px-6 py-3.5 rounded-full text-xs uppercase tracking-[0.2em] transition-colors">
                <Download className="w-4 h-4" /> Download Catalogue
              </a>
              <Link to="/about" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] link-underline">
                {cta} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutStory;
