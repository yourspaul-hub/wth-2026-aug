"""Wear The Hope — Phase F backend tests.

Covers the Reviews module completion:
  1) QR REVIEW TOKENS (admin generate/list/image/delete + public info/submit)
  2) GOOGLE BUSINESS LOCATIONS + MOCKED REVIEW SYNC
  3) Auth 401 for all new admin endpoints
  4) Regression sanity (products paginated, blog, instagram, analytics track,
     HOPE10 coupon)

Uses REACT_APP_BACKEND_URL. Admin token minted directly in Mongo.
All test-created QR tokens, google-locations, reviews, and any events cleaned
up via mongosh teardown.
"""
import json
import os
import subprocess
import time
import uuid
from datetime import datetime, timedelta, timezone

import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://wear-interactive.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"
DB_NAME = os.environ.get('DB_NAME', 'test_database')
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')


# ------------------------------------------------------------------
# Mongo helpers
# ------------------------------------------------------------------
def _mongo_eval(js: str) -> str:
    return subprocess.check_output(
        ['mongosh', MONGO_URL, '--quiet', '--eval', js], text=True
    ).strip()


def _mint_admin_token() -> str:
    js = f"""
const dbn = '{DB_NAME}';
const userId = 'admin-pytestF-' + Date.now();
const sessionToken = 'pytestF_sess_' + Date.now() + '_' + Math.random().toString(36).slice(2,10);
db.getSiblingDB(dbn).admin_users.insertOne({{
  user_id: userId, email: 'admin+'+userId+'@wearthehope.io',
  name: 'Pytest F Admin', picture: 'https://via.placeholder.com/150',
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


# ------------------------------------------------------------------
# Session fixtures
# ------------------------------------------------------------------
@pytest.fixture(scope='session')
def admin_token():
    return _mint_admin_token()


@pytest.fixture(scope='session')
def admin_headers(admin_token):
    return {'Authorization': f'Bearer {admin_token}'}


@pytest.fixture(scope='session')
def admin_json_headers(admin_token):
    return {'Authorization': f'Bearer {admin_token}', 'Content-Type': 'application/json'}


# Cleanup buckets — populated during tests, drained in session teardown
_created_tokens: list = []
_created_gbl_ids: list = []
_created_review_ids: list = []
_expired_token_id: list = []  # will need to reset expires_at

# session-scoped shared state (mutable holders since fixtures can't easily share dicts)
STATE: dict = {}


@pytest.fixture(scope='session', autouse=True)
def cleanup_after_tests():
    yield
    # Remove any QR tokens created during tests
    if _created_tokens:
        arr = ','.join(f'"{t}"' for t in _created_tokens)
        _mongo_eval(f"db.getSiblingDB('{DB_NAME}').qr_tokens.deleteMany({{token: {{$in: [{arr}]}}}})")
    # Remove test-created google locations (only non-seed)
    if _created_gbl_ids:
        arr = ','.join(f'"{i}"' for i in _created_gbl_ids)
        _mongo_eval(f"db.getSiblingDB('{DB_NAME}').google_locations.deleteMany({{id: {{$in: [{arr}]}}}})")
    # Remove reviews synced from mocked google + reviews created via QR
    if _created_review_ids:
        arr = ','.join(f'"{i}"' for i in _created_review_ids)
        _mongo_eval(f"db.getSiblingDB('{DB_NAME}').reviews.deleteMany({{id: {{$in: [{arr}]}}}})")
    # Also nuke any gmock_ reviews created against gbl_01/gbl_02 (seeded)
    _mongo_eval(
        f"db.getSiblingDB('{DB_NAME}').reviews.deleteMany({{google_review_id: {{$regex: '^gmock_'}}}})"
    )
    # Reset seeded locations' sync stats so we don't leave test residue
    _mongo_eval(
        f"db.getSiblingDB('{DB_NAME}').google_locations.updateMany("
        f"{{id: {{$in: ['gbl_01','gbl_02']}}}}, "
        f"{{$set: {{last_synced_at: null, rating: null, review_count: 0}}}})"
    )


# ==================================================================
# 0. Bootstrap sanity — API up
# ==================================================================
def test_api_reachable():
    r = requests.get(f"{API}/reviews", timeout=15)
    assert r.status_code == 200, r.text


# ==================================================================
# 1. QR REVIEW TOKENS — admin
# ==================================================================
class TestQRGenerate:
    def test_generate_requires_auth(self):
        r = requests.post(f"{API}/admin/reviews/qr/generate", json={}, timeout=15)
        assert r.status_code == 401

    def test_generate_default_expiry_and_shape(self, admin_json_headers):
        # Fetch a real product id first (so the token has product context)
        pr = requests.get(f"{API}/products?limit=1", timeout=15).json()
        # /api/products may be paginated
        items = pr['items'] if isinstance(pr, dict) and 'items' in pr else pr
        assert items, 'expected at least one product in the DB'
        product_id = items[0]['id']

        payload = {
            'customer_name': 'PyF Buyer',
            'customer_email': 'pyf_buyer@example.com',
            'order_number': f'WTH-TEST-{uuid.uuid4().hex[:6].upper()}',
            'product_id': product_id,
        }
        r = requests.post(f"{API}/admin/reviews/qr/generate", json=payload, headers=admin_json_headers, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d['id'].startswith('qr_')
        assert isinstance(d['token'], str) and len(d['token']) == 10
        # lowercase letters + digits only
        assert all(c.islower() or c.isdigit() for c in d['token'])
        assert '/r/' + d['token'] in d['review_url']
        # Not used yet
        assert d['used'] is False
        assert d.get('review_id') is None
        # expires ~90 days in future
        exp = datetime.fromisoformat(d['expires_at'].replace('Z', '+00:00'))
        delta_days = (exp - datetime.now(timezone.utc)).days
        assert 85 <= delta_days <= 95, f'expected ~90d, got {delta_days}'
        # Record & save for downstream tests
        _created_tokens.append(d['token'])
        STATE['main_token'] = d['token']
        STATE['main_token_id'] = d['id']
        STATE['main_order_number'] = payload['order_number']
        STATE['main_product_id'] = product_id
        STATE['main_customer_email'] = payload['customer_email']


class TestQRList:
    def test_list_requires_auth(self):
        r = requests.get(f"{API}/admin/reviews/qr", timeout=15)
        assert r.status_code == 401

    def test_list_contains_created_and_sorted_desc(self, admin_headers):
        # Create a second token so we can verify sort order (newest first)
        payload = {'customer_name': 'PyF Buyer 2', 'expires_days': 30}
        c = requests.post(f"{API}/admin/reviews/qr/generate", json=payload, headers=admin_headers, timeout=15)
        assert c.status_code == 200
        second = c.json()['token']
        _created_tokens.append(second)

        r = requests.get(f"{API}/admin/reviews/qr", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        arr = r.json()
        assert isinstance(arr, list) and len(arr) >= 2
        tokens = [x['token'] for x in arr]
        assert second in tokens and STATE['main_token'] in tokens
        # newer token should come before older one
        assert tokens.index(second) < tokens.index(STATE['main_token']), 'expected DESC by created_at'
        # Every item has review_url
        for it in arr:
            assert '/r/' + it['token'] in it['review_url']


class TestQRImage:
    def test_image_requires_auth(self):
        r = requests.get(f"{API}/admin/reviews/qr/{STATE.get('main_token','xxxx')}/image.png", timeout=15)
        assert r.status_code == 401

    def test_image_valid_png(self, admin_headers):
        tok = STATE['main_token']
        r = requests.get(f"{API}/admin/reviews/qr/{tok}/image.png", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        assert r.headers.get('content-type', '').startswith('image/png')
        # PNG signature
        assert r.content[:8] == b'\x89PNG\r\n\x1a\n'
        assert len(r.content) > 500

    def test_image_unknown_token_404(self, admin_headers):
        r = requests.get(f"{API}/admin/reviews/qr/doesnotexist/image.png", headers=admin_headers, timeout=15)
        assert r.status_code == 404


# ==================================================================
# 2. QR public endpoints — /api/r/{token}
# ==================================================================
class TestQRPublicInfo:
    def test_public_info_ok(self):
        tok = STATE['main_token']
        r = requests.get(f"{API}/r/{tok}", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d['token'] == tok
        assert d['customer_name'] == 'PyF Buyer'
        # Email is redacted in public response for privacy (e.g. p***r@example.com)
        assert '***' in d['customer_email']
        assert d['customer_email'].endswith('@example.com')
        # product should be present since we passed product_id
        assert d['product'] is not None
        assert d['product']['id'] == STATE['main_product_id']
        # order not seeded in orders collection so it might be null (that's fine)
        # order field must exist though (may be null)
        assert 'order' in d

    def test_public_info_unknown_404(self):
        r = requests.get(f"{API}/r/thistokendoesnotexist", timeout=15)
        assert r.status_code == 404


class TestQRSubmit:
    def test_submit_happy_path(self):
        tok = STATE['main_token']
        payload = {
            'name': 'PyF Buyer',
            'rating': 5,
            'text': 'Loved it, super fast delivery.',
            'email': 'pyf_buyer@example.com',
            'photos': [],
        }
        r = requests.post(f"{API}/r/{tok}", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d['ok'] is True
        assert d['review_id'].startswith('r_')
        _created_review_ids.append(d['review_id'])
        STATE['main_review_id'] = d['review_id']

        # Verify DB doc via mongosh
        js = f"""
