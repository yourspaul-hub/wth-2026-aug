"""Wear The Hope — Phase E backend tests.

Covers four new features:
  1) BLOG — public list/detail + admin CRUD
     - GET /api/blog?limit&skip&tag (only published, sorted by published_at desc)
     - GET /api/blog/{slug} (published only, 404 for draft/unknown, related<=3, excludes self)
     - GET /api/admin/blog (Bearer, includes drafts)
     - POST/PATCH/DELETE /api/admin/blog (slug unique; published=true first time -> published_at)

  2) INSTAGRAM FEED (curated / mocked)
     - GET /api/instagram?limit=N (active only, sorted by 'order' asc)
     - GET /api/admin/instagram (auth)
     - POST/PATCH/DELETE /api/admin/instagram (product_ids array persists)

  3) ANALYTICS (mocked GA + FB Pixel baseline)
     - POST /api/analytics/track (no auth, stores UA header, returns {ok, mocked:true})
     - GET /api/admin/analytics/summary?days=30 (auth) — full shape:
         series[30], totals{page_views,orders,revenue,conversion_percent,aov},
         top_products, traffic_sources, pixel_ga_id, pixel_fb_id, mocked, range_days
     - Referrer categorisation: instagram.com -> Instagram, google.com -> Google, ''->Direct
     - Synthesised page_views baseline when < 20 tracked events across the range
     - Orders/revenue reflected in totals & today's series entry when a paid order is created

  4) GOOGLE SHEETS IMPORTER
     - POST /api/admin/products/import-sheet (auth)
     - Random string / bad URL   -> 400 'Could not extract Google Sheets ID'
     - Valid-looking URL variants with fake id -> 400 'shared publicly' or 'Failed to fetch'
       (NOT 'Could not extract' — proves URL parsing worked for edit#gid=0, /edit, /view, ?gid=N)
     - No Bearer -> 401

  5) Regression sanity: /api/products (paginated), /api/locations, HOPE10 coupon,
     admin 401 without Bearer.

Uses REACT_APP_BACKEND_URL. Admin token minted directly in Mongo per
/app/memory/test_credentials.md. All test-created blog/IG/events cleaned up.
"""
import os
import subprocess
import uuid

import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://wear-interactive.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"


# ------------------------------------------------------------------
# Session helpers
# ------------------------------------------------------------------
def _mongo_eval(js: str) -> str:
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    return subprocess.check_output(
        ['mongosh', mongo_url, '--quiet', '--eval', js], text=True
    ).strip()


def _mint_admin_token() -> str:
    db_name = os.environ.get('DB_NAME', 'test_database')
    js = f"""
const dbn = '{db_name}';
const userId = 'admin-pytestE-' + Date.now();
const sessionToken = 'pytestE_sess_' + Date.now() + '_' + Math.random().toString(36).slice(2,10);
db.getSiblingDB(dbn).admin_users.insertOne({{
  user_id: userId, email: 'admin+'+userId+'@wearthehope.io',
  name: 'Pytest E Admin', picture: 'https://via.placeholder.com/150',
  role: 'admin', created_at: new Date()
}});
db.getSiblingDB(dbn).admin_sessions.insertOne({{
  user_id: userId, session_token: sessionToken,
  expires_at: new Date(Date.now()+7*24*60*60*1000),
  created_at: new Date()
}});
print(sessionToken);
"""
    out = _mongo_eval(js)
    return out.splitlines()[-1].strip()


@pytest.fixture(scope='session')
def admin_token():
    return _mint_admin_token()


@pytest.fixture(scope='session')
def admin_headers(admin_token):
    return {'Authorization': f'Bearer {admin_token}'}


@pytest.fixture(scope='session')
def admin_json_headers(admin_token):
    return {'Authorization': f'Bearer {admin_token}', 'Content-Type': 'application/json'}


# ------------------------------------------------------------------
# Cleanup buckets
# ------------------------------------------------------------------
_created_blog_ids: list = []
_created_ig_ids: list = []
_created_event_paths: list = []  # analytics paths we created — cleanup by path
_created_order_numbers: list = []  # orders created for analytics test


