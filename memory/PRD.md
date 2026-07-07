# Wear The Hope — Product Requirements

## Original Problem Statement
Full-featured, dynamic e-commerce clone of www.wearthehope.com with a comprehensive admin panel: orders, variants, collections, reviews, SEO, coupons, shipping rules, mocked payments/emails/shipping, refunds, invoices, abandoned cart recovery, multi-branch contact, bulk product upload (Google Sheets & Excel + link importer), analytics dashboard (mocked GA/FB Pixel), blog, curated shoppable Instagram feed, full reviews module (QR-per-customer + Google Business sync), **multi-role team access (Admin / Store Manager / Blogger)**, and a **unified Integrations Hub** for every third-party key.

## Architecture
- Frontend: React 19 + Tailwind + Shadcn + react-helmet-async + recharts + qrcode client PNG
- Backend: FastAPI + Motor + openpyxl + httpx + qrcode + Pillow
- Auth: Emergent Google Auth with **RBAC**: admin | store_manager | blogger. First login bootstraps as admin; further logins require an admin invite.

## Implemented (through 2026-02-07)

### Storefront
- Home, Shop, ProductDetail, Cart Drawer, Checkout, Order Success
- About, Contact (multiple branches), Blog list + BlogPost detail
- Shoppable Instagram feed (from live `/api/instagram`)
- **Public QR review submission** `/r/:token` (per-customer) + `/review` (generic/public)
- Navbar shows **SHOP** in uppercase; Journal (blog) link added

### Admin Panel (role-gated sidebar)
Dashboard · Analytics · Orders · Products (bulk upload + Google Sheets import) · **Categories** · Collections · Coupons · Shipping · Tax · Reviews Hub (All / QR / Google Locations, with **Generic public QR card** at top of QR tab) · Blog · Instagram · SEO · Redirects · Newsletter · Emails · Abandoned Carts · Locations · **Team & Access** · **Integrations Hub**

### Delivered Phases
- Phase A — Store Depth ✅ (variants, personalization, digital products, ribbons)
- Phase B — Payments & Tax ✅ (mocked Razorpay/Stripe/PayPal/COD)
- Phase C — Order Operations ✅ 18/18
- Phase D — Locations + Bulk Upload ✅ 19/19
- Phase E — Content + Analytics + Sheets link importer ✅ 32/32
- Phase F — Reviews Module (QR + Google Business sync) ✅ 37/37
- **Phase G — RBAC + Categories admin + Generic QR + Integrations Hub ✅ 56/56** (2026-02-07)

**Total backend tests**: 162 across all phases (161 pass; 1 stale Phase D data blip fixed).

### Phase G highlights
- **RBAC** — 3 roles with `require_role` factory. `admin` full, `store_manager` scoped to products/categories/collections/shipping/tax + bulk upload, `blogger` scoped to blog only. First user bootstraps as admin; further logins require an invite (403 otherwise).
- **Users CRUD** — invite/list/patch/delete with guards (can't delete self, can't demote/delete last admin).
- **Categories admin** — full CRUD, slug uniqueness enforced, delete blocked when products still assigned.
- **Generic public review** — `/api/reviews/public` (no auth) + admin-viewable generic QR card with printable PNG + shareable URL.
- **Integrations Hub** — DB-backed settings for 10 sections (Instagram, Shiprocket, Razorpay, Stripe, PayPal, Gmail SMTP, GA4, Meta Pixel, Google Places, Public App URL). Secrets masked; reveal endpoint; env fallback via `get_setting(key)` helper. Sensitive keys never leave the backend except via the explicit reveal endpoint.
- **Hardening** — unique indexes on `categories.slug`, `settings.key`, `qr_tokens.token`; TTL index on `admin_sessions.expires_at`; deterministic mocked Google review sync; email redaction in public QR info; input caps on photos/text.

## Backlog / Roadmap
### P1
- Split `server.py` (~2400 lines) into modules per phase
- Storefront reviews section (Google + QR + Manual with source badges + star breakdown + photo gallery)
- Full-text search across products + blog + reviews
- Wishlist server-side persistence
- Rate limiting on public `/api/r/{token}` and `/api/reviews/public`

### P2
- Return `201 Created` on POST creates
- Auto-generate review-request QR on order "shipped" event
- Meta Graph API for live Instagram sync
- Real GA4 + FB Pixel event ingestion
- Distinguish `explicitly cleared` vs `unset` in settings

### P3 (Live keys — just drop into Integrations Hub)
- Razorpay / Stripe / PayPal / Shiprocket / Gmail SMTP / GA4 / FB Pixel / Instagram Graph / Google Places API

## Testing
- Admin session minted via mongosh — see /app/memory/test_credentials.md
- Phase C: `pytest tests/test_phase_c_orders.py -v -n 0`
- Phase D: `pytest tests/test_phase_d_locations_bulk.py -v -n 0`
- Phase E: `pytest tests/test_phase_e_blog_ig_analytics_sheets.py -v`
- Phase F: `pytest tests/test_phase_f_reviews_qr_google.py -v -n 0`
- Phase G: `pytest tests/test_phase_g_rbac_categories_integrations.py -v -n 0`
- PUBLIC_APP_URL, INSTAGRAM_HANDLE stored in DB `settings` via Integrations Hub
- /api/products returns paginated `{items, total, page, limit}`
