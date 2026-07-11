import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Users, Globe2, Sparkles, Award, HandHeart, Handshake, ExternalLink } from 'lucide-react';
import { fetchReviewsFull, fetchPartnerships } from '../lib/api';
import { useContentText } from '../context/ContentContext';

const BACKEND = process.env.REACT_APP_BACKEND_URL || '';
const resolveSrc = (u) => (u && u.startsWith('/api/') ? `${BACKEND}${u}` : u);

const stats = [
  { icon: Users, num: '10K+', label: 'Happy Customers' },
  { icon: Globe2, num: '25+', label: 'Countries Reached' },
  { icon: Award, num: '4.9★', label: 'Google Rating' },
  { icon: Sparkles, num: '180+', label: 'Unique Designs' },
];

const values = [
  {
    icon: HandHeart,
    title: 'Obedience Before Understanding',
    desc: 'We registered the brand before we saw the roadmap. Like Joshua stepping into the Jordan, we choose faith over fear at every fork in the road.',
  },
  {
    icon: Sparkles,
    title: 'Business as Ministry',
    desc: 'Every product carries a prayer. Every partnership becomes a platform. Commerce is our canvas — the message of hope is our masterpiece.',
  },
  {
    icon: Handshake,
    title: 'Lives Before Brands',
    desc: 'Sustainable jobs, restored dignity, empowered communities. Our success is measured in the lives touched, not just the units shipped.',
  },
];

