"""Wear The Hope — Phase D backend tests.

Covers two new features:
  1) Multi-branch store LOCATIONS
     - Public GET /api/locations (no auth, only active, sorted by 'order')
     - Admin GET /api/admin/locations (Bearer required; includes inactive)
     - Admin POST /api/admin/locations (auto id starts with 'loc_')
     - Admin PATCH /api/admin/locations/{id} (deactivate hides from public)
     - Admin DELETE /api/admin/locations/{id}

  2) BULK PRODUCT UPLOAD from CSV/XLSX/Google-Sheets export
     - GET /api/admin/products/template.csv (auth + CSV headers + instruction '#' rows)
     - POST /api/admin/products/bulk with:
         * happy path (1 update + 1 create)
         * bad category_slug → row error, but others processed
         * missing name / missing (sku AND slug) / price<=0 → row errors
         * UTF-8 BOM (Google Sheets style)
         * XLSX (openpyxl in-memory)
         * '#' comment rows ignored (not counted as errors)

  3) Regression sanity: /api/products, /api/categories, HOPE10 coupon, admin 401.

Uses REACT_APP_BACKEND_URL. Admin token minted directly in Mongo per
/app/memory/test_credentials.md. All test-created products/locations cleaned up.
"""
import io
import os
import csv
import uuid
import subprocess

import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://wear-interactive.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"


