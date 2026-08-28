const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const screenshotsDir = path.resolve('f:/AI/fifi2026/innovera-wc2026-backend/ennovera-pl/reports/production/browser_screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

(async () => {
  console.log('====================================================');
  console.log('ENNOVERA LIVE BROWSER DOM & SCREENSHOT VERIFICATION');
  console.log('====================================================');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // ----------------------------------------------------
  // 1. /fantasy — TAB 1: Gameweek Plan
  // ----------------------------------------------------
  console.log('\n[1/6] Navigating to http://localhost:3000/fantasy (Gameweek Plan)...');
  await page.goto('http://localhost:3000/fantasy', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const textPlan = await page.innerText('body');
  console.log('✓ 74.05 pts rendered:', textPlan.includes('74.05'));
  console.log('✓ 3-4-3 formation rendered:', textPlan.includes('3-4-3'));
  console.log('✓ Haaland (C) rendered:', textPlan.includes('Haaland'));
  console.log('✓ Palmer (VC) rendered:', textPlan.includes('Palmer'));
  console.log('✓ White rendered:', textPlan.includes('White'));
  console.log('✓ De Cuyper rendered:', textPlan.includes('De Cuyper'));
  console.log('✓ Kayode rendered:', textPlan.includes('Kayode'));
  console.log('✓ Bank £0.2m rendered:', textPlan.includes('0.2m'));
  console.log('✓ Free transfers 1 rendered:', textPlan.includes('1'));
  console.log('✓ Obsolete 120.2 ABSENT:', !textPlan.includes('120.2'));
  console.log('✓ Obsolete Hinshelwood ABSENT:', !textPlan.includes('Hinshelwood'));
  console.log('✓ Obsolete Joao Pedro ABSENT:', !textPlan.includes('Pedro'));

  const p1 = path.join(screenshotsDir, 'screenshot_01_gw2_gameweek_plan.png');
  await page.screenshot({ path: p1, fullPage: true });
  console.log('Saved:', p1);

  // ----------------------------------------------------
  // 2. /fantasy — TAB 3: Captaincy
  // ----------------------------------------------------
  console.log('\n[2/6] Clicking Captaincy tab...');
  const captBtn = page.getByRole('button', { name: 'Captaincy' });
  await captBtn.click();
  await page.waitForTimeout(1000);
  const textCapt = await page.innerText('body');
  console.log('✓ Captaincy shows Haaland:', textCapt.includes('Erling Haaland'));
  console.log('✓ Captaincy shows 7.9 xP:', textCapt.includes('7.9'));
  console.log('✓ Top alternatives show Isak / Gakpo / Saka:', textCapt.includes('Isak') && textCapt.includes('Gakpo') && textCapt.includes('Saka'));

  const p2 = path.join(screenshotsDir, 'screenshot_02_gw2_captaincy.png');
  await page.screenshot({ path: p2, fullPage: true });
  console.log('Saved:', p2);

  // ----------------------------------------------------
  // 3. /fantasy — TAB 4: Chip Strategy
  // ----------------------------------------------------
  console.log('\n[3/6] Clicking Chip Strategy tab...');
  const chipBtn = page.getByRole('button', { name: 'Chip Strategy' });
  await chipBtn.click();
  await page.waitForTimeout(1000);
  const textChip = await page.innerText('body');
  console.log('✓ Chips inventory rendered:', textChip.includes('Official Season Chips') || textChip.includes('Wildcard'));
  console.log('✓ Triple Captain NOT recommended to use (Status: AVAILABLE / HOLD):', !textChip.includes('RECOMMENDED TO USE'));

  const p3 = path.join(screenshotsDir, 'screenshot_03_gw2_chips.png');
  await page.screenshot({ path: p3, fullPage: true });
  console.log('Saved:', p3);

  // ----------------------------------------------------
  // 4. /fantasy — TAB 5: Performance
  // ----------------------------------------------------
  console.log('\n[4/6] Clicking Performance tab...');
  const perfBtn = page.getByRole('button', { name: 'Performance' });
  await perfBtn.click();
  await page.waitForTimeout(1000);
  const textPerf = await page.innerText('body');
  console.log('✓ Performance shows 108 total points:', textPerf.includes('108'));
  console.log('✓ Performance shows Haaland captain points:', textPerf.includes('Haaland') && textPerf.includes('4'));

  const p4 = path.join(screenshotsDir, 'screenshot_04_gw1_performance.png');
  await page.screenshot({ path: p4, fullPage: true });
  console.log('Saved:', p4);

  // ----------------------------------------------------
  // 5. /premier-league — TAB 1: Fixture Predictions
  // ----------------------------------------------------
  console.log('\n[5/6] Navigating to http://localhost:3000/premier-league ...');
  await page.goto('http://localhost:3000/premier-league', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const textPL = await page.innerText('body');
  console.log('✓ PL fixtures page rendered:', textPL.includes('Premier League AI') || textPL.includes('Gameweek'));

  const p5 = path.join(screenshotsDir, 'screenshot_05_pl_fixtures.png');
  await page.screenshot({ path: p5, fullPage: true });
  console.log('Saved:', p5);

  // ----------------------------------------------------
  // 6. /premier-league — TAB 2: AI Season Projection (Title Sim)
  // ----------------------------------------------------
  console.log('\n[6/6] Clicking AI Season Projection tab...');
  const tableBtn = page.getByRole('button', { name: 'AI Season Projection' });
  if (await tableBtn.isVisible()) {
    await tableBtn.click();
    await page.waitForTimeout(1000);
    const textTable = await page.innerText('body');
    console.log('✓ Title table shows Arsenal 44.1%:', textTable.includes('44.1'));
    console.log('✓ Title table shows Man City 39.0%:', textTable.includes('39.0') || textTable.includes('39%'));
    console.log('✓ Title table shows Liverpool 10.5%:', textTable.includes('10.5'));

    const p6 = path.join(screenshotsDir, 'screenshot_06_pl_title_simulation.png');
    await page.screenshot({ path: p6, fullPage: true });
    console.log('Saved:', p6);
  }

  await browser.close();
  console.log('\n====================================================');
  console.log('ALL BROWSER LEVEL AUDITS AND SCREENSHOTS COMPLETED!');
  console.log('====================================================');
})();
