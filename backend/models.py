from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, EmailStr
import uuid


def _uid(prefix: str = '') -> str:
    return f"{prefix}{uuid.uuid4().hex[:12]}" if prefix else uuid.uuid4().hex


def _now():
    return datetime.now(timezone.utc)


# ---------- Auth ----------
class AdminUser(BaseModel):
    user_id: str = Field(default_factory=lambda: _uid('user_'))
    email: str
    name: str
    picture: Optional[str] = None
    role: str = 'admin'
    created_at: datetime = Field(default_factory=_now)


class Session(BaseModel):
    session_token: str
    user_id: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=_now)


# ---------- Catalog ----------
class Category(BaseModel):
    id: str = Field(default_factory=lambda: _uid())
    name: str
    slug: str
    tagline: str = ''
    image: str = ''
    count: int = 0
    coming_soon: bool = False
    order: int = 0
    created_at: datetime = Field(default_factory=_now)


class CategoryCreate(BaseModel):
    name: str
    slug: str
    tagline: str = ''
    image: str = ''
    coming_soon: bool = False
    order: int = 0


class Product(BaseModel):
    id: str = Field(default_factory=lambda: _uid('p_'))
    name: str
    slug: str
    category: str  # category id
    collections: List[str] = []  # list of collection ids
    price: int
    original_price: int
    image: str
    hover_image: Optional[str] = None
    gallery: List[str] = []  # additional image URLs
    videos: List[str] = []  # YouTube/mp4 URLs
    verse: str = ''
    tag: str = ''  # legacy tag
    ribbon: Optional[str] = None  # 'New' | 'Sale' | 'Best Seller' | custom
    rating: float = 4.8
    reviews: int = 0
    colors: List[str] = []
    description: str = ''
    stock: int = 100
    sku: Optional[str] = None
    active: bool = True
    product_type: str = 'physical'  # 'physical' | 'digital'
    digital_file_url: Optional[str] = None
    weight_grams: int = 500
    personalization_enabled: bool = False
    personalization_label: str = 'Personalize (optional)'
    personalization_max_length: int = 40
    variant_options: List[dict] = []  # [{name:'Size', values:['S','M','L']}]
    variants: List[dict] = []  # [{id, attrs:{Size:'M',Color:'Black'}, price, original_price, stock, sku, image}]
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    seo_keywords: Optional[str] = None
    created_at: datetime = Field(default_factory=_now)


class ProductCreate(BaseModel):
    name: str
    slug: str
    category: str
    collections: List[str] = []
    price: int
    original_price: int
    image: str
    hover_image: Optional[str] = None
    gallery: List[str] = []
    videos: List[str] = []
    verse: str = ''
    tag: str = ''
    ribbon: Optional[str] = None
    colors: List[str] = []
    description: str = ''
    stock: int = 100
    sku: Optional[str] = None
    active: bool = True
    product_type: str = 'physical'
    digital_file_url: Optional[str] = None
    weight_grams: int = 500
    personalization_enabled: bool = False
    personalization_label: str = 'Personalize (optional)'
    personalization_max_length: int = 40
    variant_options: List[dict] = []
    variants: List[dict] = []
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    seo_keywords: Optional[str] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    category: Optional[str] = None
    collections: Optional[List[str]] = None
    price: Optional[int] = None
    original_price: Optional[int] = None
    image: Optional[str] = None
    hover_image: Optional[str] = None
    gallery: Optional[List[str]] = None
    videos: Optional[List[str]] = None
    verse: Optional[str] = None
    tag: Optional[str] = None
    ribbon: Optional[str] = None
    colors: Optional[List[str]] = None
    description: Optional[str] = None
    stock: Optional[int] = None
    sku: Optional[str] = None
    active: Optional[bool] = None
    product_type: Optional[str] = None
    digital_file_url: Optional[str] = None
    weight_grams: Optional[int] = None
    personalization_enabled: Optional[bool] = None
    personalization_label: Optional[str] = None
    personalization_max_length: Optional[int] = None
    variant_options: Optional[List[dict]] = None
    variants: Optional[List[dict]] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    seo_keywords: Optional[str] = None


# ---------- Collections (marketing groupings) ----------
class Collection(BaseModel):
    id: str = Field(default_factory=lambda: _uid('col_'))
    name: str
    slug: str
    tagline: str = ''
    image: str = ''
    description: str = ''
    product_ids: List[str] = []
    featured: bool = False
    active: bool = True
    order: int = 0
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    created_at: datetime = Field(default_factory=_now)


class CollectionCreate(BaseModel):
    name: str
    slug: str
    tagline: str = ''
    image: str = ''
    description: str = ''
    product_ids: List[str] = []
    featured: bool = False
    active: bool = True
    order: int = 0
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None


