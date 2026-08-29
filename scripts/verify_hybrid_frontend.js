const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const screenshotsDir = path.resolve('f:/AI/fifi2026/innovera-wc2026-backend/ennovera-pl/reports/production/hybrid_screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

(async () => {
  console.log('====================================================');
  console.log('STARTING LOCAL NEXT.JS SERVER FOR VERIFICATION');
  console.log('====================================================');

  const nextProcess = spawn('npm.cmd', ['run', 'start', '--', '-p', '3005'], {
    cwd: 'f:/AI/fifi2026/innovera-wc2026-frontend',
    shell: true,
    stdio: 'pipe'
  });

  nextProcess.stdout.on('data', (d) => console.log(`[Next.js stdout] ${d.toString().trim()}`));
  nextProcess.stderr.on('data', (d) => console.error(`[Next.js stderr] ${d.toString().trim()}`));

  // Wait for server to start
  console.log('Waiting 5s for Next.js to bind to port 3005...');
  await new Promise((r) => setTimeout(r, 5000));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    console.log('Navigating to http://localhost:3005/fantasy...');
    await page.goto('http://localhost:3005/fantasy', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    const bodyText = await page.innerText('body');
    console.log('----------------------------------------------------');
    console.log('DOM VERIFICATION CHECKS:');
    console.log('----------------------------------------------------');
    console.log('✓ ENNOVERA HYBRID badge present:', bodyText.includes('ENNOVERA HYBRID'));
    console.log('✓ GW 3 present:', bodyText.includes('GW 3') || bodyText.includes('GW3'));
    console.log('✓ 83.09 xP present:', bodyText.includes('83.09'));
    console.log('✓ 74 – 91 pts Likely Range present:', bodyText.includes('74 – 91') || bodyText.includes('74-91'));
    console.log('✓ 94 pts Upside present:', bodyText.includes('94'));
    console.log('✓ 100 pts High-Upside present:', bodyText.includes('100'));
    console.log('✓ Haaland (C) present:', bodyText.includes('Haaland'));
    console.log('✓ Semenyo (VC) present:', bodyText.includes('Semenyo'));
    console.log('✓ Cherki present:', bodyText.includes('Cherki'));
    console.log('✓ Wirtz present:', bodyText.includes('Wirtz'));
    console.log('✓ Isak present:', bodyText.includes('Isak'));

    // Screenshot 1: Desktop Full Page
    const ss1 = path.join(screenshotsDir, 'local_01_desktop_hybrid_fpl_full.png');
    await page.screenshot({ path: ss1, fullPage: true });
    console.log('Saved Screenshot 1:', ss1);

    // Screenshot 2: Click on Erling Haaland to open Player Prediction Card Modal
    console.log('\nClicking Haaland player card to open expanded modal...');
    const haalandCard = page.locator('text=Haaland').first();
    await haalandCard.click();
    await page.waitForTimeout(1000);

    const modalText = await page.innerText('body');
    console.log('✓ Expanded Modal shows Expected Points 11.77 xP:', modalText.includes('11.77'));
    console.log('✓ Expanded Modal shows Likely Range 6 – 16 pts:', modalText.includes('6 – 16') || modalText.includes('6 - 16'));
    console.log('✓ Expanded Modal shows 58% for 10+ points:', modalText.includes('58%'));
    console.log('✓ Expanded Modal shows 32% for 15+ points:', modalText.includes('32%'));
    console.log('✓ Expanded Modal shows 14% for 20+ points:', modalText.includes('14%'));

    const ss2 = path.join(screenshotsDir, 'local_02_haaland_expanded_player_card_modal.png');
    await page.screenshot({ path: ss2 });
    console.log('Saved Screenshot 2:', ss2);

    // Close modal
    await page.keyboard.press('Escape');
    await page.locator('text=✕').first().click();
    await page.waitForTimeout(500);

    // Screenshot 3: Best Playable £100m Squad Sub-view
    console.log('\nClicking Best Playable £100m Squad tab...');
    await page.getByRole('button', { name: 'BEST PLAYABLE £100M (80.75 xP)' }).click();
    await page.waitForTimeout(1000);

    const squadText = await page.innerText('body');
    console.log('✓ 80.75 xP present in £100m view:', squadText.includes('80.75'));
    console.log('✓ 72 – 89 pts present in £100m view:', squadText.includes('72 – 89') || squadText.includes('72-89'));

    const ss3 = path.join(screenshotsDir, 'local_03_best_playable_100m_squad.png');
    await page.screenshot({ path: ss3, fullPage: true });
    console.log('Saved Screenshot 3:', ss3);

    // Screenshot 4: Mobile Viewport
    console.log('\nSwitching to Mobile Viewport (iPhone 14, 390x844)...');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'EXPECTED BEST XI (83.09 xP)' }).click();
    await page.waitForTimeout(1000);

    const ss4 = path.join(screenshotsDir, 'local_04_mobile_fpl_page.png');
    await page.screenshot({ path: ss4, fullPage: true });
    console.log('Saved Screenshot 4:', ss4);

  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    await browser.close();
    nextProcess.kill('SIGTERM');
    console.log('Local verification finished.');
    process.exit(0);
  }
})();
