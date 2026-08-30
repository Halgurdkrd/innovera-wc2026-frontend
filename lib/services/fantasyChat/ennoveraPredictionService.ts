import { OfficialFplService } from './officialFplService'
import { ReferencedPlayer } from './types'
import captainData from '@/lib/data/fpl_captain.json'
import allPlayersData from '@/lib/data/fpl_player_registry.json'

export interface RankingFilter {
  position?: 'GK' | 'DEF' | 'MID' | 'FWD'
  minPrice?: number
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

  static getTopPlayers(filter: RankingFilter): ReferencedPlayer[] {
    const gwKey = filter.gameweek === 2 ? 'gw2_xp' : 'gw3_xp'
    const rawList = (allPlayersData as any[])

    let filtered = rawList.filter((p) => p.is_active !== false)

    if (filter.position) {
      filtered = filtered.filter((p) => p.position === filter.position)
    }

    if (filter.minPrice !== undefined) {
      filtered = filtered.filter((p) => p.price >= filter.minPrice!)
    }

    if (filter.maxPrice !== undefined) {
      filtered = filtered.filter((p) => p.price <= filter.maxPrice!)
    }

    filtered.sort((a, b) => (b[gwKey] || 0) - (a[gwKey] || 0))

    const limit = filter.limit || 5
    return filtered.slice(0, limit).map((p) => ({
      id: p.id,
      name: p.name,
      webName: p.web_name || p.name,
      club: p.club,
      position: p.position,
      price: p.price,
      predictedXp: p[gwKey],
      actualPoints: p.actual_points_gw2,
      minutes: p.minutes_gw2,
      matchStatus: p.match_status_gw2,
      isCaptain: p.id === 411,
      isViceCaptain: p.id === 154,
    }))
  }
}
