const { chromium } = require('playwright');

async function askViaWidget(page, text) {
  const btn = page.locator('button').filter({ hasText: /ask ennovera/i }).first();
  if (await btn.count() > 0) await btn.click().catch(() => {});
  await page.waitForTimeout(800);
  const input = page.locator('input[type="text"], input:not([type])').last();
  await input.fill(text);
  await input.press('Enter');
  await page.waitForTimeout(6000);
}

async function run() {
  const browser = await chromium.launch();
  const results = {};

  // Desktop, homepage (no pageContext)
  const desktop = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await desktop.goto('https://aifootballp.com/', { waitUntil: 'networkidle', timeout: 30000 });
  await desktop.waitForTimeout(1000);
  await askViaWidget(desktop, 'Compare Saka and Palmer.');
  let text = await desktop.locator('body').innerText();
  results.desktop_compare_mentions_both = /Saka/.test(text) && /Palmer/.test(text);
  results.desktop_compare_has_xp = /xP \d/.test(text);
  await desktop.screenshot({ path: 'scripts/verify_compare_desktop.png' });

  await askViaWidget(desktop, 'Best midfielder under £7m.');
  text = await desktop.locator('body').innerText();
  results.desktop_budget_has_pool_language = /full eligible pool/i.test(text);
  await desktop.screenshot({ path: 'scripts/verify_budget_desktop.png' });
  await desktop.close();

  // Mobile, homepage
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto('https://aifootballp.com/', { waitUntil: 'networkidle', timeout: 30000 });
  await mobile.waitForTimeout(1000);
  await askViaWidget(mobile, 'Show five forwards costing no more than £8m.');
  text = await mobile.locator('body').innerText();
  results.mobile_budget_has_pool_language = /full eligible pool/i.test(text);
  await mobile.screenshot({ path: 'scripts/verify_budget_mobile.png' });
  await mobile.close();

  // Sorani, homepage
  const sorani = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await sorani.goto('https://aifootballp.com/', { waitUntil: 'networkidle', timeout: 30000 });
  await sorani.waitForTimeout(1000);
  const kuBtn = sorani.locator('button', { hasText: 'KU' }).first();
  if (await kuBtn.count() > 0) await kuBtn.click().catch(() => {});
  await askViaWidget(sorani, 'بەراوردی ساکا و پاڵمەر');
  text = await sorani.locator('body').innerText();
  results.sorani_compare_has_arabic_script = /[؀-ۿ]/.test(text);
  await sorani.screenshot({ path: 'scripts/verify_compare_sorani.png' });
  await sorani.close();

  await browser.close();
  console.log(JSON.stringify(results, null, 2));
}
run().catch((e) => { console.error(e); process.exit(1); });
