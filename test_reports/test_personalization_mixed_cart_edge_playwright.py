"""Regression check: adding the same product without and then with customization."""


BASE_URL = "https://wear-interactive.preview.emergentagent.com"


async def run_mixed_cart_edge(page):
    try:
        await page.set_viewport_size({"width": 1920, "height": 1080})
        await page.goto(f"{BASE_URL}/product/p_002", wait_until="domcontentloaded")
        await page.evaluate("""() => { localStorage.clear(); localStorage.setItem('wth_currency', 'INR'); }""")
        await page.reload(wait_until="domcontentloaded")
        await page.wait_for_selector('h1:has-text("Personalized Scripture Wallet")', timeout=15000)

        await page.locator('button:has-text("Add to Bag")').first.click()
        await page.wait_for_selector('[data-testid="cart-subtotal"]', timeout=10000)
        first_subtotal = await page.get_by_test_id("cart-subtotal").inner_text()
        assert "1,499" in first_subtotal or "1499" in first_subtotal, first_subtotal
        await page.get_by_label("Close").click()
        await page.wait_for_timeout(300)

        await page.get_by_placeholder("Type name or short verse to engrave").fill("QA Mixed Custom")
        await page.locator('button:has-text("Add to Bag")').first.click()
        await page.wait_for_selector('[data-testid="cart-subtotal"]', timeout=10000)
        subtotal = await page.get_by_test_id("cart-subtotal").inner_text()
        body = await page.locator("body").inner_text()

        assert "3,098" in subtotal or "3098" in subtotal, f"Expected ₹3,098 for one base + one customized unit, got {subtotal}. Body: {body[:500]}"
        assert "QA Mixed Custom" in body and "+₹100/unit" in body, "Expected customized unit to remain visible in cart"
        print("MIXED_CART_EDGE_TEST_PASSED")
    except Exception as e:
        print(f"MIXED_CART_EDGE_TEST_FAILED: {e}")
        raise