const About = () => {
  const [featuredReview, setFeaturedReview] = useState(null);
  const [partnerships, setPartnerships] = useState([]);
  useEffect(() => {
    fetchReviewsFull({ limit: 10 })
      .then(d => {
        const items = d?.items || [];
        const pick = items.find(r => r.rating === 5 && (r.text || '').length > 60) || items[0];
        setFeaturedReview(pick || null);
      })
      .catch(() => setFeaturedReview(null));
    fetchPartnerships().then(setPartnerships).catch(() => setPartnerships([]));
  }, []);
  const heroEyebrow = useContentText('about.hero.eyebrow');
  const heroTitle = useContentText('about.hero.title');
  const heroAccent = useContentText('about.hero.title_accent');
  const heroBody = useContentText('about.hero.body');
  const missionEyebrow = useContentText('about.mission.eyebrow', 'From vision to obedience');
  const missionTitle = useContentText('about.mission.title');
  const missionAccent = useContentText('about.mission.title_accent');
  const missionBody = useContentText('about.mission.body');
  const missionQuote = useContentText('about.mission.quote');
  const valuesEyebrow = useContentText('about.values.eyebrow', 'What we believe');
  const valuesTitle = useContentText('about.values.title');

  return (
    <main className="pt-6" data-testid="about-page">
      {/* Hero */}
      <section className="gradient-cream py-24 relative overflow-hidden">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-10 text-center relative">
          <div className="inline-flex items-center gap-2 bg-white/70 border border-[#EBD9CE] rounded-full px-4 py-1.5 mb-6">
            <Heart className="w-3.5 h-3.5 text-[#B4593F]" />
            <span className="text-[11px] uppercase tracking-[0.2em]">{heroEyebrow}</span>
          </div>
          <h1 className="font-serif-display text-5xl md:text-7xl leading-[1.05] text-[#213a60]">
            {heroTitle}{heroAccent && <><br /><span className="italic text-[#B4593F]">{heroAccent}</span></>}
          </h1>
          <p className="mt-6 text-lg text-neutral-700 max-w-2xl mx-auto leading-relaxed">
            {heroBody}
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-y border-[#EBD9CE] py-14">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i}>
                <Icon className="w-6 h-6 text-[#B4593F] mx-auto mb-3" />
                <div className="font-serif-display text-4xl text-[#213a60]">{s.num}</div>
                <div className="text-xs uppercase tracking-[0.2em] text-neutral-500 mt-1">{s.label}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Origin story */}
      <section className="py-24 bg-[#FDF3EB]">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-10 grid md:grid-cols-2 gap-14 items-center">
          <div className="aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl">
            <img
              src="https://images.unsplash.com/photo-1509440159596-0249088772ff?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"
              alt="Hands offering bread — the five loaves and two fish story"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.3em] text-[#B4593F] mb-3">{missionEyebrow}</div>
            <h2 className="font-serif-display text-4xl md:text-5xl leading-tight text-[#213a60]">{missionTitle}{missionAccent && <> <span className="italic">{missionAccent}</span></>}</h2>
            <div className="mt-6 text-neutral-700 leading-relaxed whitespace-pre-line space-y-4">
              {missionBody.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
            </div>
            <p className="mt-6 italic text-[#B4593F] font-serif-display text-2xl leading-snug border-l-4 border-[#B4593F]/40 pl-5">{missionQuote}</p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 bg-white">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
          <div className="text-center mb-14 max-w-2xl mx-auto">
            <div className="text-[11px] uppercase tracking-[0.3em] text-[#B4593F] mb-3">{valuesEyebrow}</div>
            <h2 className="font-serif-display text-4xl md:text-5xl text-[#213a60]">{valuesTitle}</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {values.map((v, i) => {
              const Icon = v.icon;
              return (
                <div key={i} className="bg-[#FDF3EB] rounded-2xl p-8 border border-[#EBD9CE] hover-lift transition-shadow">
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mb-5 border border-[#EBD9CE]">
                    <Icon className="w-5 h-5 text-[#B4593F]" />
                  </div>
                  <div className="font-serif-display text-2xl mb-3 text-[#213a60] leading-tight">{v.title}</div>
                  <p className="text-neutral-700 leading-relaxed text-sm">{v.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Partnerships */}
      {partnerships.length > 0 && (
        <section className="py-24 gradient-cream border-y border-[#EBD9CE]" data-testid="about-partnerships">
          <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
            <div className="text-center mb-14 max-w-2xl mx-auto">
              <div className="text-[11px] uppercase tracking-[0.3em] text-[#B4593F] mb-3">Partners in the mission</div>
              <h2 className="font-serif-display text-4xl md:text-5xl text-[#213a60]">Business is <span className="italic text-[#B4593F]">ministry</span></h2>
              <p className="mt-5 text-neutral-700 leading-relaxed">
                Our vision has always extended far beyond products. Through these collaborations, we&apos;re helping create sustainable opportunities through design, technology, training and skill development — empowering individuals, strengthening communities, and restoring dignity through meaningful work.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {partnerships.map((p) => {
                const slug = (p.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
                const hasWebsite = /^https?:/i.test(p.website || '');
                return (
                  <article
                    key={p.id}
                    data-testid={`partnership-${slug}`}
                    className="bg-white rounded-2xl border border-[#EBD9CE] overflow-hidden hover-lift transition-shadow flex flex-col"
                  >
                    {p.image ? (
                      <div className="aspect-[16/10] bg-[#FDF3EB] overflow-hidden">
                        <img src={resolveSrc(p.image)} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    ) : (
                      <div className="aspect-[16/10] bg-gradient-to-br from-[#FDF3EB] to-[#F5D0CE] flex items-center justify-center">
                        <Handshake className="w-10 h-10 text-[#B4593F]/40" />
                      </div>
                    )}
                    <div className="p-6 flex-1 flex flex-col">
                      <div className="font-serif-display text-xl text-[#213a60] leading-tight">{p.name}</div>
                      {p.location && <div className="text-[10px] uppercase tracking-[0.2em] text-[#B4593F] mt-1.5">{p.location}</div>}
                      {p.description && <p className="mt-4 text-sm text-neutral-700 leading-relaxed flex-1">{p.description}</p>}
                      {hasWebsite && (
                        <a
                          href={p.website}
                          target="_blank"
                          rel="noreferrer"
                          data-testid={`partnership-website-${slug}`}
                          className="mt-5 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-[#B4593F] hover:text-[#213a60] transition-colors self-start"
                        >
                          Visit website <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Looking forward */}
      <section className="py-24 bg-white">
        <div className="max-w-[900px] mx-auto px-6 lg:px-10 text-center">
          <div className="text-[11px] uppercase tracking-[0.3em] text-[#B4593F] mb-4">The journey continues</div>
          <h2 className="font-serif-display text-4xl md:text-5xl leading-tight text-[#213a60]">
            We believe this is <span className="italic text-[#B4593F]">only the beginning</span>
          </h2>
          <p className="mt-6 text-neutral-700 leading-relaxed text-lg">
            As God continues to open new doors, our prayer is that Wear The Hope will remain a faithful instrument in His hands — building lives before brands, creating hope before products, and carrying His love to people and nations for generations to come.
          </p>
        </div>
      </section>

      {/* Testimonial highlight (pulled live from Reviews) */}
      {featuredReview && (
        <section className="py-24 gradient-blush">
          <div className="max-w-[900px] mx-auto px-6 lg:px-10 text-center">
            <div className="text-[11px] uppercase tracking-[0.3em] text-[#B4593F] mb-4">Voices of our community</div>
            <p className="font-serif-display text-3xl md:text-4xl italic leading-relaxed text-[#213a60]">&ldquo;{featuredReview.text}&rdquo;</p>
            <div className="mt-8 inline-flex items-center gap-3">
              {featuredReview.avatar ? (
                <img src={featuredReview.avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[#FDF3EB] flex items-center justify-center text-[#B4593F] font-semibold">
                  {featuredReview.name?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              <div className="text-left">
                <div className="font-medium">{featuredReview.name}</div>
                <div className="text-xs text-neutral-600">{featuredReview.when || 'recently'}</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-24 bg-[#FDF3EB] text-center">
        <div className="max-w-[900px] mx-auto px-6 lg:px-10">
          <h3 className="font-serif-display text-4xl md:text-5xl leading-tight text-[#213a60]">Ready to <span className="italic text-[#B4593F]">wear the hope</span>?</h3>
          <p className="mt-4 text-neutral-700">Explore our full collection or reach out for custom orders. We&rsquo;d love to hear your story.</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link to="/shop" className="bg-[#213a60] hover:bg-[#B4593F] text-white px-7 py-4 rounded-full text-xs uppercase tracking-[0.2em] transition-colors">Shop Now</Link>
            <Link to="/contact" className="border border-[#213a60] text-[#213a60] px-7 py-4 rounded-full text-xs uppercase tracking-[0.2em] hover:bg-[#213a60] hover:text-white transition-colors">Get In Touch</Link>
          </div>
        </div>
      </section>
    </main>
  );
};

export default About;
