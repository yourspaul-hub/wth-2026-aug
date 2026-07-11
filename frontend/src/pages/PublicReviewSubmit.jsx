import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { submitPublicReview } from '../lib/api';
import { Star, Check, ArrowRight } from 'lucide-react';

const PublicReviewSubmit = () => {
  const [form, setForm] = useState({ name: '', rating: 5, text: '', email: '' });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (form.text.trim().length < 5) return;
    setSubmitting(true); setErr(null);
    try { await submitPublicReview(form); setSubmitted(true); }
    catch (e2) { setErr(e2?.response?.data?.detail || 'Submission failed'); }
    finally { setSubmitting(false); }
  };

  if (submitted) {
    return (
      <main className="min-h-[80vh] flex items-center justify-center px-6 py-16" data-testid="public-review-success">
        <div className="max-w-md w-full text-center bg-white rounded-2xl border border-[#EBD9CE] p-10 shadow-[0_20px_60px_-30px_rgba(180,89,63,0.35)]">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="font-serif-display text-3xl mb-3">Thank you 💛</h1>
          <p className="text-neutral-700">Your review is submitted and will appear after a quick moderation check.</p>
          <Link to="/" className="mt-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#B4593F]">
            Continue browsing <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[80vh] bg-[#FDF3EB] py-12" data-testid="public-review-form">
      <div className="max-w-lg mx-auto px-6">
        <div className="text-center mb-8">
          <div className="text-[11px] uppercase tracking-[0.3em] text-[#B4593F] mb-2">Wear The Hope</div>
          <h1 className="font-serif-display text-4xl">Leave us a review</h1>
          <p className="mt-3 text-sm text-neutral-600">Your words help other believers discover us. It takes less than a minute.</p>
        </div>

        <form onSubmit={submit} className="bg-white rounded-2xl border border-[#EBD9CE] p-6 md:p-8 space-y-5 shadow-[0_20px_60px_-30px_rgba(180,89,63,0.3)]">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-neutral-500 mb-2 text-center">Your rating</div>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" onClick={() => setForm({ ...form, rating: n })} className="p-1 transition-transform hover:scale-110" data-testid={`star-${n}`}>
                  <Star className={`w-8 h-8 ${n <= form.rating ? 'fill-[#F5B342] text-[#F5B342]' : 'text-neutral-300'}`} />
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="text-[11px] uppercase tracking-widest text-neutral-500">Your name</span>
            <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-2 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-5 py-3 text-sm outline-none focus:border-[#B4593F]" data-testid="public-review-name" />
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-widest text-neutral-500">Email (optional)</span>
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="mt-2 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-5 py-3 text-sm outline-none focus:border-[#B4593F]" />
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-widest text-neutral-500">Tell us more</span>
            <textarea required rows="5" value={form.text} onChange={e => setForm({ ...form, text: e.target.value })} className="mt-2 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-2xl px-5 py-4 text-sm outline-none focus:border-[#B4593F] resize-none" data-testid="public-review-text" placeholder="What did you love?" />
          </label>

          {err && <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{err}</div>}

          <button type="submit" disabled={submitting || form.text.trim().length < 5} data-testid="public-review-submit" className="w-full bg-[#213a60] hover:bg-[#B4593F] disabled:bg-neutral-300 text-white uppercase tracking-[0.2em] text-xs px-6 py-3.5 rounded-full transition-colors">
            {submitting ? 'Submitting…' : 'Submit Review'}
          </button>
        </form>
      </div>
    </main>
  );
};

export default PublicReviewSubmit;
