import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto("http://localhost:8002")

        await page.wait_for_selector('input[placeholder*="Admin API Key"]', timeout=5000)

        await page.fill('input[placeholder*="Server URL"]', 'http://localhost:8000')
        await page.fill('input[placeholder*="Admin API Key"]', 'test-api-key')
        await page.click('button:has-text("Save & Connect")')

        await page.wait_for_timeout(1000)

        await page.wait_for_selector('#create-code-panel', timeout=5000)

        # Use a relative path for the screenshot
        screenshot_dir = 'verification'
        os.makedirs(screenshot_dir, exist_ok=True)
        screenshot_path = os.path.join(screenshot_dir, 'admin_panel_verification.png')

        await page.screenshot(path=screenshot_path)
        print(f"Successfully took screenshot: {screenshot_path}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