# ---------- Reviews ----------
class Review(BaseModel):
    id: str = Field(default_factory=lambda: _uid('r_'))
    name: str
    rating: int = 5
    text: str
    when: str = 'recently'  # 'X months ago'
    avatar: Optional[str] = None
    source: str = 'Google'  # Google | Manual | QR | (google location name)
    published: bool = True
    order: int = 0
    # QR/customer submissions
    order_number: Optional[str] = None
    product_id: Optional[str] = None
    email: Optional[str] = None
    photos: List[str] = []
    verified: bool = False
    # Google sync fields
    google_place_id: Optional[str] = None
    google_review_id: Optional[str] = None
    google_location_id: Optional[str] = None  # our internal location id
    reply_text: Optional[str] = None
    created_at: datetime = Field(default_factory=_now)


class ReviewCreate(BaseModel):
    name: str
    rating: int = 5
    text: str
    when: str = 'recently'
    avatar: Optional[str] = None
    source: str = 'Google'
    published: bool = True
    order: int = 0
    order_number: Optional[str] = None
    product_id: Optional[str] = None
    email: Optional[str] = None
    photos: List[str] = []


class ReviewUpdate(BaseModel):
    name: Optional[str] = None
    rating: Optional[int] = None
    text: Optional[str] = None
    when: Optional[str] = None
    avatar: Optional[str] = None
    source: Optional[str] = None
    published: Optional[bool] = None
    order: Optional[int] = None


# ---------- Coupons ----------
class Coupon(BaseModel):
    id: str = Field(default_factory=lambda: _uid('c_'))
    code: str  # uppercase
    kind: str = 'percent'  # percent | flat
    value: int = 10  # percent (1-100) or flat rupees
    min_subtotal: int = 0
    max_discount: Optional[int] = None
    expires_at: Optional[datetime] = None
    usage_limit: Optional[int] = None
    used_count: int = 0
    active: bool = True
    created_at: datetime = Field(default_factory=_now)


class CouponCreate(BaseModel):
    code: str
    kind: str = 'percent'
    value: int = 10
    min_subtotal: int = 0
    max_discount: Optional[int] = None
    expires_at: Optional[datetime] = None
    usage_limit: Optional[int] = None
    active: bool = True


class CouponUpdate(BaseModel):
    code: Optional[str] = None
    kind: Optional[str] = None
    value: Optional[int] = None
    min_subtotal: Optional[int] = None
    max_discount: Optional[int] = None
    expires_at: Optional[datetime] = None
    usage_limit: Optional[int] = None
    active: Optional[bool] = None


class CouponValidate(BaseModel):
    code: str
    subtotal: int


# ---------- Shipping Rules & Tax Rates (Phase B) ----------
class ShippingRule(BaseModel):
    id: str = Field(default_factory=lambda: _uid('sr_'))
    name: str
    kind: str = 'flat'  # 'flat' | 'free' | 'pickup' | 'express'
    price: int = 0
    min_subtotal: int = 0  # for free shipping / free-over-N
    max_weight_grams: Optional[int] = None
    eta_days: str = '3-5'
    states: List[str] = []  # if empty, applies to all
    pincodes: List[str] = []  # optional pincode allowlist
    pickup_address: Optional[str] = None  # for kind='pickup'
    active: bool = True
    order: int = 0
    created_at: datetime = Field(default_factory=_now)


class ShippingRuleCreate(BaseModel):
    name: str
    kind: str = 'flat'
    price: int = 0
    min_subtotal: int = 0
    max_weight_grams: Optional[int] = None
    eta_days: str = '3-5'
    states: List[str] = []
    pincodes: List[str] = []
    pickup_address: Optional[str] = None
    active: bool = True
    order: int = 0


class TaxRate(BaseModel):
    id: str = Field(default_factory=lambda: _uid('tx_'))
    name: str  # 'GST 18%', 'GST 12%'
    percent: float = 18.0
    scope: str = 'all'  # 'all' | 'category' | 'product'
    category_id: Optional[str] = None
    active: bool = True
    order: int = 0
    created_at: datetime = Field(default_factory=_now)


class TaxRateCreate(BaseModel):
    name: str
    percent: float = 18.0
    scope: str = 'all'
    category_id: Optional[str] = None
    active: bool = True
    order: int = 0



