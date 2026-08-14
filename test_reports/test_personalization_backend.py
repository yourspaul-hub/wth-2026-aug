#!/usr/bin/env python3
"""Focused backend verification for personalized product surcharge."""

import json
import os
import sys
import time

import requests


ROOT = "/app"
FRONTEND_ENV = os.path.join(ROOT, "frontend", ".env")


def read_backend_url():
    with open(FRONTEND_ENV, "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                return line.strip().split("=", 1)[1]
    raise RuntimeError("REACT_APP_BACKEND_URL not found")


BASE = read_backend_url().rstrip("/") + "/api"


def req(method, path, **kwargs):
    r = requests.request(method, BASE + path, timeout=25, **kwargs)
    try:
        body = r.json()
    except Exception:
        body = r.text
    if r.status_code >= 400:
        raise AssertionError(f"{method} {path} failed {r.status_code}: {body}")
    return body


def address(tag):
    return {
        "full_name": f"QA Personalization {tag}",
        "email": f"qa.personalization.{tag.lower()}.{int(time.time())}@example.com",
        "phone": "9876543210",
        "line1": "Test Address 1",
        "line2": "",
        "city": "Bengaluru",
        "state": "Karnataka",
        "pincode": "560001",
        "country": "India",
    }


def create_order(product, customization):
    payload = {
        "items": [
            {
                "product_id": "p_002",
                "name": product.get("name"),
                "image": product.get("image"),
                "price": product.get("price"),
                "verse": product.get("verse"),
                "qty": 1,
                "customization": customization,
            }
        ],
        "shipping_address": address("WITH" if customization else "WITHOUT"),
        "payment_provider": "cod",
    }
    return req("POST", "/orders", json=payload)


def main():
    result = {"api_base": BASE, "checks": []}

    product_response = req("GET", "/products/p_002")
    product = product_response.get("product") or product_response
    result["product"] = {
        "id": product.get("id"),
        "name": product.get("name"),
        "price": product.get("price"),
        "personalization_enabled": product.get("personalization_enabled"),
        "personalization_cost": product.get("personalization_cost"),
        "stock": product.get("stock"),
    }
    assert product.get("id") == "p_002", result["product"]
    assert int(product.get("price")) == 1499, result["product"]
    assert product.get("personalization_enabled") is True, result["product"]
    assert int(product.get("personalization_cost") or 0) == 100, result["product"]
    assert int(product.get("stock") or 0) >= 2, "p_002 needs at least 2 stock for with/without order regression checks"
    result["checks"].append("Product p_002 has base ₹1499, personalization enabled, surcharge ₹100")

    custom_text = "QA Psalm 23"
    with_custom = create_order(product, custom_text)
    with_order = with_custom["order"]
    with_get = req("GET", f"/orders/{with_order['order_number']}")
    with_item = with_get["items"][0]
    assert with_order["subtotal"] == 1599, with_order
    assert with_get["subtotal"] == 1599, with_get
    assert with_item["price"] == 1599, with_item
    assert with_item.get("customization") == custom_text, with_item
    assert with_get["total"] == with_get["subtotal"] - with_get.get("discount", 0) + with_get.get("shipping_fee", 0) + with_get.get("tax", 0), with_get
    result["with_customization"] = {
        "order_number": with_order["order_number"],
        "item_price": with_item["price"],
        "subtotal": with_get["subtotal"],
        "shipping_fee": with_get.get("shipping_fee"),
        "tax": with_get.get("tax"),
        "total": with_get["total"],
        "customization": with_item.get("customization"),
    }
    result["checks"].append("Customized order persisted item price/subtotal ₹1599")

    without_custom = create_order(product, None)
    without_order = without_custom["order"]
    without_get = req("GET", f"/orders/{without_order['order_number']}")
    without_item = without_get["items"][0]
    assert without_order["subtotal"] == 1499, without_order
    assert without_get["subtotal"] == 1499, without_get
    assert without_item["price"] == 1499, without_item
    assert not without_item.get("customization"), without_item
    result["without_customization"] = {
        "order_number": without_order["order_number"],
        "item_price": without_item["price"],
        "subtotal": without_get["subtotal"],
        "shipping_fee": without_get.get("shipping_fee"),
        "tax": without_get.get("tax"),
        "total": without_get["total"],
        "customization": without_item.get("customization"),
    }
    result["checks"].append("Non-customized order persisted item price/subtotal ₹1499")

    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(json.dumps({"error": str(exc)}, indent=2), file=sys.stderr)
        raise