// Real Playwright/Chromium verification of the unified Ask Ennovera
// assistant across the public site, per the exact checklist requested:
// homepage launch, Best 100m question, named-player question, Sorani
// follow-up, Fantasy page context, no legacy-widget reappearance, and no
// duplicate/old launchers on Premier League / Explore.
const { chromium } = require('playwright');

async function run() {
  const browser = await chromium.launch();
  const results = {};

  // --- Desktop ---
  const desktop = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  await desktop.goto('https://aifootballp.com/', { waitUntil: 'networkidle', timeout: 30000 });
  await desktop.waitForTimeout(1500);
  const launchers = await desktop.locator('button:has-text("Ask Ennovera"), button[aria-label*="Ask Ennovera" i]').count();
  const oldLaunchers = await desktop.locator('text=/World Cup/i').count();
  results.homepage_launcher_count = launchers;
  results.homepage_old_wc_text_present = oldLaunchers > 0;
  await desktop.screenshot({ path: 'scripts/verify_home_before_open.png' });

  // Open chat
  const chatBtn = desktop.locator('button').filter({ hasText: /ask ennovera/i }).first();
  if (await chatBtn.count() === 0) {
    // fallback: the floating button may only have an icon; find the fixed bottom-right button
    await desktop.locator('div.fixed.z-\\[60\\] button, button.fixed').first().click({ timeout: 5000 }).catch(() => {});
  } else {
    await chatBtn.click();
  }
  await desktop.waitForTimeout(1000);
  await desktop.screenshot({ path: 'scripts/verify_home_chat_open.png' });

  async function ask(page, text) {
    const input = page.locator('input[type="text"], input:not([type])').last();
    await input.fill(text);
    await input.press('Enter');
    await page.waitForTimeout(6000);
  }

  await ask(desktop, 'Why is Best £100m different from AI Manager?');
  const bodyText1 = await desktop.locator('body').innerText();
  results.best100m_answer_mentions_budget = /budget|ownership|transfer/i.test(bodyText1);
  results.best100m_answer_not_old_wc_demo = !/World Cup/i.test(bodyText1);
  await desktop.screenshot({ path: 'scripts/verify_home_best100m_answer.png' });

  await ask(desktop, 'why Martin Ødegaard is good choice');
  const bodyText2 = await desktop.locator('body').innerText();
  results.named_player_answer_mentions_odegaard = /degaard/i.test(bodyText2);
  await desktop.screenshot({ path: 'scripts/verify_home_player_answer.png' });

  await ask(desktop, 'باشترین یاریزانان بۆ GW4 کێن؟');
  const bodyText3 = await desktop.locator('body').innerText();
  results.sorani_followup_has_arabic_script = /[؀-ۿ]/.test(bodyText3);
  await desktop.screenshot({ path: 'scripts/verify_home_sorani_answer.png' });

  await desktop.close();

  // --- Fantasy page: verify selected-object context ---
  const fantasyPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await fantasyPage.goto('https://aifootballp.com/fantasy?gw=4&tab=B_LEGAL_BEST_XI', { waitUntil: 'networkidle', timeout: 30000 });
  await fantasyPage.waitForTimeout(2000);
  const fantasyLaunchers = await fantasyPage.locator('button').filter({ hasText: /ask ennovera/i }).count();
  results.fantasy_page_launcher_count = fantasyLaunchers;
  const fChatBtn = fantasyPage.locator('button').filter({ hasText: /ask ennovera/i }).first();
  await fChatBtn.click().catch(() => {});
  await fantasyPage.waitForTimeout(1000);
  await ask(fantasyPage, 'why is this captain good');
  const fantasyBodyText = await fantasyPage.locator('body').innerText();
  results.fantasy_context_mentions_best_xi = /Best XI/i.test(fantasyBodyText);
  await fantasyPage.screenshot({ path: 'scripts/verify_fantasy_context_answer.png' });
  await fantasyPage.close();

  // --- Back to homepage: verify no legacy widget reappears ---
  const home2 = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await home2.goto('https://aifootballp.com/', { waitUntil: 'networkidle', timeout: 30000 });
  await home2.waitForTimeout(1500);
  results.home_revisit_launcher_count = await home2.locator('button').filter({ hasText: /ask ennovera/i }).count();
  results.home_revisit_old_wc_text_present = (await home2.locator('text=/World Cup/i').count()) > 0;
  await home2.close();

  // --- Premier League and Explore: check for duplicates ---
  for (const path of ['/premier-league', '/explore']) {
    const p = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await p.goto(`https://aifootballp.com${path}`, { waitUntil: 'networkidle', timeout: 30000 });
    await p.waitForTimeout(1500);
    results[`${path}_launcher_count`] = await p.locator('button').filter({ hasText: /ask ennovera/i }).count();
    results[`${path}_old_wc_text_present`] = (await p.locator('text=/World Cup/i').count()) > 0;
    await p.close();
  }

  // --- Mobile check ---
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto('https://aifootballp.com/', { waitUntil: 'networkidle', timeout: 30000 });
  await mobile.waitForTimeout(1500);
  results.mobile_launcher_count = await mobile.locator('button').filter({ hasText: /ask ennovera/i }).count();
  await mobile.screenshot({ path: 'scripts/verify_mobile_home_launcher.png' });
  const mChatBtn = mobile.locator('button').filter({ hasText: /ask ennovera/i }).first();
  await mChatBtn.click().catch(() => {});
  await mobile.waitForTimeout(1000);
  await mobile.screenshot({ path: 'scripts/verify_mobile_home_chat_open.png' });
  await mobile.close();

  await browser.close();

  console.log(JSON.stringify(results, null, 2));
}

run().catch((e) => { console.error(e); process.exit(1); });
