#!/usr/bin/env python3
"""Focused Playwright UI check for homepage ribbon/section/category visibility bug."""
import asyncio
import json
import os
import sys
from datetime import datetime, timezone

from playwright.async_api import async_playwright


BASE = os.environ.get("TEST_BASE_URL", "https://wear-interactive.preview.emergentagent.com").rstrip("/")
OUT = "/app/test_reports/homepage_ui_evidence.json"

EXPECTED_BEST = {"Faith Cap — Blessed Edition", "Psalm 46 Statement Tee"}
EXPECTED_NEW = {"YHWH Minimalist Canvas Frame", "Jehovah Jireh Wall Canvas"}
EXPECTED_ORDER = [
    "Hero", "FeatureStrip", "Categories", "Bestsellers", "AboutStory",
    "USBanner", "ReviewsSection", "New Arrivals", "InstagramFeed",
]


async def main():
    result = {"base": BASE, "timestamp": datetime.now(timezone.utc).isoformat(), "checks": [], "failures": []}
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1920, "height": 1080})
        await page.goto(BASE, wait_until="networkidle", timeout=60000)
        await page.wait_for_timeout(1800)
        close = page.get_by_test_id("homepage-lightbox-close")
        if await close.count() > 0:
            await close.first.click(force=True)
            await page.wait_for_timeout(300)

        for selector in ["text=Bestsellers", "text=New Arrivals", "[data-testid='instagram-feed']", "#categories"]:
            await page.wait_for_selector(selector, timeout=20000)

        evidence = await page.evaluate(
            """() => {
              const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
              const sections = Array.from(document.querySelectorAll('main > section')).map((s, index) => ({
                index,
                id: s.id || '',
                testid: s.getAttribute('data-testid') || '',
                h2: norm(s.querySelector('h2')?.textContent || ''),
                textSample: norm(s.textContent || '').slice(0, 220),
                top: Math.round(s.getBoundingClientRect().top + window.scrollY)
              }));
              const sectionByHeading = (heading) => Array.from(document.querySelectorAll('main > section')).find(s => norm(s.querySelector('h2')?.textContent || '') === heading || norm(s.textContent || '').includes(heading));
              const productInfo = (heading) => {
                const sec = sectionByHeading(heading);
                if (!sec) return {found: false, products: []};
                return {
                  found: true,
                  sectionTop: Math.round(sec.getBoundingClientRect().top + window.scrollY),
                  products: Array.from(sec.querySelectorAll('a[href^="/product/"]')).map(a => ({
                    href: a.getAttribute('href'),
                    name: norm(a.querySelector('h3')?.textContent || ''),
                    visibleText: norm(a.textContent || ''),
                    addTestid: a.querySelector('[data-testid^="product-card-add-"]')?.getAttribute('data-testid') || ''
                  })).filter(p => p.name)
                };
              };
              const categorySection = document.querySelector('#categories');
              const categoryTiles = categorySection ? Array.from(categorySection.querySelectorAll('a')).map(a => ({
                href: a.getAttribute('href'),
                text: norm(a.textContent || ''),
                imgAlt: a.querySelector('img')?.getAttribute('alt') || '',
                hasVisibleComingSoonText: norm(a.textContent || '').includes('Coming Soon'),
                likelyTopLeftPillCount: Array.from(a.querySelectorAll('div')).filter(d => norm(d.textContent) === 'Coming Soon' && d.className.includes('top-3') && d.className.includes('left-3')).length
              })) : [];
              return {
                url: location.href,
                sections,
                bestsellers: productInfo('Bestsellers'),
                newArrivals: productInfo('New Arrivals'),
                categoryTiles,
                targetCategories: categoryTiles.filter(t => ['Jewellery','Wall Frames'].includes(t.imgAlt) || ['Jewellery','Wall Frames'].some(n => t.text.includes(n)))
              };
            }"""
        )
        result["evidence"] = evidence

        actual_best = {p["name"] for p in evidence["bestsellers"]["products"]}
        result["checks"].append({"name": "bestsellers_only_best_seller_ribbon_products", "expected": sorted(EXPECTED_BEST), "actual": sorted(actual_best), "status": "pass" if actual_best == EXPECTED_BEST else "fail"})
        if actual_best != EXPECTED_BEST:
            result["failures"].append("Bestsellers section did not exactly match Best Seller ribbon products")

        actual_new = {p["name"] for p in evidence["newArrivals"]["products"]}
        result["checks"].append({"name": "new_arrivals_only_new_ribbon_products", "expected": sorted(EXPECTED_NEW), "actual": sorted(actual_new), "status": "pass" if actual_new == EXPECTED_NEW else "fail"})
        if actual_new != EXPECTED_NEW:
            result["failures"].append("New Arrivals section did not exactly match New ribbon products")

        labels = []
        for s in evidence["sections"]:
            sample = s["textSample"]
            if s["testid"] == "hero-section": labels.append("Hero")
            elif s["id"] == "categories": labels.append("Categories")
            elif s["h2"] == "Bestsellers" or "Bestsellers" in sample: labels.append("Bestsellers")
            elif s["testid"] == "home-about": labels.append("AboutStory")
            elif "Explore our US partner website" in sample: labels.append("USBanner")
            elif s["testid"] == "reviews-section": labels.append("ReviewsSection")
            elif s["h2"] == "New Arrivals" or "New Arrivals" in sample: labels.append("New Arrivals")
            elif s["testid"] == "instagram-feed": labels.append("InstagramFeed")
            elif any(x in sample for x in ["Ships Worldwide", "Safe Payments", "Easy Returns", "Crafted With Purpose", "Fully Customizable"]): labels.append("FeatureStrip")
            else: labels.append(f"Unknown:{s['index']}")
        filtered = [l for l in labels if l in EXPECTED_ORDER]
        order_pass = filtered == EXPECTED_ORDER and labels.index("InstagramFeed") == labels.index("New Arrivals") + 1
        result["checks"].append({"name": "homepage_section_order", "expected": EXPECTED_ORDER, "actual_labels": labels, "actual_filtered": filtered, "status": "pass" if order_pass else "fail"})
        if not order_pass:
            result["failures"].append("Homepage section order is wrong or New Arrivals is not immediately above Instagram")

        targets = evidence["targetCategories"]
        target_names = {t["imgAlt"] for t in targets}
        visible_coming = [t for t in targets if t["hasVisibleComingSoonText"]]
        pill_present = [t for t in targets if t["likelyTopLeftPillCount"] > 0]
        categories_pass = target_names >= {"Jewellery", "Wall Frames"} and not visible_coming
        result["checks"].append({
            "name": "toggled_off_categories_no_visible_coming_soon_text",
            "target_tiles": targets,
            "top_left_pill_present": pill_present,
            "visible_coming_soon_text_present": visible_coming,
            "status": "pass" if categories_pass else "fail",
        })
        if not categories_pass:
            result["failures"].append("Jewellery/Wall Frames still visibly show 'Coming Soon' text on homepage after coming_soon=false")

        await browser.close()

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)
    print(json.dumps(result, indent=2))
    return 0 if not result["failures"] else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))