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
from pydantic import BaseModel, EmailStr

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# --- DB ---
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'wearthehope')]

# GridFS bucket for stored images (persistent across restarts, avoids ephemeral k8s disk)
from motor.motor_asyncio import AsyncIOMotorGridFSBucket
gridfs_bucket = AsyncIOMotorGridFSBucket(db, bucket_name='images')

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
    BlogPost, BlogPostCreate,
    InstagramPost, InstagramPostCreate,
    AnalyticsEvent, AnalyticsEventCreate,
    SheetsImportRequest,
    QRReviewToken, QRTokenCreate, QRReviewSubmission,
    GoogleBusinessLocation, GoogleBusinessLocationCreate,
    Setting, SettingUpdate,
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
    if user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail='Admin role required for this action')
    return user


def require_role(*roles: str):
    """Return a dependency that allows any of the given roles."""
    role_set = set(roles)

    async def _dep(request: Request) -> dict:
        sess = await get_session_from_request(request, db)
        if not sess:
            raise HTTPException(status_code=401, detail='Not authenticated')
        user = await db.admin_users.find_one({'user_id': sess['user_id']}, {'_id': 0})
        if not user:
            raise HTTPException(status_code=401, detail='User not found')
        if user.get('role') not in role_set:
            raise HTTPException(status_code=403, detail=f'Requires one of: {", ".join(sorted(role_set))}')
        return user

    return _dep


require_staff = require_role('admin', 'store_manager', 'blogger')
require_store = require_role('admin', 'store_manager')
require_blog = require_role('admin', 'blogger')


@api.post('/auth/session')
async def create_session(payload: SessionRequest, response: Response):
    data = await exchange_session_id(payload.session_id)
    email = data.get('email')
    name = data.get('name', email)
    picture = data.get('picture')
    session_token = data.get('session_token')
    if not email or not session_token:
        raise HTTPException(status_code=400, detail='Invalid auth response')

    # Find or invite: first user auto-becomes admin (bootstrap). New emails must be pre-invited.
    user = await db.admin_users.find_one({'email': email}, {'_id': 0})
    if not user:
        existing_count = await db.admin_users.count_documents({})
        if existing_count == 0:
            # Bootstrap the very first admin
            user_id = f'user_{uuid.uuid4().hex[:12]}'
            user_doc = {
                'user_id': user_id, 'email': email, 'name': name, 'picture': picture,
                'role': 'admin', 'created_at': datetime.now(timezone.utc),
            }
            await db.admin_users.insert_one(user_doc)
            user = user_doc.copy()
            user.pop('_id', None)
        else:
            raise HTTPException(status_code=403, detail='This email is not invited. Ask an admin to add you under Admin → Users.')
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
async def me(user: dict = Depends(require_staff)):
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
async def create_category(payload: CategoryCreate, user: dict = Depends(require_store)):
    if await db.categories.find_one({'slug': payload.slug}):
        raise HTTPException(status_code=400, detail='A category with that slug already exists')
    doc = Category(**payload.model_dump()).model_dump()
    await db.categories.insert_one(doc)
    doc.pop('_id', None)
    return doc


@api.patch('/admin/categories/{cid}')
async def update_category(cid: str, payload: dict, user: dict = Depends(require_store)):
    payload.pop('id', None)
    payload.pop('_id', None)
    if 'slug' in payload:
        clash = await db.categories.find_one({'slug': payload['slug'], 'id': {'$ne': cid}})
        if clash:
            raise HTTPException(status_code=400, detail='Another category already uses that slug')
    await db.categories.update_one({'id': cid}, {'$set': payload})
    return await db.categories.find_one({'id': cid}, {'_id': 0})


@api.delete('/admin/categories/{cid}')
async def delete_category(cid: str, user: dict = Depends(require_store)):
    # Guard: block deletion if products are linked
    linked = await db.products.count_documents({'category': cid})
    if linked > 0:
        raise HTTPException(status_code=400, detail=f'{linked} product(s) are still assigned to this category. Reassign them first.')
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
async def create_product(payload: ProductCreate, user: dict = Depends(require_store)):
    doc = Product(**payload.model_dump()).model_dump()
    await db.products.insert_one(doc)
    doc.pop('_id', None)
    return doc


@api.patch('/admin/products/{pid}')
async def update_product(pid: str, payload: ProductUpdate, user: dict = Depends(require_store)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if updates:
        await db.products.update_one({'id': pid}, {'$set': updates})
    return await db.products.find_one({'id': pid}, {'_id': 0})


@api.delete('/admin/products/{pid}')
async def delete_product(pid: str, user: dict = Depends(require_store)):
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
async def admin_list_collections(user: dict = Depends(require_store)):
    return await db.collections.find({}, {'_id': 0}).sort('order', 1).to_list(500)


@api.post('/admin/collections')
async def create_collection(payload: CollectionCreate, user: dict = Depends(require_store)):
    doc = Collection(**payload.model_dump()).model_dump()
    if await db.collections.find_one({'slug': doc['slug']}):
        raise HTTPException(status_code=400, detail='Collection slug already exists')
    await db.collections.insert_one(doc)
    doc.pop('_id', None)
    return doc


@api.patch('/admin/collections/{cid}')
async def update_collection(cid: str, payload: dict, user: dict = Depends(require_store)):
    await db.collections.update_one({'id': cid}, {'$set': payload})
    return await db.collections.find_one({'id': cid}, {'_id': 0})


@api.delete('/admin/collections/{cid}')
async def delete_collection(cid: str, user: dict = Depends(require_store)):
    await db.collections.delete_one({'id': cid})
    return {'ok': True}


# ================= REVIEWS =================
@api.get('/reviews')
async def list_reviews(
    published: Optional[bool] = True,
    source: Optional[str] = None,  # 'google' | 'qr' | 'manual' | None
    min_rating: Optional[int] = None,
    limit: int = 60,
    skip: int = 0,
):
    filt = {} if not published else {'published': True}
    if source:
        s = source.lower()
        if s == 'google':
            filt['google_review_id'] = {'$exists': True, '$ne': None}
        elif s == 'qr':
            filt['source'] = 'QR'
        elif s == 'manual':
            filt['$and'] = [
                {'google_review_id': {'$in': [None, '', False]}},
                {'source': {'$ne': 'QR'}},
            ]
    if min_rating:
        filt['rating'] = {'$gte': int(min_rating)}
    total = await db.reviews.count_documents(filt)
    # Aggregate stars breakdown across the published set (independent of filter for stability)
    pub_only = {'published': True}
    docs = await db.reviews.find(filt, {'_id': 0}).sort([('order', 1), ('created_at', -1)]).skip(skip).limit(limit).to_list(limit)
    stats = {
        'total': total,
        'total_all_published': await db.reviews.count_documents(pub_only),
        'breakdown': {str(k): 0 for k in range(1, 6)},
        'average': 0.0,
    }
    agg = [
        {'$match': pub_only},
        {'$group': {'_id': '$rating', 'c': {'$sum': 1}}},
    ]
    total_stars = 0
    total_reviews = 0
    async for r in db.reviews.aggregate(agg):
        try:
            k = int(r['_id'])
        except Exception:
            continue
        if 1 <= k <= 5:
            stats['breakdown'][str(k)] = r['c']
            total_stars += k * r['c']
            total_reviews += r['c']
    if total_reviews:
        stats['average'] = round(total_stars / total_reviews, 1)
    return {'items': docs, 'total': total, 'stats': stats, 'skip': skip, 'limit': limit}


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
async def admin_list_shipping_rules(user: dict = Depends(require_store)):
    return await db.shipping_rules.find({}, {'_id': 0}).sort('order', 1).to_list(500)


@api.post('/admin/shipping-rules')
async def create_shipping_rule(payload: ShippingRuleCreate, user: dict = Depends(require_store)):
    doc = ShippingRule(**payload.model_dump()).model_dump()
    await db.shipping_rules.insert_one(doc)
    doc.pop('_id', None)
    return doc


@api.patch('/admin/shipping-rules/{rid}')
async def update_shipping_rule(rid: str, payload: dict, user: dict = Depends(require_store)):
    await db.shipping_rules.update_one({'id': rid}, {'$set': payload})
    return await db.shipping_rules.find_one({'id': rid}, {'_id': 0})


@api.delete('/admin/shipping-rules/{rid}')
async def delete_shipping_rule(rid: str, user: dict = Depends(require_store)):
    await db.shipping_rules.delete_one({'id': rid})
    return {'ok': True}


# ================= TAX RATES =================
@api.get('/tax/rates')
async def public_tax_rates():
    return await db.tax_rates.find({'active': True}, {'_id': 0}).sort('order', 1).to_list(50)


@api.get('/admin/tax-rates')
async def admin_list_tax_rates(user: dict = Depends(require_store)):
    return await db.tax_rates.find({}, {'_id': 0}).sort('order', 1).to_list(500)


@api.post('/admin/tax-rates')
async def create_tax_rate(payload: TaxRateCreate, user: dict = Depends(require_store)):
    doc = TaxRate(**payload.model_dump()).model_dump()
    await db.tax_rates.insert_one(doc)
    doc.pop('_id', None)
    return doc


@api.patch('/admin/tax-rates/{tid}')
async def update_tax_rate(tid: str, payload: dict, user: dict = Depends(require_store)):
    await db.tax_rates.update_one({'id': tid}, {'$set': payload})
    return await db.tax_rates.find_one({'id': tid}, {'_id': 0})


@api.delete('/admin/tax-rates/{tid}')
async def delete_tax_rate(tid: str, user: dict = Depends(require_store)):
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
    'image_1', 'image_2', 'image_3', 'image_4',
]

