const { chromium } = require('playwright');
async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto('https://aifootballp.com/fantasy?gw=4&tab=OWN_START', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  const text = await page.locator('body').innerText();
  console.log('Contains "B.Fernandes":', text.includes('B.Fernandes'));
  console.log('Contains "Bruno Borges Fernandes" (should be false on card, may appear in modal subtitle):', text.includes('Bruno Borges Fernandes'));
  await page.screenshot({ path: 'scripts/verify_webname_pitch.png', fullPage: true });
  // Open a player modal to check heading + subtitle
  const starter = page.locator('[data-role="starter"]').first();
  await starter.click().catch(() => {});
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'scripts/verify_webname_modal.png' });
  await browser.close();
}
run().catch((e) => { console.error(e); process.exit(1); });
