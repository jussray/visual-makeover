"""Real browser entrance/step lock smoke. No paid generation or remote provider calls."""
import time
import urllib.request
from playwright.sync_api import sync_playwright, expect

origin = "http://127.0.0.1:4317"
for attempt in range(60):
    try:
        with urllib.request.urlopen(origin, timeout=2) as response:
            if response.status == 200:
                break
    except Exception:
        time.sleep(1)
else:
    raise RuntimeError("MoodMockup dev server failed to become ready")

with sync_playwright() as p:
    browser = p.chromium.launch()
    for width in (320, 1280):
        page = browser.new_page(viewport={"width": width, "height": 800})
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(origin, wait_until="networkidle")
        expect(page.get_by_role("heading", name="Gather what inspires you")).to_be_visible()
        page.get_by_role("button", name="Browse reference library").click()
        expect(page.get_by_role("heading", name="Reference library")).to_be_visible()
        assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), f"horizontal overflow at {width}px"
        refs = page.locator("section").filter(has=page.get_by_role("heading", name="Reference library")).get_by_role("button")
        if refs.count() < 3:
            refs = page.locator("button[aria-pressed]")
        assert refs.count() >= 3
        for n in range(3):
            refs.nth(n).click()
        expect(page.get_by_role("heading", name="Your board (3)")).to_be_visible()
        page.goto(origin + "/mockups", wait_until="networkidle")
        expect(page.get_by_text("Finish your brief and describe your app first.")).to_be_visible()
        assert not errors, errors
        page.close()
    browser.close()