_SAMPLE_ROWS = [
    ['WTH-CAP-001', 'faith-cap-blessed', 'Faith Cap — Blessed', 'head-gear', '899', '1199', '25', 'Embroidered faith cap in soft cotton twill.', '', 'bestseller', 'physical', 'true', 'false', '', 'https://drive.google.com/file/d/EXAMPLE_ID_1/view?usp=sharing', 'https://drive.google.com/file/d/EXAMPLE_ID_2/view?usp=sharing', '', ''],
    ['WTH-TEE-001', 'psalm-46-tee', 'Psalm 46 Tee', 'clothing', '699', '899', '40', '100% cotton, unisex fit.', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800', 'trending', 'physical', 'true', 'false', '', '', '', '', ''],
    ['WTH-MUG-001', 'grace-mug', 'Grace Ceramic Mug', 'drinkware', '449', '', '60', 'Microwave & dishwasher safe.', 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800', 'new', 'physical', 'true', 'true', 'Engrave name (max 12 chars)', '', '', '', ''],
]


@api.get('/admin/products/template.csv')
async def download_product_template(user: dict = Depends(require_store)):
    cat_slugs = await db.categories.distinct('slug')
    slugs_str = ' / '.join(sorted(cat_slugs))
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(PRODUCT_TEMPLATE_COLUMNS)
    for row in _SAMPLE_ROWS:
        writer.writerow(row)
    writer.writerow(['# INSTRUCTIONS — remove this and any # lines before uploading'])
    writer.writerow(['# Required: sku (or slug), name, category_slug, price, AND at least one image (image OR image_1)'])
    writer.writerow([f'# category_slug must be one of: {slugs_str}'])
    writer.writerow(['# active / personalization_enabled accept: true/false or 1/0'])
    writer.writerow(['# Existing SKU or slug -> UPDATED. Otherwise -> CREATED.'])
    writer.writerow(['# IMAGES: image_1..image_4 accept public URLs OR Google Drive share links.'])
    writer.writerow(['#         Drive links (e.g. https://drive.google.com/file/d/ID/view) are auto-fetched,'])
    writer.writerow(['#         resized to 1600px, converted to WebP, and served from /api/images/<id>.'])
    writer.writerow(['#         The DRIVE FILE MUST be shared as "Anyone with the link — Viewer".'])
    writer.writerow(['#         image_1 is the cover; image_2..4 form the gallery. If image is set it overrides image_1.'])
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
async def bulk_upload_products(file: UploadFile = File(...), user: dict = Depends(require_store)):
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

        # ---- Image processing pipeline ----
        # Priority: explicit `image` col > image_1..image_4 (in order, deduped).
        img_inputs = []
        legacy_image = (row.get('image') or '').strip()
        if legacy_image:
            img_inputs.append(legacy_image)
        for k in ('image_1', 'image_2', 'image_3', 'image_4'):
            v = (row.get(k) or '').strip()
            if v and v not in img_inputs:
                img_inputs.append(v)

        if not img_inputs:
            errors.append({'row': idx, 'error': 'At least one image required (fill `image` or `image_1`).'})
            continue

        processed_urls = []
        for src in img_inputs[:4]:
            try:
                # Keep own-CDN paths and plain public URLs as-is; always re-host Drive links via the pipeline.
                if src.startswith('/api/images/') or (src.startswith(('http://', 'https://')) and 'drive.google' not in src.lower()):
                    processed_urls.append(src)
                else:
                    meta = await _store_image_from_url(src, uploaded_by=user.get('email'))
                    processed_urls.append(meta['url'])
            except HTTPException as ie:
                errors.append({'row': idx, 'error': f'Image "{src[:80]}": {ie.detail}'})
        if not processed_urls:
            # Every image failed
            continue

        payload = {
            'name': name,
            'slug': auto_slug,
            'category': cat_map[cat_slug],
            'price': price,
            'original_price': _parse_int(row.get('original_price'), default=price),
            'stock': _parse_int(row.get('stock'), default=0),
            'description': (row.get('description') or '').strip(),
            'image': processed_urls[0],
            'gallery': processed_urls[1:] if len(processed_urls) > 1 else [],
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


# ================= GOOGLE SHEETS IMPORTER =================
import re
import httpx


def _sheets_url_to_csv(url: str) -> Optional[str]:
    """Convert any Google Sheets URL variant to its CSV export URL."""
    if not url:
        return None
    # Extract spreadsheet id
    m = re.search(r'/spreadsheets/d/([a-zA-Z0-9-_]+)', url)
    if not m:
        return None
    sid = m.group(1)
    # Extract gid (sheet tab id)
    gid_m = re.search(r'[#&?]gid=(\d+)', url)
    gid = gid_m.group(1) if gid_m else '0'
    return f'https://docs.google.com/spreadsheets/d/{sid}/export?format=csv&gid={gid}'


@api.post('/admin/products/import-sheet')
async def import_from_sheet(payload: SheetsImportRequest, user: dict = Depends(require_store)):
    csv_url = _sheets_url_to_csv(payload.url)
    if not csv_url:
        raise HTTPException(status_code=400, detail='Could not extract Google Sheets ID from URL. Use a link like https://docs.google.com/spreadsheets/d/…/edit#gid=0')
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=20) as client_h:
            r = await client_h.get(csv_url)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f'Failed to fetch sheet: {e}')
    if r.status_code != 200:
        raise HTTPException(status_code=400, detail=f'Google Sheets returned {r.status_code} — is the sheet shared as "Anyone with the link"?')
    if 'text/html' in r.headers.get('content-type', ''):
        raise HTTPException(status_code=400, detail='Sheet is not public. Set sharing to "Anyone with the link — Viewer" and try again.')

    # Reuse bulk upload parsing by wrapping bytes as an UploadFile-like
    from io import BytesIO
    from starlette.datastructures import UploadFile as StarletteUploadFile
    file_like = StarletteUploadFile(filename='sheet.csv', file=BytesIO(r.content))
    return await bulk_upload_products(file=file_like, user=user)


# ================= BLOG =================
@api.get('/blog')
async def public_blog_list(limit: int = 20, skip: int = 0, tag: Optional[str] = None):
    filt = {'published': True}
    if tag:
        filt['tags'] = tag
    total = await db.blog_posts.count_documents(filt)
    docs = await db.blog_posts.find(filt, {'_id': 0, 'content': 0}).sort('published_at', -1).skip(skip).limit(limit).to_list(limit)
    return {'items': docs, 'total': total}


@api.get('/blog/{slug}')
async def public_blog_get(slug: str):
    doc = await db.blog_posts.find_one({'slug': slug, 'published': True}, {'_id': 0})
    if not doc:
        raise HTTPException(status_code=404, detail='Post not found')
    related = await db.blog_posts.find(
        {'published': True, 'slug': {'$ne': slug}}, {'_id': 0, 'content': 0}
    ).sort('published_at', -1).limit(3).to_list(3)
    return {'post': doc, 'related': related}


@api.get('/admin/blog')
async def admin_list_blog(user: dict = Depends(require_blog)):
    return await db.blog_posts.find({}, {'_id': 0}).sort('created_at', -1).to_list(500)


@api.post('/admin/blog')
async def admin_create_blog(payload: BlogPostCreate, user: dict = Depends(require_blog)):
    if await db.blog_posts.find_one({'slug': payload.slug}):
        raise HTTPException(status_code=400, detail='Slug already exists')
    doc = BlogPost(**payload.model_dump()).model_dump()
    if doc['published']:
        doc['published_at'] = datetime.now(timezone.utc)
    await db.blog_posts.insert_one(doc)
    doc.pop('_id', None)
    return doc


@api.patch('/admin/blog/{pid}')
async def admin_update_blog(pid: str, payload: dict, user: dict = Depends(require_blog)):
    payload.pop('id', None)
    payload.pop('_id', None)
    payload['updated_at'] = datetime.now(timezone.utc)
    existing = await db.blog_posts.find_one({'id': pid}, {'_id': 0})
    if not existing:
        raise HTTPException(status_code=404, detail='Post not found')
    # Set published_at on first publish
    if payload.get('published') and not existing.get('published_at'):
        payload['published_at'] = datetime.now(timezone.utc)
    await db.blog_posts.update_one({'id': pid}, {'$set': payload})
    return await db.blog_posts.find_one({'id': pid}, {'_id': 0})


@api.delete('/admin/blog/{pid}')
async def admin_delete_blog(pid: str, user: dict = Depends(require_blog)):
    await db.blog_posts.delete_one({'id': pid})
    return {'ok': True}


# ================= INSTAGRAM FEED =================
@api.get('/instagram')
async def public_instagram(limit: int = 12):
    return await db.instagram_posts.find({'active': True}, {'_id': 0}).sort('order', 1).limit(limit).to_list(limit)


@api.get('/admin/instagram')
async def admin_list_instagram(user: dict = Depends(require_admin)):
    return await db.instagram_posts.find({}, {'_id': 0}).sort('order', 1).to_list(500)


@api.post('/admin/instagram')
async def admin_create_instagram(payload: InstagramPostCreate, user: dict = Depends(require_admin)):
    doc = InstagramPost(**payload.model_dump()).model_dump()
    await db.instagram_posts.insert_one(doc)
    doc.pop('_id', None)
    return doc


@api.patch('/admin/instagram/{iid}')
async def admin_update_instagram(iid: str, payload: dict, user: dict = Depends(require_admin)):
    payload.pop('id', None)
    payload.pop('_id', None)
    await db.instagram_posts.update_one({'id': iid}, {'$set': payload})
    return await db.instagram_posts.find_one({'id': iid}, {'_id': 0})


@api.delete('/admin/instagram/{iid}')
async def admin_delete_instagram(iid: str, user: dict = Depends(require_admin)):
    await db.instagram_posts.delete_one({'id': iid})
    return {'ok': True}


# ================= ANALYTICS (mocked GA / FB Pixel) =================
@api.post('/analytics/track')
async def analytics_track(payload: AnalyticsEventCreate, request: Request):
    doc = AnalyticsEvent(
        **payload.model_dump(),
        user_agent=(request.headers.get('user-agent') or '')[:300],
    ).model_dump()
    await db.analytics_events.insert_one(doc)
    return {'ok': True, 'mocked': True}


def _day_key(dt: datetime) -> str:
    return dt.strftime('%Y-%m-%d')


@api.get('/admin/analytics/summary')
async def admin_analytics_summary(days: int = 30, user: dict = Depends(require_admin)):
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=days)

    # ---- Orders / Revenue by day ----
    orders_by_day = {}
    revenue_by_day = {}
    async for o in db.orders.find(
        {'created_at': {'$gte': since}},
        {'_id': 0, 'created_at': 1, 'total': 1, 'payment_status': 1}
    ):
        day = _day_key(o['created_at']) if isinstance(o['created_at'], datetime) else str(o['created_at'])[:10]
        orders_by_day[day] = orders_by_day.get(day, 0) + 1
        if o.get('payment_status') == 'paid':
            revenue_by_day[day] = revenue_by_day.get(day, 0) + int(o.get('total', 0))

    # Traffic events (page_view) — MOCKED if empty, augment
    events_by_day = {}
    async for e in db.analytics_events.find(
        {'created_at': {'$gte': since}, 'name': 'page_view'},
        {'_id': 0, 'created_at': 1}
    ):
        day = _day_key(e['created_at']) if isinstance(e['created_at'], datetime) else str(e['created_at'])[:10]
        events_by_day[day] = events_by_day.get(day, 0) + 1

    # Build a continuous day series
    total_events = sum(events_by_day.values())
    use_mock_baseline = total_events < 20  # not enough real events yet
    series = []
    for i in range(days - 1, -1, -1):
        d = (now - timedelta(days=i))
        key = _day_key(d)
        pv = events_by_day.get(key, 0)
        ords = orders_by_day.get(key, 0)
        rev = revenue_by_day.get(key, 0)
        if pv == 0 and use_mock_baseline:
            base = 120 + int(50 * ((i * 7) % 11) / 11)
            pv = base + ords * 45  # correlate with orders
        series.append({
            'date': key,
            'label': d.strftime('%d %b'),
            'page_views': pv,
            'orders': ords,
            'revenue': rev,
        })

    # ---- Top products (by paid orders line count) ----
    top_pipeline = [
        {'$match': {'payment_status': 'paid', 'created_at': {'$gte': since}}},
        {'$unwind': '$items'},
        {'$group': {
            '_id': '$items.product_id',
            'name': {'$first': '$items.name'},
            'image': {'$first': '$items.image'},
            'units': {'$sum': '$items.qty'},
            'revenue': {'$sum': {'$multiply': ['$items.price', '$items.qty']}},
        }},
        {'$sort': {'units': -1}},
        {'$limit': 6},
    ]
    top_products = []
    async for r in db.orders.aggregate(top_pipeline):
        top_products.append({
            'product_id': r['_id'], 'name': r.get('name') or 'Product',
            'image': r.get('image'), 'units': r['units'], 'revenue': r['revenue'],
        })

    # ---- Traffic sources (mocked derived + real referrer split) ----
    source_map = {}
    async for e in db.analytics_events.find(
        {'name': 'page_view', 'created_at': {'$gte': since}}, {'_id': 0, 'referrer': 1}
    ):
        ref = (e.get('referrer') or '').lower()
        src = 'Direct'
        if 'instagram' in ref:
            src = 'Instagram'
        elif 'google' in ref:
            src = 'Google'
        elif 'facebook' in ref or 'fb.com' in ref:
            src = 'Facebook'
        elif ref:
            src = 'Other'
        source_map[src] = source_map.get(src, 0) + 1

    if not source_map:  # mocked default
        source_map = {'Instagram': 42, 'Google': 28, 'Direct': 18, 'Facebook': 8, 'Other': 4}
    traffic_sources = [{'source': k, 'value': v} for k, v in sorted(source_map.items(), key=lambda x: -x[1])]

    # ---- Totals ----
    total_pv = sum(s['page_views'] for s in series)
    total_orders = sum(s['orders'] for s in series)
    total_revenue = sum(s['revenue'] for s in series)
    conversion = round((total_orders / total_pv * 100), 2) if total_pv else 0.0

    # Avg order value
    aov = int(total_revenue / total_orders) if total_orders else 0

    return {
        'mocked': True,
        'range_days': days,
        'series': series,
        'totals': {
            'page_views': total_pv,
            'orders': total_orders,
            'revenue': total_revenue,
            'conversion_percent': conversion,
            'aov': aov,
        },
        'top_products': top_products,
        'traffic_sources': traffic_sources,
        'pixel_ga_id': 'G-MOCKED-XXXXX',
        'pixel_fb_id': 'FBPIXEL_MOCKED',
    }


