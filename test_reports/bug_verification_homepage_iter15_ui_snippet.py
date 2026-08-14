# Playwright helper kept as a persisted test artifact. The body was executed by
# mcp_browser_automation inside an async function with access to `page`.
import re
import time


async def run_homepage_bug_verification(page):
    try:
        await page.set_viewport_size({"width": 1920, "height": 1080})
        base = "https://wear-interactive.preview.emergentagent.com"
        api = "http://localhost:8001/api"
        headers = {"Authorization": "Bearer sess_test_1786690077689"}

        async def patch_category_state(value):
            for cid in ["cat_09", "cat_10"]:
                resp = await page.context.request.patch(
                    f"{api}/admin/categories/{cid}",
                    headers=headers,
                    data={"coming_soon": value},
                )
                if resp.status != 200:
                    raise AssertionError(
                        f"PATCH {cid} coming_soon={value} failed with {resp.status}: {await resp.text()}"
                    )
                body = await resp.json()
                if body.get("coming_soon") is not value:
                    raise AssertionError(f"PATCH {cid} returned wrong coming_soon: {body}")
            print(f"PATCHED cat_09/cat_10 coming_soon={value}")

        async def goto_home():
            await page.goto(f"{base}/?qa={int(time.time() * 1000)}", wait_until="networkidle")
            await page.wait_for_timeout(1200)
            close = page.get_by_test_id("homepage-lightbox-close")
            if await close.count() > 0:
                await close.first.click(force=True)
                await page.wait_for_timeout(300)
            await page.wait_for_selector("section#categories", timeout=20000)
            await page.wait_for_function(
                """() => document.querySelector('section#categories')?.innerText.includes('Jewellery') && document.querySelector('section#categories')?.innerText.includes('Wall Frames')""",
                timeout=20000,
            )

        async def category_tile_texts():
            return await page.evaluate(
                """() => {
                    const section = document.querySelector('section#categories');
                    const out = {};
                    Array.from(section.querySelectorAll('a')).forEach(a => {
                        const txt = a.innerText.replace(/\s+/g, ' ').trim();
                        if (txt.includes('Jewellery')) out.Jewellery = txt;
                        if (txt.includes('Wall Frames')) out['Wall Frames'] = txt;
                    });
                    return out;
                }"""
            )

        async def section_product_ids(title):
            return await page.evaluate(
                """(title) => {
                    const h = Array.from(document.querySelectorAll('main > section h2')).find(el => el.textContent.trim() === title);
                    if (!h) return null;
                    const section = h.closest('section');
                    return Array.from(section.querySelectorAll('[data-testid^="product-card-add-"]'))
                        .map(el => el.getAttribute('data-testid').replace('product-card-add-', ''));
                }""",
                title,
            )

        async def section_order_labels():
            return await page.evaluate(
                """() => Array.from(document.querySelectorAll('main > section')).map((section, index) => {
                    if (index === 0) return 'Hero';
                    if (section.dataset.testid === 'home-about') return 'AboutStory';
                    if (section.dataset.testid === 'reviews-section') return 'ReviewsSection';
                    if (section.dataset.testid === 'instagram-feed') return 'InstagramFeed';
                    if (section.id === 'categories') return 'Categories';
                    const h2 = section.querySelector('h2')?.textContent.trim();
                    if (h2 === 'Bestsellers') return 'Bestsellers';
                    if (h2 === 'New Arrivals') return 'New Arrivals';
                    const text = section.innerText.replace(/\s+/g, ' ').trim();
                    if (text.includes('Ships Worldwide') || text.includes('Free over ₹999')) return 'FeatureStrip';
                    if (text.includes('Explore our US partner website')) return 'USBanner';
                    return `Unknown:${h2 || text.slice(0, 60)}`;
                })"""
            )

        # False state: reported visible bug must not reproduce even though API tagline remains "Coming Soon".
        await patch_category_state(False)
        await goto_home()
        texts = await category_tile_texts()
        print(f"FALSE category tile texts: {texts}")
        for name in ["Jewellery", "Wall Frames"]:
            if name not in texts:
                raise AssertionError(f"Could not find {name} category tile")
            if re.search(r"coming\s+soon", texts[name], flags=re.I):
                raise AssertionError(f"{name} still visibly shows Coming Soon while coming_soon=false: {texts[name]}")
        print("PASS false-state category tiles show no visible Coming Soon text")

        best_ids = await section_product_ids("Bestsellers")
        new_ids = await section_product_ids("New Arrivals")
        print(f"Bestsellers IDs: {best_ids}")
        print(f"New Arrivals IDs: {new_ids}")
        if best_ids != ["p_001", "p_009"]:
            raise AssertionError(f"Bestsellers section product IDs incorrect: {best_ids}")
        if new_ids != ["p_003", "p_012"]:
            raise AssertionError(f"New Arrivals section product IDs incorrect: {new_ids}")
        print("PASS homepage ribbon-filtered product sections contain only expected products")

        order = await section_order_labels()
        print(f"Homepage section order labels: {order}")
        expected = [
            "Hero",
            "FeatureStrip",
            "Categories",
            "Bestsellers",
            "AboutStory",
            "USBanner",
            "ReviewsSection",
            "New Arrivals",
            "InstagramFeed",
        ]
        if order[: len(expected)] != expected:
            raise AssertionError(f"Homepage section order incorrect. Expected {expected}, got {order}")
        print("PASS homepage section order matches requested order")

        # True state regression: existing Coming Soon pill/text should still be visible.
        await patch_category_state(True)
        await goto_home()
        texts_true = await category_tile_texts()
        print(f"TRUE category tile texts: {texts_true}")
        for name in ["Jewellery", "Wall Frames"]:
            if not re.search(r"coming\s+soon", texts_true.get(name, ""), flags=re.I):
                raise AssertionError(
                    f"{name} does not visibly show Coming Soon while coming_soon=true: {texts_true.get(name)}"
                )
        print("PASS true-state category tiles still show visible Coming Soon pill/text")

        # Restore requested off state and verify final user-visible state.
        await patch_category_state(False)
        await goto_home()
        texts_restored = await category_tile_texts()
        print(f"RESTORED category tile texts: {texts_restored}")
        for name in ["Jewellery", "Wall Frames"]:
            if re.search(r"coming\s+soon", texts_restored.get(name, ""), flags=re.I):
                raise AssertionError(f"{name} still shows Coming Soon after restore to false: {texts_restored.get(name)}")
        print("PASS restored false-state remains clean")

        error_text = await page.evaluate(
            """() => {
                const errorElements = Array.from(document.querySelectorAll('.error, [class*="error"], [id*="error"]'));
                return errorElements.map(el => el.textContent).join(", ");
            }"""
        )
        if error_text:
            print(f"Found error message: {error_text}")
        else:
            print("No error messages found on the page")

        print("TEST_RESULT: PASS homepage bug verification")
    except Exception as exc:
        print(f"TEST_RESULT: FAIL homepage bug verification: {exc}")
        await page.screenshot(path="/app/test_reports/browser_homepage_iter15_failure.jpg", quality=40, full_page=False)
        raise