"""Focused API checks for personalization surcharge regression (iteration 13).

This script verifies the authoritative order subtotal/line prices for p_002:
- one personalized item => 1499 + 100 = 1599
- one non-personalized item => 1499
- mixed non-personalized + personalized lines => 3098
"""

import json
import sys
import time

import requests


BASE = "https://wear-interactive.preview.emergentagent.com/api"


def address(label: str) -> dict:
    return {
        "full_name": f"QA {label}",
        "email": f"qa+pers-{int(time.time() * 1000)}@example.com",
        "phone": "9876543210",
        "line1": "123 Hope Street",
        "line2": "",
        "city": "Bengaluru",
        "state": "Karnataka",
        "pincode": "560001",
        "country": "India",
    }


def create_order(items, label):
    payload = {
        "items": items,
        "shipping_address": address(label),
        "payment_provider": "cod",
    }
    res = requests.post(f"{BASE}/orders", json=payload, timeout=30)
    if res.status_code != 200:
        raise AssertionError(f"POST /orders failed {res.status_code}: {res.text}")
    body = res.json()
    order = body["order"]
    fetched = requests.get(f"{BASE}/orders/{order['order_number']}", timeout=30)
    if fetched.status_code != 200:
        raise AssertionError(f"GET /orders/{order['order_number']} failed {fetched.status_code}: {fetched.text}")
    return fetched.json()


def base_item(product, customization=None):
    item = {
        "product_id": "p_002",
        "name": product["name"],
        "image": product["image"],
        "price": product["price"],
        "qty": 1,
        "verse": product.get("verse"),
    }
    if customization:
        item["customization"] = customization
    return item


def main():
    product = requests.get(f"{BASE}/products/p_002", timeout=30).json()["product"]
    assert product["price"] == 1499, product
    assert product["personalization_enabled"] is True, product
    assert product["personalization_cost"] == 100, product

    personalized = create_order([base_item(product, "Romans 8:28")], "personalized")
    assert personalized["subtotal"] == 1599, personalized
    assert personalized["items"][0]["price"] == 1599, personalized
    assert personalized["items"][0]["customization"] == "Romans 8:28", personalized

    plain = create_order([base_item(product)], "plain")
    assert plain["subtotal"] == 1499, plain
    assert plain["items"][0]["price"] == 1499, plain
    assert not plain["items"][0].get("customization"), plain

    mixed = create_order([base_item(product), base_item(product, "Grace")], "mixed")
    assert mixed["subtotal"] == 3098, mixed
    assert [it["price"] for it in mixed["items"]] == [1499, 1599], mixed
    assert [it.get("customization") for it in mixed["items"]] == [None, "Grace"], mixed

    print(json.dumps({
        "ok": True,
        "orders": {
            "personalized": {"order_number": personalized["order_number"], "subtotal": personalized["subtotal"], "item_price": personalized["items"][0]["price"]},
            "plain": {"order_number": plain["order_number"], "subtotal": plain["subtotal"], "item_price": plain["items"][0]["price"]},
            "mixed": {"order_number": mixed["order_number"], "subtotal": mixed["subtotal"], "item_prices": [it["price"] for it in mixed["items"]]},
        },
    }, indent=2))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"FAILED: {exc}", file=sys.stderr)
        sys.exit(1)