# ================= QR REVIEW TOKENS =================
import qrcode
from io import BytesIO


def _gen_token(length: int = 10) -> str:
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))


def _public_review_url(token: str) -> str:
    # Frontend URL is inferred from a common env; else default to a relative path.
    base = os.environ.get('PUBLIC_APP_URL', '')
    return f'{base}/r/{token}' if base else f'/r/{token}'


@api.post('/admin/reviews/qr/generate')
async def qr_generate(payload: QRTokenCreate, user: dict = Depends(require_admin)):
    tok = _gen_token(10)
    while await db.qr_tokens.find_one({'token': tok}):
        tok = _gen_token(10)
    expires_at = datetime.now(timezone.utc) + timedelta(days=max(1, payload.expires_days))
    doc = QRReviewToken(
        token=tok, order_number=payload.order_number, product_id=payload.product_id,
        customer_name=payload.customer_name, customer_email=payload.customer_email,
        expires_at=expires_at,
    ).model_dump()
    await db.qr_tokens.insert_one(doc)
    doc.pop('_id', None)
    doc['review_url'] = _public_review_url(tok)
    return doc


@api.get('/admin/reviews/qr')
async def qr_list(user: dict = Depends(require_admin)):
    items = await db.qr_tokens.find({}, {'_id': 0}).sort('created_at', -1).to_list(500)
    for it in items:
        it['review_url'] = _public_review_url(it['token'])
    return items


