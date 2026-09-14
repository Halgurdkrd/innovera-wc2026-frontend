const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({ headless: true });

  for (const [label, viewport] of [['desktop', { width: 1400, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    console.log(`\n=== ${label} ===`);
    await page.goto('http://localhost:3100/fantasy?gw=4&tab=OWN_START', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const badge = await page.locator('text=Gameweek in progress').first().count();
    console.log('Live-provisional badge present:', badge > 0);

    const pointsBlock = await page.locator('text=Points so far').first().count();
    console.log('Points-so-far block present:', pointsBlock > 0);

    const refreshBtn = await page.locator('button:has-text("Refresh now")').first().count();
    console.log('Refresh now button present:', refreshBtn > 0);

    const provisionalStar = await page.locator('text=*').first().count();
    console.log('Provisional marker (*) present somewhere:', provisionalStar > 0);

    await page.screenshot({ path: `scripts/verify_gw4_live_${label}.png`, fullPage: true });
    await context.close();
  }

  await browser.close();
  console.log('\nDone.');
}

main().catch((e) => { console.error(e); process.exit(1); });