@pytest.fixture(scope='session', autouse=True)
def cleanup_after_tests():
    yield
    db_name = os.environ.get('DB_NAME', 'test_database')
    if _created_blog_ids:
        arr = ','.join(f'"{i}"' for i in _created_blog_ids)
        _mongo_eval(f"db.getSiblingDB('{db_name}').blog_posts.deleteMany({{id: {{$in: [{arr}]}}}})")
    if _created_ig_ids:
        arr = ','.join(f'"{i}"' for i in _created_ig_ids)
        _mongo_eval(f"db.getSiblingDB('{db_name}').instagram_posts.deleteMany({{id: {{$in: [{arr}]}}}})")
    if _created_event_paths:
        arr = ','.join(f'"{p}"' for p in _created_event_paths)
        _mongo_eval(f"db.getSiblingDB('{db_name}').analytics_events.deleteMany({{path: {{$in: [{arr}]}}}})")
    if _created_order_numbers:
        arr = ','.join(f'"{o}"' for o in _created_order_numbers)
        _mongo_eval(f"db.getSiblingDB('{db_name}').orders.deleteMany({{order_number: {{$in: [{arr}]}}}})")


# ==================================================================
# 1. BLOG
# ==================================================================
class TestBlogPublic:
    """GET /api/blog and /api/blog/{slug} — published only."""

    def test_public_list_shape_and_published_only(self):
        r = requests.get(f"{API}/blog")
        assert r.status_code == 200, r.text
        data = r.json()
        assert 'items' in data and 'total' in data
        assert isinstance(data['items'], list)
        assert data['total'] >= 3  # seeded 3
        # All returned posts must be published
        for p in data['items']:
            assert p.get('published') is True, f"Unpublished post leaked: {p.get('slug')}"

    def test_public_list_sorted_by_published_at_desc(self):
        r = requests.get(f"{API}/blog")
        items = r.json()['items']
        # published_at may be ISO string; None goes last. Check monotonic desc.
        dates = [p.get('published_at') or '' for p in items]
        assert dates == sorted(dates, reverse=True), f"Not sorted desc: {dates}"

    def test_public_list_limit_skip_and_tag_filter(self):
        r = requests.get(f"{API}/blog", params={'limit': 1, 'skip': 0})
        assert r.status_code == 200
        assert len(r.json()['items']) == 1

        # Filter by seeded tag 'story' -> should include bp_01 only
        r = requests.get(f"{API}/blog", params={'tag': 'story'})
        assert r.status_code == 200
        items = r.json()['items']
        assert len(items) >= 1
        assert all('story' in (p.get('tags') or []) for p in items)

    def test_public_get_detail_ok(self):
        r = requests.get(f"{API}/blog/the-story-of-hope")
        assert r.status_code == 200, r.text
        data = r.json()
        assert 'post' in data and 'related' in data
        assert data['post']['slug'] == 'the-story-of-hope'
        assert data['post']['published'] is True
        # Related excludes self, capped at 3
        assert isinstance(data['related'], list)
        assert len(data['related']) <= 3
        for rel in data['related']:
            assert rel['slug'] != 'the-story-of-hope'

    def test_public_get_unknown_slug_404(self):
        r = requests.get(f"{API}/blog/definitely-does-not-exist-xyz")
        assert r.status_code == 404

    def test_public_get_draft_returns_404(self, admin_json_headers):
        # Create a draft (published=false) then hit public detail -> 404
        slug = f'test-draft-{uuid.uuid4().hex[:8]}'
        r = requests.post(f"{API}/admin/blog", headers=admin_json_headers,
                          json={'slug': slug, 'title': 'TEST Draft', 'published': False})
        assert r.status_code == 200, r.text
        _created_blog_ids.append(r.json()['id'])
        pub = requests.get(f"{API}/blog/{slug}")
        assert pub.status_code == 404, f"Draft leaked to public: {pub.status_code} {pub.text}"