# ---------- Orders ----------
class ShippingAddress(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    line1: str
    line2: Optional[str] = None
    city: str
    state: str
    pincode: str
    country: str = 'India'


class OrderItem(BaseModel):
    product_id: str
    variant_id: Optional[str] = None
    variant_label: Optional[str] = None  # 'Size: M, Color: Black'
    name: str
    image: str
    price: int
    qty: int
    verse: Optional[str] = None
    customization: Optional[str] = None
    sku: Optional[str] = None
    product_type: str = 'physical'


class Order(BaseModel):
    id: str = Field(default_factory=lambda: _uid('o_'))
    order_number: str  # WTH-YYYYMMDD-XXXX
    items: List[OrderItem]
    shipping_address: ShippingAddress
    subtotal: int
    discount: int = 0
    coupon_code: Optional[str] = None
    shipping_fee: int = 0
    shipping_option_id: Optional[str] = None
    shipping_option_name: Optional[str] = None
    tax: int = 0
    tax_breakdown: List[dict] = []  # [{name, percent, amount}]
    total: int
    status: str = 'pending'  # pending | paid | shipped | delivered | cancelled | refunded
    payment_status: str = 'unpaid'  # unpaid | paid | refunded | failed
    payment_provider: str = 'razorpay'  # razorpay | stripe | paypal | cod
    payment_reference: Optional[str] = None
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    stripe_session_id: Optional[str] = None
    paypal_order_id: Optional[str] = None
    shiprocket_awb: Optional[str] = None
    shiprocket_shipment_id: Optional[str] = None
    tracking_url: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)


class OrderCreate(BaseModel):
    items: List[OrderItem]
    shipping_address: ShippingAddress
    coupon_code: Optional[str] = None
    shipping_option_id: Optional[str] = None
    payment_provider: str = 'razorpay'
    notes: Optional[str] = None


class OrderStatusUpdate(BaseModel):
    status: Optional[str] = None
    payment_status: Optional[str] = None
    shiprocket_awb: Optional[str] = None
    shiprocket_shipment_id: Optional[str] = None
    tracking_url: Optional[str] = None
    notes: Optional[str] = None


# ---------- SEO ----------
class SeoMeta(BaseModel):
    id: str = Field(default_factory=lambda: _uid('seo_'))
    path: str  # e.g. '/', '/shop', '/product/p1'
    title: str
    description: str
    keywords: Optional[str] = None
    og_image: Optional[str] = None
    canonical: Optional[str] = None
    robots: str = 'index,follow'
    updated_at: datetime = Field(default_factory=_now)


class SeoMetaCreate(BaseModel):
    path: str
    title: str
    description: str
    keywords: Optional[str] = None
    og_image: Optional[str] = None
    canonical: Optional[str] = None
    robots: str = 'index,follow'


class Redirect(BaseModel):
    id: str = Field(default_factory=lambda: _uid('rd_'))
    from_path: str
    to_path: str
    code: int = 301
    active: bool = True
    created_at: datetime = Field(default_factory=_now)


class RedirectCreate(BaseModel):
    from_path: str
    to_path: str
    code: int = 301
    active: bool = True


# ---------- Newsletter ----------
class Newsletter(BaseModel):
    id: str = Field(default_factory=lambda: _uid('n_'))
    email: EmailStr
    created_at: datetime = Field(default_factory=_now)


class NewsletterCreate(BaseModel):
    email: EmailStr


# ---------- Emails & Abandoned Carts (Phase C) ----------
class EmailOutbox(BaseModel):
    id: str = Field(default_factory=lambda: _uid('em_'))
    to: str
    subject: str
    template: str  # order_placed | order_paid | order_shipped | order_refunded | abandoned_cart | welcome
    html: str
    context: dict = {}
    status: str = 'mocked'  # queued | sent | failed | mocked
    provider: str = 'mock'  # 'mock' | 'gmail' | 'smtp'
    order_number: Optional[str] = None
    error: Optional[str] = None
    created_at: datetime = Field(default_factory=_now)
    sent_at: Optional[datetime] = None


class AbandonedCart(BaseModel):
    id: str = Field(default_factory=lambda: _uid('ab_'))
    email: str
    name: Optional[str] = None
    items: List[dict] = []
    subtotal: int = 0
    recovered: bool = False
    recovery_email_sent: bool = False
    updated_at: datetime = Field(default_factory=_now)
    created_at: datetime = Field(default_factory=_now)


