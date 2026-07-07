"""Wear The Hope — Phase H backend tests.

Verifies the new /api/reviews shape + filters + stats + regression on
existing admin review flows.

New shape:
    {items:[], total:N,
     stats:{average, breakdown:{'1'..'5'}, total_all_published},
     skip:0, limit:60}

Public defaults to published=true. Admin uses ?published=false to see ALL.
"""
import os
import subprocess
import uuid
from datetime import datetime, timezone

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
const userId = 'admin-pytestH-' + Date.now();
const sessionToken = 'pytestH_sess_' + Date.now() + '_' + Math.random().toString(36).slice(2,10);
db.getSiblingDB(dbn).admin_users.insertOne({{
  user_id: userId, email: 'admin+'+userId+'@wearthehope.io',
  name: 'Pytest H Admin', picture: '',
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
_created_review_ids: list = []
_created_qr_tokens: list = []
STATE: dict = {}


@pytest.fixture(scope='session')
def admin_token():
    return _mint_admin_token()


@pytest.fixture(scope='session')
def admin_headers(admin_token):
    return {'Authorization': f'Bearer {admin_token}'}


@pytest.fixture(scope='session')
def admin_json_headers(admin_token):
    return {'Authorization': f'Bearer {admin_token}', 'Content-Type': 'application/json'}


@pytest.fixture(scope='session', autouse=True)
def prepare_and_cleanup(admin_json_headers):
    """Prepare seed data (google sync + manual + QR reviews) and cleanup after."""
    # ---- SETUP: sync gbl_01 + gbl_02 (mocked, idempotent) -> 10 google reviews
    for gid in ('gbl_01', 'gbl_02'):
        try:
            requests.post(
                f"{API}/admin/google-locations/{gid}/sync",
                headers=admin_json_headers, timeout=30,
            )
        except Exception as e:
            print(f'sync failed for {gid}: {e}')

    # Create 1 manual review (via admin POST)
    manual_payload = {
        'name': 'PYH Manual Buyer',
        'rating': 5,
        'text': 'Phase H manual review test — great quality!',
        'published': True,
    }
    r = requests.post(f"{API}/admin/reviews", json=manual_payload, headers=admin_json_headers, timeout=15)
    if r.status_code == 200:
        rid = r.json()['id']
        _created_review_ids.append(rid)
        STATE['manual_review_id'] = rid

    # Create 1 QR review via QR flow
    # 1) generate token
    qr_gen = requests.post(f"{API}/admin/reviews/qr/generate",
                           json={'customer_name': 'PYH QR Buyer'},
                           headers=admin_json_headers, timeout=15)
    if qr_gen.status_code == 200:
        tok = qr_gen.json()['token']
        _created_qr_tokens.append(tok)
        # 2) submit review
        sub = requests.post(f"{API}/r/{tok}",
                            json={'name': 'PYH QR Buyer', 'rating': 5,
                                  'text': 'Phase H QR review — loved it and would recommend!',
                                  'email': 'pyh_qr@example.com'},
                            timeout=15)
        if sub.status_code == 200:
            rid = sub.json()['review_id']
            _created_review_ids.append(rid)
            STATE['qr_review_id'] = rid
            # Publish the QR review so it shows up in the default public list
            requests.patch(f"{API}/admin/reviews/{rid}",
                           json={'published': True},
                           headers=admin_json_headers, timeout=15)

    yield

    # ---- TEARDOWN
    if _created_review_ids:
        arr = ','.join(f'"{i}"' for i in _created_review_ids)
        _mongo_eval(f"db.getSiblingDB('{DB_NAME}').reviews.deleteMany({{id: {{$in: [{arr}]}}}})")
    if _created_qr_tokens:
        arr = ','.join(f'"{t}"' for t in _created_qr_tokens)
        _mongo_eval(f"db.getSiblingDB('{DB_NAME}').qr_tokens.deleteMany({{token: {{$in: [{arr}]}}}})")
    # Also clean up any gmock_ reviews synced from mocked google (phase H owns since
    # we synced them here) to leave DB in same state
    _mongo_eval(
        f"db.getSiblingDB('{DB_NAME}').reviews.deleteMany({{google_review_id: {{$regex: '^gmock_'}}}})"
    )
    _mongo_eval(
        f"db.getSiblingDB('{DB_NAME}').google_locations.updateMany("
        f"{{id: {{$in: ['gbl_01','gbl_02']}}}}, "
        f"{{$set: {{last_synced_at: null, rating: null, review_count: 0}}}})"
    )


# ==================================================================
# 1. NEW SHAPE
# ==================================================================
class TestReviewsShape:
    def test_top_level_shape(self):
        r = requests.get(f"{API}/reviews", timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert isinstance(d, dict), f'expected dict, got {type(d)}'
        for key in ('items', 'total', 'stats', 'skip', 'limit'):
            assert key in d, f'missing key: {key}'
        assert isinstance(d['items'], list)
        assert isinstance(d['total'], int)
        assert isinstance(d['skip'], int)
        assert isinstance(d['limit'], int)
        assert d['skip'] == 0
        assert d['limit'] == 60

    def test_stats_shape(self):
        r = requests.get(f"{API}/reviews", timeout=15)
        d = r.json()
        stats = d['stats']
        assert 'average' in stats
        assert 'breakdown' in stats
        assert 'total_all_published' in stats
        # average is a float, 1 decimal (rounded)
        assert isinstance(stats['average'], (int, float))
        # Round to 1 decimal ourselves to confirm invariant
        assert round(float(stats['average']), 1) == float(stats['average'])
        # breakdown is dict with str keys '1'..'5'
        assert isinstance(stats['breakdown'], dict)
        for k in ('1', '2', '3', '4', '5'):
            assert k in stats['breakdown'], f'breakdown missing key {k}'
            assert isinstance(stats['breakdown'][k], int)
            assert stats['breakdown'][k] >= 0
        assert isinstance(stats['total_all_published'], int)
        assert stats['total_all_published'] >= 0

    def test_public_returns_only_published(self):
        r = requests.get(f"{API}/reviews?limit=200", timeout=15)
        d = r.json()
        for item in d['items']:
            assert item.get('published') is True, (
                f"non-published review in public list: {item.get('id')}"
            )

    def test_average_matches_breakdown(self):
        r = requests.get(f"{API}/reviews", timeout=15)
        stats = r.json()['stats']
        b = stats['breakdown']
        total_stars = sum(int(k) * b[k] for k in b)
        total = sum(b[k] for k in b)
        if total > 0:
            expected = round(total_stars / total, 1)
            assert stats['average'] == expected, (
                f'average={stats["average"]} expected={expected} breakdown={b}'
            )
            assert stats['total_all_published'] == total, (
                f"total_all_published={stats['total_all_published']} sum(breakdown)={total}"
            )
        else:
            assert stats['average'] == 0.0


# ==================================================================
# 2. FILTER: source
# ==================================================================
class TestSourceFilter:
    def _fetch(self, params=None):
        r = requests.get(f"{API}/reviews", params=params or {}, timeout=15)
        assert r.status_code == 200, r.text
        return r.json()

    def test_source_google(self):
        d = self._fetch({'source': 'google', 'limit': 100})
        assert d['total'] >= 1, 'expected at least one google review after gbl_01+gbl_02 sync'
        for item in d['items']:
            gid = item.get('google_review_id')
            assert gid, f'source=google returned item without google_review_id: {item.get("id")}'

    def test_source_qr(self):
        d = self._fetch({'source': 'qr', 'limit': 100})
        # QR review created in setup — published later, so must appear
        assert d['total'] >= 1, 'expected at least one QR review'
        for item in d['items']:
            assert item.get('source') == 'QR', f'source=qr returned non-QR item: {item}'

    def test_source_manual(self):
        d = self._fetch({'source': 'manual', 'limit': 100})
        # Manual review created in setup
        assert d['total'] >= 1, 'expected at least one manual review'
        for item in d['items']:
            assert not item.get('google_review_id'), (
                f'manual item should NOT have google_review_id: {item.get("id")}'
            )
            assert item.get('source') != 'QR', (
                f'manual item should NOT have source=QR: {item.get("id")}'
            )

    def test_stats_invariant_across_source_filters(self):
        """stats.breakdown and total_all_published MUST be independent of the filter."""
        base = self._fetch()['stats']
        for src in ('google', 'qr', 'manual'):
            filtered = self._fetch({'source': src})['stats']
            assert filtered['total_all_published'] == base['total_all_published'], (
                f'source={src}: total_all_published diverged: '
                f'{filtered["total_all_published"]} vs base {base["total_all_published"]}'
            )
            assert filtered['breakdown'] == base['breakdown'], (
                f'source={src}: breakdown diverged: {filtered["breakdown"]} vs base {base["breakdown"]}'
            )
            assert filtered['average'] == base['average']


# ==================================================================
# 3. FILTER: min_rating
# ==================================================================
class TestMinRatingFilter:
    def _fetch(self, params=None):
        r = requests.get(f"{API}/reviews", params=params or {}, timeout=15)
        assert r.status_code == 200
        return r.json()

    def test_min_rating_5(self):
        d = self._fetch({'min_rating': 5, 'limit': 100})
        for item in d['items']:
            assert item.get('rating', 0) >= 5

    def test_min_rating_4(self):
        d = self._fetch({'min_rating': 4, 'limit': 100})
        for item in d['items']:
            assert item.get('rating', 0) >= 4
        # 4-star filter should be >= 5-star filter
        five = self._fetch({'min_rating': 5, 'limit': 100})['total']
        assert d['total'] >= five

    def test_stats_invariant_across_min_rating(self):
        base = self._fetch()['stats']
        for mr in (3, 4, 5):
            s = self._fetch({'min_rating': mr})['stats']
            assert s['total_all_published'] == base['total_all_published']
            assert s['breakdown'] == base['breakdown']


# ==================================================================
# 4. PAGINATION
# ==================================================================
class TestPagination:
    def _fetch(self, params=None):
        return requests.get(f"{API}/reviews", params=params or {}, timeout=15).json()

    def test_limit(self):
        base = self._fetch({'limit': 100})
        if base['total'] < 3:
            pytest.skip('Not enough reviews to test pagination')
        d = self._fetch({'limit': 2})
        assert len(d['items']) == 2
        assert d['limit'] == 2
        assert d['total'] == base['total']  # total is unaffected by limit

    def test_skip(self):
        base = self._fetch({'limit': 100})
        if base['total'] < 3:
            pytest.skip('Not enough reviews to test skip')
        first_ids = [x['id'] for x in base['items'][:2]]
        skipped = self._fetch({'limit': 100, 'skip': 2})
        assert skipped['skip'] == 2
        skipped_ids = [x['id'] for x in skipped['items']]
        for fid in first_ids:
            assert fid not in skipped_ids, f'skip=2 still returned {fid} which was in first 2'

    def test_limit_100_returns_all(self):
        d = self._fetch({'limit': 100})
        assert len(d['items']) == d['total'], (
            f'expected all {d["total"]} items in single page (limit=100), '
            f'got {len(d["items"])}'
        )


# ==================================================================
# 5. BACKWARD COMPAT: ?published=false for admin
# ==================================================================
class TestAdminPublishedFalse:
    def test_response_still_object_with_items(self):
        """adminListReviews uses ?published=false and unwraps .items or fallback."""
        r = requests.get(f"{API}/reviews?published=false", timeout=15)
        assert r.status_code == 200
        d = r.json()
        # New shape returns dict — frontend does `r.data?.items || r.data || []`
        assert isinstance(d, dict), 'expected dict envelope'
        assert 'items' in d, 'admin call must expose items[]'
        assert isinstance(d['items'], list)

    def test_admin_sees_both_published_and_unpublished(self):
        # Create an unpublished review
        payload = {
            'name': 'PYH Unpublished',
            'rating': 3,
            'text': 'This review is intentionally unpublished for testing.',
            'published': False,
        }
        # Mint an admin token via mongo helper (STATE-based tokens don't work in this scope)
        tok = _mint_admin_token()
        headers = {'Authorization': f'Bearer {tok}', 'Content-Type': 'application/json'}
        c = requests.post(f"{API}/admin/reviews", json=payload, headers=headers, timeout=15)
        assert c.status_code == 200, c.text
        rid = c.json()['id']
        _created_review_ids.append(rid)

        # public list -> should NOT contain rid
        pub = requests.get(f"{API}/reviews?limit=200", timeout=15).json()
        pub_ids = [x['id'] for x in pub['items']]
        assert rid not in pub_ids

        # admin list (?published=false) -> SHOULD contain rid
        admin = requests.get(f"{API}/reviews?published=false&limit=200", timeout=15).json()
        admin_ids = [x['id'] for x in admin['items']]
        assert rid in admin_ids, (
            f'published=false must return unpublished review {rid}. '
            f'Got {len(admin_ids)} items.'
        )
        # And it must ALSO include published items
        published_in_admin = [x for x in admin['items'] if x.get('published') is True]
        assert len(published_in_admin) > 0, 'admin list must show published reviews too'


# ==================================================================
# 6. REGRESSION: admin CRUD /api/admin/reviews
# ==================================================================
class TestAdminReviewCRUD:
    def test_full_crud(self, admin_json_headers):
        # CREATE
        payload = {
            'name': 'PYH CRUD Buyer',
            'rating': 4,
            'text': 'CRUD test review for phase H regression.',
            'published': False,
        }
        c = requests.post(f"{API}/admin/reviews", json=payload, headers=admin_json_headers, timeout=15)
        assert c.status_code == 200, c.text
        d = c.json()
        assert d['name'] == payload['name']
        assert d['rating'] == 4
        assert d.get('avatar'), 'avatar should be auto-populated'
        rid = d['id']
        _created_review_ids.append(rid)

        # PATCH
        p = requests.patch(f"{API}/admin/reviews/{rid}",
                           json={'published': True, 'rating': 5},
                           headers=admin_json_headers, timeout=15)
        assert p.status_code == 200
        pd = p.json()
        assert pd['published'] is True
        assert pd['rating'] == 5

        # Verify GET via public (must now be there since published=True)
        pub = requests.get(f"{API}/reviews?limit=200", timeout=15).json()
        assert rid in [x['id'] for x in pub['items']]

        # DELETE
        de = requests.delete(f"{API}/admin/reviews/{rid}", headers=admin_json_headers, timeout=15)
        assert de.status_code == 200
        assert de.json() == {'ok': True}
        _created_review_ids.remove(rid)

        # Confirm gone
        after = requests.get(f"{API}/reviews?limit=200", timeout=15).json()
        assert rid not in [x['id'] for x in after['items']]

    def test_admin_reviews_require_auth(self):
        assert requests.post(f"{API}/admin/reviews", json={
            'name': 'x', 'rating': 5, 'text': 'text long enough here'
        }, timeout=15).status_code == 401
        assert requests.patch(f"{API}/admin/reviews/anyid", json={},
                              timeout=15).status_code == 401
        assert requests.delete(f"{API}/admin/reviews/anyid",
                               timeout=15).status_code == 401


# ==================================================================
# 7. REGRESSION: QR flow (unchanged endpoints still work)
# ==================================================================
class TestQRRegression:
    def test_generic_qr_public_image(self):
        r = requests.get(f"{API}/reviews/generic-qr.png", timeout=15)
        assert r.status_code == 200
        assert r.headers.get('content-type', '').startswith('image/png')
        assert r.content[:8] == b'\x89PNG\r\n\x1a\n'

    def test_public_review_submit(self):
        payload = {
            'name': 'PYH Public Anon',
            'rating': 5,
            'text': 'Loved shopping here — phase H public review regression!',
            'email': 'pyh_public@example.com',
        }
        r = requests.post(f"{API}/reviews/public", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get('ok') is True
        rid = d.get('review_id')
        if rid:
            _created_review_ids.append(rid)

    def test_qr_generate_and_submit(self, admin_json_headers):
        # generate
        g = requests.post(f"{API}/admin/reviews/qr/generate",
                          json={'customer_name': 'PYH Regr QR'},
                          headers=admin_json_headers, timeout=15)
        assert g.status_code == 200
        tok = g.json()['token']
        _created_qr_tokens.append(tok)
        # get info
        info = requests.get(f"{API}/r/{tok}", timeout=15)
        assert info.status_code == 200
        # submit
        s = requests.post(f"{API}/r/{tok}", json={
            'name': 'PYH Regr QR',
            'rating': 4,
            'text': 'Regression test QR review submitted.',
        }, timeout=15)
        assert s.status_code == 200
        rid = s.json().get('review_id')
        if rid:
            _created_review_ids.append(rid)

    def test_google_locations_sync_still_works(self, admin_json_headers):
        r = requests.post(f"{API}/admin/google-locations/gbl_01/sync",
                          headers=admin_json_headers, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d.get('ok') is True
        assert d.get('mocked') is True
