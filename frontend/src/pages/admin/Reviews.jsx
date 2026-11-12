import React, { useState } from 'react';
import ReviewsListTab from './ReviewsListTab';
import ReviewsQrTab from './ReviewsQrTab';
import { Star, QrCode } from 'lucide-react';

const AdminReviews = () => {
  const [tab, setTab] = useState('reviews');
  const tabs = [
    { key: 'reviews', label: 'All Reviews', icon: Star },
    { key: 'qr', label: 'QR Codes', icon: QrCode },
  ];
  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif-display text-4xl">Reviews Hub</h1>
        <p className="text-sm text-neutral-600 mt-1">Manage manual and QR-submitted reviews in one place.</p>
      </div>
      <div className="flex gap-2 mb-6 border-b border-[#EBD9CE]">
        {tabs.map(t => {
          const I = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              data-testid={`tab-${t.key}`}
              className={`inline-flex items-center gap-2 px-5 py-3 text-xs uppercase tracking-widest border-b-2 transition-colors ${active ? 'border-[#B4593F] text-[#B4593F]' : 'border-transparent text-neutral-500 hover:text-[#213a60]'}`}
            >
              <I className="w-3.5 h-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'reviews' && <ReviewsListTab />}
      {tab === 'qr' && <ReviewsQrTab />}
    </div>
  );
};

export default AdminReviews;
