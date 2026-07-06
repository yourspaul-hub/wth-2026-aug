import React, { useState } from 'react';
import { Mail, Phone, MapPin, Instagram, Send, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { brandInfo } from '../mock/mock';

const Contact = () => {
  const [form, setForm] = useState({ name: '', email: '', subject: 'General inquiry', message: '' });
  const submit = (e) => {
    e.preventDefault();
    toast.success("Thanks! We'll get back to you within 24 hours.");
    setForm({ name: '', email: '', subject: 'General inquiry', message: '' });
  };

  return (
    <main className="pt-6">
      <section className="gradient-cream py-20">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-10 text-center">
          <div className="text-[11px] uppercase tracking-[0.3em] text-[#B4593F] mb-3">We’d love to hear from you</div>
          <h1 className="font-serif-display text-5xl md:text-6xl">Get in <span className="italic">touch</span></h1>
          <p className="mt-4 text-neutral-700 max-w-xl mx-auto">Custom order, bulk enquiry, partnership or just to say hi — our inbox is always open.</p>
        </div>
      </section>

      <section className="py-20 bg-[#FDF3EB]">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-10 grid lg:grid-cols-5 gap-10">
          <div className="lg:col-span-2">
            <h2 className="font-serif-display text-3xl mb-6">Reach out directly</h2>
            <div className="space-y-5">
              {[
                { icon: Phone, l: 'Call / WhatsApp', v: brandInfo.phone },
                { icon: Mail, l: 'Email', v: brandInfo.email },
                { icon: MapPin, l: 'Studio', v: 'Mumbai, India — Ships worldwide' },
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
                  <span className="text-[11px] uppercase tracking-[0.2em] text-neutral-600">Your name</span>
                  <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-2 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-5 py-3 text-sm outline-none focus:border-[#B4593F] transition-colors" />
                </label>
                <label className="block">
                  <span className="text-[11px] uppercase tracking-[0.2em] text-neutral-600">Email</span>
                  <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="mt-2 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-5 py-3 text-sm outline-none focus:border-[#B4593F] transition-colors" />
                </label>
              </div>
              <label className="block mt-5">
                <span className="text-[11px] uppercase tracking-[0.2em] text-neutral-600">Subject</span>
                <select value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} className="mt-2 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-5 py-3 text-sm outline-none focus:border-[#B4593F] transition-colors">
                  <option>General inquiry</option>
                  <option>Bulk / Corporate order</option>
                  <option>Custom design request</option>
                  <option>Partnership</option>
                  <option>Feedback</option>
                </select>
              </label>
              <label className="block mt-5">
                <span className="text-[11px] uppercase tracking-[0.2em] text-neutral-600">Message</span>
                <textarea required rows="5" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} className="mt-2 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-2xl px-5 py-4 text-sm outline-none focus:border-[#B4593F] transition-colors resize-none" />
              </label>
              <button type="submit" className="mt-6 inline-flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#B4593F] transition-colors text-white px-7 py-3.5 rounded-full text-xs uppercase tracking-[0.2em]">
                <Send className="w-4 h-4" /> Send Message
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Contact;