class TestBlogAdminCRUD:
    """Admin CRUD — auth required, slug unique, first-publish sets published_at."""

    def test_admin_list_requires_auth(self):
        r = requests.get(f"{API}/admin/blog")
        assert r.status_code == 401

    def test_admin_list_includes_drafts(self, admin_headers, admin_json_headers):
        slug = f'test-includes-drafts-{uuid.uuid4().hex[:8]}'
        r = requests.post(f"{API}/admin/blog", headers=admin_json_headers,
                          json={'slug': slug, 'title': 'TEST Includes Drafts', 'published': False})
        assert r.status_code == 200
        pid = r.json()['id']
        _created_blog_ids.append(pid)

        r = requests.get(f"{API}/admin/blog", headers=admin_headers)
        assert r.status_code == 200
        posts = r.json()
        slugs = [p['slug'] for p in posts]
        assert slug in slugs

    def test_create_duplicate_slug_returns_400(self, admin_json_headers):
        slug = f'test-dup-{uuid.uuid4().hex[:8]}'
        r1 = requests.post(f"{API}/admin/blog", headers=admin_json_headers,
                           json={'slug': slug, 'title': 'TEST Dup 1'})
        assert r1.status_code == 200
        _created_blog_ids.append(r1.json()['id'])
        r2 = requests.post(f"{API}/admin/blog", headers=admin_json_headers,
                           json={'slug': slug, 'title': 'TEST Dup 2'})
        assert r2.status_code == 400

    def test_publish_first_time_sets_published_at(self, admin_json_headers, admin_headers):
        slug = f'test-first-publish-{uuid.uuid4().hex[:8]}'
        r = requests.post(f"{API}/admin/blog", headers=admin_json_headers,
                          json={'slug': slug, 'title': 'TEST First Publish', 'published': False})
        assert r.status_code == 200
        post = r.json()
        pid = post['id']
        _created_blog_ids.append(pid)
        assert post.get('published_at') in (None, '', 'null')

        # Publish it
        r2 = requests.patch(f"{API}/admin/blog/{pid}", headers=admin_json_headers,
                            json={'published': True})
        assert r2.status_code == 200
        updated = r2.json()
        assert updated['published'] is True
        assert updated.get('published_at'), 'published_at should be set on first publish'

    def test_patch_partial_update(self, admin_json_headers):
        slug = f'test-patch-{uuid.uuid4().hex[:8]}'
        r = requests.post(f"{API}/admin/blog", headers=admin_json_headers,
                          json={'slug': slug, 'title': 'TEST Patch', 'read_minutes': 3})
        assert r.status_code == 200
        pid = r.json()['id']
        _created_blog_ids.append(pid)

        r2 = requests.patch(f"{API}/admin/blog/{pid}", headers=admin_json_headers,
                            json={'read_minutes': 9})
        assert r2.status_code == 200
        assert r2.json()['read_minutes'] == 9
        # Other fields intact
        assert r2.json()['title'] == 'TEST Patch'
        assert r2.json()['slug'] == slug

    def test_delete_blog(self, admin_json_headers, admin_headers):
        slug = f'test-del-{uuid.uuid4().hex[:8]}'
        r = requests.post(f"{API}/admin/blog", headers=admin_json_headers,
                          json={'slug': slug, 'title': 'TEST Del'})
        assert r.status_code == 200
        pid = r.json()['id']

        r2 = requests.delete(f"{API}/admin/blog/{pid}", headers=admin_headers)
        assert r2.status_code == 200
        assert r2.json().get('ok') is True

        # Verify gone in admin list
        r3 = requests.get(f"{API}/admin/blog", headers=admin_headers)
        assert pid not in [p['id'] for p in r3.json()]


