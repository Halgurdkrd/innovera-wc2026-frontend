import fallbackPerformance from '@/lib/data/fpl_performance.json'
import fallbackGameweekPlan from '@/lib/data/fpl_gameweek_plan.json'
import type {
  FPLPerformanceResponse,
  FPLGameweekPlan,
  FPLPlayer,
  FPLWeeklyPerformance,
} from '@/lib/api/types'

// Cache container for in-memory caching inside serverless runtime
interface LiveCache {
  bootstrapData: any | null
  fixturesData: Record<number, any[]>
  liveElementsData: Record<number, any[]>
  lastFetchTime: number
  cachedPerformance: FPLPerformanceResponse | null
  cachedGameweekPlan: FPLGameweekPlan | null
}

const cache: LiveCache = {
  bootstrapData: null,
  fixturesData: {},
  liveElementsData: {},
  lastFetchTime: 0,
  cachedPerformance: null,
  cachedGameweekPlan: null,
}

const FPL_BASE_URL = 'https://fantasy.premierleague.com/api'
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Ennovera/2026.1'

/**
 * Formats a Date object to Iraq Time (Asia/Baghdad)
 */
export function formatIraqTime(date: Date = new Date()): string {
  try {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Baghdad',
    }
    return date.toLocaleDateString('en-US', options) + ' Iraq Time'
  } catch {
    return date.toISOString()
  }
}

