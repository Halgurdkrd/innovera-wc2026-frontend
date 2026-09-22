// Verifies the simplified /fantasy page + chat against a running Next server
// (BASE, default http://localhost:3112) whose backend proxy points at BACKEND_INTERNAL_URL.
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const BASE = process.env.BASE || 'http://localhost:3112'
const OUT = process.env.OUT || path.resolve(__dirname, 'simplified_out')
fs.mkdirSync(OUT, { recursive: true })

async function openPage(browser, { width, height, lang, url }) {
  const ctx = await browser.newContext({ viewport: { width, height }, isMobile: width < 600 })
  await ctx.addInitScript((l) => localStorage.setItem('innovera_language', l), lang)
  const page = await ctx.newPage()
  await page.goto(BASE + url, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForFunction(() => !document.body.innerText.includes('Loading...'), null, { timeout: 20000 }).catch(() => {})
  await page.waitForTimeout(2000)
  return { ctx, page }
}

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const report = {}
  for (const [name, url, lang, vp] of [
    ['gw5_desktop_en', '/fantasy?gw=5', 'EN', { width: 1440, height: 1100 }],
    ['gw5_desktop_ku', '/fantasy?gw=5', 'KU', { width: 1440, height: 1100 }],
    ['gw5_mobile_en', '/fantasy?gw=5', 'EN', { width: 390, height: 844 }],
    ['gw4_desktop_en', '/fantasy?gw=4', 'EN', { width: 1440, height: 1100 }],
    ['gw3_desktop_en', '/fantasy?gw=3', 'EN', { width: 1440, height: 1100 }],
  ]) {
    const { ctx, page } = await openPage(browser, { ...vp, lang, url })
    const text = await page.innerText('body')
    report[name] = {
      hasM3Text: /M3_SHRUNK|V0_CONTROL/.test(text),
      hasLongPara: /historical reconstruction of already-completed|final-freeze window has closed and no final frozen/.test(text),
      statusLine: (text.match(/(Forecast updated[^\n]*|Live points[^\n]*|provisional while official[^\n]*|Final points confirmed\.|uses the last lineup published[^\n]*|بۆچی|نوێکرایەوە[^\n]*|کاتیین هەتا[^\n]*|پشتڕاستکرایەوە\.|دوایین دانانی بڵاوکراوە[^\n]*)/) || [null])[0],
      hasAboutToggle: /About this gameweek|دەربارەی ئەم هەفتەیە/.test(text),
      excerpt: text.slice(0, 600),
    }
    await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true })
    await ctx.close()
  }

  // chat: GW5 EN
  const { ctx, page } = await openPage(browser, { width: 1440, height: 1100, lang: 'EN', url: '/fantasy?gw=5' })
  const btn = page.locator('button:has-text("ASK ENNOVERA")').first()
  await btn.click({ timeout: 10000 })
  await page.waitForTimeout(600)
  const answers = []
  for (const q of [
    'How many points do we have now?',
    'What was our GW5 final score?',
    'Why does GW5 say published lineup?',
  ]) {
    const input = page.locator('input[placeholder]').last()
    await input.fill(q)
    await input.press('Enter')
    await page.waitForTimeout(9000)
    const t = await page.innerText('body')
    const i = t.lastIndexOf(q)
    answers.push({ q, tail: t.slice(i + q.length, i + q.length + 500) })
  }
  report.chat_gw5 = answers
  await page.screenshot({ path: path.join(OUT, 'chat_gw5.png'), fullPage: false })
  await ctx.close()

  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2))
  await browser.close()
  console.log('done', OUT)
})().catch((e) => { console.error('SCRIPT ERROR', e); process.exit(1) })
