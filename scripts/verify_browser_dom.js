const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const screenshotsDir = path.resolve('f:/AI/fifi2026/innovera-wc2026-backend/ennovera-pl/reports/production/browser_screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

(async () => {
  console.log('Launching headless browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:3000/fantasy ...');
  await page.goto('http://localhost:3000/fantasy', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // 1. GW2 Gameweek Plan Tab
  const textPlan = await page.innerText('body');
  console.log('\n--- BROWSER DOM CHECK: /fantasy (Gameweek Plan) ---');
  console.log('Contains 74.05 xP:', textPlan.includes('74.05') || textPlan.includes('74.1'));
  console.log('Contains 3-4-3 formation:', textPlan.includes('3-4-3'));
  console.log('Contains Haaland (C):', textPlan.includes('Haaland'));
  console.log('Contains Palmer (VC):', textPlan.includes('Palmer'));
  console.log('Contains Saka:', textPlan.includes('Saka'));
  console.log('Contains De Cuyper:', textPlan.includes('De Cuyper'));
  console.log('Old 120.2 ABSENT:', !textPlan.includes('120.2'));
  console.log('Old Hinshelwood ABSENT:', !textPlan.includes('Hinshelwood'));
  console.log('Old Joao Pedro ABSENT:', !textPlan.includes('Pedro'));

  await page.screenshot({ path: path.join(screenshotsDir, 'screenshot_01_gw2_gameweek_plan.png'), fullPage: true });
  console.log('Saved screenshot_01_gw2_gameweek_plan.png');

  // 2. Captaincy Tab
  console.log('\nSwitching to Captaincy tab...');
  const captTab = page.locator('button:has-text("Captaincy"), button:has-text("کاپتنی")').first();
  if (await captTab.isVisible()) {
    await captTab.click();
    await page.waitForTimeout(800);
    const textCapt = await page.innerText('body');
    console.log('Captaincy tab contains Haaland:', textCapt.includes('Haaland'));
    console.log('Captaincy tab contains Palmer:', textCapt.includes('Palmer'));
    await page.screenshot({ path: path.join(screenshotsDir, 'screenshot_02_gw2_captaincy.png'), fullPage: true });
    console.log('Saved screenshot_02_gw2_captaincy.png');
  }

  // 3. Chip Strategy Tab
  console.log('\nSwitching to Chip Strategy tab...');
  const chipTab = page.locator('button:has-text("Chip Strategy"), button:has-text("ستراتیژی چیپەکان")').first();
  if (await chipTab.isVisible()) {
    await chipTab.click();
    await page.waitForTimeout(800);
    const textChips = await page.innerText('body');
    console.log('Chip tab contains HOLD / PRESERVE:', textChips.includes('HOLD') || textChips.includes('PRESERVE'));
    await page.screenshot({ path: path.join(screenshotsDir, 'screenshot_03_gw2_chips.png'), fullPage: true });
    console.log('Saved screenshot_03_gw2_chips.png');
  }

  // 4. Performance Tab
  console.log('\nSwitching to Performance tab...');
  const perfTab = page.locator('button:has-text("Performance"), button:has-text("ئەنجامەکان")').first();
  if (await perfTab.isVisible()) {
    await perfTab.click();
    await page.waitForTimeout(800);
    const textPerf = await page.innerText('body');
    console.log('Performance tab contains 108 pts:', textPerf.includes('108'));
    console.log('Performance tab contains 75.00 xP:', textPerf.includes('75'));
    await page.screenshot({ path: path.join(screenshotsDir, 'screenshot_04_gw1_performance.png'), fullPage: true });
    console.log('Saved screenshot_04_gw1_performance.png');
  }

  // 5. Premier League Page
  console.log('\nNavigating to http://localhost:3000/premier-league ...');
  await page.goto('http://localhost:3000/premier-league', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const textPL = await page.innerText('body');
  console.log('\n--- BROWSER DOM CHECK: /premier-league ---');
  console.log('PL page loaded:', textPL.length > 500);
  await page.screenshot({ path: path.join(screenshotsDir, 'screenshot_05_pl_page.png'), fullPage: true });
  console.log('Saved screenshot_05_pl_page.png');

  await browser.close();
  console.log('\nBrowser verification complete!');
})();
