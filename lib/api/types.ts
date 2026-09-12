/**
 * TypeScript Data Contracts for Premier League & Fantasy Premier League.
 * Aligned with live FastAPI serving layer and Supabase canonical store.
 */

// ==========================================
// Premier League Types
// ==========================================

export interface PLFixture {
  id: string
  fixture_id?: string
  home_team: string
  away_team: string
  home_flag?: string
  away_flag?: string
  home_win_probability: number
  draw_probability: number
  away_win_probability: number
  predicted_outcome?: 'H' | 'D' | 'A'
  status: string
  tournament_stage: string
  match_date: string
  venue?: string
  home_score?: number | null
  away_score?: number | null
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW'
  strong_pick?: boolean
  model_public_version?: string
  data_cutoff?: string
}

export interface PLStanding {
  position: number
  team_name: string
  expected_points: number
  expected_position: number
  champion_pct: number
  top4_pct: number
  top6_pct: number
  relegation_pct: number
}

export interface PLTableResponse {
  competition: string
  season: string
  simulation_runs: number
  model_version: string
  generated_at: string
  data_cutoff?: string
  is_stale?: boolean
  staleness_note?: string
  standings: PLStanding[]
}

// ==========================================
// Fantasy Premier League Types
// ==========================================

export interface FPLPlayer {
  player_id: number
  name: string
  web_name?: string
  club: string
  position: 'GK' | 'DEF' | 'MID' | 'FWD'
  price: number
  // True when the source object has no real per-player price -- never
  // display "£0.0m" in that case, show "Price unavailable" instead.
  price_unavailable?: boolean
  expected_points: number
  // null/undefined means genuinely no forecast exists for this decision
  // object -- distinct from a real forecast of 0 expected minutes.
  expected_minutes?: number | null
  // Real P(start) probability from the source artifact. Left undefined
  // (never defaulted from is_starting/role) when the source genuinely has
  // no per-player start probability -- a selected-XI flag is NOT a 100%
  // appearance probability and must never be displayed as one.
  starting_prob?: number
  haul_prob: number
  is_starting: boolean
  is_captain?: boolean
  is_vice_captain?: boolean
  bench_order?: number | null
  // True only for the reserve goalkeeper's bench slot -- rendered as "GK"
  // instead of a numeric priority badge. Additive/optional: existing
  // callers never set it, so their numeric bench_order badges (or the '?B'
  // fallback) are unaffected.
  is_reserve_gk?: boolean
  // Set only when the true source bench-priority order could not be
  // determined for this row (never invented from points/price/xP).
  bench_order_unknown?: boolean
  opponent?: string
  home_away?: string
  likely_range?: [number, number]
  upside_score?: number
  high_upside_score?: number
  prob_10_plus?: number
  prob_15_plus?: number
  prob_20_plus?: number
  // True only when these five fields came from the SEPARATE, supplemental
  // Monte Carlo outlook artifact (research/.../supplemental_outlook/) --
  // never set for the legacy FPL-03 page's own fields, and must always be
  // rendered with an explicit "supplemental, not part of the original
  // frozen forecast" label, never merged silently into the frozen xP.
  outlook_is_supplemental?: boolean
  actual_points?: number | null
  // 'NOT_TRACKED' means no live match-state evidence exists for this
  // player at all (e.g. a frozen research forecast for an unplayed
  // gameweek) -- distinct from 'NOT_STARTED', which existing live pages
  // use for a match that IS being tracked but has not kicked off yet.
  match_status?: 'FT' | 'FINISHED' | 'DID_NOT_PLAY' | 'LIVE' | 'NOT_STARTED' | 'NOT_TRACKED'
  // Real research probability-card fields (distinct from starting_prob's
  // dual use above) -- only ever set from a source artifact, never derived.
  p_sub?: number | null
  p_dnp?: number | null
  // True only when this row's expected_points is a placeholder 0 because the
  // source object (e.g. Blank-Slate/Best-XI membership) does not carry a
  // per-player predicted xP at all -- only an aggregate xP for the whole XI.
  // Suppresses the misleading "0.00 xP" display without inventing a number.
  xp_unavailable?: boolean
}

export interface FPLTransferRecommendation {
  player_out: string
  player_in: string
  expected_gain: number
  free_transfers_used: number
  hit_points: number
  bank_after: number
  reason: string
}

export interface FPLChipRecommendation {
  action: 'USE' | 'SAVE' | 'USED' | 'LOCKED' | 'EXPIRED' | 'HOLD'
  chip_name?: string | null
  expected_incremental_gain: number
  reason: string
}

export interface FPLGameweekPlan {
  season: string
  gameweek: number
  deadline: string
  model_version: string
  data_cutoff: string
  generated_at: string
  expected_total_points: number
  team_likely_range?: [number, number]
  team_upside_score?: number
  team_high_upside_score?: number
  formation: string
  starting_xi: FPLPlayer[]
  bench: FPLPlayer[]
  captain: {
    player_id: number
    name: string
    club: string
    position: string
    price: number
    expected_points: number
    haul_probability: number
    captain_score?: number
    actual_points?: number | null
    actual_total?: number | null
  }
  vice_captain: {
    player_id: number
    name: string
    club: string
    position: string
    price: number
    expected_points: number
    haul_probability: number
    actual_points?: number | null
  }
  manager_team_status?: string
  expected_best_xi?: {
    expected_total_points: number
    team_likely_range?: [number, number]
    team_upside_score?: number
    team_high_upside_score?: number
    formation?: string
    captain?: string
    vice_captain?: string
    players?: FPLPlayer[]
  }
  best_playable_100m?: {
    expected_total_points: number
    team_likely_range?: [number, number]
    team_upside_score?: number
    team_high_upside_score?: number
    squad_cost?: number
    starting_xi_cost?: number
    bench_cost?: number
    bank?: number
    formation?: string
    captain?: string
    vice_captain?: string
    starting_xi?: FPLPlayer[]
    bench?: FPLPlayer[]
  }
  recommended_transfers: FPLTransferRecommendation[]
  chip_recommendation: FPLChipRecommendation
  available_chips: string[]
  bank: number
  free_transfers: number
  warnings?: string[]
}

