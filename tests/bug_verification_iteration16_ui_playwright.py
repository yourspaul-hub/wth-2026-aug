"""Playwright steps for focused UI verification of subcategory feature.

This file mirrors the script passed to the browser automation runner.
"""

import time, json

BASE = "https://wear-interactive.preview.emergentagent.com"
TOKEN = "sess_test_1786690077689"
results = []

async def step(name, func):
    try:
        detail = await func()
        print(f"PASS - {name}: {detail}")
        results.append({"name": name, "passed": True, "detail": detail})
    except Exception as e:
        print(f"FAIL - {name}: {e}")
        results.append({"name": name, "passed": False, "detail": str(e)})
        raise


async def run_subcategory_ui(page):
    await page.set_viewport_size({"width": 1920, "height": 1080})
    ts = int(time.time())
    qa_name = f"QA UI Type {ts}"
    qa_slug = f"qa-ui-type-{ts}"

    try:
        async def storefront_category_strip():
            await page.goto(f"{BASE}/shop/drinkware", wait_until="networkidle")
            await page.wait_for_selector('[data-testid="subcategory-strip-eyebrow"]', timeout=10000)
            strip_text = await page.locator('[data-testid="subcategory-strip-eyebrow"]').inner_text()
            mugs_tile = page.locator('[data-testid="subcategory-tile-mugs"]').first
            if not await mugs_tile.is_visible():
                raise Exception("Mugs tile is not visible")
            page_text = await page.locator("body").inner_text()
            if "Bulk Test Mug UPDATED" not in page_text:
                raise Exception("full drinkware product grid did not show expected mug product")
            return {"strip": strip_text, "tile_visible": True}
        await step("/shop/drinkware shows Browse by type strip and Mugs tile above product grid", storefront_category_strip)

        async def storefront_subcategory_page():
            await page.locator('[data-testid="subcategory-tile-mugs"]').first.click(force=True)
            await page.wait_for_url("**/shop/drinkware/mugs", timeout=10000)
            await page.wait_for_selector('[data-testid="subcategory-hero-image"]', timeout=10000)
            title = await page.locator('[data-testid="shop-title"]').inner_text()
            body = await page.locator("body").inner_text()
            if "Ceramic Mugs" not in title:
                raise Exception(f"Expected Ceramic Mugs title, got {title}")
            body_lower = body.lower()
            for expected in ["home", "shop", "drinkware", "mugs", "hand-painted verses.", "bulk test mug updated"]:
                if expected not in body_lower:
                    raise Exception(f"Missing expected subcategory page text: {expected}")
            if "1 products" not in body and "1 product" not in body:
                raise Exception("Expected one-product filtered result count")
            return {"url": page.url, "title": title}
        await step("/shop/drinkware/mugs shows hero, breadcrumb, description, and filtered product", storefront_subcategory_page)

        async def storefront_category_without_subs():
            await page.goto(f"{BASE}/shop/clothing", wait_until="networkidle")
            await page.wait_for_timeout(800)
            count = await page.locator('[data-testid="subcategory-strip-eyebrow"]').count()
            if count != 0:
                raise Exception("subcategory strip rendered for clothing, which has no subcategories")
            title = await page.locator('[data-testid="shop-title"]').inner_text()
            return {"title": title, "strip_count": count}
        await step("category with no subcategories does not render the strip", storefront_category_without_subs)

        await page.context.add_cookies([{
            "name": "session_token",
            "value": TOKEN,
            "domain": "wear-interactive.preview.emergentagent.com",
            "path": "/",
            "secure": True,
            "sameSite": "None",
        }])

        async def admin_manage_link_and_create():
            await page.goto(f"{BASE}/admin/categories", wait_until="networkidle")
            await page.wait_for_selector('[data-testid="manage-subcategories-cat_01"]', timeout=15000)
            manage = page.locator('[data-testid="manage-subcategories-cat_01"]').first
            manage_text = await manage.inner_text()
            if "subcategory" not in manage_text.lower() or "manage" not in manage_text.lower():
                raise Exception(f"Manage link text incorrect: {manage_text}")
            await manage.click(force=True)
            await page.wait_for_url("**/admin/categories/cat_01/subcategories", timeout=10000)
            await page.locator('[data-testid="add-subcategory-btn"]').click(force=True)
            await page.wait_for_selector('[data-testid="subcategory-name"]', timeout=10000)
            if await page.locator('[data-testid="image-field-subcategory-image"]').count() != 1:
                raise Exception("Image field editor is missing")
            await page.locator('[data-testid="subcategory-name"]').fill(qa_name)
            await page.locator('[data-testid="subcategory-slug"]').fill(qa_slug)
            await page.get_by_placeholder("Ceramic Mugs").fill("QA UI Headline")
            await page.get_by_placeholder("One or two lines shown under the title on the landing page.").fill("QA UI description body")
            await page.locator('label:has-text("Order") input').fill("77")
            if not await page.locator('[data-testid="subcategory-active-toggle"]').is_checked():
                await page.locator('[data-testid="subcategory-active-toggle"]').check(force=True)
            await page.locator('[data-testid="save-subcategory-btn"]').click(force=True)
            await page.wait_for_selector(f'text="{qa_name}"', timeout=10000)
            return {"created": qa_name, "manage_text": manage_text}
        await step("admin Categories Manage link opens subcategory page and Add drawer creates item", admin_manage_link_and_create)

        async def admin_edit_preserves_fields_and_delete_unlinked():
            row = page.locator(f'div[data-testid^="subcategory-"]:has-text("{qa_name}")').first
            await row.locator('button[aria-label="Edit"]').click(force=True)
            await page.wait_for_selector('[data-testid="subcategory-name"]', timeout=10000)
            name_val = await page.locator('[data-testid="subcategory-name"]').input_value()
            slug_val = await page.locator('[data-testid="subcategory-slug"]').input_value()
            title_val = await page.get_by_placeholder("Ceramic Mugs").input_value()
            desc_val = await page.get_by_placeholder("One or two lines shown under the title on the landing page.").input_value()
            if (name_val, slug_val, title_val, desc_val) != (qa_name, qa_slug, "QA UI Headline", "QA UI description body"):
                raise Exception({"name": name_val, "slug": slug_val, "title": title_val, "desc": desc_val})
            await page.get_by_placeholder("Ceramic Mugs").fill("QA UI Headline Edited")
            await page.locator('[data-testid="save-subcategory-btn"]').click(force=True)
            await page.wait_for_selector('text="QA UI Headline Edited"', timeout=10000)
            page.once("dialog", lambda dialog: dialog.accept())
            row = page.locator(f'div[data-testid^="subcategory-"]:has-text("{qa_name}")').first
            await row.locator('button[aria-label="Delete"]').click(force=True)
            await page.wait_for_timeout(1200)
            remaining = await page.locator(f'text="{qa_name}"').count()
            if remaining != 0:
                raise Exception("unlinked QA subcategory still visible after delete")
            return {"edited_title": "QA UI Headline Edited", "deleted_unlinked": True}
        await step("admin subcategory edit preserves fields and unlinked delete works", admin_edit_preserves_fields_and_delete_unlinked)

        async def admin_delete_linked_shows_error():
            page.once("dialog", lambda dialog: dialog.accept())
            mugs_row = page.locator('div[data-testid^="subcategory-"]:has-text("Mugs")').first
            await mugs_row.locator('button[aria-label="Delete"]').click(force=True)
            await page.wait_for_timeout(1500)
            body = await page.locator("body").inner_text()
            if "product(s) are still assigned" not in body:
                raise Exception("linked delete error toast was not visible")
            if await page.locator('div[data-testid^="subcategory-"]:has-text("Mugs")').count() == 0:
                raise Exception("Mugs row disappeared despite linked delete guard")
            return {"error_visible": True, "mugs_still_present": True}
        await step("admin deleting linked Mugs subcategory shows error and does not delete", admin_delete_linked_shows_error)

        async def admin_product_subcategory_dropdown_persists():
            await page.goto(f"{BASE}/admin/products", wait_until="networkidle")
            await page.get_by_placeholder("Name or SKU").fill("BULK-001")
            await page.wait_for_timeout(500)
            await page.locator('button:has-text("Edit")').first.click(force=True)
            await page.wait_for_selector('[data-testid="product-subcategory-select"]', timeout=10000)
            category_select = page.locator('aside select').nth(0)
            await category_select.select_option(label="Drinkware")
            await page.wait_for_timeout(700)
            sub_select = page.locator('[data-testid="product-subcategory-select"]')
            option_texts = await sub_select.locator("option").all_inner_texts()
            if not any("Mugs" in t for t in option_texts):
                raise Exception({"options": option_texts})
            await sub_select.select_option(label="Mugs")
            await page.locator('button:has-text("Save Product")').click(force=True)
            await page.wait_for_timeout(1500)
            await page.get_by_placeholder("Name or SKU").fill("BULK-001")
            await page.wait_for_timeout(500)
            await page.locator('button:has-text("Edit")').first.click(force=True)
            await page.wait_for_selector('[data-testid="product-subcategory-select"]', timeout=10000)
            await page.wait_for_timeout(500)
            selected_text = await page.locator('[data-testid="product-subcategory-select"] option:checked').inner_text()
            if "Mugs" not in selected_text:
                raise Exception(f"Expected selected Mugs after reopen, got {selected_text}")
            return {"options": option_texts, "selected_after_reopen": selected_text}
        await step("admin product form subcategory dropdown populates and persists Mugs selection", admin_product_subcategory_dropdown_persists)

    finally:
        # Get error messages using specific selectors
        error_text = await page.evaluate("""() => {
        const errorElements = Array.from(document.querySelectorAll('.error, [class*="error"], [id*="error"]'));
        return errorElements.map(el => el.textContent).join(", ");
        }""")
        if error_text:
            print(f"Found error message: {error_text}")
        else:
            print("No error messages found on the page")
        with open("/app/test_reports/ui_subcategory_results_iteration16.json", "w", encoding="utf-8") as f:
            json.dump({"base": BASE, "passed": sum(1 for r in results if r["passed"]), "total": len(results), "results": results}, f, indent=2)
        print("Wrote /app/test_reports/ui_subcategory_results_iteration16.json")