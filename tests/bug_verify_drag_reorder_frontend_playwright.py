"""Playwright body script for mcp_browser_automation.

Focused UI verification for the reported bug:
- Admin category/subcategory/product cards/rows are draggable and persist reorder.
- Product search disables drag and shows "clear search to reorder".
- Category/Subcategory drawers no longer expose a manual Order field.
- Storefront /shop and /shop/drinkware no longer render the horizontal category pill strip, while filters and subcategory strip still work.
"""

import re
import json

BASE = "https://wear-interactive.preview.emergentagent.com"
TOKEN = "sess_test_1786690077689"


def assert_true(condition, message):
    if not condition:
        raise AssertionError(message)


async def api_fetch(page, path, method="GET", body=None):
    return await page.evaluate(
        """async ({path, method, body, token}) => {
            const res = await fetch('/api' + path, {
                method,
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: body ? JSON.stringify(body) : undefined
            });
            const text = await res.text();
            let data = null;
            try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
            return {ok: res.ok, status: res.status, data};
        }""",
        {"path": path, "method": method, "body": body, "token": TOKEN},
    )


async def drag_drop(page, source_selector, target_selector):
    try:
        await page.locator(source_selector).drag_to(page.locator(target_selector), timeout=5000)
    except Exception:
        # Fallback: dispatch native drag events in separate tasks so React sees the dragStart state update.
        await page.evaluate(
            """({source}) => {
                const src = document.querySelector(source);
                if (!src) throw new Error('source not found ' + source);
                window.__qaDt = new DataTransfer();
                src.dispatchEvent(new DragEvent('dragstart', {bubbles:true, cancelable:true, dataTransfer: window.__qaDt}));
            }""",
            {"source": source_selector},
        )
        await page.wait_for_timeout(250)
        await page.evaluate(
            """({target}) => {
                const dst = document.querySelector(target);
                if (!dst) throw new Error('target not found ' + target);
                dst.dispatchEvent(new DragEvent('dragover', {bubbles:true, cancelable:true, dataTransfer: window.__qaDt}));
                dst.dispatchEvent(new DragEvent('drop', {bubbles:true, cancelable:true, dataTransfer: window.__qaDt}));
                dst.dispatchEvent(new DragEvent('dragend', {bubbles:true, cancelable:true, dataTransfer: window.__qaDt}));
            }""",
            {"target": target_selector},
        )


async def visible_texts(locator):
    count = await locator.count()
    out = []
    for i in range(count):
        text = (await locator.nth(i).inner_text()).strip()
        out.append(re.sub(r"\s+", " ", text))
    return out




