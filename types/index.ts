export interface Match {
  id: string
  home_team: string
  away_team: string
  home_team_flag?: string
  away_team_flag?: string
  match_time: string
  match_date: string
  venue?: string
  group_name?: string
  home_win_probability: number
  away_win_probability: number
  draw_probability: number
  ai_confidence: number
  status: 'upcoming' | 'live' | 'finished'
  home_score?: number
  away_score?: number
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
