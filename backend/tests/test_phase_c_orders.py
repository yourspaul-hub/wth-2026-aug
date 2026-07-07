"""Wear The Hope — Phase C (Order Operations) backend tests.
All payments/shipping/email integrations are MOCKED per product spec.
Verifies: admin auth, order lifecycle emails, refunds+restock, invoice HTML,
abandoned carts, email outbox admin endpoints, and regression sanity.

IMPORTANT: These tests share state across classes (order lifecycle chain).
Run with `-n 0` to force serial execution, e.g.:
  pytest tests/test_phase_c_orders.py -v -n 0
"""
import os
import time
import uuid
import subprocess
import re
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://wear-interactive.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"


# --------------- Session/token helpers ---------------
def _mint_admin_token() -> str:
    """Mint an admin session token directly in MongoDB (per test_credentials.md)."""
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'test_database')
    js = f"""
const dbn = '{db_name}';
const userId = 'admin-pytest-' + Date.now();
const sessionToken = 'pytest_sess_' + Date.now() + '_' + Math.random().toString(36).slice(2,10);
db.getSiblingDB(dbn).admin_users.insertOne({{
  user_id: userId, email: 'admin+'+userId+'@wearthehope.io',
  name: 'Pytest Admin', picture: 'https://via.placeholder.com/150',
  role: 'admin', created_at: new Date()
}});
db.getSiblingDB(dbn).admin_sessions.insertOne({{
  user_id: userId, session_token: sessionToken,
  expires_at: new Date(Date.now()+7*24*60*60*1000),
  created_at: new Date()
}});
print(sessionToken);
"""
    out = subprocess.check_output(['mongosh', mongo_url, '--quiet', '--eval', js], text=True).strip()
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


@pytest.fixture(scope='session')
def fresh_product(admin_client):
    """Create a fresh product so stock/restock assertions are deterministic."""
    slug = f"TEST-phasec-{uuid.uuid4().hex[:8]}"
    payload = {
        'name': f'TEST Phase C Product {slug}',
        'slug': slug,
        'category': 'apparel',  # any string; server just stores it
        'price': 500,
        'original_price': 700,
        'image': 'https://via.placeholder.com/300',
        'stock': 20,
        'sku': f'TESTSKU-{slug}',
        'product_type': 'physical',
        'active': True,
    }
    r = admin_client.post(f'{API}/admin/products', json=payload)
    assert r.status_code == 200, f'create product failed: {r.status_code} {r.text}'
    p = r.json()
    yield p
    # cleanup
    try:
        admin_client.delete(f'{API}/admin/products/{p["id"]}')
    except Exception:
        pass


# --------------- Auth ---------------
class TestAuth:
    def test_me_with_bearer(self, admin_client):
        r = admin_client.get(f'{API}/auth/me')
        assert r.status_code == 200
        data = r.json()
        assert 'user_id' in data
        assert data['role'] == 'admin'

    def test_me_without_bearer_401(self, anon_client):
        r = anon_client.get(f'{API}/auth/me')
        assert r.status_code == 401

    def test_admin_endpoints_require_auth(self, anon_client):
        # spot check several new admin endpoints
        endpoints = [
            ('GET', '/admin/abandoned-carts'),
            ('GET', '/admin/emails'),
            ('GET', '/admin/emails/does-not-exist'),
            ('POST', '/admin/orders/WTH-nope/refund'),
            ('POST', '/admin/abandoned-carts/nope/send-recovery'),
        ]
        for method, path in endpoints:
            r = anon_client.request(method, f'{API}{path}', json={})
            assert r.status_code == 401, f'{method} {path} -> {r.status_code}'


# --------------- Regression sanity ---------------
class TestRegression:
    def test_products_still_list(self, anon_client):
        r = anon_client.get(f'{API}/products')
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d.get('items'), list)
        assert d.get('total', 0) >= 1

    def test_coupon_hope10(self, anon_client):
        r = anon_client.post(f'{API}/coupons/validate', json={'code': 'HOPE10', 'subtotal': 1000})
        assert r.status_code == 200
        d = r.json()
        assert d.get('valid') is True
        assert d.get('discount') == 100


# --------------- Order lifecycle helpers ---------------
def _shipping_addr(email='test.buyer@wearthehope.io'):
    return {
        'full_name': 'Test Buyer',
        'email': email,
        'phone': '9999999999',
        'line1': '1 Test Rd',
        'line2': 'Apt 2',
        'city': 'Mumbai',
        'state': 'Maharashtra',
        'pincode': '400050',
        'country': 'India',
    }


