#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: "Backend for Wear The Hope e-commerce with admin (Emergent Google Auth), orders, coupons, shipping (Shiprocket MOCKED), payments (Razorpay MOCKED), Google reviews (admin-managed) and SEO management (sitemap.xml, robots.txt, structured data, per-path meta, redirects)."

backend:
  - task: "Emergent Google Auth (session exchange, /auth/me, /auth/logout, cookie session_token)"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "POST /api/auth/session exchanges session_id with Emergent, creates admin_users + admin_sessions, sets httpOnly cookie. GET /api/auth/me protected. POST /api/auth/logout clears session. Uses timezone-aware datetimes and {'_id':0} projection."
      - working: true
        agent: "testing"
        comment: "✅ TESTED: Created test session via mongosh, verified GET /api/auth/me returns user data with Bearer token. POST /api/auth/session with invalid session_id correctly returns 401. All admin endpoints require auth and return 401 without token. Auth flow working correctly."

  - task: "Products & Categories CRUD (public list, admin CRUD, seed on startup)"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "GET /api/products with category/q/sort/tag/skip/limit filters; GET /api/products/{id or slug} returns product + related. Admin CRUD under /api/admin/products and /api/admin/categories. Seeded 10 categories + 12 products on first startup."
      - working: true
        agent: "testing"
        comment: "✅ TESTED: GET /api/categories returns 10 categories with jewellery and wall-frames having coming_soon=true. GET /api/products returns {items, total} with 12 products, each enriched with category_slug and category_name. Filters working: ?category=drinkware, ?q=wallet, ?sort=price-asc. GET /api/products/{id} and /api/products/{slug} both return {product, related}. All working correctly."

  - task: "Reviews (admin-managed Google reviews) — public list + admin CRUD"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "GET /api/reviews returns only published. Admin CRUD at /api/admin/reviews. Seeded 6 initial reviews."
      - working: true
        agent: "testing"
        comment: "✅ TESTED: GET /api/reviews returns 6 published reviews sorted by order asc. Admin CRUD tested: POST /api/admin/reviews creates, PATCH updates, DELETE removes. All working correctly."

  - task: "Coupons — validate (public) + admin CRUD"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "POST /api/coupons/validate checks expiry, min_subtotal, usage_limit; supports percent/flat with max_discount cap. Admin CRUD at /api/admin/coupons. Seeded HOPE10, FAITH20, FLAT100."
      - working: true
        agent: "testing"
        comment: "✅ TESTED: All coupon validation scenarios working: HOPE10 with subtotal 1000 → valid=true, discount=100; HOPE10 with subtotal 100 → valid=false (min 500); FLAT100 with subtotal 1000 → valid=true, discount=100; NOPE → valid=false. Admin CRUD tested: GET /api/admin/coupons lists, POST creates, PATCH updates, DELETE removes. All working correctly."

  - task: "Orders + Checkout (create/get, admin list/update). Razorpay verify + Shiprocket assign MOCKED"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "POST /api/orders recalculates totals server-side, applies coupon, generates order_number WTH-YYYYMMDD-XXXXX. POST /api/payments/razorpay/verify is MOCKED — auto-success + assigns mock Shiprocket AWB + shipment_id + tracking_url. GET /api/orders/{order_number} public order fetch. Admin PATCH updates status/payment_status/awb/tracking."
      - working: true
        agent: "testing"
        comment: "✅ TESTED: POST /api/orders creates order with correct order_number pattern (WTH-YYYYMMDD-XXXXX), applies coupon discount, calculates shipping_fee (0 if subtotal>=999 else 99), returns razorpay object with mocked=true. GET /api/orders/{order_number} retrieves order. POST /api/payments/razorpay/verify updates payment_status='paid', status='paid', assigns shiprocket_awb (starts with SR), shiprocket_shipment_id, tracking_url. Admin endpoints: GET /api/admin/orders lists, PATCH updates status. All working correctly. NOTE: OrderCreate model requires full OrderItem structure (name, image, price) but endpoint enriches from DB - clients must fetch product details first. ShippingAddress uses line1/line2 field names."

  - task: "Shipping rates + tracking (Shiprocket MOCKED)"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "POST /api/shipping/rates returns mocked 3-courier rate list. GET /api/shipping/track/{awb} returns mocked timeline."
      - working: true
        agent: "testing"
        comment: "✅ TESTED: POST /api/shipping/rates with pincode and weight returns mocked=true and 3 courier rates. GET /api/shipping/track/{awb} returns mocked=true with timeline. All working correctly."

  - task: "SEO manager + sitemap.xml + robots.txt + redirects"
    implemented: true
    working: false
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "GET /api/seo/meta?path=… returns per-path meta (falls back to '/' entry). Admin CRUD at /api/admin/seo. GET /sitemap.xml dynamically lists home, shop, categories, products. GET /robots.txt with sitemap ref and disallow /admin /checkout /order. GET /api/redirects public read; admin CRUD at /api/admin/redirects. Seeded SEO for /, /shop, /about, /contact."
      - working: false
        agent: "testing"
        comment: "⚠️ PARTIAL: GET /api/seo/meta?path=/ returns seeded meta with title, fallback to home meta works. GET /api/redirects returns array. Admin CRUD for SEO tested: POST creates, PATCH updates, DELETE removes. ❌ ISSUE: GET /sitemap.xml and GET /robots.txt return frontend HTML/text instead of backend XML/robots - verified backend endpoints work on localhost:8001 but ingress routes these to frontend. This is an infrastructure/ingress routing issue, not a backend code bug. Backend implementation is correct."

  - task: "Newsletter subscribe + admin list"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "low"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "POST /api/newsletter/subscribe with dedupe by email. GET /api/admin/newsletter list for CSV export."
      - working: true
        agent: "testing"
        comment: "✅ TESTED: POST /api/newsletter/subscribe first time returns ok=true, already=false. Second identical POST returns ok=true, already=true (dedupe working). GET /api/admin/newsletter returns array of subscribers. All working correctly."

  - task: "Admin dashboard stats"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "GET /api/admin/stats returns total/paid/pending orders, revenue aggregate, recent orders, product/newsletter/coupon/review counts."
      - working: true
        agent: "testing"
        comment: "✅ TESTED: GET /api/admin/stats returns all required fields: total_orders, paid_orders, pending_orders, revenue, recent_orders (includes test order created), products, newsletter_subscribers, active_coupons, published_reviews. All working correctly."

  - task: "Phase C — Refund order (POST /api/admin/orders/{order_number}/refund)"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "New endpoint requires admin auth. Validates payment_status=='paid'. Sets status=refunded, payment_status=refunded, restocks variant/product stock, appends refund note, queues 'order_refunded' mocked email. Refunding a non-paid order returns 400."

  - task: "Phase C — Invoice HTML (GET /api/invoices/{order_number})"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Public HTML invoice with brand styling, itemised lines, tax breakdown, discount, print button. Returns 404 for unknown order."

  - task: "Phase C — Abandoned Cart tracking + admin list + recovery email"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "POST /api/cart/track upserts by email+recovered=false. GET /api/admin/abandoned-carts returns {stale (>30min old), all}. POST /api/admin/abandoned-carts/{id}/send-recovery queues mocked recovery email and marks recovery_email_sent=true. Placing an order for that email should mark cart recovered=true."

  - task: "Phase C — Email Outbox (mocked). Emit on order_placed/paid/shipped/refunded"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "queue_email writes to email_outbox with rendered HTML, status='mocked'. Emit points: order_placed on POST /api/orders, order_paid on /payments/verify, order_shipped on admin PATCH status=shipped, order_refunded on refund. Admin endpoints GET /api/admin/emails (optional ?template=) and GET /api/admin/emails/{id}."

  - task: "Locations CRUD (public GET /api/locations, admin CRUD /api/admin/locations)"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Public GET returns only active=true, sorted by order. Admin GET returns all. POST creates via Location model. PATCH/DELETE by id. Seeded 2 real WTH addresses (Mumbai Design Center primary, Kerala Registered Office)."

  - task: "Bulk Product Upload (CSV/XLSX) + Template download"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "GET /api/admin/products/template.csv returns a StreamingResponse CSV with headers, 3 sample rows, and instructions (lines starting with # are skipped on upload). Uses live category slugs in instructions. POST /api/admin/products/bulk accepts multipart file (.csv/.xlsx/.xls). Rows matching an existing sku OR slug are UPDATED; others CREATED. Validates: name required, category_slug must exist, price > 0. Returns {ok, total_rows, created, updated, errors:[{row,error}]}. Handles UTF-8 BOM (Google Sheets exports) and boolean strings (true/false/1/0/yes/no)."

  - task: "Blog CRUD (public GET /api/blog, /api/blog/{slug} + admin /api/admin/blog)"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Public GET /api/blog returns paginated {items,total} with published=true only, sorted by published_at desc. Public GET /api/blog/{slug} returns {post,related}. Admin GET/POST/PATCH/DELETE at /api/admin/blog. Slug is unique. When toggling published=true for the first time, published_at auto-set. Seeded 3 posts (bp_01/02/03)."

  - task: "Instagram Feed (curated / mocked) — public /api/instagram + admin CRUD"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Public GET /api/instagram?limit= returns active=true sorted by order. Admin CRUD. Each post can carry product_ids (shoppable tags). Seeded 6 posts (ig_01..06) linked to real seeded products."

  - task: "Analytics — track events + admin summary (mocked GA/FB Pixel + real orders)"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "POST /api/analytics/track (public, records to analytics_events with user_agent). Referrer parsed into Instagram/Google/Facebook/Direct/Other buckets. GET /api/admin/analytics/summary?days= returns {series (per-day page_views/orders/revenue), totals (page_views/orders/revenue/conversion_percent/aov), top_products (aggregated from paid orders), traffic_sources (real + mocked baseline), pixel_ga_id, pixel_fb_id, mocked:true, range_days}. When total tracked events < 20 the per-day pv is synthesized as a mocked baseline correlated with real orders."

  - task: "Google Sheets import for products (POST /api/admin/products/import-sheet)"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Accepts any Google Sheets URL variant (edit#gid=0 / view / already-csv). Extracts spreadsheet id + gid via regex, builds /export?format=csv&gid= URL, fetches via httpx (follow_redirects, 20s timeout), then reuses bulk_upload_products pipeline. Errors: 400 if URL not parseable, 400 if sheet is HTML (not shared publicly), 502 on network error."

  - task: "QR Reviews — token generation, public submission, expiry & single-use guard"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "POST /api/admin/reviews/qr/generate returns {token, review_url, expires_at, ...}. GET /api/admin/reviews/qr lists all. GET /api/admin/reviews/qr/{token}/image.png returns PNG bytes (Content-Type image/png). Public GET /api/r/{token} returns {product, order, customer_name} or 404/410. Public POST /api/r/{token} validates 1<=rating<=5 and text length>=5, creates a Review(source='QR', published=False, verified=True), marks token used, links to order/product from token. Reusing returns 410. Uses PUBLIC_APP_URL env var to build review_url."

  - task: "Google Business Locations — CRUD + review sync (mocked when no API key)"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Admin CRUD on /api/admin/google-locations. POST /api/admin/google-locations/{id}/sync fetches reviews via Google Places API v1 when GOOGLE_PLACES_API_KEY is set; falls back to _fetch_google_reviews MOCKED data (5 reviews from a curated pool) when key is absent. Imports/updates reviews (idempotent via google_review_id), auto-publishes when rating>=min_rating_to_publish (default 4). Updates location.rating + review_count + last_synced_at. POST /api/admin/google-locations/sync-all iterates active locations. Seeded 2 locations (gbl_01 Mumbai, gbl_02 Ernakulam)."

frontend:
  - task: "Storefront + Admin panel wiring (React 19)"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/App.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Wired HelmetProvider + AuthProvider + CartProvider. RedirectGate applies redirects client-side. SeoHelmet injects meta per route. Admin routes protected by ProtectedAdmin. Storefront (Home/Shop/ProductDetail) now fetches from API with mock fallback. Checkout + OrderSuccess connected. Not requesting frontend automated testing yet — waiting for user approval."

metadata:
  created_by: "main_agent"
  version: "1.2"
  test_sequence: 2
  run_ui: false

test_plan:
  current_focus:
    - "QR Reviews — token generation, public submission, expiry & single-use guard"
    - "Google Business Locations — CRUD + review sync (mocked when no API key)"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: "Backend v1 implemented. All admin endpoints require session_token cookie or Bearer header — use the mongo test-user technique from /app/auth_testing.md to create a session for admin endpoints. Razorpay + Shiprocket integrations are explicitly MOCKED (endpoints return mocked=true). Please test all backend flows: public catalog fetching, coupon validation (HOPE10 with subtotal 1000 → 100 off; FLAT100 with 800 → 100 off), order creation → payment verify (auto success + Shiprocket AWB), admin listing/updating orders/coupons/reviews/SEO, sitemap.xml + robots.txt content. Base URL comes from REACT_APP_BACKEND_URL — please use that public URL, NOT localhost."
  - agent: "testing"
    message: "Backend testing complete. 40/42 tests passed. All core functionality working correctly including auth, products, categories, reviews, coupons, orders, payments (MOCKED), shipping (MOCKED), newsletter, SEO, and admin endpoints. Two issues found: (1) sitemap.xml and robots.txt not accessible via public URL due to ingress routing to frontend (backend endpoints verified working on localhost:8001) - this is an infrastructure issue, not backend code bug; (2) OrderCreate model requires full OrderItem structure forcing clients to fetch product details before order creation - recommend creating OrderItemCreate model with just product_id, qty, customization for cleaner API. All MOCKED integrations clearly marked with mocked=true in responses."
  - agent: "main"
    message: "Phase C is implemented. Please test the four NEW backend flows against REACT_APP_BACKEND_URL. Use /app/memory/test_credentials.md to create an admin session via mongosh and pass Bearer token. Flows to verify: (1) Full order lifecycle → order_placed email queued in email_outbox → verify payment → order_paid email + Shiprocket AWB + tracking → PATCH admin/orders/{on} status=shipped → order_shipped email → POST admin/orders/{on}/refund with reason → refunded status + order_refunded email + stock restored. (2) Refund on non-paid order returns 400. (3) GET /api/invoices/{order_number} returns HTML containing order_number and total; 404 for unknown. (4) Abandoned cart: POST /api/cart/track (twice with same email upserts), GET /api/admin/abandoned-carts returns {stale, all}, POST /api/admin/abandoned-carts/{id}/send-recovery queues abandoned_cart email and sets recovery_email_sent=true. Placing a real order for that email should mark recovered=true. (5) GET /api/admin/emails lists mocked emails, filter by ?template=order_paid works, GET /api/admin/emails/{id} returns single. Backend only — DO NOT run frontend tests yet."
