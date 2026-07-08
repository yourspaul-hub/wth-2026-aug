"""Wear The Hope — Phase I backend tests (Image Pipeline).

Covers:
  * POST /api/admin/images/upload-from-url  (unsplash + Drive URL variants + RBAC)
  * GET  /api/images/{id}                    (headers, cache, magic bytes, 404)
  * POST /api/admin/products/bulk            (image_1..image_4 processing loop)
  * GET  /api/admin/products/template.csv    (headers include image_1..image_4)
  * Regressions: /api/reviews shape, /api/blog, /api/products, admin 401 gating

GridFS bucket name is 'images' — teardown deletes db.images.files + db.images.chunks.
"""
import csv
import io
import os
import subprocess
import time
import uuid
from datetime import datetime, timezone

import pytest
import requests

BASE_URL = os.environ.get(
    'REACT_APP_BACKEND_URL', 'https://wear-interactive.preview.emergentagent.com'
).rstrip('/')
API = f"{BASE_URL}/api"
DB_NAME = os.environ.get('DB_NAME', 'test_database')
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')

UNSPLASH_URL = 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1200'
UNSPLASH_URL_2 = 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800'
FAKE_DRIVE_FILE_URL = 'https://drive.google.com/file/d/1BAD_FAKE_ID_XXXXX/view?usp=sharing'
FAKE_DRIVE_UC_URL = 'https://drive.google.com/uc?export=download&id=FAKE_ID_XXX_YYY_ZZZ_QQQ'


# ------------------------------------------------------------------
# Mongo helpers
# ------------------------------------------------------------------
def _mongo_eval(js: str) -> str:
    return subprocess.check_output(
        ['mongosh', MONGO_URL, '--quiet', '--eval', js], text=True
    ).strip()


def _mint_token(role: str) -> str:
    tag = f'phaseI_{role}_{uuid.uuid4().hex[:6]}'
    js = f"""
const dbn = '{DB_NAME}';
const userId = 'user_{tag}';
const sessionToken = 'sess_{tag}';
db.getSiblingDB(dbn).admin_users.insertOne({{
  user_id: userId, email: 'me+'+userId+'@wearthehope.io',
  name: 'Phase I {role}', picture: '',
  role: '{role}', created_at: new Date()
}});
db.getSiblingDB(dbn).admin_sessions.insertOne({{
  user_id: userId, session_token: sessionToken,
  expires_at: new Date(Date.now()+7*24*60*60*1000),
  created_at: new Date()
}});
print(sessionToken);
"""
    out = _mongo_eval(js)
    tok = out.splitlines()[-1].strip()
    assert tok.startswith('sess_'), f'Failed to mint token: {out}'
    return tok


# Track uploaded image ids and product ids for teardown
STATE: dict = {
    'image_ids': [],       # GridFS ObjectId strings
    'product_ids': [],     # created product `id` field
    'session_tokens': [],  # cleanup admin_sessions/users
    'user_ids': [],
}


@pytest.fixture(scope='session')
def admin_token():
    tok = _mint_token('admin')
    STATE['session_tokens'].append(tok)
    return tok


@pytest.fixture(scope='session')
def store_token():
    tok = _mint_token('store_manager')
    STATE['session_tokens'].append(tok)
    return tok


@pytest.fixture(scope='session')
def blogger_token():
    tok = _mint_token('blogger')
    STATE['session_tokens'].append(tok)
    return tok


def _h(tok):
    return {'Authorization': f'Bearer {tok}', 'Content-Type': 'application/json'}


