#!/usr/bin/env python3
"""Focused API verification for subcategory feature (iteration 16).

Tests only the user-reported Category -> Subcategory -> Storefront/Admin data flow.
Creates isolated QA categories/products and removes them at the end.
"""

import json
import os
import sys
import time
from typing import Any, Dict, List

import requests


BASE = os.environ.get("TEST_BASE_URL", "https://wear-interactive.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"
TOKEN = os.environ.get("ADMIN_TOKEN", "sess_test_1786690077689")
HEADERS = {"Authorization": f"Bearer {TOKEN}"}
OUT = "/app/test_reports/api_subcategory_results_iteration16.json"


results: List[Dict[str, Any]] = []
created = {"products": [], "subcategories": [], "categories": []}


def record(name: str, passed: bool, detail: Any = None):
    results.append({"name": name, "passed": bool(passed), "detail": detail})
    print(("PASS" if passed else "FAIL") + f" - {name}: {detail}")


def req(method: str, path: str, *, auth=True, expected=None, **kwargs):
    headers = kwargs.pop("headers", {})
    if auth:
        headers = {**headers, **HEADERS}
    r = requests.request(method, f"{API}{path}", headers=headers, timeout=20, **kwargs)
    try:
        body = r.json()
    except Exception:
        body = r.text
    if expected is not None and r.status_code != expected:
        record(f"HTTP {method} {path} expected {expected}", False, {"status": r.status_code, "body": body})
    return r.status_code, body


def assert_true(name: str, cond: bool, detail: Any = None):
    record(name, cond, detail)


def cleanup():
    # Delete products first so subcategory/category guards no longer apply.
    for pid in reversed(created["products"]):
        try:
            req("DELETE", f"/admin/products/{pid}", expected=200)
        except Exception as e:
            record(f"cleanup product {pid}", False, str(e))
    for sid in reversed(created["subcategories"]):
        try:
            req("DELETE", f"/admin/subcategories/{sid}")
        except Exception as e:
            record(f"cleanup subcategory {sid}", False, str(e))
    for cid in reversed(created["categories"]):
        try:
            req("DELETE", f"/admin/categories/{cid}")
        except Exception as e:
            record(f"cleanup category {cid}", False, str(e))


def main():
    ts = int(time.time())
    try:
        # Auth smoke test.
        status, me = req("GET", "/auth/me", expected=200)
        assert_true("admin bearer token is accepted", status == 200 and me.get("role") == "admin", me)

        # Existing seeded storefront data for the exact approved mockup route.
        status, cats = req("GET", "/categories", auth=False, expected=200)
        drinkware = next((c for c in cats if c.get("slug") == "drinkware"), None) if isinstance(cats, list) else None
        assert_true("seed category drinkware exists", bool(drinkware), drinkware)
        if drinkware:
            status, subs = req("GET", "/subcategories", auth=False, params={"category": "drinkware"}, expected=200)
            mugs = next((s for s in subs if s.get("slug") == "mugs"), None) if isinstance(subs, list) else None
            assert_true("public /subcategories?category=drinkware includes active Mugs with product_count", bool(mugs) and isinstance(mugs.get("product_count"), int), mugs)
            status, mug_detail = req("GET", "/subcategories/mugs", auth=False, params={"category": "drinkware"}, expected=200)
            assert_true("public /subcategories/mugs embeds Drinkware parent", status == 200 and mug_detail.get("category", {}).get("slug") == "drinkware" and isinstance(mug_detail.get("product_count"), int), mug_detail)
            status, mug_products = req("GET", "/products", auth=False, params={"category": "drinkware", "subcategory": "mugs", "limit": 100}, expected=200)
            items = mug_products.get("items", []) if isinstance(mug_products, dict) else []
            assert_true("public /products?category=drinkware&subcategory=mugs returns only Mugs products with enrichment", len(items) >= 1 and all(p.get("subcategory_slug") == "mugs" and p.get("subcategory_name") for p in items), {"total": mug_products.get("total"), "items": [{"id": p.get("id"), "sub": p.get("subcategory_slug")} for p in items]})

        # Isolated CRUD/validation setup.
        cat_payload = {"name": f"QA Subcategory Parent {ts}", "slug": f"qa-subcat-parent-{ts}", "tagline": "QA parent", "image": "", "order": 9000}
        status, cat = req("POST", "/admin/categories", json=cat_payload, expected=200)
        assert_true("created isolated parent category", status == 200 and cat.get("id"), cat)
        cid = cat["id"]
        created["categories"].append(cid)

        status, other_cat = req("POST", "/admin/categories", json={"name": f"QA Other Parent {ts}", "slug": f"qa-other-parent-{ts}", "tagline": "", "image": "", "order": 9001}, expected=200)
        other_cid = other_cat.get("id")
        created["categories"].append(other_cid)

        sub1_payload = {"name": "QA Mugs", "slug": f"qa-mugs-{ts}", "image": "https://images.unsplash.com/photo-1514228742587-6b1558fcf93a?w=800", "title": "QA Ceramic Mugs", "description": "QA description for mugs", "order": 1, "active": True}
        status, sub1 = req("POST", f"/admin/categories/{cid}/subcategories", json=sub1_payload, expected=200)
        assert_true("POST creates subcategory with fields and product_count=0", status == 200 and sub1.get("id") and sub1.get("category_id") == cid and sub1.get("product_count") == 0, sub1)
        sid1 = sub1["id"]
        created["subcategories"].append(sid1)

        status, unauth = req("POST", f"/admin/categories/{cid}/subcategories", auth=False, json={**sub1_payload, "slug": f"unauth-{ts}"})
        assert_true("POST subcategory requires admin auth", status == 401, {"status": status, "body": unauth})

        status, duplicate = req("POST", f"/admin/categories/{cid}/subcategories", json={**sub1_payload, "name": "Duplicate"})
        assert_true("POST duplicate slug under same parent returns 400", status == 400, duplicate)

        status, sub2 = req("POST", f"/admin/categories/{cid}/subcategories", json={"name": "QA Tumblers", "slug": f"qa-tumblers-{ts}", "image": "", "title": "QA Tumblers", "description": "Second sub", "order": 2, "active": True}, expected=200)
        sid2 = sub2.get("id")
        created["subcategories"].append(sid2)

        status, inactive = req("POST", f"/admin/categories/{cid}/subcategories", json={"name": "QA Hidden", "slug": f"qa-hidden-{ts}", "image": "", "title": "Hidden", "description": "Should not be public", "order": 3, "active": False}, expected=200)
        sid_hidden = inactive.get("id")
        created["subcategories"].append(sid_hidden)

        status, public_subs = req("GET", "/subcategories", auth=False, params={"category": cat_payload["slug"]}, expected=200)
        public_slugs = [s.get("slug") for s in public_subs]
        assert_true("GET /subcategories?category returns only active children", sub1_payload["slug"] in public_slugs and sub2.get("slug") in public_slugs and inactive.get("slug") not in public_slugs and all("product_count" in s for s in public_subs), public_subs)

        status, sub_detail = req("GET", f"/subcategories/{sub1_payload['slug']}", auth=False, params={"category": cat_payload["slug"]}, expected=200)
        assert_true("GET /subcategories/{slug}?category embeds parent and product_count", status == 200 and sub_detail.get("category", {}).get("id") == cid and "product_count" in sub_detail, sub_detail)

        status, patch_dup = req("PATCH", f"/admin/subcategories/{sid2}", json={"slug": sub1_payload["slug"]})
        assert_true("PATCH duplicate slug in same parent returns 400", status == 400, patch_dup)

        updated_slug = f"qa-mugs-updated-{ts}"
        status, patched = req("PATCH", f"/admin/subcategories/{sid1}", json={"category_id": other_cid, "slug": updated_slug, "name": "QA Mugs Updated", "title": "Updated headline", "description": "Updated body", "active": True, "order": 4}, expected=200)
        assert_true("PATCH updates fields but cannot reparent", status == 200 and patched.get("category_id") == cid and patched.get("slug") == updated_slug and patched.get("title") == "Updated headline", patched)

        product_payload = {
            "name": f"QA Subcategory Product {ts}",
            "slug": f"qa-subcategory-product-{ts}",
            "category": cid,
            "subcategory": sid1,
            "collections": [],
            "price": 999,
            "original_price": 1299,
            "image": "https://images.unsplash.com/photo-1514228742587-6b1558fcf93a?w=800",
            "hover_image": "",
            "gallery": [],
            "videos": [],
            "verse": "QA",
            "tag": "",
            "ribbon": "",
            "colors": [],
            "description": "QA product assigned to subcategory",
            "stock": 5,
            "sku": f"QA-SUB-{ts}",
            "active": True,
            "product_type": "physical",
            "digital_file_url": "",
            "weight_grams": 500,
            "personalization_enabled": False,
            "personalization_label": "Personalize (optional)",
            "personalization_cost": 0,
            "personalization_max_length": 40,
            "variant_options": [],
            "variants": [],
            "seo_title": "",
            "seo_description": "",
            "seo_keywords": "",
        }
        status, product = req("POST", "/admin/products", json=product_payload, expected=200)
        pid = product.get("id")
        created["products"].append(pid)
        assert_true("admin product can be created with subcategory", status == 200 and product.get("subcategory") == sid1, product)

        status, filtered = req("GET", "/products", auth=False, params={"category": cat_payload["slug"], "subcategory": updated_slug, "limit": 100}, expected=200)
        filt_items = filtered.get("items", []) if isinstance(filtered, dict) else []
        assert_true("GET /products category+subcategory filters and enriches product", filtered.get("total") == 1 and filt_items[0].get("id") == pid and filt_items[0].get("subcategory_slug") == updated_slug and filt_items[0].get("subcategory_name") == "QA Mugs Updated", filtered)

        status, product_patched = req("PATCH", f"/admin/products/{pid}", json={"subcategory": sid2}, expected=200)
        assert_true("PATCH /admin/products/{pid} persists subcategory id", status == 200 and product_patched.get("subcategory") == sid2, product_patched)

        status, filtered2 = req("GET", "/products", auth=False, params={"category": cat_payload["slug"], "subcategory": sub2.get("slug"), "limit": 100}, expected=200)
        items2 = filtered2.get("items", []) if isinstance(filtered2, dict) else []
        assert_true("product moved to second subcategory is reflected in public filter", filtered2.get("total") == 1 and items2[0].get("subcategory_slug") == sub2.get("slug"), filtered2)

        status, public_subs_after_product = req("GET", "/subcategories", auth=False, params={"category": cat_payload["slug"]}, expected=200)
        s2_pub = next((s for s in public_subs_after_product if s.get("id") == sid2), {})
        assert_true("public subcategory product_count reflects linked active product", s2_pub.get("product_count") == 1, s2_pub)

        status, delete_linked = req("DELETE", f"/admin/subcategories/{sid2}")
        assert_true("DELETE linked subcategory returns 400", status == 400 and "product" in str(delete_linked).lower(), delete_linked)

        # Separate category delete guard with no products, only a subcategory, to prove subcategory-specific block.
        status, guard_cat = req("POST", "/admin/categories", json={"name": f"QA Guard Parent {ts}", "slug": f"qa-guard-parent-{ts}", "tagline": "", "image": "", "order": 9002}, expected=200)
        guard_cid = guard_cat.get("id")
        created["categories"].append(guard_cid)
        status, guard_sub = req("POST", f"/admin/categories/{guard_cid}/subcategories", json={"name": "QA Guard Sub", "slug": f"qa-guard-sub-{ts}", "active": True}, expected=200)
        guard_sid = guard_sub.get("id")
        created["subcategories"].append(guard_sid)
        status, delete_cat_with_sub = req("DELETE", f"/admin/categories/{guard_cid}")
        assert_true("DELETE category with subcategories and no products returns 400", status == 400 and "subcategor" in str(delete_cat_with_sub).lower(), delete_cat_with_sub)

    finally:
        cleanup()
        passed = sum(1 for r in results if r["passed"])
        output = {"base": BASE, "passed": passed, "total": len(results), "results": results}
        with open(OUT, "w", encoding="utf-8") as f:
            json.dump(output, f, indent=2)
        print(f"Wrote {OUT}")
        if passed != len(results):
            sys.exit(1)


if __name__ == "__main__":
    main()