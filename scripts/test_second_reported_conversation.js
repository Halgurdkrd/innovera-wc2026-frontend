// Reproduces the SECOND round of reported production chat failures,
// starting from GW3 Best XI (the exact starting state given in the
// governance document), against the real production backend.
const fs = require('fs');
try {
  for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2];
  }
} catch {}
const { FantasyChatEngine } = require('../lib/services/fantasyChat/chatEngine');

const pageContext = { model: 'M3_SHRUNK', gameweek: 3, object: 'B_LEGAL_BEST_XI' };

async function run() {
  let failures = 0;
  const history = [];
  async function ask(label, question, checks) {
    const res = await FantasyChatEngine.processMessage({ question, language: 'en', pageContext, conversationHistory: history });
    console.log(`--- ${label} ---`);
    console.log('Q:', question);
    console.log('A:', res.answer);
    for (const [desc, fn] of checks) {
      const ok = fn(res);
      console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${desc}`);
      if (!ok) failures++;
    }
    console.log();
    history.push({ role: 'user', content: question });
    history.push({ role: 'assistant', content: res.answer });
    return res;
  }

  await ask('A. Why is Best £100m different from AI Manager?', 'Why is Best £100m different from AI Manager?', [
    ['does NOT dump a generic AI Manager summary (no "Top starters:")', (r) => !r.answer.includes('Top starters:')],
    ['explains the real structural difference (ownership/budget), not just a player list', (r) => /budget|ownership|transfer/i.test(r.answer)],
  ]);

  await ask('B. What changed between GW3 and GW4?', 'What changed between GW3 and GW4?', [
    ['is an actual GW3-vs-GW4 comparison, not a single-GW dump', (r) => /GW3/.test(r.answer) && /GW4/.test(r.answer)],
    ['does not present a forecast-vs-actual gap as a measured improvement', (r) => !/\(\+\d+\.\d+\)/.test(r.answer) || !r.answer.includes('forecast')],
  ]);

  await ask('C. who is best mid top 10', 'who is best mid top 10', [
    ['returns real GW4 rankings', (r) => r.answer.includes('MIDFIELDERS') && r.requestedGameweek === 4],
  ]);

  await ask('D. why Martin Ødegaard is good choice', 'why Martin Ødegaard is good choice', [
    ['resolves directly, no clarification needed', (r) => !/Which player did you mean/.test(r.answer)],
    ['does not confuse him with an unrelated "Cho"/"Dubravka" collision', (r) => !r.answer.includes('Cho') && r.answer.includes('degaard')],
    ['uses a correctly-scoped positional rank (not "of 494")', (r) => !/of 494 MIDs/.test(r.answer)],
  ]);

  await ask('E. Martin Ødegaard (follow-up)', 'Martin Ødegaard', [
    ['resolves directly on the second ask too (no repeated clarification loop)', (r) => !/Which player did you mean/.test(r.answer)],
  ]);

  console.log(failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

run().catch((e) => { console.error(e); process.exit(1); });
