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
    source: str = 'Google'
    published: bool = True
    order: int = 0
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
    total: int
    status: str = 'pending'  # pending | paid | shipped | delivered | cancelled | refunded
    payment_status: str = 'unpaid'  # unpaid | paid | refunded | failed
    payment_provider: str = 'razorpay'
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
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
