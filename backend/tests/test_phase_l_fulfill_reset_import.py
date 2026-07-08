"""Wear The Hope — Phase L backend tests.
Covers the new admin flows added in this iteration:
  - Couriers dropdown source
  - Manual order fulfilment (courier / hand / door / store)
  - Store data reset with granular targets + RESET confirm
  - Past orders CSV import (create + update) + template download

All external integrations (payments/Gmail/shipping) are MOCKED — verified via
the email_outbox collection.
"""
import os
import io
import csv
import time
import uuid
import subprocess
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001').rstrip('/')
API = f"{BASE_URL}/api"


# ---------------- session/auth helpers ----------------
def _mint_admin_token() -> str:
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'test_database')
    js = f"""
const dbn = '{db_name}';
const userId = 'admin-pytest-L-' + Date.now();
const sessionToken = 'pytest_sess_L_' + Date.now() + '_' + Math.random().toString(36).slice(2,10);
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
    slug = f"TEST-phasel-{uuid.uuid4().hex[:8]}"
    payload = {
        'name': f'TEST Phase L Product {slug}',
        'slug': slug,
        'category': 'apparel',
        'price': 500,
        'original_price': 700,
        'image': 'https://via.placeholder.com/300',
        'stock': 50,
        'sku': f'TESTSKU-{slug}',
        'product_type': 'physical',
        'active': True,
    }
    r = admin_client.post(f'{API}/admin/products', json=payload)
    assert r.status_code == 200, r.text
    yield r.json()


def _shipping_addr(email):
    return {
        'full_name': 'Fulfil Buyer',
        'email': email,
        'phone': '9999999999',
        'line1': '1 Test Rd',
        'city': 'Mumbai',
        'state': 'Maharashtra',
        'pincode': '400050',
        'country': 'India',
    }


def _make_paid_order(anon_client, product):
    """Create + verify (mock) payment → an order that is ready to fulfil."""
    email = f'fulfil.{uuid.uuid4().hex[:6]}@wearthehope.io'
    payload = {
        'items': [{
            'product_id': product['id'],
            'name': product['name'],
            'image': product['image'],
            'price': product['price'],
            'qty': 1,
            'product_type': product.get('product_type', 'physical'),
        }],
        'shipping_address': _shipping_addr(email),
        'payment_provider': 'razorpay',
    }
    r = anon_client.post(f'{API}/orders', json=payload)
    assert r.status_code == 200, r.text
    on = r.json()['order']['order_number']
    # verify mock payment so the order transitions to 'paid'
    r2 = anon_client.post(f'{API}/payments/verify', json={'order_number': on, 'provider': 'razorpay'})
    assert r2.status_code == 200, r2.text
    return on, email


# ---------------- Couriers ----------------
class TestCouriers:
    def test_couriers_requires_auth(self, anon_client):
        r = anon_client.get(f'{API}/admin/couriers')
        assert r.status_code == 401

    def test_couriers_list(self, admin_client):
        r = admin_client.get(f'{API}/admin/couriers')
        assert r.status_code == 200
        d = r.json()
        items = d.get('items', [])
        assert isinstance(items, list)
        assert len(items) >= 25, f'expected >=25 couriers, got {len(items)}'
        names = {c['name'] for c in items}
        for expected in ('Delhivery', 'FedEx', 'DHL Express', 'Blue Dart'):
            assert expected in names, f'missing courier: {expected}'
        groups = {c.get('group') for c in items}
        assert 'India' in groups and 'International' in groups


# ---------------- Fulfil order ----------------
class TestFulfillOrder:
    def test_courier_fulfil_success(self, anon_client, admin_client, fresh_product):
        on, buyer = _make_paid_order(anon_client, fresh_product)
        r = admin_client.post(f'{API}/admin/orders/{on}/fulfill', json={
            'method': 'courier',
            'courier': 'Delhivery',
            'awb': 'DL999TEST123',
            'tracking_url': 'https://delhivery.com/track/DL999TEST123',
            'notes': 'via pytest',
        })
        assert r.status_code == 200, r.text
        o = r.json()
        assert o['status'] == 'shipped'
        assert o['fulfillment_method'] == 'courier'
        assert o['fulfillment_courier'] == 'Delhivery'
        assert o['shiprocket_awb'] == 'DL999TEST123'
        assert o['tracking_url'] == 'https://delhivery.com/track/DL999TEST123'
        assert o['fulfilled_at'] is not None
        # email outbox
        emails = admin_client.get(f'{API}/admin/emails', params={'template': 'order_shipped'}).json()
        assert any(e.get('order_number') == on and e.get('to') == buyer for e in emails), \
            'order_shipped email not queued'

    def test_hand_delivery_success(self, anon_client, admin_client, fresh_product):
        on, buyer = _make_paid_order(anon_client, fresh_product)
        r = admin_client.post(f'{API}/admin/orders/{on}/fulfill', json={'method': 'hand_delivery'})
        assert r.status_code == 200, r.text
        o = r.json()
        assert o['status'] == 'delivered'
        assert o['fulfillment_method'] == 'hand_delivery'
        emails = admin_client.get(f'{API}/admin/emails', params={'template': 'order_delivered'}).json()
        assert any(e.get('order_number') == on for e in emails)

    def test_store_pickup_success(self, anon_client, admin_client, fresh_product):
        on, _ = _make_paid_order(anon_client, fresh_product)
        r = admin_client.post(f'{API}/admin/orders/{on}/fulfill', json={'method': 'store_pickup'})
        assert r.status_code == 200, r.text
        o = r.json()
        assert o['status'] == 'delivered'
        assert o['fulfillment_method'] == 'store_pickup'
        emails = admin_client.get(f'{API}/admin/emails', params={'template': 'order_delivered'}).json()
        assert any(e.get('order_number') == on for e in emails)

    def test_door_delivery_success(self, anon_client, admin_client, fresh_product):
        on, _ = _make_paid_order(anon_client, fresh_product)
        r = admin_client.post(f'{API}/admin/orders/{on}/fulfill', json={'method': 'door_delivery'})
        assert r.status_code == 200, r.text
        o = r.json()
        assert o['status'] == 'delivered'
        assert o['fulfillment_method'] == 'door_delivery'

    def test_courier_missing_awb(self, anon_client, admin_client, fresh_product):
        on, _ = _make_paid_order(anon_client, fresh_product)
        r = admin_client.post(f'{API}/admin/orders/{on}/fulfill', json={
            'method': 'courier', 'courier': 'Delhivery'
        })
        assert r.status_code == 400
        assert 'AWB' in r.json().get('detail', '')

    def test_courier_missing_courier(self, anon_client, admin_client, fresh_product):
        on, _ = _make_paid_order(anon_client, fresh_product)
        r = admin_client.post(f'{API}/admin/orders/{on}/fulfill', json={
            'method': 'courier', 'awb': 'ABC123'
        })
        assert r.status_code == 400
        assert 'ourier' in r.json().get('detail', '')  # 'Courier' or 'courier'

    def test_invalid_method(self, anon_client, admin_client, fresh_product):
        on, _ = _make_paid_order(anon_client, fresh_product)
        r = admin_client.post(f'{API}/admin/orders/{on}/fulfill', json={'method': 'teleport'})
        assert r.status_code == 400
        assert 'Invalid method' in r.json().get('detail', '')

    def test_fulfil_nonexistent_order(self, admin_client):
        r = admin_client.post(f'{API}/admin/orders/WTH-99999999-NOPEE/fulfill', json={'method': 'hand_delivery'})
        assert r.status_code == 404

    def test_fulfil_cancelled_or_refunded_blocked(self, anon_client, admin_client, fresh_product):
        # create paid order then refund → refunded
        on, _ = _make_paid_order(anon_client, fresh_product)
        r = admin_client.post(f'{API}/admin/orders/{on}/refund', json={'reason': 'test'})
        assert r.status_code == 200
        # now try to fulfil
        r2 = admin_client.post(f'{API}/admin/orders/{on}/fulfill', json={'method': 'hand_delivery'})
        assert r2.status_code == 400
        assert 'cannot fulfil' in r2.json().get('detail', '').lower()

    def test_fulfil_requires_auth(self, anon_client):
        r = anon_client.post(f'{API}/admin/orders/WTH-anything/fulfill', json={'method': 'hand_delivery'})
        assert r.status_code == 401


# ---------------- Reset data ----------------
class TestResetData:
    def test_targets_list(self, admin_client):
        r = admin_client.get(f'{API}/admin/dev/reset/targets')
        assert r.status_code == 200
        items = r.json().get('items', [])
        assert isinstance(items, list)
        assert len(items) >= 15, f'expected >=15 reset targets, got {len(items)}'
        for it in items:
            assert 'key' in it and 'collections' in it and 'count' in it
            assert isinstance(it['collections'], list)
            assert isinstance(it['count'], int)
        keys = {it['key'] for it in items}
        for expected in ('orders', 'products', 'reviews', 'blog', 'newsletter', 'emails'):
            assert expected in keys

    def test_targets_requires_auth(self, anon_client):
        r = anon_client.get(f'{API}/admin/dev/reset/targets')
        assert r.status_code == 401

    def test_wrong_confirm_rejected(self, admin_client):
        r = admin_client.post(f'{API}/admin/dev/reset', json={'targets': ['newsletter'], 'confirm': 'WRONG'})
        assert r.status_code == 400
        assert 'RESET' in r.json().get('detail', '')

    def test_unknown_target_rejected(self, admin_client):
        r = admin_client.post(f'{API}/admin/dev/reset', json={'targets': ['bogus_key'], 'confirm': 'RESET'})
        assert r.status_code == 400
        detail = r.json().get('detail', '')
        assert 'bogus_key' in detail
        assert 'Valid' in detail or 'valid' in detail

    def test_reset_newsletter_only(self, admin_client, anon_client):
        # seed a newsletter row so the reset has something to clear
        r0 = anon_client.post(f'{API}/newsletter/subscribe', json={
            'email': f'nl.{uuid.uuid4().hex[:6]}@wearthehope.io'
        })
        assert r0.status_code in (200, 201)

        # capture pre-counts on protected collections
        # /api/auth/me tells us admin_users + admin_sessions survive
        assert admin_client.get(f'{API}/auth/me').status_code == 200
        # /api/content (public) reads site_content — should still be populated after reset
        content_before = anon_client.get(f'{API}/content').json()
        assert isinstance(content_before, dict)
        # /api/settings/public reads settings collection
        settings_before = anon_client.get(f'{API}/settings/public').json()

        # perform reset
        r = admin_client.post(f'{API}/admin/dev/reset', json={'targets': ['newsletter'], 'confirm': 'RESET'})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get('ok') is True
        assert 'newsletter' in d.get('cleared', {})
        assert isinstance(d['cleared']['newsletter'], int)
        assert d['cleared']['newsletter'] >= 1

        # protected collections still intact
        assert admin_client.get(f'{API}/auth/me').status_code == 200, \
            'admin_users/admin_sessions must NOT be touched by reset'
        content_after = anon_client.get(f'{API}/content').json()
        settings_after = anon_client.get(f'{API}/settings/public').json()
        assert content_after == content_before, 'site_content changed after newsletter reset'
        assert settings_after == settings_before, 'settings changed after newsletter reset'

    def test_reset_requires_auth(self, anon_client):
        r = anon_client.post(f'{API}/admin/dev/reset', json={'targets': ['newsletter'], 'confirm': 'RESET'})
        assert r.status_code == 401


# ---------------- Past orders import ----------------
class TestPastOrdersImport:
    def test_template_download(self, admin_client):
        r = admin_client.get(f'{API}/admin/orders/import-template.csv')
        assert r.status_code == 200
        ct = r.headers.get('content-type', '')
        assert 'text/csv' in ct.lower()
        text = r.text
        # expected column headers
        for col in ('order_number', 'customer_name', 'customer_email', 'total',
                    'fulfillment_method', 'awb', 'tracking_url'):
            assert col in text, f'missing column {col} in template'

    def test_template_requires_auth(self, anon_client):
        r = anon_client.get(f'{API}/admin/orders/import-template.csv')
        assert r.status_code == 401

    def test_import_create_and_error_row(self, admin_client):
        unique = uuid.uuid4().hex[:6].upper()
        good_on = f'WTH-20240115-{unique}'
        # build a small CSV: 1 valid row + 1 invalid (missing total)
        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow([
            'order_number', 'created_at', 'customer_name', 'customer_email',
            'customer_phone', 'address_line1', 'address_line2', 'city', 'state',
            'pincode', 'country', 'items_summary', 'subtotal', 'shipping_fee',
            'discount', 'total', 'status', 'payment_status', 'payment_provider',
            'payment_reference', 'fulfillment_method', 'fulfillment_courier',
            'awb', 'tracking_url', 'notes',
        ])
        w.writerow([
            good_on, '2024-01-15', 'Rebecca Import', 'rebecca.import@example.com',
            '+919812345678', '12 Rose Villa', '', 'Bengaluru', 'Karnataka',
            '560001', 'India', 'Faith Cap x1', '1798', '0', '0', '1798',
            'delivered', 'paid', 'razorpay', 'pay_MOCK',
            'courier', 'Delhivery', 'DL111', 'https://delhivery.com/track/DL111', 'legacy',
        ])
        # invalid: no total, no customer_email
        w.writerow(['', '2024-01-16', 'Broken', '', '', '', '', '', '', '', '',
                    '', '', '', '', '', '', '', '', '', '', '', '', '', ''])
        buf.seek(0)

        files = {'file': ('legacy.csv', buf.getvalue(), 'text/csv')}
        # remove content-type header for multipart request
        h = {k: v for k, v in admin_client.headers.items() if k.lower() != 'content-type'}
        r = requests.post(f'{API}/admin/orders/import', files=files, headers=h)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get('ok') is True
        assert d.get('created', 0) + d.get('updated', 0) >= 1
        assert len(d.get('errors', [])) >= 1
        assert any('customer_email' in e.get('error', '') or 'total' in e.get('error', '')
                   for e in d['errors'])

        # order should now be listed
        orders = admin_client.get(f'{API}/admin/orders').json()
        assert any(o.get('order_number') == good_on for o in orders), \
            f'imported order {good_on} not returned by /api/admin/orders'
        # stash for update test
        pytest._import_on = good_on

    def test_import_update_existing(self, admin_client):
        good_on = getattr(pytest, '_import_on', None)
        assert good_on, 'previous create test must set _import_on'
        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow([
            'order_number', 'created_at', 'customer_name', 'customer_email',
            'customer_phone', 'address_line1', 'address_line2', 'city', 'state',
            'pincode', 'country', 'items_summary', 'subtotal', 'shipping_fee',
            'discount', 'total', 'status', 'payment_status', 'payment_provider',
            'payment_reference', 'fulfillment_method', 'fulfillment_courier',
            'awb', 'tracking_url', 'notes',
        ])
        w.writerow([
            good_on, '2024-01-15', 'Rebecca Updated', 'rebecca.import@example.com',
            '+919812345678', '12 Rose Villa Updated', '', 'Bengaluru', 'Karnataka',
            '560001', 'India', 'Faith Cap x2', '3596', '0', '0', '3596',
            'delivered', 'paid', 'razorpay', 'pay_MOCK',
            'courier', 'Delhivery', 'DL111', 'https://delhivery.com/track/DL111', 'updated',
        ])
        buf.seek(0)
        files = {'file': ('legacy.csv', buf.getvalue(), 'text/csv')}
        h = {k: v for k, v in admin_client.headers.items() if k.lower() != 'content-type'}
        r = requests.post(f'{API}/admin/orders/import', files=files, headers=h)
        assert r.status_code == 200, r.text
        d = r.json()
        # This time it should update, not create
        assert d.get('updated', 0) >= 1
        assert d.get('created', 0) == 0

    def test_import_requires_auth(self, anon_client):
        files = {'file': ('empty.csv', 'a,b\n1,2\n', 'text/csv')}
        r = requests.post(f'{API}/admin/orders/import', files=files)
        assert r.status_code == 401