# ------------------------------------------------------------------
# Session-level teardown: wipe uploaded GridFS files + created products
# ------------------------------------------------------------------
@pytest.fixture(scope='session', autouse=True)
def cleanup_all(admin_token):
    yield
    # Delete uploaded images from GridFS (images.files + images.chunks)
    if STATE['image_ids']:
        ids = ','.join(f'ObjectId("{i}")' for i in STATE['image_ids'])
        _mongo_eval(
            f"db.getSiblingDB('{DB_NAME}').images.files.deleteMany({{_id:{{$in:[{ids}]}}}});"
            f"db.getSiblingDB('{DB_NAME}').images.chunks.deleteMany({{files_id:{{$in:[{ids}]}}}});"
        )
    # Also wipe any stray phase-I product uploads (SKU prefix PHI-)
    _mongo_eval(
        f"db.getSiblingDB('{DB_NAME}').products.deleteMany({{sku:{{$regex:'^PHI-'}}}});"
    )
    # Also wipe any GridFS files uploaded by bulk that we didn't track (metadata.uploaded_by contains 'phaseI_')
    _mongo_eval(
        f"const bd = db.getSiblingDB('{DB_NAME}');"
        f"const files = bd.images.files.find({{'metadata.uploaded_by':{{$regex:'phaseI_'}}}}, {{_id:1}}).toArray();"
        f"const fids = files.map(f=>f._id);"
        f"if (fids.length) {{ bd.images.files.deleteMany({{_id:{{$in:fids}}}}); bd.images.chunks.deleteMany({{files_id:{{$in:fids}}}}); }}"
    )
    # Clean up sessions + users we minted
    if STATE['session_tokens']:
        arr = ','.join(f'"{t}"' for t in STATE['session_tokens'])
        _mongo_eval(
            f"db.getSiblingDB('{DB_NAME}').admin_sessions.deleteMany({{session_token:{{$in:[{arr}]}}}});"
            f"db.getSiblingDB('{DB_NAME}').admin_users.deleteMany({{user_id:{{$regex:'^user_phaseI_'}}}});"
        )


# ==================================================================
# 1. POST /api/admin/images/upload-from-url  — happy path + RBAC
# ==================================================================
class TestImageUploadFromUrl:
    def test_upload_unsplash_as_admin(self, admin_token):
        r = requests.post(
            f"{API}/admin/images/upload-from-url",
            json={'url': UNSPLASH_URL},
            headers=_h(admin_token), timeout=60,
        )
        assert r.status_code == 200, f'{r.status_code}: {r.text[:400]}'
        d = r.json()
        # response shape
        for k in ('id', 'url', 'width', 'height', 'size', 'content_type'):
            assert k in d, f'missing key {k} in {d}'
        assert d['content_type'] == 'image/webp'
        assert d['url'].startswith('/api/images/')
        assert d['url'].endswith(d['id'])
        assert isinstance(d['size'], int) and d['size'] > 0
        assert d['size'] < 500 * 1024, f'expected <500KB, got {d["size"]} bytes'
        assert isinstance(d['width'], int) and d['width'] > 0
        assert isinstance(d['height'], int) and d['height'] > 0
        # save for follow-on GET test and cleanup
        STATE['image_ids'].append(d['id'])
        STATE['unsplash_meta'] = d

    def test_upload_as_store_manager(self, store_token):
        r = requests.post(
            f"{API}/admin/images/upload-from-url",
            json={'url': UNSPLASH_URL_2},
            headers=_h(store_token), timeout=60,
        )
        assert r.status_code == 200, f'{r.status_code}: {r.text[:400]}'
        d = r.json()
        assert d['content_type'] == 'image/webp'
        STATE['image_ids'].append(d['id'])

    def test_upload_as_blogger_forbidden(self, blogger_token):
        r = requests.post(
            f"{API}/admin/images/upload-from-url",
            json={'url': UNSPLASH_URL},
            headers=_h(blogger_token), timeout=30,
        )
        assert r.status_code == 403, f'expected 403, got {r.status_code}: {r.text[:200]}'

    def test_upload_missing_token(self):
        r = requests.post(
            f"{API}/admin/images/upload-from-url",
            json={'url': UNSPLASH_URL},
            headers={'Content-Type': 'application/json'}, timeout=30,
        )
        assert r.status_code == 401, f'expected 401, got {r.status_code}'

    def test_upload_empty_url(self, admin_token):
        r = requests.post(
            f"{API}/admin/images/upload-from-url",
            json={'url': '   '},
            headers=_h(admin_token), timeout=30,
        )
        assert r.status_code == 400


