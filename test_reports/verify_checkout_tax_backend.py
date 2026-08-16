
import json
import os
import re
import sys
import traceback
from datetime import datetime, timezone

import requests
from pymongo import MongoClient

APP = '/app'
FRONTEND_ENV = Path = None

def read_env(path):
    out = {}
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            k, v = line.split('=', 1)
            out[k] = v.strip().strip('"')
    return out

frontend_env = read_env('/app/frontend/.env')
backend_env = read_env('/app/backend/.env')
BASE = frontend_env.get('REACT_APP_BACKEND_URL', 'http://localhost:8001').rstrip('/')
API = BASE + '/api'
ADMIN_TOKEN = os.environ.get('ADMIN_TOKEN', 'sess_test_1786690077689')
HEADERS = {'Authorization': f'Bearer {ADMIN_TOKEN}'}
client = MongoClient(backend_env.get('MONGO_URL', 'mongodb://localhost:27017'))
db = client[backend_env.get('DB_NAME', 'test_database')]
results = []


def record(name, ok, detail=None):
    row = {'name': name, 'ok': bool(ok), 'detail': detail or {}}
    results.append(row)
    print(('PASS' if ok else 'FAIL'), name, json.dumps(detail or {}, default=str))
    if not ok:
        raise AssertionError(name + ': ' + json.dumps(detail or {}, default=str))


def post_preview(items, discount=0):
    r = requests.post(API + '/checkout/tax-preview', json={'items': items, 'discount': discount}, timeout=20)
    return r.status_code, r.json()


def expected_tax(amount, percent, include_tax):
    return int(round(amount * percent / ((100 + percent) if include_tax else 100)))


def set_prices_include_tax(val):
    db.settings.update_one({'key': 'PRICES_INCLUDE_TAX'}, {'$set': {
        'key': 'PRICES_INCLUDE_TAX', 'value': 'true' if val else 'false', 'category': 'checkout', 'updated_at': datetime.now(timezone.utc)
    }}, upsert=True)


def set_tax_rates(rates):
    db.tax_rates.delete_many({})
    if rates:
        db.tax_rates.insert_many(rates)


