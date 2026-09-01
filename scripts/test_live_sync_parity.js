const { FPLLiveSyncService } = require('../lib/services/fplLiveSync');
const fs = require('fs');

async function testParity() {
  console.log('=== TEST: Three-Way Parity Verification ===');
  
  // 1. Backend Live Synchronizer
  const perf = await FPLLiveSyncService.getPerformanceData('2026-27');
  const gw2 = perf.gameweeks.find(g => g.gameweek === 2);

  console.log('Backend Sync GW2 Status:', gw2.status);
  console.log('AI Manager Actual Total:', gw2.actual_total, '(Expected: 85)');
  console.log('AI Manager XI Raw:', gw2.xi_raw_actual, '(Expected: 72)');
  console.log('AI Manager Captain Extra:', gw2.captain_actual_extra, '(Expected: 13)');
  console.log('Expected Best XI Total:', gw2.expected_best_xi.actual_total, '(Expected: 100)');
  console.log('Best Playable £100m Total:', gw2.best_playable_100m.actual_total, '(Expected: 86)');

  if (gw2.actual_total !== 85) throw new Error('AI Manager score mismatch: ' + gw2.actual_total);
  if (gw2.expected_best_xi.actual_total !== 100) throw new Error('Expected Best XI score mismatch: ' + gw2.expected_best_xi.actual_total);
  if (gw2.best_playable_100m.actual_total !== 86) throw new Error('Best Playable 100m score mismatch: ' + gw2.best_playable_100m.actual_total);

  // Check all 11 starters for manager have finished
  const finishedCount = gw2.starting_xi.filter(p => p.match_status === 'FINISHED').length;
  console.log('Finished Starters Count:', finishedCount, '/ 11');
  if (finishedCount !== 11) throw new Error('Not all starters marked FINISHED: ' + finishedCount);

  console.log('✅ Three-Way Parity Test PASSED!');
}

testParity().catch(err => {
  console.error('❌ Parity Test Failed:', err);
  process.exit(1);
});
