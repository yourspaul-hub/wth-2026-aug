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

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Query
from fastapi.responses import PlainTextResponse
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
    SeoMeta, SeoMetaCreate,
    Redirect, RedirectCreate,
    Newsletter, NewsletterCreate,
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
    shipping_fee = 0 if (not has_physical or subtotal >= 999) else 99
    total = max(0, subtotal - discount + shipping_fee)

    order_number = _gen_order_number()
    mock_razorpay_id = f'order_mock_{uuid.uuid4().hex[:16]}'

    doc = Order(
        order_number=order_number,
        items=[OrderItem(**i) for i in fresh_items],
        shipping_address=payload.shipping_address,
        subtotal=subtotal, discount=discount, coupon_code=coupon_code,
        shipping_fee=shipping_fee, total=total,
        status='pending', payment_status='unpaid',
        razorpay_order_id=mock_razorpay_id,
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
    return {
        'order': doc,
        'razorpay': {
            'order_id': mock_razorpay_id,
            'amount': total * 100,
            'currency': 'INR',
            'key_id': 'rzp_test_MOCKED_KEY',
            'name': 'Wear The Hope',
            'description': f'Order {order_number}',
            'prefill': {
                'name': payload.shipping_address.full_name,
                'email': payload.shipping_address.email,
                'contact': payload.shipping_address.phone,
            },
            'notes': {'order_number': order_number},
            'mocked': True,
        }
    }


@api.get('/orders/{order_number}')
async def get_order(order_number: str):
    o = await db.orders.find_one({'order_number': order_number}, {'_id': 0})
    if not o:
        raise HTTPException(status_code=404, detail='Order not found')
    return o


# --- Payments (MOCK Razorpay) ---
class PaymentVerify(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: Optional[str] = None
    razorpay_signature: Optional[str] = None
    order_number: str


@api.post('/payments/razorpay/verify')
async def verify_payment(payload: PaymentVerify):
    """MOCKED — always succeeds. Real integration signs & verifies with Razorpay SDK."""
    order = await db.orders.find_one({'order_number': payload.order_number}, {'_id': 0})
    if not order:
        raise HTTPException(status_code=404, detail='Order not found')
    payment_id = payload.razorpay_payment_id or f'pay_mock_{uuid.uuid4().hex[:16]}'
    await db.orders.update_one(
        {'order_number': payload.order_number},
        {'$set': {
            'payment_status': 'paid', 'status': 'paid',
            'razorpay_payment_id': payment_id,
            'updated_at': datetime.now(timezone.utc),
        }}
    )
    # Mock: create Shiprocket shipment
    awb = f'SR{random.randint(100000000, 999999999)}'
    shipment_id = f'ship_mock_{uuid.uuid4().hex[:10]}'
    tracking_url = f'https://shiprocket.co/tracking/{awb}'
    await db.orders.update_one(
        {'order_number': payload.order_number},
        {'$set': {
            'shiprocket_awb': awb, 'shiprocket_shipment_id': shipment_id,
            'tracking_url': tracking_url,
        }}
    )
    order = await db.orders.find_one({'order_number': payload.order_number}, {'_id': 0})
    return {'ok': True, 'mocked': True, 'order': order}


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
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    updates['updated_at'] = datetime.now(timezone.utc)
    if updates:
        await db.orders.update_one({'order_number': order_number}, {'$set': updates})
    return await db.orders.find_one({'order_number': order_number}, {'_id': 0})


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
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=30)
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
