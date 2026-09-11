// Exercises the exact acceptance-test chat questions from the governance
// documents, against the real production backend (already deployed with
// the full-pool endpoint). Deterministic checks only -- no LLM involved,
// this module never was.
const { FantasyChatEngine } = require('../lib/services/fantasyChat/chatEngine');

const pageContext = { model: 'M3_SHRUNK', gameweek: 4, object: 'OWN_START' };

async function run() {
  console.log('=== GW4 chat acceptance tests ===\n');
  let failures = 0;

  async function ask(label, question, checks, history) {
    const res = await FantasyChatEngine.processMessage({ question, language: 'en', pageContext, conversationHistory: history || [] });
    console.log(`--- ${label} ---`);
    console.log('Q:', question);
    console.log('A:', res.answer);
    console.log('sourceBadge:', res.sourceBadge);
    console.log('referencedPlayers:', res.referencedPlayers.length);
    for (const [desc, fn] of checks) {
      const ok = fn(res);
      console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${desc}`);
      if (!ok) failures++;
    }
    console.log();
    return res;
  }

  await ask(
    '1. why foden select in game week 4',
    'why foden select in game week 4',
    [
      ['mentions GW4 (game week 4 parsed correctly)', (r) => r.requestedGameweek === 4],
      ['does not say "started" for a future forecast', (r) => !/\bstarted\b/.test(r.answer)],
      ['says "selected in the starting XI" or "placed on the bench"', (r) => /selected in the starting XI|placed on the bench/.test(r.answer)],
      ['no raw M3_SHRUNK in the prose', (r) => !r.answer.includes('M3_SHRUNK')],
    ]
  );

  await ask(
    '2. what are alternetives for thsi agme week',
    'what are alternetives for thsi agme week',
    [
      ['not the generic manager summary (no "Top starters:")', (r) => !r.answer.includes('Top starters:')],
      ['mentions alternative lineups or asks to disambiguate', (r) => /[Aa]lternative/.test(r.answer)],
    ]
  );

  await ask(
    '3a. top 10 midfielders (full pool, single position)',
    'top 10 midfielders for gw4',
    [
      ['not the generic manager summary', (r) => !r.answer.includes('Top starters:')],
      ['full pool used (not squad-scoped)', (r) => r.answer.includes('full eligible player pool') || r.answer.includes('league-wide')],
      ['returns multiple players', (r) => r.referencedPlayers.length >= 5],
    ]
  );

  await ask(
    '3b. i said md not all players, tell me top 10 players ... fro md and ten diffeders and ten atatckers',
    'i said md not all players, tell me top 10 players that are good choices fro md and ten diffeders and ten atatckers',
    [
      ['mentions MIDFIELDERS section', (r) => /MIDFIELDERS/.test(r.answer)],
      ['mentions DEFENDERS section', (r) => /DEFENDERS/.test(r.answer)],
      ['mentions FORWARDS section', (r) => /FORWARDS/.test(r.answer)],
      ['not the generic manager summary', (r) => !r.answer.includes('Top starters:')],
    ]
  );

  await ask(
    '4. alternatives to Foden',
    'alternatives to Foden',
    [
      ['names alternative players', (r) => r.referencedPlayers.length > 0],
      ['not the generic manager summary', (r) => !r.answer.includes('Top starters:')],
    ]
  );

  await ask(
    '5. why was Foden selected?',
    'why was Foden selected?',
    [
      ['does not say "started" for a future forecast', (r) => !/\bstarted\b/.test(r.answer)],
      ['no "net points null" anywhere', (r) => !/net points null/i.test(r.answer)],
    ]
  );

  // Null-points display check via the generic own-start summary (no player named).
  await ask(
    '6. generic own-start summary must not print "null"',
    'show me the squad summary for gw4',
    [
      ['no literal "null" in prose', (r) => !/\bnull\b/i.test(r.answer)],
      ['says actual points not available (future GW)', (r) => /not available yet|not available/.test(r.answer)],
    ]
  );

  console.log(failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

run().catch((e) => { console.error(e); process.exit(1); });
