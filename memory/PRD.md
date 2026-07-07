# Wear The Hope — Product Requirements

## Original Problem Statement
Clone www.wearthehope.com with a dynamic UI, highly interactive e-commerce features, and Instagram integration. Add a comprehensive admin panel for managing orders, variants, collections, reviews, SEO, coupons, shipping rules, mock payments, and order operations. Contact page should list multiple branches. Admins should bulk-upload products via Google Sheets or Excel with a downloadable template. Add analytics dashboard (mocked GA/FB Pixel), blog, curated Instagram feed with shoppable tags, and direct Google Sheets link importer. **Full reviews module**: QR-based customer review collection (admin generates per-order QR, customer scans → submits) + multi-location Google Business review sync (real when GOOGLE_PLACES_API_KEY set, mocked otherwise).

## Architecture
- Frontend: React 19 + Tailwind + Shadcn + react-helmet-async + recharts
- Backend: FastAPI + Motor + openpyxl + httpx + qrcode + Pillow
- Auth: Emergent Google Auth (cookie + Bearer session token)

## Implemented (through 2026-02-07)

### Storefront
- Home, Shop, ProductDetail, Cart Drawer, Checkout, Order Success
- About, **Contact (multiple branches)**, Blog list + BlogPost detail
- Shoppable Instagram feed
- **Public QR review submission page** `/r/:token` — pre-fills product/customer context, 5-star selector, submit → moderation-pending
- Client-side `AnalyticsTracker` — fires `page_view` on every route

### Admin Panel
Dashboard · Analytics · Orders (Refund + Invoice) · Products (**Bulk Upload + Google Sheets importer**) · Collections · Coupons · Shipping · Tax · **Reviews Hub (3 tabs: All Reviews / QR Codes / Google Locations)** · Blog · Instagram · SEO · Redirects · Newsletter · Emails · Abandoned Carts · Locations

### Phase A — Store Depth ✅ (variants, personalization, digital products, ribbons)
### Phase B — Payments & Tax ✅ (mocked Razorpay/Stripe/PayPal/COD, tax slabs, shipping rules)
### Phase C — Order Operations ✅ 18/18 pytest (refund, invoice, abandoned carts, email outbox)
### Phase D — Locations + Bulk Upload ✅ 19/19 pytest
### Phase E — Content + Analytics + Sheets ✅ 32/32 pytest (blog, Instagram, analytics, Google Sheets link importer)
### Phase F — Reviews Module ✅ 37/37 pytest (2026-02-07)
- QR review flow: `POST /api/admin/reviews/qr/generate` → `GET /api/admin/reviews/qr/{token}/image.png` (PNG bytes) → public `/api/r/{token}` GET/POST (single-use, expiry-guarded, redacts customer email)
- Google Business locations: full CRUD + `/sync` + `/sync-all`. Deterministic mocked feed keyed by place_id; auto-publish based on min_rating_to_publish (preserves admin's manual publish overrides on re-sync)
- Extended `Review` model with source (Manual/QR/google location name), verified, photos, order_number, product_id, google_review_id
- Hardening applied: photos capped to 6 http(s) URLs ≤ 2KB each; unique index on qr_tokens.token; email redacted in public info; admin published decisions preserved on re-sync

**Total backend tests**: 106/106 across all phases.

## Backlog / Roadmap
### P1
- Storefront reviews section: filter by source (Google/QR/Manual), star breakdown, photo gallery
- Meta Graph API for live Instagram sync (swap curated mocks)
- GA4 + Meta Pixel real event ingestion (swap mocked baseline)
- Search: full-text on products + blog + reviews
- Wishlist server-side persistence

### P2
- Split `server.py` (~2000 lines) into modules (reviews_qr.py, google_locations.py, blog.py, instagram.py, analytics.py, sheets.py, locations.py, bulk_upload.py, orders.py, admin.py)
- Rate limiting on public `/api/r/{token}` POST
- `GoogleBusinessLocationUpdate` + `LocationUpdate` Pydantic models
- Coupon usage decrement on refund
- Batch bulk-upload writes (bulkWrite) + upload size cap
- Prevent deletion of is_primary location

### P3 (Live keys)
- Swap Razorpay / Stripe / PayPal / Shiprocket / Gmail SMTP / GA4 / FB Pixel / Instagram Graph / Google Places mocks with real credentials

## Testing
- Admin session minted via mongosh — see /app/memory/test_credentials.md
- Phase C: `pytest tests/test_phase_c_orders.py -v -n 0`
- Phase D: `pytest tests/test_phase_d_locations_bulk.py -v -n 0`
- Phase E: `pytest tests/test_phase_e_blog_ig_analytics_sheets.py -v`
- Phase F: `pytest tests/test_phase_f_reviews_qr_google.py -v -n 0`
- All tests self-mint admin tokens and clean up after themselves.
- Pydantic EmailStr rejects `.test` TLD (RFC 2606) → use `.io`
- /api/products returns paginated `{items, total, page, limit}` — not a bare list
- Public QR endpoint redacts customer email (e.g. `p***r@example.com`)
- PUBLIC_APP_URL in backend/.env drives review_url; set to preview URL for demo