@api.get('/admin/reviews/qr/{token}/image.png')
async def qr_image(token: str, user: dict = Depends(require_admin)):
    doc = await db.qr_tokens.find_one({'token': token})
    if not doc:
        raise HTTPException(status_code=404, detail='Token not found')
    url = _public_review_url(token)
    img = qrcode.make(url)
    buf = BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    return StreamingResponse(iter([buf.getvalue()]), media_type='image/png', headers={'Content-Disposition': f'inline; filename="qr-{token}.png"'})


@api.delete('/admin/reviews/qr/{token}')
async def qr_delete(token: str, user: dict = Depends(require_admin)):
    await db.qr_tokens.delete_one({'token': token})
    return {'ok': True}


def _redact_email(email: Optional[str]) -> Optional[str]:
    if not email or '@' not in email:
        return email
    user, _, domain = email.partition('@')
    if len(user) <= 2:
        return f'{user[0]}***@{domain}'
    return f'{user[0]}***{user[-1]}@{domain}'


# ---- Public QR review endpoints ----
@api.get('/r/{token}')
async def public_qr_info(token: str):
    """Validate token and return context (product/order info) for the review form."""
    tok = await db.qr_tokens.find_one({'token': token}, {'_id': 0})
    if not tok:
        raise HTTPException(status_code=404, detail='Invalid or expired review link')
    exp = tok.get('expires_at')
    if exp and isinstance(exp, datetime) and ensure_aware(exp) < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail='This review link has expired')
    if tok.get('used'):
        raise HTTPException(status_code=410, detail='This review link has already been used')

    product = None
    if tok.get('product_id'):
        product = await db.products.find_one({'id': tok['product_id']}, {'_id': 0, 'id': 1, 'name': 1, 'image': 1, 'slug': 1})
    order = None
    if tok.get('order_number'):
        order = await db.orders.find_one({'order_number': tok['order_number']}, {'_id': 0, 'order_number': 1, 'items': 1})
    return {
        'token': token,
        'customer_name': tok.get('customer_name'),
        'customer_email': _redact_email(tok.get('customer_email')),
        'product': product,
        'order': order,
    }


