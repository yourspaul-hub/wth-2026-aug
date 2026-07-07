"""Wear The Hope backend — FastAPI + MongoDB.
All API routes prefixed with /api (per ingress rules).
Emergent Google OAuth for admin. Razorpay & Shiprocket MOCKED.
"""
import os
import logging
import uuid
import random
import string
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Query, UploadFile, File
from fastapi.responses import PlainTextResponse, StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pydantic import BaseModel

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# --- DB ---
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'wearthehope')]

# --- App ---
app = FastAPI(title='Wear The Hope API')
api = APIRouter(prefix='/api')

from models import (
    AdminUser, Category, CategoryCreate,
    Product, ProductCreate, ProductUpdate,
    Collection, CollectionCreate,
    Review, ReviewCreate, ReviewUpdate,
    Coupon, CouponCreate, CouponUpdate, CouponValidate,
    Order, OrderCreate, OrderStatusUpdate, OrderItem, ShippingAddress,
    ShippingRule, ShippingRuleCreate, TaxRate, TaxRateCreate,
    SeoMeta, SeoMetaCreate,
    Redirect, RedirectCreate,
    Newsletter, NewsletterCreate,
    EmailOutbox, AbandonedCart, AbandonedCartTrack, RefundRequest,
    Location, LocationCreate,
)
from auth import exchange_session_id, get_session_from_request, ensure_aware

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('wth')


# ================= AUTH =================
class SessionRequest(BaseModel):
    session_id: str


async def require_admin(request: Request) -> dict:
    sess = await get_session_from_request(request, db)
    if not sess:
        raise HTTPException(status_code=401, detail='Not authenticated')
    user = await db.admin_users.find_one({'user_id': sess['user_id']}, {'_id': 0})
    if not user:
        raise HTTPException(status_code=401, detail='User not found')
    return user


@api.post('/auth/session')
async def create_session(payload: SessionRequest, response: Response):
    data = await exchange_session_id(payload.session_id)
    email = data.get('email')
    name = data.get('name', email)
    picture = data.get('picture')
    session_token = data.get('session_token')
    if not email or not session_token:
        raise HTTPException(status_code=400, detail='Invalid auth response')

    # Find or create admin user
    user = await db.admin_users.find_one({'email': email}, {'_id': 0})
    if not user:
        user_id = f'user_{uuid.uuid4().hex[:12]}'
        user_doc = {
            'user_id': user_id, 'email': email, 'name': name, 'picture': picture,
            'role': 'admin', 'created_at': datetime.now(timezone.utc),
        }
        await db.admin_users.insert_one(user_doc)
        user = user_doc.copy()
        user.pop('_id', None)
    else:
        await db.admin_users.update_one({'email': email}, {'$set': {'name': name, 'picture': picture}})

    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.admin_sessions.insert_one({
        'session_token': session_token, 'user_id': user['user_id'],
        'expires_at': expires_at, 'created_at': datetime.now(timezone.utc),
    })
    response.set_cookie(
        key='session_token', value=session_token,
        httponly=True, secure=True, samesite='none', path='/',
        max_age=60 * 60 * 24 * 7,
    )
    return {'user_id': user['user_id'], 'email': user['email'], 'name': user['name'], 'picture': user.get('picture')}


@api.get('/auth/me')
async def me(user: dict = Depends(require_admin)):
    return {'user_id': user['user_id'], 'email': user['email'], 'name': user['name'], 'picture': user.get('picture'), 'role': user.get('role', 'admin')}


@api.post('/auth/logout')
async def logout(request: Request, response: Response):
    token = request.cookies.get('session_token')
    if token:
        await db.admin_sessions.delete_one({'session_token': token})
    response.delete_cookie('session_token', path='/', samesite='none', secure=True)
    return {'ok': True}


# ================= CATEGORIES =================
@api.get('/categories')
async def list_categories():
    docs = await db.categories.find({}, {'_id': 0}).sort('order', 1).to_list(200)
    return docs


@api.post('/admin/categories')
async def create_category(payload: CategoryCreate, user: dict = Depends(require_admin)):
    doc = Category(**payload.model_dump()).model_dump()
    await db.categories.insert_one(doc)
    doc.pop('_id', None)
    return doc


@api.patch('/admin/categories/{cid}')
async def update_category(cid: str, payload: dict, user: dict = Depends(require_admin)):
    await db.categories.update_one({'id': cid}, {'$set': payload})
    return await db.categories.find_one({'id': cid}, {'_id': 0})


@api.delete('/admin/categories/{cid}')
async def delete_category(cid: str, user: dict = Depends(require_admin)):
    await db.categories.delete_one({'id': cid})
    return {'ok': True}


# ================= PRODUCTS =================
@api.get('/products')
async def list_products(
    category: Optional[str] = None,
    q: Optional[str] = None,
    sort: str = 'featured',
    limit: int = 50,
    skip: int = 0,
    tag: Optional[str] = None,
):
    filt = {'active': True}
    if category:
        cat = await db.categories.find_one({'slug': category}, {'_id': 0, 'id': 1})
        if cat:
            filt['category'] = cat['id']
    if q:
        filt['$or'] = [
            {'name': {'$regex': q, '$options': 'i'}},
            {'verse': {'$regex': q, '$options': 'i'}},
            {'description': {'$regex': q, '$options': 'i'}},
        ]
    if tag:
        filt['tag'] = tag

    sort_map = {
        'price-asc': [('price', 1)],
        'price-desc': [('price', -1)],
        'rating': [('rating', -1)],
        'newest': [('created_at', -1)],
        'featured': [('created_at', -1)],
    }
    cursor = db.products.find(filt, {'_id': 0}).sort(sort_map.get(sort, sort_map['featured'])).skip(skip).limit(limit)
    items = await cursor.to_list(limit)

    # Attach category slug for FE
    cat_ids = list({p['category'] for p in items if p.get('category')})
    cat_docs = await db.categories.find({'id': {'$in': cat_ids}}, {'_id': 0, 'id': 1, 'slug': 1, 'name': 1}).to_list(200)
    cat_by_id = {c['id']: c for c in cat_docs}
    for p in items:
        c = cat_by_id.get(p.get('category'))
        p['category_slug'] = c['slug'] if c else None
        p['category_name'] = c['name'] if c else None

    total = await db.products.count_documents(filt)
    return {'items': items, 'total': total}


@api.get('/products/{pid}')
async def get_product(pid: str):
    p = await db.products.find_one({'id': pid, 'active': True}, {'_id': 0})
    if not p:
        p = await db.products.find_one({'slug': pid, 'active': True}, {'_id': 0})
    if not p:
        raise HTTPException(status_code=404, detail='Product not found')
    # Related
    related = await db.products.find({'category': p['category'], 'id': {'$ne': p['id']}, 'active': True}, {'_id': 0}).limit(4).to_list(4)
    cat = await db.categories.find_one({'id': p['category']}, {'_id': 0})
    if cat:
        p['category_slug'] = cat.get('slug')
        p['category_name'] = cat.get('name')
    return {'product': p, 'related': related}


@api.post('/admin/products')
async def create_product(payload: ProductCreate, user: dict = Depends(require_admin)):
    doc = Product(**payload.model_dump()).model_dump()
    await db.products.insert_one(doc)
    doc.pop('_id', None)
    return doc