# ==================================================================
# 2. Drive URL parsing — should attempt direct-download and fail
# ==================================================================
class TestDriveUrlParsing:
    def _expect_drive_failure(self, resp):
        """Drive fetch with invalid id should return 400 with a helpful message."""
        assert resp.status_code == 400, f'expected 400 got {resp.status_code}: {resp.text[:300]}'
        body = resp.json()
        detail = str(body.get('detail', '')).lower()
        # Either a download-failure message or HTML page detection
        assert (
            'failed to download' in detail
            or 'html page' in detail
            or 'private drive' in detail
            or 'anyone with the link' in detail
        ), f'unexpected error detail: {body}'

    def test_drive_file_share_url(self, admin_token):
        r = requests.post(
            f"{API}/admin/images/upload-from-url",
            json={'url': FAKE_DRIVE_FILE_URL},
            headers=_h(admin_token), timeout=60,
        )
        self._expect_drive_failure(r)

    def test_drive_uc_id_url(self, admin_token):
        r = requests.post(
            f"{API}/admin/images/upload-from-url",
            json={'url': FAKE_DRIVE_UC_URL},
            headers=_h(admin_token), timeout=60,
        )
        self._expect_drive_failure(r)


# ==================================================================
# 3. GET /api/images/{id}  — content-type, cache, magic bytes, 404
# ==================================================================
class TestImageServe:
    def test_get_image_headers_and_body(self):
        assert 'unsplash_meta' in STATE, 'must run TestImageUploadFromUrl first'
        meta = STATE['unsplash_meta']
        r = requests.get(f"{API}/images/{meta['id']}", timeout=30)
        assert r.status_code == 200
        # Content-Type
        assert r.headers.get('content-type', '').startswith('image/webp'), r.headers
        # Content-Length matches stored size
        cl = int(r.headers.get('content-length', '0'))
        assert cl == meta['size'], f'content-length {cl} != stored size {meta["size"]}'
        assert len(r.content) == meta['size']
        # Cache-Control has max-age=2592000 AND immutable
        cc = r.headers.get('cache-control', '')
        assert 'max-age=2592000' in cc, f'cache-control missing max-age: {cc}'
        assert 'immutable' in cc, f'cache-control missing immutable: {cc}'
        # Body starts with WebP magic (RIFF....WEBP)
        assert r.content[:4] == b'RIFF', f'expected RIFF, got {r.content[:4]!r}'
        assert r.content[8:12] == b'WEBP', f'expected WEBP, got {r.content[8:12]!r}'

    def test_get_image_unknown_id_returns_404(self):
        # Valid-looking but non-existent ObjectId
        r = requests.get(f"{API}/images/507f1f77bcf86cd799439011", timeout=15)
        assert r.status_code == 404

    def test_get_image_bad_id_returns_404(self):
        r = requests.get(f"{API}/images/not-an-objectid", timeout=15)
        assert r.status_code == 404


# ==================================================================
# 4. Bulk upload with image_1..image_4 processing loop
# ==================================================================
def _get_category_slug() -> str:
    """Fetch one existing category slug to use in bulk uploads."""
    out = _mongo_eval(
        f"const c = db.getSiblingDB('{DB_NAME}').categories.findOne({{}}, {{slug:1,_id:0}});"
        f"print(c && c.slug || '');"
    )
    slug = out.splitlines()[-1].strip()
    assert slug, 'no category found in db to test bulk upload with'
    return slug


