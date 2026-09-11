export type ChatIntent =
  | 'PREDICTION_RECOMMENDATION'
  | 'SELECTION_EXPLANATION'
  | 'OFFICIAL_FPL_FACT'
  | 'LIVE_GAMEWEEK'
  | 'TEAM_OBJECT_QUERY'
  | 'PLAYER_COMPARISON'
  | 'METHODOLOGY_QUERY'
  | 'GENERAL_FPL_RULE_QUERY'
  | 'BUDGET_QUERY'
  | 'PROMPT_INJECTION_ATTEMPT'
  | 'UNSUPPORTED'
  | 'CLARIFICATION_REQUIRED'
  | 'RESEARCH_MODEL_QUERY'
  | 'GAMEWEEK_DELTA'

export type DataSourceType =
  | 'ENNOVERA_FROZEN'
  | 'ENNOVERA_LIVE_MANAGER'
  | 'OFFICIAL_FPL'
  | 'OFFICIAL_FIXTURE'
  | 'FPL_RULES'
  | 'DERIVED_COMPUTATION'
  | 'ENNOVERA_RESEARCH_ARTIFACT'

export interface ReferencedPlayer {
  id: number
  name: string
  webName: string
  club: string
  position: 'GK' | 'DEF' | 'MID' | 'FWD'
  price: number
  predictedXp?: number
  actualPoints?: number | null
  minutes?: number | null
  matchStatus?: 'FT' | 'LIVE' | 'NOT_STARTED'
  isCaptain?: boolean
  isViceCaptain?: boolean
}

export interface ConversationTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface FantasyChatRequest {
  question: string
  language?: 'en' | 'ku'
  requestedGameweek?: number
  conversationHistory?: ConversationTurn[]
  // Set by the main M3-only /fantasy page so chat answers default to
  // exactly what's on screen (model/GW/tab) instead of legacy FPL-03
  // grounding. Absent for any other caller, which preserves prior behavior.
  pageContext?: {
    model: 'M3_SHRUNK' | 'V0_CONTROL'
    gameweek: number
    object: 'OWN_START' | 'A_BLANK_SLATE' | 'B_LEGAL_BEST_XI' | 'PRIMARY' | 'OPTIONAL_XI_1' | 'OPTIONAL_XI_2' | 'OPTIONAL_XI_3' | 'OPTIONAL_XI_4'
  }
}

export interface FantasyChatResponse {
  answer: string
  intent: ChatIntent
  requestedGameweek: number
  contextStatus: 'GW2_LIVE' | 'GW3_UPCOMING' | 'GW1_COMPLETED' | 'GENERAL'
  sourceTypes: DataSourceType[]
  sourceBadge: string
  referencedPlayers: ReferencedPlayer[]
  suggestedFollowups: string[]
  generatedAt: string
  dataSnapshot: string
  llmUsed?: boolean
  llmProvider?: string
  responseTimeMs?: number
  researchModel?: 'M3_SHRUNK' | 'V0_CONTROL'
  researchGameweek?: number
  researchArtifactVersion?: string
  researchArtifactStatus?: string
  // Set on every legacy FPL-03 answer (never on a research-grounded answer,
  // which already carries its own accurate status/GW/version fields above).
  // FPL-03's GW2/GW3 data is a fixed 2026-27 season snapshot, not a live
  // feed -- this flag exists so callers never present it as a current
  // recommendation for whatever gameweek is actually live today.
  isHistoricalDemoSnapshot?: boolean
  demoSnapshotLabel?: string
}
