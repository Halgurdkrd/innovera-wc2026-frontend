import type {
  FPLGameweekPlan,
  FPLCaptainResponse,
  FPLTransferRecommendation,
  FPLChipStatusItem,
  FPLPerformanceResponse,
  FPLPlayer,
} from './types'

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? '').trim() || ''

/**
 * Retrieves the full canonical master Gameweek Plan for the given gameweek.
 */
export async function getFPLGameweekPlan(gw?: number): Promise<FPLGameweekPlan> {
  const url = gw
    ? `${API_BASE}/api/fpl/gameweek/plan?gw=${gw}&season=2026-27`
    : `${API_BASE}/api/fpl/gameweek/plan?season=2026-27`

  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } })
  if (!res.ok) {
    throw new Error(`Failed to fetch Fantasy Gameweek Plan: ${res.statusText}`)
  }
  return res.json()
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
  const url = gw
    ? `${API_BASE}/api/fpl/squad/current?gw=${gw}&season=2026-27`
    : `${API_BASE}/api/fpl/squad/current?season=2026-27`

  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } })
  if (!res.ok) {
    throw new Error(`Failed to fetch Fantasy Squad: ${res.statusText}`)
  }
  return res.json()
}

/**
 * Retrieves optimal transfer recommendations.
 */
export async function getFPLTransfers(gw?: number): Promise<FPLTransferRecommendation[]> {
  const url = gw
    ? `${API_BASE}/api/fpl/transfers/recommended?gw=${gw}&season=2026-27`
    : `${API_BASE}/api/fpl/transfers/recommended?season=2026-27`

  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } })
  if (!res.ok) {
    throw new Error(`Failed to fetch Transfer Recommendations: ${res.statusText}`)
  }
  return res.json()
}

/**
 * Retrieves the specialized Captain and Vice-Captain recommendation.
 */
export async function getFPLCaptain(gw?: number): Promise<FPLCaptainResponse> {
  const url = gw
    ? `${API_BASE}/api/fpl/captain/recommended?gw=${gw}&season=2026-27`
    : `${API_BASE}/api/fpl/captain/recommended?season=2026-27`

  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } })
  if (!res.ok) {
    throw new Error(`Failed to fetch Captain Recommendation: ${res.statusText}`)
  }
  return res.json()
}

/**
 * Retrieves the legal chip inventory status and reservation recommendations.
 */
export async function getFPLChips(): Promise<FPLChipStatusItem[]> {
  const res = await fetch(`${API_BASE}/api/fpl/chips/status?season=2026-27`, {
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    throw new Error(`Failed to fetch Chips Status: ${res.statusText}`)
  }
  return res.json()
}

/**
 * Retrieves season cumulative performance metrics and weekly history.
 */
export async function getFPLPerformance(): Promise<FPLPerformanceResponse> {
  const res = await fetch(`${API_BASE}/api/fpl/performance?season=2026-27`, {
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    throw new Error(`Failed to fetch Performance Data: ${res.statusText}`)
  }
  return res.json()
}
