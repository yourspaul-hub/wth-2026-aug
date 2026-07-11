"""Wear The Hope — Phase M backend tests.

Covers the fixes/features in this iteration:
  1. POST /api/admin/hero-slides — Pydantic type-mismatch fix
     (HeroSlideCreate.order: Optional[int] → HeroSlide.order: int).
     The primary user bug was: new hero slides were NOT being persisted.
  2. Full CRUD + reorder + public visibility for hero slides.
  3. New Lightbox module: GET/PUT /api/admin/lightbox and
     lightbox block in GET /api/settings/public + LIGHTBOX_VERSION auto-bump.
  4. New direct file upload: POST /api/admin/images/upload.

Auth is via Emergent Google OAuth — the tests mint a session_token directly
in MongoDB (documented in /app/memory/test_credentials.md).
"""
import io
import os
import subprocess
import uuid

import pytest
import requests
from PIL import Image

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001').rstrip('/')
API = f"{BASE_URL}/api"


# ---------------- session/auth helpers ----------------
def _mint_admin_token() -> str:
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'test_database')
    js = f"""
const dbn = '{db_name}';
const userId = 'admin-pytest-M-' + Date.now();
const sessionToken = 'pytest_sess_M_' + Date.now() + '_' + Math.random().toString(36).slice(2,10);
db.getSiblingDB(dbn).admin_users.insertOne({{
  user_id: userId, email: 'admin+'+userId+'@wearthehope.io',
  name: 'Pytest Admin M', picture: '',
  role: 'admin', created_at: new Date()
}});
db.getSiblingDB(dbn).admin_sessions.insertOne({{
  user_id: userId, session_token: sessionToken,
  expires_at: new Date(Date.now()+7*24*60*60*1000),
  created_at: new Date()
}});
print(sessionToken);
"""
    out = subprocess.check_output(
        ['mongosh', mongo_url, '--quiet', '--eval', js], text=True
    ).strip()
    return out.splitlines()[-1].strip()


@pytest.fixture(scope='session')
def admin_token():
    return _mint_admin_token()


@pytest.fixture(scope='session')
def admin_client(admin_token):
    s = requests.Session()
    s.headers.update({
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {admin_token}',
    })
    return s


@pytest.fixture(scope='session')
def anon_client():
    s = requests.Session()
    s.headers.update({'Content-Type': 'application/json'})
    return s


