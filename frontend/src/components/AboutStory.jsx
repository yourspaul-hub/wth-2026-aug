import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, ArrowRight, Heart } from 'lucide-react';
import { useContentText } from '../context/ContentContext';
import { API_BASE, fetchPublicSettings } from '../lib/api';

const AboutStory = () => {
  const eyebrow = useContentText('home.about.eyebrow');
  const title = useContentText('home.about.title');
  const titleAccent = useContentText('home.about.title_accent');
  const body = useContentText('home.about.body');
  const cta = useContentText('home.about.cta');
  const badge1 = useContentText('home.about.badge_year', 'Since 2018');
  const badge2 = useContentText('home.about.badge_sub', 'A hobby project turned mission');
  const catalogueCta = useContentText('home.about.catalogue_cta', 'Download Catalogue');
  const [catalogueUrl, setCatalogueUrl] = useState('');
  useEffect(() => {
    fetchPublicSettings().then(r => {
      const url = r?.catalogue?.url;
      if (!url) return;
      setCatalogueUrl(url.startsWith('http') ? url : `${API_BASE.replace(/\/api$/, '')}${url}`);
    }).catch(() => {});
  }, []);

  return (
    <section className="py-24 bg-[#FDF3EB] relative overflow-hidden" data-testid="home-about">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
        <div className="grid md:grid-cols-2 gap-14 items-center">
          <div className="relative">
            <div className="relative aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl">
              <img src="https://images.unsplash.com/photo-1509440159596-0249088772ff?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200" alt="Loaves of bread — inspired by the five loaves and two fish" className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
            </div>
            <div className="absolute -bottom-6 -right-6 bg-white rounded-2xl p-6 shadow-xl border border-[#EBD9CE] max-w-[240px]">
              <Heart className="w-6 h-6 text-[#B4593F] mb-2" />
              <div className="font-serif-display text-2xl text-[#213a60] italic leading-tight">{badge1}</div>
              <div className="text-xs text-neutral-600 mt-1">{badge2}</div>
            </div>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-[0.3em] text-[#B4593F] mb-3">{eyebrow}</div>
            <h2 className="font-serif-display text-4xl md:text-5xl text-[#213a60] leading-tight">
              {title}{titleAccent && <> <span className="italic">{titleAccent}</span></>}
            </h2>
            <div className="mt-6 space-y-5 text-neutral-700 leading-relaxed whitespace-pre-line">
              <p>{body}</p>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href={catalogueUrl || '#'}
                target={catalogueUrl ? '_blank' : undefined}
                rel={catalogueUrl ? 'noreferrer' : undefined}
                onClick={(e) => { if (!catalogueUrl) e.preventDefault(); }}
                className={`inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-xs uppercase tracking-[0.2em] transition-colors ${catalogueUrl ? 'bg-[#B4593F] hover:bg-[#9E4B32] text-white' : 'bg-neutral-300 text-neutral-500 cursor-not-allowed'}`}
                data-testid="home-download-catalogue"
                title={catalogueUrl ? '' : 'No catalogue uploaded yet — admin can add one from Design tab'}
              >
                <Download className="w-4 h-4" /> {catalogueCta}
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
