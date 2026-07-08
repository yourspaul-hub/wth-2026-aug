# Wear The Hope — Product Requirements

## Original Problem Statement
Full-featured, dynamic e-commerce clone of www.wearthehope.com with a comprehensive admin panel: orders, variants, collections, reviews (manual + QR + Google Business), SEO, coupons, shipping rules, mocked payments/emails/shipping, refunds, invoices, abandoned cart recovery, multi-branch contact, bulk product upload (Google Sheets & Excel + link importer + **Google Drive image links**), analytics dashboard, blog, curated shoppable Instagram feed, RBAC (admin/store_manager/blogger), unified Integrations Hub, storefront reviews section, and **an internal image pipeline (resize + WebP + GridFS + CDN-style serving)** with responsive frontend rendering.

## Architecture
- Frontend: React 19 + Tailwind + Shadcn + react-helmet-async + recharts + qrcode
- Backend: FastAPI + Motor + Motor GridFS + openpyxl + httpx + qrcode + **Pillow (image processing)**
- Auth: Emergent Google Auth with RBAC (admin | store_manager | blogger)
- Storage: MongoDB + **GridFS bucket 'images'** for processed WebP assets

## Delivered Phases
- Phase A — Store Depth ✅
- Phase B — Payments & Tax ✅
- Phase C — Order Operations ✅ 18/18
- Phase D — Locations + Bulk Upload ✅ 19/19
- Phase E — Content + Analytics + Sheets link importer ✅ 32/32
- Phase F — Reviews Module ✅ 37/37
- Phase G — RBAC + Categories + Generic QR + Integrations Hub ✅ 56/56
- Bug-fix round — Nav overlap + Footer QR ✅ 6/6
- Phase H — Reviews list envelope + Storefront section ✅ 22/22
- **Phase I — Image pipeline + Frontend perf ✅ 20/21** (2026-02-08)
- **Phase J — Wishlist page + Recommendations + Multi-currency (INR/USD/EUR/GBP/AUD/AED) + i18n EN/HI ✅ 30/31** (2026-02-08)
- **Phase K — CMS "Design" tab + Music widget + S3/CloudFront fallback + Mobile navbar polish ✅ 13/13 backend, ~92% frontend** (2026-02-08)

### Phase K highlights
- **Design tab** at `/admin/design`: section-grouped editor for every editable string on the storefront (announcement, hero, home strip/categories/about/instagram/testimonials, shop, about, blog, contact, product-detail labels, footer). Save is bulk `PUT /api/admin/content`; storefront hot-updates via `wth:content-saved` CustomEvent. Reset-to-default per key. `GET /api/content` public, cached.
- **Music widget** (bottom-right, all storefront pages): auto-seeded MP3 URL (Wear The Hope Music.mp3). Starts paused (autoplay policy), remembers user choice via localStorage. Play/pause + volume + mute + hide. `GET /api/settings/public` exposes URL/label/volume/enabled.
- **S3 + CloudFront CDN** hook for the image pipeline: `_try_upload_to_s3` runs when `AWS_S3_ENABLED=true` and creds present; otherwise transparent fallback to GridFS. Admin can toggle via Integrations → CDN section (AWS creds required — currently not provided by user).
- **Mobile navbar**: hidden all icons except hamburger + logo + cart on <1024px. Search, wishlist, and language/currency moved into the hamburger drawer.

**Total backend tests**: 218+ (all passing)

### Phase J highlights
- **Wishlist**: dedicated `/wishlist` page with grid, move-to-bag / move-all / clear, nav heart with badge count.
- **Recommendations**: `GET /api/products/{id}/recommendations` with 3-tier fallback (same category → shared collections → top-rated); `<RelatedProducts>` on PDP.
- **Recently Viewed**: localStorage-backed (max 12), `<RecentlyViewed>` on PDP + wishlist page.
- **Multi-currency**: `GET /api/currency/rates` public endpoint (INR base) + admin override via `CURRENCY_RATES` setting. `CurrencyContext` with `format()` using `Intl.NumberFormat`. Prices in ProductCard, PDP, cart drawer, checkout all currency-aware. INR conversion notice on checkout when non-INR selected.
- **Multi-language**: `react-i18next` with EN + HI locales; `<LangCurrencyMenu>` in navbar; persisted via localStorage.

### Phase I highlights
- **Image pipeline** (backend):
  - `_resolve_image_source` — Google Drive share links → direct-download URLs (`/file/d/ID/view` and `?id=ID` variants)
  - `_fetch_bytes` — 30s timeout, 15 MB cap, rejects HTML responses (private Drive)
  - `_process_image` — Pillow resize to 1600×1600 (aspect preserved) + WebP q=82
  - GridFS storage with metadata (source_url, resolved_url, w/h, size, uploader, ts)
- **New endpoints**:
  - `POST /api/admin/images/upload-from-url` (require_store) → `{id, url:/api/images/{id}, width, height, size, content_type}`
  - `GET /api/images/{img_id}` (public, Cache-Control 30-day immutable at origin — noted ingress rewrites this on public URL)
