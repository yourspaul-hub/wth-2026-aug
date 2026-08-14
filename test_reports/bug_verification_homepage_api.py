#!/usr/bin/env python3
"""Focused API setup/checks for homepage category/ribbon bug verification."""
import json
import os
import sys
from datetime import datetime, timezone

import requests


BASE = os.environ.get("TEST_BASE_URL", "https://wear-interactive.preview.emergentagent.com").rstrip("/")
TOKEN = os.environ.get("ADMIN_TOKEN", "sess_test_1786690077689")
API = f"{BASE}/api"
HEADERS = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}


def req(method, path, **kwargs):
    r = requests.request(method, f"{API}{path}", timeout=30, **kwargs)
    try:
        body = r.json()
    except Exception:
        body = r.text[:500]
    return r.status_code, body


def main():
    result = {
        "base": BASE,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "checks": [],
        "expected": {},
        "errors": [],
    }

    status, products_body = req("GET", "/products?limit=500")
    if status != 200:
        result["errors"].append({"step": "GET /products", "status": status, "body": products_body})
        print(json.dumps(result, indent=2))
        return 1
    products = products_body.get("items", []) if isinstance(products_body, dict) else []
    best = [p for p in products if p.get("ribbon") == "Best Seller"]
    new = [p for p in products if p.get("ribbon") == "New"]
    result["expected"]["best_seller_products"] = [{"id": p.get("id"), "name": p.get("name"), "ribbon": p.get("ribbon")} for p in best]
    result["expected"]["new_products"] = [{"id": p.get("id"), "name": p.get("name"), "ribbon": p.get("ribbon")} for p in new]
    result["checks"].append({
        "name": "public_products_ribbon_counts",
        "status": "pass",
        "active_product_count": len(products),
        "best_seller_count": len(best),
        "new_count": len(new),
    })

    status, categories = req("GET", "/categories")
    if status != 200 or not isinstance(categories, list):
        result["errors"].append({"step": "GET /categories before", "status": status, "body": categories})
        print(json.dumps(result, indent=2))
        return 1

    # Exact user-reported categories. Accept both Jewellery/Jewelry spelling.
    target_names = ("jewellery", "jewelry", "wall frames", "wall frame")
    targets = [c for c in categories if str(c.get("name", "")).strip().lower() in target_names]
    if not targets:
        result["errors"].append({"step": "find target categories", "available": [{"id": c.get("id"), "name": c.get("name"), "coming_soon": c.get("coming_soon")} for c in categories]})
        print(json.dumps(result, indent=2))
        return 1

    patched = []
    for c in targets:
        # If already false, first set true and then false to verify an actual off transition.
        if c.get("coming_soon") is False:
            st_true, body_true = req("PATCH", f"/admin/categories/{c['id']}", headers=HEADERS, json={"coming_soon": True})
            patched.append({"id": c["id"], "name": c.get("name"), "transition_setup_status": st_true, "transition_setup_coming_soon": body_true.get("coming_soon") if isinstance(body_true, dict) else None})
            if st_true != 200 or not isinstance(body_true, dict) or body_true.get("coming_soon") is not True:
                result["errors"].append({"step": "PATCH category true setup", "category": c, "status": st_true, "body": body_true})
                print(json.dumps(result, indent=2))
                return 1

        st_false, body_false = req("PATCH", f"/admin/categories/{c['id']}", headers=HEADERS, json={"coming_soon": False})
        patched.append({"id": c["id"], "name": c.get("name"), "off_patch_status": st_false, "off_patch_coming_soon": body_false.get("coming_soon") if isinstance(body_false, dict) else None})
        if st_false != 200 or not isinstance(body_false, dict) or body_false.get("coming_soon") is not False:
            result["errors"].append({"step": "PATCH category false", "category": c, "status": st_false, "body": body_false})
            print(json.dumps(result, indent=2))
            return 1

    status, after = req("GET", "/categories")
    if status != 200 or not isinstance(after, list):
        result["errors"].append({"step": "GET /categories after", "status": status, "body": after})
        print(json.dumps(result, indent=2))
        return 1
    after_targets = [c for c in after if c.get("id") in {t.get("id") for t in targets}]
    all_false = all(c.get("coming_soon") is False for c in after_targets)
    result["checks"].append({
        "name": "target_categories_can_be_toggled_off_and_persist",
        "status": "pass" if all_false else "fail",
        "patched": patched,
        "after_targets": [{"id": c.get("id"), "name": c.get("name"), "tagline": c.get("tagline"), "coming_soon": c.get("coming_soon")} for c in after_targets],
    })
    if not all_false:
        result["errors"].append({"step": "assert categories false after reload", "after_targets": after_targets})

    out_path = "/app/test_reports/homepage_api_evidence.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)
    print(json.dumps(result, indent=2))
    return 0 if not result["errors"] else 1


if __name__ == "__main__":
    sys.exit(main())