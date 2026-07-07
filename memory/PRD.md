# Wear The Hope — Product Requirements

## Original Problem Statement
Clone www.wearthehope.com with a dynamic UI, highly interactive e-commerce features, and Instagram integration. Then add a comprehensive admin panel for managing orders, variants, collections, reviews, SEO, coupons, shipping rules, mock payments (Razorpay/Stripe/PayPal), and order operations (refunds, invoices, emails, abandoned carts). Contact page should list multiple branches. Admins should bulk-upload products via Google Sheets or Excel with a downloadable template. Add analytics dashboard (mocked GA/FB Pixel), blog, curated Instagram feed with shoppable tags, and direct Google Sheets link importer.

## Core Product Pillars
1. Storefront faithful to brand (colors #FDF3EB / #B4593F, serif-display, ribbon accents)
2. Full-CRUD Admin panel (Emergent Google Auth, session cookies)
3. All third-party services are MOCKED until user provides real keys
4. Server-side price recalculation for orders
5. Rendered email outbox as a mocked preview layer
6. Real WTH multi-branch presence on Contact + shoppable Instagram feed

## Architecture
- Frontend: React 19 + Tailwind + Shadcn UI + react-helmet-async + recharts
- Backend: FastAPI + Motor (async MongoDB) + openpyxl + httpx
- Auth: Emergent Google Auth (cookie + Bearer session token)

## Implemented (through 2026-02-07)

### Storefront
- Home, Shop, ProductDetail, Cart Drawer, Checkout, Order Success
- About, **Contact (multiple branches)**, **Blog list + Blog Post detail**
- Shoppable Instagram feed on homepage (`@wearthehope`)
- Client-side `AnalyticsTracker` — fires `page_view` events on every route change (mocked GA/FB Pixel)

### Admin Panel
Dashboard · **Analytics** · Orders (Refund + Invoice) · Products (**Bulk Upload + Google Sheets importer**) · Collections · Coupons · Shipping · Tax · Reviews · **Blog** · **Instagram** · SEO · Redirects · Newsletter · Emails · Abandoned Carts · Locations

### Phase A — Store Depth ✅ (variants, personalization, digital products, ribbons)
### Phase B — Payments & Tax ✅ (mocked Razorpay/Stripe/PayPal/COD, tax slabs, shipping rules)
### Phase C — Order Operations ✅ 18/18 (refund, invoice, abandoned carts, email outbox)
### Phase D — Locations + Bulk Upload ✅ 19/19 (multi-branch, CSV/XLSX bulk upload)
### Phase E — Content + Analytics + Sheets ✅ 32/32 (2026-02-07)
- `BlogPost` model + public `/api/blog`, `/api/blog/{slug}` + admin CRUD (unique slug, auto `published_at`, related posts). Seeded 3 posts.
- `InstagramPost` model + public `/api/instagram` + admin CRUD with product_ids for shoppable tags. Seeded 6 posts linked to real products.
- `AnalyticsEvent` model + public `/api/analytics/track` (mocked) + admin `/api/admin/analytics/summary?days=` returning series/totals/top_products/traffic_sources plus mocked GA/FB Pixel IDs. Synthesized traffic baseline when < 20 real events. Real revenue from paid orders.
- Google Sheets importer `/api/admin/products/import-sheet` — parses any Sheets URL variant to CSV export URL, fetches via httpx, pipes through the same bulk upload pipeline.

## Backlog / Roadmap
### P1
- Instagram Meta Graph API integration (swap curated mocks with live pull)
- GA4 + Meta Pixel real-event ingestion (swap mocked baseline)
- Wishlist server-side persistence (currently client-side only)
- Search: full-text on products + blog posts

### P2
- LocationUpdate Pydantic model; prevent deletion of is_primary location
- Batch bulk-upload writes (bulkWrite) + upload size cap
- Coupon usage decrement on refund
- Auto-restock on pending order timeout
- Split `server.py` (~1700 lines) into modules

### P3 (Live keys)
- Swap Razorpay / Stripe / PayPal / Shiprocket / Gmail SMTP / GA4 / FB Pixel / Instagram Graph mocks with real credentials

## Testing
- Admin session minted via mongosh — see /app/memory/test_credentials.md
- Phase C: `pytest tests/test_phase_c_orders.py -v -n 0`
- Phase D: `pytest tests/test_phase_d_locations_bulk.py -v -n 0`
- Phase E: `pytest tests/test_phase_e_blog_ig_analytics_sheets.py -v`
- All tests self-mint admin tokens and clean up after themselves.
- Pydantic EmailStr rejects `.test` TLD (RFC 2606) → use `.io`
- /api/products returns paginated `{items, total, page, limit}` — not a bare list
