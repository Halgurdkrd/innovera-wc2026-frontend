const { chromium } = require('playwright');
async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto('https://aifootballp.com/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1000);
  const btn = page.locator('button').filter({ hasText: /ask ennovera/i }).first();
  await btn.click().catch(() => {});
  await page.waitForTimeout(800);
  const input = page.locator('input[type="text"], input:not([type])').last();
  await input.fill('Could you find Larsen how many minutes played in gameweeks 1, 2 and 3?');
  await input.press('Enter');
  await page.waitForTimeout(6000);
  const text = await page.locator('body').innerText();
  console.log('Contains GW1: 27:', text.includes('GW1: 27'));
  console.log('Contains GW2: 62:', text.includes('GW2: 62'));
  console.log('Contains GW3: 45:', text.includes('GW3: 45'));
  console.log('Contains Total: 134:', text.includes('Total: 134'));
  await page.screenshot({ path: 'scripts/verify_larsen_minutes.png' });
  await browser.close();
}
run().catch((e) => { console.error(e); process.exit(1); });
