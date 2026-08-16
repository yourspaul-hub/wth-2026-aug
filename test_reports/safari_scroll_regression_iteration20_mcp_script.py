# ruff: noqa
"""
Focused browser verification script for the reported Safari/homepage rendering bug.

This is written as an async Playwright snippet for the MCP browser automation
tool, which injects an async `page` object. The same body was executed in the
browser tool during bug verification iteration 20.
"""

BASE_URL = "https://wear-interactive.preview.emergentagent.com"

async def run(page):
    results = []
    page_errors = []
    console_errors = []

    page.on("pageerror", lambda exc: page_errors.append(str(exc)))
    page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

    def record(name, ok, details=None):
        payload = {"step": name, "ok": bool(ok), "details": details or {}}
        results.append(payload)
        print(("PASS" if ok else "FAIL") + f": {name} -> {payload['details']}")

    async def wait_home_loaded():
        await page.wait_for_load_state("domcontentloaded")
        await page.wait_for_selector('[data-testid="hero-section"]', state="visible", timeout=25000)
        await page.wait_for_selector('[data-testid="home-about"]', state="attached", timeout=10000)
        await page.wait_for_timeout(300)

    async def wait_shop_loaded():
        await page.wait_for_load_state("domcontentloaded")
        await page.wait_for_selector('[data-testid="shop-title"]', state="visible", timeout=25000)
        await page.wait_for_timeout(300)

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
                computedHtmlScrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
                inlineHtmlScrollBehavior: document.documentElement.style.scrollBehavior || '',
                inlineBodyScrollBehavior: document.body.style.scrollBehavior || '',
                heroExists: !!hero,
                heroTop: heroRect ? Math.round(heroRect.top) : null,
                heroBottom: heroRect ? Math.round(heroRect.bottom) : null,
                aboutExists: !!about,
                aboutTop: aboutRect ? Math.round(aboutRect.top) : null,
                aboutBottom: aboutRect ? Math.round(aboutRect.bottom) : null,
                aboutVisible: aboutRect ? (aboutRect.top < window.innerHeight && aboutRect.bottom > 0) : false,
                topElementText: topEl ? (topEl.innerText || topEl.textContent || '').slice(0, 160) : ''
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
        await wait_home_loaded()
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
        await wait_home_loaded()
        await page.locator('[data-testid="home-about"]').scroll_into_view_if_needed()
        await page.wait_for_timeout(250)
        before = await top_info()
        await page.reload(wait_until="domcontentloaded")
        immediate = await top_info()
        await wait_home_loaded()
        after_wait = await top_info()
        ok = before["scrollY"] > 500 and immediate["scrollY"] <= 1 and after_wait["scrollY"] <= 1 and not after_wait["aboutVisible"]
        return {"ok": ok, "before": before, "immediateAfterDomContentLoaded": immediate, "afterWait": after_wait}

    async def route_navigation_top():
        await page.set_viewport_size({"width": 1440, "height": 900})
        await page.goto(f"{BASE_URL}/", wait_until="domcontentloaded")
        await wait_home_loaded()
        await page.locator('[data-testid="home-about"]').scroll_into_view_if_needed()
        await page.wait_for_timeout(250)
        before = await top_info()
        await page.locator('nav a[href="/shop"]').first.click()
        await page.wait_for_function("() => location.pathname === '/shop'", timeout=10000)
        await wait_shop_loaded()
        shop = await top_info()
        await page.locator('nav a[href="/about"]').first.click()
        await page.wait_for_function("() => location.pathname === '/about'", timeout=10000)
        await page.wait_for_load_state("domcontentloaded")
        await page.wait_for_timeout(500)
        about = await top_info()
        await page.locator('nav a[href="/contact"]').first.click()
        await page.wait_for_function("() => location.pathname === '/contact'", timeout=10000)
        await page.wait_for_load_state("domcontentloaded")
        await page.wait_for_timeout(500)
        contact = await top_info()
        ok = before["scrollY"] > 500 and shop["scrollY"] <= 1 and about["scrollY"] <= 1 and contact["scrollY"] <= 1
        return {"ok": ok, "beforeHomeScrolled": before, "shopAfterNav": shop, "aboutAfterNav": about, "contactAfterNav": contact}

    async def pageshow_bfcache_reset_instant():
        await page.set_viewport_size({"width": 1440, "height": 900})
        await page.goto(f"{BASE_URL}/", wait_until="domcontentloaded")
        await wait_home_loaded()
        await page.locator('[data-testid="home-about"]').scroll_into_view_if_needed()
        await page.wait_for_timeout(250)
        before = await top_info()
        samples = await page.evaluate("""() => {
            const readings = [];
            const read = (label) => {
                const about = document.querySelector('[data-testid="home-about"]');
                const rect = about ? about.getBoundingClientRect() : null;
                readings.push({
                    label,
                    scrollY: Math.round(window.scrollY || 0),
                    docTop: Math.round(document.documentElement.scrollTop || 0),
                    bodyTop: Math.round(document.body.scrollTop || 0),
                    aboutVisible: rect ? (rect.top < window.innerHeight && rect.bottom > 0) : false,
                    aboutTop: rect ? Math.round(rect.top) : null,
                    inlineHtmlScrollBehavior: document.documentElement.style.scrollBehavior || '',
                    inlineBodyScrollBehavior: document.body.style.scrollBehavior || '',
                    computedHtmlScrollBehavior: getComputedStyle(document.documentElement).scrollBehavior
                });
            };
            try { window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })); }
            catch (e) { window.dispatchEvent(new Event('pageshow')); }
            read('0ms-after-pageshow-dispatch');
            return readings;
        }""")
        await page.wait_for_timeout(100)
        at_100ms = await top_info()
        await page.wait_for_timeout(350)
        at_450ms = await top_info()
        await page.wait_for_timeout(800)
        at_1250ms = await top_info()
        zero_ms = samples[0]
        ok = (
            before["scrollY"] > 500
            and zero_ms["scrollY"] <= 1 and zero_ms["docTop"] <= 1
            and at_100ms["scrollY"] <= 1 and at_100ms["docTop"] <= 1
            and at_450ms["scrollY"] <= 1 and at_1250ms["scrollY"] <= 1
            and not at_100ms["aboutVisible"]
        )
        return {"ok": ok, "before": before, "samplesDuringDispatch": samples, "at100ms": at_100ms, "at450ms": at_450ms, "at1250ms": at_1250ms}

    async def hash_navigation_does_not_force_top():
        await page.set_viewport_size({"width": 1440, "height": 900})
        await page.goto(f"{BASE_URL}/shop", wait_until="domcontentloaded")
        await wait_shop_loaded()
        await page.evaluate("() => window.scrollTo(0, 700)")
        await page.wait_for_timeout(250)
        before = await top_info()
        await page.evaluate("""() => {
            history.pushState({}, '', '/shop#featured');
            window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
            try { window.dispatchEvent(new HashChangeEvent('hashchange')); } catch (e) { window.dispatchEvent(new Event('hashchange')); }
        }""")
        await page.wait_for_timeout(500)
        after = await top_info()
        ok = before["scrollY"] > 100 and after["hash"] == "#featured" and after["scrollY"] > 100 and abs(after["scrollY"] - before["scrollY"]) < 90
        return {"ok": ok, "before": before, "after": after}

    async def intentional_anchor_smooth_scroll_restored():
        await page.set_viewport_size({"width": 1440, "height": 900})
        await page.goto(f"{BASE_URL}/", wait_until="domcontentloaded")
        await wait_home_loaded()
        await page.evaluate("() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))")
        await page.wait_for_timeout(100)
        restored = await top_info()
        samples = await page.evaluate("""async () => {
            const about = document.querySelector('[data-testid="home-about"]');
            about.id = 'qa-about-anchor';
            history.replaceState({}, '', '/');
            window.scrollTo(0, 0);
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            const targetY = Math.round(about.getBoundingClientRect().top + window.scrollY);
            const anchor = document.createElement('a');
            anchor.href = '#qa-about-anchor';
            anchor.textContent = 'QA About Anchor';
            anchor.style.position = 'fixed';
            anchor.style.top = '0px';
            anchor.style.left = '0px';
            anchor.setAttribute('data-testid', 'qa-about-anchor-link');
            document.body.appendChild(anchor);
            const read = (label) => ({
                label,
                scrollY: Math.round(window.scrollY || 0),
                targetY,
                hash: location.hash,
                computedHtmlScrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
                inlineHtmlScrollBehavior: document.documentElement.style.scrollBehavior || '',
                inlineBodyScrollBehavior: document.body.style.scrollBehavior || ''
            });
            const readings = [read('before-click')];
            anchor.click();
            readings.push(read('0ms-after-click'));
            await new Promise(resolve => setTimeout(resolve, 100));
            readings.push(read('100ms-after-click'));
            await new Promise(resolve => setTimeout(resolve, 600));
            readings.push(read('700ms-after-click'));
            await new Promise(resolve => setTimeout(resolve, 800));
            readings.push(read('1500ms-after-click'));
            anchor.remove();
            return readings;
        }""")
        before_click = samples[0]
        at_0 = samples[1]
        at_100 = samples[2]
        at_700 = samples[3]
        at_1500 = samples[4]
        ok = (
            restored["scrollY"] <= 1
            and before_click["computedHtmlScrollBehavior"] == "smooth"
            and at_0["hash"] == "#qa-about-anchor"
            and at_0["scrollY"] < at_0["targetY"] - 100
            and at_100["scrollY"] > at_0["scrollY"]
            and at_100["scrollY"] < at_100["targetY"] - 100
            and abs(at_1500["scrollY"] - at_1500["targetY"]) < 12
        )
        return {"ok": ok, "afterForcedResetRestoredState": restored, "smoothScrollSamples": samples}

    try:
        await run_step("root / loads at top on mobile viewport 375x812", lambda: root_viewport(375, 812))
        await run_step("root / loads at top on tablet viewport 1024x768", lambda: root_viewport(1024, 768))
        await run_step("root / loads at top on desktop viewport 1440x900", lambda: root_viewport(1440, 900))
        await run_step("hard-refresh after scrolling to About Story lands at top immediately", reload_from_about)
        await run_step("route navigation lands at top for new routes", route_navigation_top)
        await run_step("Safari-style pageshow/bfcache reset is instant at 0ms and 100ms", pageshow_bfcache_reset_instant)
        await run_step("hash navigation /shop#featured does not force scroll-to-top", hash_navigation_does_not_force_top)
        await run_step("intentional same-page anchor scroll remains smooth after forced reset", intentional_anchor_smooth_scroll_restored)

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
    except Exception as e:
        print(f"TEST_FAILURE: {repr(e)}")
        raise