# ==================================================================
# 1. Hero Slides — the primary bug (create was not persisting)
# ==================================================================
class TestHeroSlideCreate:
    """Verify the fix for the reported bug: POST was returning 422 and
    nothing landed in Mongo. Now it must:
      - return 200
      - include a generated id, defaults, and computed order
      - actually persist (visible in subsequent GET)
    """

    def test_create_minimal_body_persists(self, admin_client):
        """Only `image` — everything else default. Must return 200 and appear in list."""
        img = f'https://cdn.example.com/TEST-M-min-{uuid.uuid4().hex[:8]}.jpg'
        r = admin_client.post(f'{API}/admin/hero-slides', json={'image': img})
        assert r.status_code == 200, r.text
        d = r.json()
        assert 'id' in d and d['id'].startswith('hs_')
        assert d['image'] == img
        assert d['heading'] == ''
        assert d['accent'] == ''
        assert d['subtitle'] == ''
        assert d['cta'] == ''
        assert d['href'] == '/shop'
        assert d['active'] is True
        assert isinstance(d['order'], int)

        # Verify persistence — the primary regression check.
        listed = admin_client.get(f'{API}/admin/hero-slides').json()
        items = listed.get('items', [])
        assert any(it.get('id') == d['id'] and it.get('image') == img for it in items), \
            'Newly created slide is NOT persisted — the original bug is back.'

    def test_create_full_body_echoes_all_fields(self, admin_client):
        img = f'https://cdn.example.com/TEST-M-full-{uuid.uuid4().hex[:8]}.jpg'
        payload = {
            'image': img,
            'heading': 'Grace Upon Grace',
            'accent': 'New Collection',
            'subtitle': 'Faith-forward apparel for every believer',
            'cta': 'Shop Now',
            'href': '/shop/faith-drop',
            'active': True,
        }
        r = admin_client.post(f'{API}/admin/hero-slides', json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        for k, v in payload.items():
            assert d[k] == v, f'field {k} mismatch: expected {v!r} got {d.get(k)!r}'
        assert isinstance(d['order'], int)

    def test_create_omitting_order_appends_to_end(self, admin_client):
        """When `order` is not provided, it should become max(order) + 1."""
        # Snapshot the current max order.
        listed_before = admin_client.get(f'{API}/admin/hero-slides').json().get('items', [])
        max_before = max((it.get('order', 0) for it in listed_before), default=-1)

        img = f'https://cdn.example.com/TEST-M-append-{uuid.uuid4().hex[:8]}.jpg'
        r = admin_client.post(f'{API}/admin/hero-slides', json={'image': img})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d['order'] == max_before + 1, (
            f'append semantics broken: max was {max_before}, new order is {d["order"]}, '
            f'expected {max_before + 1}'
        )

    def test_create_with_explicit_order_zero(self, admin_client):
        """Explicit order=0 must be honored (falsy but valid)."""
        img = f'https://cdn.example.com/TEST-M-zero-{uuid.uuid4().hex[:8]}.jpg'
        r = admin_client.post(f'{API}/admin/hero-slides', json={'image': img, 'order': 0})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d['order'] == 0

    def test_create_empty_image_rejected(self, admin_client):
        r = admin_client.post(f'{API}/admin/hero-slides', json={'image': ''})
        assert r.status_code == 400
        assert 'image' in (r.json().get('detail') or '').lower()

    def test_create_whitespace_image_rejected(self, admin_client):
        r = admin_client.post(f'{API}/admin/hero-slides', json={'image': '   '})
        assert r.status_code == 400

    def test_create_requires_auth(self, anon_client):
        r = anon_client.post(f'{API}/admin/hero-slides', json={'image': 'https://x/y.jpg'})
        assert r.status_code == 401


class TestHeroSlideUpdateDelete:
    def test_patch_partial_leaves_other_fields(self, admin_client):
        # create
        img = f'https://cdn.example.com/TEST-M-patch-{uuid.uuid4().hex[:8]}.jpg'
        created = admin_client.post(f'{API}/admin/hero-slides', json={
            'image': img, 'heading': 'Original', 'subtitle': 'sub', 'cta': 'Go'
        }).json()
        sid = created['id']

        # patch heading only
        r = admin_client.patch(f'{API}/admin/hero-slides/{sid}', json={'heading': 'New heading'})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d['heading'] == 'New heading'
        assert d['subtitle'] == 'sub'
        assert d['cta'] == 'Go'
        assert d['image'] == img

    def test_patch_nonexistent_returns_404(self, admin_client):
        r = admin_client.patch(f'{API}/admin/hero-slides/hs_nope_nope', json={'heading': 'x'})
        assert r.status_code == 404

    def test_delete_removes_slide(self, admin_client):
        img = f'https://cdn.example.com/TEST-M-del-{uuid.uuid4().hex[:8]}.jpg'
        created = admin_client.post(f'{API}/admin/hero-slides', json={'image': img}).json()
        sid = created['id']

        r = admin_client.delete(f'{API}/admin/hero-slides/{sid}')
        assert r.status_code == 200, r.text
        assert r.json().get('ok') is True

        # confirm removed from list
        items = admin_client.get(f'{API}/admin/hero-slides').json().get('items', [])
        assert not any(it.get('id') == sid for it in items), 'slide still present after delete'

    def test_delete_nonexistent_returns_404(self, admin_client):
        r = admin_client.delete(f'{API}/admin/hero-slides/hs_missing_1234')
        assert r.status_code == 404


class TestHeroSlideReorderAndPublic:
    def test_reorder_shuffles_order(self, admin_client):
        # create 3 slides
        ids = []
        for i in range(3):
            img = f'https://cdn.example.com/TEST-M-reord-{i}-{uuid.uuid4().hex[:6]}.jpg'
            j = admin_client.post(f'{API}/admin/hero-slides', json={
                'image': img, 'heading': f'Slide-{i}'
            }).json()
            ids.append(j['id'])

        # shuffle: reverse order
        new_order = list(reversed(ids))
        r = admin_client.post(f'{API}/admin/hero-slides/reorder', json={'ids': new_order})
        assert r.status_code == 200, r.text

        # Verify: read back and check order of these three ids
        items = admin_client.get(f'{API}/admin/hero-slides').json().get('items', [])
        by_id = {it['id']: it for it in items}
        # Our three slides should have orders 0,1,2 in the new order
        orders = [by_id[sid]['order'] for sid in new_order]
        assert orders == sorted(orders), f'reorder did not produce ascending orders: {orders}'
        # And they should be positioned in the same relative sequence
        pos = [i for i, it in enumerate(sorted(items, key=lambda x: x['order'])) if it['id'] in new_order]
        got_seq = [items_sorted['id'] for items_sorted in sorted(items, key=lambda x: x['order']) if items_sorted['id'] in new_order]
        assert got_seq == new_order, f'expected {new_order} got {got_seq}'

    def test_public_endpoint_only_shows_active_with_image(self, admin_client, anon_client):
        # Create an active-with-image slide and an inactive slide
        img_active = f'https://cdn.example.com/TEST-M-pub-active-{uuid.uuid4().hex[:6]}.jpg'
        img_inactive = f'https://cdn.example.com/TEST-M-pub-inactive-{uuid.uuid4().hex[:6]}.jpg'
        active = admin_client.post(f'{API}/admin/hero-slides', json={
            'image': img_active, 'heading': 'Active', 'active': True
        }).json()
        inactive = admin_client.post(f'{API}/admin/hero-slides', json={
            'image': img_inactive, 'heading': 'Inactive', 'active': False
        }).json()

        r = anon_client.get(f'{API}/hero-slides')
        assert r.status_code == 200
        pub_items = r.json().get('items', [])
        pub_ids = {it['id'] for it in pub_items}
        assert active['id'] in pub_ids, 'active slide missing from public list'
        assert inactive['id'] not in pub_ids, 'inactive slide leaked into public list'
        # sorted ascending by order
        orders = [it['order'] for it in pub_items]
        assert orders == sorted(orders), 'public list not sorted by order'
        # every item has non-empty image
        assert all(it.get('image') for it in pub_items), 'public list contains empty-image slide'


# ==================================================================
# 2. Lightbox module
# ==================================================================
class TestLightbox:
    def test_admin_get_requires_auth(self, anon_client):
        r = anon_client.get(f'{API}/admin/lightbox')
        assert r.status_code == 401

    def test_admin_get_schema(self, admin_client):
        r = admin_client.get(f'{API}/admin/lightbox')
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ('enabled', 'image', 'heading', 'subtitle',
                  'cta_label', 'cta_href', 'show_once', 'version'):
            assert k in d, f'lightbox missing key: {k}'
        assert isinstance(d['enabled'], bool)
        assert isinstance(d['show_once'], bool)

    def test_admin_put_enabled_only_does_not_bump_version(self, admin_client):
        # snapshot version
        before = admin_client.get(f'{API}/admin/lightbox').json()
        v_before = int(before['version'])

        # toggle enabled only (no content change)
        r = admin_client.put(f'{API}/admin/lightbox', json={'enabled': True})
        assert r.status_code == 200, r.text

        after = admin_client.get(f'{API}/admin/lightbox').json()
        assert after['enabled'] is True
        assert int(after['version']) == v_before, (
            f'version bumped ({v_before} → {after["version"]}) for enabled-only change; '
            'should only bump on content change'
        )

    def test_admin_put_content_change_bumps_version(self, admin_client):
        before = admin_client.get(f'{API}/admin/lightbox').json()
        v_before = int(before['version'])
        payload = {
            'image': f'https://cdn.example.com/TEST-M-lb-{uuid.uuid4().hex[:6]}.jpg',
            'heading': 'Welcome to Wear The Hope',
            'subtitle': 'A limited faith drop',
            'cta_label': 'Explore',
            'cta_href': '/shop',
        }
        r = admin_client.put(f'{API}/admin/lightbox', json=payload)
        assert r.status_code == 200, r.text

        after = admin_client.get(f'{API}/admin/lightbox').json()
        for k, v in payload.items():
            assert after[k] == v, f'{k} not persisted: expected {v!r} got {after[k]!r}'
        assert int(after['version']) == v_before + 1, (
            f'version not bumped after content change: {v_before} → {after["version"]}'
        )

    def test_public_settings_includes_lightbox_block(self, anon_client):
        r = anon_client.get(f'{API}/settings/public')
        assert r.status_code == 200
        d = r.json()
        assert 'lightbox' in d, 'public settings missing lightbox block'
        lb = d['lightbox']
        for k in ('enabled', 'image', 'heading', 'subtitle',
                  'cta_label', 'cta_href', 'show_once', 'version'):
            assert k in lb, f'public lightbox missing key: {k}'

    def test_public_settings_enabled_false_when_no_image(self, admin_client, anon_client):
        # Set enabled=true but image=''
        r = admin_client.put(f'{API}/admin/lightbox', json={'enabled': True, 'image': ''})
        assert r.status_code == 200
        d = anon_client.get(f'{API}/settings/public').json()
        assert d['lightbox']['enabled'] is False, (
            'public lightbox.enabled should be False when image is empty even if LIGHTBOX_ENABLED is true'
        )

    def test_public_settings_music_still_works(self, anon_client):
        """Regression: existing music block still returned correctly."""
        d = anon_client.get(f'{API}/settings/public').json()
        assert 'music' in d
        for k in ('enabled', 'url', 'label', 'volume'):
            assert k in d['music']
        assert isinstance(d['music']['volume'], (int, float))

    def test_admin_put_requires_auth(self, anon_client):
        r = anon_client.put(f'{API}/admin/lightbox', json={'enabled': False})
        assert r.status_code == 401


# ==================================================================
# 3. Direct file upload (Admin → Design)
# ==================================================================
def _make_jpeg_bytes(w=200, h=200, color=(200, 120, 80)) -> bytes:
    buf = io.BytesIO()
    Image.new('RGB', (w, h), color=color).save(buf, format='JPEG', quality=80)
    return buf.getvalue()


class TestImageUpload:
    def test_upload_jpeg_returns_webp_meta(self, admin_client):
        raw = _make_jpeg_bytes(300, 200)
        files = {'file': ('sample.jpg', raw, 'image/jpeg')}
        h = {k: v for k, v in admin_client.headers.items() if k.lower() != 'content-type'}
        r = requests.post(f'{API}/admin/images/upload', files=files, headers=h)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ('id', 'url', 'width', 'height', 'size', 'content_type'):
            assert k in d, f'upload response missing {k}'
        assert d['content_type'] == 'image/webp'
        assert isinstance(d['width'], int) and d['width'] > 0
        assert isinstance(d['height'], int) and d['height'] > 0
        assert isinstance(d['size'], int) and d['size'] > 0
        # URL resolves — either S3 (starts with http) or /api/images/{id} (GridFS)
        url = d['url']
        assert url, 'upload url empty'
        # If GridFS the url path pattern must match /api/images/{id}
        if url.startswith('/api/'):
            assert url == f'/api/images/{d["id"]}', f'gridfs url mismatch: {url}'
            # Fetch via public URL
            fetch = requests.get(f'{BASE_URL}{url}')
            assert fetch.status_code == 200, f'GET {url} → {fetch.status_code}'
            assert 'image' in fetch.headers.get('content-type', '').lower()

    def test_upload_non_image_rejected(self, admin_client):
        files = {'file': ('notes.txt', b'hello world', 'text/plain')}
        h = {k: v for k, v in admin_client.headers.items() if k.lower() != 'content-type'}
        r = requests.post(f'{API}/admin/images/upload', files=files, headers=h)
        assert r.status_code == 400, r.text
        assert 'image' in (r.json().get('detail') or '').lower()

    def test_upload_too_large_rejected(self, admin_client):
        # 16 MB dummy blob — larger than 15 MB cap. Use PNG-ish header so content-type check passes.
        big = b'\x89PNG\r\n\x1a\n' + (b'\x00' * (16 * 1024 * 1024))
        files = {'file': ('big.png', big, 'image/png')}
        h = {k: v for k, v in admin_client.headers.items() if k.lower() != 'content-type'}
        r = requests.post(f'{API}/admin/images/upload', files=files, headers=h)
        assert r.status_code == 413, r.text
        assert '15' in (r.json().get('detail') or '') or 'too large' in (r.json().get('detail') or '').lower()

    def test_upload_requires_auth(self):
        raw = _make_jpeg_bytes(50, 50)
        files = {'file': ('tiny.jpg', raw, 'image/jpeg')}
        r = requests.post(f'{API}/admin/images/upload', files=files)
        assert r.status_code == 401


# ==================================================================
# 4. Regression spot-checks on prior iteration endpoints
# ==================================================================
class TestRegression:
    def test_couriers_still_works(self, admin_client):
        r = admin_client.get(f'{API}/admin/couriers')
        assert r.status_code == 200
        items = r.json().get('items', [])
        assert len(items) >= 25

    def test_reset_targets_still_works(self, admin_client):
        r = admin_client.get(f'{API}/admin/dev/reset/targets')
        assert r.status_code == 200
        items = r.json().get('items', [])
        assert len(items) >= 15

    def test_public_settings_music_regression(self, anon_client):
        d = anon_client.get(f'{API}/settings/public').json()
        assert 'music' in d
        m = d['music']
        assert set(m.keys()) >= {'enabled', 'url', 'label', 'volume'}
