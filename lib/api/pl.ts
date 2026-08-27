import { supabase } from '@/lib/supabase'
import type { PLFixture, PLTableResponse } from './types'

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? '').trim() || ''

/**
 * Retrieves Premier League fixtures for a specific gameweek.
 * Primary Canonical Source: Supabase 'matches' table (competition = 'PL2026-27')
 * Fallback: FastAPI '/api/pl/fixtures' endpoint
 */
export async function getPLFixtures(gw: number = 2): Promise<PLFixture[]> {
  try {
    const stagePattern = `%${gw}%`
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('competition', 'PL2026-27')
      .ilike('tournament_stage', stagePattern)
      .order('match_date', { ascending: true })

    if (!error && data && data.length > 0) {
      return data.map((r: any) => {
        const hp = Number(r.home_win_probability || 0.4)
        const dp = Number(r.draw_probability || 0.26)
        const ap = Number(r.away_win_probability || 0.34)
        const probs = [hp, dp, ap]
        const maxIdx = probs.indexOf(Math.max(...probs))
        const outcome = (['H', 'D', 'A'] as const)[maxIdx]
        const maxP = probs[maxIdx]
        const confidence = maxP >= 0.58 ? 'HIGH' : maxP >= 0.45 ? 'MEDIUM' : 'LOW'
        const strongPick = maxP >= 0.6

        return {
          id: r.id,
          fixture_id: r.id,
          home_team: r.home_team,
          away_team: r.away_team,
          home_flag: r.home_flag,
          away_flag: r.away_flag,
          home_win_probability: hp,
          draw_probability: dp,
          away_win_probability: ap,
          predicted_outcome: outcome,
          status: r.status || 'scheduled',
          tournament_stage: r.tournament_stage || `Gameweek ${gw}`,
          match_date: r.match_date,
          venue: r.venue,
          home_score: r.home_score,
          away_score: r.away_score,
          confidence,
          strong_pick: strongPick,
          model_public_version: 'ennovera-pl-v1.0',
          data_cutoff: 'Expected pre-match information (lineup probabilities)',
        }
      })
    }
  } catch (err) {
    console.warn('[PL API] Supabase query failed, attempting FastAPI proxy:', err)
  }

  // Fallback to FastAPI proxy
  const res = await fetch(`${API_BASE}/api/pl/fixtures?gw=${gw}&season=2026-27`, {
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    throw new Error(`Failed to fetch fixtures: ${res.statusText}`)
  }
  return res.json()
}

/**
 * Retrieves the 2026-27 Premier League 10,000 Monte Carlo Season Projection Table.
 */
export async function getPLTable(): Promise<PLTableResponse> {
  const res = await fetch(`${API_BASE}/api/pl/table?season=2026-27`, {
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    throw new Error(`Failed to fetch league projection: ${res.statusText}`)
  }
  return res.json()
}
