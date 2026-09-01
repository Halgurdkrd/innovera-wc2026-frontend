const { chromium } = require('playwright');

async function testPublic() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  const consoleLogs = [];
  const errors = [];
  const pageErrors = [];
  const failedRequests = [];

  page.on('console', msg => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  page.on('pageerror', err => {
    pageErrors.push({ message: err.message, stack: err.stack });
  });

  page.on('requestfailed', req => {
    failedRequests.push({ url: req.url(), failure: req.failure() });
  });

  console.log('Navigating to https://aifootballp.com/fantasy ...');
  try {
    const response = await page.goto('https://aifootballp.com/fantasy', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('HTTP Status:', response ? response.status() : 'no response');
  } catch (err) {
    console.log('Navigation error:', err.message);
  }

  await page.waitForTimeout(3000);

  const bodyText = await page.evaluate(() => document.body.innerText);
  const html = await page.content();

  console.log('=== PAGE REPRODUCTION REPORT ===');
  console.log('Has Application error:', bodyText.includes('Application error'));
  console.log('Has client-side exception:', bodyText.includes('client-side exception'));
  console.log('Has 2026 World Cup in text:', bodyText.includes('2026 World Cup'));
  console.log('Has ASK ENNOVERA AI in text:', bodyText.includes('ASK ENNOVERA AI'));
  console.log('Has Fantasy Football Intelligence:', bodyText.includes('Fantasy Football Intelligence'));

  console.log('\n=== PAGE ERRORS (Exceptions) ===');
  console.log(JSON.stringify(pageErrors, null, 2));

  console.log('\n=== CONSOLE ERRORS ===');
  console.log(JSON.stringify(errors, null, 2));

  console.log('\n=== BUTTONS FOUND ON PAGE ===');
  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map(b => ({
      text: b.innerText.trim(),
      ariaLabel: b.getAttribute('aria-label'),
      className: b.className
    }));
  });
  console.log(JSON.stringify(buttons, null, 2));

  console.log('\n=== BODY TEXT SNIPPET (first 1000 chars) ===');
  console.log(bodyText.substring(0, 1000));

  await browser.close();
}

testPublic().catch(console.error);
