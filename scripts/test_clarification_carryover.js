// A genuinely ambiguous mention ("Martin") must ask for clarification
// listing real candidates; resolving with the full name must answer the
// ORIGINAL question (not restart clarification, not give a bare fact-only
// dump when the original question asked "why").
const fs = require('fs');
try {
  for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2];
  }
} catch {}
const { FantasyChatEngine } = require('../lib/services/fantasyChat/chatEngine');

async function run() {
  let failures = 0;
  const pageContext = { model: 'M3_SHRUNK', gameweek: 4, object: 'B_LEGAL_BEST_XI' };
  const history = [];
  async function ask(label, question, checks) {
    const res = await FantasyChatEngine.processMessage({ question, language: 'en', pageContext, conversationHistory: history });
    console.log(`--- ${label} ---\nQ: ${question}\nA: ${res.answer}`);
    for (const [desc, fn] of checks) {
      const ok = fn(res);
      console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${desc}`);
      if (!ok) failures++;
    }
    console.log();
    history.push({ role: 'user', content: question });
    history.push({ role: 'assistant', content: res.answer });
  }

  await ask('1. Genuinely ambiguous first name', 'why is Martin a good choice', [
    ['asks a real clarifying question', (r) => /Which player did you mean/.test(r.answer)],
    ['lists multiple real candidates', (r) => r.referencedPlayers.length >= 2],
  ]);

  await ask('2. Disambiguating full-name reply', 'Martin Ødegaard', [
    ['resolves to Ødegaard specifically', (r) => r.answer.includes('degaard')],
    ['answers the ORIGINAL "why" question (not just a bare fact dump)', (r) => /fixture|expected minutes|alternative/i.test(r.answer)],
    ['does not restart clarification', (r) => !/Which player did you mean/.test(r.answer)],
  ]);

  console.log(failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

run().catch((e) => { console.error(e); process.exit(1); });