# ==================================================================
# 2. INSTAGRAM FEED
# ==================================================================
class TestInstagramPublic:
    def test_public_returns_active_only_sorted_by_order(self):
        r = requests.get(f"{API}/instagram", params={'limit': 20})
        assert r.status_code == 200
        posts = r.json()
        assert isinstance(posts, list)
        assert len(posts) >= 6, f"Expected at least 6 seeded IG posts, got {len(posts)}"
        # active
        for p in posts:
            assert p.get('active') is True
        # sorted by order asc
        orders = [p.get('order', 0) for p in posts]
        assert orders == sorted(orders), f"IG not sorted asc by 'order': {orders}"

    def test_public_limit_param(self):
        r = requests.get(f"{API}/instagram", params={'limit': 3})
        assert r.status_code == 200
        assert len(r.json()) <= 3


class TestInstagramAdmin:
    def test_admin_list_requires_auth(self):
        r = requests.get(f"{API}/admin/instagram")
        assert r.status_code == 401

    def test_admin_crud_and_product_ids_persist(self, admin_json_headers, admin_headers):
        payload = {
            'caption': 'TEST IG post ' + uuid.uuid4().hex[:6],
            'image': 'https://example.com/ig.jpg',
            'permalink': 'https://instagram.com/p/TEST/',
            'likes': 10, 'comments': 2,
            'product_ids': ['p_xyz1', 'p_xyz2'],
            'active': False,  # inactive on create
            'order': 99,
        }
        r = requests.post(f"{API}/admin/instagram", headers=admin_json_headers, json=payload)
        assert r.status_code == 200, r.text
        doc = r.json()
        iid = doc['id']
        _created_ig_ids.append(iid)
        assert doc['product_ids'] == ['p_xyz1', 'p_xyz2']
        assert doc['active'] is False

        # Public feed should NOT include it (active=false)
        pub = requests.get(f"{API}/instagram", params={'limit': 50}).json()
        assert iid not in [p['id'] for p in pub]

        # Admin list should include it
        adm = requests.get(f"{API}/admin/instagram", headers=admin_headers).json()
        assert iid in [p['id'] for p in adm]

        # PATCH -> flip active + change product_ids
        r2 = requests.patch(f"{API}/admin/instagram/{iid}", headers=admin_json_headers,
                            json={'active': True, 'product_ids': ['p_xyz3']})
        assert r2.status_code == 200
        assert r2.json()['active'] is True
        assert r2.json()['product_ids'] == ['p_xyz3']

        # Now visible on public
        pub2 = requests.get(f"{API}/instagram", params={'limit': 50}).json()
        assert iid in [p['id'] for p in pub2]

        # DELETE
        r3 = requests.delete(f"{API}/admin/instagram/{iid}", headers=admin_headers)
        assert r3.status_code == 200
        assert r3.json().get('ok') is True


# ==================================================================
# 3. ANALYTICS
# ==================================================================
class TestAnalyticsTrack:
    def test_track_no_auth_ok_and_ua_stored(self):
        path = f"/TEST-track-{uuid.uuid4().hex[:8]}"
        _created_event_paths.append(path)
        r = requests.post(
            f"{API}/analytics/track",
            headers={'User-Agent': 'PytestE-UA/1.0'},
            json={'name': 'page_view', 'path': path, 'referrer': 'https://www.instagram.com/x'},
        )
        assert r.status_code == 200, r.text
        assert r.json() == {'ok': True, 'mocked': True}

        # Verify persistence via Mongo (UA capture)
        db_name = os.environ.get('DB_NAME', 'test_database')
        out = _mongo_eval(
            f"const d=db.getSiblingDB('{db_name}').analytics_events.findOne({{path:'{path}'}});"
            f"print(d ? d.user_agent : 'NONE');"
        )
        # last line is the printed UA
        ua = out.splitlines()[-1].strip()
        assert 'PytestE-UA' in ua, f"UA not captured, got: {ua!r}"


