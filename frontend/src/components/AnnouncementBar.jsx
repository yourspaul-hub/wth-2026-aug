import React from 'react';
import { Truck, Sparkles, Gift } from 'lucide-react';

const items = [
  { icon: Truck, text: 'Free shipping over ₹999 across India' },
  { icon: Sparkles, text: 'Personalize any product — laser engraving available' },
  { icon: Gift, text: 'New Faith Cap Collection is live — shop now' },
  { icon: Truck, text: 'International shipping worldwide' },
];

const AnnouncementBar = () => {
  return (
    <div className="w-full bg-[#1A1A1A] text-[#FDF3EB] overflow-hidden text-xs tracking-wider py-2.5 border-b border-black/20">
      <div className="flex whitespace-nowrap animate-marquee">
        {[...items, ...items, ...items].map((it, idx) => {
          const Icon = it.icon;
          return (
            <span key={idx} className="inline-flex items-center gap-2 px-8 uppercase">
              <Icon className="w-3.5 h-3.5 text-[#E88864]" />
              {it.text}
              <span className="opacity-40 pl-6">•</span>
            </span>
          );
        })}
      </div>
    </div>
  );
};

export default AnnouncementBar;
