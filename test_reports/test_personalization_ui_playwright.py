"""Focused Playwright steps for personalization surcharge UI verification.

This file is kept as a test artifact. The browser automation harness executes
the body of run_personalization_ui(page) inside its own async context.
"""


BASE_URL = "https://wear-interactive.preview.emergentagent.com"
CUSTOM_TEXT = "QA Jeremiah 29"


async def run_personalization_ui(page):
    try:
        await page.set_viewport_size({"width": 1920, "height": 1080})
        print("Step 1: Open personalized product and reset browser cart")
        await page.goto(f"{BASE_URL}/product/p_002", wait_until="domcontentloaded")
        await page.evaluate("""() => { localStorage.clear(); localStorage.setItem('wth_currency', 'INR'); }""")
        await page.reload(wait_until="domcontentloaded")
        await page.wait_for_selector('h1:has-text("Personalized Scripture Wallet")', timeout=15000)
        print("Product detail loaded")

        cost_text = await page.get_by_test_id("pd-personalization-cost").inner_text(timeout=10000)
        assert "100" in cost_text, f"Expected personalization cost hint ₹100, got {cost_text}"
        print(f"Product detail surcharge hint OK: {cost_text}")

        print("Step 2: Enter personalization and add to bag")
        await page.get_by_placeholder("Type name or short verse to engrave").fill(CUSTOM_TEXT)
        await page.locator('button:has-text("Add to Bag")').first.click()
        await page.wait_for_selector('[data-testid="cart-item-customization"]', timeout=10000)
        cart_custom = await page.get_by_test_id("cart-item-customization").inner_text()
        cart_subtotal = await page.get_by_test_id("cart-subtotal").inner_text()
        assert CUSTOM_TEXT in cart_custom and "100" in cart_custom, f"Cart customization/surcharge hint missing: {cart_custom}"
        assert "1,599" in cart_subtotal or "1599" in cart_subtotal, f"Cart subtotal did not include surcharge: {cart_subtotal}"
        print(f"Cart drawer OK: customization={cart_custom}; subtotal={cart_subtotal}")

        print("Step 3: Checkout summary preserves surcharged line")
        await page.locator('a[href="/checkout"]').click()
        await page.wait_for_url("**/checkout", timeout=10000)
        await page.wait_for_selector('[data-testid="checkout-item-customization"]', timeout=10000)
        checkout_custom = await page.get_by_test_id("checkout-item-customization").inner_text()
        body_text = await page.locator("body").inner_text()
        assert CUSTOM_TEXT in checkout_custom and "100" in checkout_custom, f"Checkout customization/surcharge hint missing: {checkout_custom}"
        assert "₹1,599" in body_text or "₹1599" in body_text, "Checkout summary did not show surcharged ₹1,599 line/subtotal"
        print(f"Checkout summary OK: {checkout_custom}")

        print("Step 4: Fill checkout, place order, and verify invoice/order success")
        await page.locator('label:has-text("Full name") input').fill("QA Personalization UI")
        await page.locator('label:has-text("Email") input').fill("qa.personalization.ui@example.com")
        await page.locator('label:has-text("Phone") input').fill("9876543210")
        await page.locator('label:has-text("Address line 1") input').fill("123 Test Street")
        await page.locator('label:has-text("City") input').fill("Bengaluru")
        await page.locator('label:has-text("State") input').fill("Karnataka")
        await page.locator('label:has-text("Pincode") input').fill("560001")
        await page.wait_for_timeout(500)
        await page.locator('button:has-text("Cash on Delivery")').click()
        await page.wait_for_timeout(500)
        await page.locator('button:has-text("Pay via Cash on Delivery")').click()
        await page.wait_for_url("**/order/**", timeout=20000)
        await page.wait_for_selector('[data-testid="order-item-customization"]', timeout=15000)
        order_url = page.url
        order_number = order_url.rstrip("/").split("/")[-1]
        order_custom = await page.get_by_test_id("order-item-customization").inner_text()
        invoice_text = await page.locator("body").inner_text()
        assert CUSTOM_TEXT in order_custom, f"Order success missing customization text: {order_custom}"
        assert "Qty 1 · ₹1599" in invoice_text, "Order success did not render surcharged backend unit price ₹1599"
        assert "₹1,599" in invoice_text, "Order success did not show surcharged subtotal/line total ₹1,599"
        print(f"Order success UI OK for {order_number}: {order_custom}")

        backend_order = await page.evaluate("""async (orderNumber) => {
            const r = await fetch('https://wear-interactive.preview.emergentagent.com/api/orders/' + orderNumber);
            return await r.json();
        }""", order_number)
        assert backend_order["subtotal"] == 1599, f"Backend order from UI subtotal mismatch: {backend_order}"
        assert backend_order["items"][0]["price"] == 1599, f"Backend order from UI item price mismatch: {backend_order}"
        assert backend_order["items"][0].get("customization") == CUSTOM_TEXT, f"Backend order from UI customization mismatch: {backend_order}"
        print(f"UI-created backend order OK: subtotal={backend_order['subtotal']}, item_price={backend_order['items'][0]['price']}")

        error_text = await page.evaluate("""() => {
        const errorElements = Array.from(document.querySelectorAll('.error, [class*="error"], [id*="error"]'));
        return errorElements.map(el => el.textContent).join(", ");
        }""")
        if error_text:
            print(f"Found error message: {error_text}")
        else:
            print("No error messages found on the page")

        print("PERSONALIZATION_UI_TEST_PASSED")
    except Exception as e:
        print(f"PERSONALIZATION_UI_TEST_FAILED: {e}")
        error_text = await page.evaluate("""() => {
        const errorElements = Array.from(document.querySelectorAll('.error, [class*="error"], [id*="error"]'));
        return errorElements.map(el => el.textContent).join(", ");
        }""")
        if error_text:
            print(f"Found error message: {error_text}")
        else:
            print("No error messages found on the page")
        raise