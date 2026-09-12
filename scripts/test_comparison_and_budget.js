// Verifies PLAYER_COMPARISON and BUDGET_QUERY now use the current
// verified Fantasy pool (not the legacy GW2/GW3 demo data), both with
// and without pageContext, per the exact examples requested.
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
  async function ask(label, question, pageContext, checks) {
    const res = await FantasyChatEngine.processMessage({ question, language: 'en', pageContext, conversationHistory: [] });
    console.log(`--- ${label} ---\nQ: ${question}\nA: ${res.answer}\nsourceBadge: ${res.sourceBadge} gw: ${res.requestedGameweek}`);
    for (const [desc, fn] of checks) {
      const ok = fn(res);
      console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${desc}`);
      if (!ok) failures++;
    }
    console.log();
    return res;
  }

  // No pageContext (homepage) -- must not use old GW2/GW3 demo data.
  await ask('1. Compare Saka and Palmer (no pageContext)', 'Compare Saka and Palmer.', undefined, [
    ['resolves latest registered GW (4)', (r) => r.requestedGameweek === 4],
    ['mentions both players', (r) => /Saka/.test(r.answer) && /Palmer/.test(r.answer)],
    ['shows real xP figures', (r) => /xP \d/.test(r.answer)],
    ['not the old fixed-snapshot text', (r) => !/fixed 2026-27 season GW2\/GW3 demo snapshot/i.test(r.answer)],
  ]);

  await ask('2. Which is better, Ødegaard or Bruno? (no pageContext)', 'Which is better, Ødegaard or Bruno?', undefined, [
    ['resolves both named players (previously impossible -- not in the old 4-name allowlist)', (r) => /degaard/i.test(r.answer) && /Bruno/.test(r.answer)],
    ['states a forecast preference with a real xP gap', (r) => /forecast favors/i.test(r.answer)],
  ]);

  await ask('3. Best midfielder under £7m (no pageContext)', 'Best midfielder under £7m.', undefined, [
    ['uses full eligible pool language', (r) => /full eligible pool/i.test(r.answer)],
    ['respects the price ceiling (no player over £7.0m)', (r) => r.referencedPlayers.every((p) => !p.price || p.price <= 7.05)],
    ['resolves latest registered GW (4)', (r) => r.requestedGameweek === 4],
  ]);

  await ask('4. Show five forwards costing no more than £8m (no pageContext)', 'Show five forwards costing no more than £8m.', undefined, [
    ['returns forwards only', (r) => r.referencedPlayers.every((p) => p.position === 'FWD')],
    ['respects the price ceiling', (r) => r.referencedPlayers.every((p) => !p.price || p.price <= 8.05)],
    ['returns up to 5 players', (r) => r.referencedPlayers.length <= 5 && r.referencedPlayers.length > 0],
    ['distinguishes forecast-only from legal-transfer', (r) => /does not check budget, ownership/i.test(r.answer)],
  ]);

  // With explicit Fantasy page context (Best XI tab, GW4) -- context must
  // still be respected/stated correctly for a comparison/budget question.
  const pageContext = { model: 'M3_SHRUNK', gameweek: 4, object: 'B_LEGAL_BEST_XI' };
  await ask('5. Compare Saka and Palmer (Fantasy page context)', 'Compare Saka and Palmer.', pageContext, [
    ['resolves GW4 from page context', (r) => r.requestedGameweek === 4],
    ['mentions both players', (r) => /Saka/.test(r.answer) && /Palmer/.test(r.answer)],
  ]);

  await ask('6. Best midfielder under £7m (Fantasy page context)', 'Best midfielder under £7m.', pageContext, [
    ['uses full eligible pool language', (r) => /full eligible pool/i.test(r.answer)],
    ['respects the price ceiling', (r) => r.referencedPlayers.every((p) => !p.price || p.price <= 7.05)],
  ]);

  console.log(failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}
run().catch((e) => { console.error(e); process.exit(1); });
