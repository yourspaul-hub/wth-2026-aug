import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Users, Globe2, Sparkles, Award } from 'lucide-react';
import { testimonials } from '../mock/mock';
import { useContentText } from '../context/ContentContext';

const stats = [
  { icon: Users, num: '10K+', label: 'Happy Customers' },
  { icon: Globe2, num: '25+', label: 'Countries Reached' },
  { icon: Award, num: '4.9★', label: 'Google Rating' },
  { icon: Sparkles, num: '180+', label: 'Unique Designs' },
];

const values = [
  { title: 'Faith First', desc: 'Every design begins with prayer and scripture. Our products are not just products — they are declarations.' },
  { title: 'Handcrafted Quality', desc: 'From sourcing materials to final packaging, we obsess over the details so that you can feel the love in every stitch.' },
  { title: 'Impact Driven', desc: 'A portion of every sale funds outreach and community programs across India and beyond.' },
];

const About = () => {
  const heroEyebrow = useContentText('about.hero.eyebrow');
  const heroTitle = useContentText('about.hero.title');
  const heroBody = useContentText('about.hero.body');
  const missionTitle = useContentText('about.mission.title');
  const missionBody = useContentText('about.mission.body');
  const valuesTitle = useContentText('about.values.title');
  const heroParts = heroTitle.split(' ');
  const heroMain = heroParts.length > 2 ? heroParts.slice(0, -2).join(' ') + ' ' : heroTitle;
  const heroAccent = heroParts.length > 2 ? heroParts.slice(-2).join(' ') : '';
  return (
    <main className="pt-6" data-testid="about-page">
      {/* Hero */}
      <section className="gradient-cream py-24 relative overflow-hidden">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-10 text-center relative">
          <div className="inline-flex items-center gap-2 bg-white/70 border border-[#EBD9CE] rounded-full px-4 py-1.5 mb-6">
            <Heart className="w-3.5 h-3.5 text-[#B4593F]" />
            <span className="text-[11px] uppercase tracking-[0.2em]">{heroEyebrow}</span>
          </div>
          <h1 className="font-serif-display text-5xl md:text-7xl leading-[1.05] text-[#1A1A1A]">
            {heroMain}<br />
            <span className="italic text-[#B4593F]">{heroAccent}</span>
          </h1>
          <p className="mt-6 text-lg text-neutral-700 max-w-2xl mx-auto">
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
                <div className="font-serif-display text-4xl text-[#1A1A1A]">{s.num}</div>
                <div className="text-xs uppercase tracking-[0.2em] text-neutral-500 mt-1">{s.label}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Mission */}
      <section className="py-24 bg-[#FDF3EB]">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-10 grid md:grid-cols-2 gap-14 items-center">
          <div className="aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl">
            <img src="https://images.unsplash.com/photo-1497621122273-f5cfb6065c56?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NjV8MHwxfHNlYXJjaHwxfHxiaWJsZXxlbnwwfHx8fDE3ODMzMjYxMTd8MA&ixlib=rb-4.1.0&q=85" alt="Mission" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.3em] text-[#B4593F] mb-3">Our Mission</div>
            <h2 className="font-serif-display text-4xl md:text-5xl leading-tight">{missionTitle}</h2>
            <p className="mt-6 text-neutral-700 leading-relaxed whitespace-pre-line">{missionBody}</p>
            <p className="mt-4 italic text-[#B4593F] font-serif-display text-2xl">“We sincerely hope our products will impact your life and those around you.”</p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 bg-white">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
          <div className="text-center mb-14">
            <div className="text-[11px] uppercase tracking-[0.3em] text-[#B4593F] mb-3">{valuesTitle}</div>
            <h2 className="font-serif-display text-4xl md:text-5xl">Values that shape everything we do</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {values.map((v, i) => (
              <div key={i} className="bg-[#FDF3EB] rounded-2xl p-8 border border-[#EBD9CE] hover-lift">
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mb-4 border border-[#EBD9CE]">
                  <span className="font-serif-display text-xl text-[#B4593F]">{i + 1}</span>
                </div>
                <div className="font-serif-display text-2xl mb-3">{v.title}</div>
                <p className="text-neutral-700 leading-relaxed text-sm">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial highlight */}
      <section className="py-24 gradient-blush">
        <div className="max-w-[900px] mx-auto px-6 lg:px-10 text-center">
          <div className="text-[11px] uppercase tracking-[0.3em] text-[#B4593F] mb-4">Voices of our community</div>
          <p className="font-serif-display text-3xl md:text-4xl italic leading-relaxed text-[#1A1A1A]">“{testimonials[1].text}”</p>
          <div className="mt-8 inline-flex items-center gap-3">
            <img src={testimonials[1].avatar} alt="" className="w-12 h-12 rounded-full" />
            <div className="text-left">
              <div className="font-medium">{testimonials[1].name}</div>
              <div className="text-xs text-neutral-600">{testimonials[1].when}</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-[#FDF3EB] text-center">
        <div className="max-w-[900px] mx-auto px-6 lg:px-10">
          <h3 className="font-serif-display text-4xl md:text-5xl leading-tight">Ready to <span className="italic text-[#B4593F]">wear the hope</span>?</h3>
          <p className="mt-4 text-neutral-700">Explore our full collection or reach out for custom orders. We’d love to hear your story.</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link to="/shop" className="bg-[#1A1A1A] hover:bg-[#B4593F] text-white px-7 py-4 rounded-full text-xs uppercase tracking-[0.2em] transition-colors">Shop Now</Link>
            <Link to="/contact" className="border border-[#1A1A1A] text-[#1A1A1A] px-7 py-4 rounded-full text-xs uppercase tracking-[0.2em] hover:bg-[#1A1A1A] hover:text-white transition-colors">Get In Touch</Link>
          </div>
        </div>
      </section>
    </main>
  );
};

export default About;
