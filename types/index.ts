export interface Match {
  // DB primary key — matches table uses match_id (UUID)
  match_id?: string
  // id kept for backward compat (components that use match.id)
  id?: string
  home_team: string
  away_team: string
  home_team_flag?: string
  away_team_flag?: string
  // match_date is a timestamptz (contains both date + time); match_time is a legacy alias
  match_date?: string
  match_time?: string
  tournament_stage?: string
  venue?: string
  group_name?: string
  // Probability fields — optional; may not be in DB yet
  home_win_probability?: number
  away_win_probability?: number
  draw_probability?: number
  ai_confidence?: number
  // 'scheduled' = DB value, 'upcoming' = legacy alias used in old code
  status: 'upcoming' | 'scheduled' | 'live' | 'finished'
  home_score?: number
  away_score?: number
  narrative?: string
  lineup_updated?: boolean  // true when confirmed lineups have been applied
}

export interface LuckScore {
  id: string
  team_name: string
  team_flag?: string
  luck_score: number
  match_date: string
  result: 'win' | 'draw' | 'loss'
  expected_result: string
}

export interface GroupStanding {
  id: string
  group_name: string
  team_name: string
  team_flag?: string
  played: number
  won: number
  drawn: number
  lost: number
  goals_for: number
  goals_against: number
  goal_difference: number
  points: number
  position: number
  confederation?: string
  // Average expected standings — populated by the simulation engine
  avg_points?: number
  avg_gf?: number
  avg_ga?: number
  avg_gd?: number
  expected_rank?: number
}

// ── Prediction / Match Detail ─────────────────────────────────────────────────

export interface ShapReason {
  factor: string
  direction: 'positive' | 'negative' | 'neutral'
  value: number
  team: 'home' | 'away'
  description?: string
}

export interface Scoreline {
  home_score: number
  away_score: number
  probability: number
}

export interface TeamMomentum {
  team: string
  team_flag?: string
  score: number          // 0–100
  trend: 'rising' | 'falling' | 'stable'
  recent_form?: string[] // ['W','D','L',…]
}

export interface KeyPlayer {
  name: string
  team: string
  team_flag?: string
  role: string
  impact_score: number   // 0–10
  stat?: string
}

export interface MissingPlayerDetail {
  player: string
  xg_per90: number
  impact: number
  data_source: string
}

export interface LineupInfo {
  lineup_used: boolean
  home_missing: string[]
  away_missing: string[]
  home_attack_adj: number
  away_attack_adj: number
  prob_shift: number
  missing_details?: MissingPlayerDetail[]
}

export interface Prediction {
  id: string
  match_id: string
  shap_reasons?: ShapReason[]
  scorelines?: Scoreline[]
  momentum?: TeamMomentum[]
  key_player?: KeyPlayer
  ai_narrative?: string
  luck_score?: number    // –10 … +10 (post-match only)
  luck_label?: 'Lucky' | 'Deserved' | 'Unlucky'
  lineup_info?: LineupInfo
}

// ── Explore / Teams ───────────────────────────────────────────────────────────

export interface Team {
  id?: string
  name: string
  flag?: string
  group_name?: string
  confederation?: string
  momentum_score?: number
  luck_avg?: number
  last_results?: string[]  // ['W','D','L']
  squad_info?: string
  // from standings
  played?: number
  won?: number
  drawn?: number
  lost?: number
  points?: number
  position?: number
  goals_for?: number
  goals_against?: number
  goal_difference?: number
}

// ── Bracket ───────────────────────────────────────────────────────────────────

export interface BracketSlot {
  id: string
  round: string
  slot_number: number
  team_a?: string
  team_a_flag?: string
  team_b?: string
  team_b_flag?: string
  score_a?: number
  score_b?: number
  winner?: string
  match_date?: string
}

// ── Tournament Simulation ─────────────────────────────────────────────────────

export interface TournamentGroupTeam {
  team: string
  flag?: string
  predicted_pts: number
  predicted_gd: number
  predicted_gf: number
  qualify_prob: number       // 0–1
  qualified?: boolean
  eliminated?: boolean
}

export interface TournamentGroup {
  group: string
  teams: TournamentGroupTeam[]
}

export interface TournamentBracketMatch {
  round: string
  slot_number: number
  team_a?: string
  team_a_flag?: string
  team_b?: string
  team_b_flag?: string
  win_prob_a?: number        // 0–1
  win_prob_b?: number        // 0–1
  predicted_winner?: string
  actual_winner?: string
  match_date?: string
  score_a?: number
  score_b?: number
}

export interface TournamentChampion {
  team: string
  flag?: string
  probability: number        // 0–1
}

export interface TournamentSimulation {
  groups?: TournamentGroup[]
  bracket?: TournamentBracketMatch[]
  predicted_champion?: TournamentChampion
  winner_probs?: Record<string, number>
  flag_map?: Record<string, string>
}

// ── User Bracket ──────────────────────────────────────────────────────────────

export interface UserBracketMatchResult {
  slot_number: number
  round: string
  team_a?: string
  team_b?: string
  user_pick?: string
  ai_prediction?: string
  actual_result?: string | null
  user_correct?: boolean | null
}

export interface UserBracketResponse {
  bracket: UserBracketMatchResult[]
  score: number
  max_score: number
}
