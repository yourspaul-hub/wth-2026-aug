
import json
try:
    print('Starting checkout tax UI test: active global GST 5%')
    await page.set_viewport_size({"width": 1920, "height": 1080})
    cart = [{
        "id": "p_001",
        "slug": "faith-cap-blessed",
        "name": "Faith Cap — Blessed Edition",
        "price": 899,
        "image": "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800",
        "qty": 1,
        "product_type": "physical"
    }]
    await page.add_init_script("""
        localStorage.setItem('wth_cart', JSON.stringify(%s));
        localStorage.setItem('wth_currency', 'INR');
        localStorage.setItem('wth_wish', '[]');
    """ % json.dumps(cart))
    await page.goto('https://wear-interactive.preview.emergentagent.com/checkout', wait_until='domcontentloaded')
    await page.wait_for_timeout(1500)
    await page.wait_for_selector('[data-testid="tax-line-0"]', timeout=10000)
    tax_line = (await page.locator('[data-testid="tax-line-0"]').inner_text()).strip()
    print(f'Tax line text: {tax_line}')
    assert 'GST 5%' in tax_line, 'checkout tax line did not use admin-configured GST 5% name'
    assert '(5%)' in tax_line, 'checkout tax line did not display 5% percent'
    assert 'included' in tax_line, 'checkout tax line did not indicate included tax when prices_include_tax=true'
    body = await page.locator('body').inner_text()
    assert 'GST 12%' not in body, 'checkout still shows hardcoded GST 12% while only GST 5% is configured'
    total_text = (await page.locator('[data-testid="checkout-total"]').inner_text()).strip()
    print(f'Total text with included tax: {total_text}')
    assert '₹998' in total_text or '₹998.00' in total_text, 'included-tax total should be subtotal 899 + shipping 99 = 998; tax must not be added again'
    # Get error messages using specific selectors
    error_text = await page.evaluate("""() => {
    const errorElements = Array.from(document.querySelectorAll('.error, [class*="error"], [id*="error"]'));
    return errorElements.map(el => el.textContent).join(", ");
    }""")
    if error_text:
        print(f"Found error message: {error_text}")
    else:
        print("No error messages found on the page")
    print('UI GST 5% checkout tax preview test passed')
except Exception as e:
    print(f'UI GST 5% checkout tax preview test failed: {e}')
    await page.screenshot(path='/app/test_reports/checkout_tax_ui_5_failure.jpg', quality=40, full_page=False)
    raise
