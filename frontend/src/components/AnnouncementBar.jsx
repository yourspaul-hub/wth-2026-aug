import React from 'react';
import { Truck, Sparkles, Gift } from 'lucide-react';
import { useContentText } from '../context/ContentContext';

const icons = [Truck, Sparkles, Gift, Truck];

const AnnouncementBar = () => {
  const items = [
    useContentText('announcement.item.1'),
    useContentText('announcement.item.2'),
    useContentText('announcement.item.3'),
    useContentText('announcement.item.4'),
  ].map((text, i) => ({ icon: icons[i], text })).filter(it => it.text);

  if (items.length === 0) return null;

  return (
    <div className="w-full bg-[#213a60] text-[#FDF3EB] overflow-hidden text-xs tracking-wider py-2.5 border-b border-black/20" data-testid="announcement-bar">
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
