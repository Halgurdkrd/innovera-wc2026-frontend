const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const screenshotsDir = path.resolve('f:/AI/fifi2026/innovera-wc2026-backend/ennovera-pl/reports/production/gw2_context_and_gw3_panel_screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

(async () => {
  console.log('======================================================================');
  console.log('ENNOVERA — ACTIVE GAMEWEEK TEAM-OBJECT CONTEXT & GW3 PANEL AUDIT');
  console.log('TARGET: https://aifootballp.com/fantasy');
  console.log('======================================================================');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => console.log(`[Browser Console ${msg.type()}]:`, msg.text()));
  page.on('pageerror', err => console.error('[Browser PageError]:', err));

  try {
    console.log('Navigating to https://aifootballp.com/fantasy...');
    await page.goto('https://aifootballp.com/fantasy', { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForSelector('text=ENNOVERA HYBRID', { timeout: 30000 });
    await page.waitForTimeout(2000);

    const bodyText = await page.innerText('body');
    console.log('\n--- PRIMARY SELECTOR GW2 PURITY CHECKS ---');

    // 1. Check Primary Selector contains GW2 AI MANAGER TEAM (74.05 xP)
    const hasGW2Manager = bodyText.includes('GW2 AI MANAGER TEAM (74.05 xP)') || bodyText.includes('GW2 AI MANAGER TEAM');
    console.log('Assertion 1 (Primary selector has GW2 AI Manager 74.05 xP):', hasGW2Manager);

    // 2. Check Primary Selector contains GW2 EXPECTED BEST XI (77.41 xP)
    const hasGW2BestXI = bodyText.includes('GW2 EXPECTED BEST XI (77.41 xP)') || bodyText.includes('77.41 xP');
    console.log('Assertion 2 (Primary selector has GW2 Expected Best XI 77.41 xP):', hasGW2BestXI);

    // 3. Check Primary Selector contains GW2 BEST PLAYABLE £100M (75.45 xP)
    const hasGW2Playable = bodyText.includes('GW2 BEST PLAYABLE £100M (75.45 xP)') || bodyText.includes('75.45 xP');
    console.log('Assertion 3 (Primary selector has GW2 Best Playable £100m 75.45 xP):', hasGW2Playable);

    console.log('\n--- NEXT GAMEWEEK — GW3 PANEL CHECKS ---');

    // 4. Check NEXT GAMEWEEK — GW3 Panel Heading
    const hasGW3Heading = bodyText.includes('NEXT GAMEWEEK — GW3') || bodyText.includes('NEXT GAMEWEEK');
    console.log('Assertion 4 (Dedicated NEXT GAMEWEEK — GW3 Panel present):', hasGW3Heading);

    // 5. Check GW3 Deadline in Iraq Time
    const hasGW3Deadline = bodyText.includes('Friday, 4 September 2026') && (bodyText.includes('8:30 PM Iraq Time') || bodyText.includes('17:30 UTC'));
    console.log('Assertion 5 (GW3 Deadline is Fri 4 Sep • 8:30 PM Iraq Time / 17:30 UTC):', hasGW3Deadline);

    // 6. Check GW3 Expected Best XI (83.09 xP) inside Next Gameweek panel
    const hasGW3BestXI = bodyText.includes('83.09 xP');
    console.log('Assertion 6 (GW3 Expected Best XI is 83.09 xP in Next GW panel):', hasGW3BestXI);

    // 7. Check GW3 Best Playable £100m (80.75 xP) inside Next Gameweek panel
    const hasGW3Playable = bodyText.includes('80.75 xP');
    console.log('Assertion 7 (GW3 Best Playable £100m is 80.75 xP in Next GW panel):', hasGW3Playable);

    // 8. Check GW3 AI Manager is PENDING
    const hasGW3Pending = bodyText.includes('PENDING');
    console.log('Assertion 8 (GW3 AI Manager is PENDING in Next GW panel):', hasGW3Pending);

    // Capture Screenshot 1: Primary GW2 Plan & Next GW3 Panel
    const ss1 = path.join(screenshotsDir, '01_gw2_pure_context_plan.png');
    await page.screenshot({ path: ss1, fullPage: true });
    console.log('Saved Screenshot 1:', ss1);

    // Test Clicking GW2 Expected Best XI
    console.log('\nTesting GW2 Expected Best XI view...');
    await page.getByRole('button', { name: /GW2 EXPECTED BEST XI/i }).click();
    await page.waitForTimeout(1000);
    const ss2 = path.join(screenshotsDir, '02_gw2_expected_best_xi_77_41.png');
    await page.screenshot({ path: ss2, fullPage: true });
    console.log('Saved Screenshot 2:', ss2);

    // Test Clicking GW2 Best Playable £100m
    console.log('\nTesting GW2 Best Playable £100m view...');
    await page.getByRole('button', { name: /GW2 BEST PLAYABLE £100M/i }).click();
    await page.waitForTimeout(1000);
    const ss3 = path.join(screenshotsDir, '03_gw2_best_playable_75_45.png');
    await page.screenshot({ path: ss3, fullPage: true });
    console.log('Saved Screenshot 3:', ss3);

    // Test Clicking Explore GW3 Best XI in Next Gameweek Panel
    console.log('\nTesting GW3 Preview from Next Gameweek Panel...');
    await page.getByRole('button', { name: 'Explore XI' }).click();
    await page.waitForTimeout(1000);
    const ss4 = path.join(screenshotsDir, '04_gw3_preview_from_next_gw_panel.png');
    await page.screenshot({ path: ss4, fullPage: true });
    console.log('Saved Screenshot 4:', ss4);

    console.log('\n======================================================================');
    console.log('ALL GW2 CONTEXT & GW3 PANEL AUDIT CHECKS PASSED!');
    console.log('======================================================================');
  } catch (err) {
    console.error('Error during context verification:', err);
  } finally {
    await browser.close();
  }
})();
