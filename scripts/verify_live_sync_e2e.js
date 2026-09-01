const { chromium } = require('playwright');
const http = require('http');

function fetchLocal(path) {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:3009' + path, (res) => {
      let data = ''; res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve(null); } });
    }).on('error', reject);
  });
}

async function testE2E() {
  console.log('=== STEP 1: Test /api/fpl/performance Endpoint ===');
  const perf = await fetchLocal('/api/fpl/performance');
  console.log('Season:', perf.season);
  const gw2 = perf.gameweeks.find(g => g.gameweek === 2);
  console.log('GW2 Status:', gw2.status);
  console.log('Manager Actual Total:', gw2.actual_total);
  console.log('Manager XI Raw:', gw2.xi_raw_actual);
  console.log('Captain Extra:', gw2.captain_actual_extra);
  console.log('Expected Best XI Total:', gw2.expected_best_xi.actual_total);
  console.log('Best Playable 100m Total:', gw2.best_playable_100m.actual_total);
  console.log('Cumulative Score:', perf.summary.historical_actual_total + gw2.actual_total);

  console.log('\n=== STEP 2: Test /api/fpl/gameweek/plan Endpoint ===');
  const plan = await fetchLocal('/api/fpl/gameweek/plan');
  console.log('Plan GW:', plan.gameweek);
  console.log('Plan Starters count:', plan.starting_xi ? plan.starting_xi.length : 0);
  console.log('Plan Generated at:', plan.generated_at);
  console.log('Plan Data cutoff:', plan.data_cutoff);

  console.log('\n=== STEP 3: Browser UI Verification with Playwright ===');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  await page.goto('http://localhost:3009/fantasy', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const bodyText = await page.evaluate(() => document.body.innerText);

  console.log('Page has GW2 Live Score: 85 pts:', bodyText.includes('85') && bodyText.includes('Live Score'));
  console.log('Page has 11 Finished • 0 Remaining:', bodyText.includes('11 Finished') && bodyText.includes('0 Remaining'));
  console.log('Page has Haaland (26 pts):', bodyText.includes('Haaland') && bodyText.includes('26 pts'));
  console.log('Page has Season Total 193 pts:', bodyText.includes('193 pts'));

  console.log('\n=== STEP 4: Switch Team Objects and Verify Scores ===');
  // Click Expected Best XI object button
  await page.click('button:has-text(\"EXPECTED BEST XI\")');
  await page.waitForTimeout(1000);
  const bestXIText = await page.evaluate(() => document.body.innerText);
  console.log('Expected Best XI banner shows 100 pts:', bestXIText.includes('100 pts') || bestXIText.includes('Current realized points of selected XI: 100 pts'));

  // Click Best Playable £100m object button
  await page.click('button:has-text(\"BEST PLAYABLE £100M\")');
  await page.waitForTimeout(1000);
  const squad100mText = await page.evaluate(() => document.body.innerText);
  console.log('Best Playable 100m banner shows 86 pts:', squad100mText.includes('86 pts') || squad100mText.includes('Current selected-XI total: 86 pts'));

  console.log('\n=== STEP 5: Test Fantasy Chat Typo Queries ===');
  const chatBtn = page.locator('button[aria-label=\"Open Ask Ennovera AI Chat\"]').first();
  if (await chatBtn.isVisible()) {
    await chatBtn.click();
    await page.waitForTimeout(1000);
    const inputField = page.locator('input[placeholder*=\"Ask Ennovera AI\"]').first();

    // Query 1: Typo captain query "who is gw2 captin"
    await inputField.fill('who is gw2 captin');
    await page.keyboard.press('Enter');
    console.log('Sent: who is gw2 captin, waiting...');
    await page.waitForTimeout(3000);

    const chatText = await page.evaluate(() => document.querySelector('div.flex-1.overflow-y-auto')?.innerText || '');
    console.log('Chat response for "who is gw2 captin":\n', chatText);
    console.log('Response mentions Haaland (26 pts):', chatText.includes('Haaland') && chatText.includes('26'));
  }

  await browser.close();
  console.log('\n✅ Local E2E Verification COMPLETE!');
}

testE2E().catch(console.error);
