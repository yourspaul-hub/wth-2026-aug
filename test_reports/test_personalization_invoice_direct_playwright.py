"""Direct Order Success page check for a backend-created personalized order."""


ORDER_NUMBER = "WTH-20260814-AMP73"
BASE_URL = "https://wear-interactive.preview.emergentagent.com"


async def run_invoice_direct_check(page):
    try:
        await page.set_viewport_size({"width": 1920, "height": 1080})
        await page.goto(f"{BASE_URL}/order/{ORDER_NUMBER}", wait_until="domcontentloaded")
        await page.wait_for_selector('[data-testid="order-item-customization"]', timeout=15000)
        text = await page.locator("body").inner_text()
        custom = await page.get_by_test_id("order-item-customization").inner_text()
        assert "QA Psalm 23" in custom, custom
        assert "Qty 1 · ₹1599" in text, "Missing surcharged unit price"
        assert "₹1,599" in text, "Missing surcharged line/subtotal"
        print(f"DIRECT_INVOICE_TEST_PASSED: {ORDER_NUMBER}; {custom}")
    except Exception as e:
        print(f"DIRECT_INVOICE_TEST_FAILED: {e}")
        raise