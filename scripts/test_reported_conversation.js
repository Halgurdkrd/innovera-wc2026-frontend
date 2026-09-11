// Reproduces the EXACT reported conversation sequence from the governance
// document, starting from the Best XI tab (the DEFAULT_TAB a fresh visitor
// lands on) -- this is the concrete scenario that triggered the reported
// bugs (Foden isn't in Best XI, so answering from "whichever tab is open"
// was wrong). Runs against the real production backend.
const fs = require('fs');
try {
  for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2];
  }
} catch {}
const { FantasyChatEngine } = require('../lib/services/fantasyChat/chatEngine');

const pageContext = { model: 'M3_SHRUNK', gameweek: 4, object: 'B_LEGAL_BEST_XI' };

async function run() {
  console.log('=== Reported conversation reproduction (starting on Best XI tab) ===\n');
  let failures = 0;
  const history = [];

  async function ask(label, question, checks) {
    const res = await FantasyChatEngine.processMessage({ question, language: 'en', pageContext, conversationHistory: history });
    console.log(`--- ${label} ---`);
    console.log('Q:', question);
    console.log('A:', res.answer);
    console.log('sourceBadge:', res.sourceBadge, '| requestedGameweek:', res.requestedGameweek, '| referencedPlayers:', res.referencedPlayers.length);
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

  await ask(
    '1. Why was Foden selected for GW4?',
    'Why was Foden selected for GW4?',
    [
      ['does NOT dump the whole Best XI (no "Top starters:")', (r) => !r.answer.includes('Top starters:')],
      ['mentions Foden by name', (r) => r.answer.includes('Foden')],
      ['identifies AI Manager, not Best XI, as the object he is in', (r) => /AI Manager/.test(r.answer)],
      ['explicitly says he is NOT in Best XI (or lists it among the "not in" objects)', (r) => /not in/.test(r.answer) && /Best XI/.test(r.answer)],
      ['resolves GW4', (r) => r.requestedGameweek === 4],
    ]
  );

  await ask(
    '2. Show GW4 AI Manager.',
    'Show GW4 AI Manager.',
    [
      ['switches to AI Manager object', (r) => /AI Manager/.test(r.answer) || /AI Manager/.test(r.sourceBadge)],
      ['resolves GW4', (r) => r.requestedGameweek === 4],
    ]
  );

  await ask(
    '3. What are the best attackers? Show their availability, expected points and upside.',
    'What are the best attackers? Show their availability, expected points and upside.',
    [
      ['does NOT fall back to GW3', (r) => r.requestedGameweek === 4],
      ['uses the full pool, not just Best XI', (r) => r.answer.includes('full eligible player pool')],
      ['mentions FORWARDS section', (r) => /FORWARDS/.test(r.answer)],
      ['returns multiple players', (r) => r.referencedPlayers.length >= 3],
    ]
  );

  await ask(
    '4. I said midfielders only.',
    'I said midfielders only.',
    [
      ['does NOT fall back to the generic summary', (r) => !r.answer.includes('Top starters:')],
      ['mentions MIDFIELDERS section', (r) => /MIDFIELDERS/.test(r.answer)],
      ['does NOT also show forwards/defenders (narrowed correctly)', (r) => !/FORWARDS/.test(r.answer) && !/DEFENDERS/.test(r.answer)],
    ]
  );

  await ask(
    '5. If I change Isak, what are the best alternatives?',
    'If I change Isak, what are the best alternatives?',
    [
      ['resolves Isak by name (not "could not resolve")', (r) => !/[Cc]ould not resolve/.test(r.answer)],
      ['does NOT fall back to alternative LINEUPS', (r) => !/Alternative lineup options/.test(r.answer)],
      ['names alternative players', (r) => r.referencedPlayers.length > 0],
    ]
  );

  console.log(failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

run().catch((e) => { console.error(e); process.exit(1); });
