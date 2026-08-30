import performanceData from '@/lib/data/fpl_performance.json'
import planData from '@/lib/data/fpl_gameweek_plan.json'

export class TeamObjectService {
  static getGW2Objects() {
    const gw2 = performanceData.gameweeks?.find((g: any) => g.gameweek === 2)
    return {
      aiManagerTeam: {
        gameweek: 2,
        status: 'LIVE_IN_PROGRESS',
        expectedPoints: 74.05,
        liveScore: 54,
        startersFinished: 5,
        startersRemaining: 6,
        startingXI: gw2?.starting_xi || [],
        bench: gw2?.bench || [],
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
        startingXI: gw2?.expected_best_xi?.starting_xi || [],
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
        startingXI: gw2?.best_playable_100m?.starting_xi || [],
        bench: gw2?.best_playable_100m?.bench || [],
        squadCost: 100.0,
        startingXiCost: 81.5,
        benchCost: 18.5,
        bank: 0.0,
        captain: 'Erling Haaland',
        viceCaptain: 'Cole Palmer',
        definition: 'Fresh legal 15-player squad costing ≤£100m, then optimal GW2 starting XI and captain.',
        comparisonWithManager: '10/11 starters shared, 14/15 squad players shared. Key XI difference: Semenyo replaces Stach in starting XI (Stach to bench, Sangaré omitted).',
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
