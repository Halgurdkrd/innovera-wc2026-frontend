const { chromium } = require('playwright');
async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://aifootballp.com/', { waitUntil: 'networkidle' });
  const btn = page.locator('button[aria-label=\"Open AI chat assistant\"]');
  console.log('WC Chat button on Home:', await btn.isVisible());
  if (await btn.isVisible()) {
    await btn.click();
    await page.waitForTimeout(1000);
    const dialog = page.locator('div[role=\"dialog\"]');
    console.log('WC Chat dialog visible:', await dialog.isVisible());
    console.log('WC Chat text:', (await dialog.innerText()).substring(0, 150));
  }
  await browser.close();
}
run();
