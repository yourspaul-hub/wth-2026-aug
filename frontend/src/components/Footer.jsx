import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Facebook, Youtube, Mail, Phone, MapPin, Send } from 'lucide-react';
import { subscribeNewsletter, publicGenericQrImageUrl } from '../lib/api';
import { toast } from 'sonner';
import Logo from './Logo';
import { useContentText } from '../context/ContentContext';
import { useCategories } from '../hooks/useCategories';

const Footer = () => {
  const [email, setEmail] = useState('');
  const { items: categories } = useCategories();
  const T = {
    newsTitle: useContentText('footer.newsletter.title'),
    newsTitleAccent: useContentText('footer.newsletter.title_accent'),
    newsSub: useContentText('footer.newsletter.subtitle'),
    newsPh: useContentText('footer.newsletter.placeholder'),
    newsCta: useContentText('footer.newsletter.cta'),
    revEyebrow: useContentText('footer.review.eyebrow'),
    revTitle: useContentText('footer.review.title'),
    revTitleAccent: useContentText('footer.review.title_accent'),
    revBody: useContentText('footer.review.body'),
    revCta: useContentText('footer.review.cta'),
    revIg: useContentText('footer.review.instagram'),
    tagline: useContentText('footer.tagline'),
    colShop: useContentText('footer.col.shop'),
    colCompany: useContentText('footer.col.company'),
    colContact: useContentText('footer.col.contact'),
    story: useContentText('footer.links.story'),
    contactLink: useContentText('footer.links.contact'),
    size: useContentText('footer.links.size'),
    terms: useContentText('footer.links.terms'),
    privacy: useContentText('footer.links.privacy'),
    refund: useContentText('footer.links.refund'),
    location: useContentText('footer.contact.location'),
    email: useContentText('footer.contact.email'),
    phone: useContentText('footer.contact.phone'),
    instagram: useContentText('footer.social.instagram_url', 'https://www.instagram.com/wearthehope.co/'),
    usPartner: useContentText('footer.us_partner.cta'),
    usPartnerUrl: useContentText('footer.us_partner.url', 'https://wearthehope.co/'),
    copyright: useContentText('footer.legal.copyright'),
    made: useContentText('footer.legal.made'),
  };
  const subscribe = async (e) => {
    e.preventDefault();
    if (!email) return;
    try {
      const r = await subscribeNewsletter(email);
      toast.success(r.already ? "You're already subscribed!" : "You're subscribed! Watch out for hope in your inbox.");
      setEmail('');
    } catch {
      toast.error('Subscription failed. Try again.');
    }
  };

  // Newsletter title with optional italic accent
  const newsTitleAccent = T.newsTitleAccent;
  const newsMain = T.newsTitle;

  // Review title with optional italic accent
  const revTitleAccent = T.revTitleAccent;
  const revMain = T.revTitle;

  return (
    <footer className="bg-[#1A1A1A] text-[#FDF3EB] pt-20 pb-10 mt-10" data-testid="site-footer">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        {/* Newsletter */}
        <div className="grid md:grid-cols-2 gap-10 items-center pb-14 border-b border-white/10">
          <div>
            <h3 className="font-serif-display text-3xl md:text-4xl leading-tight">{newsMain}{newsTitleAccent && <> <span className="italic text-[#E88864]">{newsTitleAccent}</span></>}</h3>
            <p className="mt-3 text-white/70 max-w-md">{T.newsSub}</p>
          </div>
          <form onSubmit={subscribe} className="flex items-center bg-white/10 border border-white/20 rounded-full pl-6 pr-2 py-2 focus-within:border-[#E88864] transition-colors">
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder={T.newsPh} className="flex-1 bg-transparent outline-none text-sm placeholder:text-white/50 py-2 min-w-0" />
            <button type="submit" className="shrink-0 bg-[#B4593F] hover:bg-[#E88864] transition-colors text-white px-4 md:px-5 py-3 rounded-full text-xs uppercase tracking-[0.2em] inline-flex items-center gap-2">
              <Send className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{T.newsCta}</span>
            </button>
          </form>
        </div>

        {/* Global review QR — scan to leave a review */}
        <div className="py-14 border-b border-white/10 grid md:grid-cols-[auto_1fr] gap-8 items-center" data-testid="footer-review-qr">
          <div className="bg-white p-3 rounded-xl w-max mx-auto md:mx-0">
            <img src={publicGenericQrImageUrl()} alt="Scan to leave a review" className="w-32 h-32 md:w-36 md:h-36" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-[#E88864] mb-2">{T.revEyebrow}</div>
            <h3 className="font-serif-display text-2xl md:text-3xl leading-tight">{revMain}{revTitleAccent && <> <span className="italic text-[#E88864]">{revTitleAccent}</span></>}</h3>
            <p className="mt-3 text-white/70 text-sm max-w-md leading-relaxed">{T.revBody}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link to="/review" data-testid="footer-review-link" className="inline-flex items-center gap-2 bg-[#B4593F] hover:bg-[#E88864] transition-colors text-white px-5 py-2.5 rounded-full text-xs uppercase tracking-[0.2em]">
                {T.revCta}
              </Link>
              <a href="https://www.instagram.com/wearthehope" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-colors text-white px-5 py-2.5 rounded-full text-xs uppercase tracking-[0.2em]">
                <Instagram className="w-3.5 h-3.5" /> {T.revIg}
              </a>
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="grid md:grid-cols-4 gap-10 py-14">
          <div>
            <Logo variant="light" withTagline className="h-12 mb-4" />
            <p className="text-white/70 text-sm leading-relaxed max-w-xs">{T.tagline}</p>
            <div className="flex items-center gap-3 mt-6">
              <a href={T.instagram} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-white/10 hover:bg-[#B4593F] flex items-center justify-center transition-colors"><Instagram className="w-4 h-4" /></a>
              <a href="#" onClick={e => e.preventDefault()} className="w-10 h-10 rounded-full bg-white/10 hover:bg-[#B4593F] flex items-center justify-center transition-colors"><Facebook className="w-4 h-4" /></a>
              <a href="#" onClick={e => e.preventDefault()} className="w-10 h-10 rounded-full bg-white/10 hover:bg-[#B4593F] flex items-center justify-center transition-colors"><Youtube className="w-4 h-4" /></a>
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-[#E88864] mb-5">{T.colShop}</div>
            <ul className="space-y-3 text-sm text-white/80">
              {categories.slice(0,6).map(c => (
                <li key={c.id}><Link to={`/shop/${c.slug}`} className="hover:text-[#E88864] transition-colors">{c.name}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-[#E88864] mb-5">{T.colCompany}</div>
            <ul className="space-y-3 text-sm text-white/80">
              <li><Link to="/about" className="hover:text-[#E88864] transition-colors">{T.story}</Link></li>
              <li><Link to="/contact" className="hover:text-[#E88864] transition-colors">{T.contactLink}</Link></li>
              <li><a href="#" onClick={e => e.preventDefault()} className="hover:text-[#E88864] transition-colors">{T.size}</a></li>
              <li><a href="#" onClick={e => e.preventDefault()} className="hover:text-[#E88864] transition-colors">{T.terms}</a></li>
              <li><a href="#" onClick={e => e.preventDefault()} className="hover:text-[#E88864] transition-colors">{T.privacy}</a></li>
              <li><a href="#" onClick={e => e.preventDefault()} className="hover:text-[#E88864] transition-colors">{T.refund}</a></li>
            </ul>
          </div>

          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-[#E88864] mb-5">{T.colContact}</div>
            <ul className="space-y-4 text-sm text-white/80">
              <li className="flex items-start gap-3"><Phone className="w-4 h-4 mt-0.5 text-[#E88864]" /> {T.phone}</li>
              <li className="flex items-start gap-3"><Mail className="w-4 h-4 mt-0.5 text-[#E88864]" /> {T.email}</li>
              <li className="flex items-start gap-3"><MapPin className="w-4 h-4 mt-0.5 text-[#E88864]" /> {T.location}</li>
            </ul>
            <a href={T.usPartnerUrl} target="_blank" rel="noreferrer" className="mt-6 inline-block bg-[#FFDD00] text-[#1A1A1A] px-5 py-2.5 rounded-full text-[11px] uppercase tracking-[0.2em] hover:bg-white transition-colors">{T.usPartner}</a>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs text-white/50">
          <div>{T.copyright.replace('{year}', String(new Date().getFullYear()))}</div>
          <div>{T.made}</div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
