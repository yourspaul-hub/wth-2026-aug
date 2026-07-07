import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Facebook, Youtube, Mail, Phone, MapPin, Send } from 'lucide-react';
import { categories, brandInfo } from '../mock/mock';
import { subscribeNewsletter, publicGenericQrImageUrl } from '../lib/api';
import { toast } from 'sonner';
import Logo from './Logo';

const Footer = () => {
  const [email, setEmail] = useState('');
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

  return (
    <footer className="bg-[#1A1A1A] text-[#FDF3EB] pt-20 pb-10 mt-10">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        {/* Newsletter */}
        <div className="grid md:grid-cols-2 gap-10 items-center pb-14 border-b border-white/10">
          <div>
            <h3 className="font-serif-display text-3xl md:text-4xl leading-tight">Join our journey of <span className="italic text-[#E88864]">hope</span></h3>
            <p className="mt-3 text-white/70 max-w-md">Subscribe for scripture drops, new collections and exclusive gifts — straight to your inbox.</p>
          </div>
          <form onSubmit={subscribe} className="flex items-center bg-white/10 border border-white/20 rounded-full pl-6 pr-2 py-2 focus-within:border-[#E88864] transition-colors">
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email" className="flex-1 bg-transparent outline-none text-sm placeholder:text-white/50 py-2 min-w-0" />
            <button type="submit" className="shrink-0 bg-[#B4593F] hover:bg-[#E88864] transition-colors text-white px-4 md:px-5 py-3 rounded-full text-xs uppercase tracking-[0.2em] inline-flex items-center gap-2">
              <Send className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Subscribe</span>
            </button>
          </form>
        </div>

        {/* Global review QR — scan to leave a review */}
        <div className="py-14 border-b border-white/10 grid md:grid-cols-[auto_1fr] gap-8 items-center" data-testid="footer-review-qr">
          <div className="bg-white p-3 rounded-xl w-max mx-auto md:mx-0">
            <img src={publicGenericQrImageUrl()} alt="Scan to leave a review" className="w-32 h-32 md:w-36 md:h-36" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-[#E88864] mb-2">Share your story</div>
            <h3 className="font-serif-display text-2xl md:text-3xl leading-tight">Loved your Wear The Hope piece? <span className="italic text-[#E88864]">Tell the world.</span></h3>
            <p className="mt-3 text-white/70 text-sm max-w-md leading-relaxed">Scan the QR — or use the link below — to leave a review. Your words help other believers find us.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link to="/review" data-testid="footer-review-link" className="inline-flex items-center gap-2 bg-[#B4593F] hover:bg-[#E88864] transition-colors text-white px-5 py-2.5 rounded-full text-xs uppercase tracking-[0.2em]">
                Leave a review
              </Link>
              <a href="https://www.instagram.com/wearthehope" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-colors text-white px-5 py-2.5 rounded-full text-xs uppercase tracking-[0.2em]">
                <Instagram className="w-3.5 h-3.5" /> Tag @wearthehope
              </a>
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="grid md:grid-cols-4 gap-10 py-14">
          <div>
            <Logo variant="light" className="h-9 mb-4" />
            <p className="text-white/70 text-sm leading-relaxed max-w-xs">A motivational gift brand — declaring love and hope through everyday products. Handcrafted with intention since 2018.</p>
            <div className="flex items-center gap-3 mt-6">
              <a href={brandInfo.instagram} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-white/10 hover:bg-[#B4593F] flex items-center justify-center transition-colors"><Instagram className="w-4 h-4" /></a>
              <a href="#" onClick={e => e.preventDefault()} className="w-10 h-10 rounded-full bg-white/10 hover:bg-[#B4593F] flex items-center justify-center transition-colors"><Facebook className="w-4 h-4" /></a>
              <a href="#" onClick={e => e.preventDefault()} className="w-10 h-10 rounded-full bg-white/10 hover:bg-[#B4593F] flex items-center justify-center transition-colors"><Youtube className="w-4 h-4" /></a>
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-[#E88864] mb-5">Shop</div>
            <ul className="space-y-3 text-sm text-white/80">
              {categories.slice(0,6).map(c => (
                <li key={c.id}><Link to={`/shop/${c.slug}`} className="hover:text-[#E88864] transition-colors">{c.name}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-[#E88864] mb-5">Company</div>
            <ul className="space-y-3 text-sm text-white/80">
              <li><Link to="/about" className="hover:text-[#E88864] transition-colors">Our Story</Link></li>
              <li><Link to="/contact" className="hover:text-[#E88864] transition-colors">Contact Us</Link></li>
              <li><a href="#" onClick={e => e.preventDefault()} className="hover:text-[#E88864] transition-colors">Size Guide</a></li>
              <li><a href="#" onClick={e => e.preventDefault()} className="hover:text-[#E88864] transition-colors">Terms & Conditions</a></li>
              <li><a href="#" onClick={e => e.preventDefault()} className="hover:text-[#E88864] transition-colors">Privacy Policy</a></li>
              <li><a href="#" onClick={e => e.preventDefault()} className="hover:text-[#E88864] transition-colors">Refund & Cancellation</a></li>
            </ul>
          </div>

          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-[#E88864] mb-5">Contact</div>
            <ul className="space-y-4 text-sm text-white/80">
              <li className="flex items-start gap-3"><Phone className="w-4 h-4 mt-0.5 text-[#E88864]" /> {brandInfo.phone}</li>
              <li className="flex items-start gap-3"><Mail className="w-4 h-4 mt-0.5 text-[#E88864]" /> {brandInfo.email}</li>
              <li className="flex items-start gap-3"><MapPin className="w-4 h-4 mt-0.5 text-[#E88864]" /> Mumbai, India — Ships Worldwide</li>
            </ul>
            <a href={brandInfo.usPartner} target="_blank" rel="noreferrer" className="mt-6 inline-block bg-[#FFDD00] text-[#1A1A1A] px-5 py-2.5 rounded-full text-[11px] uppercase tracking-[0.2em] hover:bg-white transition-colors">Visit US Partner</a>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs text-white/50">
          <div>© {new Date().getFullYear()} Wear The Hope. All rights reserved.</div>
          <div>Handcrafted with love in India — Shipping Worldwide</div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
