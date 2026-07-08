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

**Total backend tests**: 204+ (203 pass; 1 non-code infra note about ingress rewriting Cache-Control)

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
### P1
- Split `server.py` (~2600 lines) into modules per phase (deferred — dedicated round)
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