def _post_bulk_csv(rows_with_header: list, token: str, headers=None):
    """Build in-memory CSV, POST as multipart/form-data. rows_with_header[0]=header list."""
    buf = io.StringIO()
    w = csv.writer(buf)
    for row in rows_with_header:
        w.writerow(row)
    buf.seek(0)
    files = {'file': ('phaseI_upload.csv', buf.getvalue(), 'text/csv')}
    req_h = {'Authorization': f'Bearer {token}'}
    if headers:
        req_h.update(headers)
    return requests.post(f"{API}/admin/products/bulk", files=files, headers=req_h, timeout=90)


class TestBulkUploadImagePipeline:
    def test_bulk_image_1_kept_as_external_url(self, store_token):
        cat_slug = _get_category_slug()
        sku = f'PHI-{uuid.uuid4().hex[:8].upper()}'
        slug = f'phi-{uuid.uuid4().hex[:8]}'
        header = ['sku', 'slug', 'name', 'category_slug', 'price', 'image_1', 'image_2']
        row = [sku, slug, 'Phase I Product 1', cat_slug, '499', UNSPLASH_URL, '']
        r = _post_bulk_csv([header, row], store_token)
        assert r.status_code == 200, f'{r.status_code}: {r.text[:400]}'
        d = r.json()
        assert d.get('ok') is True
        assert d.get('created') == 1, d
        assert d.get('updated') == 0, d
        assert d.get('errors') == [], d
        # Find the created product
        pr = requests.get(f"{API}/products?limit=100", timeout=30)
        assert pr.status_code == 200
        items = pr.json().get('items', [])
        found = next((p for p in items if p.get('sku') == sku), None)
        assert found is not None, f'created SKU {sku} not found in listing'
        # External URL kept as-is (non-Drive)
        assert found['image'].startswith('http'), f'expected external URL, got {found["image"]!r}'
        assert 'unsplash' in found['image'].lower()
        assert found.get('gallery') == [], f'gallery should be empty, got {found.get("gallery")!r}'
        STATE['product_ids'].append(found['id'])

    def test_bulk_legacy_image_column_backward_compat(self, store_token):
        cat_slug = _get_category_slug()
        sku = f'PHI-{uuid.uuid4().hex[:8].upper()}'
        slug = f'phi-{uuid.uuid4().hex[:8]}'
        header = ['sku', 'slug', 'name', 'category_slug', 'price', 'image']
        row = [sku, slug, 'Phase I Legacy', cat_slug, '299', UNSPLASH_URL_2]
        r = _post_bulk_csv([header, row], store_token)
        assert r.status_code == 200, f'{r.status_code}: {r.text[:400]}'
        d = r.json()
        assert d.get('created') == 1 and d.get('errors') == [], d
        pr = requests.get(f"{API}/products?limit=100", timeout=30)
        found = next((p for p in pr.json().get('items', []) if p.get('sku') == sku), None)
        assert found is not None
        assert found['image'].startswith('http')
        assert 'unsplash' in found['image'].lower()
        STATE['product_ids'].append(found['id'])

    def test_bulk_no_image_row_level_error(self, store_token):
        cat_slug = _get_category_slug()
        sku = f'PHI-{uuid.uuid4().hex[:8].upper()}'
        slug = f'phi-{uuid.uuid4().hex[:8]}'
        header = ['sku', 'slug', 'name', 'category_slug', 'price']
        row = [sku, slug, 'Phase I No Image', cat_slug, '150']
        r = _post_bulk_csv([header, row], store_token)
        assert r.status_code == 200
        d = r.json()
        assert d.get('created') == 0
        errs = d.get('errors', [])
        assert len(errs) >= 1, d
        assert any('at least one image' in str(e.get('error', '')).lower() for e in errs), errs

    def test_bulk_fake_drive_row_error_but_ok_response(self, store_token):
        """Row with fake Drive URL should get row-level error; bulk response still ok=true."""
        cat_slug = _get_category_slug()
        # Row 1: fake drive (should fail at image processing)
        sku_bad = f'PHI-{uuid.uuid4().hex[:8].upper()}'
        slug_bad = f'phi-{uuid.uuid4().hex[:8]}'
        # Row 2: valid unsplash (should still be created)
        sku_ok = f'PHI-{uuid.uuid4().hex[:8].upper()}'
        slug_ok = f'phi-{uuid.uuid4().hex[:8]}'
        header = ['sku', 'slug', 'name', 'category_slug', 'price', 'image_1']
        row_bad = [sku_bad, slug_bad, 'Phase I Bad Drive', cat_slug, '250', FAKE_DRIVE_FILE_URL]
        row_ok = [sku_ok, slug_ok, 'Phase I OK Mix', cat_slug, '350', UNSPLASH_URL]
        r = _post_bulk_csv([header, row_bad, row_ok], store_token)
        assert r.status_code == 200, f'{r.status_code}: {r.text[:400]}'
        d = r.json()
        assert d.get('ok') is True
        # Valid row should still be created
        assert d.get('created') >= 1, d
        # Bad row should be in errors
        errs = d.get('errors', [])
        assert len(errs) >= 1, d
        bad_err_texts = ' '.join(str(e.get('error', '')) for e in errs).lower()
        assert (
            'failed to download' in bad_err_texts
            or 'html page' in bad_err_texts
            or 'private drive' in bad_err_texts
            or 'anyone with the link' in bad_err_texts
        ), f'expected drive fetch failure msg, got {errs}'
        # Verify the ok product exists
        pr = requests.get(f"{API}/products?limit=100", timeout=30)
        found = next((p for p in pr.json().get('items', []) if p.get('sku') == sku_ok), None)
        assert found is not None, f'valid row SKU {sku_ok} should still be created'
        STATE['product_ids'].append(found['id'])

    def test_bulk_endpoint_401_without_token(self):
        buf = io.StringIO()
        csv.writer(buf).writerow(['sku', 'name'])
        buf.seek(0)
        files = {'file': ('x.csv', buf.getvalue(), 'text/csv')}
        r = requests.post(f"{API}/admin/products/bulk", files=files, timeout=15)
        assert r.status_code == 401


