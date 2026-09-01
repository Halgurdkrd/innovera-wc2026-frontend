const { chromium } = require('playwright');

async function testLocalUI() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  const pageErrors = [];
  const consoleErrors = [];

  page.on('pageerror', err => pageErrors.push({ message: err.message, stack: err.stack }));
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  console.log('=== TEST 1: Direct navigation to http://localhost:3009/fantasy ===');
  await page.goto('http://localhost:3009/fantasy', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  let bodyText = await page.evaluate(() => document.body.innerText);
  console.log('Direct load Application error:', bodyText.includes('Application error'));
  console.log('Direct load World Cup text:', bodyText.includes('2026 World Cup') || bodyText.includes('Group I'));
  console.log('Direct load ASK ENNOVERA AI button:', bodyText.includes('ASK ENNOVERA AI'));

  console.log('\n=== TEST 2: Client-side navigation from Home / to /fantasy ===');
  await page.goto('http://localhost:3009/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  
  let homeText = await page.evaluate(() => document.body.innerText);
  console.log('Home page has WC chat / AI Assistant:', homeText.includes('Ennovera AI Assistant') || homeText.includes('World Cup'));

  // Click Fantasy in Navbar
  await page.click('a[href=\"/fantasy\"]');
  await page.waitForTimeout(2000);

  console.log('URL after click:', page.url());
  bodyText = await page.evaluate(() => document.body.innerText);
  console.log('Client nav Application error:', bodyText.includes('Application error'));
  console.log('Client nav World Cup text:', bodyText.includes('2026 World Cup') || bodyText.includes('Group I'));
  console.log('Client nav ASK ENNOVERA AI button:', bodyText.includes('ASK ENNOVERA AI'));

  console.log('\n=== TEST 3: Interacting with ASK ENNOVERA AI drawer ===');
  const chatBtn = await page.locator('button[aria-label=\"Open Ask Ennovera AI Chat\"]').first();
  const isChatBtnVisible = await chatBtn.isVisible();
  console.log('Found Ask Ennovera AI button:', isChatBtnVisible);
  if (isChatBtnVisible) {
    await chatBtn.click();
    await page.waitForTimeout(1000);

    const drawerVisible = await page.evaluate(() => {
      const el = document.querySelector('div.fixed.z-50.bottom-4');
      return el ? window.getComputedStyle(el).opacity === '1' : false;
    });
    console.log('Drawer opened and visible:', drawerVisible);

    const drawerText = await page.evaluate(() => {
      const el = document.querySelector('div.fixed.z-50.bottom-4');
      return el ? el.innerText : '';
    });
    console.log('Drawer text snippet:', drawerText.substring(0, 300));
    console.log('Drawer mentions Fantasy intro:', drawerText.includes('Ask about player predictions') || drawerText.includes('Fantasy Football Intelligence'));
    console.log('Drawer has World Cup text:', drawerText.includes('2026 World Cup') || drawerText.includes('Group I'));

    console.log('\n=== TEST 4: Sending message 1: Who should I captain next Gameweek? ===');
    const inputField = page.locator('input[placeholder*=\"Ask Ennovera AI\"]').first();
    if (await inputField.isVisible()) {
      await inputField.fill('Who should I captain next Gameweek?');
      await page.keyboard.press('Enter');
      console.log('Submitted question, waiting for response...');
      await page.waitForTimeout(3000);

      const chatContent = await page.evaluate(() => {
        const el = document.querySelector('div.flex-1.overflow-y-auto');
        return el ? el.innerText : '';
      });
      console.log('Chat response for captain:\n', chatContent);
      console.log('Contains Haaland / 11.77 xP:', chatContent.includes('Haaland') && chatContent.includes('11.77'));
      console.log('Contains World Cup strings:', chatContent.includes('World Cup') || chatContent.includes('Group I') || chatContent.includes('Morocco'));

      console.log('\n=== TEST 5: Sending message 2: Best midfielder under £7m next Gameweek? ===');
      await inputField.fill('Best midfielder under £7m next Gameweek?');
      await page.keyboard.press('Enter');
      console.log('Submitted question 2, waiting for response...');
      await page.waitForTimeout(3000);

      const chatContent2 = await page.evaluate(() => {
        const el = document.querySelector('div.flex-1.overflow-y-auto');
        return el ? el.innerText : '';
      });
      console.log('Chat response 2:\n', chatContent2);
      console.log('Contains Semenyo:', chatContent2.includes('Semenyo'));
    }
  }

  console.log('\n=== EXCEPTIONS / ERRORS AUDIT ===');
  console.log('Page errors count:', pageErrors.length, JSON.stringify(pageErrors));
  console.log('Console errors count:', consoleErrors.length, JSON.stringify(consoleErrors));

  await browser.close();
}

testLocalUI().catch(console.error);