async def run(page):
    try:
        await page.set_viewport_size({"width": 1920, "height": 1080})
        await page.context.add_cookies([{
            "name": "session_token",
            "value": TOKEN,
            "url": BASE,
            "secure": True,
            "sameSite": "None",
        }])
        print("Skill lookup: No relevant testing skill found.")

        # ---------- Storefront: category pill strip removed, filters/subcategory strip still present ----------
        await page.goto(f"{BASE}/shop", wait_until="networkidle")
        assert_true(await page.locator('[data-testid="shop-title"]').inner_text() != "", "/shop title rendered")
        all_pill_count = await page.locator('main a[href="/shop"]').filter(has_text=re.compile(r"^All$", re.I)).count()
        assert_true(all_pill_count == 0, "Top-level /shop still shows an All category pill")
        filter_button = page.get_by_role("button", name=re.compile("Filters", re.I))
        assert_true(await filter_button.count() > 0, "Filters button missing on /shop")
        print("PASS /shop has no horizontal All category pill and still has Filters")

        await page.goto(f"{BASE}/shop/drinkware", wait_until="networkidle")
        category_pill_all_count = await page.locator('main a[href="/shop"]').filter(has_text=re.compile(r"^All$", re.I)).count()
        assert_true(category_pill_all_count == 0, "/shop/drinkware still shows horizontal All category pill")
        assert_true(await page.locator('[data-testid="subcategory-strip-eyebrow"]').filter(has_text="Browse by type").count() > 0, "Browse by type subcategory strip missing on /shop/drinkware")
        await filter_button.click()
        await page.wait_for_timeout(200)
        drawer_category_links = page.locator('aside a[href^="/shop/"]')
        assert_true(await drawer_category_links.count() >= 1, "Filters drawer Category list missing")
        print("PASS /shop/drinkware has no category pill strip; Browse by type and Filters drawer remain")

        # Regression: filter drawer category navigation.
        first_filter_href = await drawer_category_links.first.get_attribute("href")
        await drawer_category_links.first.click()
        await page.wait_for_load_state("networkidle")
        assert_true((await page.evaluate("location.pathname")) == first_filter_href, "Filter drawer category link did not navigate")
        print(f"PASS filter drawer category navigation -> {first_filter_href}")

        # Regression: main SHOP navbar dropdown category navigation.
        await page.goto(f"{BASE}/shop", wait_until="networkidle")
        public_categories = (await api_fetch(page, "/categories"))["data"]
        first_cat = public_categories[0]
        await page.get_by_role("button", name=re.compile(r"^SHOP$", re.I)).hover()
        await page.wait_for_timeout(300)
        nav_cat = page.locator(f'header a[href="/shop/{first_cat["slug"]}"]').first
        assert_true(await nav_cat.count() > 0, "Main SHOP navbar category link missing")
        await nav_cat.click()
        await page.wait_for_load_state("networkidle")
        assert_true((await page.evaluate("location.pathname")) == f"/shop/{first_cat['slug']}", "Main SHOP navbar category link did not navigate")
        print(f"PASS main SHOP navbar category navigation -> /shop/{first_cat['slug']}")

        # ---------- Admin Categories: draggable cards, no Order field, drag persists ----------
        await page.goto(f"{BASE}/admin/categories", wait_until="networkidle")
        await page.get_by_role("heading", name="Categories", exact=True).wait_for(timeout=10000)
        category_cards = page.locator('[data-testid^="category-"]')
        assert_true(await category_cards.count() >= 2, "Need at least 2 admin category cards")
        original_categories = (await api_fetch(page, "/categories"))["data"]
        original_cat_ids = [c["id"] for c in original_categories]
        first_id, second_id = original_cat_ids[0], original_cat_ids[1]
        first_name, second_name = original_categories[0]["name"], original_categories[1]["name"]
        assert_true(await page.locator(f'[data-testid="category-{first_id}"]').get_attribute("draggable") == "true", "Admin category card is not draggable=true")
        assert_true(await page.locator('[title="Drag to reorder"]').count() >= 1, "Category grip handle missing")
        await page.get_by_test_id("add-category-btn").click()
        await page.wait_for_timeout(250)
        order_inputs = await page.locator('aside input[type="number"], aside label').filter(has_text=re.compile(r"^\s*Order\s*$", re.I)).count()
        assert_true(order_inputs == 0, "Category drawer still exposes manual Order field")
        await page.keyboard.press("Escape")
        await page.locator('aside button').filter(has_text="Cancel").click()
        await page.wait_for_timeout(100)
        print("PASS admin category cards draggable and category drawer has no Order field")

        await drag_drop(page, f'[data-testid="category-{first_id}"]', f'[data-testid="category-{second_id}"]')
        await page.get_by_text("Order saved", exact=True).wait_for(timeout=10000)
        await page.reload(wait_until="networkidle")
        reloaded_first_text = await page.locator('[data-testid^="category-"]').first.inner_text()
        assert_true(second_name in reloaded_first_text, "Category drag order did not persist after reload")
        print(f"PASS admin category drag reorder persisted after reload ({second_name} moved first)")

        # Storefront filter drawer Category list reflects the swapped category order before restore.
        await page.goto(f"{BASE}/shop/drinkware", wait_until="networkidle")
        await page.get_by_role("button", name=re.compile("Filters", re.I)).click()
        await page.wait_for_timeout(200)
        filter_names = await visible_texts(page.locator('aside a[href^="/shop/"]'))
        assert_true(len(filter_names) >= 2 and filter_names[0] == second_name and filter_names[1] == first_name, f"Filter drawer category order did not reflect admin reorder: {filter_names[:2]}")
        print("PASS storefront Filters drawer category order reflects admin category reorder")
        restore = await api_fetch(page, "/admin/categories/reorder", "POST", {"ids": original_cat_ids})
        assert_true(restore["ok"], f"Failed to restore category order: {restore}")

        # ---------- Admin Subcategories: draggable rows, no Order field, drag persists ----------
        categories_after_restore = (await api_fetch(page, "/categories"))["data"]
        drinkware = next((c for c in categories_after_restore if c.get("slug") == "drinkware"), categories_after_restore[0])
        admin_subs_res = await api_fetch(page, f"/admin/categories/{drinkware['id']}/subcategories")
        original_subs = admin_subs_res["data"]
        original_sub_ids = [s["id"] for s in original_subs]
        temp_sub_id = None
        if len(original_sub_ids) < 2:
            slug = "qa-temp-ui-reorder"
            created = await api_fetch(page, f"/admin/categories/{drinkware['id']}/subcategories", "POST", {
                "name": "QA Temp UI Reorder",
                "slug": slug,
                "image": "",
                "title": "QA Temp UI Reorder",
                "description": "Temporary row for drag reorder UI verification.",
                "active": True,
            })
            assert_true(created["ok"], f"Failed to create temp subcategory: {created}")
            temp_sub_id = created["data"]["id"]
            current_subs = (await api_fetch(page, f"/admin/categories/{drinkware['id']}/subcategories"))["data"]
        else:
            current_subs = original_subs
        current_sub_ids = [s["id"] for s in current_subs]
        first_sub_id, second_sub_id = current_sub_ids[0], current_sub_ids[1]
        second_sub_name = current_subs[1]["name"]
        try:
            await page.goto(f"{BASE}/admin/categories/{drinkware['id']}/subcategories", wait_until="networkidle")
            await page.get_by_role("heading", name="Subcategories", exact=True).wait_for(timeout=10000)
            assert_true(await page.locator(f'[data-testid="subcategory-{first_sub_id}"]').get_attribute("draggable") == "true", "Admin subcategory row is not draggable=true")
            assert_true(await page.locator('[title="Drag to reorder"]').count() >= 1, "Subcategory grip handle missing")
            await page.get_by_test_id("add-subcategory-btn").click()
            await page.wait_for_timeout(250)
            sub_order_inputs = await page.locator('aside input[type="number"], aside label').filter(has_text=re.compile(r"^\s*Order\s*$", re.I)).count()
            assert_true(sub_order_inputs == 0, "Subcategory drawer still exposes manual Order field")
            await page.locator('aside button').filter(has_text="Cancel").click()
            await page.wait_for_timeout(100)
            await drag_drop(page, f'[data-testid="subcategory-{first_sub_id}"]', f'[data-testid="subcategory-{second_sub_id}"]')
            await page.get_by_text("Order saved", exact=True).wait_for(timeout=10000)
            await page.reload(wait_until="networkidle")
            sub_reloaded_first = await page.locator('[data-testid^="subcategory-"]').first.inner_text()
            assert_true(second_sub_name in sub_reloaded_first, "Subcategory drag order did not persist after reload")
            print("PASS admin subcategory rows draggable, no Order field, drag reorder persisted")
        finally:
            if temp_sub_id:
                await api_fetch(page, f"/admin/subcategories/{temp_sub_id}", "DELETE")
            if original_sub_ids:
                await api_fetch(page, f"/admin/categories/{drinkware['id']}/subcategories/reorder", "POST", {"ids": original_sub_ids})

        # ---------- Admin Products: draggable when search empty; disabled when searching; drag persists ----------
        await page.goto(f"{BASE}/admin/products", wait_until="networkidle")
        await page.get_by_role("heading", name="Products", exact=True).wait_for(timeout=10000)
        original_products = (await api_fetch(page, "/products?limit=100"))["data"]["items"]
        original_product_ids = [p["id"] for p in original_products]
        assert_true(len(original_product_ids) >= 2, "Need at least 2 products for UI product reorder")
        product_cards = page.locator('div.grid.grid-cols-2.md\\:grid-cols-3.lg\\:grid-cols-4.gap-4 > div')
        assert_true(await product_cards.count() >= 2, "Admin product cards not found")
        assert_true(await product_cards.first.get_attribute("draggable") == "true", "Admin product card is not draggable=true when search is empty")
        assert_true(await page.locator('[title="Drag to reorder"]').count() >= 1, "Product grip handle missing when search empty")
        search = page.get_by_placeholder("Name or SKU")
        await search.fill(original_products[0]["name"])
        await page.wait_for_timeout(300)
        assert_true(await page.get_by_text("clear search to reorder").count() > 0, "Product subtitle does not say clear search to reorder")
        searched_cards = page.locator('div.grid.grid-cols-2.md\\:grid-cols-3.lg\\:grid-cols-4.gap-4 > div')
        assert_true(await searched_cards.count() >= 1, "No product card visible under product-name search")
        assert_true(await searched_cards.first.get_attribute("draggable") != "true", "Product drag still enabled while search query is typed")
        await search.fill("")
        await page.wait_for_timeout(300)
        product_cards = page.locator('div.grid.grid-cols-2.md\\:grid-cols-3.lg\\:grid-cols-4.gap-4 > div')
        first_product_name = original_products[0]["name"]
        second_product_name = original_products[1]["name"]
        try:
            await drag_drop(page, 'div.grid.grid-cols-2.md\\:grid-cols-3.lg\\:grid-cols-4.gap-4 > div:nth-child(1)', 'div.grid.grid-cols-2.md\\:grid-cols-3.lg\\:grid-cols-4.gap-4 > div:nth-child(2)')
            await page.get_by_text("Order saved", exact=True).wait_for(timeout=10000)
            await page.reload(wait_until="networkidle")
            product_first_text = await page.locator('div.grid.grid-cols-2.md\\:grid-cols-3.lg\\:grid-cols-4.gap-4 > div').first.inner_text()
            assert_true(second_product_name in product_first_text and first_product_name not in product_first_text.split('\n')[0], "Product drag order did not persist after reload")
            print("PASS admin products draggable with empty search, disabled during search, drag reorder persisted")
        finally:
            await api_fetch(page, "/admin/products/reorder", "POST", {"ids": original_product_ids})

        # Confirm Mugs still has its one linked product after temp cleanup/reorders.
        mugs = (await api_fetch(page, "/subcategories?category=drinkware"))["data"]
        mugs_row = next((s for s in mugs if s.get("slug") == "mugs"), None)
        assert_true(mugs_row is not None and mugs_row.get("product_count") == 1, "Mugs subcategory missing or product_count changed")
        print("PASS Mugs subcategory still exists with 1 linked product")

        # Get error messages using specific selectors
        error_text = await page.evaluate("""() => {
        const errorElements = Array.from(document.querySelectorAll('.error, [class*="error"], [id*="error"]'));
        return errorElements.map(el => el.textContent).join(", ");
        }""")
        if error_text:
            print(f"Found error message: {error_text}")
        else:
            print("No error messages found on the page")
        print(json.dumps({"overall": "frontend_ui_passed"}))
    except Exception as exc:
        print(f"FRONTEND TEST FAILED: {exc}")
        # Get error messages using specific selectors
        error_text = await page.evaluate("""() => {
        const errorElements = Array.from(document.querySelectorAll('.error, [class*="error"], [id*="error"]'));
        return errorElements.map(el => el.textContent).join(", ");
        }""")
        if error_text:
            print(f"Found error message: {error_text}")
        else:
            print("No error messages found on the page")
        raise


if __name__ == "__main__":
    import asyncio
    from playwright.async_api import async_playwright

    async def _main():
        async with async_playwright() as p:
            browser = await p.chromium.launch()
            page = await browser.new_page()
            try:
                await run(page)
            finally:
                await browser.close()

    asyncio.run(_main())