# ==================================================================
# 5. Template CSV headers include image_1..image_4
# ==================================================================
class TestTemplateCsv:
    def test_template_headers_include_all_image_cols(self, store_token):
        r = requests.get(
            f"{API}/admin/products/template.csv",
            headers={'Authorization': f'Bearer {store_token}'}, timeout=30,
        )
        assert r.status_code == 200, r.text[:200]
        first_line = r.text.splitlines()[0]
        cols = [c.strip() for c in next(csv.reader([first_line]))]
        for want in ('image_1', 'image_2', 'image_3', 'image_4'):
            assert want in cols, f'header missing {want}: {cols}'

    def test_template_requires_auth(self):
        r = requests.get(f"{API}/admin/products/template.csv", timeout=15)
        assert r.status_code == 401


# ==================================================================
# 6. Regression: public listing endpoints + auth gating still work
# ==================================================================
class TestRegression:
    def test_reviews_shape_still_envelope(self):
        r = requests.get(f"{API}/reviews?limit=5", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d, dict)
        for k in ('items', 'total', 'stats'):
            assert k in d, f'missing key {k} in reviews response'
        assert isinstance(d['items'], list)
        assert 'average' in d['stats']
        assert 'breakdown' in d['stats']

    def test_blog_list_ok(self):
        r = requests.get(f"{API}/blog", timeout=15)
        assert r.status_code == 200
        d = r.json()
        # tolerate either raw list or envelope
        assert isinstance(d, (list, dict))

    def test_products_list_ok(self):
        r = requests.get(f"{API}/products?limit=5", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert 'items' in d and 'total' in d

    def test_admin_endpoint_401_without_token(self):
        # A representative admin endpoint (require_store)
        r = requests.get(f"{API}/admin/products/template.csv", timeout=15)
        assert r.status_code == 401
        # And an admin-only endpoint
        r2 = requests.get(f"{API}/admin/orders", timeout=15)
        assert r2.status_code == 401
