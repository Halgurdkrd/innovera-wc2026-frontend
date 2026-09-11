const { chromium } = require('playwright');
async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  await page.goto('https://aifootballp.com/fantasy?gw=4&tab=A_BLANK_SLATE', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  const text = await page.locator('main, body').first().innerText();
  console.log('Contains "Squad Outlook":', text.includes('Squad Outlook'));
  console.log('Contains "Reconstructed bench":', text.includes('Reconstructed bench'));
  console.log('Contains "Harvey Davies":', text.includes('Harvey Davies'));
  console.log('Contains formation 3-5-2 note:', text.includes('3-5-2'));
  await page.screenshot({ path: 'scripts/verify_best100m_panel.png', fullPage: true });
  await browser.close();
}
run().catch((e) => { console.error(e); process.exit(1); });
