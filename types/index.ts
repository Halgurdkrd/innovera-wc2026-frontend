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
}
