const { FantasyChatEngine } = require('../lib/services/fantasyChat/chatEngine');

async function run() {
  const pageContext = { model: 'M3_SHRUNK', gameweek: 4, object: 'OWN_START' };
  const res = await FantasyChatEngine.processMessage({
    question: "why is Haaland's average 8 but upside higher?",
    language: 'en', pageContext, conversationHistory: [],
  });
  console.log('A:', res.answer);
  console.log('llmUsed:', res.llmUsed);
  console.log('referencedPlayers:', res.referencedPlayers.map((p) => p.name));
  const checks = [
    ['mentions average/mean', /average/i.test(res.answer)],
    ['mentions upside or P80', /upside|80th/i.test(res.answer)],
    ['does not call upside a guaranteed/most likely score', !/guaranteed score|most likely score/i.test(res.answer)],
    ['references Haaland', res.referencedPlayers.some((p) => p.name.includes('Haaland'))],
  ];
  let ok = true;
  for (const [d, r] of checks) { console.log(`  [${r ? 'PASS' : 'FAIL'}] ${d}`); if (!r) ok = false; }
  process.exit(ok ? 0 : 1);
}
run().catch((e) => { console.error(e); process.exit(1); });
