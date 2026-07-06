import React from 'react';
import { Link } from 'react-router-dom';

const USBanner = () => {
  return (
    <section className="bg-[#FFDD00] py-6 relative overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 flex flex-wrap items-center justify-center gap-6 text-center">
        <p className="font-serif-display text-2xl md:text-3xl text-[#1A1A1A] italic">Explore our US partner website</p>
        <a href="https://www.wearthehope.us/" target="_blank" rel="noreferrer" className="bg-[#1A1A1A] hover:bg-[#B4593F] text-white px-7 py-3 rounded-full text-xs uppercase tracking-[0.2em] transition-colors">
          Click Here
        </a>
      </div>
    </section>
  );
};

export default USBanner;
