"""
Focused browser verification script for the reported Safari/homepage rendering bug.

This is written as an async Playwright snippet for the MCP browser automation
tool, which injects an async `page` object. The same body was executed in the
browser tool during bug verification.
"""

BASE_URL = "https://wear-interactive.preview.emergentagent.com"

async def run(page):
    results = []
    page_errors = []
    console_errors = []

    page.on("pageerror", lambda exc: page_errors.append(str(exc)))
    page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

    def record(name, ok, details=None):
        status = "PASS" if ok else "FAIL"
        payload = {"step": name, "ok": ok, "details": details or {}}
        results.append(payload)
        print(f"{status}: {name} -> {payload['details']}")

    async def wait_home_loaded(label):
        await page.wait_for_load_state("domcontentloaded")
        await page.wait_for_selector('[data-testid="hero-section"]', state="visible", timeout=25000)
        await page.wait_for_selector('[data-testid="home-about"]', state="attached", timeout=10000)
        await page.wait_for_timeout(500)

    async def wait_shop_loaded(label):
        await page.wait_for_load_state("domcontentloaded")
        await page.wait_for_selector('[data-testid="shop-title"]', state="visible", timeout=25000)
        await page.wait_for_timeout(500)

    async def top_info():
        return await page.evaluate("""() => {
            const about = document.querySelector('[data-testid="home-about"]');
            const hero = document.querySelector('[data-testid="hero-section"]');
            const shopTitle = document.querySelector('[data-testid="shop-title"]');
            const aboutRect = about ? about.getBoundingClientRect() : null;
            const heroRect = hero ? hero.getBoundingClientRect() : null;
            const topEl = document.elementFromPoint(Math.floor(window.innerWidth / 2), Math.min(140, Math.floor(window.innerHeight / 2)));
            return {
                url: location.href,
                pathname: location.pathname,
                hash: location.hash,
                scrollY: Math.round(window.scrollY || 0),
                docTop: Math.round(document.documentElement.scrollTop || 0),
                bodyTop: Math.round(document.body.scrollTop || 0),
                scrollRestoration: history.scrollRestoration,
                heroExists: !!hero,
                heroTop: heroRect ? Math.round(heroRect.top) : null,
                heroBottom: heroRect ? Math.round(heroRect.bottom) : null,
                heroText: hero ? hero.innerText.slice(0, 180) : '',
                shopTitle: shopTitle ? shopTitle.innerText : '',
                aboutExists: !!about,
                aboutTop: aboutRect ? Math.round(aboutRect.top) : null,
                aboutVisible: aboutRect ? (aboutRect.top < window.innerHeight && aboutRect.bottom > 0) : false,
                aboutText: about ? about.innerText.slice(0, 180) : '',
                topElementText: topEl ? (topEl.innerText || topEl.textContent || '').slice(0, 180) : ''
            };
        }""")

    async def run_step(name, fn):
        try:
            details = await fn()
            record(name, bool(details.get("ok")), details)
        except Exception as e:
            record(name, False, {"error": repr(e), "url": page.url})

    async def root_viewport(width, height):
        await page.set_viewport_size({"width": width, "height": height})
        await page.goto(f"{BASE_URL}/", wait_until="domcontentloaded")
        await wait_home_loaded(f"root {width}x{height}")
        info = await top_info()
        ok = (
            info["scrollY"] <= 1 and info["docTop"] <= 1 and info["bodyTop"] <= 1
            and info["scrollRestoration"] == "manual"
            and info["heroExists"] and info["aboutExists"] and not info["aboutVisible"]
        )
        return {"ok": ok, "viewport": f"{width}x{height}", **info}

    async def reload_from_about():
        await page.set_viewport_size({"width": 1440, "height": 900})
        await page.goto(f"{BASE_URL}/", wait_until="domcontentloaded")
        await wait_home_loaded("reload setup")
        await page.locator('[data-testid="home-about"]').scroll_into_view_if_needed()
        await page.wait_for_timeout(300)
        before = await top_info()
        await page.reload(wait_until="domcontentloaded")
        await wait_home_loaded("after reload")
        after = await top_info()
        ok = before["scrollY"] > 500 and after["scrollY"] <= 1 and after["docTop"] <= 1 and not after["aboutVisible"]
        return {"ok": ok, "before": before, "after": after}

    async def route_to_shop_and_back():
        await page.set_viewport_size({"width": 1440, "height": 900})
        await page.goto(f"{BASE_URL}/", wait_until="domcontentloaded")
        await wait_home_loaded("back setup")
        await page.locator('[data-testid="home-about"]').scroll_into_view_if_needed()
        await page.wait_for_timeout(300)
        about_scrolled = await top_info()
        await page.locator('nav a[href="/shop"]').first.click()
        await page.wait_for_function("() => location.pathname === '/shop'", timeout=10000)
        await wait_shop_loaded("shop after nav")
        shop_info = await top_info()
        await page.go_back(wait_until="domcontentloaded")
        await page.wait_for_function("() => location.pathname === '/'", timeout=10000)
        await wait_home_loaded("home after browser back")
        back_info = await top_info()
        ok = about_scrolled["scrollY"] > 500 and shop_info["scrollY"] <= 1 and back_info["scrollY"] <= 1 and not back_info["aboutVisible"]
        return {"ok": ok, "aboutScrolled": about_scrolled, "shopAfterClick": shop_info, "homeAfterBack": back_info}

    async def pageshow_bfcache_reset():
        await page.set_viewport_size({"width": 1440, "height": 900})
        await page.goto(f"{BASE_URL}/", wait_until="domcontentloaded")
        await wait_home_loaded("pageshow setup")
        await page.locator('[data-testid="home-about"]').scroll_into_view_if_needed()
        await page.wait_for_timeout(300)
        before = await top_info()
        await page.evaluate("""() => {
            try { window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })); }
            catch (e) { window.dispatchEvent(new Event('pageshow')); }
        }""")
        await page.wait_for_timeout(300)
        after = await top_info()
        ok = before["scrollY"] > 500 and after["scrollY"] <= 1 and after["docTop"] <= 1 and not after["aboutVisible"]
        return {"ok": ok, "before": before, "after": after}

    async def hash_navigation_preserves_scroll():
        await page.set_viewport_size({"width": 1440, "height": 900})
        await page.goto(f"{BASE_URL}/shop", wait_until="domcontentloaded")
        await wait_shop_loaded("hash setup")
        await page.evaluate("() => window.scrollTo(0, 700)")
        await page.wait_for_timeout(300)
        before = await top_info()
        await page.evaluate("""() => {
            history.pushState({}, '', '/shop#featured');
            window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
            try { window.dispatchEvent(new HashChangeEvent('hashchange')); } catch (e) { window.dispatchEvent(new Event('hashchange')); }
        }""")
        await page.wait_for_timeout(700)
        after = await top_info()
        ok = before["scrollY"] > 100 and after["hash"] == "#featured" and after["scrollY"] > 100 and abs(after["scrollY"] - before["scrollY"]) < 80
        return {"ok": ok, "before": before, "after": after}

    async def local_storage_private_mode_add_to_bag():
        await page.add_init_script("""(() => {
            Object.defineProperty(Storage.prototype, 'setItem', {
                value: function() { throw new Error('no'); }, configurable: true
            });
            window.__qaStorageSetItemThrows = true;
        })();""")
        errors_before_load = len(page_errors)
        await page.set_viewport_size({"width": 1440, "height": 900})
        await page.goto(f"{BASE_URL}/?qa_private_storage=1", wait_until="domcontentloaded")
        await wait_home_loaded("private storage home")
        home = await top_info()
        patch = await page.evaluate("""() => {
            let throws = false;
            try { localStorage.setItem('qa_probe', '1'); } catch (e) { throws = e && e.message === 'no'; }
            return { patchedFlag: window.__qaStorageSetItemThrows === true, setItemThrows: throws };
        }""")
        errors_after_load = len(page_errors)
        await page.goto(f"{BASE_URL}/shop?qa_private_storage=1", wait_until="domcontentloaded")
        await wait_shop_loaded("private storage shop")
        await page.wait_for_selector('[data-testid^="product-card-add-"]', state="attached", timeout=25000)
        errors_before_add = len(page_errors)
        await page.locator('[data-testid^="product-card-add-"]').first.click(force=True)
        await page.wait_for_timeout(1200)
        add_state = await page.evaluate("""() => {
            const subtotal = document.querySelector('[data-testid="cart-subtotal"]');
            const cartAside = subtotal ? subtotal.closest('aside') : null;
            const rect = cartAside ? cartAside.getBoundingClientRect() : null;
            const drawerOpen = !!rect && rect.left < window.innerWidth && rect.right > window.innerWidth - 460;
            const toastText = Array.from(document.querySelectorAll('[data-sonner-toast], [role="status"], [role="alert"], [class*="sonner"]'))
                .map(el => el.innerText || el.textContent || '').filter(Boolean).join(' | ');
            return { drawerOpen, cartSubtotalText: subtotal ? subtotal.innerText : '', toastText, bodyHasAdded: /added/i.test(document.body.innerText) };
        }""")
        errors_after_add = len(page_errors)
        ok = (
            patch["patchedFlag"] and patch["setItemThrows"] and home["heroExists"] and home["scrollY"] <= 1
            and errors_after_load == errors_before_load
            and errors_after_add == errors_before_add
            and (add_state["drawerOpen"] or add_state["bodyHasAdded"] or "added" in add_state["toastText"].lower())
        )
        return {"ok": ok, "patch": patch, "home": home, "addState": add_state, "newErrorsOnLoad": errors_after_load - errors_before_load, "newErrorsOnAdd": errors_after_add - errors_before_add}

    await run_step("root loads at top on mobile Safari-sized viewport 375x812", lambda: root_viewport(375, 812))
    await run_step("root loads at top on tablet viewport 1024x768", lambda: root_viewport(1024, 768))
    await run_step("root loads at top on desktop viewport 1440x900", lambda: root_viewport(1440, 900))
    await run_step("hard refresh after About Story scroll returns to top", reload_from_about)
    await run_step("route navigation to /shop and browser Back to / both return top", route_to_shop_and_back)
    await run_step("Safari-style pageshow/bfcache event resets restored About Story scroll", pageshow_bfcache_reset)
    await run_step("hash navigation /shop#featured does not force scroll top", hash_navigation_preserves_scroll)
    await run_step("localStorage.setItem throwing still renders home and Add to Bag works", local_storage_private_mode_add_to_bag)

    failures = [r for r in results if not r["ok"]]
    print("FINAL_RESULTS", results)

    # Get error messages using specific selectors
    error_text = await page.evaluate("""() => {
    const errorElements = Array.from(document.querySelectorAll('.error, [class*="error"], [id*="error"]'));
    return errorElements.map(el => el.textContent).join(", ");
    }""")
    if error_text:
        print(f"Found error message: {error_text}")
    else:
        print("No error messages found on the page")

    if page_errors:
        print("Page errors captured:", page_errors)
    if console_errors:
        print("Console errors captured:", console_errors[:10])
    if failures:
        raise AssertionError(f"Focused scroll regression failures: {failures}")
    print("SUCCESS: focused Safari/homepage scroll restoration regression passed in the available browser engine")