class TestAnalyticsSummary:
    def test_summary_requires_auth(self):
        r = requests.get(f"{API}/admin/analytics/summary")
        assert r.status_code == 401

    def test_summary_shape_and_mocked_baseline(self, admin_headers):
        r = requests.get(f"{API}/admin/analytics/summary", params={'days': 30}, headers=admin_headers)
        assert r.status_code == 200, r.text
        data = r.json()
        # top-level shape
        for k in ('mocked', 'range_days', 'series', 'totals', 'top_products',
                  'traffic_sources', 'pixel_ga_id', 'pixel_fb_id'):
            assert k in data, f"Missing top-level key: {k}"
        assert data['mocked'] is True
        assert data['range_days'] == 30
        assert data['pixel_ga_id'] == 'G-MOCKED-XXXXX'
        assert data['pixel_fb_id'] == 'FBPIXEL_MOCKED'

        # series length == 30
        assert isinstance(data['series'], list)
        assert len(data['series']) == 30
        for s in data['series']:
            for k in ('date', 'label', 'page_views', 'orders', 'revenue'):
                assert k in s

        # baseline synthesized when tracked events < 20 (very likely in test env)
        # Ensure at least some page_views > 0 across the series
        total_pv = sum(s['page_views'] for s in data['series'])
        assert total_pv > 0, 'Baseline page_views not synthesised for empty env'

        # totals keys
        for k in ('page_views', 'orders', 'revenue', 'conversion_percent', 'aov'):
            assert k in data['totals']

        # traffic_sources non-empty
        assert isinstance(data['traffic_sources'], list)
        assert len(data['traffic_sources']) > 0
        for ts in data['traffic_sources']:
            assert 'source' in ts and 'value' in ts

    def test_referrer_categorisation(self, admin_headers):
        # Track events with different referrers, then verify summary source split
        db_name = os.environ.get('DB_NAME', 'test_database')

        # Wipe any prior test referrer events for a clean signal
        _mongo_eval(f"db.getSiblingDB('{db_name}').analytics_events.deleteMany({{path: /^\\/TEST-ref-/}});")

        refs = [
            ('https://www.instagram.com/wearthehope', 'Instagram', 3),
            ('https://www.google.com/search?q=wth', 'Google', 2),
            ('', 'Direct', 2),
        ]
        for ref, _label, count in refs:
            for i in range(count):
                path = f"/TEST-ref-{_label}-{i}-{uuid.uuid4().hex[:6]}"
                _created_event_paths.append(path)
                rr = requests.post(f"{API}/analytics/track",
                                   json={'name': 'page_view', 'path': path, 'referrer': ref})
                assert rr.status_code == 200

        r = requests.get(f"{API}/admin/analytics/summary", params={'days': 30}, headers=admin_headers)
        assert r.status_code == 200
        ts = {t['source']: t['value'] for t in r.json()['traffic_sources']}
        # At least the counts we added should be counted under each bucket
        assert ts.get('Instagram', 0) >= 3, ts
        assert ts.get('Google', 0) >= 2, ts
        assert ts.get('Direct', 0) >= 2, ts

    def test_orders_reflected_in_totals(self, admin_headers):
        # Insert a paid order for today directly via mongo and verify summary totals
        db_name = os.environ.get('DB_NAME', 'test_database')
        order_number = f"WTH-TESTE-{uuid.uuid4().hex[:6].upper()}"
        _created_order_numbers.append(order_number)
        js = f"""
db.getSiblingDB('{db_name}').orders.insertOne({{
  id: 'o_teste_{uuid.uuid4().hex[:8]}',
  order_number: '{order_number}',
  items: [{{product_id:'p_teste', name:'Test Item', image:'https://x', price:499, qty:2}}],
  shipping_address: {{
    full_name:'T E', email:'t@e.com', phone:'9999999999',
    line1:'a', city:'Mumbai', state:'MH', pincode:'400001', country:'India'
  }},
  subtotal: 998, discount: 0, shipping_fee: 0, tax: 0, total: 998,
  status:'paid', payment_status:'paid', payment_provider:'razorpay',
  created_at: new Date(), updated_at: new Date()
}});
"""
        _mongo_eval(js)

        r = requests.get(f"{API}/admin/analytics/summary", params={'days': 30}, headers=admin_headers)
        assert r.status_code == 200
        data = r.json()

        # Totals include our order
        assert data['totals']['orders'] >= 1
        assert data['totals']['revenue'] >= 998

        # Today's series entry must reflect it
        today_key = data['series'][-1]  # last entry = today
        assert today_key['orders'] >= 1, today_key
        assert today_key['revenue'] >= 998, today_key


