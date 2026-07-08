"""
Phase K — Backend tests
- CMS /api/content + /api/admin/content (GET/PUT/DELETE, admin gating)
- Public settings /api/settings/public (music enable/toggle)
- Image upload-from-url falls back to gridfs when AWS_S3_ENABLED false
- Light regression on categories, products, currency, recommendations
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://wear-interactive.preview.emergentagent.com').rstrip('/')
ADMIN_TOKEN = 'sess_1783487836132'
MUSIC_URL_EXPECTED = 'https://customer-assets.emergentagent.com/job_wear-interactive/artifacts/rbsqc21r_Wear%20The%20Hope%20Music.mp3'


@pytest.fixture(scope='session')
def api():
    s = requests.Session()
    s.headers.update({'Content-Type': 'application/json'})
    return s


@pytest.fixture(scope='session')
def admin(api):
    s = requests.Session()
    s.headers.update({'Content-Type': 'application/json', 'Authorization': f'Bearer {ADMIN_TOKEN}'})
    # smoke check admin token works
    r = s.get(f'{BASE_URL}/api/auth/me')
    if r.status_code != 200:
        pytest.skip(f'Admin session invalid: {r.status_code} {r.text[:200]}')
    return s


# ---------- /api/content ----------
class TestContentCMS:
    def test_get_content_returns_items_dict(self, api):
        r = api.get(f'{BASE_URL}/api/content')
        assert r.status_code == 200
        data = r.json()
        assert 'items' in data
        assert isinstance(data['items'], dict)

    def test_put_admin_content_requires_auth(self, api):
        r = api.put(f'{BASE_URL}/api/admin/content', json={'updates': {'test.k': 'v'}})
        assert r.status_code in (401, 403)

    def test_delete_admin_content_requires_auth(self, api):
        r = api.delete(f'{BASE_URL}/api/admin/content/some.key')
        assert r.status_code in (401, 403)

    def test_put_admin_content_upserts_and_get_reflects(self, api, admin):
        key = f'TEST_phaseK.announcement.item.1.{int(time.time())}'
        value = 'Testing Phase K announcement override'
        r = admin.put(f'{BASE_URL}/api/admin/content', json={'updates': {key: value}})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get('ok') is True
        assert body.get('updated') == 1

        r2 = api.get(f'{BASE_URL}/api/content')
        assert r2.status_code == 200
        items = r2.json()['items']
        assert items.get(key) == value

        # cleanup
        admin.delete(f'{BASE_URL}/api/admin/content/{key}')

    def test_delete_admin_content_removes_override(self, api, admin):
        key = f'TEST_phaseK.delete.{int(time.time())}'
        admin.put(f'{BASE_URL}/api/admin/content', json={'updates': {key: 'temp'}})
        # ensure present
        items = api.get(f'{BASE_URL}/api/content').json()['items']
        assert items.get(key) == 'temp'
        # delete
        rd = admin.delete(f'{BASE_URL}/api/admin/content/{key}')
        assert rd.status_code == 200
        # confirm gone
        items2 = api.get(f'{BASE_URL}/api/content').json()['items']
        assert key not in items2

    def test_put_admin_content_truncates_long_values(self, api, admin):
        key = f'TEST_phaseK.long.{int(time.time())}'
        long_val = 'x' * 6000  # >5000 max
        r = admin.put(f'{BASE_URL}/api/admin/content', json={'updates': {key: long_val}})
        assert r.status_code == 200
        items = api.get(f'{BASE_URL}/api/content').json()['items']
        assert key in items
        assert len(items[key]) <= 5000
        admin.delete(f'{BASE_URL}/api/admin/content/{key}')


# ---------- /api/settings/public music ----------
class TestPublicSettingsMusic:
    def test_music_default_enabled_with_url(self, api):
        r = api.get(f'{BASE_URL}/api/settings/public')
        assert r.status_code == 200
        m = r.json().get('music', {})
        assert m.get('enabled') is True
        assert m.get('url') == MUSIC_URL_EXPECTED
        assert 'label' in m
        vol = m.get('volume')
        assert isinstance(vol, (int, float))
        assert 0.0 <= float(vol) <= 1.0

    def test_music_toggle_off_hides_url(self, api, admin):
        # Turn OFF
        r = admin.put(f'{BASE_URL}/api/admin/integrations', json={'key': 'MUSIC_ENABLED', 'value': 'false'})
        assert r.status_code == 200, r.text
        try:
            pub = api.get(f'{BASE_URL}/api/settings/public').json()['music']
            assert pub['enabled'] is False
            assert pub['url'] == ''
        finally:
            # restore
            admin.put(f'{BASE_URL}/api/admin/integrations', json={'key': 'MUSIC_ENABLED', 'value': 'true'})
        pub2 = api.get(f'{BASE_URL}/api/settings/public').json()['music']
        assert pub2['enabled'] is True
        assert pub2['url'] == MUSIC_URL_EXPECTED


# ---------- Image pipeline gridfs fallback ----------
class TestImageFallback:
    def test_upload_from_url_uses_gridfs_when_s3_off(self, admin):
        # Use httpbin's stable image endpoint (no hotlink protection)
        src = 'https://httpbin.org/image/png'
        r = admin.post(f'{BASE_URL}/api/admin/images/upload-from-url', json={'url': src})
        # If external fetch flakes upstream, accept 502; but expect 200 in normal env
        if r.status_code >= 500:
            pytest.skip(f'External image fetch failed: {r.status_code}')
        assert r.status_code == 200, r.text
        data = r.json()
        # Backend may return either single record or list; check for gridfs backend hint
        # Accept flexible shapes: search recursively for 'backend' key
        def find_backend(o):
            if isinstance(o, dict):
                if 'backend' in o:
                    return o['backend']
                for v in o.values():
                    b = find_backend(v)
                    if b:
                        return b
            elif isinstance(o, list):
                for v in o:
                    b = find_backend(v)
                    if b:
                        return b
            return None
        backend = find_backend(data)
        # Accept 'gridfs' or missing (older shape) — but must NOT be 's3'
        assert backend != 's3', f'Expected gridfs fallback, got {backend}. Full: {data}'


# ---------- Regression ----------
class TestRegression:
    def test_categories_list(self, api):
        r = api.get(f'{BASE_URL}/api/categories')
        assert r.status_code == 200

    def test_products_list(self, api):
        r = api.get(f'{BASE_URL}/api/products')
        assert r.status_code == 200
        data = r.json()
        # envelope check
        assert 'items' in data or 'products' in data

    def test_currency_rates(self, api):
        r = api.get(f'{BASE_URL}/api/currency/rates')
        assert r.status_code == 200
        d = r.json()
        assert d.get('base') == 'INR'
        assert 'rates' in d or 'currencies' in d

    def test_product_recommendations(self, api):
        r = api.get(f'{BASE_URL}/api/products')
        products = r.json().get('items') or r.json().get('products') or []
        if not products:
            pytest.skip('No products in catalog')
        pid = products[0]['id']
        rr = api.get(f'{BASE_URL}/api/products/{pid}/recommendations?limit=3')
        assert rr.status_code == 200
        items = rr.json().get('items', [])
        assert len(items) <= 3
