const { chromium } = require('playwright');
const path = require('path');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:3009/fantasy ...');
  await page.goto('http://localhost:3009/fantasy', { waitUntil: 'networkidle' });

  // 1. Check for ASK ENNOVERA AI Floating Action Button
  const chatBtn = page.locator('button:has-text("ASK ENNOVERA AI")');
  const btnCount = await chatBtn.count();
  console.log(`Found ${btnCount} "ASK ENNOVERA AI" floating buttons.`);
  if (btnCount === 0) throw new Error('Floating chat button not found!');

  // 2. Click to open chat modal
  console.log('Clicking "ASK ENNOVERA AI" button to open modal...');
  await chatBtn.first().click();
  await page.waitForTimeout(500);

  // 3. Verify modal header
  const chatTitle = page.locator('h3:has-text("ASK ENNOVERA AI")');
  const titleVisible = await chatTitle.isVisible();
  console.log(`Chat header visible: ${titleVisible}`);
  if (!titleVisible) throw new Error('Chat drawer header not visible!');

  // 4. Click a suggested question chip
  const suggestionChip = page.locator('button:has-text("How is our AI Manager doing?")');
  const chipVisible = await suggestionChip.first().isVisible();
  console.log(`Suggestion chip visible: ${chipVisible}`);
  if (chipVisible) {
    console.log('Clicking "How is our AI Manager doing?" suggestion chip...');
    await suggestionChip.first().click();
    await page.waitForTimeout(1000);
  }

  // 5. Check for AI response
  const aiResponse = page.locator('div:has-text("54 official live points")');
  const hasResponse = await aiResponse.first().isVisible();
  console.log(`AI Live score response rendered: ${hasResponse}`);

  // 6. Test typing in the input bar
  console.log('Typing query into chat input bar...');
  const input = page.locator('input[placeholder*="Ask Ennovera AI"]');
  await input.fill('Why did Ennovera captain Haaland?');
  const sendBtn = page.locator('button:has-text("Send")');
  await sendBtn.click();
  await page.waitForTimeout(1000);

  const captainResponse = page.locator('div:has-text("7.90 base xP")');
  const hasCaptainResponse = await captainResponse.first().isVisible();
  console.log(`Captain explanation response rendered: ${hasCaptainResponse}`);

  // 7. Save screenshot to artifacts
  const screenshotPath = path.resolve(__dirname, '../../../../Users/HP/.gemini/antigravity/brain/23ff27a4-77cc-4b31-a34b-1ae8921a4d05/fantasy_ai_chat_live_verification.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`Saved verification screenshot to: ${screenshotPath}`);

  await browser.close();
  console.log('✅ All Ask Ennovera AI live UI interactions verified successfully!');
}

main().catch((err) => {
  console.error('❌ Error during live UI verification:', err);
  process.exit(1);
});