const doc = db.getSiblingDB('{DB_NAME}').reviews.findOne({{id: '{d["review_id"]}'}});
printjson({{
  source: doc.source, published: doc.published, verified: doc.verified,
  order_number: doc.order_number, product_id: doc.product_id, email: doc.email
}});
"""
        out = _mongo_eval(js)
        assert "source: 'QR'" in out or 'source: "QR"' in out
        assert 'published: false' in out
        assert 'verified: true' in out
        assert STATE['main_order_number'] in out
        assert STATE['main_product_id'] in out

        # Token marked used with used_at + review_id
        js2 = f"""
const tk = db.getSiblingDB('{DB_NAME}').qr_tokens.findOne({{token: '{tok}'}});
printjson({{used: tk.used, review_id: tk.review_id, has_used_at: !!tk.used_at}});
"""
        out2 = _mongo_eval(js2)
        assert 'used: true' in out2
        assert d['review_id'] in out2
        assert 'has_used_at: true' in out2

    def test_reuse_blocked_410(self):
        tok = STATE['main_token']
        r = requests.post(f"{API}/r/{tok}", json={
            'name': 'X', 'rating': 5, 'text': 'Try again please',
        }, timeout=15)
        assert r.status_code == 410
        assert 'already been used' in r.json().get('detail', '').lower()

    def test_public_info_after_use_410(self):
        tok = STATE['main_token']
        r = requests.get(f"{API}/r/{tok}", timeout=15)
        assert r.status_code == 410


class TestQRValidation:
    """Uses fresh tokens for each error case."""

    def _fresh_token(self, headers):
        r = requests.post(f"{API}/admin/reviews/qr/generate", json={'customer_name': 'V'}, headers=headers, timeout=15)
        assert r.status_code == 200
        tok = r.json()['token']
        _created_tokens.append(tok)
        return tok

    def test_rating_too_low(self, admin_json_headers):
        tok = self._fresh_token(admin_json_headers)
        r = requests.post(f"{API}/r/{tok}", json={
            'name': 'X', 'rating': 0, 'text': 'Some longer text here.'
        }, timeout=15)
        assert r.status_code == 400
        assert 'rating' in r.json().get('detail', '').lower()

    def test_rating_too_high(self, admin_json_headers):
        tok = self._fresh_token(admin_json_headers)
        r = requests.post(f"{API}/r/{tok}", json={
            'name': 'X', 'rating': 6, 'text': 'Some longer text here.'
        }, timeout=15)
        assert r.status_code == 400
        assert 'rating' in r.json().get('detail', '').lower()

    def test_text_too_short(self, admin_json_headers):
        tok = self._fresh_token(admin_json_headers)
        r = requests.post(f"{API}/r/{tok}", json={
            'name': 'X', 'rating': 5, 'text': 'hi'
        }, timeout=15)
        assert r.status_code == 400

    def test_missing_name_422(self, admin_json_headers):
        tok = self._fresh_token(admin_json_headers)
        r = requests.post(f"{API}/r/{tok}", json={
            'rating': 5, 'text': 'Great product overall.'
        }, timeout=15)
        assert r.status_code == 422


class TestQRExpiry:
    def test_expired_token_returns_410(self, admin_json_headers):
        # Create with expires_days=1
        r = requests.post(f"{API}/admin/reviews/qr/generate", json={
            'customer_name': 'Expiry Test', 'expires_days': 1
        }, headers=admin_json_headers, timeout=15)
        assert r.status_code == 200
        tok = r.json()['token']
        _created_tokens.append(tok)

        # Force expires_at into the past
        _mongo_eval(
            f"db.getSiblingDB('{DB_NAME}').qr_tokens.updateOne("
            f"{{token: '{tok}'}}, "
            f"{{$set: {{expires_at: new Date(Date.now()-86400000)}}}})"
        )

        # GET public info -> 410
        g = requests.get(f"{API}/r/{tok}", timeout=15)
        assert g.status_code == 410
        assert 'expired' in g.json().get('detail', '').lower()

        # POST submit -> 410
        p = requests.post(f"{API}/r/{tok}", json={
            'name': 'X', 'rating': 5, 'text': 'Great job here.'
        }, timeout=15)
        assert p.status_code == 410
        assert 'expired' in p.json().get('detail', '').lower()


class TestQRDelete:
    def test_delete_requires_auth(self):
        r = requests.delete(f"{API}/admin/reviews/qr/anything", timeout=15)
        assert r.status_code == 401

    def test_delete_removes_token(self, admin_json_headers):
        # Create a token specifically for deletion
        r = requests.post(f"{API}/admin/reviews/qr/generate", json={
            'customer_name': 'Delete Me'
        }, headers=admin_json_headers, timeout=15)
        assert r.status_code == 200
        tok = r.json()['token']
        # Track anyway for safety
        _created_tokens.append(tok)

        d = requests.delete(f"{API}/admin/reviews/qr/{tok}", headers=admin_json_headers, timeout=15)
        assert d.status_code == 200
        assert d.json() == {'ok': True}

        # After deletion, public info -> 404
        g = requests.get(f"{API}/r/{tok}", timeout=15)
        assert g.status_code == 404


# ==================================================================
# 3. GOOGLE BUSINESS LOCATIONS — CRUD + SYNC
# ==================================================================
class TestGoogleLocationsAuth:
    def test_list_401(self):
        assert requests.get(f"{API}/admin/google-locations", timeout=15).status_code == 401

    def test_create_401(self):
        assert requests.post(f"{API}/admin/google-locations", json={}, timeout=15).status_code == 401

    def test_patch_401(self):
        assert requests.patch(f"{API}/admin/google-locations/gbl_01", json={}, timeout=15).status_code == 401

    def test_delete_401(self):
        assert requests.delete(f"{API}/admin/google-locations/gbl_01", timeout=15).status_code == 401

    def test_sync_401(self):
        assert requests.post(f"{API}/admin/google-locations/gbl_01/sync", timeout=15).status_code == 401

    def test_sync_all_401(self):
        assert requests.post(f"{API}/admin/google-locations/sync-all", timeout=15).status_code == 401


class TestGoogleLocationsCRUD:
    def test_list_includes_seeded(self, admin_headers):
        r = requests.get(f"{API}/admin/google-locations", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        arr = r.json()
        ids = [x['id'] for x in arr]
        assert 'gbl_01' in ids and 'gbl_02' in ids

    def test_create_patch_delete(self, admin_json_headers):
        payload = {
            'label': 'Pytest Branch',
            'place_id': 'ChIJ_PYTEST_FAKE_PLACEID',
            'address': '123 Test Rd',
            'auto_publish': True,
            'min_rating_to_publish': 4,
            'active': True,
            'order': 99,
        }
        r = requests.post(f"{API}/admin/google-locations", json=payload, headers=admin_json_headers, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d['id'].startswith('gbl_')
        assert d['label'] == 'Pytest Branch'
        gid = d['id']
        _created_gbl_ids.append(gid)

        # PATCH
        p = requests.patch(f"{API}/admin/google-locations/{gid}", json={'label': 'Pytest Branch Updated', 'order': 100}, headers=admin_json_headers, timeout=15)
        assert p.status_code == 200
        assert p.json()['label'] == 'Pytest Branch Updated'
        assert p.json()['order'] == 100

        # DELETE
        de = requests.delete(f"{API}/admin/google-locations/{gid}", headers=admin_json_headers, timeout=15)
        assert de.status_code == 200
        # Confirm no longer in list
        arr = requests.get(f"{API}/admin/google-locations", headers=admin_json_headers, timeout=15).json()
        assert gid not in [x['id'] for x in arr]
        # Remove from cleanup list since we already deleted it
        _created_gbl_ids.remove(gid)


class TestGoogleSyncMocked:
    def test_sync_first_call(self, admin_json_headers):
        # Fetch the seeded location to know its place_id (used in gmock ids)
        arr = requests.get(f"{API}/admin/google-locations", headers=admin_json_headers, timeout=15).json()
        gbl01 = next(x for x in arr if x['id'] == 'gbl_01')
        STATE['gbl_01_place_id'] = gbl01['place_id']

        # Clean any pre-existing mock reviews for this place_id and location id
        _mongo_eval(
            f"db.getSiblingDB('{DB_NAME}').reviews.deleteMany({{"
            f"$or: [{{google_review_id: {{$regex: '^gmock_{gbl01['place_id']}_'}}}}, "
            f"{{google_location_id: 'gbl_01'}}]}})"
        )

        r = requests.post(f"{API}/admin/google-locations/gbl_01/sync", headers=admin_json_headers, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d['ok'] is True
        assert d['mocked'] is True
        assert d['imported'] >= 1
        assert d['updated'] == 0
        assert d['total_reviews_fetched'] == 5
        assert isinstance(d['location_rating'], (int, float))
        assert d['location_review_count'] >= 100
        STATE['gbl_01_rating'] = d['location_rating']
        STATE['gbl_01_review_count'] = d['location_review_count']

        # Location was updated with rating/last_synced_at
        arr = requests.get(f"{API}/admin/google-locations", headers=admin_json_headers, timeout=15).json()
        gbl01 = next(x for x in arr if x['id'] == 'gbl_01')
        assert gbl01.get('last_synced_at')
        assert gbl01.get('rating') == d['location_rating']
        assert gbl01.get('review_count') == d['location_review_count']

        # Track review ids for cleanup
        place_id = STATE['gbl_01_place_id']
        js = (
            f"const arr = db.getSiblingDB('{DB_NAME}').reviews.find("
            f"{{google_review_id: {{$regex: '^gmock_{place_id}_'}}}}, {{id: 1}}).toArray();"
            f"print(arr.map(x => x.id).join(','));"
        )
        raw = _mongo_eval(js)
        rids = [x for x in raw.splitlines()[-1].split(',') if x] if raw else []
        _created_review_ids.extend(rids)

    def test_public_reviews_include_mocked_high_rating(self):
        place_id = STATE['gbl_01_place_id']
        r = requests.get(f"{API}/reviews?limit=100", timeout=15)
        assert r.status_code == 200
        data = r.json()
        arr = data['items'] if isinstance(data, dict) else data
        mocked = [x for x in arr if (x.get('google_review_id') or '').startswith(f'gmock_{place_id}_')]
        # published=True only in this endpoint; each published one must have rating>=4
        for rv in mocked:
            assert rv['rating'] >= 4
            assert rv.get('verified') is True

        # And rating<4 mock reviews should exist in db but be unpublished — verify via mongosh
        js = (
            f"const arr = db.getSiblingDB('{DB_NAME}').reviews.find("
            f"{{google_review_id: {{$regex: '^gmock_{place_id}_'}}, rating: {{$lt: 4}}}}).toArray();"
            f"print(arr.length + '|' + arr.every(x => x.published===false));"
        )
        out = _mongo_eval(js).splitlines()[-1]
        # If any low-rated mock reviews got picked, they must all be published=false
        n_str, all_unpub = out.split('|')
        if int(n_str) > 0:
            assert all_unpub == 'true'

    def test_sync_idempotent(self, admin_json_headers):
        r = requests.post(f"{API}/admin/google-locations/gbl_01/sync", headers=admin_json_headers, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d['updated'] >= 1
        assert d['imported'] == 0


class TestGoogleSyncAll:
    def test_sync_all_active_only(self, admin_json_headers):
        # Create an inactive location; it should NOT be synced
        payload = {
            'label': 'Pytest Inactive',
            'place_id': 'ChIJ_PYTEST_INACTIVE',
            'active': False,
        }
        c = requests.post(f"{API}/admin/google-locations", json=payload, headers=admin_json_headers, timeout=15)
        assert c.status_code == 200
        inactive_id = c.json()['id']
        _created_gbl_ids.append(inactive_id)

        r = requests.post(f"{API}/admin/google-locations/sync-all", headers=admin_json_headers, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d['ok'] is True
        assert d['count'] >= 1
        assert isinstance(d['results'], list)
        ids_synced = [x['id'] for x in d['results']]
        assert inactive_id not in ids_synced
        # Seeded active locations should be in the sync-all results
        assert 'gbl_01' in ids_synced or 'gbl_02' in ids_synced
        for item in d['results']:
            assert 'label' in item
            assert item.get('mocked') is True
            assert 'imported' in item and 'updated' in item

        # Track any new reviews created by sync-all against gbl_02
        # Fetch gbl_02 place_id first
        arr2 = requests.get(f"{API}/admin/google-locations", headers=admin_json_headers, timeout=15).json()
        try:
            gbl02_place = next(x for x in arr2 if x['id'] == 'gbl_02')['place_id']
        except StopIteration:
            gbl02_place = ''
        if gbl02_place:
            js = (
                f"const arr = db.getSiblingDB('{DB_NAME}').reviews.find("
                f"{{google_review_id: {{$regex: '^gmock_{gbl02_place}_'}}}}, {{id: 1}}).toArray();"
                f"print(arr.map(x => x.id).join(','));"
            )
            raw = _mongo_eval(js)
            lines = raw.splitlines() if raw else []
            rids = [x for x in (lines[-1].split(',') if lines else []) if x]
            _created_review_ids.extend(rids)


# ==================================================================
# 4. Regression sanity
# ==================================================================
class TestRegression:
    def test_products_paginated(self):
        r = requests.get(f"{API}/products?limit=3", timeout=15)
        assert r.status_code == 200
        d = r.json()
        # Accept either legacy list OR paginated envelope
        if isinstance(d, dict):
            assert 'items' in d and isinstance(d['items'], list)
            assert 'total' in d
        else:
            assert isinstance(d, list)

    def test_blog_published_only(self):
        r = requests.get(f"{API}/blog?limit=5", timeout=15)
        assert r.status_code == 200
        arr = r.json() if isinstance(r.json(), list) else r.json().get('items', [])
        # If any results, they must be published
        for post in arr:
            # published field may be omitted in public response; check if present
            if 'published' in post:
                assert post['published'] is True

    def test_instagram_active_only(self):
        r = requests.get(f"{API}/instagram?limit=5", timeout=15)
        assert r.status_code == 200
        arr = r.json() if isinstance(r.json(), list) else r.json().get('items', [])
        for it in arr:
            if 'active' in it:
                assert it['active'] is True

    def test_analytics_track_still_works(self):
        r = requests.post(f"{API}/analytics/track", json={
            'name': 'page_view', 'path': f'/pytestF/{uuid.uuid4().hex[:6]}'
        }, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d.get('ok') is True

    def test_hope10_coupon_valid(self):
        r = requests.post(f"{API}/coupons/validate", json={'code': 'HOPE10', 'subtotal': 2000}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        # HOPE10 should be present in seed and active
        assert d.get('valid') is True, d
