// Captures a real, rendered-browser screenshot of the live production
// Fantasy page's pitch at a 375px mobile viewport, for the specific
// "xP/points text centering" check. Not a simulated/manual check --
// actual Playwright + actual Chromium rendering the actual live page.
const { chromium } = require('playwright');

async function run() {
  const label = process.argv[2] || 'snapshot';
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await page.goto('https://aifootballp.com/fantasy?gw=4&tab=B_LEGAL_BEST_XI', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2500);
  const pitch1 = page.locator('[data-role="starter"]').first();
  await pitch1.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `scripts/mobile_pitch_${label}_bestxi.png`, fullPage: false });
  await page.screenshot({ path: `scripts/mobile_pitch_${label}_bestxi_full.png`, fullPage: true });

  // Also the 5-wide MID row on the AI Manager tab (own_start), the case
  // most likely to show any residual overflow/centering issue.
  await page.goto('https://aifootballp.com/fantasy?gw=4&tab=OWN_START', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2500);
  const pitch2 = page.locator('[data-role="starter"]').first();
  await pitch2.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `scripts/mobile_pitch_${label}_aimanager.png`, fullPage: false });
  await page.screenshot({ path: `scripts/mobile_pitch_${label}_aimanager_full.png`, fullPage: true });

  await browser.close();
  console.log(`Captured scripts/mobile_pitch_${label}_bestxi.png and scripts/mobile_pitch_${label}_aimanager.png`);
}

run().catch((e) => { console.error(e); process.exit(1); });
