const { FantasyChatEngine } = require('../lib/services/fantasyChat/chatEngine');

async function testTypoQueries() {
  console.log('=== TEST: Fantasy Chat Captain Typo Queries ===');
  
  const testQueries = [
    'who is gw2 captin',
    'our captain gw2',
    'who was captain for gw2',
    'who did we captain in gw2',
    'gw 2 captain',
    'who should I captain next gameweek?'
  ];

  for (const q of testQueries) {
    const res = await FantasyChatEngine.processMessage({ question: q, language: 'en' });
    console.log('\nQuery:', q);
    console.log('  Intent:', res.intent);
    console.log('  SourceBadge:', res.sourceBadge);
    console.log('  Answer Snippet:', res.answer.substring(0, 100) + '...');
    
    if (q.includes('gw2') || q.includes('gw 2')) {
      if (!res.answer.toLowerCase().includes('haaland') || !res.answer.includes('26')) {
        throw new Error('GW2 captain query failed to mention Haaland (26 pts): ' + res.answer);
      }
    } else {
      if (!res.answer.toLowerCase().includes('haaland') || !res.answer.includes('11.77')) {
        throw new Error('GW3 captain recommendation query failed: ' + res.answer);
      }
    }
  }

  console.log('\n✅ All Captain Typo Tests PASSED!');
}

testTypoQueries().catch(err => {
  console.error('❌ Captain Typo Test Failed:', err);
  process.exit(1);
});
