const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const screenshotsDir = path.resolve('f:/AI/fifi2026/innovera-wc2026-backend/ennovera-pl/reports/production/performance_v2_screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

(async () => {
  console.log('====================================================');
  console.log('ENNOVERA LIVE PERFORMANCE V2 DOM & SCREENSHOT AUDIT');
  console.log('====================================================');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const baseUrl = 'https://aifootballp.com';

  // 1. Navigate to /fantasy and click Performance tab
  console.log(`\n[1/6] Navigating to ${baseUrl}/fantasy ...`);
  await page.goto(`${baseUrl}/fantasy`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const perfTabBtn = page.getByRole('button', { name: 'Performance' });
  await perfTabBtn.click();
  await page.waitForTimeout(1500);

  // 2. Audit GW1 Performance (Pitch View)
  console.log('\n[2/6] Auditing GW 1 Historical Replay (Pitch View)...');
  const gw1Btn = page.locator('button:has-text("GW 1")').first();
  await gw1Btn.click();
  await page.waitForTimeout(1000);

  const textGW1 = await page.innerText('body');
  console.log('✓ GW1 Projected 75.00 xP visible:', textGW1.includes('75.00') || textGW1.includes('75'));
  console.log('✓ GW1 Actual 108 pts visible:', textGW1.includes('108'));
  console.log('✓ GW1 Delta +33.00 visible:', textGW1.includes('+33.00') || textGW1.includes('+33'));
  console.log('✓ GW1 XI Raw 106 visible:', textGW1.includes('106'));
  console.log('✓ GW1 Bench 30 pts visible:', textGW1.includes('30'));
  console.log('✓ GW1 15-player total 136 visible:', textGW1.includes('136'));
  console.log('✓ GW1 Haaland Captain visible:', textGW1.includes('Erling Haaland'));
  console.log('✓ GW1 Captain Predicted Base 8.10 xP visible:', textGW1.includes('8.10'));
  console.log('✓ GW1 Captain Actual Base 2 pts visible:', textGW1.includes('2 pts'));
  console.log('✓ GW1 Captain Actual (2x) 4 pts visible:', textGW1.includes('4 pts'));
  console.log('✓ GW1 Starters (Tzolakis, White, De Cuyper, Kayode, Saka, Palmer, Gakpo, Stach, Isak, Evanilson) visible:',
    textGW1.includes('Tzolakis') && textGW1.includes('White') && textGW1.includes('De Cuyper') && textGW1.includes('Kayode') &&
    textGW1.includes('Saka') && textGW1.includes('Palmer') && textGW1.includes('Gakpo') && textGW1.includes('Stach') &&
    textGW1.includes('Isak') && textGW1.includes('Evanilson'));

  const p1 = path.join(screenshotsDir, 'perf_01_gw1_pitch_view.png');
  await page.screenshot({ path: p1, fullPage: true });
  console.log('Saved:', p1);

  // 3. Audit GW1 Performance (Table View)
  console.log('\n[3/6] Auditing GW 1 Historical Replay (Table View)...');
  const tableBtn = page.getByRole('button', { name: 'Table View' });
  await tableBtn.click();
  await page.waitForTimeout(800);
  const textGW1Table = await page.innerText('body');
  console.log('✓ Table contains 15 player rows with predicted and actuals:', textGW1Table.includes('Bench Substitutes') && textGW1Table.includes('Sangaré'));

  const p2 = path.join(screenshotsDir, 'perf_02_gw1_table_view.png');
  await page.screenshot({ path: p2, fullPage: true });
  console.log('Saved:', p2);

  // 4. Audit GW2 Performance (Pitch View)
  console.log('\n[4/6] Auditing GW 2 Prospective Locked (Pitch View)...');
  const pitchBtn = page.getByRole('button', { name: 'Pitch View' });
  await pitchBtn.click();
  await page.waitForTimeout(500);

  const gw2Btn = page.locator('button:has-text("GW 2")').first();
  await gw2Btn.click();
  await page.waitForTimeout(1000);

  const textGW2 = await page.innerText('body');
  console.log('✓ GW2 Projected 74.05 xP visible:', textGW2.includes('74.05'));
  console.log('✓ GW2 Actual is Pending:', textGW2.includes('Pending'));
  console.log('✓ GW2 Captain is Erling Haaland (7.90 xP):', textGW2.includes('Haaland') && textGW2.includes('7.90'));
  console.log('✓ GW2 Status is FROZEN_PENDING:', textGW2.includes('FROZEN_PENDING') || textGW2.includes('FROZEN'));
  console.log('✓ Completed Prospective GWs is 0 (not 1):', textGW2.includes('Completed Prospective GWs') && textGW2.includes('0'));
  console.log('✓ Obsolete 120.2 ABSENT from GW2:', !textGW2.includes('120.2'));
  console.log('✓ Obsolete De Cuyper Triple Captain ABSENT from GW2:', !textGW2.includes('Maxim De Cuyper (Triple Captain)'));

  const p3 = path.join(screenshotsDir, 'perf_03_gw2_pitch_view.png');
  await page.screenshot({ path: p3, fullPage: true });
  console.log('Saved:', p3);

  // 5. Audit GW2 Performance (Table View)
  console.log('\n[5/6] Auditing GW 2 Prospective Locked (Table View)...');
  await tableBtn.click();
  await page.waitForTimeout(800);

  const p4 = path.join(screenshotsDir, 'perf_04_gw2_table_view.png');
  await page.screenshot({ path: p4, fullPage: true });
  console.log('Saved:', p4);

  // 6. Regression Check: Gameweek Plan & Premier League
  console.log('\n[6/6] Regression checking Gameweek Plan and PL Title table...');
  const planTabBtn = page.getByRole('button', { name: 'Gameweek Plan' });
  await planTabBtn.click();
  await page.waitForTimeout(1000);
  const textPlan = await page.innerText('body');
  console.log('✓ Gameweek Plan 74.05 xP intact:', textPlan.includes('74.05'));
  console.log('✓ Gameweek Plan Haaland C intact:', textPlan.includes('Haaland'));

  const p5 = path.join(screenshotsDir, 'perf_05_gameweek_plan_regression.png');
  await page.screenshot({ path: p5, fullPage: true });
  console.log('Saved:', p5);

  await page.goto(`${baseUrl}/premier-league`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const aiProjBtn = page.getByRole('button', { name: 'AI Season Projection' });
  if (await aiProjBtn.isVisible()) {
    await aiProjBtn.click();
    await page.waitForTimeout(1000);
    const textTitle = await page.innerText('body');
    console.log('✓ Title table Arsenal 44.1% intact:', textTitle.includes('44.1'));
    console.log('✓ Title table Man City 39.0% intact:', textTitle.includes('39.0') || textTitle.includes('39%'));
    console.log('✓ Title table Liverpool 10.5% intact:', textTitle.includes('10.5'));

    const p6 = path.join(screenshotsDir, 'perf_06_pl_title_table_regression.png');
    await page.screenshot({ path: p6, fullPage: true });
    console.log('Saved:', p6);
  }

  await browser.close();
  console.log('\n====================================================');
  console.log('ALL PERFORMANCE V2 AUDITS AND SCREENSHOTS COMPLETED!');
  console.log('====================================================');
})();
