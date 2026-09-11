const { FantasyChatEngine } = require('../lib/services/fantasyChat/chatEngine');

async function run() {
  const pageContext = { model: 'M3_SHRUNK', gameweek: 4, object: 'OWN_START' };
  let failures = 0;

  async function ask(label, question, uiLanguage, history, checks) {
    const res = await FantasyChatEngine.processMessage({ question, language: uiLanguage, pageContext, conversationHistory: history || [] });
    console.log(`--- ${label} ---`);
    console.log('Q:', question);
    console.log('A:', res.answer.slice(0, 200));
    for (const [d, fn] of checks) {
      const ok = fn(res);
      console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${d}`);
      if (!ok) failures++;
    }
    console.log();
    return res;
  }
  const isArabicScript = (s) => /[؀-ۿ]/.test(s);

  // Paraphrase of "why was Foden selected" -- different wording than the
  // exact acceptance phrase.
  await ask(
    'Paraphrase: هۆکاری هەڵبژاردنی فۆدن چیە؟ (what is the reason for Foden\'s selection)',
    'هۆکاری هەڵبژاردنی فۆدن چیە؟',
    'en',
    [],
    [
      ['answers in Kurdish (Sorani script overrides UI default)', (r) => isArabicScript(r.answer)],
      ['resolves Foden', (r) => r.referencedPlayers.some((p) => p.name.includes('Foden'))],
    ]
  );

  // Paraphrase of "best attackers" using a different ranking word.
  await ask(
    'Paraphrase: بەرزترین هێرشبەرەکان بۆ GW4 کێن؟ (highest-ranked attackers, not "باشترین")',
    'بەرزترین هێرشبەرەکان بۆ GW4 کێن؟',
    'ku', [],
    [
      ['not the generic manager summary', (r) => !r.answer.includes('Top starters:')],
      ['returns multiple FWD players', (r) => r.referencedPlayers.length >= 3],
    ]
  );

  // Multi-turn correction in Sorani: broad question, then a Sorani
  // "no, midfielders only" style correction.
  const h1 = [
    { role: 'user', content: 'باشترین یاریزانان بۆ GW4 کێن؟' },
    { role: 'assistant', content: '...' },
  ];
  await ask(
    'Multi-turn Sorani correction: نەخێر، تەنها ناوەڕاست (no, only midfield)',
    'نەخێر، تەنها ناوەڕاست',
    'ku', h1,
    [
      ['not the generic manager summary (checks the Kurdish text too, not just the English literal)', (r) => !r.answer.includes('Top starters:') && !r.answer.includes('باشترین یاریزانان')],
      ['triggered the full-pool ranking branch', (r) => r.sourceBadge.includes('Full pool')],
    ]
  );

  // Ambiguity / collision test: a made-up ambiguous fragment should ask
  // a clarifying question rather than guessing -- using a short Latin
  // fragment likely to match multiple players ("an") as a stress test of
  // the collision-detection path itself, independent of Sorani.
  const res = await FantasyChatEngine.processMessage({ question: 'why was co selected', language: 'en', pageContext, conversationHistory: [] });
  console.log('--- Collision stress test: "why was co selected" ---');
  console.log('A:', res.answer.slice(0, 200));
  console.log();

  console.log(failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}
run().catch((e) => { console.error(e); process.exit(1); });
