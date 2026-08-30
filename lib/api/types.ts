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
  expected_points: number
  expected_minutes: number
  starting_prob: number
  haul_prob: number
  is_starting: boolean
  is_captain?: boolean
  is_vice_captain?: boolean
  bench_order?: number | null
  opponent?: string
  home_away?: string
  likely_range?: [number, number]
  upside_score?: number
  high_upside_score?: number
  prob_10_plus?: number
  prob_15_plus?: number
  prob_20_plus?: number
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
    team_likely_range?: [number, number]
    team_upside_score?: number
    team_high_upside_score?: number
    formation?: string
    captain?: string
    vice_captain?: string
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
