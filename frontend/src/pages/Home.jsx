import React from 'react';
import Hero from '../components/Hero';
import Categories from '../components/Categories';
import FeaturedProducts from '../components/FeaturedProducts';
import USBanner from '../components/USBanner';
import InstagramFeed from '../components/InstagramFeed';
import Testimonials from '../components/Testimonials';
import ReviewsSection from '../components/ReviewsSection';
import AboutStory from '../components/AboutStory';
import { Truck, Sparkles, ShieldCheck, RefreshCw } from 'lucide-react';

const FeatureStrip = () => (
  <section className="bg-white border-y border-[#EBD9CE]">
    <div className="max-w-[1400px] mx-auto px-6 lg:px-10 grid grid-cols-2 md:grid-cols-4 gap-6 py-10">
      {[
        { icon: Truck, title: 'Ships Worldwide', sub: 'Free over ₹999 in India' },
        { icon: Sparkles, title: 'Fully Customizable', sub: 'Laser engraving on request' },
        { icon: ShieldCheck, title: 'Handcrafted Quality', sub: 'Every item checked twice' },
        { icon: RefreshCw, title: 'Easy Returns', sub: '7-day hassle-free returns' },
      ].map((f, i) => {
        const Icon = f.icon;
        return (
          <div key={i} className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-[#FDF3EB] flex items-center justify-center border border-[#EBD9CE]">
              <Icon className="w-5 h-5 text-[#B4593F]" />
            </div>
            <div>
              <div className="text-sm font-medium text-[#1A1A1A]">{f.title}</div>
              <div className="text-[11px] text-neutral-500 mt-0.5">{f.sub}</div>
            </div>
          </div>
        );
      })}
    </div>
  </section>
);

const Home = () => {
  return (
    <main>
      <Hero />
      <FeatureStrip />
      <Categories />
      <FeaturedProducts title="Bestsellers" subtitle="Handpicked for you" limit={8} />
      <AboutStory />
      <InstagramFeed />
      <USBanner />
      <ReviewsSection />
      <Testimonials />
      <FeaturedProducts title="New Arrivals" subtitle="Fresh in this month" filter={(p) => p.tag === 'New' || p.tag === 'Trending' || p.tag === 'Signature'} limit={4} viewAllHref="/shop" />
    </main>
  );
};

export default Home;
