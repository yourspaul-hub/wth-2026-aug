#!/usr/bin/env python3
"""Focused backend verification for drag reorder endpoints.

Tests:
- Categories reorder persists and public GET order changes, then restores.
- Subcategories reorder persists scoped to parent; creates/deletes one temp subcategory if needed.
- Products reorder persists through default /products featured sort, then restores.
- Reorder endpoints reject unauthenticated requests.
"""
import json
import os
import sys
import time
from typing import Any, Dict, List

import requests


BASE_URL = os.environ.get("BACKEND_URL", "https://wear-interactive.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
TOKEN = os.environ.get("ADMIN_TOKEN", "sess_test_1786690077689")
HEADERS = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}


def req(method: str, path: str, **kwargs) -> requests.Response:
    timeout = kwargs.pop("timeout", 20)
    return requests.request(method, f"{API}{path}", timeout=timeout, **kwargs)


def assert_true(condition: bool, message: str):
    if not condition:
        raise AssertionError(message)


def ids(items: List[Dict[str, Any]]) -> List[str]:
    return [x["id"] for x in items]


def print_step(name: str, status: str, details: Any = None):
    payload = {"step": name, "status": status}
    if details is not None:
        payload["details"] = details
    print(json.dumps(payload, default=str))


def test_unauthenticated():
    endpoints = [
        ("/admin/categories/reorder", {"ids": []}),
        ("/admin/products/reorder", {"ids": []}),
    ]
    # Need a real category id for the scoped subcategory endpoint.
    cats = req("GET", "/categories").json()
    if cats:
        endpoints.append((f"/admin/categories/{cats[0]['id']}/subcategories/reorder", {"ids": []}))

    observed = []
    for path, payload in endpoints:
        r = req("POST", path, json=payload)
        observed.append({"path": path, "status": r.status_code})
        assert_true(r.status_code in (401, 403), f"{path} should require auth, got {r.status_code}: {r.text}")
    print_step("unauthenticated reorder endpoints", "passed", observed)


def test_categories_reorder():
    cats = req("GET", "/categories").json()
    assert_true(len(cats) >= 2, "Need at least 2 categories to verify reorder")
    original = ids(cats)
    mutated = original[:]
    mutated[0], mutated[1] = mutated[1], mutated[0]
    try:
        r = req("POST", "/admin/categories/reorder", headers=HEADERS, json={"ids": mutated})
        assert_true(r.status_code == 200, f"category reorder failed: {r.status_code} {r.text}")
        after = ids(req("GET", "/categories").json())
        assert_true(after[:2] == mutated[:2], f"category order did not persist: expected first2={mutated[:2]} got {after[:2]}")
        print_step("category reorder persists", "passed", {"before_first2": original[:2], "after_first2": after[:2]})
    finally:
        rr = req("POST", "/admin/categories/reorder", headers=HEADERS, json={"ids": original})
        print_step("category order restore", "ok" if rr.status_code == 200 else "failed", {"status": rr.status_code})


def ensure_two_subcategories(category_id: str, category_slug: str):
    original = req("GET", "/subcategories", params={"category": category_slug}).json()
    temp_id = None
    if len(original) >= 2:
        return original, temp_id
    payload = {
        "name": f"QA Temp Reorder {int(time.time())}",
        "slug": f"qa-temp-reorder-{int(time.time())}",
        "image": "",
        "title": "QA Temp Reorder",
        "description": "Temporary subcategory for automated reorder verification.",
        "active": True,
    }
    r = req("POST", f"/admin/categories/{category_id}/subcategories", headers=HEADERS, json=payload)
    assert_true(r.status_code == 200, f"temp subcategory create failed: {r.status_code} {r.text}")
    temp_id = r.json()["id"]
    current = req("GET", "/subcategories", params={"category": category_slug}).json()
    assert_true(len(current) >= 2, "Need at least 2 subcategories after temp create")
    return current, temp_id


def test_subcategories_reorder():
    cats = req("GET", "/categories").json()
    assert_true(cats, "Need categories to verify subcategory reorder")
    # Prefer Drinkware because the review request calls it out.
    cat = next((c for c in cats if c.get("slug") == "drinkware"), cats[0])
    original_admin = req("GET", f"/admin/categories/{cat['id']}/subcategories", headers=HEADERS).json()
    original_ids = ids(original_admin)
    temp_id = None
    try:
        subs, temp_id = ensure_two_subcategories(cat["id"], cat["slug"])
        current = ids(subs)
        mutated = current[:]
        mutated[0], mutated[1] = mutated[1], mutated[0]
        r = req("POST", f"/admin/categories/{cat['id']}/subcategories/reorder", headers=HEADERS, json={"ids": mutated})
        assert_true(r.status_code == 200, f"subcategory reorder failed: {r.status_code} {r.text}")
        after = ids(req("GET", "/subcategories", params={"category": cat["slug"]}).json())
        assert_true(after[:2] == mutated[:2], f"subcategory order did not persist: expected first2={mutated[:2]} got {after[:2]}")
        print_step("subcategory reorder persists", "passed", {"category": cat["slug"], "after_first2": after[:2], "temp_created": bool(temp_id)})
    finally:
        restore_ids = [sid for sid in original_ids if sid != temp_id]
        if temp_id:
            dr = req("DELETE", f"/admin/subcategories/{temp_id}", headers=HEADERS)
            print_step("temp subcategory cleanup", "ok" if dr.status_code == 200 else "failed", {"status": dr.status_code, "id": temp_id})
        if restore_ids:
            rr = req("POST", f"/admin/categories/{cat['id']}/subcategories/reorder", headers=HEADERS, json={"ids": restore_ids})
            print_step("subcategory order restore", "ok" if rr.status_code == 200 else "failed", {"status": rr.status_code})


def test_products_reorder():
    products = req("GET", "/products", params={"limit": 100}).json()["items"]
    assert_true(len(products) >= 2, "Need at least 2 active products to verify reorder")
    original = ids(products)
    mutated = original[:]
    mutated[0], mutated[1] = mutated[1], mutated[0]
    try:
        r = req("POST", "/admin/products/reorder", headers=HEADERS, json={"ids": mutated})
        assert_true(r.status_code == 200, f"product reorder failed: {r.status_code} {r.text}")
        after = ids(req("GET", "/products", params={"limit": 100}).json()["items"])
        assert_true(after[:2] == mutated[:2], f"product order did not affect default featured sort: expected first2={mutated[:2]} got {after[:2]}")
        print_step("product reorder persists in featured sort", "passed", {"before_first2": original[:2], "after_first2": after[:2]})
    finally:
        rr = req("POST", "/admin/products/reorder", headers=HEADERS, json={"ids": original})
        print_step("product order restore", "ok" if rr.status_code == 200 else "failed", {"status": rr.status_code})


def main():
    failures = []
    for name, fn in [
        ("unauthenticated", test_unauthenticated),
        ("categories", test_categories_reorder),
        ("subcategories", test_subcategories_reorder),
        ("products", test_products_reorder),
    ]:
        try:
            fn()
        except Exception as exc:
            failures.append({"test": name, "error": str(exc)})
            print_step(name, "failed", str(exc))
    if failures:
        print(json.dumps({"overall": "failed", "failures": failures}, default=str))
        sys.exit(1)
    print(json.dumps({"overall": "passed"}))


if __name__ == "__main__":
    main()