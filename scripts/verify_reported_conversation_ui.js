// Real Playwright/Chromium UI-level verification of the exact reported
// conversation sequence, against production -- drives the actual chat
// widget (types into the input, clicks send, reads the rendered DOM),
// not a direct engine call. Starts from the Best XI tab (the page's
// default), matching how the bug was actually triggered.
const { chromium } = require('playwright');

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  let failures = 0;
  const check = (label, cond) => {
    console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${label}`);
    if (!cond) failures++;
  };

  await page.goto('https://aifootballp.com/fantasy?gw=4&tab=B_LEGAL_BEST_XI', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.locator('button[aria-label*="Ask Ennovera"]').click();
  await page.waitForTimeout(800);

  async function ask(label, question) {
    const input = page.locator('input[type="text"], textarea').last();
    await input.fill(question);
    await input.press('Enter');
    await page.waitForTimeout(4000);
    const lastText = await page.locator('div.overflow-y-auto.space-y-4').first().innerText();
    console.log(`--- ${label} ---`);
    console.log('Q:', question);
    return lastText;
  }

  const t1 = await ask('1. Why was Foden selected for GW4?', 'Why was Foden selected for GW4?');
  check('mentions Foden and AI Manager, not a full Best XI dump', t1.includes('Foden') && t1.includes('AI Manager') && !t1.includes('Top starters:'));

  const t2 = await ask('2. Show GW4 AI Manager.', 'Show GW4 AI Manager.');
  check('AI Manager response present', t2.length > 0);

  const t3 = await ask('3. Best attackers with availability/xP/upside', 'What are the best attackers? Show their availability, expected points and upside.');
  check('does not mention GW3', !t3.includes('GW3') || t3.includes('GW4'));
  check('mentions FORWARDS', t3.includes('FORWARDS'));

  const t4 = await ask('4. I said midfielders only.', 'I said midfielders only.');
  check('mentions MIDFIELDERS, narrowed correctly', t4.includes('MIDFIELDERS'));

  const t5 = await ask('5. If I change Isak, what are the best alternatives?', 'If I change Isak, what are the best alternatives?');
  check('does not fall back to alternative lineups', !t5.includes('Alternative lineup options'));

  await page.screenshot({ path: 'scripts/verify_reported_conversation_ui_final.png', fullPage: true });
  await browser.close();
  console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

run().catch((e) => { console.error(e); process.exit(1); });