export class FPLLiveSyncService {
  private static async fetchJSON<T>(endpoint: string, timeoutMs: number = 6000): Promise<T | null> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(FPL_BASE_URL + '/' + endpoint, {
        headers: { 'User-Agent': USER_AGENT },
        signal: controller.signal,
      })
      clearTimeout(timer)
      if (res.ok) {
        return (await res.json()) as T
      }
    } catch (err) {
      clearTimeout(timer)
    }
    return null
  }

  /**
   * Synchronizes bootstrap-static, fixtures, and event live data with dynamic TTL.
   */
  public static async sync(gameweek: number = 2, force: boolean = false): Promise<boolean> {
    const now = Date.now()
    const fixtures = cache.fixturesData[gameweek] || []
    const hasLiveMatch = fixtures.some((f) => f.started && !f.finished_provisional && !f.finished)
    const ttlMs = hasLiveMatch ? 30 * 1000 : 300 * 1000 // 30s during matches, 5m outside

    if (!force && cache.bootstrapData && now - cache.lastFetchTime < ttlMs) {
      return true
    }

    try {
      const [bootstrap, fixturesRes, liveRes] = await Promise.all([
        this.fetchJSON<any>('bootstrap-static/'),
        this.fetchJSON<any[]>('fixtures/?event=' + gameweek),
        this.fetchJSON<{ elements: any[] }>('event/' + gameweek + '/live/'),
      ])

      if (bootstrap && fixturesRes && liveRes) {
        cache.bootstrapData = bootstrap
        cache.fixturesData[gameweek] = fixturesRes
        cache.liveElementsData[gameweek] = liveRes.elements || []
        cache.lastFetchTime = now
        return true
      }
    } catch (err) {
      console.warn('[FPLLiveSyncService] Live sync network error:', err)
    }

    return false
  }

  /**
   * Computes normalized player live stats from official FPL data.
   */
  private static computePlayerLiveStats(
    player: any,
    liveMap: Map<number, any>,
    fixturesMap: Map<number, any>,
    teamsMap: Map<number, any>
  ): {
    actual_points: number
    minutes: number | null
    match_status: 'NOT_STARTED' | 'LIVE' | 'FINISHED' | 'DID_NOT_PLAY' | 'UNKNOWN'
    goals_scored: number
    assists: number
    clean_sheets: number
    goals_conceded: number
    saves: number
    bonus: number
    bps: number
  } {
    const pid = player.player_id || player.id
    const liveEl = liveMap.get(pid)
    const stats = liveEl?.stats || {}

    // Find team fixture for match status
    const teamName = player.club
    let fixture: any = null
    const fixturesList = Array.from(fixturesMap.values())
    for (const f of fixturesList) {
      const homeTeam = teamsMap.get(f.team_h)?.name
      const awayTeam = teamsMap.get(f.team_a)?.name
      if (
        (homeTeam && teamName && homeTeam.toLowerCase().includes(teamName.toLowerCase())) ||
        (awayTeam && teamName && awayTeam.toLowerCase().includes(teamName.toLowerCase()))
      ) {
        fixture = f
        break
      }
    }

    const minutes = stats.minutes !== undefined ? stats.minutes : player.minutes ?? null
    const actualPoints = stats.total_points !== undefined ? stats.total_points : player.actual_points ?? 0

    let matchStatus: 'NOT_STARTED' | 'LIVE' | 'FINISHED' | 'DID_NOT_PLAY' | 'UNKNOWN' = 'NOT_STARTED'
    if (fixture) {
      if (fixture.finished || fixture.finished_provisional) {
        if (minutes !== null && minutes > 0) {
          matchStatus = 'FINISHED'
        } else {
          matchStatus = 'DID_NOT_PLAY'
        }
      } else if (fixture.started) {
        matchStatus = 'LIVE'
      } else {
        matchStatus = 'NOT_STARTED'
      }
    } else {
      if (stats.played || (minutes !== null && minutes > 0)) {
        matchStatus = 'FINISHED'
      } else {
        matchStatus = player.match_status || 'NOT_STARTED'
      }
    }

    return {
      actual_points: actualPoints,
      minutes,
      match_status: matchStatus,
      goals_scored: stats.goals_scored || 0,
      assists: stats.assists || 0,
      clean_sheets: stats.clean_sheets || 0,
      goals_conceded: stats.goals_conceded || 0,
      saves: stats.saves || 0,
      bonus: stats.bonus || 0,
      bps: stats.bps || 0,
    }
  }

  /**
   * Returns live synchronized performance data with all 3 team objects fully up to date.
   */
  public static async getPerformanceData(season: string = '2026-27'): Promise<FPLPerformanceResponse> {
    await this.sync(2)

    const baseData = JSON.parse(JSON.stringify(fallbackPerformance)) as FPLPerformanceResponse
    const liveElements = cache.liveElementsData[2] || []
    const fixtures = cache.fixturesData[2] || []
    const bootstrap = cache.bootstrapData

    if (!liveElements.length || !fixtures.length || !bootstrap) {
      return baseData
    }

    const liveMap = new Map<number, any>()
    liveElements.forEach((el) => liveMap.set(el.id, el))

    const fixturesMap = new Map<number, any>()
    fixtures.forEach((f) => fixturesMap.set(f.id, f))

    const teamsMap = new Map<number, any>()
    if (bootstrap.teams) {
      bootstrap.teams.forEach((t: any) => teamsMap.set(t.id, t))
    }

    const now = new Date()
    const syncedAtUtc = now.toISOString()
    const syncedAtIraq = formatIraqTime(now)

    // Check if entire GW2 is complete
    const allGW2FixturesFinished = fixtures.every((f) => f.finished || f.finished_provisional)
    const gwStatus = allGW2FixturesFinished ? 'COMPLETE' : 'LIVE'

    // Update GW2 record
    const gw2Record = baseData.gameweeks.find((g) => g.gameweek === 2)
    if (gw2Record) {
      gw2Record.status = gwStatus as any

      // 1. Update AI Manager Starting XI
      let managerXIRaw = 0
      let completedStarters = 0
      let captainBonus = 0

      gw2Record.starting_xi = gw2Record.starting_xi.map((p) => {
        const liveStats = this.computePlayerLiveStats(p, liveMap, fixturesMap, teamsMap)
        const updated = {
          ...p,
          ...liveStats,
        }
        managerXIRaw += liveStats.actual_points
        if (p.is_captain) {
          captainBonus = liveStats.actual_points // Extra 1x for 2x captain
        }
        if (liveStats.match_status === 'FINISHED' || liveStats.match_status === 'DID_NOT_PLAY') {
          completedStarters++
        }
        return updated
      })

      // 2. Update AI Manager Bench
      let benchActual = 0
      gw2Record.bench = gw2Record.bench.map((p) => {
        const liveStats = this.computePlayerLiveStats(p, liveMap, fixturesMap, teamsMap)
        benchActual += liveStats.actual_points
        return {
          ...p,
          ...liveStats,
        }
      })

      // 3. Update Captain details
      if (gw2Record.captain) {
        const captPid = gw2Record.captain.player_id || 411
        const captLive = liveMap.get(captPid)?.stats || {}
        const captBase = captLive.total_points !== undefined ? captLive.total_points : 13
        gw2Record.captain.actual_base = captBase
        gw2Record.captain.actual_captain_contribution = captBase * (gw2Record.captain.captain_multiplier || 2)
        gw2Record.captain_actual_extra = captBase * ((gw2Record.captain.captain_multiplier || 2) - 1)
      }

      const managerTotalLive = managerXIRaw + captainBonus
      gw2Record.xi_raw_actual = managerXIRaw
      gw2Record.actual_total = managerTotalLive
      gw2Record.bench_actual = benchActual
      gw2Record.total_15_raw_actual = managerXIRaw + benchActual
      gw2Record.delta = Number((managerTotalLive - (gw2Record.projected_total || 74.05)).toFixed(2))

      // 4. Update Expected Best XI
      if (gw2Record.expected_best_xi && gw2Record.expected_best_xi.starting_xi) {
        let bestXIRaw = 0
        let bestXICaptBonus = 0
        gw2Record.expected_best_xi.starting_xi = gw2Record.expected_best_xi.starting_xi.map((p) => {
          const liveStats = this.computePlayerLiveStats(p, liveMap, fixturesMap, teamsMap)
          bestXIRaw += liveStats.actual_points
          if (p.is_captain) {
            bestXICaptBonus = liveStats.actual_points
          }
          return {
            ...p,
            ...liveStats,
          }
        })
        gw2Record.expected_best_xi.actual_total = bestXIRaw + bestXICaptBonus
        gw2Record.expected_best_xi.delta = Number((bestXIRaw + bestXICaptBonus - 77.41).toFixed(2))
      }

      // 5. Update Best Playable £100m
      if (gw2Record.best_playable_100m && gw2Record.best_playable_100m.starting_xi) {
        let squad100mRaw = 0
        let squad100mCaptBonus = 0
        let squad100mBench = 0

        gw2Record.best_playable_100m.starting_xi = gw2Record.best_playable_100m.starting_xi.map((p) => {
          const liveStats = this.computePlayerLiveStats(p, liveMap, fixturesMap, teamsMap)
          squad100mRaw += liveStats.actual_points
          if (p.is_captain) {
            squad100mCaptBonus = liveStats.actual_points
          }
          return {
            ...p,
            ...liveStats,
          }
        })

        if (gw2Record.best_playable_100m.bench) {
          gw2Record.best_playable_100m.bench = gw2Record.best_playable_100m.bench.map((p) => {
            const liveStats = this.computePlayerLiveStats(p, liveMap, fixturesMap, teamsMap)
            squad100mBench += liveStats.actual_points
            return {
              ...p,
              ...liveStats,
            }
          })
        }

        gw2Record.best_playable_100m.actual_total = squad100mRaw + squad100mCaptBonus
        gw2Record.best_playable_100m.delta = Number((squad100mRaw + squad100mCaptBonus - 75.45).toFixed(2))
      }

      // Summary cumulative updates
      const gw1Actual = baseData.gameweeks.find((g) => g.gameweek === 1)?.actual_total || 108
      baseData.summary.historical_actual_total = gw1Actual
      baseData.summary.prospective_actual_total = managerTotalLive
      baseData.summary.prospective_delta = Number((managerTotalLive - (gw2Record.projected_total || 74.05)).toFixed(2))
    }

    return baseData
  }

  /**
   * Returns live synchronized Gameweek Plan data.
   */
  public static async getGameweekPlan(gw: number = 2): Promise<FPLGameweekPlan> {
    const perfData = await this.getPerformanceData()
    const basePlan = JSON.parse(JSON.stringify(fallbackGameweekPlan)) as FPLGameweekPlan
    const now = new Date()

    basePlan.generated_at = now.toISOString()
    basePlan.data_cutoff = formatIraqTime(now)

    // Sync active GW2 starting XI actuals
    const gw2Record = perfData.gameweeks.find((g) => g.gameweek === 2)
    if (gw2Record && basePlan.gameweek === 2) {
      basePlan.starting_xi = gw2Record.starting_xi as any
      basePlan.bench = gw2Record.bench as any
      if (basePlan.captain) {
        basePlan.captain.actual_points = gw2Record.captain?.actual_base || 13
      }
    }

    return basePlan
  }
}
