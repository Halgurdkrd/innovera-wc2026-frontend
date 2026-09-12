// The homepage's shared assistant supplies NO pageContext at all (unlike
// /fantasy). A fantasy question asked there, with no explicit GW anywhere,
// must resolve to the latest REGISTERED forecast (fetched live), never a
// hardcoded old GW2/GW3 snapshot, and must never fabricate Fantasy page
// context that doesn't exist on an unrelated page.
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
  // No pageContext -- exactly what the homepage's shared widget passes.
  const res = await FantasyChatEngine.processMessage({
    question: 'Why is Best £100m different from AI Manager?',
    language: 'en',
    conversationHistory: [],
  });
  console.log('Q: Why is Best £100m different from AI Manager? (no pageContext)');
  console.log('A:', res.answer);
  console.log('requestedGameweek:', res.requestedGameweek);
  const checks = [
    ['resolves to the latest registered gameweek (4), not a hardcoded GW3', (r) => r.requestedGameweek === 4],
    ['gives the real structural explanation, not the old GW2/GW3 demo text', (r) => /budget|ownership|transfer/i.test(r.answer)],
    ['does not mention the old fixed-snapshot disclaimer', (r) => !/fixed 2026-27 season GW2\/GW3 demo snapshot/i.test(r.answer)],
  ];
  for (const [desc, fn] of checks) {
    const ok = fn(res);
    console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${desc}`);
    if (!ok) failures++;
  }

  console.log(failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}
run().catch((e) => { console.error(e); process.exit(1); });
