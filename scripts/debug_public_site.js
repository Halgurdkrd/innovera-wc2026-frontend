const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log(`[Browser Console ${msg.type()}]:`, msg.text()));
  page.on('pageerror', err => console.error('[Browser PageError]:', err));

  try {
    console.log('Navigating to https://aifootballp.com/fantasy...');
    const res = await page.goto('https://aifootballp.com/fantasy', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('HTTP Status:', res.status());
    await page.waitForTimeout(3000);
    const title = await page.title();
    console.log('Page Title:', title);
    const bodyText = await page.innerText('body');
    console.log('Body Text snippet (first 500 chars):', bodyText.slice(0, 500));
  } catch (e) {
    console.error('Error navigating:', e);
  } finally {
    await browser.close();
  }
})();
