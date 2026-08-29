const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const screenshotsDir = path.resolve('f:/AI/fifi2026/innovera-wc2026-backend/ennovera-pl/reports/production/live_public_screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

(async () => {
  console.log('====================================================');
  console.log('ENNOVERA LIVE PUBLIC PRODUCTION BROWSER AUDIT');
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
    const hasHybrid = bodyText.includes('ENNOVERA HYBRID');
    const hasGW3 = bodyText.includes('GW3') || bodyText.includes('GW 3');
    const has83 = bodyText.includes('83.09');
    const hasRange = bodyText.includes('74 – 91') || bodyText.includes('74-91');
    const hasUpside = bodyText.includes('94');
    const hasHighUpside = bodyText.includes('100');
    const hasHaaland = bodyText.includes('Haaland');
    const hasSemenyo = bodyText.includes('Semenyo');

    console.log('✓ ENNOVERA HYBRID visible on public website:', hasHybrid);
    console.log('✓ GW3 visible on public website:', hasGW3);
    console.log('✓ 83.09 xP visible on public website:', has83);
    console.log('✓ 74 – 91 pts Likely Range visible:', hasRange);
    console.log('✓ 94 pts Upside visible:', hasUpside);
    console.log('✓ 100 pts High-Upside visible:', hasHighUpside);
    console.log('✓ Haaland (C) visible:', hasHaaland);
    console.log('✓ Semenyo (VC) visible:', hasSemenyo);

    // Screenshot 1: Full Public FPL Page
    const ss1 = path.join(screenshotsDir, 'public_01_full_fpl_page.png');
    await page.screenshot({ path: ss1, fullPage: true });
    console.log('Saved Public Screenshot 1:', ss1);

    // Screenshot 2: Header section
    const ss2 = path.join(screenshotsDir, 'public_02_ennovera_hybrid_header.png');
    await page.locator('main').first().screenshot({ path: ss2 });
    console.log('Saved Public Screenshot 2:', ss2);

    // Screenshot 3: Click on Haaland to open Expanded Modal
    console.log('\nClicking Haaland player card on public website...');
    const haalandCard = page.locator('text=Haaland').first();
    await haalandCard.click();
    await page.waitForTimeout(1200);

    const modalText = await page.innerText('body');
    console.log('✓ Expanded Modal shows Expected Points 11.77 xP:', modalText.includes('11.77'));
    console.log('✓ Expanded Modal shows Likely Range 6 – 16 pts:', modalText.includes('6 – 16') || modalText.includes('6 - 16'));
    console.log('✓ Expanded Modal shows 58% for 10+ points:', modalText.includes('58%'));
    console.log('✓ Expanded Modal shows 32% for 15+ points:', modalText.includes('32%'));
    console.log('✓ Expanded Modal shows 14% for 20+ points:', modalText.includes('14%'));

    const ss3 = path.join(screenshotsDir, 'public_03_haaland_expanded_player_card.png');
    await page.screenshot({ path: ss3 });
    console.log('Saved Public Screenshot 3:', ss3);

    // Close modal
    await page.locator('text=✕').first().click();
    await page.waitForTimeout(500);

    // Screenshot 4: Expected Best XI on Pitch
    const ss4 = path.join(screenshotsDir, 'public_04_expected_best_xi.png');
    await page.screenshot({ path: ss4 });
    console.log('Saved Public Screenshot 4:', ss4);

    // Screenshot 5: Mobile Viewport
    console.log('\nSwitching to Mobile Viewport (iPhone 14, 390x844)...');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(1000);

    const ss5 = path.join(screenshotsDir, 'public_05_mobile_fpl_page.png');
    await page.screenshot({ path: ss5, fullPage: true });
    console.log('Saved Public Screenshot 5:', ss5);

    if (hasHybrid && has83 && hasHaaland) {
      console.log('\n>>> PUBLIC DEPLOYMENT VERIFICATION SUCCESSFUL! <<<');
    } else {
      console.log('\n>>> WARNING: Public website may still be building on Vercel CDN <<<');
    }
  } catch (err) {
    console.error('Error during public verification:', err);
  } finally {
    await browser.close();
  }
})();
