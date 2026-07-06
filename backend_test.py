#!/usr/bin/env python3
"""
Comprehensive backend test for Wear The Hope API
Tests all endpoints including auth-gated admin routes
"""
import requests
import json
import subprocess
import sys
from datetime import datetime

# Base URL from frontend/.env
BASE_URL = "https://wear-interactive.preview.emergentagent.com/api"
DB_NAME = "test_database"

# Test results tracking
results = {
    "passed": [],
    "failed": [],
    "total": 0
}

def log_test(name, passed, details=""):
    """Log test result"""
    results["total"] += 1
    if passed:
        results["passed"].append(name)
        print(f"✅ PASS: {name}")
    else:
        results["failed"].append({"name": name, "details": details})
        print(f"❌ FAIL: {name}")
        if details:
            print(f"   Details: {details}")

def test_health():
    """Test 1: Health check"""
    try:
        resp = requests.get(f"{BASE_URL}/", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("ok") == True:
                log_test("Health check GET /api/", True)
                return True
            else:
                log_test("Health check GET /api/", False, f"Response missing ok:true - {data}")
                return False
        else:
            log_test("Health check GET /api/", False, f"Status {resp.status_code}: {resp.text}")
            return False
    except Exception as e:
        log_test("Health check GET /api/", False, str(e))
        return False

def test_categories():
    """Test 2: Categories endpoint"""
    try:
        resp = requests.get(f"{BASE_URL}/categories", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list) and len(data) == 10:
                # Check for jewellery and wall-frames with coming_soon=true
                jewellery = next((c for c in data if c.get("slug") == "jewellery"), None)
                wall_frames = next((c for c in data if c.get("slug") == "wall-frames"), None)
                
                issues = []
                if not jewellery:
                    issues.append("jewellery category not found")
                elif not jewellery.get("coming_soon"):
                    issues.append("jewellery should have coming_soon=true")
                
                if not wall_frames:
                    issues.append("wall-frames category not found")
                elif not wall_frames.get("coming_soon"):
                    issues.append("wall-frames should have coming_soon=true")
                
                if issues:
                    log_test("GET /api/categories", False, "; ".join(issues))
                    return False
                else:
                    log_test("GET /api/categories", True)
                    return True
            else:
                log_test("GET /api/categories", False, f"Expected 10 categories, got {len(data) if isinstance(data, list) else 'non-list'}")
                return False
        else:
            log_test("GET /api/categories", False, f"Status {resp.status_code}: {resp.text}")
            return False
    except Exception as e:
        log_test("GET /api/categories", False, str(e))
        return False

def test_products():
    """Test 3: Products endpoint"""
    try:
        # Test basic products list
        resp = requests.get(f"{BASE_URL}/products", timeout=10)
        if resp.status_code != 200:
            log_test("GET /api/products", False, f"Status {resp.status_code}: {resp.text}")
            return None
        
        data = resp.json()
        if not isinstance(data, dict) or "items" not in data or "total" not in data:
            log_test("GET /api/products", False, f"Expected {{items, total}}, got {data}")
            return None
        
        items = data["items"]
        if len(items) != 12:
            log_test("GET /api/products", False, f"Expected 12 products, got {len(items)}")
            return None
        
        # Check enrichment
        first_item = items[0]
        if "category_slug" not in first_item or "category_name" not in first_item:
            log_test("GET /api/products", False, "Products missing category_slug or category_name enrichment")
            return None
        
        log_test("GET /api/products", True)
        
        # Test category filter
        resp = requests.get(f"{BASE_URL}/products?category=drinkware", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            items = data.get("items", [])
            if all(item.get("category_slug") == "drinkware" for item in items):
                log_test("GET /api/products?category=drinkware", True)
            else:
                log_test("GET /api/products?category=drinkware", False, "Not all items are drinkware")
        else:
            log_test("GET /api/products?category=drinkware", False, f"Status {resp.status_code}")
        
        # Test search
        resp = requests.get(f"{BASE_URL}/products?q=wallet", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            items = data.get("items", [])
            if any("wallet" in item.get("name", "").lower() for item in items):
                log_test("GET /api/products?q=wallet", True)
            else:
                log_test("GET /api/products?q=wallet", False, "No wallet product found")
        else:
            log_test("GET /api/products?q=wallet", False, f"Status {resp.status_code}")
        
        # Test sort
        resp = requests.get(f"{BASE_URL}/products?sort=price-asc", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            items = data.get("items", [])
            prices = [item.get("price", 0) for item in items]
            if prices == sorted(prices):
                log_test("GET /api/products?sort=price-asc", True)
            else:
                log_test("GET /api/products?sort=price-asc", False, f"Prices not sorted: {prices}")
        else:
            log_test("GET /api/products?sort=price-asc", False, f"Status {resp.status_code}")
        
        return items[0] if items else None
        
    except Exception as e:
        log_test("GET /api/products", False, str(e))
        return None

def test_product_detail(product_id):
    """Test 4: Product detail endpoint"""
    try:
        # Test by ID
        resp = requests.get(f"{BASE_URL}/products/{product_id}", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "product" in data and "related" in data:
                log_test(f"GET /api/products/{product_id}", True)
                
                # Test by slug if available
                slug = data["product"].get("slug")
                if slug:
                    resp2 = requests.get(f"{BASE_URL}/products/{slug}", timeout=10)
                    if resp2.status_code == 200:
                        log_test(f"GET /api/products/{slug} (by slug)", True)
                    else:
                        log_test(f"GET /api/products/{slug} (by slug)", False, f"Status {resp2.status_code}")
                return True
            else:
                log_test(f"GET /api/products/{product_id}", False, "Missing product or related field")
                return False
        else:
            log_test(f"GET /api/products/{product_id}", False, f"Status {resp.status_code}: {resp.text}")
            return False
    except Exception as e:
        log_test(f"GET /api/products/{product_id}", False, str(e))
        return False

def test_reviews():
    """Test 5: Reviews endpoint"""
    try:
        resp = requests.get(f"{BASE_URL}/reviews", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list) and len(data) == 6:
                # Check all are published and sorted by order
                all_published = all(r.get("published") == True for r in data)
                orders = [r.get("order", 999) for r in data]
                sorted_by_order = orders == sorted(orders)
                
                if all_published and sorted_by_order:
                    log_test("GET /api/reviews", True)
                    return True
                else:
                    issues = []
                    if not all_published:
                        issues.append("not all reviews published")
                    if not sorted_by_order:
                        issues.append(f"not sorted by order: {orders}")
                    log_test("GET /api/reviews", False, "; ".join(issues))
                    return False
            else:
                log_test("GET /api/reviews", False, f"Expected 6 reviews, got {len(data) if isinstance(data, list) else 'non-list'}")
                return False
        else:
            log_test("GET /api/reviews", False, f"Status {resp.status_code}: {resp.text}")
            return False
    except Exception as e:
        log_test("GET /api/reviews", False, str(e))
        return False

def test_coupons():
    """Test 6: Coupon validation"""
    tests = [
        {
            "name": "HOPE10 with subtotal 1000",
            "payload": {"code": "HOPE10", "subtotal": 1000},
            "expected": {"valid": True, "discount": 100}
        },
        {
            "name": "HOPE10 with subtotal 100 (below min)",
            "payload": {"code": "HOPE10", "subtotal": 100},
            "expected": {"valid": False}
        },
        {
            "name": "FLAT100 with subtotal 1000",
            "payload": {"code": "FLAT100", "subtotal": 1000},
            "expected": {"valid": True, "discount": 100}
        },
        {
            "name": "NOPE (invalid code)",
            "payload": {"code": "NOPE", "subtotal": 1000},
            "expected": {"valid": False}
        }
    ]
    
    for test in tests:
        try:
            resp = requests.post(f"{BASE_URL}/coupons/validate", json=test["payload"], timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                passed = True
                issues = []
                
                for key, value in test["expected"].items():
                    if data.get(key) != value:
                        passed = False
                        issues.append(f"expected {key}={value}, got {data.get(key)}")
                
                if passed:
                    log_test(f"POST /api/coupons/validate - {test['name']}", True)
                else:
                    log_test(f"POST /api/coupons/validate - {test['name']}", False, "; ".join(issues))
            else:
                log_test(f"POST /api/coupons/validate - {test['name']}", False, f"Status {resp.status_code}: {resp.text}")
        except Exception as e:
            log_test(f"POST /api/coupons/validate - {test['name']}", False, str(e))

def test_orders_and_payment(product_id):
    """Test 7: Order creation and payment verification"""
    try:
        # Create order - Note: Backend expects full OrderItem structure (bug: should accept minimal data)
        # First fetch product details to build proper OrderItem
        resp_product = requests.get(f"{BASE_URL}/products/{product_id}", timeout=10)
        if resp_product.status_code != 200:
            log_test("POST /api/orders", False, f"Failed to fetch product for order: {resp_product.status_code}")
            return None
        
        product_data = resp_product.json().get("product", {})
        
        # Use qty=3 to ensure subtotal >= 500 for HOPE10 coupon (min_subtotal=500)
        order_payload = {
            "items": [
                {
                    "product_id": product_id,
                    "name": product_data.get("name", "Test Product"),
                    "image": product_data.get("image", ""),
                    "price": product_data.get("price", 500),
                    "qty": 3,
                    "verse": product_data.get("verse"),
                    "customization": None
                }
            ],
            "shipping_address": {
                "full_name": "John Doe",
                "email": "john@example.com",
                "phone": "9876543210",
                "line1": "123 Test Street",
                "line2": "",
                "city": "Mumbai",
                "state": "Maharashtra",
                "pincode": "400001",
                "country": "India"
            },
            "coupon_code": "HOPE10",
            "notes": "Test order"
        }
        
        resp = requests.post(f"{BASE_URL}/orders", json=order_payload, timeout=10)
        if resp.status_code != 200:
            log_test("POST /api/orders", False, f"Status {resp.status_code}: {resp.text}")
            return None
        
        data = resp.json()
        order = data.get("order")
        razorpay = data.get("razorpay")
        
        if not order or not razorpay:
            log_test("POST /api/orders", False, "Missing order or razorpay in response")
            return None
        
        # Verify order structure
        issues = []
        if not order.get("order_number", "").startswith("WTH-"):
            issues.append("order_number doesn't match pattern WTH-YYYYMMDD-XXXXX")
        # HOPE10 is 10% off with min 500, so discount should be ~10% of subtotal
        expected_discount = int(order.get("subtotal", 0) * 0.1)
        if order.get("discount") < expected_discount - 10 or order.get("discount") > expected_discount + 10:
            issues.append(f"discount should be ~{expected_discount} (10% of subtotal), got {order.get('discount')}")
        if order.get("subtotal") < 999 and order.get("shipping_fee") != 99:
            issues.append(f"shipping_fee should be 99 for subtotal < 999")
        elif order.get("subtotal") >= 999 and order.get("shipping_fee") != 0:
            issues.append(f"shipping_fee should be 0 for subtotal >= 999")
        if razorpay.get("mocked") != True:
            issues.append("razorpay.mocked should be true")
        
        if issues:
            log_test("POST /api/orders", False, "; ".join(issues))
            return None
        
        log_test("POST /api/orders", True)
        order_number = order["order_number"]
        
        # Test GET order
        resp = requests.get(f"{BASE_URL}/orders/{order_number}", timeout=10)
        if resp.status_code == 200:
            log_test(f"GET /api/orders/{order_number}", True)
        else:
            log_test(f"GET /api/orders/{order_number}", False, f"Status {resp.status_code}")
        
        # Test payment verification
        payment_payload = {
            "razorpay_order_id": razorpay["order_id"],
            "order_number": order_number
        }
        
        resp = requests.post(f"{BASE_URL}/payments/razorpay/verify", json=payment_payload, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("ok") == True and data.get("mocked") == True:
                order_updated = data.get("order", {})
                issues = []
                if order_updated.get("payment_status") != "paid":
                    issues.append(f"payment_status should be 'paid', got {order_updated.get('payment_status')}")
                if order_updated.get("status") != "paid":
                    issues.append(f"status should be 'paid', got {order_updated.get('status')}")
                if not order_updated.get("shiprocket_awb", "").startswith("SR"):
                    issues.append(f"shiprocket_awb should start with 'SR', got {order_updated.get('shiprocket_awb')}")
                if not order_updated.get("shiprocket_shipment_id"):
                    issues.append("shiprocket_shipment_id missing")
                if not order_updated.get("tracking_url"):
                    issues.append("tracking_url missing")
                
                if issues:
                    log_test("POST /api/payments/razorpay/verify", False, "; ".join(issues))
                else:
                    log_test("POST /api/payments/razorpay/verify", True)
            else:
                log_test("POST /api/payments/razorpay/verify", False, f"Expected ok:true, mocked:true, got {data}")
        else:
            log_test("POST /api/payments/razorpay/verify", False, f"Status {resp.status_code}: {resp.text}")
        
        return order_number
        
    except Exception as e:
        log_test("POST /api/orders", False, str(e))
        return None

def test_shipping():
    """Test 8: Shipping rates and tracking"""
    try:
        # Test shipping rates
        resp = requests.post(f"{BASE_URL}/shipping/rates", json={"pincode": "400001", "weight": 0.5}, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("mocked") == True and isinstance(data.get("rates"), list) and len(data["rates"]) == 3:
                log_test("POST /api/shipping/rates", True)
            else:
                log_test("POST /api/shipping/rates", False, f"Expected mocked:true and 3 rates, got {data}")
        else:
            log_test("POST /api/shipping/rates", False, f"Status {resp.status_code}: {resp.text}")
        
        # Test tracking
        resp = requests.get(f"{BASE_URL}/shipping/track/SR123456789", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("mocked") == True and "timeline" in data:
                log_test("GET /api/shipping/track/SR123456789", True)
            else:
                log_test("GET /api/shipping/track/SR123456789", False, f"Expected mocked:true and timeline, got {data}")
        else:
            log_test("GET /api/shipping/track/SR123456789", False, f"Status {resp.status_code}: {resp.text}")
            
    except Exception as e:
        log_test("Shipping endpoints", False, str(e))

def test_newsletter():
    """Test 9: Newsletter subscription"""
    try:
        email = f"test{datetime.now().timestamp()}@example.com"
        
        # First subscription
        resp = requests.post(f"{BASE_URL}/newsletter/subscribe", json={"email": email}, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("ok") == True and data.get("already") == False:
                log_test("POST /api/newsletter/subscribe (first time)", True)
            else:
                log_test("POST /api/newsletter/subscribe (first time)", False, f"Expected ok:true, already:false, got {data}")
        else:
            log_test("POST /api/newsletter/subscribe (first time)", False, f"Status {resp.status_code}: {resp.text}")
        
        # Second subscription (duplicate)
        resp = requests.post(f"{BASE_URL}/newsletter/subscribe", json={"email": email}, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("ok") == True and data.get("already") == True:
                log_test("POST /api/newsletter/subscribe (duplicate)", True)
            else:
                log_test("POST /api/newsletter/subscribe (duplicate)", False, f"Expected ok:true, already:true, got {data}")
        else:
            log_test("POST /api/newsletter/subscribe (duplicate)", False, f"Status {resp.status_code}: {resp.text}")
            
    except Exception as e:
        log_test("Newsletter endpoints", False, str(e))

def test_seo_sitemap_robots():
    """Test 10: SEO, sitemap, robots, redirects"""
    try:
        # Test SEO meta
        resp = requests.get(f"{BASE_URL}/seo/meta?path=/", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "title" in data:
                log_test("GET /api/seo/meta?path=/", True)
            else:
                log_test("GET /api/seo/meta?path=/", False, "Missing title in response")
        else:
            log_test("GET /api/seo/meta?path=/", False, f"Status {resp.status_code}: {resp.text}")
        
        # Test fallback
        resp = requests.get(f"{BASE_URL}/seo/meta?path=/nonexistent", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "title" in data:  # Should fallback to home meta
                log_test("GET /api/seo/meta?path=/nonexistent (fallback)", True)
            else:
                log_test("GET /api/seo/meta?path=/nonexistent (fallback)", False, "Fallback didn't return home meta")
        else:
            log_test("GET /api/seo/meta?path=/nonexistent (fallback)", False, f"Status {resp.status_code}")
        
        # Test sitemap (root level, not /api prefixed)
        resp = requests.get("https://wear-interactive.preview.emergentagent.com/sitemap.xml", timeout=10)
        if resp.status_code == 200:
            content = resp.text
            if "<urlset" in content and "xmlns" in content:
                log_test("GET /sitemap.xml", True)
            else:
                log_test("GET /sitemap.xml", False, "Invalid XML structure")
        else:
            log_test("GET /sitemap.xml", False, f"Status {resp.status_code}")
        
        # Test robots.txt
        resp = requests.get("https://wear-interactive.preview.emergentagent.com/robots.txt", timeout=10)
        if resp.status_code == 200:
            content = resp.text
            if "Sitemap:" in content and "Disallow: /admin" in content:
                log_test("GET /robots.txt", True)
            else:
                log_test("GET /robots.txt", False, "Missing Sitemap or Disallow directives")
        else:
            log_test("GET /robots.txt", False, f"Status {resp.status_code}")
        
        # Test redirects
        resp = requests.get(f"{BASE_URL}/redirects", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list):
                log_test("GET /api/redirects", True)
            else:
                log_test("GET /api/redirects", False, "Expected array")
        else:
            log_test("GET /api/redirects", False, f"Status {resp.status_code}: {resp.text}")
            
    except Exception as e:
        log_test("SEO/Sitemap/Robots endpoints", False, str(e))

def create_test_session():
    """Create a test admin session using mongosh"""
    try:
        cmd = f"""mongosh --quiet --eval "
use('{DB_NAME}');
var userId = 'admin-test-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.admin_users.insertOne({{
  user_id: userId,
  email: 'admin.test.' + Date.now() + '@example.com',
  name: 'Admin Test',
  picture: 'https://via.placeholder.com/150',
  role: 'admin',
  created_at: new Date()
}});
db.admin_sessions.insertOne({{
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
}});
print(sessionToken);
"
"""
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
        if result.returncode == 0:
            token = result.stdout.strip().split('\n')[-1]
            print(f"\n✓ Created test session token: {token}\n")
            return token
        else:
            print(f"❌ Failed to create test session: {result.stderr}")
            return None
    except Exception as e:
        print(f"❌ Failed to create test session: {e}")
        return None

def test_admin_endpoints(session_token, order_number):
    """Test 11: Admin endpoints with authentication"""
    headers = {"Authorization": f"Bearer {session_token}"}
    
    try:
        # Test /auth/me
        resp = requests.get(f"{BASE_URL}/auth/me", headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "user_id" in data and "email" in data:
                log_test("GET /api/auth/me", True)
            else:
                log_test("GET /api/auth/me", False, "Missing user fields")
        else:
            log_test("GET /api/auth/me", False, f"Status {resp.status_code}: {resp.text}")
        
        # Test admin stats
        resp = requests.get(f"{BASE_URL}/admin/stats", headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            required_fields = ["total_orders", "paid_orders", "revenue", "recent_orders"]
            if all(field in data for field in required_fields):
                log_test("GET /api/admin/stats", True)
            else:
                log_test("GET /api/admin/stats", False, f"Missing required fields")
        else:
            log_test("GET /api/admin/stats", False, f"Status {resp.status_code}: {resp.text}")
        
        # Test admin orders list
        resp = requests.get(f"{BASE_URL}/admin/orders", headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list):
                log_test("GET /api/admin/orders", True)
            else:
                log_test("GET /api/admin/orders", False, "Expected array")
        else:
            log_test("GET /api/admin/orders", False, f"Status {resp.status_code}: {resp.text}")
        
        # Test update order
        if order_number:
            resp = requests.patch(f"{BASE_URL}/admin/orders/{order_number}", 
                                json={"status": "shipped"}, headers=headers, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("status") == "shipped":
                    log_test(f"PATCH /api/admin/orders/{order_number}", True)
                else:
                    log_test(f"PATCH /api/admin/orders/{order_number}", False, "Status not updated")
            else:
                log_test(f"PATCH /api/admin/orders/{order_number}", False, f"Status {resp.status_code}")
        
        # Test coupons CRUD
        resp = requests.get(f"{BASE_URL}/admin/coupons", headers=headers, timeout=10)
        if resp.status_code == 200:
            log_test("GET /api/admin/coupons", True)
        else:
            log_test("GET /api/admin/coupons", False, f"Status {resp.status_code}")
        
        # Create coupon
        new_coupon = {
            "code": "TESTNEW",
            "kind": "percent",
            "value": 15,
            "min_subtotal": 0,
            "active": True
        }
        resp = requests.post(f"{BASE_URL}/admin/coupons", json=new_coupon, headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            coupon_id = data.get("id")
            log_test("POST /api/admin/coupons", True)
            
            # Update coupon
            resp = requests.patch(f"{BASE_URL}/admin/coupons/{coupon_id}", 
                                json={"active": False}, headers=headers, timeout=10)
            if resp.status_code == 200:
                log_test(f"PATCH /api/admin/coupons/{coupon_id}", True)
            else:
                log_test(f"PATCH /api/admin/coupons/{coupon_id}", False, f"Status {resp.status_code}")
            
            # Delete coupon
            resp = requests.delete(f"{BASE_URL}/admin/coupons/{coupon_id}", headers=headers, timeout=10)
            if resp.status_code == 200:
                log_test(f"DELETE /api/admin/coupons/{coupon_id}", True)
            else:
                log_test(f"DELETE /api/admin/coupons/{coupon_id}", False, f"Status {resp.status_code}")
        else:
            log_test("POST /api/admin/coupons", False, f"Status {resp.status_code}: {resp.text}")
        
        # Test reviews CRUD
        new_review = {
            "name": "Test Reviewer",
            "text": "Great product!",
            "rating": 5,
            "published": True,
            "order": 999
        }
        resp = requests.post(f"{BASE_URL}/admin/reviews", json=new_review, headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            review_id = data.get("id")
            log_test("POST /api/admin/reviews", True)
            
            # Update review
            resp = requests.patch(f"{BASE_URL}/admin/reviews/{review_id}", 
                                json={"published": False}, headers=headers, timeout=10)
            if resp.status_code == 200:
                log_test(f"PATCH /api/admin/reviews/{review_id}", True)
            else:
                log_test(f"PATCH /api/admin/reviews/{review_id}", False, f"Status {resp.status_code}")
            
            # Delete review
            resp = requests.delete(f"{BASE_URL}/admin/reviews/{review_id}", headers=headers, timeout=10)
            if resp.status_code == 200:
                log_test(f"DELETE /api/admin/reviews/{review_id}", True)
            else:
                log_test(f"DELETE /api/admin/reviews/{review_id}", False, f"Status {resp.status_code}")
        else:
            log_test("POST /api/admin/reviews", False, f"Status {resp.status_code}: {resp.text}")
        
        # Test SEO CRUD
        new_seo = {
            "path": "/test-page",
            "title": "Test Page",
            "description": "Test description"
        }
        resp = requests.post(f"{BASE_URL}/admin/seo", json=new_seo, headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            seo_id = data.get("id")
            log_test("POST /api/admin/seo", True)
            
            # Update SEO
            resp = requests.patch(f"{BASE_URL}/admin/seo/{seo_id}", 
                                json={"title": "Updated Test Page"}, headers=headers, timeout=10)
            if resp.status_code == 200:
                log_test(f"PATCH /api/admin/seo/{seo_id}", True)
            else:
                log_test(f"PATCH /api/admin/seo/{seo_id}", False, f"Status {resp.status_code}")
            
            # Delete SEO
            resp = requests.delete(f"{BASE_URL}/admin/seo/{seo_id}", headers=headers, timeout=10)
            if resp.status_code == 200:
                log_test(f"DELETE /api/admin/seo/{seo_id}", True)
            else:
                log_test(f"DELETE /api/admin/seo/{seo_id}", False, f"Status {resp.status_code}")
        else:
            log_test("POST /api/admin/seo", False, f"Status {resp.status_code}: {resp.text}")
        
        # Test newsletter list
        resp = requests.get(f"{BASE_URL}/admin/newsletter", headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list):
                log_test("GET /api/admin/newsletter", True)
            else:
                log_test("GET /api/admin/newsletter", False, "Expected array")
        else:
            log_test("GET /api/admin/newsletter", False, f"Status {resp.status_code}: {resp.text}")
        
        # Test without auth header
        resp = requests.get(f"{BASE_URL}/admin/stats", timeout=10)
        if resp.status_code == 401:
            log_test("GET /api/admin/* without auth returns 401", True)
        else:
            log_test("GET /api/admin/* without auth returns 401", False, f"Expected 401, got {resp.status_code}")
            
    except Exception as e:
        log_test("Admin endpoints", False, str(e))

def test_auth_invalid_session():
    """Test 12: Auth with invalid session_id"""
    try:
        resp = requests.post(f"{BASE_URL}/auth/session", 
                           json={"session_id": "garbage_invalid_session"}, timeout=10)
        if resp.status_code == 401 or resp.status_code == 400:
            log_test("POST /api/auth/session with invalid session_id returns error", True)
        else:
            log_test("POST /api/auth/session with invalid session_id returns error", False, 
                    f"Expected 401/400, got {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("POST /api/auth/session with invalid session_id", False, str(e))

def main():
    print("=" * 80)
    print("WEAR THE HOPE BACKEND API TEST")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"DB Name: {DB_NAME}")
    print("=" * 80)
    print()
    
    # Run tests
    test_health()
    test_categories()
    product = test_products()
    
    if product:
        product_id = product.get("id")
        test_product_detail(product_id)
    else:
        print("⚠️  Skipping product detail test (no products found)")
        product_id = None
    
    test_reviews()
    test_coupons()
    
    order_number = None
    if product_id:
        order_number = test_orders_and_payment(product_id)
    else:
        print("⚠️  Skipping order tests (no product ID)")
    
    test_shipping()
    test_newsletter()
    test_seo_sitemap_robots()
    
    # Admin tests require session
    print("\n" + "=" * 80)
    print("CREATING TEST ADMIN SESSION")
    print("=" * 80)
    session_token = create_test_session()
    
    if session_token:
        test_admin_endpoints(session_token, order_number)
    else:
        print("⚠️  Skipping admin tests (failed to create session)")
    
    test_auth_invalid_session()
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    print(f"Total tests: {results['total']}")
    print(f"Passed: {len(results['passed'])}")
    print(f"Failed: {len(results['failed'])}")
    print()
    
    if results['failed']:
        print("FAILED TESTS:")
        for fail in results['failed']:
            print(f"  ❌ {fail['name']}")
            if fail['details']:
                print(f"     {fail['details']}")
        print()
        sys.exit(1)
    else:
        print("✅ ALL TESTS PASSED!")
        sys.exit(0)

if __name__ == "__main__":
    main()
