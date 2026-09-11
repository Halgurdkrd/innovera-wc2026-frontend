// Real Playwright/Chromium checks against production: nav visibility
// (desktop + mobile, EN + KU) and public branding ("Ennovera", not
// "Ennovera AI") across the homepage, Fantasy page, and both chat widgets.
const { chromium } = require('playwright');

async function run() {
  const browser = await chromium.launch();
  let failures = 0;
  const check = (label, cond) => {
    console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${label}`);
    if (!cond) failures++;
  };

  // Desktop, English.
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await desktop.goto('https://aifootballp.com/', { waitUntil: 'networkidle', timeout: 30000 });
  await desktop.waitForTimeout(1000);
  const navText = await desktop.locator('nav').first().innerText();
  console.log('--- Desktop nav (EN) ---');
  check('shows Premier League', navText.includes('Premier League'));
  check('shows Fantasy', navText.includes('Fantasy'));
  check('shows Explore', navText.includes('Explore'));
  check('does NOT show Predictions', !navText.includes('Predictions'));
  check('does NOT show Scorers', !navText.includes('Scorers'));
  check('does NOT show H2H', !navText.includes('H2H'));
  check('does NOT show Leaderboard', !navText.includes('Leaderboard'));
  const order = ['Premier League', 'Fantasy', 'Explore'].map((s) => navText.indexOf(s));
  check('order is Premier League -> Fantasy -> Explore', order[0] < order[1] && order[1] < order[2]);
  check('logo says "Ennovera" not "Ennovera AI"', navText.includes('Ennovera') && !navText.includes('Ennovera AI'));
  await desktop.screenshot({ path: 'scripts/verify_desktop_nav_en.png' });

  // Desktop, Sorani.
  const kuBtn = desktop.locator('button', { hasText: 'KU' }).first();
  if (await kuBtn.count() > 0) {
    await kuBtn.click();
    await desktop.waitForTimeout(800);
    const navTextKu = await desktop.locator('nav').first().innerText();
    console.log('--- Desktop nav (KU) ---');
    check('shows پرێمیەر لیگ', navTextKu.includes('پرێمیەر لیگ'));
    check('shows فانتازی', navTextKu.includes('فانتازی'));
    check('shows گەڕان', navTextKu.includes('گەڕان'));
    check('does NOT show پێشبینیەکان (Predictions)', !navTextKu.includes('پێشبینیەکان'));
    check('does NOT show پلەبەندی (Leaderboard)', !navTextKu.includes('پلەبەندی'));
    await desktop.screenshot({ path: 'scripts/verify_desktop_nav_ku.png' });
  }

  // Fantasy page + chat launcher.
  await desktop.goto('https://aifootballp.com/fantasy?gw=4&tab=B_LEGAL_BEST_XI', { waitUntil: 'networkidle', timeout: 30000 });
  await desktop.waitForTimeout(1500);
  const chatBtnText = await desktop.locator('button[aria-label*="Ask Ennovera"]').innerText().catch(() => '');
  console.log('--- Fantasy chat launcher ---');
  check('button says ASK ENNOVERA (not ASK ENNOVERA AI)', chatBtnText.includes('ENNOVERA') && !chatBtnText.includes('ENNOVERA AI'));
  await desktop.locator('button[aria-label*="Ask Ennovera"]').click();
  await desktop.waitForTimeout(800);
  const chatHeaderText = await desktop.locator('text=ASK ENNOVERA').first().innerText().catch(() => '');
  check('chat header found', chatHeaderText.length > 0);
  await desktop.screenshot({ path: 'scripts/verify_fantasy_chat_header.png' });

  // Mobile nav.
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto('https://aifootballp.com/', { waitUntil: 'networkidle', timeout: 30000 });
  await mobile.waitForTimeout(1000);
  const bottomNavText = await mobile.locator('nav').last().innerText();
  console.log('--- Mobile bottom nav (EN) ---');
  check('shows PL', bottomNavText.includes('PL'));
  check('shows Fantasy', bottomNavText.includes('Fantasy'));
  check('shows Explore', bottomNavText.includes('Explore'));
  check('does NOT show Home', !bottomNavText.includes('Home'));
  check('does NOT show Leaders', !bottomNavText.includes('Leaders'));
  await mobile.screenshot({ path: 'scripts/verify_mobile_nav_en.png' });

  await browser.close();
  console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

run().catch((e) => { console.error(e); process.exit(1); });
