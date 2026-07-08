"""Phase J — Multi-currency FX + product recommendations + regression spot-check.

Covers:
 - GET /api/currency/rates
 - GET /api/products/{pid}/recommendations
 - GET /api/products/{pid}/recommendations for invalid id -> 404
 - Back-compat: GET /api/products/{pid} (product+related)
 - Regression: /api/products, /api/categories, /api/reviews
"""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
assert BASE_URL, 'REACT_APP_BACKEND_URL missing from env'


@pytest.fixture(scope='module')
def s():
    sess = requests.Session()
    sess.headers.update({'Content-Type': 'application/json'})
    return sess


@pytest.fixture(scope='module')
def sample_pid(s):
    """Pick a valid product id from the live catalog."""
    r = s.get(f'{BASE_URL}/api/products?limit=5', timeout=20)
    assert r.status_code == 200
    items = r.json().get('items') or []
    assert items, 'No products found in catalog — cannot run recommendation tests'
    return items[0]['id']


# ================= CURRENCY =================
class TestCurrencyRates:
    """GET /api/currency/rates - multi-currency FX rate endpoint."""

    REQUIRED_CODES = {'INR', 'USD', 'EUR', 'GBP', 'AUD', 'AED'}

    def test_status_200_and_shape(self, s):
        r = s.get(f'{BASE_URL}/api/currency/rates', timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get('base') == 'INR'
        assert 'currencies' in data and isinstance(data['currencies'], list)
        assert 'updated_at' in data
        assert len(data['currencies']) >= 6

    def test_contains_required_currencies(self, s):
        data = s.get(f'{BASE_URL}/api/currency/rates', timeout=15).json()
        codes = {c['code'] for c in data['currencies']}
        assert self.REQUIRED_CODES.issubset(codes), \
            f'Missing currencies: {self.REQUIRED_CODES - codes}'

    def test_each_currency_has_required_fields(self, s):
        data = s.get(f'{BASE_URL}/api/currency/rates', timeout=15).json()
        for c in data['currencies']:
            assert 'code' in c and isinstance(c['code'], str)
            assert 'symbol' in c and isinstance(c['symbol'], str) and c['symbol']
            assert 'rate' in c and isinstance(c['rate'], (int, float))
            assert 'decimals' in c and isinstance(c['decimals'], int)
            assert c['rate'] > 0

    def test_inr_base_rate_is_1(self, s):
        data = s.get(f'{BASE_URL}/api/currency/rates', timeout=15).json()
        inr = next(c for c in data['currencies'] if c['code'] == 'INR')
        assert inr['rate'] == 1.0
        assert inr['decimals'] == 0


# ================= RECOMMENDATIONS =================
class TestRecommendations:
    """GET /api/products/{pid}/recommendations - You may also love."""

    def test_recommendations_default_shape(self, s, sample_pid):
        r = s.get(f'{BASE_URL}/api/products/{sample_pid}/recommendations?limit=8', timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert 'items' in data and isinstance(data['items'], list)
        assert 'total' in data
        assert len(data['items']) <= 8
        # each item should have basic product fields
        for it in data['items']:
            assert 'id' in it
            assert 'name' in it
            assert 'price' in it
            assert 'image' in it

    def test_recommendations_excludes_self(self, s, sample_pid):
        r = s.get(f'{BASE_URL}/api/products/{sample_pid}/recommendations?limit=8', timeout=20)
        data = r.json()
        ids = [it['id'] for it in data['items']]
        assert sample_pid not in ids, 'Recommendation list must exclude the source product'

    def test_recommendations_limit_respected(self, s, sample_pid):
        r = s.get(f'{BASE_URL}/api/products/{sample_pid}/recommendations?limit=3', timeout=20)
        data = r.json()
        assert len(data['items']) <= 3

    def test_recommendations_returns_items_key(self, s, sample_pid):
        """FE contract: consumer relies on data.items array."""
        data = s.get(
            f'{BASE_URL}/api/products/{sample_pid}/recommendations',
            timeout=20,
        ).json()
        assert 'items' in data
        assert isinstance(data['items'], list)

    def test_recommendations_invalid_pid_404(self, s):
        r = s.get(f'{BASE_URL}/api/products/does_not_exist_xxx_zzz/recommendations', timeout=15)
        assert r.status_code == 404

    def test_no_mongodb_objectid_leak(self, s, sample_pid):
        data = s.get(f'{BASE_URL}/api/products/{sample_pid}/recommendations', timeout=20).json()
        for it in data['items']:
            assert '_id' not in it, 'Mongo _id must be excluded from response'


# ================= BACKCOMPAT =================
class TestProductDetailBackcompat:
    def test_get_product_still_returns_product_and_related(self, s, sample_pid):
        r = s.get(f'{BASE_URL}/api/products/{sample_pid}', timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert 'product' in data and data['product']
        assert data['product']['id'] == sample_pid
        assert 'related' in data
        assert isinstance(data['related'], list)


# ================= REGRESSION =================
class TestRegression:
    def test_products_list_200(self, s):
        r = s.get(f'{BASE_URL}/api/products?limit=1', timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert 'items' in d and 'total' in d

    def test_categories_200(self, s):
        r = s.get(f'{BASE_URL}/api/categories', timeout=15)
        assert r.status_code == 200

    def test_reviews_list_200(self, s):
        # Note: /api/reviews/generic is not an endpoint. Actual review list is /api/reviews.
        r = s.get(f'{BASE_URL}/api/reviews?limit=1', timeout=15)
        assert r.status_code == 200
        d = r.json()
        # envelope shape
        assert 'items' in d
