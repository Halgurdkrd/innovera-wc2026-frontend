// Real-browser verification of the release/results lifecycle on /fantasy against a running
// Next server (BASE, default http://localhost:3111) whose backend proxy points at the target API.
// Usage: BASE=http://localhost:3111 OUT=<dir> node scripts/verify_release_lifecycle_browser.js
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const BASE = process.env.BASE || 'http://localhost:3111'
const OUT = process.env.OUT || path.resolve(__dirname, 'release_verify_out')
fs.mkdirSync(OUT, { recursive: true })

const QUESTIONS = [
  'What are our expected points?',
  'How many actual points do we have so far?',
  'Who still has to play?',
  'Are these points final?',
]

async function openPage(browser, { width, height, lang, url }) {
  const ctx = await browser.newContext({ viewport: { width, height }, isMobile: width < 600 })
  await ctx.addInitScript((l) => localStorage.setItem('innovera_language', l), lang)
  const page = await ctx.newPage()
  await page.goto(BASE + url, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => !document.body.innerText.includes('Loading...'), null, { timeout: 30000 }).catch(() => {})
  await page.waitForTimeout(3000)
  return { ctx, page }
}

async function ask(page, q) {
  const input = page.locator('input[type="text"], input:not([type])').last()
  await input.fill(q)
  await input.press('Enter')
  await page.waitForTimeout(6000)
}

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const report = {}
  for (const [name, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
    for (const lang of ['EN', 'KU']) {
      for (const [tag, url] of [['gw5', '/fantasy?gw=5'], ['gw4', '/fantasy?gw=4'], ['gw3', '/fantasy?gw=3'], ['default', '/fantasy']]) {
        const { ctx, page } = await openPage(browser, { ...vp, lang, url })
        const text = await page.innerText('body')
        const key = `${name}_${lang}_${tag}`
        report[key] = {
          url: page.url(),
          early: /early forecast/i.test(text) || text.includes('پێشبینی'),
          hasEarlyLabel: /Early forecast|subject to update/i.test(text),
          hasFinalFrozen: /final frozen forecast|Final frozen/i.test(text),
          hasProvisional: /provisional/i.test(text),
          hasYetToPlay: /Yet to play/i.test(text),
          hasNotice: /no final frozen forecast was registered|final-freeze window has closed/i.test(text),
          excerpt: text.slice(0, 1500),
        }
        await page.screenshot({ path: path.join(OUT, `${key}.png`), fullPage: true })
        await ctx.close()
      }
    }
  }
  // chat on desktop EN for GW5 and GW4
  for (const gw of [5, 4]) {
    const { ctx, page } = await openPage(browser, { width: 1440, height: 1000, lang: 'EN', url: `/fantasy?gw=${gw}` })
    await page.locator('button:has-text("ASK ENNOVERA")').first().click()
    await page.waitForTimeout(800)
    const answers = []
    for (const q of QUESTIONS) {
      await ask(page, q)
      const body = await page.innerText('body')
      answers.push({ q, tail: body.slice(-1600) })
    }
    report[`chat_gw${gw}`] = answers
    await page.screenshot({ path: path.join(OUT, `chat_gw${gw}.png`), fullPage: false })
    await ctx.close()
  }
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2))
  await browser.close()
  console.log('done', OUT)
})().catch((e) => { console.error(e); process.exit(1) })
