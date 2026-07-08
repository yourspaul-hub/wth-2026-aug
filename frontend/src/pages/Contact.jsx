import React, { useEffect, useState } from 'react';
import { Mail, Phone, MapPin, Instagram, Send, Clock, ExternalLink, Star } from 'lucide-react';
import { toast } from 'sonner';
import { brandInfo } from '../mock/mock';
import { listLocations } from '../lib/api';
import { useContentText } from '../context/ContentContext';

const Contact = () => {
  const [form, setForm] = useState({ name: '', email: '', subject: 'General inquiry', message: '' });
  const [locations, setLocations] = useState([]);
  const title = useContentText('contact.title');
  const titleAccent = useContentText('contact.title_accent');
  const subtitle = useContentText('contact.subtitle');
  const eyebrow = useContentText('contact.eyebrow', "We'd love to hear from you");
  const locTitle = useContentText('contact.locations.title');
  const locTitleAccent = useContentText('contact.locations.title_accent');
  const fName = useContentText('contact.form.name');
  const fEmail = useContentText('contact.form.email');
  const fMsg = useContentText('contact.form.message');
  const fSubmit = useContentText('contact.form.submit');

  useEffect(() => {
    listLocations().then(setLocations).catch(() => setLocations([]));
  }, []);

  const submit = (e) => {
    e.preventDefault();
    toast.success("Thanks! We'll get back to you within 24 hours.");
    setForm({ name: '', email: '', subject: 'General inquiry', message: '' });
  };

  return (
    <main className="pt-6" data-testid="contact-page">
      <section className="gradient-cream py-20">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-10 text-center">
          <div className="text-[11px] uppercase tracking-[0.3em] text-[#B4593F] mb-3">{eyebrow}</div>
          <h1 className="font-serif-display text-5xl md:text-6xl">{title}{titleAccent && <> <span className="italic">{titleAccent}</span></>}</h1>
          <p className="mt-4 text-neutral-700 max-w-xl mx-auto">{subtitle}</p>
        </div>
      </section>

      {locations.length > 0 && (
        <section className="py-20 bg-white" data-testid="locations-section">
          <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
            <div className="text-center mb-12">
              <div className="text-[11px] uppercase tracking-[0.3em] text-[#B4593F] mb-3">Find us</div>
              <h2 className="font-serif-display text-4xl md:text-5xl">{locTitle}{locTitleAccent && <> <span className="italic">{locTitleAccent}</span></>}</h2>
              <p className="mt-3 text-sm text-neutral-600 max-w-md mx-auto">Visit our design studio, drop by our registered office, or simply write to us — we ship worldwide.</p>
            </div>

            <div className={`grid gap-6 ${locations.length === 1 ? 'md:grid-cols-1 max-w-xl mx-auto' : locations.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
              {locations.map((loc) => (
                <div
                  key={loc.id}
                  data-testid={`location-card-${loc.id}`}
                  className="relative bg-[#FDF3EB] rounded-2xl border border-[#EBD9CE] p-8 hover-lift transition-shadow hover:shadow-[0_20px_60px_-30px_rgba(180,89,63,0.35)]"
                >
                  {loc.is_primary && (
                    <div className="absolute top-5 right-5 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.2em] bg-[#B4593F] text-white px-3 py-1 rounded-full">
                      <Star className="w-3 h-3 fill-current" /> Primary
                    </div>
                  )}
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center border border-[#EBD9CE] mb-5">
                    <MapPin className="w-5 h-5 text-[#B4593F]" />
                  </div>
                  <div className="text-[11px] uppercase tracking-[0.3em] text-[#B4593F] mb-2">{loc.label}</div>
                  <h3 className="font-serif-display text-2xl leading-tight mb-3">{loc.name || 'Wear The Hope'}</h3>

                  <address className="not-italic text-sm text-neutral-700 leading-relaxed">
                    {(loc.address_lines || []).map((line, i) => <div key={i}>{line}</div>)}
                    <div>{[loc.city, loc.state].filter(Boolean).join(', ')}{loc.pincode ? ` ${loc.pincode}` : ''}</div>
                    <div>{loc.country}</div>
                  </address>

                  <div className="mt-5 space-y-2 text-sm">
                    {loc.whatsapp && (
                      <a href={`https://wa.me/${loc.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-neutral-700 hover:text-[#B4593F] transition-colors">
                        <Phone className="w-3.5 h-3.5 text-[#B4593F]" /> WhatsApp {loc.whatsapp}
                      </a>
                    )}
                    {loc.phone && loc.phone !== loc.whatsapp && (
                      <a href={`tel:${loc.phone}`} className="flex items-center gap-2 text-neutral-700 hover:text-[#B4593F] transition-colors">
                        <Phone className="w-3.5 h-3.5 text-[#B4593F]" /> {loc.phone}
                      </a>
                    )}
                    {loc.email && (
                      <a href={`mailto:${loc.email}`} className="flex items-center gap-2 text-neutral-700 hover:text-[#B4593F] transition-colors break-all">
                        <Mail className="w-3.5 h-3.5 text-[#B4593F]" /> {loc.email}
                      </a>
                    )}
                    {loc.hours && (
                      <div className="flex items-center gap-2 text-neutral-600">
                        <Clock className="w-3.5 h-3.5 text-[#B4593F]" /> {loc.hours}
                      </div>
                    )}
                  </div>

                  {loc.map_url && (
                    <a
                      href={loc.map_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#B4593F] hover:underline"
                    >
                      View on map <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-20 bg-[#FDF3EB]">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-10 grid lg:grid-cols-5 gap-10">
          <div className="lg:col-span-2">
            <h2 className="font-serif-display text-3xl mb-6">Reach out directly</h2>
            <div className="space-y-5">
              {[
                { icon: Phone, l: 'Call / WhatsApp', v: brandInfo.phone },
                { icon: Mail, l: 'Email', v: brandInfo.email },
                { icon: Instagram, l: 'Instagram', v: '@wearthehope' },
                { icon: Clock, l: 'Hours', v: 'Mon–Sat, 10 AM – 7 PM IST' },
              ].map((c, i) => {
                const I = c.icon;
                return (
                  <div key={i} className="flex items-start gap-4 p-5 bg-white rounded-xl border border-[#EBD9CE] hover-lift">
                    <div className="w-10 h-10 rounded-full bg-[#FDF3EB] flex items-center justify-center border border-[#EBD9CE] shrink-0">
                      <I className="w-4 h-4 text-[#B4593F]" />
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">{c.l}</div>
                      <div className="text-sm font-medium mt-1">{c.v}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-3">
            <form onSubmit={submit} className="bg-white rounded-2xl p-8 md:p-10 border border-[#EBD9CE] shadow-[0_20px_60px_-30px_rgba(180,89,63,0.3)]">
              <div className="grid md:grid-cols-2 gap-5">
                <label className="block">
                  <span className="text-[11px] uppercase tracking-[0.2em] text-neutral-600">{fName}</span>
                  <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} data-testid="contact-name-input" className="mt-2 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-5 py-3 text-sm outline-none focus:border-[#B4593F] transition-colors" />
                </label>
                <label className="block">
                  <span className="text-[11px] uppercase tracking-[0.2em] text-neutral-600">{fEmail}</span>
                  <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} data-testid="contact-email-input" className="mt-2 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-5 py-3 text-sm outline-none focus:border-[#B4593F] transition-colors" />
                </label>
              </div>
              <label className="block mt-5">
                <span className="text-[11px] uppercase tracking-[0.2em] text-neutral-600">Subject</span>
                <select value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} data-testid="contact-subject-select" className="mt-2 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-5 py-3 text-sm outline-none focus:border-[#B4593F] transition-colors">
                  <option>General inquiry</option>
                  <option>Bulk / Corporate order</option>
                  <option>Custom design request</option>
                  <option>Partnership</option>
                  <option>Feedback</option>
                </select>
              </label>
              <label className="block mt-5">
                <span className="text-[11px] uppercase tracking-[0.2em] text-neutral-600">{fMsg}</span>
                <textarea required rows="5" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} data-testid="contact-message-input" className="mt-2 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-2xl px-5 py-4 text-sm outline-none focus:border-[#B4593F] transition-colors resize-none" />
              </label>
              <button type="submit" data-testid="contact-submit-btn" className="mt-6 inline-flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#B4593F] transition-colors text-white px-7 py-3.5 rounded-full text-xs uppercase tracking-[0.2em]">
                <Send className="w-4 h-4" /> {fSubmit}
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Contact;
