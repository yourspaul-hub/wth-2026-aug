import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

// Shared shell for the long-form policy pages so all three feel like a set.
const LegalPage = ({ eyebrow, title, effective, updated, children }) => {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, []);
  return (
    <main className="pb-24">
      <div className="bg-gradient-to-b from-[#F5D0CE]/40 to-[#FDF3EB] py-16 border-b border-[#EBD9CE]/60">
        <div className="max-w-3xl mx-auto px-6 lg:px-10">
          <nav className="text-[11px] uppercase tracking-[0.2em] text-neutral-500 mb-4">
            <Link to="/" className="hover:text-[#B4593F]">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-[#B4593F]">{eyebrow}</span>
          </nav>
          <div className="text-[11px] uppercase tracking-[0.3em] text-[#B4593F]">{eyebrow}</div>
          <h1 className="font-serif-display text-5xl md:text-6xl text-[#213a60] mt-2">{title}</h1>
          {(effective || updated) && (
            <p className="text-xs text-neutral-500 uppercase tracking-widest mt-4 space-x-4">
              {effective && <span>Effective: {effective}</span>}
              {updated && <span>Last updated: {updated}</span>}
            </p>
          )}
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-6 lg:px-10 py-12 legal-content text-[15px] leading-relaxed text-neutral-800">
        {children}
      </div>
      <style>{`
        .legal-content h2 { font-family: 'Cormorant Garamond', serif; font-size: 1.75rem; color: #213a60; margin-top: 2.5rem; margin-bottom: 0.75rem; }
        .legal-content h3 { font-weight: 600; font-size: 1rem; color: #213a60; margin-top: 1.5rem; margin-bottom: 0.5rem; }
        .legal-content p { margin: 0.75rem 0; }
        .legal-content ul { list-style: disc; padding-left: 1.25rem; margin: 0.5rem 0 1rem; }
        .legal-content li { margin: 0.25rem 0; }
        .legal-content strong { color: #213a60; }
        .legal-content a { color: #B4593F; text-decoration: underline; }
      `}</style>
    </main>
  );
};

export default LegalPage;