@api.post('/r/{token}')
async def public_qr_submit(token: str, payload: QRReviewSubmission):
    tok = await db.qr_tokens.find_one({'token': token})
    if not tok:
        raise HTTPException(status_code=404, detail='Invalid review link')
    exp = tok.get('expires_at')
    if exp and isinstance(exp, datetime) and ensure_aware(exp) < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail='This review link has expired')
    if tok.get('used'):
        raise HTTPException(status_code=410, detail='This review link has already been used')
    if not (1 <= payload.rating <= 5):
        raise HTTPException(status_code=400, detail='Rating must be 1-5')
    if len(payload.text.strip()) < 5:
        raise HTTPException(status_code=400, detail='Please write at least a few words about your experience')

    # Cap photos to 6, each URL ≤ 2KB, http(s) only
    safe_photos = []
    for p in (payload.photos or [])[:6]:
        s = str(p).strip()
        if len(s) <= 2048 and (s.startswith('http://') or s.startswith('https://')):
            safe_photos.append(s)

    review = Review(
        name=payload.name.strip()[:120], rating=payload.rating, text=payload.text.strip()[:2000],
        when='just now', source='QR', published=False,  # requires moderation
        order_number=tok.get('order_number'), product_id=tok.get('product_id'),
        email=(payload.email or tok.get('customer_email')),
        photos=safe_photos, verified=True,
    ).model_dump()
    await db.reviews.insert_one(review)
    await db.qr_tokens.update_one({'token': token}, {'$set': {
        'used': True, 'used_at': datetime.now(timezone.utc), 'review_id': review['id']
    }})
    return {'ok': True, 'review_id': review['id'], 'message': 'Thanks! Your review is submitted and will appear after a quick check.'}


# ---- Generic (non-tokenised) public review ----
# Anyone can submit; used with the single shareable QR code (below)
@api.post('/reviews/public')
async def public_generic_review(payload: QRReviewSubmission):
    if not (1 <= payload.rating <= 5):
        raise HTTPException(status_code=400, detail='Rating must be 1-5')
    if len((payload.text or '').strip()) < 5:
        raise HTTPException(status_code=400, detail='Please write at least a few words about your experience')
    if not (payload.name or '').strip():
        raise HTTPException(status_code=400, detail='Please tell us your name')

    safe_photos = []
    for p in (payload.photos or [])[:6]:
        s = str(p).strip()
        if len(s) <= 2048 and (s.startswith('http://') or s.startswith('https://')):
            safe_photos.append(s)

    review = Review(
        name=payload.name.strip()[:120], rating=payload.rating, text=payload.text.strip()[:2000],
        when='just now', source='QR', published=False, verified=False,
        email=(payload.email or None), photos=safe_photos,
    ).model_dump()
    await db.reviews.insert_one(review)
    return {'ok': True, 'review_id': review['id'], 'message': 'Thanks! Your review is submitted and will appear after a quick check.'}


@api.get('/reviews/generic-qr.png')
async def public_generic_qr_image(request: Request):
    """Public PNG QR pointing to /review — usable in the footer / packing slips."""
    base = await get_setting('PUBLIC_APP_URL', '') or str(request.base_url).rstrip('/').replace('/api', '')
    review_url = f'{base}/review'
    img = qrcode.make(review_url)
    buf = BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    return StreamingResponse(iter([buf.getvalue()]), media_type='image/png', headers={
        'Cache-Control': 'public, max-age=86400',
        'Content-Disposition': 'inline; filename="wth-review-qr.png"',
    })


@api.get('/admin/reviews/generic-qr')
async def admin_generic_qr(user: dict = Depends(require_admin)):
    """Return the URL + PNG endpoint for the single generic (non-user-specific) review QR."""
    base = await get_setting('PUBLIC_APP_URL', '')
    review_url = f'{base}/review' if base else '/review'
    return {
        'review_url': review_url,
        'image_url': '/api/admin/reviews/generic-qr/image.png',
        'description': 'Share this link (or the printed QR) on packing slips, WhatsApp, or Instagram bio. Anyone can submit a review through it — submissions go to your Reviews Hub as unpublished for moderation.',
    }


@api.get('/admin/reviews/generic-qr/image.png')
async def admin_generic_qr_image(user: dict = Depends(require_admin)):
    base = await get_setting('PUBLIC_APP_URL', '')
    review_url = f'{base}/review' if base else '/review'
    img = qrcode.make(review_url)
    buf = BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    return StreamingResponse(iter([buf.getvalue()]), media_type='image/png', headers={'Content-Disposition': 'inline; filename="wth-review-qr.png"'})


# ================= ADMIN USERS (RBAC) =================
VALID_ROLES = {'admin', 'store_manager', 'blogger'}


class AdminUserInvite(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    role: str = 'store_manager'


class AdminUserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None


@api.get('/admin/users')
async def admin_list_users(user: dict = Depends(require_admin)):
    users = await db.admin_users.find({}, {'_id': 0}).sort('created_at', 1).to_list(200)
    return users


@api.post('/admin/users')
async def admin_invite_user(payload: AdminUserInvite, user: dict = Depends(require_admin)):
    if payload.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f'Invalid role. Choose one of: {", ".join(sorted(VALID_ROLES))}')
    if await db.admin_users.find_one({'email': payload.email.lower()}):
        raise HTTPException(status_code=400, detail='A user with that email already exists')
    uid = f'user_{uuid.uuid4().hex[:12]}'
    doc = {
        'user_id': uid,
        'email': payload.email.lower(),
        'name': payload.name or payload.email.split('@')[0],
        'picture': None,
        'role': payload.role,
        'created_at': datetime.now(timezone.utc),
        'invited_by': user.get('email'),
    }
    await db.admin_users.insert_one(doc)
    doc.pop('_id', None)
    return doc


@api.patch('/admin/users/{uid}')
async def admin_update_user(uid: str, payload: AdminUserUpdate, user: dict = Depends(require_admin)):
    target = await db.admin_users.find_one({'user_id': uid}, {'_id': 0})
    if not target:
        raise HTTPException(status_code=404, detail='User not found')
    updates = {}
    if payload.name is not None:
        updates['name'] = payload.name
    if payload.role is not None:
        if payload.role not in VALID_ROLES:
            raise HTTPException(status_code=400, detail='Invalid role')
        # Prevent demoting the last admin
        if target.get('role') == 'admin' and payload.role != 'admin':
            admin_count = await db.admin_users.count_documents({'role': 'admin'})
            if admin_count <= 1:
                raise HTTPException(status_code=400, detail='Cannot demote the last remaining admin')
        updates['role'] = payload.role
    if updates:
        await db.admin_users.update_one({'user_id': uid}, {'$set': updates})
    return await db.admin_users.find_one({'user_id': uid}, {'_id': 0})


@api.delete('/admin/users/{uid}')
async def admin_delete_user(uid: str, user: dict = Depends(require_admin)):
    if uid == user.get('user_id'):
        raise HTTPException(status_code=400, detail='You cannot delete your own account')
    target = await db.admin_users.find_one({'user_id': uid})
    if not target:
        raise HTTPException(status_code=404, detail='User not found')
    if target.get('role') == 'admin':
        admin_count = await db.admin_users.count_documents({'role': 'admin'})
        if admin_count <= 1:
            raise HTTPException(status_code=400, detail='Cannot delete the last remaining admin')
    await db.admin_users.delete_one({'user_id': uid})
    await db.admin_sessions.delete_many({'user_id': uid})
    return {'ok': True}


@api.get('/admin/roles')
async def admin_list_roles(user: dict = Depends(require_admin)):
    return {
        'roles': [
            {'key': 'admin', 'label': 'Full Admin', 'description': 'Access to everything — orders, integrations, users, analytics.'},
            {'key': 'store_manager', 'label': 'Store Manager', 'description': 'Manage products, categories, collections, shipping and tax. Cannot see orders, customers, integrations or analytics.'},
            {'key': 'blogger', 'label': 'Blogger', 'description': 'Publish and manage blog posts only.'},
        ]
    }


