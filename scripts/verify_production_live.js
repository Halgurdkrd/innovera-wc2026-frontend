const { chromium } = require('playwright');

async function testProductionLive() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  const pageErrors = [];
  const consoleErrors = [];

  page.on('pageerror', err => pageErrors.push({ message: err.message, stack: err.stack }));
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  console.log('=== STEP 1: Direct navigation to https://aifootballp.com/fantasy ===');
  await page.goto('https://aifootballp.com/fantasy', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  let bodyText = await page.evaluate(() => document.body.innerText);
  console.log('Direct load Application error:', bodyText.includes('Application error'));
  console.log('Direct load World Cup text:', bodyText.includes('2026 World Cup') || bodyText.includes('Group I'));
  console.log('Direct load ASK ENNOVERA AI button:', bodyText.includes('ASK ENNOVERA AI'));

  console.log('\n=== STEP 2: Client-side navigation from Home to /fantasy ===');
  await page.goto('https://aifootballp.com/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Click Fantasy in Navbar
  await page.click('a[href=\"/fantasy\"]');
  await page.waitForTimeout(2500);

  console.log('URL after nav:', page.url());
  bodyText = await page.evaluate(() => document.body.innerText);
  console.log('Client nav Application error:', bodyText.includes('Application error'));
  console.log('Client nav World Cup text:', bodyText.includes('2026 World Cup') || bodyText.includes('Group I'));
  console.log('Client nav ASK ENNOVERA AI button:', bodyText.includes('ASK ENNOVERA AI'));

  console.log('\n=== STEP 3: Visible Chat Buttons Count ===');
  const chatButtons = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.filter(b => {
      const text = b.innerText.trim();
      const aria = b.getAttribute('aria-label') || '';
      return text.includes('ASK ENNOVERA') || text.includes('Chat') || aria.includes('Chat') || aria.includes('Assistant');
    }).map(b => ({ text: b.innerText.trim(), ariaLabel: b.getAttribute('aria-label') }));
  });
  console.log('Visible chat buttons:', JSON.stringify(chatButtons, null, 2));

  console.log('\n=== STEP 4: Open ASK ENNOVERA AI drawer on live production ===');
  const chatBtn = page.locator('button[aria-label=\"Open Ask Ennovera AI Chat\"]').first();
  const isVisible = await chatBtn.isVisible();
  console.log('Chat button visible:', isVisible);

  if (isVisible) {
    await chatBtn.click();
    await page.waitForTimeout(1000);

    const drawerSnippet = await page.evaluate(() => {
      const el = document.querySelector('div.fixed.z-50.bottom-4');
      return el ? el.innerText : '';
    });
    console.log('Drawer snippet:\n', drawerSnippet.substring(0, 300));
    console.log('Has Fantasy greeting:', drawerSnippet.includes('Ask about player predictions') || drawerSnippet.includes('Fantasy Football Intelligence'));
    console.log('Has World Cup text:', drawerSnippet.includes('2026 World Cup') || drawerSnippet.includes('Group I'));

    console.log('\n=== STEP 5: Type question 1: Who should I captain next Gameweek? ===');
    const inputField = page.locator('input[placeholder*=\"Ask Ennovera AI\"]').first();
    if (await inputField.isVisible()) {
      await inputField.fill('Who should I captain next Gameweek?');
      await page.keyboard.press('Enter');
      console.log('Waiting for response...');
      await page.waitForTimeout(4000);

      const chatContent1 = await page.evaluate(() => {
        const el = document.querySelector('div.flex-1.overflow-y-auto');
        return el ? el.innerText : '';
      });
      console.log('Full chat content after Q1:\n', chatContent1);

      console.log('\n=== STEP 6: Type question 2: Best midfielder under £7m next Gameweek? ===');
      await inputField.fill('Best midfielder under £7m next Gameweek?');
      await page.keyboard.press('Enter');
      console.log('Waiting for response...');
      await page.waitForTimeout(4000);

      const chatContent2 = await page.evaluate(() => {
        const el = document.querySelector('div.flex-1.overflow-y-auto');
        return el ? el.innerText : '';
      });
      console.log('Full chat content after Q2:\n', chatContent2);
    }
  }

  console.log('\n=== STEP 7: Check World Cup Chat on Home page is still intact ===');
  await page.goto('https://aifootballp.com/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const wcChatBtn = page.locator('button[aria-label=\"Ennovera AI Assistant\"]').first();
  const wcChatVisible = await wcChatBtn.isVisible();
  console.log('WC Chat button visible on Home:', wcChatVisible);

  console.log('\n=== AUDIT RESULTS ===');
  console.log('Page errors count:', pageErrors.length, JSON.stringify(pageErrors));
  console.log('Console errors count:', consoleErrors.length, JSON.stringify(consoleErrors));

  await browser.close();
}

testProductionLive().catch(console.error);
