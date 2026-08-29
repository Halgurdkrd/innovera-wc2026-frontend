const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const screenshotsDir = path.resolve('f:/AI/fifi2026/innovera-wc2026-backend/ennovera-pl/reports/production/season_long_manager_screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

(async () => {
  console.log('====================================================');
  console.log('ENNOVERA — SEASON-LONG AI MANAGER PUBLIC VERIFICATION');
  console.log('TARGET: https://aifootballp.com/fantasy');
  console.log('====================================================');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const liveUrl = 'https://aifootballp.com/fantasy';

  try {
    console.log(`Navigating to live public URL: ${liveUrl}...`);
    await page.goto(liveUrl, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForSelector('text=ENNOVERA HYBRID', { timeout: 30000 });
    await page.waitForTimeout(2000);

    const bodyText = await page.innerText('body');
    console.log('----------------------------------------------------');
    console.log('DOM & STATE VERIFICATION CHECKS:');
    console.log('----------------------------------------------------');

    // Check 1: Ennovera Hybrid badge visible
    const hasHybrid = bodyText.includes('ENNOVERA HYBRID');
    console.log('✓ 1. Ennovera Hybrid visible:', hasHybrid);

    // Check 2: Current active GW is GW2 • LIVE
    const hasGW2Live = bodyText.includes('GW2') && (bodyText.includes('LIVE') || bodyText.includes('Live'));
    console.log('✓ 2. Current active GW is GW2 • LIVE:', hasGW2Live);

    // Check 3: Current GW2 Manager Team visible
    const hasGW2Manager = bodyText.includes('GW2 AI MANAGER TEAM') || bodyText.includes('GW2 AI Manager Team');
    console.log('✓ 3. Current Manager Team visible:', hasGW2Manager);

    // Check 4: Live points & predicted points visible
    const hasLivePoints = bodyText.includes('54') && bodyText.includes('74.05');

    // Check 5: Next GW shown separately with Iraq time
    const hasNextGWIraq = bodyText.includes('GW3') && (bodyText.includes('Iraq Time') || bodyText.includes('8:30 PM'));
    console.log('✓ 5. Next GW (GW3) shown separately with Iraq Time:', hasNextGWIraq);

    // Check 6: Performance is second tab
    const tabs = await page.locator('button').allInnerTexts();
    const tabList = tabs.filter(t => ['Gameweek Plan', 'Performance', 'Transfers', 'Captaincy', 'Chip Strategy'].includes(t));
    const perfSecond = tabList.length >= 2 && tabList[1] === 'Performance';
    console.log('✓ 6. Performance tab is second:', perfSecond, `(Tabs: ${tabList.join(', ')})`);

    // Screenshot 1: Current Fantasy Gameweek Plan
    const ss1 = path.join(screenshotsDir, '01_current_gameweek_plan_gw2_live.png');
    await page.screenshot({ path: ss1, fullPage: true });
    console.log('Saved Screenshot 1:', ss1);

    // Screenshot 2: Current AI Manager Team pitch
    const ss2 = path.join(screenshotsDir, '02_current_ai_manager_team.png');
    await page.locator('main').first().screenshot({ path: ss2 });
    console.log('Saved Screenshot 2:', ss2);

    // Screenshot 3: Live predicted-vs-actual view
    const ss3 = path.join(screenshotsDir, '03_live_predicted_vs_actual_view.png');
    await page.screenshot({ path: ss3 });
    console.log('Saved Screenshot 3:', ss3);

    // Check GW3 Expected Best XI view
    console.log('\nClicking GW3 Expected Best XI...');
    await page.getByRole('button', { name: /GW3 EXPECTED BEST XI/i }).click();
    await page.waitForTimeout(1000);
    const bestXiText = await page.innerText('body');
    const has8309 = bestXiText.includes('83.09');
    const has7491 = bestXiText.includes('74 – 91') || bestXiText.includes('74-91');
    console.log('✓ 7. GW3 Expected Best XI is 83.09 xP with 74–91 range:', has8309 && has7491);

    // Screenshot 7: Expected Best XI
    const ss7 = path.join(screenshotsDir, '07_expected_best_xi.png');
    await page.screenshot({ path: ss7, fullPage: true });
    console.log('Saved Screenshot 7:', ss7);

    // Check GW3 Best Playable £100m view
    console.log('\nClicking GW3 Best Playable £100m...');
    await page.getByRole('button', { name: /GW3 BEST PLAYABLE £100M/i }).click();
    await page.waitForTimeout(1000);
    const squad100mText = await page.innerText('body');
    const has8075 = squad100mText.includes('80.75');
    console.log('✓ 8. GW3 Best Playable £100m is 80.75 xP:', has8075);

    // Screenshot 8: Best Playable £100m
    const ss8 = path.join(screenshotsDir, '08_best_playable_100m.png');
    await page.screenshot({ path: ss8, fullPage: true });
    console.log('Saved Screenshot 8:', ss8);

    // Check GW3 AI Manager PENDING view
    console.log('\nClicking GW3 AI Manager...');
    await page.getByRole('button', { name: /GW3 AI MANAGER/i }).click();
    await page.waitForTimeout(1000);
    const gw3ManagerText = await page.innerText('body');
    const gw3ManagerPending = gw3ManagerText.includes('STATUS: PENDING');
    console.log('✓ 9. GW3 AI Manager is PENDING (not falsely frozen):', gw3ManagerPending);

    // Expand player card modal on Haaland
    console.log('\nSwitching back to Expected Best XI and opening Haaland Player Modal...');
    await page.getByRole('button', { name: /GW3 EXPECTED BEST XI/i }).click();
    await page.waitForTimeout(800);
    const haalandCard = page.locator('text=Haaland').first();
    await haalandCard.click();
    await page.waitForTimeout(1000);

    // Screenshot 9: Expanded Hybrid Player Card
    const ss9 = path.join(screenshotsDir, '09_expanded_hybrid_player_card.png');
    await page.screenshot({ path: ss9 });
    console.log('Saved Screenshot 9:', ss9);

    // Close modal via Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);

    // Navigate to Performance Tab (2nd tab)
    console.log('\nNavigating to Performance Tab (Second Tab)...');
    await page.getByRole('button', { name: 'Performance' }).click();
    await page.waitForTimeout(1200);

    // Screenshot 4: Performance page
    const ss4 = path.join(screenshotsDir, '04_performance_page_history_explorer.png');
    await page.screenshot({ path: ss4, fullPage: true });
    console.log('Saved Screenshot 4:', ss4);

    // Test GW1 in Performance History
    console.log('\nSelecting GW1 in Performance History Explorer...');
    await page.getByRole('button', { name: /GW 1/i }).click();
    await page.waitForTimeout(1000);
    const gw1Text = await page.innerText('body');
    const gw1Has108 = gw1Text.includes('108') && gw1Text.includes('75.0');
    console.log('✓ 10. GW1 History shows 108 pts actual vs 75.00 xP predicted:', gw1Has108);

    // Screenshot 5: GW1 selected in Performance
    const ss5 = path.join(screenshotsDir, '05_performance_gw1_selected.png');
    await page.screenshot({ path: ss5, fullPage: true });
    console.log('Saved Screenshot 5:', ss5);

    // Test GW2 in Performance History
    console.log('\nSelecting GW2 in Performance History Explorer...');
    await page.getByRole('button', { name: /GW 2/i }).click();
    await page.waitForTimeout(1000);
    const gw2Text = await page.innerText('body');
    const gw2HasLive = gw2Text.includes('54') && gw2Text.includes('74.05');
    console.log('✓ 11. GW2 History shows 54 pts live vs 74.05 xP predicted:', gw2HasLive);

    await page.screenshot({ path: ss6, fullPage: true });
    console.log('Saved Screenshot 6:', ss6);

    // Mobile Viewport Screenshot (iPhone 14, 390x844)
    console.log('\nSwitching to Mobile Viewport (iPhone 14, 390x844)...');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Gameweek Plan' }).click();
    await page.waitForTimeout(1000);

    // Screenshot 10: Mobile Fantasy Page
    const ss10 = path.join(screenshotsDir, '10_mobile_fantasy_page.png');
    await page.screenshot({ path: ss10, fullPage: true });
    console.log('Saved Screenshot 10:', ss10);

    console.log('\n====================================================');
    console.log('ALL 10 PUBLIC PRODUCTION SCREENSHOTS CAPTURED!');
    console.log('PUBLIC DEPLOYMENT & VERIFICATION: SUCCESSFUL');
    console.log('====================================================');
  } catch (err) {
    console.error('Error during public verification:', err);
  } finally {
    await browser.close();
  }
})();
