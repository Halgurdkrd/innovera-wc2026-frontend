const { FantasyChatEngine } = require('../lib/services/fantasyChat/chatEngine');

async function run() {
  const pageContext = { model: 'M3_SHRUNK', gameweek: 4, object: 'OWN_START' };
  const history = [
    { role: 'user', content: 'show me all the top players for gw4' },
    { role: 'assistant', content: 'Here are some top players...' },
  ];
  const res = await FantasyChatEngine.processMessage({ question: 'no, midfielders only', language: 'en', pageContext, conversationHistory: history });
  console.log('A:', res.answer);
  const pass1 = !res.answer.includes('Top starters:');
  const pass2 = res.answer.includes('MIDFIELDERS');
  console.log('PASS (not generic summary):', pass1);
  console.log('PASS (mentions MIDFIELDERS):', pass2);
  process.exit(pass1 && pass2 ? 0 : 1);
}
run().catch((e) => { console.error(e); process.exit(1); });
