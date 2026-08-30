import performanceData from '@/lib/data/fpl_performance.json'
import planData from '@/lib/data/fpl_gameweek_plan.json'

export class TeamObjectService {
  static getGW2Objects() {
    const gw2 = performanceData.gameweeks?.find((g: any) => g.gameweek === 2)
    const managerStarters = gw2?.starting_xi || []
    const managerBench = gw2?.bench || []
    const best100mStarters = gw2?.best_playable_100m?.starting_xi || []
    const best100mBench = gw2?.best_playable_100m?.bench || []
    const bestXiStarters = gw2?.expected_best_xi?.starting_xi || []

    // Dynamic set difference calculation
    const mgrStarterIds = new Set(managerStarters.map((p: any) => p.player_id))
    const b100StarterIds = new Set(best100mStarters.map((p: any) => p.player_id))

    const startersInBest100mNotInMgr = best100mStarters.filter((p: any) => !mgrStarterIds.has(p.player_id))
    const startersInMgrNotInBest100m = managerStarters.filter((p: any) => !b100StarterIds.has(p.player_id))

    const sharedStartersCount = managerStarters.filter((p: any) => b100StarterIds.has(p.player_id)).length

    return {
      aiManagerTeam: {
        gameweek: 2,
        status: 'LIVE_IN_PROGRESS',
        expectedPoints: 74.05,
        liveScore: 54,
        startersFinished: 5,
        startersRemaining: 6,
        startingXI: managerStarters,
        bench: managerBench,
        bank: 0.2,
        freeTransfers: 1,
        captain: 'Erling Haaland (13 pts base -> 26 pts capt)',
        viceCaptain: 'Cole Palmer',
      },
      expectedBestXi: {
        gameweek: 2,
        status: 'FROZEN_PREDEADLINE',
        expectedPoints: 77.41,
        realizedPoints: 44,
        formation: '3-5-2',
        startingXI: bestXiStarters,
        captain: 'Erling Haaland',
        viceCaptain: 'Cole Palmer',
        definition: 'Theoretical highest-xP legal XI benchmark under formation and max-3-per-club rules without requiring a complete £100m 15-player squad.',
      },
      bestPlayable100m: {
        gameweek: 2,
        status: 'FROZEN_PREDEADLINE',
        expectedPoints: 75.45,
        realizedPoints: 59,
        formation: '3-4-3',
        startingXI: best100mStarters,
        bench: best100mBench,
        squadCost: 100.0,
        startingXiCost: 81.5,
        benchCost: 18.5,
        bank: 0.0,
        captain: 'Erling Haaland',
        viceCaptain: 'Cole Palmer',
        definition: 'Fresh legal 15-player squad costing ≤£100m, then optimal GW2 starting XI and captain.',
        sharedStartersCount,
        startersInBest100mNotInMgr,
        startersInMgrNotInBest100m,
        comparisonWithManager: `Between GW2 AI Manager (74.05 xP) and Best £100m (75.45 xP), ${sharedStartersCount}/11 starters are shared. Key XI difference: ${startersInBest100mNotInMgr.map((p: any) => p.name).join(', ')} starts in Best £100m (+1.07 xP gain), while ${startersInMgrNotInBest100m.map((p: any) => p.name).join(', ')} starts in AI Manager to bank a Free Transfer for GW3.`,
      },
    }
  }

  static getGW3Objects() {
    return {
      expectedBestXi: {
        gameweek: 3,
        status: 'FROZEN_PREDEADLINE',
        expectedPoints: 83.09,
        likelyRange: '74–91 pts',
        upsideP80: 94,
        highUpsideP90: 100,
        deadline: 'Friday, 4 September 2026 • 8:30 PM Iraq Time (17:30 UTC)',
      },
      bestPlayable100m: {
        gameweek: 3,
        status: 'FROZEN_PREDEADLINE',
        expectedPoints: 80.75,
        likelyRange: '72–89 pts',
        upsideP80: 92,
        highUpsideP90: 98,
      },
      aiManagerTeam: {
        gameweek: 3,
        status: 'PENDING_FREEZE',
        note: 'Will be finalized after GW2 matches conclude and before the GW3 deadline.',
      },
    }
  }
}