- **Bulk upload** extended: CSV/XLSX now accepts `image_1..image_4` columns. Each processed through the pipeline. Non-Drive URLs kept as-is (fast path); Drive links always re-hosted. At least one image required per row.
- **Frontend perf** (`src/lib/imgSrc.js`):
  - `imgProps()` helper adds `loading="lazy"` + `decoding="async"` + explicit `width/height` + Unsplash `srcSet` (400/800/1200/1600w) + `sizes`
  - Hero image loads `eager` and gets a `<link rel="preload">` in `<head>` for LCP win
  - Applied to: Hero, ProductCard, InstagramFeed, ReviewsSection, Blog list, BlogPost, review avatars/photos

## Backlog / Roadmap
### Phase L — Admin Order Fulfilment + Data Reset + Import + Reviews cleanup ✅ (2026-07-08)
- **Fulfil Order flow** in admin Orders drawer: modal with 4 methods (Courier / Hand delivery / Door delivery / Store pickup). Courier collects courier from India + international dropdown (`GET /api/admin/couriers`, 27 couriers), AWB (required), tracking URL (optional). `POST /api/admin/orders/{on}/fulfill` sets status='shipped' for courier or 'delivered' for hand/door/store, sends `order_shipped` or `order_delivered` email automatically.
- **New email template**: `order_delivered` (for hand/door/store closure).
- **Removed** mock Shiprocket auto-AWB assignment from `verify_payment` — fresh orders now stay unfulfilled until admin acts.
- **Reset store data** page at `/admin/reset-data`: 15 granular targets (orders, products, reviews, blog, collections, categories, instagram, newsletter, emails, analytics, locations, shipping_rules, coupons, images, seo) with checkboxes + doc counts. Requires typing `RESET` to confirm. Never wipes admin_users, admin_sessions, settings, site_content.
- **Import past orders** button on admin Orders header: uploads CSV/XLSX → `POST /api/admin/orders/import`. Template downloadable from `GET /api/admin/orders/import-template.csv`. Creates new orders or updates by `order_number`. Row-level error reporting.
- **Homepage cleanup**: removed redundant Testimonials block (`Loved by believers worldwide` / `What Our Customers Say`). ReviewsSection got load-more pagination (PAGE_SIZE=9) and lost its ratings summary card (5.0 out of 5 / breakdown bars) per user request — cleaner centered layout with just filters + review grid.
- **Testing**: 23/23 new Phase L pytests pass. Frontend smoke pass on home/admin orders/admin reset-data.

### P0 — Deployment on Emergent ✅ (2026-07-08)
User pivoted from Vercel → **Emergent-hosted deployment** with custom domain.
- Emergent branding removed from frontend `index.html` (PostHog tracking script), `AdminLogin.jsx` (auth URL via `REACT_APP_AUTH_URL`), `App.js` comment, and `testIds/home.js` (unused `emergentLink`).
- Backend cleaned: `server.py` docstring, default music seed now sourced from `DEFAULT_MUSIC_URL` env (empty by default), CORS now respects `CORS_ORIGINS` env, `auth.py` broker URL configurable via `AUTH_SESSION_URL`.
- `requirements.txt`: removed unused `emergentintegrations`, replaced `litellm` Emergent-hosted wheel URL with PyPI `litellm==1.80.0`.
- Frontend resilience: `ErrorBoundary` at App root, console warning in `lib/api.js` when `REACT_APP_BACKEND_URL` missing.
- **Deployment health check: PASSED** — 0 blockers on Emergent. Confirmed via deployment_agent scan.
- Kept `render.yaml` + `DEPLOYMENT.md` + Vercel configs in the repo as reference/insurance; harmless for Emergent deploy (Emergent pipeline ignores them).

### P1
- Split `server.py` (~2900 lines) into modules per phase (deferred — dedicated round)
- Fix 4 ESLint React hook warnings (MusicWidget, ReviewsSection, Emails, Orders) so `CI=true` passes without bypass
- Add `Cache-Control` preservation at k8s ingress OR direct-serve GridFS via a fastapi-static wrapper to bypass ingress rewrite
- Storefront reviews section on ProductDetail (currently Home only)
- Rate limiting on public review + image endpoints

### P2
- Return `201 Created` on POSTs
- Auto-generate per-order review QR at "shipped" event, embedded in invoice PDF + shipped email
- Category drag-and-drop ordering
- Meta Graph API for live Instagram sync
- Real GA4 + FB Pixel event ingestion

### P3 (Live keys — Integrations Hub)
- Razorpay / Stripe / PayPal / Shiprocket / Gmail SMTP / GA4 / FB Pixel / Instagram Graph / Google Places API

## Testing
- Phases C–I: `pytest tests/test_phase_[c-i]*.py -v -n 0`
- `/api/products` and `/api/reviews` both return paginated envelopes
- Uploaded images: `db.images.files` + `db.images.chunks` (GridFS)
- PUBLIC_APP_URL in DB settings drives review/QR URLs
