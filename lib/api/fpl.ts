import type {
  FPLGameweekPlan,
  FPLCaptainResponse,
  FPLTransferRecommendation,
  FPLChipStatusItem,
  FPLPerformanceResponse,
  FPLPlayer,
} from './types'

async function fetchFPL<T>(path: string): Promise<T> {
  const url = `/api/fpl${path}`
  try {
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } })
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.error(`[FPL API] Error fetching ${url} [HTTP ${res.status}]:`, errText || res.statusText)
      throw new Error(`Failed to fetch ${url} [HTTP ${res.status}]: ${res.statusText}`)
    }
    return res.json()
  } catch (err: any) {
    console.error(`[FPL API] Network or JSON parse error for ${url}:`, err)
    throw err
  }
}

/**
 * Retrieves the full canonical master Gameweek Plan for the given gameweek.
 */
export async function getFPLGameweekPlan(gw?: number): Promise<FPLGameweekPlan> {
  const qs = gw ? `?gw=${gw}&season=2026-27` : '?season=2026-27'
  return fetchFPL<FPLGameweekPlan>(`/gameweek/plan${qs}`)
}

/**
 * Retrieves the current owned 15-player squad.
 */
export async function getFPLCurrentSquad(gw?: number): Promise<{
  season: string
  gameweek: number
  formation: string
  total_cost: number
  bank: number
  free_transfers: number
  squad: FPLPlayer[]
}> {
  const qs = gw ? `?gw=${gw}&season=2026-27` : '?season=2026-27'
  return fetchFPL(`/squad/current${qs}`)
}

/**
 * Retrieves optimal transfer recommendations.
 */
export async function getFPLTransfers(gw?: number): Promise<FPLTransferRecommendation[]> {
  const qs = gw ? `?gw=${gw}&season=2026-27` : '?season=2026-27'
  return fetchFPL<FPLTransferRecommendation[]>(`/transfers/recommended${qs}`)
}

/**
 * Retrieves the specialized Captain and Vice-Captain recommendation.
 */
export async function getFPLCaptain(gw?: number): Promise<FPLCaptainResponse> {
  const qs = gw ? `?gw=${gw}&season=2026-27` : '?season=2026-27'
  return fetchFPL<FPLCaptainResponse>(`/captain/recommended${qs}`)
}

/**
 * Retrieves the legal chip inventory status and reservation recommendations.
 */
export async function getFPLChips(): Promise<FPLChipStatusItem[]> {
  return fetchFPL<FPLChipStatusItem[]>('/chips/status?season=2026-27')
}

/**
 * Retrieves season cumulative performance metrics and weekly history.
 */
export async function getFPLPerformance(): Promise<FPLPerformanceResponse> {
  return fetchFPL<FPLPerformanceResponse>('/performance?season=2026-27')
}