@api.patch('/admin/products/{pid}')
async def update_product(pid: str, payload: ProductUpdate, user: dict = Depends(require_admin)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if updates:
        await db.products.update_one({'id': pid}, {'$set': updates})
    return await db.products.find_one({'id': pid}, {'_id': 0})


@api.delete('/admin/products/{pid}')
async def delete_product(pid: str, user: dict = Depends(require_admin)):
    await db.products.delete_one({'id': pid})
    return {'ok': True}


# ================= COLLECTIONS =================
@api.get('/collections')
async def list_collections(featured: Optional[bool] = None):
    filt = {'active': True}
    if featured is not None:
        filt['featured'] = featured
    return await db.collections.find(filt, {'_id': 0}).sort('order', 1).to_list(200)


@api.get('/collections/{slug}')
async def get_collection(slug: str):
    c = await db.collections.find_one({'slug': slug, 'active': True}, {'_id': 0})
    if not c:
        raise HTTPException(status_code=404, detail='Collection not found')
    prods = await db.products.find({'id': {'$in': c.get('product_ids', [])}, 'active': True}, {'_id': 0}).to_list(200)
    return {'collection': c, 'products': prods}


@api.get('/admin/collections')
async def admin_list_collections(user: dict = Depends(require_admin)):
    return await db.collections.find({}, {'_id': 0}).sort('order', 1).to_list(500)


@api.post('/admin/collections')
async def create_collection(payload: CollectionCreate, user: dict = Depends(require_admin)):
    doc = Collection(**payload.model_dump()).model_dump()
    if await db.collections.find_one({'slug': doc['slug']}):
        raise HTTPException(status_code=400, detail='Collection slug already exists')
    await db.collections.insert_one(doc)
    doc.pop('_id', None)
    return doc


@api.patch('/admin/collections/{cid}')
async def update_collection(cid: str, payload: dict, user: dict = Depends(require_admin)):
    await db.collections.update_one({'id': cid}, {'$set': payload})
    return await db.collections.find_one({'id': cid}, {'_id': 0})


@api.delete('/admin/collections/{cid}')
async def delete_collection(cid: str, user: dict = Depends(require_admin)):
    await db.collections.delete_one({'id': cid})
    return {'ok': True}


# ================= REVIEWS =================
@api.get('/reviews')
async def list_reviews(published: Optional[bool] = True):
    filt = {} if not published else {'published': True}
    docs = await db.reviews.find(filt, {'_id': 0}).sort('order', 1).to_list(200)
    return docs


@api.post('/admin/reviews')
async def create_review(payload: ReviewCreate, user: dict = Depends(require_admin)):
    doc = Review(**payload.model_dump()).model_dump()
    if not doc.get('avatar'):
        doc['avatar'] = f'https://ui-avatars.com/api/?name={doc["name"].replace(" ", "+")}&background=C4623B&color=fff'
    await db.reviews.insert_one(doc)
    doc.pop('_id', None)
    return doc


@api.patch('/admin/reviews/{rid}')
async def update_review(rid: str, payload: ReviewUpdate, user: dict = Depends(require_admin)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if updates:
        await db.reviews.update_one({'id': rid}, {'$set': updates})
    return await db.reviews.find_one({'id': rid}, {'_id': 0})


@api.delete('/admin/reviews/{rid}')
async def delete_review(rid: str, user: dict = Depends(require_admin)):
    await db.reviews.delete_one({'id': rid})
    return {'ok': True}


# ================= COUPONS =================
@api.post('/coupons/validate')
async def validate_coupon(payload: CouponValidate):
    coupon = await db.coupons.find_one({'code': payload.code.upper().strip(), 'active': True}, {'_id': 0})
    if not coupon:
        return {'valid': False, 'message': 'Invalid coupon code'}
    exp = ensure_aware(coupon.get('expires_at'))
    if exp and exp < datetime.now(timezone.utc):
        return {'valid': False, 'message': 'Coupon expired'}
    if coupon.get('usage_limit') and coupon.get('used_count', 0) >= coupon['usage_limit']:
        return {'valid': False, 'message': 'Coupon usage limit reached'}
    if payload.subtotal < coupon.get('min_subtotal', 0):
        return {'valid': False, 'message': f'Minimum order ₹{coupon["min_subtotal"]} required'}

    if coupon['kind'] == 'percent':
        discount = int(payload.subtotal * coupon['value'] / 100)
        if coupon.get('max_discount'):
            discount = min(discount, coupon['max_discount'])
    else:
        discount = int(coupon['value'])
    return {'valid': True, 'discount': discount, 'code': coupon['code'], 'kind': coupon['kind'], 'value': coupon['value'], 'message': f'Applied {coupon["code"]}'}


@api.get('/admin/coupons')
async def list_coupons(user: dict = Depends(require_admin)):
    return await db.coupons.find({}, {'_id': 0}).sort('created_at', -1).to_list(500)


@api.post('/admin/coupons')
async def create_coupon(payload: CouponCreate, user: dict = Depends(require_admin)):
    doc = Coupon(**payload.model_dump()).model_dump()
    doc['code'] = doc['code'].upper().strip()
    if await db.coupons.find_one({'code': doc['code']}):
        raise HTTPException(status_code=400, detail='Coupon code already exists')
    await db.coupons.insert_one(doc)
    doc.pop('_id', None)
    return doc


@api.patch('/admin/coupons/{cid}')
async def update_coupon(cid: str, payload: CouponUpdate, user: dict = Depends(require_admin)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if 'code' in updates:
        updates['code'] = updates['code'].upper().strip()
    if updates:
        await db.coupons.update_one({'id': cid}, {'$set': updates})
    return await db.coupons.find_one({'id': cid}, {'_id': 0})


@api.delete('/admin/coupons/{cid}')
async def delete_coupon(cid: str, user: dict = Depends(require_admin)):
    await db.coupons.delete_one({'id': cid})
    return {'ok': True}


# ================= ORDERS =================
def _gen_order_number() -> str:
    ymd = datetime.now(timezone.utc).strftime('%Y%m%d')
    rand = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
    return f'WTH-{ymd}-{rand}'


@api.post('/orders')
async def create_order(payload: OrderCreate):
    if not payload.items:
        raise HTTPException(status_code=400, detail='No items in order')

    # Recalculate subtotal server-side from DB prices; enforce inventory
    subtotal = 0
    fresh_items: List[dict] = []
    stock_updates = []  # [(product_id, variant_id_or_none, qty)]
    for it in payload.items:
        p = await db.products.find_one({'id': it.product_id, 'active': True}, {'_id': 0})
        if not p:
            raise HTTPException(status_code=400, detail=f'Product {it.product_id} not found')

        variant = None
        line_price = int(p['price'])
        avail = int(p.get('stock', 0))
        sku = p.get('sku')
        image = p.get('image')
        variant_label = None

        if it.variant_id and p.get('variants'):
            variant = next((v for v in p['variants'] if v.get('id') == it.variant_id), None)
            if not variant:
                raise HTTPException(status_code=400, detail=f'Variant {it.variant_id} not found')
            line_price = int(variant.get('price') or line_price)
            avail = int(variant.get('stock', 0))
            sku = variant.get('sku') or sku
            image = variant.get('image') or image
            attrs = variant.get('attrs') or {}
            variant_label = ', '.join(f'{k}: {v}' for k, v in attrs.items())

        if avail < it.qty:
            raise HTTPException(status_code=400, detail=f'Insufficient stock for {p["name"]}{" (" + variant_label + ")" if variant_label else ""}')

        subtotal += line_price * it.qty
        fresh_items.append({
            'product_id': p['id'],
            'variant_id': it.variant_id,
            'variant_label': variant_label,
            'name': p['name'],
            'image': image,
            'price': line_price,
            'qty': it.qty,
            'verse': p.get('verse'),
            'customization': it.customization,
            'sku': sku,
            'product_type': p.get('product_type', 'physical'),
        })
        stock_updates.append((p['id'], it.variant_id, it.qty))

    discount = 0
    coupon_code = None
    if payload.coupon_code:
        v = await validate_coupon(CouponValidate(code=payload.coupon_code, subtotal=subtotal))
        if v.get('valid'):
            discount = v['discount']
            coupon_code = v['code']

    # Digital-only orders skip shipping
    has_physical = any(fi['product_type'] == 'physical' for fi in fresh_items)

    # Shipping resolution
    shipping_fee = 0
    shipping_option_name = None
    shipping_option_id = payload.shipping_option_id
    if has_physical:
        rule = None
        if shipping_option_id:
            rule = await db.shipping_rules.find_one({'id': shipping_option_id, 'active': True}, {'_id': 0})
        if not rule:
            # Default: first active flat rule, or free if subtotal >= 999
            if subtotal >= 999:
                rule = await db.shipping_rules.find_one({'kind': 'free', 'active': True}, {'_id': 0})
            if not rule:
                rule = await db.shipping_rules.find_one({'kind': 'flat', 'active': True}, {'_id': 0}, sort=[('order', 1)])
        if rule:
            shipping_option_id = rule['id']
            shipping_option_name = rule['name']
            if rule['kind'] == 'free' or (rule.get('min_subtotal', 0) and subtotal >= rule['min_subtotal'] and rule['kind'] == 'free'):
                shipping_fee = 0
            else:
                shipping_fee = int(rule.get('price', 0))
        else:
            shipping_fee = 0 if subtotal >= 999 else 99
            shipping_option_name = 'Standard'

    # Tax calculation (per-category aware; falls back to global rate)
    tax_amount = 0
    tax_breakdown_map = {}  # {rate_id: {name, percent, amount}}
    taxable = max(0, subtotal - discount)
    if taxable > 0:
        global_rate = await db.tax_rates.find_one({'scope': 'all', 'active': True}, {'_id': 0}, sort=[('order', 1)])
        for fi in fresh_items:
            p = await db.products.find_one({'id': fi['product_id']}, {'_id': 0, 'category': 1})
            cat_id = (p or {}).get('category')
            rate = None
            if cat_id:
                rate = await db.tax_rates.find_one({'scope': 'category', 'category_id': cat_id, 'active': True}, {'_id': 0})
            if not rate:
                rate = global_rate
            if not rate:
                continue
            # Apply proportional discount to line
            line_total = fi['price'] * fi['qty']
            line_discount = int(discount * line_total / subtotal) if subtotal else 0
            line_taxable = max(0, line_total - line_discount)
            line_tax = int(round(line_taxable * rate['percent'] / 100))
            tax_amount += line_tax
            key = rate['id']
            if key not in tax_breakdown_map:
                tax_breakdown_map[key] = {'name': rate['name'], 'percent': rate['percent'], 'amount': 0}
            tax_breakdown_map[key]['amount'] += line_tax
    tax_breakdown = list(tax_breakdown_map.values())

    total = max(0, subtotal - discount + shipping_fee + tax_amount)

    order_number = _gen_order_number()
    provider = (payload.payment_provider or 'razorpay').lower()
    mock_razorpay_id = f'order_mock_{uuid.uuid4().hex[:16]}' if provider == 'razorpay' else None
    mock_stripe_id = f'cs_test_mock_{uuid.uuid4().hex[:20]}' if provider == 'stripe' else None
    mock_paypal_id = f'PAYPAL_MOCK_{uuid.uuid4().hex[:16].upper()}' if provider == 'paypal' else None

    doc = Order(
        order_number=order_number,
        items=[OrderItem(**i) for i in fresh_items],
        shipping_address=payload.shipping_address,
        subtotal=subtotal, discount=discount, coupon_code=coupon_code,
        shipping_fee=shipping_fee, shipping_option_id=shipping_option_id,
        shipping_option_name=shipping_option_name,
        tax=tax_amount, tax_breakdown=tax_breakdown,
        total=total,
        status='pending', payment_status='unpaid',
        payment_provider=provider,
        razorpay_order_id=mock_razorpay_id,
        stripe_session_id=mock_stripe_id,
        paypal_order_id=mock_paypal_id,
        notes=payload.notes,
    ).model_dump()
    await db.orders.insert_one(doc)

    # Decrement stock (product-level & variant-level)
    for pid, vid, qty in stock_updates:
        if vid:
            await db.products.update_one(
                {'id': pid, 'variants.id': vid},
                {'$inc': {'variants.$.stock': -qty}}
            )
        else:
            await db.products.update_one({'id': pid}, {'$inc': {'stock': -qty}})

    if coupon_code:
        await db.coupons.update_one({'code': coupon_code}, {'$inc': {'used_count': 1}})

    doc.pop('_id', None)

    # Queue order_placed email
    try:
        await emit_order_email(doc, 'order_placed')
    except Exception as _e:
        logger.warning('order_placed email failed: %s', _e)

    # Mark abandoned cart recovered if exists
    try:
        await db.abandoned_carts.update_one({'email': payload.shipping_address.email, 'recovered': False}, {'$set': {'recovered': True}})
    except Exception:
        pass

    # Build provider-specific mocked payment payload
    payment = {'provider': provider, 'mocked': True, 'amount': total * 100, 'currency': 'INR', 'order_number': order_number}
    if provider == 'razorpay':
        payment.update({
            'order_id': mock_razorpay_id,
            'key_id': 'rzp_test_MOCKED_KEY',
            'name': 'Wear The Hope',
            'description': f'Order {order_number}',
            'prefill': {'name': payload.shipping_address.full_name, 'email': payload.shipping_address.email, 'contact': payload.shipping_address.phone},
        })
    elif provider == 'stripe':
        payment.update({
            'session_id': mock_stripe_id,
            'publishable_key': 'pk_test_MOCKED_KEY',
            'checkout_url': f'#mock-stripe-checkout/{mock_stripe_id}',
        })
    elif provider == 'paypal':
        payment.update({
            'paypal_order_id': mock_paypal_id,
            'client_id': 'PAYPAL_CLIENT_MOCKED',
            'approve_url': f'#mock-paypal-approve/{mock_paypal_id}',
        })
    elif provider == 'cod':
        payment.update({'cod': True, 'note': 'Cash on delivery selected'})

    return {'order': doc, 'payment': payment, 'razorpay': payment if provider == 'razorpay' else None}


@api.get('/orders/{order_number}')
async def get_order(order_number: str):
    o = await db.orders.find_one({'order_number': order_number}, {'_id': 0})
    if not o:
        raise HTTPException(status_code=404, detail='Order not found')
    return o


# --- Payments (MOCK Razorpay + Stripe + PayPal) ---
class PaymentVerify(BaseModel):
    order_number: str
    provider: Optional[str] = None
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    razorpay_signature: Optional[str] = None
    stripe_session_id: Optional[str] = None
    paypal_order_id: Optional[str] = None
    paypal_capture_id: Optional[str] = None


@api.post('/payments/verify')
@api.post('/payments/razorpay/verify')
async def verify_payment(payload: PaymentVerify):
    """MOCKED payment verify — accepts any provider and marks order paid."""
    order = await db.orders.find_one({'order_number': payload.order_number}, {'_id': 0})
    if not order:
        raise HTTPException(status_code=404, detail='Order not found')
    provider = (payload.provider or order.get('payment_provider') or 'razorpay').lower()

    reference = None
    updates = {'payment_status': 'paid', 'status': 'paid', 'payment_provider': provider, 'updated_at': datetime.now(timezone.utc)}
    if provider == 'razorpay':
        reference = payload.razorpay_payment_id or f'pay_mock_{uuid.uuid4().hex[:16]}'
        updates['razorpay_payment_id'] = reference
    elif provider == 'stripe':
        reference = payload.stripe_session_id or f'pi_mock_{uuid.uuid4().hex[:16]}'
    elif provider == 'paypal':
        reference = payload.paypal_capture_id or f'CAPTURE_MOCK_{uuid.uuid4().hex[:12].upper()}'
    else:
        reference = f'{provider}_mock_{uuid.uuid4().hex[:12]}'
    updates['payment_reference'] = reference

    await db.orders.update_one({'order_number': payload.order_number}, {'$set': updates})

    # Mock Shiprocket for physical orders
    if any(it.get('product_type') == 'physical' for it in order.get('items', [])):
        awb = f'SR{random.randint(100000000, 999999999)}'
        shipment_id = f'ship_mock_{uuid.uuid4().hex[:10]}'
        tracking_url = f'https://shiprocket.co/tracking/{awb}'
        await db.orders.update_one(
            {'order_number': payload.order_number},
            {'$set': {'shiprocket_awb': awb, 'shiprocket_shipment_id': shipment_id, 'tracking_url': tracking_url}}
        )

    order = await db.orders.find_one({'order_number': payload.order_number}, {'_id': 0})
    try:
        await emit_order_email(order, 'order_paid')
    except Exception as _e:
        logger.warning('order_paid email failed: %s', _e)
    return {'ok': True, 'mocked': True, 'provider': provider, 'reference': reference, 'order': order}


# ================= SHIPPING RULES =================
@api.get('/shipping/options')
async def public_shipping_options(pincode: Optional[str] = None, subtotal: int = 0, state: Optional[str] = None):
    rules = await db.shipping_rules.find({'active': True}, {'_id': 0}).sort('order', 1).to_list(100)
    out = []
    for r in rules:
        # Filter by state / pincode if specified
        if r.get('states') and state and state not in r['states']:
            continue
        if r.get('pincodes') and pincode and pincode not in r['pincodes']:
            continue
        price = int(r.get('price', 0))
        # Free shipping rule with min_subtotal
        if r['kind'] == 'free' and subtotal < r.get('min_subtotal', 0):
            continue
        out.append({**r, 'effective_price': 0 if r['kind'] == 'free' else price})
    return {'options': out, 'mocked': True}


@api.get('/admin/shipping-rules')
async def admin_list_shipping_rules(user: dict = Depends(require_admin)):
    return await db.shipping_rules.find({}, {'_id': 0}).sort('order', 1).to_list(500)


@api.post('/admin/shipping-rules')
async def create_shipping_rule(payload: ShippingRuleCreate, user: dict = Depends(require_admin)):
    doc = ShippingRule(**payload.model_dump()).model_dump()
    await db.shipping_rules.insert_one(doc)
    doc.pop('_id', None)
    return doc


@api.patch('/admin/shipping-rules/{rid}')
async def update_shipping_rule(rid: str, payload: dict, user: dict = Depends(require_admin)):
    await db.shipping_rules.update_one({'id': rid}, {'$set': payload})
    return await db.shipping_rules.find_one({'id': rid}, {'_id': 0})


@api.delete('/admin/shipping-rules/{rid}')
async def delete_shipping_rule(rid: str, user: dict = Depends(require_admin)):
    await db.shipping_rules.delete_one({'id': rid})
    return {'ok': True}


# ================= TAX RATES =================
@api.get('/tax/rates')
async def public_tax_rates():
    return await db.tax_rates.find({'active': True}, {'_id': 0}).sort('order', 1).to_list(50)


@api.get('/admin/tax-rates')
async def admin_list_tax_rates(user: dict = Depends(require_admin)):
    return await db.tax_rates.find({}, {'_id': 0}).sort('order', 1).to_list(500)


@api.post('/admin/tax-rates')
async def create_tax_rate(payload: TaxRateCreate, user: dict = Depends(require_admin)):
    doc = TaxRate(**payload.model_dump()).model_dump()
    await db.tax_rates.insert_one(doc)
    doc.pop('_id', None)
    return doc


@api.patch('/admin/tax-rates/{tid}')
async def update_tax_rate(tid: str, payload: dict, user: dict = Depends(require_admin)):
    await db.tax_rates.update_one({'id': tid}, {'$set': payload})
    return await db.tax_rates.find_one({'id': tid}, {'_id': 0})


@api.delete('/admin/tax-rates/{tid}')
async def delete_tax_rate(tid: str, user: dict = Depends(require_admin)):
    await db.tax_rates.delete_one({'id': tid})
    return {'ok': True}


# --- Legacy alias (kept for existing frontend calls) ---
@api.post('/payments/razorpay/create-order')
async def razorpay_create_order_legacy():
    return {'mocked': True, 'note': 'Use POST /api/orders which returns mocked payment payload'}


# --- Shipping (MOCK Shiprocket) ---
class ShippingRateRequest(BaseModel):
    pincode: str
    weight: float = 0.5


@api.post('/shipping/rates')
async def shipping_rates(payload: ShippingRateRequest):
    # MOCKED
    base = 60 if payload.pincode.startswith(('40', '41', '42')) else 99  # cheaper in MH
    return {
        'mocked': True,
        'rates': [
            {'courier': 'Delhivery Surface', 'rate': base, 'eta_days': 5},
            {'courier': 'BlueDart Express', 'rate': base + 60, 'eta_days': 2},
            {'courier': 'DTDC Prime', 'rate': base + 30, 'eta_days': 3},
        ]
    }


@api.get('/shipping/track/{awb}')
async def track_shipment(awb: str):
    # MOCKED tracking timeline
    now = datetime.now(timezone.utc)
    return {
        'mocked': True,
        'awb': awb,
        'current_status': 'In Transit',
        'timeline': [
            {'status': 'Order Placed', 'at': (now - timedelta(days=3)).isoformat()},
            {'status': 'Picked Up', 'at': (now - timedelta(days=2)).isoformat()},
            {'status': 'In Transit', 'at': (now - timedelta(days=1)).isoformat()},
            {'status': 'Out for Delivery', 'at': None},
            {'status': 'Delivered', 'at': None},
        ]
    }


# --- Admin Orders ---
@api.get('/admin/orders')
async def admin_list_orders(status: Optional[str] = None, limit: int = 100, user: dict = Depends(require_admin)):
    filt = {}
    if status:
        filt['status'] = status
    docs = await db.orders.find(filt, {'_id': 0}).sort('created_at', -1).limit(limit).to_list(limit)
    return docs


@api.patch('/admin/orders/{order_number}')
async def admin_update_order(order_number: str, payload: OrderStatusUpdate, user: dict = Depends(require_admin)):
    prev = await db.orders.find_one({'order_number': order_number}, {'_id': 0, 'status': 1})
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    updates['updated_at'] = datetime.now(timezone.utc)
    if updates:
        await db.orders.update_one({'order_number': order_number}, {'$set': updates})
    updated = await db.orders.find_one({'order_number': order_number}, {'_id': 0})
    if payload.status == 'shipped' and (not prev or prev.get('status') != 'shipped'):
        try:
            await emit_order_email(updated, 'order_shipped')
        except Exception as _e:
            logger.warning('order_shipped email failed: %s', _e)
    return updated


# ================= SEO =================
@api.get('/seo/meta')
async def get_seo_meta(path: str):
    doc = await db.seo_meta.find_one({'path': path}, {'_id': 0})
    if not doc:
        # Fallback to root
        doc = await db.seo_meta.find_one({'path': '/'}, {'_id': 0})
    return doc or {}


@api.get('/admin/seo')
async def list_seo(user: dict = Depends(require_admin)):
    return await db.seo_meta.find({}, {'_id': 0}).sort('path', 1).to_list(500)


@api.post('/admin/seo')
async def create_seo(payload: SeoMetaCreate, user: dict = Depends(require_admin)):
    existing = await db.seo_meta.find_one({'path': payload.path})
    if existing:
        raise HTTPException(status_code=400, detail='Path already exists — use PATCH instead')
    doc = SeoMeta(**payload.model_dump()).model_dump()
    await db.seo_meta.insert_one(doc)
    doc.pop('_id', None)
    return doc


@api.patch('/admin/seo/{sid}')
async def update_seo(sid: str, payload: dict, user: dict = Depends(require_admin)):
    payload['updated_at'] = datetime.now(timezone.utc)
    await db.seo_meta.update_one({'id': sid}, {'$set': payload})
    return await db.seo_meta.find_one({'id': sid}, {'_id': 0})


@api.delete('/admin/seo/{sid}')
async def delete_seo(sid: str, user: dict = Depends(require_admin)):
    await db.seo_meta.delete_one({'id': sid})
    return {'ok': True}


# --- Redirects ---
@api.get('/redirects')
async def public_redirects():
    docs = await db.redirects.find({'active': True}, {'_id': 0}).to_list(500)
    return docs


@api.get('/admin/redirects')
async def admin_list_redirects(user: dict = Depends(require_admin)):
    return await db.redirects.find({}, {'_id': 0}).to_list(500)


@api.post('/admin/redirects')
async def create_redirect(payload: RedirectCreate, user: dict = Depends(require_admin)):
    doc = Redirect(**payload.model_dump()).model_dump()
    await db.redirects.insert_one(doc)
    doc.pop('_id', None)
    return doc


@api.patch('/admin/redirects/{rid}')
async def update_redirect(rid: str, payload: dict, user: dict = Depends(require_admin)):
    await db.redirects.update_one({'id': rid}, {'$set': payload})
    return await db.redirects.find_one({'id': rid}, {'_id': 0})


@api.delete('/admin/redirects/{rid}')
async def delete_redirect(rid: str, user: dict = Depends(require_admin)):
    await db.redirects.delete_one({'id': rid})
    return {'ok': True}


# --- Sitemap & Robots ---
def _site_base(request: Request) -> str:
    origin = request.headers.get('x-forwarded-proto', 'https') + '://' + request.headers.get('host', 'wearthehope.com')
    return origin


@app.get('/sitemap.xml', response_class=PlainTextResponse)
@api.get('/sitemap.xml', response_class=PlainTextResponse)
async def sitemap(request: Request):
    base = _site_base(request)
    urls = ['/', '/shop', '/about', '/contact']
    # add categories
    async for c in db.categories.find({'coming_soon': {'$ne': True}}, {'_id': 0, 'slug': 1}):
        urls.append(f'/shop/{c["slug"]}')
    # products
    async for p in db.products.find({'active': True}, {'_id': 0, 'id': 1}):
        urls.append(f'/product/{p["id"]}')
    xml = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in urls:
        xml.append(f'<url><loc>{base}{u}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>')
    xml.append('</urlset>')
    return PlainTextResponse('\n'.join(xml), media_type='application/xml')


@app.get('/robots.txt', response_class=PlainTextResponse)
@api.get('/robots.txt', response_class=PlainTextResponse)
async def robots(request: Request):
    base = _site_base(request)
    body = f"""User-agent: *
Allow: /
Disallow: /admin
Disallow: /checkout
Disallow: /order/

Sitemap: {base}/api/sitemap.xml
"""
    return PlainTextResponse(body, media_type='text/plain')


# ================= EMAIL OUTBOX (Phase C) =================
# All emails are MOCKED — written to `email_outbox` collection with status='mocked'.
# To go live, integrate Gmail SMTP/OAuth and change `queue_email` to dispatch instead.

BRAND_COLOR = '#B4593F'
BRAND_BG = '#FDF3EB'


def _email_shell(subject: str, body_html: str) -> str:
    return f"""<!doctype html><html><head><meta charset='utf-8'><title>{subject}</title></head>
<body style='margin:0;padding:0;background:{BRAND_BG};font-family:Georgia,serif;color:#1A1A1A;'>
  <div style='max-width:600px;margin:0 auto;background:#fff;padding:40px;border:1px solid #EBD9CE;'>
    <div style='text-align:center;letter-spacing:6px;font-size:14px;color:{BRAND_COLOR};margin-bottom:24px;'>WEAR THE HOPE</div>
    {body_html}
    <hr style='border:0;border-top:1px solid #EBD9CE;margin:30px 0'/>
    <div style='font-size:11px;color:#8a8a8a;text-align:center;line-height:1.6'>
      Wear The Hope · Mumbai, India<br>
      Questions? Reply to this email or visit wearthehope.com/contact
    </div>
  </div>
</body></html>"""


async def queue_email(*, to: str, subject: str, template: str, body_html: str, context: dict = None, order_number: str = None):
    doc = EmailOutbox(
        to=to, subject=subject, template=template,
        html=_email_shell(subject, body_html),
        context=context or {}, order_number=order_number,
        status='mocked', provider='mock',
    ).model_dump()
    await db.email_outbox.insert_one(doc)
    return doc


def _order_summary_html(o: dict) -> str:
    rows = ''
    for it in o.get('items', []):
        vlabel = f" ({it['variant_label']})" if it.get('variant_label') else ''
        rows += f"<tr><td style='padding:8px;border-bottom:1px solid #EBD9CE'>{it['name']}{vlabel}<br><span style='color:#8a8a8a;font-size:11px'>Qty {it['qty']}</span></td><td style='padding:8px;border-bottom:1px solid #EBD9CE;text-align:right'>&#8377;{it['price'] * it['qty']:,}</td></tr>"
    return f"<table width='100%' cellpadding='0' cellspacing='0' style='font-size:14px'>{rows}<tr><td style='padding:12px 8px;border-top:2px solid #1A1A1A;font-weight:bold'>Total</td><td style='padding:12px 8px;border-top:2px solid #1A1A1A;text-align:right;font-weight:bold;color:{BRAND_COLOR}'>&#8377;{o['total']:,}</td></tr></table>"


async def emit_order_email(order: dict, template: str):
    name = order['shipping_address']['full_name']
    to = order['shipping_address']['email']
    on = order['order_number']
    body_map = {
        'order_placed': (f"Order confirmation · {on}", f"<h2 style='font-family:Georgia,serif;font-size:24px'>Thank you, {name}!</h2><p style='color:#555;line-height:1.6'>We've received your order <strong>{on}</strong>.</p>" + _order_summary_html(order)),
        'order_paid': (f"Payment received · {on}", f"<h2 style='font-family:Georgia,serif;font-size:24px'>Payment confirmed</h2><p style='color:#555;line-height:1.6'>Payment received for order <strong>{on}</strong> via {order.get('payment_provider','').title()}.</p>" + _order_summary_html(order)),
        'order_shipped': (f"Your order is on the way · {on}", f"<h2 style='font-family:Georgia,serif;font-size:24px'>{name}, your order is shipped!</h2><p style='color:#555;line-height:1.6'>AWB: <strong>{order.get('shiprocket_awb', '—')}</strong></p><p><a href='{order.get('tracking_url', '#')}' style='display:inline-block;padding:12px 24px;background:{BRAND_COLOR};color:#fff;text-decoration:none;border-radius:999px;font-size:12px;letter-spacing:2px'>TRACK PARCEL</a></p>"),
        'order_refunded': (f"Refund processed · {on}", f"<h2 style='font-family:Georgia,serif;font-size:24px'>Refund initiated</h2><p style='color:#555;line-height:1.6'>We've processed a refund of <strong>&#8377;{order['total']:,}</strong> for order {on}. It should reflect in 5–7 business days.</p>"),
    }
    subject, body = body_map.get(template, (f"Order update · {on}", ""))
    await queue_email(to=to, subject=subject, template=template, body_html=body, context={'order_number': on}, order_number=on)


# ================= REFUND (Admin) =================
@api.post('/admin/orders/{order_number}/refund')
async def refund_order(order_number: str, payload: RefundRequest, user: dict = Depends(require_admin)):
    o = await db.orders.find_one({'order_number': order_number}, {'_id': 0})
    if not o:
        raise HTTPException(status_code=404, detail='Order not found')
    if o.get('payment_status') != 'paid':
        raise HTTPException(status_code=400, detail='Only paid orders can be refunded')
    reason = payload.reason or 'N/A'
    updates = {
        'status': 'refunded', 'payment_status': 'refunded',
        'notes': (o.get('notes') or '') + f"\n[REFUND] reason: {reason}",
        'updated_at': datetime.now(timezone.utc),
    }
    await db.orders.update_one({'order_number': order_number}, {'$set': updates})
    # Restock items
    for it in o.get('items', []):
        if it.get('variant_id'):
            await db.products.update_one({'id': it['product_id'], 'variants.id': it['variant_id']}, {'$inc': {'variants.$.stock': it['qty']}})
        else:
            await db.products.update_one({'id': it['product_id']}, {'$inc': {'stock': it['qty']}})
    updated = await db.orders.find_one({'order_number': order_number}, {'_id': 0})
    await emit_order_email(updated, 'order_refunded')
    return {'ok': True, 'mocked': True, 'order': updated}


# ================= INVOICE =================
from fastapi.responses import HTMLResponse


def _invoice_html(order: dict) -> str:
    a = order['shipping_address']
    rows = ''
    for it in order['items']:
        line = it['price'] * it['qty']
        vlabel = f" ({it['variant_label']})" if it.get('variant_label') else ''
        cust = f"<br><span style='color:#8a8a8a;font-size:11px'>engrave: {it['customization']}</span>" if it.get('customization') else ''
        rows += f"<tr><td style='padding:10px;border-bottom:1px solid #EBD9CE'>{it['name']}{vlabel}{cust}<br><span style='color:#8a8a8a;font-size:11px'>SKU {it.get('sku') or '—'}</span></td><td style='padding:10px;border-bottom:1px solid #EBD9CE;text-align:center'>{it['qty']}</td><td style='padding:10px;border-bottom:1px solid #EBD9CE;text-align:right'>&#8377;{it['price']:,}</td><td style='padding:10px;border-bottom:1px solid #EBD9CE;text-align:right'>&#8377;{line:,}</td></tr>"
    tax_rows = ''
    for t in (order.get('tax_breakdown') or []):
        tax_rows += f"<tr><td colspan='3' style='padding:4px 10px;color:#555;text-align:right'>{t['name']} ({t['percent']}%)</td><td style='padding:4px 10px;text-align:right'>&#8377;{t['amount']:,}</td></tr>"
    created = order['created_at']
    if isinstance(created, datetime):
        created = created.strftime('%d %b %Y, %I:%M %p')
    disc_row = ''
    if order.get('discount'):
        disc_row = f"<tr><td colspan='3' style='padding:4px 10px;color:{BRAND_COLOR};text-align:right'>Discount ({order.get('coupon_code') or ''})</td><td style='padding:4px 10px;text-align:right;color:{BRAND_COLOR}'>-&#8377;{order['discount']:,}</td></tr>"
    ship_price = 'Free' if not order.get('shipping_fee') else f"&#8377;{order['shipping_fee']}"
    ref = order.get('payment_reference') or order.get('razorpay_payment_id') or ''
    ref_html = f"<br>Ref: {ref}" if ref else ''
    return f"""<!doctype html><html><head><meta charset='utf-8'><title>Invoice {order['order_number']}</title>
<style>
  @media print {{ .no-print {{ display:none }} body {{ background:#fff }} }}
  body {{ font-family: Georgia, serif; background:{BRAND_BG}; color:#1A1A1A; padding:40px; margin:0 }}
  .paper {{ max-width:820px; margin:0 auto; background:#fff; padding:56px 48px; border:1px solid #EBD9CE }}
  h1 {{ font-size:32px; margin:0 }}
  table {{ width:100%; border-collapse:collapse; font-size:14px }}
  th {{ text-align:left; padding:10px; background:{BRAND_BG}; color:#555; font-weight:normal; text-transform:uppercase; letter-spacing:2px; font-size:11px }}
  .brand {{ letter-spacing:6px; font-size:14px; color:{BRAND_COLOR} }}
  .btn {{ display:inline-block; padding:12px 24px; background:{BRAND_COLOR}; color:#fff; text-decoration:none; border-radius:999px; font-size:12px; letter-spacing:2px; cursor:pointer; border:none }}
</style></head>
<body>
  <div class='paper'>
    <div style='display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px'>
      <div>
        <div class='brand'>WEAR THE HOPE</div>
        <div style='color:#8a8a8a;font-size:12px;margin-top:4px'>Bandra West, Mumbai 400050 · India</div>
        <div style='color:#8a8a8a;font-size:12px'>GSTIN 27XXXXXXXXXXXZ0</div>
      </div>
      <div style='text-align:right'>
        <h1>Invoice</h1>
        <div style='color:#555;margin-top:6px'>#{order['order_number']}</div>
        <div style='color:#8a8a8a;font-size:12px'>{created}</div>
      </div>
    </div>
    <div style='display:flex;justify-content:space-between;gap:24px;margin-bottom:32px'>
      <div><div style='font-size:11px;text-transform:uppercase;letter-spacing:2px;color:{BRAND_COLOR};margin-bottom:6px'>Bill To</div>
        <div>{a['full_name']}<br>{a['line1']}{', ' + a['line2'] if a.get('line2') else ''}<br>{a['city']}, {a['state']} {a['pincode']}<br>{a['country']}<br>{a['email']} · {a['phone']}</div>
      </div>
      <div><div style='font-size:11px;text-transform:uppercase;letter-spacing:2px;color:{BRAND_COLOR};margin-bottom:6px'>Payment</div>
        <div>{order.get('payment_provider','').title()}<br>Status: <strong>{order.get('payment_status','').upper()}</strong>{ref_html}</div>
      </div>
    </div>
    <table>
      <thead><tr><th>Item</th><th style='text-align:center'>Qty</th><th style='text-align:right'>Price</th><th style='text-align:right'>Line Total</th></tr></thead>
      <tbody>{rows}
        <tr><td colspan='3' style='padding:10px;color:#555;text-align:right;border-top:2px solid #1A1A1A'>Subtotal</td><td style='padding:10px;text-align:right;border-top:2px solid #1A1A1A'>&#8377;{order['subtotal']:,}</td></tr>
        {disc_row}
        <tr><td colspan='3' style='padding:4px 10px;color:#555;text-align:right'>Shipping</td><td style='padding:4px 10px;text-align:right'>{ship_price}</td></tr>
        {tax_rows}
        <tr><td colspan='3' style='padding:14px 10px;font-weight:bold;text-align:right;border-top:2px solid #1A1A1A;font-size:16px'>Total</td><td style='padding:14px 10px;font-weight:bold;text-align:right;border-top:2px solid #1A1A1A;color:{BRAND_COLOR};font-size:16px'>&#8377;{order['total']:,}</td></tr>
      </tbody>
    </table>
    <div style='margin-top:40px;color:#8a8a8a;font-size:12px;text-align:center;line-height:1.7'>
      Thank you for shopping with Wear The Hope.<br>
      For queries email hello@wearthehope.com or call +91 90043 73305.
    </div>
    <div class='no-print' style='text-align:center;margin-top:32px'>
      <button onclick='window.print()' class='btn'>Print / Save as PDF</button>
    </div>
  </div>
</body></html>"""


@api.get('/invoices/{order_number}', response_class=HTMLResponse)
async def get_invoice(order_number: str):
    o = await db.orders.find_one({'order_number': order_number}, {'_id': 0})
    if not o:
        raise HTTPException(status_code=404, detail='Order not found')
    return HTMLResponse(_invoice_html(o))


# ================= ABANDONED CARTS =================
@api.post('/cart/track')
async def track_cart(payload: AbandonedCartTrack):
    existing = await db.abandoned_carts.find_one({'email': payload.email, 'recovered': False}, {'_id': 0})
    now = datetime.now(timezone.utc)
    if existing:
        await db.abandoned_carts.update_one({'id': existing['id']}, {'$set': {'items': payload.items, 'subtotal': payload.subtotal, 'name': payload.name, 'updated_at': now}})
        return {'ok': True, 'id': existing['id']}
    doc = AbandonedCart(email=payload.email, name=payload.name, items=payload.items, subtotal=payload.subtotal).model_dump()
    await db.abandoned_carts.insert_one(doc)
    return {'ok': True, 'id': doc['id']}


@api.get('/admin/abandoned-carts')
async def list_abandoned_carts(user: dict = Depends(require_admin)):
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=30)
    stale = await db.abandoned_carts.find({'recovered': False, 'updated_at': {'$lt': cutoff}}, {'_id': 0}).sort('updated_at', -1).to_list(500)
    all_carts = await db.abandoned_carts.find({}, {'_id': 0}).sort('updated_at', -1).to_list(500)
    return {'stale': stale, 'all': all_carts}


@api.post('/admin/abandoned-carts/{cid}/send-recovery')
async def send_recovery(cid: str, user: dict = Depends(require_admin)):
    c = await db.abandoned_carts.find_one({'id': cid}, {'_id': 0})
    if not c:
        raise HTTPException(status_code=404, detail='Cart not found')
    items_html = ''.join(f"<tr><td style='padding:6px 8px'>{it.get('name', 'Item')}</td><td style='padding:6px 8px;text-align:right'>&#8377;{(it.get('price', 0) * it.get('qty', 1)):,}</td></tr>" for it in c.get('items', []))
    body = f"<h2 style='font-family:Georgia,serif;font-size:24px'>Hey {c.get('name') or 'friend'}, you left something behind ✨</h2><p style='color:#555;line-height:1.6'>We saved your bag for you. Complete your order and let hope travel with you.</p><table width='100%' style='font-size:14px;margin:12px 0'>{items_html}</table><p><a href='#' style='display:inline-block;padding:12px 24px;background:{BRAND_COLOR};color:#fff;text-decoration:none;border-radius:999px;font-size:12px;letter-spacing:2px'>COMPLETE MY ORDER</a></p><p style='font-size:11px;color:#8a8a8a'>Or use code <strong>COMEBACK10</strong> for 10% off — valid 48 hours.</p>"
    await queue_email(to=c['email'], subject='You left hope in your bag', template='abandoned_cart', body_html=body, context={'cart_id': cid})
    await db.abandoned_carts.update_one({'id': cid}, {'$set': {'recovery_email_sent': True}})
    return {'ok': True, 'mocked': True}


# ================= EMAIL OUTBOX (Admin) =================
@api.get('/admin/emails')
async def list_emails(template: Optional[str] = None, user: dict = Depends(require_admin)):
    filt = {}
    if template:
        filt['template'] = template
    return await db.email_outbox.find(filt, {'_id': 0}).sort('created_at', -1).limit(300).to_list(300)


@api.get('/admin/emails/{eid}')
async def get_email(eid: str, user: dict = Depends(require_admin)):
    e = await db.email_outbox.find_one({'id': eid}, {'_id': 0})
    if not e:
        raise HTTPException(status_code=404, detail='Email not found')
    return e




# ================= NEWSLETTER =================
@api.post('/newsletter/subscribe')
async def newsletter_subscribe(payload: NewsletterCreate):
    exists = await db.newsletter.find_one({'email': payload.email})
    if exists:
        return {'ok': True, 'already': True}
    doc = Newsletter(email=payload.email).model_dump()
    await db.newsletter.insert_one(doc)
    doc.pop('_id', None)
    return {'ok': True, 'already': False}


@api.get('/admin/newsletter')
async def list_newsletter(user: dict = Depends(require_admin)):
    return await db.newsletter.find({}, {'_id': 0}).sort('created_at', -1).to_list(1000)


# ================= ADMIN STATS =================
@api.get('/admin/stats')
async def admin_stats(user: dict = Depends(require_admin)):
    total_orders = await db.orders.count_documents({})
    paid_orders = await db.orders.count_documents({'payment_status': 'paid'})
    pending = await db.orders.count_documents({'status': 'pending'})
    revenue_pipeline = [
        {'$match': {'payment_status': 'paid'}},
        {'$group': {'_id': None, 'total': {'$sum': '$total'}}},
    ]
    revenue_docs = await db.orders.aggregate(revenue_pipeline).to_list(1)
    revenue = revenue_docs[0]['total'] if revenue_docs else 0

    recent_orders = await db.orders.find({}, {'_id': 0}).sort('created_at', -1).limit(5).to_list(5)
    products = await db.products.count_documents({'active': True})
    subs = await db.newsletter.count_documents({})
    coupons = await db.coupons.count_documents({'active': True})
    reviews = await db.reviews.count_documents({'published': True})
    return {
        'total_orders': total_orders,
        'paid_orders': paid_orders,
        'pending_orders': pending,
        'revenue': revenue,
        'recent_orders': recent_orders,
        'products': products,
        'newsletter_subscribers': subs,
        'active_coupons': coupons,
        'published_reviews': reviews,
    }


# ================= HEALTH =================
@api.get('/')
async def root():
    return {'ok': True, 'service': 'wear-the-hope', 'time': datetime.now(timezone.utc).isoformat()}


# ================= LOCATIONS (Contact / Stores) =================
@api.get('/locations')
async def public_locations():
    return await db.locations.find({'active': True}, {'_id': 0}).sort('order', 1).to_list(100)


@api.get('/admin/locations')
async def admin_list_locations(user: dict = Depends(require_admin)):
    return await db.locations.find({}, {'_id': 0}).sort('order', 1).to_list(500)


@api.post('/admin/locations')
async def create_location(payload: LocationCreate, user: dict = Depends(require_admin)):
    doc = Location(**payload.model_dump()).model_dump()
    await db.locations.insert_one(doc)
    doc.pop('_id', None)
    return doc


@api.patch('/admin/locations/{lid}')
async def update_location(lid: str, payload: dict, user: dict = Depends(require_admin)):
    payload.pop('id', None)
    payload.pop('_id', None)
    await db.locations.update_one({'id': lid}, {'$set': payload})
    return await db.locations.find_one({'id': lid}, {'_id': 0})


@api.delete('/admin/locations/{lid}')
async def delete_location(lid: str, user: dict = Depends(require_admin)):
    await db.locations.delete_one({'id': lid})
    return {'ok': True}


# ================= BULK PRODUCT UPLOAD =================
import csv
import io

PRODUCT_TEMPLATE_COLUMNS = [
    'sku', 'slug', 'name', 'category_slug', 'price', 'original_price',
    'stock', 'description', 'image', 'tag', 'product_type', 'active',
    'personalization_enabled', 'personalization_label',
]

_SAMPLE_ROWS = [
    ['WTH-CAP-001', 'faith-cap-blessed', 'Faith Cap — Blessed', 'head-gear', '899', '1199', '25', 'Embroidered faith cap in soft cotton twill.', 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800', 'bestseller', 'physical', 'true', 'false', ''],
    ['WTH-TEE-001', 'psalm-46-tee', 'Psalm 46 Tee', 'clothing', '699', '899', '40', '100% cotton, unisex fit.', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800', 'trending', 'physical', 'true', 'false', ''],
    ['WTH-MUG-001', 'grace-mug', 'Grace Ceramic Mug', 'drinkware', '449', '', '60', 'Microwave & dishwasher safe.', 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800', 'new', 'physical', 'true', 'true', 'Engrave name (max 12 chars)'],
]


@api.get('/admin/products/template.csv')
async def download_product_template(user: dict = Depends(require_admin)):
    # Fetch live category slugs so instructions match reality
    cat_slugs = await db.categories.distinct('slug')
    slugs_str = ' / '.join(sorted(cat_slugs)) if cat_slugs else 'drinkware / clothing / bags / head-gear / boards / tags / badges-magnets / stickers'
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(PRODUCT_TEMPLATE_COLUMNS)
    for row in _SAMPLE_ROWS:
        writer.writerow(row)
    writer.writerow([])
    writer.writerow(['# INSTRUCTIONS'])
    writer.writerow(['# Required: sku (or slug), name, category_slug, price'])
    writer.writerow([f'# category_slug must match one of: {slugs_str}'])
    writer.writerow(['# active/personalization_enabled: true/false or 1/0'])
    writer.writerow(['# Rows matching an existing sku OR slug will be UPDATED; others CREATED.'])
    writer.writerow(['# Remove the sample rows and instruction lines before uploading.'])
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type='text/csv',
        headers={'Content-Disposition': 'attachment; filename="wth-products-template.csv"'},
    )


def _parse_bool(v):
    if isinstance(v, bool):
        return v
    if v is None:
        return None
    s = str(v).strip().lower()
    if s in ('true', '1', 'yes', 'y'):
        return True
    if s in ('false', '0', 'no', 'n', ''):
        return False
    return None


def _parse_int(v, default=None):
    if v is None or v == '':
        return default
    try:
        return int(float(str(v).replace(',', '').strip()))
    except (ValueError, TypeError):
        return default


async def _read_upload_rows(file: UploadFile):
    """Return list-of-dicts from CSV or XLSX. Raises HTTPException on parse errors."""
    filename = (file.filename or '').lower()
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail='Empty file')

    rows = []
    if filename.endswith('.xlsx') or filename.endswith('.xls'):
        try:
            from openpyxl import load_workbook
            wb = load_workbook(io.BytesIO(data), data_only=True)
            ws = wb.active
            it = ws.iter_rows(values_only=True)
            header = [str(c).strip() if c is not None else '' for c in next(it, [])]
            for r in it:
                if not r or all(c is None or str(c).strip() == '' for c in r):
                    continue
                first = str(r[0]).strip() if r[0] is not None else ''
                if first.startswith('#'):
                    continue
                rows.append({header[i]: r[i] for i in range(min(len(header), len(r)))})
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=f'Could not parse Excel file: {e}')
    else:  # csv (also handles Google Sheets exported as .csv)
        try:
            text = data.decode('utf-8-sig', errors='replace')
            reader = csv.DictReader(io.StringIO(text))
            for r in reader:
                first_key = next(iter(r), '')
                first_val = (r.get(first_key) or '').strip() if isinstance(r.get(first_key), str) else str(r.get(first_key) or '').strip()
                if first_val.startswith('#'):
                    continue
                if all((v is None or str(v).strip() == '') for v in r.values()):
                    continue
                rows.append(r)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=f'Could not parse CSV file: {e}')
    return rows


@api.post('/admin/products/bulk')
async def bulk_upload_products(file: UploadFile = File(...), user: dict = Depends(require_admin)):
    rows = await _read_upload_rows(file)
    if not rows:
        raise HTTPException(status_code=400, detail='No data rows found')

    # Preload categories for slug -> id map
    cats = await db.categories.find({}, {'_id': 0, 'id': 1, 'slug': 1}).to_list(500)
    cat_map = {c['slug']: c['id'] for c in cats}

    created = 0
    updated = 0
    errors = []

    for idx, row in enumerate(rows, start=2):  # start=2 accounts for header row
        # Normalize keys (strip)
        row = {(k or '').strip(): v for k, v in row.items()}
        sku = (row.get('sku') or '').strip() or None
        slug = (row.get('slug') or '').strip() or None
        name = (row.get('name') or '').strip() or None
        cat_slug = (row.get('category_slug') or '').strip() or None
        price = _parse_int(row.get('price'))

        if not (sku or slug):
            errors.append({'row': idx, 'error': 'Missing sku and slug — at least one is required'})
            continue
        if not name:
            errors.append({'row': idx, 'error': 'Missing name'})
            continue
        if not cat_slug or cat_slug not in cat_map:
            errors.append({'row': idx, 'error': f'Unknown category_slug: {cat_slug or "(empty)"}'})
            continue
        if price is None or price <= 0:
            errors.append({'row': idx, 'error': 'Invalid price'})
            continue

        # Find existing by sku OR slug
        existing = None
        if sku:
            existing = await db.products.find_one({'sku': sku}, {'_id': 0})
        if not existing and slug:
            existing = await db.products.find_one({'slug': slug}, {'_id': 0})

        auto_slug = slug or (sku.lower().replace('_', '-') if sku else name.lower().replace(' ', '-'))

        payload = {
            'name': name,
            'slug': auto_slug,
            'category': cat_map[cat_slug],
            'price': price,
            'original_price': _parse_int(row.get('original_price'), default=price),
            'stock': _parse_int(row.get('stock'), default=0),
            'description': (row.get('description') or '').strip(),
            'image': (row.get('image') or '').strip() or 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800',
            'tag': (row.get('tag') or '').strip(),
            'product_type': (row.get('product_type') or 'physical').strip() or 'physical',
            'active': _parse_bool(row.get('active')) if row.get('active') not in (None, '') else True,
            'personalization_enabled': _parse_bool(row.get('personalization_enabled')) or False,
        }
        pl = (row.get('personalization_label') or '').strip()
        if pl:
            payload['personalization_label'] = pl
        if sku:
            payload['sku'] = sku

        try:
            if existing:
                await db.products.update_one({'id': existing['id']}, {'$set': payload})
                updated += 1
            else:
                doc = Product(**payload).model_dump()
                await db.products.insert_one(doc)
                created += 1
        except Exception as e:
            errors.append({'row': idx, 'error': f'DB error: {str(e)[:200]}'})

    return {
        'ok': True,
        'total_rows': len(rows),
        'created': created,
        'updated': updated,
        'errors': errors,
    }


# --- Mount ---
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=['*'],
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.on_event('startup')
async def startup_event():
    logger.info('Starting Wear The Hope backend')
    # Seed
    from seed import seed_all
    try:
        await seed_all(db)
        logger.info('Seed complete')
    except Exception as e:
        logger.exception('Seed failed: %s', e)
    # Indexes
    await db.admin_sessions.create_index('session_token', unique=True)
    await db.admin_users.create_index('email', unique=True)
    await db.products.create_index('id', unique=True)
    await db.products.create_index('slug')
    await db.categories.create_index('slug', unique=True)
    await db.orders.create_index('order_number', unique=True)
    await db.coupons.create_index('code', unique=True)
    await db.reviews.create_index('id', unique=True)
    await db.seo_meta.create_index('path', unique=True)
    await db.newsletter.create_index('email', unique=True)
    await db.collections.create_index('slug', unique=True)


@app.on_event('shutdown')
async def shutdown_event():
    client.close()
