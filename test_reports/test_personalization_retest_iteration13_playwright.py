"""Focused browser test cases for personalization surcharge retest (iteration 13).

Executed through the MCP Playwright runner against:
https://wear-interactive.preview.emergentagent.com/product/p_002

Core executable flow used by the runner:
- Clear localStorage keys `wth_cart` and `wth_currency`, open `/product/p_002`.
- Mixed-cart edge case:
  1. Click Product Detail `Add to Bag` with no customization.
  2. Assert `[data-testid="cart-subtotal"]` digits == `1499`.
  3. Close cart drawer, fill personalization input with `Grace`, click `Add to Bag`.
  4. Assert `[data-testid="cart-subtotal"]` digits == `3098`.
  5. Assert exactly one `[data-testid="cart-item-customization"]` row and text contains
     `Grace` and `+₹100/unit`.
  6. Proceed to `/checkout`, assert checkout subtotal row digits == `3098` and
     `[data-testid="checkout-item-customization"]` contains `Grace` and surcharge text.
  7. Fill checkout shipping form, select `Cash on Delivery`, click
     `Pay via Cash on Delivery`, assert URL matches `/order/WTH-*`.
  8. Assert `[data-testid="order-item-customization"]` contains `Grace`.
  9. Fetch `/api/orders/<order_number>` in-browser and assert subtotal == `3098`, with
     one plain line priced `1499` and one customized line priced `1599`.
- Single personalized regression:
  1. Clear cart, add p_002 with customization `Mercy`.
  2. Assert cart subtotal == `1599`, checkout subtotal == `1599`.
  3. Complete Cash on Delivery checkout and assert Order Success renders customization.
  4. Fetch `/api/orders/<order_number>` and assert subtotal == `1599` and item price == `1599`.
- Plain regression:
  1. Clear cart, add p_002 without customization.
  2. Assert cart subtotal == `1499` and no `[data-testid="cart-item-customization"]` rows.

Payments are MOCKED by the application payment verification endpoint.
"""