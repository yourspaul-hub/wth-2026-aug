
import json
try:
    print('Starting checkout tax UI test: prices_include_tax=false exclusive total')
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
    await page.wait_for_timeout(2000)
    await page.wait_for_selector('[data-testid="tax-line-0"]', timeout=10000)
    tax_line = (await page.locator('[data-testid="tax-line-0"]').inner_text()).strip()
    print(f'Tax line text: {tax_line}')
    assert 'GST 10%' in tax_line and '(10%)' in tax_line, 'exclusive-tax checkout line should show configured GST 10%'
    assert 'included' not in tax_line, 'exclusive-tax checkout line should not say included'
    assert '₹90' in tax_line or '₹90.00' in tax_line, 'exclusive-tax amount should be 10% of 899 rounded = 90'
    total_text = (await page.locator('[data-testid="checkout-total"]').inner_text()).strip()
    print(f'Total text with exclusive tax: {total_text}')
    assert '₹1,088' in total_text or '₹1088' in total_text or '₹1,088.00' in total_text, 'exclusive-tax total should be subtotal 899 + shipping 99 + tax 90 = 1088'
    # Get error messages using specific selectors
    error_text = await page.evaluate("""() => {
    const errorElements = Array.from(document.querySelectorAll('.error, [class*="error"], [id*="error"]'));
    return errorElements.map(el => el.textContent).join(", ");
    }""")
    if error_text:
        print(f"Found error message: {error_text}")
    else:
        print("No error messages found on the page")
    print('UI exclusive tax total test passed')
except Exception as e:
    print(f'UI exclusive tax total test failed: {e}')
    await page.screenshot(path='/app/test_reports/checkout_tax_ui_exclusive_failure.jpg', quality=40, full_page=False)
    raise