def main():
    tax_snapshot = list(db.tax_rates.find({}))
    settings_snapshot = list(db.settings.find({'key': {'$in': ['PRICES_INCLUDE_TAX']}}))
    orders_before = set(o['order_number'] for o in db.orders.find({}, {'order_number': 1}))
    product_snapshots = {}
    try:
        # Choose real catalog products so category/subcategory matching is exercised with production-shaped data.
        r = requests.get(API + '/products', params={'limit': 100}, timeout=20)
        record('public products API reachable', r.status_code == 200 and r.json().get('items'), {'status': r.status_code})
        products = r.json()['items']
        sub_product = next((p for p in products if p.get('subcategory')), None)
        other_product = next((p for p in products if p.get('category') and sub_product and p.get('category') != sub_product.get('category')), None)
        plain_cat_product = next((p for p in products if p.get('category') and not p.get('subcategory')), None)
        record('found product with category/subcategory and unrelated product', bool(sub_product and other_product), {
            'sub_product': {k: sub_product.get(k) for k in ['id','category','subcategory','price']} if sub_product else None,
            'other_product': {k: other_product.get(k) for k in ['id','category','subcategory','price']} if other_product else None,
            'plain_cat_product': {k: plain_cat_product.get(k) for k in ['id','category','subcategory','price']} if plain_cat_product else None,
        })
        for p in [sub_product, other_product, plain_cat_product]:
            if p and p['id'] not in product_snapshots:
                product_snapshots[p['id']] = db.products.find_one({'id': p['id']})

        # 1) Category-specific beats global when product is in the category (including subcategory placement).
        set_prices_include_tax(True)
        set_tax_rates([
            {'id': 'qa_tax_global_9', 'name': 'QA GST 9%', 'percent': 9.0, 'scope': 'all', 'category_ids': [], 'subcategory_ids': [], 'active': True, 'order': 10, 'created_at': datetime.now(timezone.utc)},
            {'id': 'qa_tax_cat_5', 'name': 'QA CAT 5%', 'percent': 5.0, 'scope': 'specific', 'category_ids': [sub_product['category']], 'subcategory_ids': [], 'active': True, 'order': 1, 'created_at': datetime.now(timezone.utc)},
        ])
        status, data = post_preview([{'product_id': sub_product['id'], 'price': sub_product['price'], 'qty': 2}], 0)
        exp = expected_tax(sub_product['price'] * 2, 5.0, True)
        record('tax-preview uses category-specific rate instead of global', status == 200 and data['tax_breakdown'][0]['name'] == 'QA CAT 5%' and data['tax_breakdown'][0]['percent'] == 5.0 and data['tax_amount'] == exp, {'status': status, 'response': data, 'expected_tax': exp})

        # 2) Unrelated category falls back to global.
        status, data = post_preview([{'product_id': other_product['id'], 'price': other_product['price'], 'qty': 1}], 0)
        exp = expected_tax(other_product['price'], 9.0, True)
        record('tax-preview falls back to global for unrelated category', status == 200 and data['tax_breakdown'][0]['name'] == 'QA GST 9%' and data['tax_breakdown'][0]['percent'] == 9.0 and data['tax_amount'] == exp, {'status': status, 'response': data, 'expected_tax': exp})

        # 3) Subcategory-specific beats category-specific and global.
        set_tax_rates([
            {'id': 'qa_tax_global_9', 'name': 'QA GST 9%', 'percent': 9.0, 'scope': 'all', 'category_ids': [], 'subcategory_ids': [], 'active': True, 'order': 10, 'created_at': datetime.now(timezone.utc)},
            {'id': 'qa_tax_cat_5', 'name': 'QA CAT 5%', 'percent': 5.0, 'scope': 'specific', 'category_ids': [sub_product['category']], 'subcategory_ids': [], 'active': True, 'order': 1, 'created_at': datetime.now(timezone.utc)},
            {'id': 'qa_tax_sub_7', 'name': 'QA SUB 7%', 'percent': 7.0, 'scope': 'specific', 'category_ids': [], 'subcategory_ids': [sub_product['subcategory']], 'active': True, 'order': 99, 'created_at': datetime.now(timezone.utc)},
        ])
        status, data = post_preview([{'product_id': sub_product['id'], 'price': sub_product['price'], 'qty': 1}], 0)
        exp = expected_tax(sub_product['price'], 7.0, True)
        record('tax-preview priority is subcategory > category > global', status == 200 and len(data['tax_breakdown']) == 1 and data['tax_breakdown'][0]['name'] == 'QA SUB 7%' and data['tax_breakdown'][0]['percent'] == 7.0 and data['tax_amount'] == exp, {'status': status, 'response': data, 'expected_tax': exp})

        # 4) Empty tax_rates returns zero tax and empty breakdown.
        set_tax_rates([])
        status, data = post_preview([{'product_id': sub_product['id'], 'price': sub_product['price'], 'qty': 1}], 0)
        record('tax-preview returns zero/empty when no rates configured', status == 200 and data['tax_amount'] == 0 and data['tax_breakdown'] == [], {'status': status, 'response': data})

        # 5) Admin PATCH changes global rate reflected by preview (proof not hardcoded 12).
        set_tax_rates([
            {'id': 'qa_tax_global_patch', 'name': 'GST 12%', 'percent': 12.0, 'scope': 'all', 'category_ids': [], 'subcategory_ids': [], 'active': True, 'order': 1, 'created_at': datetime.now(timezone.utc)},
        ])
        patch = requests.patch(API + '/admin/tax-rates/qa_tax_global_patch', headers=HEADERS, json={'percent': 5, 'name': 'GST 5%'}, timeout=20)
        status, data = post_preview([{'product_id': other_product['id'], 'price': other_product['price'], 'qty': 1}], 0)
        exp = expected_tax(other_product['price'], 5.0, True)
        record('admin PATCH to GST 5% is reflected in tax-preview', patch.status_code == 200 and status == 200 and data['tax_breakdown'][0]['name'] == 'GST 5%' and data['tax_breakdown'][0]['percent'] == 5 and data['tax_amount'] == exp, {'patch_status': patch.status_code, 'patch_response': patch.json() if patch.content else None, 'preview': data, 'expected_tax': exp})

        # 6) prices_include_tax=false computes exclusive tax (preview amount should be added by UI/order total).
        set_prices_include_tax(False)
        set_tax_rates([
            {'id': 'qa_tax_global_10', 'name': 'QA GST 10%', 'percent': 10.0, 'scope': 'all', 'category_ids': [], 'subcategory_ids': [], 'active': True, 'order': 1, 'created_at': datetime.now(timezone.utc)},
        ])
        status, data = post_preview([{'product_id': other_product['id'], 'price': 1000, 'qty': 1}], 0)
        record('tax-preview respects prices_include_tax=false exclusive math', status == 200 and data['prices_include_tax'] is False and data['tax_amount'] == 100 and data['tax_breakdown'][0]['amount'] == 100, {'status': status, 'response': data})

        # 7) create_order total regression for both tax modes using real order endpoint, then clean up order/stock.
        def place_and_check(include_tax):
            set_prices_include_tax(include_tax)
            set_tax_rates([
                {'id': 'qa_tax_global_10', 'name': 'QA GST 10%', 'percent': 10.0, 'scope': 'all', 'category_ids': [], 'subcategory_ids': [], 'active': True, 'order': 1, 'created_at': datetime.now(timezone.utc)},
            ])
            p = other_product
            payload = {
                'items': [{'product_id': p['id'], 'name': p.get('name','QA Item'), 'image': p.get('image',''), 'price': int(p.get('price') or 0), 'qty': 1, 'product_type': p.get('product_type','physical')}],
                'shipping_address': {'full_name': 'QA Tax Tester', 'email': 'qa-tax@example.com', 'phone': '9999999999', 'line1': '1 Test St', 'city': 'Mumbai', 'state': 'MH', 'pincode': '400001', 'country': 'India'},
                'payment_provider': 'razorpay'
            }
            resp = requests.post(API + '/orders', json=payload, timeout=30)
            if resp.status_code != 200:
                return False, {'status': resp.status_code, 'body': resp.text[:500]}
            order = resp.json()['order']
            expected_order_tax = expected_tax(order['subtotal'] - order.get('discount', 0), 10.0, include_tax)
            expected_total = order['subtotal'] - order.get('discount', 0) + order.get('shipping_fee', 0) + (0 if include_tax else expected_order_tax)
            return order.get('tax') == expected_order_tax and order.get('total') == expected_total, {'order_number': order.get('order_number'), 'subtotal': order.get('subtotal'), 'shipping_fee': order.get('shipping_fee'), 'tax': order.get('tax'), 'total': order.get('total'), 'expected_tax': expected_order_tax, 'expected_total': expected_total, 'include_tax': include_tax}
        ok, detail = place_and_check(True)
        record('create_order total does not add tax again when prices_include_tax=true', ok, detail)
        ok, detail = place_and_check(False)
        record('create_order total adds tax when prices_include_tax=false', ok, detail)

    finally:
        # Clean created QA orders and restore product stock/docs touched by order endpoint.
        orders_after = list(db.orders.find({}, {'order_number': 1}))
        for o in orders_after:
            if o.get('order_number') not in orders_before:
                db.orders.delete_one({'order_number': o.get('order_number')})
        for pid, doc in product_snapshots.items():
            if doc:
                db.products.replace_one({'id': pid}, doc, upsert=True)
        db.tax_rates.delete_many({})
        if tax_snapshot:
            db.tax_rates.insert_many(tax_snapshot)
        db.settings.delete_many({'key': {'$in': ['PRICES_INCLUDE_TAX']}})
        if settings_snapshot:
            db.settings.insert_many(settings_snapshot)

    return 0

if __name__ == '__main__':
    try:
        code = main()
    except Exception:
        traceback.print_exc()
        code = 1
    out = {'ok': code == 0, 'results': results}
    with open('/app/test_reports/checkout_tax_backend_results.json', 'w') as f:
        json.dump(out, f, indent=2, default=str)
    sys.exit(code)