def _order_item(prod, qty=2):
    return {
        'product_id': prod['id'],
        'name': prod['name'],
        'image': prod['image'],
        'price': prod['price'],
        'qty': qty,
        'product_type': prod.get('product_type', 'physical'),
    }


# --------------- Order lifecycle ---------------
class TestOrderLifecycle:
    def test_a_create_order_and_email_outbox(self, anon_client, admin_client, fresh_product):
        # snapshot stock
        pid = fresh_product['id']
        r0 = anon_client.get(f'{API}/products/{pid}')
        assert r0.status_code == 200
        pre_stock = r0.json()['product']['stock']

        payload = {
            'items': [_order_item(fresh_product, qty=2)],
            'shipping_address': _shipping_addr('order.a@wearthehope.io'),
            'payment_provider': 'razorpay',
        }
        r = anon_client.post(f'{API}/orders', json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        order = data['order']
        on = order['order_number']
        # validate order_number pattern
        assert re.match(r'^WTH-\d{8}-[A-Z0-9]{5}$', on), on
        assert order['status'] == 'pending'
        assert order['payment_status'] == 'unpaid'
        # payment payload mocked
        assert data['payment']['mocked'] is True
        # stock decremented
        r1 = anon_client.get(f'{API}/products/{pid}')
        assert r1.json()['product']['stock'] == pre_stock - 2

        # stash order_number for chain
        pytest.order_number = on
        pytest.buyer_email = payload['shipping_address']['email']

        # order_placed email queued
        r = admin_client.get(f'{API}/admin/emails', params={'template': 'order_placed'})
        assert r.status_code == 200
        emails = r.json()
        assert any(e.get('order_number') == on and e['to'] == payload['shipping_address']['email'] for e in emails), \
            f'no order_placed email for {on}'

    def test_b_verify_payment_shiprocket_and_email(self, anon_client, admin_client):
        on = pytest.order_number
        r = anon_client.post(f'{API}/payments/verify', json={'order_number': on, 'provider': 'razorpay'})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d['mocked'] is True
        o = d['order']
        assert o['payment_status'] == 'paid'
        assert o['status'] == 'paid'
        # Shiprocket AWB assigned
        assert o.get('shiprocket_awb', '').startswith('SR'), o.get('shiprocket_awb')
        assert o.get('tracking_url', '').startswith('https://shiprocket.co/tracking/')

        # order_paid email queued
        emails = admin_client.get(f'{API}/admin/emails', params={'template': 'order_paid'}).json()
        assert any(e.get('order_number') == on for e in emails), 'no order_paid email'

    def test_c_ship_order_emits_email(self, admin_client):
        on = pytest.order_number
        r = admin_client.patch(f'{API}/admin/orders/{on}', json={'status': 'shipped'})
        assert r.status_code == 200, r.text
        assert r.json()['status'] == 'shipped'

        emails = admin_client.get(f'{API}/admin/emails', params={'template': 'order_shipped'}).json()
        assert any(e.get('order_number') == on for e in emails), 'no order_shipped email'

    def test_d_refund_paid_order_restocks_and_emails(self, anon_client, admin_client, fresh_product):
        on = pytest.order_number
        pid = fresh_product['id']
        pre = anon_client.get(f'{API}/products/{pid}').json()['product']['stock']
        r = admin_client.post(f'{API}/admin/orders/{on}/refund', json={'reason': 'defective'})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d['ok'] is True
        o = d['order']
        assert o['status'] == 'refunded'
        assert o['payment_status'] == 'refunded'
        # restock: refunded 2 units
        post = anon_client.get(f'{API}/products/{pid}').json()['product']['stock']
        assert post == pre + 2, f'expected restock +2 (pre={pre} post={post})'

        emails = admin_client.get(f'{API}/admin/emails', params={'template': 'order_refunded'}).json()
        assert any(e.get('order_number') == on for e in emails)

    def test_e_refund_unpaid_returns_400(self, anon_client, admin_client, fresh_product):
        # create a fresh order (unpaid) and try to refund
        payload = {
            'items': [_order_item(fresh_product, qty=1)],
            'shipping_address': _shipping_addr('order.e@wearthehope.io'),
            'payment_provider': 'razorpay',
        }
        r = anon_client.post(f'{API}/orders', json=payload)
        assert r.status_code == 200
        on = r.json()['order']['order_number']
        r = admin_client.post(f'{API}/admin/orders/{on}/refund', json={'reason': 'test'})
        assert r.status_code == 400, r.text


# --------------- Invoice ---------------
class TestInvoice:
    def test_invoice_html_ok(self, anon_client):
        on = pytest.order_number
        r = anon_client.get(f'{API}/invoices/{on}')
        assert r.status_code == 200
        assert 'text/html' in r.headers.get('content-type', '')
        body = r.text
        assert on in body
        assert 'Invoice' in body
        # total appears — order total should exist somewhere in body
        # fetch order total
        o = anon_client.get(f'{API}/orders/{on}').json()
        assert f"{o['total']:,}" in body

    def test_invoice_unknown_404(self, anon_client):
        r = anon_client.get(f'{API}/invoices/WTH-99999999-XXXXX')
        assert r.status_code == 404


# --------------- Abandoned Carts ---------------
class TestAbandonedCarts:
    def test_track_create_and_dedupe(self, anon_client, admin_client):
        email = f'cart.{uuid.uuid4().hex[:6]}@wearthehope.io'
        payload = {
            'email': email,
            'name': 'Cart User',
            'items': [{'name': 'Faith Cap', 'price': 799, 'qty': 1}],
            'subtotal': 799,
        }
        r1 = anon_client.post(f'{API}/cart/track', json=payload)
        assert r1.status_code == 200
        cid = r1.json()['id']

        # Second POST — same email should NOT duplicate
        payload['subtotal'] = 1500
        payload['items'] = [{'name': 'Faith Cap', 'price': 799, 'qty': 2}]
        r2 = anon_client.post(f'{API}/cart/track', json=payload)
        assert r2.status_code == 200
        assert r2.json()['id'] == cid, 'abandoned cart duplicated on same email'

        # Admin list
        r = admin_client.get(f'{API}/admin/abandoned-carts')
        assert r.status_code == 200
        d = r.json()
        assert 'stale' in d and 'all' in d
        assert any(c['id'] == cid for c in d['all'])

        pytest.cart_id = cid
        pytest.cart_email = email

    def test_send_recovery(self, admin_client):
        cid = pytest.cart_id
        r = admin_client.post(f'{API}/admin/abandoned-carts/{cid}/send-recovery')
        assert r.status_code == 200
        # verify email queued
        emails = admin_client.get(f'{API}/admin/emails', params={'template': 'abandoned_cart'}).json()
        assert any((e.get('context') or {}).get('cart_id') == cid or e.get('to') == pytest.cart_email for e in emails)
        # verify recovery_email_sent=true
        carts = admin_client.get(f'{API}/admin/abandoned-carts').json()['all']
        c = next((x for x in carts if x['id'] == cid), None)
        assert c is not None and c.get('recovery_email_sent') is True

    def test_placing_order_marks_recovered(self, anon_client, admin_client, fresh_product):
        # Place an order for the same email
        payload = {
            'items': [_order_item(fresh_product, qty=1)],
            'shipping_address': _shipping_addr(pytest.cart_email),
            'payment_provider': 'razorpay',
        }
        r = anon_client.post(f'{API}/orders', json=payload)
        assert r.status_code == 200

        carts = admin_client.get(f'{API}/admin/abandoned-carts').json()['all']
        c = next((x for x in carts if x['id'] == pytest.cart_id), None)
        assert c is not None
        assert c.get('recovered') is True


# --------------- Email Outbox admin ---------------
class TestEmailOutbox:
    def test_list_sorted_desc(self, admin_client):
        r = admin_client.get(f'{API}/admin/emails')
        assert r.status_code == 200
        emails = r.json()
        assert isinstance(emails, list) and len(emails) >= 1
        # created_at desc
        ts = [e.get('created_at') for e in emails if e.get('created_at')]
        assert ts == sorted(ts, reverse=True), 'emails not sorted desc by created_at'

    def test_filter_by_template(self, admin_client):
        r = admin_client.get(f'{API}/admin/emails', params={'template': 'order_paid'})
        assert r.status_code == 200
        emails = r.json()
        assert all(e['template'] == 'order_paid' for e in emails)

    def test_get_single_email(self, admin_client):
        emails = admin_client.get(f'{API}/admin/emails').json()
        eid = emails[0]['id']
        r = admin_client.get(f'{API}/admin/emails/{eid}')
        assert r.status_code == 200
        d = r.json()
        assert d['id'] == eid
        assert isinstance(d.get('html'), str) and len(d['html']) > 0
