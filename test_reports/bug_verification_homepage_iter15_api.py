#!/usr/bin/env python3
"""Focused API checks for homepage category coming-soon and product ribbon filters."""
import json
import sys
import time
from urllib import request, parse, error

BASE = "http://localhost:8001/api"
TOKEN = "sess_test_1786690077689"
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json",
}


def call(method, path, payload=None):
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    req = request.Request(f"{BASE}{path}", data=data, method=method, headers=HEADERS)
    try:
        with request.urlopen(req, timeout=20) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, json.loads(body) if body else None
    except error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise AssertionError(f"{method} {path} failed: {exc.code} {body}") from exc


def categories_by_id():
    status, cats = call("GET", "/categories")
    assert status == 200, status
    return {c["id"]: c for c in cats}


def products():
    qs = parse.urlencode({"limit": 50})
    status, data = call("GET", f"/products?{qs}")
    assert status == 200, status
    return data.get("items", [])


def set_coming_soon(value):
    for cid in ("cat_09", "cat_10"):
        status, patched = call("PATCH", f"/admin/categories/{cid}", {"coming_soon": value})
        assert status == 200, (cid, status)
        assert patched.get("coming_soon") is value, (cid, patched)
    time.sleep(0.2)


def main():
    evidence = {"checks": []}
    try:
        set_coming_soon(False)
        cats = categories_by_id()
        for cid in ("cat_09", "cat_10"):
            c = cats[cid]
            assert c["coming_soon"] is False, c
            assert (c.get("tagline") or "").strip().lower() == "coming soon", c
        evidence["checks"].append("cat_09 and cat_10 persisted coming_soon=false while retaining literal tagline 'Coming Soon'")

        items = products()
        best = [p["id"] for p in items if p.get("ribbon") == "Best Seller"]
        new = [p["id"] for p in items if p.get("ribbon") == "New"]
        assert best == ["p_001", "p_009"], best
        assert new == ["p_003", "p_012"], new
        evidence["checks"].append(f"API product ribbon sets: Best Seller={best}, New={new}")

        set_coming_soon(True)
        cats = categories_by_id()
        assert cats["cat_09"]["coming_soon"] is True and cats["cat_10"]["coming_soon"] is True
        evidence["checks"].append("cat_09 and cat_10 persisted coming_soon=true for regression setup")

        set_coming_soon(False)
        cats = categories_by_id()
        assert cats["cat_09"]["coming_soon"] is False and cats["cat_10"]["coming_soon"] is False
        evidence["checks"].append("restored cat_09 and cat_10 to coming_soon=false")

        evidence["status"] = "passed"
        print(json.dumps(evidence, indent=2))
        return 0
    except Exception as exc:
        evidence["status"] = "failed"
        evidence["error"] = repr(exc)
        print(json.dumps(evidence, indent=2), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())