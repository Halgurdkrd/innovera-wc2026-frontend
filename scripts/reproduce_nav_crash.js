const { chromium } = require('playwright');

async function testNavigation() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const pageErrors = [];
  const consoleErrors = [];

  page.on('pageerror', err => pageErrors.push({ message: err.message, stack: err.stack }));
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  console.log('1. Navigating to Home https://aifootballp.com ...');
  await page.goto('https://aifootballp.com', { waitUntil: 'networkidle' });

  console.log('2. Clicking Fantasy in nav ...');
  await page.click('a[href=\"/fantasy\"]');
  await page.waitForTimeout(2000);

  console.log('Current URL:', page.url());
  const bodyText = await page.evaluate(() => document.body.innerText);

  console.log('Has Application error:', bodyText.includes('Application error'));
  console.log('Has client-side exception:', bodyText.includes('client-side exception'));
  console.log('PAGE ERRORS:', JSON.stringify(pageErrors, null, 2));
  console.log('CONSOLE ERRORS:', JSON.stringify(consoleErrors, null, 2));

  await browser.close();
}

testNavigation().catch(console.error);
