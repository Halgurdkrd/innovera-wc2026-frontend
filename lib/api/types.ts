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
  is_captain: boolean
  is_vice_captain: boolean
  bench_order?: number | null
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
  action: 'USE' | 'SAVE' | 'USED' | 'LOCKED' | 'EXPIRED'
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
  completed_gameweeks: number
  total_points: number
  average_points: number
  captain_points: number
  transfer_costs: number
  chip_points: number
  bench_points_missed: number
  history: FPLWeeklyPerformance[]
}
