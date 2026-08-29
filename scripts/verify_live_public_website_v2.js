const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const screenshotsDir = path.resolve('f:/AI/fifi2026/innovera-wc2026-backend/ennovera-pl/reports/production/live_public_screenshots_v2');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

(async () => {
  console.log('====================================================');
  console.log('ENNOVERA LIVE PUBLIC PRODUCTION BROWSER AUDIT V2');
  console.log('TARGET: https://aifootballp.com/fantasy');
  console.log('====================================================');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const liveUrl = 'https://aifootballp.com/fantasy';

  try {
    console.log(`Navigating to live public URL: ${liveUrl}...`);
    await page.goto(liveUrl, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(3000);

    const bodyText = await page.innerText('body');
    console.log('----------------------------------------------------');
    console.log('LIVE DOM VERIFICATION CHECKS:');
    console.log('----------------------------------------------------');
    
    // Check 1: Performance is second tab
    const tabs = await page.locator('button').allInnerTexts();
    const tabList = tabs.filter(t => ['Gameweek Plan', 'Performance', 'Transfers', 'Captaincy', 'Chip Strategy'].includes(t));
    const perfSecond = tabList.length >= 2 && tabList[1] === 'Performance';
    console.log('✓ A. Performance is second tab:', perfSecond, `(Tabs: ${tabList.join(', ')})`);

    // Check 2: Expected Best XI explanation
    const bestXiExpl = bodyText.includes('without the full £100m 15-player squad-budget constraint');
    console.log('✓ B. Expected Best XI explanation fixed (no £100m constraint):', bestXiExpl);

    // Check 3: Best Playable £100m explanation
    await page.getByRole('button', { name: /BEST PLAYABLE £100M/i }).click();
    await page.waitForTimeout(800);
    const squad100mText = await page.innerText('body');
    const best100mExpl = squad100mText.includes('fully legal 15-player FPL squad costing no more than £100m');
    console.log('✓ C. Best Playable £100m explanation fixed (complete 15-player squad):', best100mExpl);

    // Check 4 & 5: AI Manager Team status PENDING and no fake GW3 manager team
    await page.getByRole('button', { name: /AI MANAGER TEAM/i }).click();
    await page.waitForTimeout(800);
    const managerText = await page.innerText('body');
    const managerPending = managerText.includes('STATUS: PENDING') || managerText.includes('AI Manager Team Pending');
    const noFakeManager = !managerText.includes('81.87 xP') && managerText.includes('will be finalized after GW2 completion');
    console.log('✓ D. AI Manager Team says PENDING (not FROZEN):', managerPending);
    console.log('✓ E. No fake GW3 Manager Team appears:', noFakeManager);

    // Switch back to Expected Best XI
    await page.getByRole('button', { name: /EXPECTED BEST XI/i }).click();
    await page.waitForTimeout(800);

    // Check 6: Deadline format is human-readable (not raw ISO)
    const rawIsoAbsent = !bodyText.includes('2026-09-04T17:30:00Z');
    const humanDeadline = bodyText.includes('Sep 2026') || bodyText.includes('17:30 UTC');
    console.log('✓ F. Deadline format is human-readable:', rawIsoAbsent && humanDeadline);

    // Check 7: 10+ probability wording
    const haulWording = bodyText.includes('10+ Points Chance') || bodyText.includes('Chance of 10+ pts') || bodyText.includes('10+:');
    console.log('✓ G. 10+ probability wording is clear:', haulWording);

    // Check 8: Captain presentation
    const captainClarified = bodyText.includes('Captain contribution:') && bodyText.includes('Captain points are counted twice');
    console.log('✓ H. Captain presentation does not imply extra double-counting:', captainClarified);

    // Check 9 & 10: Expected Best XI 83.09 and Best Playable 80.75
    const has8309 = bodyText.includes('83.09');
    const has8075 = bodyText.includes('80.75');
    console.log('✓ I. Expected Best XI is 83.09 xP:', has8309);
    console.log('✓ J. Best Playable £100m is 80.75 xP:', has8075);

    // Screenshots
    const ss1 = path.join(screenshotsDir, 'live_01_fpl_gameweek_plan.png');
    await page.screenshot({ path: ss1, fullPage: true });
    console.log('Saved Screenshot 1:', ss1);

    // Screenshot of Manager tab
    await page.getByRole('button', { name: /AI MANAGER TEAM/i }).click();
    await page.waitForTimeout(600);
    const ss2 = path.join(screenshotsDir, 'live_02_ai_manager_pending_status.png');
    await page.screenshot({ path: ss2 });
    console.log('Saved Screenshot 2:', ss2);

    // Screenshot of Performance tab
    await page.getByRole('button', { name: 'Performance' }).click();
    await page.waitForTimeout(800);
    const ss3 = path.join(screenshotsDir, 'live_03_performance_tab_second.png');
    await page.screenshot({ path: ss3, fullPage: true });
    console.log('Saved Screenshot 3:', ss3);

    console.log('\n>>> LIVE PRODUCTION VERIFICATION COMPLETE! <<<');
  } catch (err) {
    console.error('Error during live public verification:', err);
  } finally {
    await browser.close();
  }
})();
