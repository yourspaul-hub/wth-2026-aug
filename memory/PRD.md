# Wear The Hope — Product Requirements

## Original Problem Statement
Clone www.wearthehope.com with a dynamic UI, highly interactive e-commerce features, and Instagram integration. The user subsequently requested a comprehensive admin panel (Phase-wise implementation) for managing orders, variants, collections, reviews, SEO, coupons, shipping rules, mock payments (Razorpay/Stripe/PayPal), and order operations (refunds, invoices, emails, abandoned carts).

## Core Product Pillars
1. Storefront faithful to brand (colors #FDF3EB / #B4593F, serif-display, ribbon accents)
2. Full-CRUD Admin panel (Emergent Google Auth, session cookies)
3. All third-party services are MOCKED until user provides real keys
4. Server-side price recalculation for orders (no client trust)
5. Rendered email outbox as a mocked preview layer

## Architecture
- Frontend: React 19 + Tailwind + Shadcn UI + react-helmet-async
- Backend: FastAPI + Motor (async MongoDB)
- Auth: Emergent Google Auth (cookie + Bearer session token) — see /app/auth_testing.md
- Deployment: Kubernetes ingress; backend on `/api`, frontend on `/`

## Implemented (as of 2026-02-07)

### Storefront
- Home, Shop, ProductDetail, Cart Drawer, Checkout, Order Success
- SEO helmet per route + client-side RedirectGate
- Dynamic product filtering (category / query / sort / tag / skip / limit)

### Admin Panel
- Dashboard (revenue, order counts, recent orders)
- Products (CRUD + variants + personalization + digital products + ribbons)
- Collections (many-to-many product tagging)
- Orders (list, status update, detail drawer, **refund**, **invoice**)
- Coupons (percent/flat/max_discount/min_subtotal/usage_limit)
- Shipping Rules (per-state, per-pincode, free-above-N)
- Tax Rates (GST slabs, scoped)
- Reviews (published/order/rating)
- SEO manager + redirects + sitemap.xml + robots.txt
- Newsletter subscribers
- **Emails outbox** (mocked, previewable in iframe)
- **Abandoned Carts** (stale filter, send recovery)

### Phase A — Store Depth ✅
Variants, inventory, digital products, personalization, collections, ribbons

### Phase B — Payments & Tax ✅
Tax slabs, Shipping rules, mocked Razorpay/Stripe/PayPal/COD verify

### Phase C — Order Operations ✅ (2026-02-07)
- Refund endpoint restocks + emits mocked `order_refunded` email
- Invoice HTML (brand-styled, print-ready)
- Abandoned cart upsert + admin list (stale ≥30 min) + recovery email
- Email outbox: order_placed, order_paid, order_shipped, order_refunded, abandoned_cart templates
- 18/18 backend tests pass (pytest at /app/backend/tests/test_phase_c_orders.py)

## Backlog / Roadmap
### P1 (Next)
- **Instagram Feed integration** (user’s original ask — multi-channel selling) ← **NEXT**
- Blog integration & management
- Analytics dashboard (Sales reports, traffic, conversion; mocked GA/FB Pixel)

### P2
- Custom dashboards
- Custom checkout logic (loyalty, gift cards, wishlists)
- Coupon usage decrement on refund (accounting fix noted by test agent)
- Auto-restock on abandoned/pending order timeout
- Split server.py into modules (orders.py, payments.py, admin.py, emails.py, invoices.py, seo.py) — currently ~1189 lines

### P3 (Live keys)
- Swap Razorpay mock → real
- Swap Stripe mock → real
- Swap PayPal mock → real
- Swap Shiprocket mock → real
- Swap Gmail SMTP mock → real (set `provider='gmail'` in queue_email)

## Testing
- Admin session minted via mongosh — see /app/memory/test_credentials.md
- Pydantic EmailStr rejects `.test` TLD (RFC 2606) → use `.io` in tests
- Run backend tests: `cd /app/backend && set -a && source .env && set +a && python -m pytest tests/test_phase_c_orders.py -v -n 0`
