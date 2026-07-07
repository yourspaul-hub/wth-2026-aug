# Wear The Hope — Product Requirements

## Original Problem Statement
Clone www.wearthehope.com with a dynamic UI, highly interactive e-commerce features, and Instagram integration. Then add a comprehensive admin panel (Phase-wise implementation) for managing orders, variants, collections, reviews, SEO, coupons, shipping rules, mock payments (Razorpay/Stripe/PayPal), and order operations (refunds, invoices, emails, abandoned carts). Additionally, contact page should list multiple branch locations, and admins should be able to bulk-upload products via Google Sheets or Excel with a downloadable template.

## Core Product Pillars
1. Storefront faithful to brand (colors #FDF3EB / #B4593F, serif-display, ribbon accents)
2. Full-CRUD Admin panel (Emergent Google Auth, session cookies)
3. All third-party services are MOCKED until user provides real keys
4. Server-side price recalculation for orders (no client trust)
5. Rendered email outbox as a mocked preview layer
6. Real WTH multi-branch presence on Contact

## Architecture
- Frontend: React 19 + Tailwind + Shadcn UI + react-helmet-async
- Backend: FastAPI + Motor (async MongoDB) + openpyxl for XLSX
- Auth: Emergent Google Auth (cookie + Bearer session token) — see /app/auth_testing.md

## Implemented (through 2026-02-07)

### Storefront
- Home, Shop, ProductDetail, Cart Drawer, Checkout, Order Success
- **Contact page** with multiple branch locations (fetched from /api/locations, seeded with real WTH addresses: Mumbai Design Center + Kerala Registered Office)
- SEO helmet per route + client-side RedirectGate

### Admin Panel
- Dashboard, Products (with **Bulk Upload** modal), Collections, Orders (Refund + Invoice), Coupons, Shipping, Tax, Reviews, SEO, Redirects, Newsletter, Emails, Abandoned Carts, **Locations**

### Phase A — Store Depth ✅
### Phase B — Payments & Tax ✅
### Phase C — Order Operations ✅ (18/18 pytest)
### Phase D — Locations + Bulk Upload ✅ (19/19 pytest) 2026-02-07
- `Location` model + `/api/locations` (public) and `/api/admin/locations` (CRUD)
- Seeded 2 real WTH addresses (Mumbai primary, Kerala)
- Bulk upload: `GET /api/admin/products/template.csv` (CSV template with live category slugs), `POST /api/admin/products/bulk` (multipart file — .csv/.xlsx/.xls). Upserts by SKU or slug. Handles UTF-8 BOM (Google Sheets exports) and boolean strings. Returns row-level errors.

## Backlog / Roadmap
### P1 (Next)
- **Instagram Feed integration** ← user's original ask
- Blog integration & management
- Analytics dashboard (mocked GA/FB Pixel)

### P2
- Product model: prevent deletion of is_primary location; add LocationUpdate Pydantic model
- Batch bulk-upload writes (bulkWrite) + upload size cap
- Coupon usage decrement on refund
- Auto-restock on abandoned/pending order timeout
- Split `server.py` (~1420 lines) into modules

### P3 (Live keys)
- Swap Razorpay / Stripe / PayPal / Shiprocket / Gmail SMTP mocks with real credentials

## Testing
- Admin session minted via mongosh — see /app/memory/test_credentials.md
- Phase C tests: `pytest tests/test_phase_c_orders.py -v -n 0`
- Phase D tests: `pytest tests/test_phase_d_locations_bulk.py -v -n 0`
- Pydantic EmailStr rejects `.test` TLD (RFC 2606) → use `.io` in tests
- /api/products returns paginated `{items, total, page, limit}` — not a bare list