# ------------------------------------------------------------------
# Session helpers
# ------------------------------------------------------------------
def _mint_admin_token() -> str:
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'test_database')
    js = f"""
const dbn = '{db_name}';
const userId = 'admin-pytestD-' + Date.now();
const sessionToken = 'pytestD_sess_' + Date.now() + '_' + Math.random().toString(36).slice(2,10);
db.getSiblingDB(dbn).admin_users.insertOne({{
  user_id: userId, email: 'admin+'+userId+'@wearthehope.io',
  name: 'Pytest D Admin', picture: 'https://via.placeholder.com/150',
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


def _mongo_eval(js: str) -> str:
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    return subprocess.check_output(
        ['mongosh', mongo_url, '--quiet', '--eval', js], text=True
    ).strip()


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
# Cleanup: track products and locations we created during the run
# ------------------------------------------------------------------
_created_product_skus: list = []
_created_location_ids: list = []


@pytest.fixture(scope='session', autouse=True)
def cleanup_after_tests(admin_headers):
    yield
    db_name = os.environ.get('DB_NAME', 'test_database')
    # Delete test products
    if _created_product_skus:
        sku_js_arr = ','.join(f'"{s}"' for s in _created_product_skus)
        _mongo_eval(
            f"db.getSiblingDB('{db_name}').products.deleteMany({{sku: {{$in: [{sku_js_arr}]}}}})"
        )
    # Delete test locations
    if _created_location_ids:
        id_js_arr = ','.join(f'"{i}"' for i in _created_location_ids)
        _mongo_eval(
            f"db.getSiblingDB('{db_name}').locations.deleteMany({{id: {{$in: [{id_js_arr}]}}}})"
        )


# ==================================================================
# 1. LOCATIONS
# ==================================================================
class TestLocationsPublic:
    """GET /api/locations — no auth, only active, sorted by 'order'."""

    def test_public_locations_returns_seeded_two(self):
        r = requests.get(f"{API}/locations")
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 2

        ids = [d['id'] for d in data]
        assert 'loc_01' in ids
        assert 'loc_02' in ids

        design = next(d for d in data if d['id'] == 'loc_01')
        assert design['label'] == 'Design Center'
        assert design['city'] == 'Mumbai'
        assert design['is_primary'] is True
        assert design['active'] is True
        assert isinstance(design['address_lines'], list)
        assert len(design['address_lines']) >= 1

        office = next(d for d in data if d['id'] == 'loc_02')
        assert office['label'] == 'Registered Office'
        assert office['city'] == 'Ernakulam'
        assert office['state'] == 'Kerala'

        # Field-shape check for every returned location
        required_fields = [
            'id', 'label', 'address_lines', 'city', 'country',
            'is_primary', 'active', 'order',
        ]
        for loc in data:
            for f in required_fields:
                assert f in loc, f"missing field {f} in {loc.get('id')}"
            # Optional but expected fields
            for opt in ['name', 'state', 'pincode', 'whatsapp', 'email', 'hours', 'map_url']:
                assert opt in loc

    def test_public_locations_sorted_by_order(self):
        r = requests.get(f"{API}/locations")
        assert r.status_code == 200
        data = r.json()
        orders = [d['order'] for d in data]
        assert orders == sorted(orders), f"locations not sorted by order: {orders}"

    def test_public_locations_excludes_mongo_id(self):
        r = requests.get(f"{API}/locations")
        for d in r.json():
            assert '_id' not in d


class TestLocationsAdmin:
    """Admin CRUD for locations."""

    def test_admin_list_requires_bearer(self):
        r = requests.get(f"{API}/admin/locations")
        assert r.status_code in (401, 403), r.text

    def test_admin_list_with_bearer(self, admin_headers):
        r = requests.get(f"{API}/admin/locations", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 2

    def test_create_deactivate_delete_flow(self, admin_json_headers, admin_headers):
        payload = {
            'label': 'Test Branch',
            'city': 'Bangalore',
            'address_lines': ['123 MG Rd'],
            'country': 'India',
            'order': 99,
        }
        # CREATE
        r = requests.post(
            f"{API}/admin/locations", json=payload, headers=admin_json_headers
        )
        assert r.status_code in (200, 201), r.text
        loc = r.json()
        assert 'id' in loc and loc['id'].startswith('loc_'), loc
        assert loc['label'] == 'Test Branch'
        assert loc['city'] == 'Bangalore'
        assert loc['address_lines'] == ['123 MG Rd']
        assert loc['country'] == 'India'
        assert loc['active'] is True
        assert '_id' not in loc
        lid = loc['id']
        _created_location_ids.append(lid)

        # Verify appears in public list
        r_pub = requests.get(f"{API}/locations")
        assert lid in [d['id'] for d in r_pub.json()]

        # PATCH -> deactivate
        r_up = requests.patch(
            f"{API}/admin/locations/{lid}",
            json={'active': False},
            headers=admin_json_headers,
        )
        assert r_up.status_code == 200, r_up.text
        updated = r_up.json()
        assert updated['active'] is False
        assert updated['id'] == lid
        assert '_id' not in updated

        # Public list should NOT include it
        r_pub2 = requests.get(f"{API}/locations")
        assert lid not in [d['id'] for d in r_pub2.json()]

        # Admin list SHOULD still include (inactive too)
        r_adm = requests.get(f"{API}/admin/locations", headers=admin_headers)
        assert lid in [d['id'] for d in r_adm.json()]

        # DELETE
        r_del = requests.delete(
            f"{API}/admin/locations/{lid}", headers=admin_headers
        )
        assert r_del.status_code == 200, r_del.text
        assert r_del.json().get('ok') is True

        # Now removed from admin list too
        r_adm2 = requests.get(f"{API}/admin/locations", headers=admin_headers)
        assert lid not in [d['id'] for d in r_adm2.json()]
        _created_location_ids.remove(lid)


# ==================================================================
# 2. BULK PRODUCT UPLOAD
# ==================================================================
CSV_HEADER = 'sku,slug,name,category_slug,price,original_price,stock,description,image,tag,product_type,active,personalization_enabled,personalization_label'


def _csv_bytes(rows: list[list[str]], header: str = CSV_HEADER, bom: bool = False) -> bytes:
    """Build a CSV byte-string from a header + list-of-string-lists rows."""
    buf = io.StringIO()
    buf.write(header + '\n')
    w = csv.writer(buf)
    for r in rows:
        w.writerow(r)
    text = buf.getvalue()
    data = text.encode('utf-8')
    if bom:
        data = b'\xef\xbb\xbf' + data
    return data


class TestProductTemplate:
    def test_template_requires_bearer(self):
        r = requests.get(f"{API}/admin/products/template.csv")
        assert r.status_code in (401, 403)

    def test_template_download(self, admin_headers):
        r = requests.get(f"{API}/admin/products/template.csv", headers=admin_headers)
        assert r.status_code == 200
        ct = r.headers.get('content-type', '')
        assert 'text/csv' in ct, ct
        cd = r.headers.get('content-disposition', '')
        assert 'attachment' in cd.lower()
        assert 'wth-products-template.csv' in cd

        body = r.text
        first_line = body.splitlines()[0]
        assert first_line.startswith('sku,slug,name,category_slug,price'), first_line

        # 3 sample rows (WTH-CAP-001, WTH-TEE-001, WTH-MUG-001)
        assert 'WTH-CAP-001' in body
        assert 'WTH-TEE-001' in body
        assert 'WTH-MUG-001' in body

        # Instruction rows start with '#'
        instruction_lines = [ln for ln in body.splitlines() if ln.startswith('#')]
        assert len(instruction_lines) >= 3, instruction_lines

        # Category slugs listed in instructions — should mention real DB slugs
        joined = '\n'.join(instruction_lines).lower()
        found = [
            slug for slug in ['head-gear', 'drinkware', 'clothing']
            if slug in joined
        ]
        assert len(found) >= 2, f"expected real category slugs in instructions, got: {instruction_lines}"


class TestBulkUpload:
    def test_bulk_upload_requires_bearer(self):
        data = _csv_bytes([])  # header only
        files = {'file': ('t.csv', data, 'text/csv')}
        r = requests.post(f"{API}/admin/products/bulk", files=files)
        assert r.status_code in (401, 403), r.text

    def test_bulk_upload_happy_path_update_and_create(self, admin_headers):
        # Discover an existing product to update. Prefer WTH-CAP-BL if present,
        # else grab first product with a sku.
        r_p = requests.get(f"{API}/products", params={'limit': 200})
        assert r_p.status_code == 200
        raw = r_p.json()
        products = raw['items'] if isinstance(raw, dict) and 'items' in raw else raw
        existing_sku = None
        for p in products:
            if isinstance(p, dict) and p.get('sku') == 'WTH-CAP-BL':
                existing_sku = p['sku']
                break
        if not existing_sku:
            for p in products:
                if isinstance(p, dict) and p.get('sku'):
                    existing_sku = p['sku']
                    break
        assert existing_sku, 'No existing product with sku found to update'

        new_sku = 'PYTEST-BULK-001'
        _created_product_skus.append(new_sku)

        rows = [
            [existing_sku, '', 'Updated Cap Name', 'head-gear', '999', '', '5',
             'Updated desc', '', 'bestseller', 'physical', 'true', 'false', ''],
            [new_sku, '', 'Pytest Bulk Drinkware', 'drinkware', '299', '', '15',
             'Test drinkware', '', 'new', 'physical', 'true', 'false', ''],
        ]
        data = _csv_bytes(rows)
        files = {'file': ('bulk.csv', data, 'text/csv')}
        r = requests.post(
            f"{API}/admin/products/bulk", headers=admin_headers, files=files
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body['ok'] is True
        assert body['total_rows'] == 2
        assert body['created'] == 1
        assert body['updated'] == 1
        assert body['errors'] == []

        # Verify new product exists via public GET
        r_p2 = requests.get(f"{API}/products", params={'limit': 500})
        assert r_p2.status_code == 200
        raw2 = r_p2.json()
        products2 = raw2['items'] if isinstance(raw2, dict) and 'items' in raw2 else raw2
        found = [p for p in products2 if isinstance(p, dict) and p.get('sku') == new_sku]
        assert len(found) == 1, f'created product {new_sku} not visible in /api/products'
        assert found[0]['name'] == 'Pytest Bulk Drinkware'
        assert found[0]['price'] == 299

    def test_bulk_upload_bad_category_slug_row_error(self, admin_headers):
        bad_sku = 'PYTEST-BULK-BAD-CAT'
        good_sku = 'PYTEST-BULK-GOOD-CAT'
        _created_product_skus.extend([bad_sku, good_sku])
        rows = [
            [bad_sku, '', 'Bad Cat Row', 'not-a-real-category', '499', '', '5',
             '', '', '', 'physical', 'true', 'false', ''],
            [good_sku, '', 'Good Cat Row', 'drinkware', '499', '', '5',
             '', '', '', 'physical', 'true', 'false', ''],
        ]
        data = _csv_bytes(rows)
        files = {'file': ('bulk_bad.csv', data, 'text/csv')}
        r = requests.post(
            f"{API}/admin/products/bulk", headers=admin_headers, files=files
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body['total_rows'] == 2
        assert body['created'] == 1
        assert body['updated'] == 0
        assert len(body['errors']) == 1
        err = body['errors'][0]
        assert err['row'] == 2  # first data row (header is row 1)
        assert 'Unknown category_slug' in err['error']

    def test_bulk_upload_missing_name_missing_sku_and_slug_bad_price(self, admin_headers):
        # Row2: missing sku AND slug
        # Row3: missing name
        # Row4: price = 0
        # Row5: valid (control)
        control_sku = 'PYTEST-BULK-CONTROL'
        _created_product_skus.append(control_sku)
        rows = [
            ['', '', 'Anon product', 'drinkware', '399', '', '', '', '', '', 'physical', 'true', 'false', ''],
            ['PYTEST-BULK-NONAME', '', '', 'drinkware', '399', '', '', '', '', '', 'physical', 'true', 'false', ''],
            ['PYTEST-BULK-BADPRICE', '', 'Bad Price', 'drinkware', '0', '', '', '', '', '', 'physical', 'true', 'false', ''],
            [control_sku, '', 'Control OK', 'drinkware', '399', '', '', '', '', '', 'physical', 'true', 'false', ''],
        ]
        data = _csv_bytes(rows)
        files = {'file': ('bulk_errors.csv', data, 'text/csv')}
        r = requests.post(
            f"{API}/admin/products/bulk", headers=admin_headers, files=files
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body['total_rows'] == 4
        assert body['created'] == 1
        assert body['updated'] == 0
        errs = body['errors']
        assert len(errs) == 3

        # Map row-num -> error text
        by_row = {e['row']: e['error'] for e in errs}
        assert 2 in by_row and 'sku' in by_row[2].lower() and 'slug' in by_row[2].lower()
        assert 3 in by_row and 'name' in by_row[3].lower()
        assert 4 in by_row and 'price' in by_row[4].lower()

    def test_bulk_upload_utf8_bom(self, admin_headers):
        sku = 'PYTEST-BULK-BOM'
        _created_product_skus.append(sku)
        rows = [
            [sku, '', 'BOM Product', 'drinkware', '199', '', '5', '', '',
             '', 'physical', 'true', 'false', ''],
        ]
        data = _csv_bytes(rows, bom=True)
        assert data.startswith(b'\xef\xbb\xbf')
        files = {'file': ('bom.csv', data, 'text/csv')}
        r = requests.post(
            f"{API}/admin/products/bulk", headers=admin_headers, files=files
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body['ok'] is True
        assert body['total_rows'] == 1
        assert body['created'] == 1
        assert body['errors'] == []

    def test_bulk_upload_xlsx(self, admin_headers):
        from openpyxl import Workbook
        sku = 'PYTEST-BULK-XLSX'
        _created_product_skus.append(sku)

        wb = Workbook()
        ws = wb.active
        headers = CSV_HEADER.split(',')
        ws.append(headers)
        ws.append([
            sku, '', 'XLSX Product', 'drinkware', 349, '', 7, 'From xlsx',
            '', 'new', 'physical', 'true', 'false', '',
        ])
        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)

        files = {
            'file': ('bulk.xlsx', buf.getvalue(),
                     'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
        }
        r = requests.post(
            f"{API}/admin/products/bulk", headers=admin_headers, files=files
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body['ok'] is True
        assert body['created'] == 1
        assert body['errors'] == []

    def test_bulk_upload_hash_rows_ignored(self, admin_headers):
        sku = 'PYTEST-BULK-HASH'
        _created_product_skus.append(sku)
        # Two commented rows + one valid row → total_rows should be 1, errors []
        rows = [
            ['# this is an instruction', '', '', '', '', '', '', '', '',
             '', '', '', '', ''],
            ['#another comment', '', '', '', '', '', '', '', '',
             '', '', '', '', ''],
            [sku, '', 'Hash Row Product', 'drinkware', '499', '', '3', '',
             '', '', 'physical', 'true', 'false', ''],
        ]
        data = _csv_bytes(rows)
        files = {'file': ('hash.csv', data, 'text/csv')}
        r = requests.post(
            f"{API}/admin/products/bulk", headers=admin_headers, files=files
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body['total_rows'] == 1, body
        assert body['created'] == 1
        assert body['updated'] == 0
        assert body['errors'] == []


# ==================================================================
# 3. REGRESSION SANITY
# ==================================================================
class TestRegression:
    def test_products_endpoint(self):
        r = requests.get(f"{API}/products")
        assert r.status_code == 200
        raw = r.json()
        # Endpoint returns paginated {items:[], total:N} — accept either shape
        if isinstance(raw, dict):
            assert 'items' in raw and isinstance(raw['items'], list)
            assert isinstance(raw.get('total'), int)
        else:
            assert isinstance(raw, list)

    def test_categories_endpoint(self):
        r = requests.get(f"{API}/categories")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        slugs = [c.get('slug') for c in data]
        # Verified against test request: real DB slugs
        for expected in ['drinkware', 'clothing', 'head-gear']:
            assert expected in slugs, f"category slug {expected} missing"

    def test_hope10_coupon_validate(self):
        # Public coupon validation endpoint — HOPE10 exists in seed
        payload = {'code': 'HOPE10', 'subtotal': 1000}
        r = requests.post(f"{API}/coupons/validate", json=payload)
        assert r.status_code == 200, r.text
        body = r.json()
        # Response shape may vary; accept either {valid:true, discount:...} or {ok:true, ...}
        ok = body.get('valid') or body.get('ok') or ('discount' in body)
        assert ok, body

    def test_admin_endpoint_401_without_bearer(self):
        r = requests.get(f"{API}/admin/locations")
        assert r.status_code in (401, 403)
        r2 = requests.get(f"{API}/admin/products/template.csv")
        assert r2.status_code in (401, 403)
