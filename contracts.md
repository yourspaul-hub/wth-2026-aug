# Wear The Hope — Backend Contracts

## Overview
Full-stack e-commerce backend for Wear The Hope with admin panel, orders, coupons, reviews, SEO management, mocked Razorpay & Shiprocket integrations.

## Authentication
- Emergent Google OAuth for admin login
- Cookie-based session (`session_token`, 7-day expiry, httpOnly, secure, samesite=none)
- Public storefront requires no auth

## Data currently mocked in mock.js (to replace with API)
- `products`, `categories` -> `/api/products`, `/api/categories` (seeded on first run from mock)
- `testimonials` -> `/api/reviews` (admin manages via /admin/reviews)
- `instagramFeed` -> stays as constants (visual only, links to real IG)

## API Endpoints

### Auth
- `POST /api/auth/session` — exchange session_id (from URL hash) for session_token cookie
- `GET /api/auth/me` — current admin user (401 if not authed)
- `POST /api/auth/logout` — clear session

### Public — Catalog
- `GET /api/categories` — list all categories
- `GET /api/products?category=slug&q=text&sort=price-asc|price-desc|rating&limit=&skip=`
- `GET /api/products/{id}` — product detail + related

### Public — Reviews
- `GET /api/reviews?published=true` — testimonials

### Public — Coupons
- `POST /api/coupons/validate` — body: `{code, subtotal}` → returns `{valid, discount, message}`

### Public — Orders / Checkout
- `POST /api/orders` — creates order. body: `{items, shipping_address, coupon_code?, subtotal, shipping_fee, total}` → returns order + razorpay order_id (MOCKED)
- `GET /api/orders/{order_number}` — order tracking

### Public — Payments (MOCKED Razorpay)
- `POST /api/payments/razorpay/create-order` — MOCKED
- `POST /api/payments/razorpay/verify` — MOCKED (always succeeds)

### Public — Shipping (MOCKED Shiprocket)
- `POST /api/shipping/rates` — body: `{pincode, weight}` → MOCKED rates
- `GET /api/shipping/track/{awb}` — MOCKED tracking

### Public — Newsletter
- `POST /api/newsletter/subscribe` — email

### Public — SEO
- `GET /api/seo/meta?path=/product/xyz` — get SEO meta tags for a path
- `GET /sitemap.xml` — public sitemap
- `GET /robots.txt` — robots.txt
- `GET /api/redirects` — get redirect map (frontend applies)

### Admin (auth required)
- `GET /api/admin/stats` — dashboard KPIs
- `POST/PATCH/DELETE /api/admin/products` — product CRUD
- `POST/PATCH/DELETE /api/admin/categories` — category CRUD
- `POST/PATCH/DELETE /api/admin/coupons` — coupon CRUD
- `POST/PATCH/DELETE /api/admin/reviews` — review CRUD
- `GET/PATCH /api/admin/orders` — orders list + update status
- `POST/PATCH/DELETE /api/admin/seo` — SEO meta by path
- `POST/PATCH/DELETE /api/admin/redirects` — redirect CRUD
- `GET /api/admin/newsletter` — subscribers list

## Frontend Integration
- Home/Shop/ProductDetail: fetch from `/api/*` (fallback to mock)
- Cart drawer: add checkout button → `/checkout` page → order + payment flow
- Admin routes: `/admin/login`, `/admin`, `/admin/orders`, `/admin/coupons`, `/admin/reviews`, `/admin/products`, `/admin/seo`
- Meta tags dynamically injected via `<Helmet>` per route from SEO API
- Redirects applied at RouteGate on first render

## Mocks
- Razorpay: order id `order_mock_<uuid>`, verify always returns success
- Shiprocket: static rate table + fake AWB tracking status