export interface FPLCaptainResponse {
  season: string
  gameweek: number
  captain: {
    player_id: number
    name: string
    club: string
    position: string
    price: number
    expected_points: number
    haul_probability: number
    captain_score?: number
  }
  vice_captain: {
    player_id: number
    name: string
    club: string
    position: string
    price: number
    expected_points: number
    haul_probability: number
  }
  alternatives: Array<{
    name: string
    club: string
    expected_points: number
    haul_probability: number
  }>
  selection_rationale: string
}

export interface FPLChipStatusItem {
  chip_id: string
  name: string
  available: boolean
  used: boolean
  status: 'AVAILABLE' | 'USED' | 'LOCKED' | 'EXPIRED'
  target_gw?: number | null
  expected_incremental_value: number
  reservation_value: number
  reason: string
}

export interface FPLPerformancePlayer {
  player_id: number
  name: string
  web_name: string
  club: string
  position: 'GK' | 'DEF' | 'MID' | 'FWD'
  price?: number
  predicted_xp: number
  actual_points?: number | null
  opponent?: string
  home_away?: 'H' | 'A' | string
  likely_range?: [number, number]
  delta: number | null
  minutes: number | null
  match_status?: string
  is_captain?: boolean
  is_vice_captain?: boolean
}

export interface FPLPerformanceCaptain {
  player_id: number
  name: string
  club: string
  position: string
  predicted_base_xp: number
  expected_captain_contribution: number
  actual_base: number | null
  captain_multiplier: number
  actual_captain_contribution: number | null
  delta: number | null
}

export interface FPLPerformanceGameweek {
  gameweek: number
  classification: 'HISTORICAL_REPLAY' | 'PROSPECTIVE' | 'AUTHENTIC_PROSPECTIVE' | 'DEPLOYED_HYBRID_PROSPECTIVE' | string
  status: 'COMPLETE' | 'FROZEN_PENDING' | 'LIVE' | 'UPCOMING' | 'PRE_DEADLINE' | string
  model_version: string
  model_hash?: string
  prediction_hash?: string
  deadline: string
  formation: string
  projected_total: number
  actual_total: number | null
  delta: number | null
  xi_predicted_base?: number
  captain_expected_bonus?: number
  xi_raw_actual?: number | null
  captain_actual_extra?: number | null
  bench_actual?: number | null
  total_15_raw_actual?: number | null
  transfers_made: number
  transfers_in?: string[]
  transfers_out?: string[]
  hit_cost: number
  chip_used: string
  bank: number
  free_transfers: number
  manager_team_status?: string
  expected_best_xi?: {
    expected_total_points: number
    actual_total?: number | null
    delta?: number | null
    team_likely_range?: [number, number]
    team_upside_score?: number
    team_high_upside_score?: number
    formation?: string
    captain?: string
    vice_captain?: string
    starting_xi?: FPLPerformancePlayer[]
    bench?: FPLPerformancePlayer[]
  }
  best_playable_100m?: {
    expected_total_points: number
    actual_total?: number | null
    delta?: number | null
    team_likely_range?: [number, number]
    team_upside_score?: number
    team_high_upside_score?: number
    squad_cost?: number
    starting_xi_cost?: number
    bench_cost?: number
    bank?: number
    formation?: string
    captain?: string
    vice_captain?: string
    starting_xi?: FPLPerformancePlayer[]
    bench?: FPLPerformancePlayer[]
  }
  captain: FPLPerformanceCaptain
  vice_captain: {
    player_id: number
    name: string
    club: string
    position: string
    predicted_base_xp: number
    actual: number | null
  }
  starting_xi: FPLPerformancePlayer[]
  bench: FPLPerformancePlayer[]
}

export interface FPLPerformanceSummary {
  prospective_completed_gws: number
  prospective_projected_total: number
  prospective_actual_total: number | null
  prospective_delta: number | null
  historical_replay_gws: number
  historical_projected_total: number
  historical_actual_total: number
  historical_delta: number
}

export interface FPLWeeklyPerformance {
  gameweek: number
  score: number
  raw_xi_pts: number
  captain_name: string
  captain_pts: number
  transfers_made: number
  hit_cost: number
  chip_used: string
  bench_pts: number
}

export interface FPLPerformanceResponse {
  season: string
  summary: FPLPerformanceSummary
  gameweeks: FPLPerformanceGameweek[]
  completed_gameweeks?: number
  total_points?: number
  average_points?: number
  captain_points?: number
  transfer_costs?: number
  chip_points?: number
  bench_points_missed?: number
  history?: FPLWeeklyPerformance[]
}
