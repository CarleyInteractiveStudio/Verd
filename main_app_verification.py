import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto("http://localhost:8001")

        await page.wait_for_timeout(1000)

        await page.evaluate("""() => {
            sessionStorage.setItem('jobId', 'test-job-123');
            sessionStorage.setItem('totalFrames', '10');

            const event = new CustomEvent('jobSubmitted');
            document.dispatchEvent(event);
        }""")

        await page.wait_for_selector('#queue-status-panel', timeout=5000)

        # Use a relative path for the screenshot
        screenshot_dir = 'verification'
        os.makedirs(screenshot_dir, exist_ok=True)
        screenshot_path = os.path.join(screenshot_dir, 'main_app_status_ui.png')

        status_container = await page.query_selector('#queue-status-panel')
        if status_container:
            await status_container.screenshot(path=screenshot_path)
            print(f"Successfully took screenshot: {screenshot_path}")
        else:
            print("Error: Status container not found after simulation.")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