# ==================================================================
# 4. GOOGLE SHEETS IMPORTER
# ==================================================================
class TestSheetsImporter:
    def test_requires_auth(self):
        r = requests.post(f"{API}/admin/products/import-sheet",
                          json={'url': 'https://docs.google.com/spreadsheets/d/anyid/edit'})
        assert r.status_code == 401

    def test_random_string_returns_400_could_not_extract(self, admin_json_headers):
        r = requests.post(f"{API}/admin/products/import-sheet",
                          headers=admin_json_headers,
                          json={'url': 'this-is-not-a-url'})
        assert r.status_code == 400
        assert 'Could not extract' in r.json().get('detail', ''), r.text

    def test_invalid_domain_returns_400_could_not_extract(self, admin_json_headers):
        r = requests.post(f"{API}/admin/products/import-sheet",
                          headers=admin_json_headers,
                          json={'url': 'https://docs.google.com/spreadsheets/'})
        assert r.status_code == 400
        assert 'Could not extract' in r.json().get('detail', '')

    @pytest.mark.parametrize('url', [
        'https://docs.google.com/spreadsheets/d/1FakeButValidLookingId_TESTE_xxxx/edit#gid=0',
        'https://docs.google.com/spreadsheets/d/1FakeButValidLookingId_TESTE_xxxx/edit',
        'https://docs.google.com/spreadsheets/d/1FakeButValidLookingId_TESTE_xxxx/view',
        'https://docs.google.com/spreadsheets/d/1FakeButValidLookingId_TESTE_xxxx/edit?gid=123',
    ])
    def test_valid_url_variants_parse_but_fail_fetch(self, admin_json_headers, url):
        """URL parsing succeeded (sid extracted) so we should NOT get 'Could not extract'."""
        r = requests.post(f"{API}/admin/products/import-sheet",
                          headers=admin_json_headers, json={'url': url})
        # Depending on Google's response the code returns 400 (non-200 / html) or 502 (network).
        assert r.status_code in (400, 502), r.text
        detail = r.json().get('detail', '')
        assert 'Could not extract' not in detail, f"URL parser rejected valid-shape URL: {detail}"
        # Should mention one of the expected fetch-failure messages
        assert any(s in detail for s in ('shared', 'not public', 'Failed to fetch',
                                         'Google Sheets returned')), detail


# ==================================================================
# 5. REGRESSION SANITY
# ==================================================================
class TestRegression:
    def test_products_paginated_shape(self):
        r = requests.get(f"{API}/products")
        assert r.status_code == 200
        data = r.json()
        assert 'items' in data and 'total' in data
        assert isinstance(data['items'], list)

    def test_locations_public(self):
        r = requests.get(f"{API}/locations")
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        assert len(r.json()) >= 1

    def test_hope10_coupon_validate(self):
        r = requests.post(f"{API}/coupons/validate", json={'code': 'HOPE10', 'subtotal': 2000})
        assert r.status_code == 200, r.text
        data = r.json()
        # Accept any shape but must indicate coupon accepted (discount>0 or ok=true)
        assert data.get('ok') is True or data.get('discount', 0) > 0, data

    def test_admin_401_without_bearer(self):
        for path in ('/admin/blog', '/admin/instagram',
                     '/admin/analytics/summary', '/admin/products/import-sheet'):
            method = requests.post if path.endswith('import-sheet') else requests.get
            r = method(f"{API}{path}", json={'url': 'x'} if path.endswith('import-sheet') else None)
            assert r.status_code == 401, f"{path} did not require auth: {r.status_code}"
