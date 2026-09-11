// Sorani natural-language versions of the 5 acceptance questions named in
// this stage's governance document, run against the real production
// backend (pre-deploy of this session's backend changes -- the official-
// availability numeric fields won't appear until that deploy, but every
// other structural behavior below is already live-testable).
const fs = require('fs');
try {
  for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2];
  }
} catch {}
const { FantasyChatEngine } = require('../lib/services/fantasyChat/chatEngine');

const pageContext = { model: 'M3_SHRUNK', gameweek: 4, object: 'B_LEGAL_BEST_XI' };
const isArabicScript = (s) => /[؀-ۿ]/.test(s);

async function run() {
  let failures = 0;
  async function ask(label, question, checks) {
    const res = await FantasyChatEngine.processMessage({ question, language: 'ku', pageContext, conversationHistory: [] });
    console.log(`--- ${label} ---`);
    console.log('Q:', question);
    console.log('A:', res.answer);
    for (const [desc, fn] of checks) {
      const ok = fn(res);
      console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${desc}`);
      if (!ok) failures++;
    }
    console.log();
  }

  await ask('1. Why was Foden selected for GW4? (Sorani)', 'بۆچی فۆدن بۆ هەفتەی چوارەم هەڵبژێردراوە؟', [
    ['answers in Sorani script', (r) => isArabicScript(r.answer)],
    ['mentions Foden', (r) => r.answer.includes('Foden')],
    ['resolves GW4', (r) => r.requestedGameweek === 4],
  ]);

  await ask('2. Show the best ten midfielders. (Sorani)', 'باشترین دە ناوەڕاست بۆ GW٤ نیشانم بدە', [
    ['not the generic manager summary', (r) => !r.answer.includes('Top starters:') && !r.answer.includes('باشترین یاریزانان')],
    ['uses the full pool', (r) => r.answer.includes('full eligible player pool')],
  ]);

  await ask('3. What is the difference between average and upside? (Sorani)', 'جیاوازی نێوان تێکڕا و بەرزبوونەوە بۆ هالاند چیە؟', [
    ['mentions Haaland', (r) => r.answer.includes('Haaland')],
    ['references the supplemental/mean concept', (r) => /MEAN|تێکڕا/.test(r.answer)],
  ]);

  await ask('4. Is Gakpo\'s 75% official or predicted by Ennovera? (Sorani)', 'ئایا ٪٧٥ی گاکپۆ فەرمییە یان پێشبینی ئێنۆڤێرایە؟', [
    ['mentions Gakpo', (r) => r.answer.includes('Gakpo')],
    ['not a crash / has a real answer', (r) => r.answer.length > 20],
  ]);

  await ask('5. Alternatives to Isak (Sorani)', 'ئەگەر ئیساک بگۆڕم باشترین جێگرەکان چین؟', [
    ['resolves Isak specifically (not an unrelated collision)', (r) => r.answer.includes('Isak') || r.answer.includes('Alexander Isak')],
    ['does not fall back to alternative lineups', (r) => !/Alternative lineup options/.test(r.answer)],
  ]);

  console.log(failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}
run().catch((e) => { console.error(e); process.exit(1); });