class AbandonedCartTrack(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    items: List[dict] = []
    subtotal: int = 0


class RefundRequest(BaseModel):
    reason: Optional[str] = None
    amount: Optional[int] = None  # None = full refund



# ---------- Store Locations ----------
class Location(BaseModel):
    id: str = Field(default_factory=lambda: _uid('loc_'))
    label: str  # e.g. "Design Center", "Registered Office"
    name: Optional[str] = None  # optional care-of / brand line
    address_lines: List[str] = []  # street lines
    city: str
    state: Optional[str] = None
    pincode: Optional[str] = None
    country: str = 'India'
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    hours: Optional[str] = None  # freeform e.g. "Mon–Sat, 10am–7pm IST"
    map_url: Optional[str] = None  # google maps link/embed
    lat: Optional[float] = None
    lng: Optional[float] = None
    is_primary: bool = False
    active: bool = True
    order: int = 0
    created_at: datetime = Field(default_factory=_now)


class LocationCreate(BaseModel):
    label: str
    name: Optional[str] = None
    address_lines: List[str] = []
    city: str
    state: Optional[str] = None
    pincode: Optional[str] = None
    country: str = 'India'
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    hours: Optional[str] = None
    map_url: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    is_primary: bool = False
    active: bool = True
    order: int = 0



# ---------- Blog ----------
class BlogPost(BaseModel):
    id: str = Field(default_factory=lambda: _uid('bp_'))
    slug: str
    title: str
    excerpt: Optional[str] = None
    content: str = ''  # HTML/Markdown
    cover_image: Optional[str] = None
    author: str = 'Wear The Hope'
    author_avatar: Optional[str] = None
    tags: List[str] = []
    published: bool = False
    featured: bool = False
    read_minutes: int = 4
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    published_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)


class BlogPostCreate(BaseModel):
    slug: str
    title: str
    excerpt: Optional[str] = None
    content: str = ''
    cover_image: Optional[str] = None
    author: str = 'Wear The Hope'
    author_avatar: Optional[str] = None
    tags: List[str] = []
    published: bool = False
    featured: bool = False
    read_minutes: int = 4
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None


# ---------- Instagram Feed (curated / mocked) ----------
class InstagramPost(BaseModel):
    id: str = Field(default_factory=lambda: _uid('ig_'))
    caption: str = ''
    image: str  # cover/image URL
    permalink: Optional[str] = None  # link to instagram post
    likes: int = 0
    comments: int = 0
    posted_at: Optional[datetime] = None
    product_ids: List[str] = []  # for shoppable tags
    active: bool = True
    order: int = 0
    created_at: datetime = Field(default_factory=_now)


class InstagramPostCreate(BaseModel):
    caption: str = ''
    image: str
    permalink: Optional[str] = None
    likes: int = 0
    comments: int = 0
    posted_at: Optional[datetime] = None
    product_ids: List[str] = []
    active: bool = True
    order: int = 0


# ---------- Analytics events (mocked GA / FB Pixel) ----------
class AnalyticsEvent(BaseModel):
    id: str = Field(default_factory=lambda: _uid('ev_'))
    name: str  # page_view | add_to_cart | begin_checkout | purchase | view_item
    path: Optional[str] = None
    referrer: Optional[str] = None
    session_id: Optional[str] = None
    user_agent: Optional[str] = None
    value: Optional[float] = None  # e.g. cart value or order total
    currency: str = 'INR'
    product_id: Optional[str] = None
    order_number: Optional[str] = None
    context: dict = {}
    created_at: datetime = Field(default_factory=_now)


class AnalyticsEventCreate(BaseModel):
    name: str
    path: Optional[str] = None
    referrer: Optional[str] = None
    session_id: Optional[str] = None
    value: Optional[float] = None
    product_id: Optional[str] = None
    order_number: Optional[str] = None
    context: dict = {}


# ---------- Google Sheets import ----------
class SheetsImportRequest(BaseModel):
    url: str  # public Google Sheet URL (any edit/view/csv variant)

# ---------- QR review token ----------
class QRReviewToken(BaseModel):
    id: str = Field(default_factory=lambda: _uid('qr_'))
    token: str  # unique short token used in /r/{token}
    order_number: Optional[str] = None
    product_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    used: bool = False
    used_at: Optional[datetime] = None
    review_id: Optional[str] = None
    expires_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=_now)


class QRTokenCreate(BaseModel):
    order_number: Optional[str] = None
    product_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    expires_days: int = 90


class QRReviewSubmission(BaseModel):
    name: str
    rating: int
    text: str
    email: Optional[str] = None
    photos: List[str] = []


# ---------- Google Business Location ----------
class GoogleBusinessLocation(BaseModel):
    id: str = Field(default_factory=lambda: _uid('gbl_'))
    label: str  # human name, e.g. "Mumbai Design Center"
    place_id: str  # Google Places ID
    address: Optional[str] = None
    map_url: Optional[str] = None
    rating: Optional[float] = None
    review_count: int = 0
    last_synced_at: Optional[datetime] = None
    auto_publish: bool = True  # publish pulled reviews automatically
    min_rating_to_publish: int = 4
    active: bool = True
    order: int = 0
    created_at: datetime = Field(default_factory=_now)


class GoogleBusinessLocationCreate(BaseModel):
    label: str
    place_id: str
    address: Optional[str] = None
    map_url: Optional[str] = None
    auto_publish: bool = True
    min_rating_to_publish: int = 4
    active: bool = True
    order: int = 0

