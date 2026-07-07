import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getQrReviewContext, submitQrReview } from '../lib/api';
import { Star, Check, XCircle, ArrowRight } from 'lucide-react';

const QrReviewSubmit = () => {
  const { token } = useParams();
  const [ctx, setCtx] = useState(null);
  const [err, setErr] = useState(null);
  const [form, setForm] = useState({ name: '', rating: 5, text: '', email: '' });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getQrReviewContext(token).then(c => {
      setCtx(c);
      if (c.customer_name && !form.name) setForm(f => ({ ...f, name: c.customer_name }));
      if (c.customer_email && !form.email) setForm(f => ({ ...f, email: c.customer_email }));
    }).catch(e => setErr(e?.response?.data?.detail || 'Could not load this review link.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    if (form.text.trim().length < 5) return;
    setSubmitting(true);
    try {
      await submitQrReview(token, form);
      setSubmitted(true);
    } catch (e2) {
      setErr(e2?.response?.data?.detail || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (err) {
    return (
      <main className="min-h-[80vh] flex items-center justify-center px-6 py-16" data-testid="qr-review-error">
        <div className="max-w-md w-full text-center bg-white rounded-2xl border border-[#EBD9CE] p-10 shadow-[0_20px_60px_-30px_rgba(180,89,63,0.35)]">
          <XCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h1 className="font-serif-display text-3xl mb-3">Link unavailable</h1>
          <p className="text-neutral-700">{err}</p>
          <Link to="/" className="mt-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#B4593F]">
            Back to store <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="min-h-[80vh] flex items-center justify-center px-6 py-16" data-testid="qr-review-success">
        <div className="max-w-md w-full text-center bg-white rounded-2xl border border-[#EBD9CE] p-10 shadow-[0_20px_60px_-30px_rgba(180,89,63,0.35)]">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="font-serif-display text-3xl mb-3">Thank you 💛</h1>
          <p className="text-neutral-700">Your review is submitted. It will appear on our site after a quick moderation check.</p>
          <Link to="/" className="mt-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#B4593F]">
            Continue browsing <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </main>
    );
  }

  if (!ctx) return <main className="min-h-[60vh] flex items-center justify-center text-neutral-500">Loading…</main>;

  return (
    <main className="min-h-[80vh] bg-[#FDF3EB] py-12" data-testid="qr-review-form">
      <div className="max-w-lg mx-auto px-6">
        <div className="text-center mb-8">
          <div className="text-[11px] uppercase tracking-[0.3em] text-[#B4593F] mb-2">Verified customer review</div>
          <h1 className="font-serif-display text-4xl">Share your experience</h1>
          <p className="mt-3 text-sm text-neutral-600">Thanks{ctx.customer_name ? `, ${ctx.customer_name}` : ''}! Your voice helps other shoppers.</p>
        </div>

        {ctx.product && (
          <div className="bg-white rounded-xl border border-[#EBD9CE] p-4 flex items-center gap-4 mb-6">
            {ctx.product.image && <img src={ctx.product.image} alt="" className="w-16 h-16 rounded-lg object-cover" />}
            <div>
              <div className="text-[10px] uppercase tracking-widest text-neutral-500">You ordered</div>
              <div className="font-serif-display text-lg">{ctx.product.name}</div>
            </div>
          </div>
        )}
        {ctx.order && (
          <div className="text-xs text-center text-neutral-500 mb-6">Order <strong>{ctx.order.order_number}</strong></div>
        )}

        <form onSubmit={submit} className="bg-white rounded-2xl border border-[#EBD9CE] p-6 md:p-8 space-y-5 shadow-[0_20px_60px_-30px_rgba(180,89,63,0.3)]">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-neutral-500 mb-2 text-center">Your rating</div>
            <div className="flex justify-center gap-2" data-testid="rating-stars">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setForm({ ...form, rating: n })}
                  className="p-1 transition-transform hover:scale-110"
                  data-testid={`star-${n}`}
                  aria-label={`${n} stars`}
                >
                  <Star className={`w-8 h-8 ${n <= form.rating ? 'fill-[#F5B342] text-[#F5B342]' : 'text-neutral-300'}`} />
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="text-[11px] uppercase tracking-widest text-neutral-500">Your name</span>
            <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-2 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-5 py-3 text-sm outline-none focus:border-[#B4593F]" data-testid="review-name" />
          </label>

          <label className="block">
            <span className="text-[11px] uppercase tracking-widest text-neutral-500">Email (optional)</span>
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="mt-2 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-full px-5 py-3 text-sm outline-none focus:border-[#B4593F]" data-testid="review-email" />
          </label>

          <label className="block">
            <span className="text-[11px] uppercase tracking-widest text-neutral-500">Tell us more (min 5 chars)</span>
            <textarea required rows="5" value={form.text} onChange={e => setForm({ ...form, text: e.target.value })} className="mt-2 w-full bg-[#FDF3EB] border border-[#EBD9CE] rounded-2xl px-5 py-4 text-sm outline-none focus:border-[#B4593F] resize-none" data-testid="review-text" placeholder="What did you love? How was the packaging, delivery, personalization?" />
            <div className="text-right text-[10px] text-neutral-400 mt-1">{form.text.length} chars</div>
          </label>

          <button
            type="submit"
            disabled={submitting || form.text.trim().length < 5}
            data-testid="submit-review-btn"
            className="w-full bg-[#1A1A1A] hover:bg-[#B4593F] disabled:bg-neutral-300 text-white uppercase tracking-[0.2em] text-xs px-6 py-3.5 rounded-full transition-colors"
          >
            {submitting ? 'Submitting…' : 'Submit Review'}
          </button>
        </form>
      </div>
    </main>
  );
};

export default QrReviewSubmit;
