const fs = require('fs');
try { for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) { const m = line.match(/^([A-Z0-9_]+)=(.*)$/); if (m) process.env[m[1]] = m[2]; } } catch {}
const { FantasyChatEngine } = require('../lib/services/fantasyChat/chatEngine');

async function run() {
  let failures = 0;
  const history = [];
  async function ask(label, question, checks) {
    const res = await FantasyChatEngine.processMessage({ question, language: 'en', conversationHistory: history });
    console.log(`--- ${label} ---\nQ: ${question}\nA: ${res.answer}\n`);
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

  await ask('1. Larsen minutes GW1-3', 'Could you find Larsen how many minutes played in gameweeks 1, 2 and 3?', [
    ['mentions Larsen', (r) => /Larsen/.test(r.answer)],
    ['shows GW1: 27', (r) => /GW1: 27/.test(r.answer)],
    ['shows GW2: 62', (r) => /GW2: 62/.test(r.answer)],
    ['shows GW3: 45', (r) => /GW3: 45/.test(r.answer)],
    ['shows correct total 134', (r) => /Total: 134/.test(r.answer)],
    ['does NOT show a GW4 selection summary', (r) => !/Top starters:/.test(r.answer) && !/selected in the starting XI/.test(r.answer)],
  ]);

  await ask('2. Follow-up: And his points?', 'And his points?', [
    ['still about Larsen', (r) => /Larsen/.test(r.answer)],
    ['shows points not minutes', (r) => /GW1: 1/.test(r.answer) && /GW2: 2/.test(r.answer) && /GW3: 1/.test(r.answer)],
    ['correct total points (4)', (r) => /Total: 4/.test(r.answer)],
  ]);

  await ask('3. Follow-up: Which games did he start?', 'Which games did he start?', [
    ['reports GW2 as started (starts=1)', (r) => /started in GW2/i.test(r.answer)],
    ['reports GW1 and GW3 as not started', (r) => /Did not start:.*GW1/.test(r.answer) && /Did not start:.*GW3/.test(r.answer)],
  ]);

  await ask('4. Follow-up: Only gameweek two.', 'Only gameweek two.', [
    ['narrows to GW2 only (no GW1/GW3 mentioned)', (r) => /GW2/.test(r.answer) && !/GW1/.test(r.answer) && !/GW3/.test(r.answer)],
  ]);

  await ask('5. A player outside all selected squads', 'How many minutes did Malick Yalcouyé play in gameweek 1, 2 and 3?', [
    ['resolves the player and gives an answer or explicit missing-data note', (r) => /Yalcouy|no record|not available/i.test(r.answer)],
  ]);

  await ask('6. Explicit forecast-minutes question stays distinct', 'What are Larsen expected minutes for GW4?', [
    ['does not answer with actual-history format', (r) => !/recorded minutes in/.test(r.answer)],
  ]);

  console.log(failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}
run().catch((e) => { console.error(e); process.exit(1); });