# ================= INTEGRATION SETTINGS =================
INTEGRATIONS_SCHEMA = [
    {
        'category': 'instagram',
        'label': 'Instagram',
        'description': 'Connect the @wearthehope Instagram Business account to auto-sync the storefront feed and enable shoppable tags (via Meta Graph API).',
        'docs_url': 'https://developers.facebook.com/docs/instagram-basic-display-api/getting-started',
        'fields': [
            {'key': 'INSTAGRAM_HANDLE', 'label': 'Handle (public)', 'placeholder': 'wearthehope', 'secret': False},
            {'key': 'INSTAGRAM_PROFILE_URL', 'label': 'Profile URL', 'placeholder': 'https://www.instagram.com/wearthehope', 'secret': False},
            {'key': 'INSTAGRAM_BUSINESS_ID', 'label': 'IG Business Account ID', 'placeholder': '17841400000000000', 'secret': False},
            {'key': 'INSTAGRAM_ACCESS_TOKEN', 'label': 'Meta Graph API access token', 'placeholder': 'EAAG...', 'secret': True},
        ],
    },
    {
        'category': 'shipping',
        'label': 'Shipping — Shiprocket',
        'description': 'Provide credentials to move shipment tracking + AWB assignment from the mocked path to real Shiprocket.',
        'docs_url': 'https://apidocs.shiprocket.in/',
        'fields': [
            {'key': 'SHIPROCKET_EMAIL', 'label': 'Shiprocket email', 'placeholder': 'ops@wearthehope.com', 'secret': False},
            {'key': 'SHIPROCKET_PASSWORD', 'label': 'Shiprocket password', 'placeholder': '••••••••', 'secret': True},
            {'key': 'SHIPROCKET_PICKUP_LOCATION', 'label': 'Default pickup location', 'placeholder': 'Mumbai Design Center', 'secret': False},
        ],
    },
    {
        'category': 'payments',
        'label': 'Payments — Razorpay',
        'description': 'Razorpay live key + secret for taking real payments. When absent, checkout runs in mocked mode.',
        'docs_url': 'https://razorpay.com/docs/api/',
        'fields': [
            {'key': 'RAZORPAY_KEY_ID', 'label': 'Key ID', 'placeholder': 'rzp_live_XXXX', 'secret': False},
            {'key': 'RAZORPAY_KEY_SECRET', 'label': 'Key secret', 'placeholder': '••••••••', 'secret': True},
            {'key': 'RAZORPAY_WEBHOOK_SECRET', 'label': 'Webhook secret', 'placeholder': '••••••••', 'secret': True},
        ],
    },
    {
        'category': 'payments',
        'label': 'Payments — Stripe',
        'description': 'International payments via Stripe. Optional if you only accept Indian cards.',
        'docs_url': 'https://stripe.com/docs/keys',
        'fields': [
            {'key': 'STRIPE_PUBLISHABLE_KEY', 'label': 'Publishable key', 'placeholder': 'pk_live_XXXX', 'secret': False},
            {'key': 'STRIPE_SECRET_KEY', 'label': 'Secret key', 'placeholder': 'sk_live_XXXX', 'secret': True},
            {'key': 'STRIPE_WEBHOOK_SECRET', 'label': 'Webhook signing secret', 'placeholder': 'whsec_XXXX', 'secret': True},
        ],
    },
    {
        'category': 'payments',
        'label': 'Payments — PayPal',
        'description': 'Optional PayPal Business creds.',
        'docs_url': 'https://developer.paypal.com/api/rest/authentication/',
        'fields': [
            {'key': 'PAYPAL_CLIENT_ID', 'label': 'Client ID', 'placeholder': 'AXX...', 'secret': False},
            {'key': 'PAYPAL_CLIENT_SECRET', 'label': 'Client secret', 'placeholder': '••••••••', 'secret': True},
            {'key': 'PAYPAL_MODE', 'label': 'Mode', 'placeholder': 'sandbox / live', 'secret': False},
        ],
    },
    {
        'category': 'email',
        'label': 'Email — Gmail SMTP',
        'description': 'Send real transactional emails from your Gmail account (order confirmation, shipped, refund, review request).',
        'docs_url': 'https://support.google.com/mail/answer/185833',
        'fields': [
            {'key': 'GMAIL_FROM_ADDRESS', 'label': 'From address', 'placeholder': 'orders@wearthehope.com', 'secret': False},
            {'key': 'GMAIL_APP_PASSWORD', 'label': 'App password (16 chars)', 'placeholder': '••••••••••••••••', 'secret': True},
        ],
    },
    {
        'category': 'analytics',
        'label': 'Analytics — Google Analytics 4',
        'description': 'Once set, GA4 tag is injected into the storefront and the analytics dashboard swaps the mocked baseline for live event counts.',
        'docs_url': 'https://support.google.com/analytics/answer/9539598',
        'fields': [
            {'key': 'GA4_MEASUREMENT_ID', 'label': 'Measurement ID', 'placeholder': 'G-XXXXXXXXXX', 'secret': False},
        ],
    },
    {
        'category': 'analytics',
        'label': 'Analytics — Meta (Facebook) Pixel',
        'description': 'Meta Pixel ID for retargeting + purchase events.',
        'docs_url': 'https://www.facebook.com/business/help/952192354843755',
        'fields': [
            {'key': 'FB_PIXEL_ID', 'label': 'Pixel ID', 'placeholder': '1234567890', 'secret': False},
        ],
    },
    {
        'category': 'google',
        'label': 'Google — Places API',
        'description': 'Used to sync real Google Business reviews. Without this key, the reviews sync runs in mocked mode.',
        'docs_url': 'https://developers.google.com/maps/documentation/places/web-service/get-api-key',
        'fields': [
            {'key': 'GOOGLE_PLACES_API_KEY', 'label': 'API key', 'placeholder': 'AIza...', 'secret': True},
        ],
    },
    {
        'category': 'general',
        'label': 'General — Public App URL',
        'description': 'Base URL used when building QR-code review links and outbound emails. Should match your production domain.',
        'docs_url': None,
        'fields': [
            {'key': 'PUBLIC_APP_URL', 'label': 'Public app URL', 'placeholder': 'https://wearthehope.com', 'secret': False},
        ],
    },
]

_SETTING_KEYS = {f['key'] for section in INTEGRATIONS_SCHEMA for f in section['fields']}


def _mask(v: str) -> str:
    if not v:
        return ''
    if len(v) <= 4:
        return '••••'
    return f'{v[:2]}••••{v[-2:]}'


async def get_setting(key: str, default: Optional[str] = None) -> Optional[str]:
    """Read a setting from DB first, fall back to env var, then default."""
    doc = await db.settings.find_one({'key': key}, {'_id': 0, 'value': 1})
    if doc and doc.get('value'):
        return doc['value']
    env_v = os.environ.get(key)
    if env_v:
        return env_v
    return default


