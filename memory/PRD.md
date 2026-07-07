# Wear The Hope — Product Requirements

## Original Problem Statement
Full-featured, dynamic e-commerce clone of www.wearthehope.com with a comprehensive admin panel: orders, variants, collections, reviews (manual + QR + Google Business), SEO, coupons, shipping rules, mocked payments/emails/shipping, refunds, invoices, abandoned cart recovery, multi-branch contact, bulk product upload (Google Sheets & Excel + link importer), analytics dashboard, blog, curated shoppable Instagram feed, RBAC (admin/store_manager/blogger), unified Integrations Hub for every 3rd-party key, and a **storefront reviews section** unifying all review sources with filtering.

## Architecture
- Frontend: React 19 + Tailwind + Shadcn + react-helmet-async + recharts + qrcode
- Backend: FastAPI + Motor + openpyxl + httpx + qrcode + Pillow
- Auth: Emergent Google Auth with RBAC (admin | store_manager | blogger). First login bootstraps admin; further logins require invite.

## Implemented (through 2026-02-07)

### Storefront
- Home, Shop, ProductDetail, Cart Drawer, Checkout, Order Success
- About, Contact (multiple branches), Blog list + BlogPost detail
- Shoppable Instagram feed
- Public QR review submission (`/r/:token` per-customer + `/review` generic)
- **Reviews section on Home** — summary KPI card (avg + count + 5-bar breakdown), 4 filter chips (All / Google / Verified purchase / From our team), source badges, verified badge, photo lightbox, read-more expander
- Footer with **global review QR** — printable PNG + "Leave a review" CTA + Instagram tag CTA

### Admin Panel (role-gated)
Dashboard · Analytics · Orders · Products (bulk upload + Google Sheets import) · Categories · Collections · Coupons · Shipping · Tax · Reviews Hub (All / QR / Google Locations · with Generic QR card) · Blog · Instagram · SEO · Redirects · Newsletter · Emails · Abandoned Carts · Locations · Team & Access · Integrations Hub

### Delivered Phases
- Phase A — Store Depth ✅
- Phase B — Payments & Tax ✅
- Phase C — Order Operations ✅ 18/18
- Phase D — Locations + Bulk Upload ✅ 19/19
- Phase E — Content + Analytics + Sheets link importer ✅ 32/32
- Phase F — Reviews Module ✅ 37/37 (fixed 1 test post-Phase-H shape change)
- Phase G — RBAC + Categories + Generic QR + Integrations Hub ✅ 56/56
- Bug-fix round — Nav overlap + Footer QR ✅ 6/6
- **Phase H — Reviews list envelope + Storefront section ✅ 22/22** (2026-02-07)

**Total backend tests**: 184+ across all phases

### Phase H highlights
- **GET /api/reviews** now returns `{items, total, stats:{average, breakdown{1..5}, total_all_published}, skip, limit}`
- Query params: `source` (google | qr | manual), `min_rating`, `limit`, `skip`, `published`
- `stats.breakdown` and `stats.total_all_published` are aggregate-invariant (don't change per filter) so the summary card stays stable while user filters
- Storefront `ReviewsSection.jsx` on Home: summary KPI, filter chips, source badges (`Google` blue / `Verified purchase` amber / `Curated` green), verified badge, read-more expander, photo lightbox
- Frontend `fetchReviews()` transparently unwraps `items[]` for backward compatibility

## Backlog / Roadmap
### P1
- Split `server.py` (~2400 lines) into modules per phase (DEFERRED — needs dedicated round; scaffold attempted but reverted to avoid mid-flight breakage of 184 tests)
- Storefront reviews section on ProductDetail (currently Home only)
- Rate limiting on public review endpoints
- Wishlist server-side persistence

### P2
- Return `201 Created` on POSTs
- Auto-generate review-request QR on order "shipped" event with per-order token attached to shipped email + invoice PDF
- Meta Graph API for live Instagram sync
- Real GA4 + FB Pixel event ingestion
- Category ordering drag-and-drop

### P3 (Live keys — drop into Integrations Hub)
- Razorpay / Stripe / PayPal / Shiprocket / Gmail SMTP / GA4 / FB Pixel / Instagram Graph / Google Places API

## Testing
- Admin session minted via mongosh — see /app/memory/test_credentials.md
- Phase C: `pytest tests/test_phase_c_orders.py -v -n 0`
- Phase D: `pytest tests/test_phase_d_locations_bulk.py -v -n 0`
- Phase E: `pytest tests/test_phase_e_blog_ig_analytics_sheets.py -v`
- Phase F: `pytest tests/test_phase_f_reviews_qr_google.py -v -n 0`
- Phase G: `pytest tests/test_phase_g_rbac_categories_integrations.py -v -n 0`
- Phase H: `pytest tests/test_phase_h_reviews_list.py -v -n 0`
- `/api/products` and `/api/reviews` both return paginated envelopes `{items, total, ...}`
