const { FantasyChatEngine } = require('../lib/services/fantasyChat/chatEngine');

async function run() {
  const pageContext = { model: 'M3_SHRUNK', gameweek: 4, object: 'OWN_START' };
  let failures = 0;

  async function ask(label, question, uiLanguage, checks) {
    const res = await FantasyChatEngine.processMessage({ question, language: uiLanguage, pageContext, conversationHistory: [] });
    console.log(`--- ${label} ---`);
    console.log('Q:', question, '(UI language passed:', uiLanguage, ')');
    console.log('A:', res.answer);
    console.log('referencedPlayers:', res.referencedPlayers.map((p) => p.name));
    for (const [d, fn] of checks) {
      const ok = fn(res);
      console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${d}`);
      if (!ok) failures++;
    }
    console.log();
  }

  // Arabic-script presence check helper.
  const isArabicScript = (s) => /[؀-ۿ]/.test(s);

  await ask(
    '1. بۆچی فۆدن بۆ هەفتەی چوارەم هەڵبژێردراوە؟ (why was Foden selected for GW4)',
    'بۆچی فۆدن بۆ هەفتەی چوارەم هەڵبژێردراوە؟',
    'en', // UI toggle says English -- question script should still win
    [
      ['answer is in Kurdish script (Sorani overrides English UI default)', (r) => isArabicScript(r.answer)],
      ['references Foden (phonetic transliteration match)', (r) => r.referencedPlayers.some((p) => p.name.includes('Foden'))],
    ]
  );

  await ask(
    '2. باشترین دە هێرشبەر بۆ ئەم هەفتەیە کێن؟ (best 10 attackers this gameweek)',
    'باشترین دە هێرشبەر بۆ ئەم هەفتەیە کێن؟',
    'ku',
    [
      ['not the generic manager summary', (r) => !r.answer.includes('Top starters:')],
      ['returns multiple players (full pool FWD ranking)', (r) => r.referencedPlayers.length >= 5],
    ]
  );

  await ask(
    '3. جێگرەوەکانی کێن؟ (who are the alternatives)',
    'جێگرەوەکانی کێن؟',
    'ku',
    [
      ['not the generic manager summary', (r) => !r.answer.includes('Top starters:')],
      ['recognized as an alternatives-style question (XI objects or clarification)', (r) => r.sourceBadge.includes('Alternative') || r.sourceBadge.includes('Clarification')],
    ]
  );

  console.log(failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}
run().catch((e) => { console.error(e); process.exit(1); });