@api.get('/admin/integrations')
async def admin_list_integrations(user: dict = Depends(require_admin)):
    """Return integration schema grouped with current values (secrets masked)."""
    docs = await db.settings.find({'key': {'$in': list(_SETTING_KEYS)}}, {'_id': 0}).to_list(200)
    val_map = {d['key']: d.get('value', '') for d in docs}
    updated_map = {d['key']: d.get('updated_at') for d in docs}
    sections = []
    for section in INTEGRATIONS_SCHEMA:
        filled = 0
        rows = []
        for f in section['fields']:
            raw = val_map.get(f['key']) or os.environ.get(f['key']) or ''
            has_value = bool(raw)
            if has_value:
                filled += 1
            display = _mask(raw) if (f.get('secret') and has_value) else raw
            rows.append({
                **f,
                'display_value': display,
                'has_value': has_value,
                'source': 'db' if val_map.get(f['key']) else ('env' if os.environ.get(f['key']) else 'none'),
                'updated_at': updated_map.get(f['key']),
            })
        total = len(section['fields'])
        status = 'configured' if filled == total else ('partial' if filled else 'unconfigured')
        sections.append({**section, 'fields': rows, 'status': status, 'filled': filled, 'total': total})
    return {'sections': sections, 'mocked_when_empty': True}


@api.get('/admin/integrations/{key}/reveal')
async def admin_reveal_setting(key: str, user: dict = Depends(require_admin)):
    if key not in _SETTING_KEYS:
        raise HTTPException(status_code=404, detail='Unknown setting key')
    doc = await db.settings.find_one({'key': key}, {'_id': 0, 'value': 1})
    return {'key': key, 'value': (doc.get('value') if doc else '') or os.environ.get(key) or ''}


@api.put('/admin/integrations')
async def admin_upsert_setting(payload: SettingUpdate, user: dict = Depends(require_admin)):
    if payload.key not in _SETTING_KEYS:
        raise HTTPException(status_code=400, detail='Unknown setting key')
    category = next((s['category'] for s in INTEGRATIONS_SCHEMA for f in s['fields'] if f['key'] == payload.key), 'general')
    await db.settings.update_one(
        {'key': payload.key},
        {'$set': {
            'key': payload.key,
            'value': (payload.value or '').strip(),
            'category': category,
            'updated_at': datetime.now(timezone.utc),
            'updated_by': user.get('email'),
        }},
        upsert=True,
    )
    return {'ok': True, 'key': payload.key, 'has_value': bool(payload.value)}


@api.delete('/admin/integrations/{key}')
async def admin_clear_setting(key: str, user: dict = Depends(require_admin)):
    if key not in _SETTING_KEYS:
        raise HTTPException(status_code=400, detail='Unknown setting key')
    await db.settings.delete_one({'key': key})
    return {'ok': True}


# ================= GOOGLE BUSINESS LOCATIONS + REVIEW SYNC =================
_MOCK_GOOGLE_REVIEWERS = [
    ('Anita Sharma', 5, "Beautiful craftsmanship and quick delivery. The engraved wallet was gift-perfect!", 'https://i.pravatar.cc/80?u=anita'),
    ('Rohit Menon', 5, "Ordered the Christmas glass set — packaging was gorgeous, everyone loved it.", 'https://i.pravatar.cc/80?u=rohit'),
    ('Grace Thomas', 4, "Lovely faith cap, exactly as pictured. Shipping was a day late but worth it.", 'https://i.pravatar.cc/80?u=grace'),
    ('Sanjay Nair', 5, "The wood keychains are next-level. Ordered 12 for our team retreat.", 'https://i.pravatar.cc/80?u=sanjay'),
    ('Priya Kurien', 5, "Faith-filled products with real quality. Will keep coming back.", 'https://i.pravatar.cc/80?u=priya'),
    ('Aakash Verma', 4, "Great customer service. My personalization was corrected within a day.", 'https://i.pravatar.cc/80?u=aakash'),
    ('Deepika Rao', 5, "Wearthehope stands for what it says. Beautiful message on every piece.", 'https://i.pravatar.cc/80?u=deepika'),
]


async def _fetch_google_reviews(place_id: str) -> dict:
    """Fetch reviews from Google Places API v1. Falls back to a deterministic mock when key is missing."""
    key = await get_setting('GOOGLE_PLACES_API_KEY')
    if not key:
        # Deterministic mock: seed randomness with a stable hash of place_id so rating & count don't jump between syncs.
        rng = random.Random(hash(place_id) & 0xFFFFFFFF)
        picks = rng.sample(_MOCK_GOOGLE_REVIEWERS, k=min(5, len(_MOCK_GOOGLE_REVIEWERS)))
        now = datetime.now(timezone.utc)
        return {
            'mocked': True,
            'rating': round(sum(p[1] for p in picks) / len(picks), 1),
            'review_count': 148 + (hash(place_id) & 0x3F),  # stable 148..211
            'reviews': [
                {
                    'google_review_id': f'gmock_{place_id}_{i}',
                    'author': p[0], 'rating': p[1], 'text': p[2], 'avatar': p[3],
                    'time': (now - timedelta(days=(hash(place_id + p[0]) & 0x7F))).isoformat(),
                }
                for i, p in enumerate(picks)
            ],
        }
    # Real call (Places API v1 - Place Details)
    url = f'https://places.googleapis.com/v1/places/{place_id}'
    headers = {
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'rating,userRatingCount,reviews',
    }
    async with httpx.AsyncClient(timeout=15) as ch:
        r = await ch.get(url, headers=headers)
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail=f'Google Places API error {r.status_code}: {r.text[:300]}')
    data = r.json()
    reviews = []
    for rv in (data.get('reviews') or []):
        author = rv.get('authorAttribution', {})
        reviews.append({
            'google_review_id': rv.get('name', f"gplc_{len(reviews)}"),
            'author': author.get('displayName', 'Google User'),
            'avatar': author.get('photoUri'),
            'rating': int(rv.get('rating', 5)),
            'text': (rv.get('text') or {}).get('text', '') or (rv.get('originalText') or {}).get('text', ''),
            'time': rv.get('publishTime'),
        })
    return {
        'mocked': False,
        'rating': data.get('rating'),
        'review_count': data.get('userRatingCount', 0),
        'reviews': reviews,
    }


@api.get('/admin/google-locations')
async def admin_list_google_locations(user: dict = Depends(require_admin)):
    return await db.google_locations.find({}, {'_id': 0}).sort('order', 1).to_list(200)


@api.post('/admin/google-locations')
async def create_google_location(payload: GoogleBusinessLocationCreate, user: dict = Depends(require_admin)):
    doc = GoogleBusinessLocation(**payload.model_dump()).model_dump()
    await db.google_locations.insert_one(doc)
    doc.pop('_id', None)
    return doc


@api.patch('/admin/google-locations/{gid}')
async def update_google_location(gid: str, payload: dict, user: dict = Depends(require_admin)):
    payload.pop('id', None)
    payload.pop('_id', None)
    await db.google_locations.update_one({'id': gid}, {'$set': payload})
    return await db.google_locations.find_one({'id': gid}, {'_id': 0})


