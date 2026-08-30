import { OfficialFplService } from './officialFplService'
import { ReferencedPlayer } from './types'
import captainData from '@/lib/data/fpl_captain.json'
import planData from '@/lib/data/fpl_gameweek_plan.json'
import performanceData from '@/lib/data/fpl_performance.json'

export interface RankingFilter {
  position?: 'GK' | 'DEF' | 'MID' | 'FWD'
  maxPrice?: number
  gameweek?: number
  limit?: number
}

export class EnnoveraPredictionService {
  static getCaptainForecast(gw: number = 3) {
    if (gw === 2) {
      return {
        gameweek: 2,
        captain: {
          name: 'Erling Haaland',
          club: 'Man City',
          expectedPoints: 7.90,
          actualPoints: 13,
          captainMultiplier: 2,
          totalScore: 26,
          status: 'FT',
        },
        viceCaptain: {
          name: 'Cole Palmer',
          club: 'Chelsea',
          expectedPoints: 7.80,
          status: 'NOT_STARTED',
        },
        selectionRationale: 'Haaland was selected as frozen GW2 captain with 7.90 base xP, producing 13 actual points (26 with captain multiplier).',
      }
    }

    return {
      gameweek: 3,
      captain: {
        name: captainData.captain.name,
        club: captainData.captain.club,
        expectedPoints: captainData.captain.expected_points,
        captainScore: captainData.captain.captain_score,
        haulProbability: captainData.captain.haul_probability,
      },
      viceCaptain: {
        name: captainData.vice_captain.name,
        club: captainData.vice_captain.club,
        expectedPoints: captainData.vice_captain.expected_points,
        haulProbability: captainData.vice_captain.haul_probability,
      },
      alternatives: captainData.alternatives,
      selectionRationale: captainData.selection_rationale,
    }
  }

  static async getTopPlayers(filter: RankingFilter): Promise<ReferencedPlayer[]> {
    const players = await OfficialFplService.getAllActivePlayers()
    let filtered = [...players]

    if (filter.position) {
      filtered = filtered.filter((p) => p.position === filter.position)
    }

    if (filter.maxPrice !== undefined) {
      filtered = filtered.filter((p) => p.price <= filter.maxPrice!)
    }

    const gw = filter.gameweek || 3
    filtered.sort((a, b) => (b.predictedXp || 0) - (a.predictedXp || 0))

    return filtered.slice(0, filter.limit || 5)
  }
}