@api.delete('/admin/google-locations/{gid}')
async def delete_google_location(gid: str, user: dict = Depends(require_admin)):
    await db.google_locations.delete_one({'id': gid})
    return {'ok': True}


@api.post('/admin/google-locations/{gid}/sync')
async def sync_google_location(gid: str, user: dict = Depends(require_admin)):
    loc = await db.google_locations.find_one({'id': gid}, {'_id': 0})
    if not loc:
        raise HTTPException(status_code=404, detail='Location not found')
    result = await _fetch_google_reviews(loc['place_id'])
    now = datetime.now(timezone.utc)

    imported = 0
    updated = 0
    for rv in result['reviews']:
        gid_key = rv['google_review_id']
        existing = await db.reviews.find_one({'google_review_id': gid_key})
        should_publish = loc.get('auto_publish', True) and rv['rating'] >= loc.get('min_rating_to_publish', 4)
        rv_doc = {
            'name': rv['author'],
            'rating': int(rv['rating']),
            'text': rv['text'],
            'when': 'via Google',
            'avatar': rv.get('avatar'),
            'source': loc['label'] or 'Google',
            'google_review_id': gid_key,
            'google_place_id': loc['place_id'],
            'google_location_id': loc['id'],
            'verified': True,
        }
        if existing:
            # PRESERVE admin's published decision on re-sync — only update Google-sourced fields
            await db.reviews.update_one({'id': existing['id']}, {'$set': rv_doc})
            updated += 1
        else:
            # First import — set published based on min_rating_to_publish
            rv_doc['published'] = should_publish
            rv_doc = Review(**rv_doc).model_dump()
            await db.reviews.insert_one(rv_doc)
            imported += 1

    # Update location stats
    upd = {
        'last_synced_at': now,
        'rating': result.get('rating'),
        'review_count': result.get('review_count', 0),
    }
    await db.google_locations.update_one({'id': gid}, {'$set': upd})

    return {
        'ok': True,
        'mocked': result.get('mocked', False),
        'imported': imported,
        'updated': updated,
        'total_reviews_fetched': len(result['reviews']),
        'location_rating': result.get('rating'),
        'location_review_count': result.get('review_count'),
    }


@api.post('/admin/google-locations/sync-all')
async def sync_all_google_locations(user: dict = Depends(require_admin)):
    locs = await db.google_locations.find({'active': True}, {'_id': 0}).to_list(200)
    results = []
    for loc in locs:
        try:
            r = await sync_google_location(loc['id'], user)
            results.append({'id': loc['id'], 'label': loc['label'], **r})
        except HTTPException as e:
            results.append({'id': loc['id'], 'label': loc['label'], 'ok': False, 'error': e.detail})
    return {'ok': True, 'count': len(results), 'results': results}


# ================= IMAGE PIPELINE (Google Drive + resize + WebP + GridFS) =================
from PIL import Image
from bson import ObjectId

_GDRIVE_ID_RE = re.compile(r'(?:/file/d/|[?&]id=)([A-Za-z0-9_-]{20,})')


def _resolve_image_source(url: str) -> str:
    """Turn Google Drive share links into direct-download URLs. Pass everything else through."""
    if not url:
        return url
    m = _GDRIVE_ID_RE.search(url)
    if m:
        return f'https://drive.google.com/uc?export=download&id={m.group(1)}'
    return url


async def _fetch_bytes(url: str, max_bytes: int = 15 * 1024 * 1024) -> bytes:
    async with httpx.AsyncClient(follow_redirects=True, timeout=30) as ch:
        r = await ch.get(url)
    if r.status_code != 200:
        raise HTTPException(status_code=400, detail=f'Failed to download image ({r.status_code}): {url[:120]}')
    if 'text/html' in r.headers.get('content-type', ''):
        raise HTTPException(status_code=400, detail='URL returned an HTML page (private Drive file?). Set Google Drive sharing to "Anyone with the link".')
    if len(r.content) > max_bytes:
        raise HTTPException(status_code=413, detail=f'Image too large ({len(r.content)//1024} KB). Max 15 MB.')
    return r.content


def _process_image(raw: bytes, target_w: int = 1600, target_h: int = 1600, quality: int = 82) -> tuple[bytes, str, int, int]:
    """Resize (preserving aspect ratio) and re-encode as WebP. Returns (bytes, ext, w, h)."""
    im = Image.open(BytesIO(raw))
    im = im.convert('RGB') if im.mode not in ('RGB', 'RGBA') else im
    im.thumbnail((target_w, target_h), Image.LANCZOS)
    out = BytesIO()
    im.save(out, format='WEBP', quality=quality, method=6)
    out.seek(0)
    return out.getvalue(), 'webp', im.width, im.height


async def _store_image_from_url(source_url: str, uploaded_by: Optional[str] = None) -> dict:
    """Full pipeline: resolve source (Drive → direct), fetch, resize, WebP, save to GridFS, return metadata."""
    resolved = _resolve_image_source(source_url)
    raw = await _fetch_bytes(resolved)
    body, ext, w, h = _process_image(raw)
    fid = await gridfs_bucket.upload_from_stream(
        f'wth_{uuid.uuid4().hex[:12]}.{ext}',
        body,
        metadata={
            'content_type': 'image/webp',
            'source_url': source_url[:500],
            'resolved_url': resolved[:500],
            'width': w, 'height': h, 'size': len(body),
            'uploaded_by': uploaded_by,
            'created_at': datetime.now(timezone.utc),
        },
    )
    return {
        'id': str(fid),
        'url': f'/api/images/{fid}',
        'width': w, 'height': h, 'size': len(body),
        'content_type': 'image/webp',
    }


class ImageUploadRequest(BaseModel):
    url: str


@api.post('/admin/images/upload-from-url')
async def admin_upload_image_from_url(payload: ImageUploadRequest, user: dict = Depends(require_store)):
    if not (payload.url or '').strip():
        raise HTTPException(status_code=400, detail='url is required')
    meta = await _store_image_from_url(payload.url.strip(), uploaded_by=user.get('email'))
    return meta


@api.get('/images/{img_id}')
async def get_image(img_id: str):
    try:
        oid = ObjectId(img_id)
    except Exception:
        raise HTTPException(status_code=404, detail='Not found')
    try:
        stream = await gridfs_bucket.open_download_stream(oid)
    except Exception:
        raise HTTPException(status_code=404, detail='Not found')
    body = await stream.read()
    ct = (stream.metadata or {}).get('content_type', 'image/webp')
    return Response(content=body, media_type=ct, headers={
        'Cache-Control': 'public, max-age=2592000, immutable',
        'Content-Length': str(len(body)),
    })


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
    await db.reviews.create_index('google_review_id', sparse=True)
    await db.qr_tokens.create_index('token', unique=True)
    await db.categories.create_index('slug', unique=True)
    await db.settings.create_index('key', unique=True)
    # TTL: auto-purge expired admin sessions
    try:
        await db.admin_sessions.create_index('expires_at', expireAfterSeconds=0)
    except Exception:
        pass
    await db.seo_meta.create_index('path', unique=True)
    await db.newsletter.create_index('email', unique=True)
    await db.collections.create_index('slug', unique=True)


@app.on_event('shutdown')
async def shutdown_event():
    client.close()
