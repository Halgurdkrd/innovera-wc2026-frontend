// Grounds Ennovera fantasy-chat answers about the verified M3_SHRUNK / V0_CONTROL
// research artifacts. Runs server-side (called from chatEngine.ts inside the
// /api/fantasy/chat route), so it fetches the backend directly rather than
// through the client-facing /api/research-fpl/* proxy routes.
//
// Every number in the answers below comes straight from the fetched artifact.
// The LLM is never used to produce these answers -- the governance rules for
// this integration require deterministic numerical grounding for M3/V0
// research-model queries, with no invented scores, rankings, or legality.

import type { ChatIntent, ConversationTurn, DataSourceType, FantasyChatResponse, ReferencedPlayer } from './types'

export type ResearchModel = 'M3_SHRUNK' | 'V0_CONTROL'

interface OwnStartPlayer {
  stable_player_id: number
  name: string
  club: string
  position: 'GK' | 'DEF' | 'MID' | 'FWD'
  price: number
  role: 'XI' | 'BENCH'
  is_captain: boolean
  is_vice: boolean
  predicted_xp: number
  actual_points: number | null
  counted_contribution: number | null
  was_transferred_in_this_gw: boolean
}

interface OwnStartResponse {
  status: string
  reason?: string
  model?: ResearchModel
  gameweek?: number
  players?: OwnStartPlayer[]
  transfer_event?: { player_out: string | null; player_in: string | null } | null
  hit_cost?: number
  free_transfers_before?: number | null
  gross_points?: number
  net_points?: number
  artifact_version?: string
  bank_after?: number | null
}

export type ObjectLabel = 'OWN_START' | 'A_BLANK_SLATE' | 'B_LEGAL_BEST_XI' | 'PRIMARY' | 'OPTIONAL_XI_1' | 'OPTIONAL_XI_2' | 'OPTIONAL_XI_3' | 'OPTIONAL_XI_4'

interface ObjectMember {
  stable_player_id: number | null
  name: string
  position: string
  price: number | null
  predicted_xp?: number | null
  actual_points?: number | null
  is_captain?: boolean
  is_vice?: boolean
}

interface ObjectResponse {
  status: string
  reason?: string
  formation?: string | null
  captain?: string
  vice?: string
  predicted_xi_xp?: number | null
  final_points?: number | null
  corrected_points?: number | null
  note?: string
  player_membership?: ObjectMember[] | 'NOT_AVAILABLE'
}

const OBJECT_LABELS: Record<ObjectLabel, string> = {
  OWN_START: 'AI Manager',
  A_BLANK_SLATE: 'Blank-Slate Squad',
  B_LEGAL_BEST_XI: 'Best XI',
  PRIMARY: 'Optional XI: Primary',
  OPTIONAL_XI_1: 'Optional XI 1',
  OPTIONAL_XI_2: 'Optional XI 2',
  OPTIONAL_XI_3: 'Optional XI 3',
  OPTIONAL_XI_4: 'Optional XI 4',
}

function upstreamBase(): string {
  // Matches the existing FPL-03 proxy routes' production fallback (see
  // app/api/research-fpl/status/route.ts) -- 72.62.35.32 with no port
  // reaches the VPS's Nginx, not a Vercel-container-local loopback.
  return (process.env.BACKEND_INTERNAL_URL || process.env.VPS_BACKEND_URL || 'http://72.62.35.32').trim().replace(/\/+$/, '')
}

async function fetchOwnStart(gw: number, model: ResearchModel): Promise<OwnStartResponse> {
  const url = `${upstreamBase()}/api/v1/research-fpl/gameweek/${gw}/own-start?model=${encodeURIComponent(model)}`
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 4000)
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' })
    clearTimeout(timeoutId)
    // A non-2xx/unreachable backend is a connectivity failure, not "no
    // forecast exists" -- kept as a distinct status so the answer never
    // claims data is missing when the real problem is transient (this is
    // exactly the distinction that mattered during the backend hang: a
    // stuck server must never be reported to the user as "no GW4 pair").
    if (!res.ok) {
      return { status: 'TEMPORARILY_UNAVAILABLE', reason: `Research API returned HTTP ${res.status}.`, model, gameweek: gw }
    }
    return await res.json()
  } catch {
    return { status: 'TEMPORARILY_UNAVAILABLE', reason: 'Research API unreachable.', model, gameweek: gw }
  }
}

async function fetchObjectData(gw: number, model: ResearchModel, object: ObjectLabel): Promise<ObjectResponse> {
  const url = `${upstreamBase()}/api/v1/research-fpl/gameweek/${gw}/object?model=${encodeURIComponent(model)}&object=${encodeURIComponent(object)}`
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 4000)
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' })
    clearTimeout(timeoutId)
    if (!res.ok) {
      return { status: 'TEMPORARILY_UNAVAILABLE', reason: `Research API returned HTTP ${res.status}.` }
    }
    return await res.json()
  } catch {
    return { status: 'TEMPORARILY_UNAVAILABLE', reason: 'Research API unreachable.' }
  }
}

export interface FullPoolPlayer {
  stable_player_id: number
  name: string
  club: string
  position: 'GK' | 'DEF' | 'MID' | 'FWD'
  price: number | null
  official_fpl_status?: string | null
  opponent: string | null
  opponent_resolved: string | null
  was_home: boolean | null
  fixture_id: string | null
  has_target_gw_fixture: boolean | null
  predicted_xp: number | null
  rank_overall: number | null
  rank_by_position: number | null
  p_start: number | null
  p_sub: number | null
  p_dnp: number | null
  expected_minutes: number | null
}

interface FullPoolResponse {
  status: string
  reason?: string
  model?: ResearchModel
  gameweek?: number
  position_filter?: string | null
  total_eligible_players?: number
  total_matching_filter?: number
  returned_count?: number
  players?: FullPoolPlayer[]
}

// The full eligible candidate pool for one model/GW (up to ~500 players),
// NOT one decision object's ~11-15 member roster -- backs every
// league-wide "top N <position>" chat query. Only ever available for the
// currently registered final pair (see get_full_pool in
// research_fpl_service.py); GW1-3 reconstruction never had this.
async function fetchFullPool(gw: number, model: ResearchModel, position?: 'GK' | 'DEF' | 'MID' | 'FWD', limit?: number): Promise<FullPoolResponse> {
  const params = new URLSearchParams({ model })
  if (position) params.set('position', position)
  if (limit) params.set('limit', String(limit))
  const url = `${upstreamBase()}/api/v1/research-fpl/gameweek/${gw}/full-pool?${params.toString()}`
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 4000)
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' })
    clearTimeout(timeoutId)
    if (!res.ok) {
      return { status: 'TEMPORARILY_UNAVAILABLE', reason: `Research API returned HTTP ${res.status}.` }
    }
    return await res.json()
  } catch {
    return { status: 'TEMPORARILY_UNAVAILABLE', reason: 'Research API unreachable.' }
  }
}

// Friendly public label -- chat prose must not lead with the internal
// model identifier (M3_SHRUNK/V0_CONTROL); that stays in sourceBadge/
// metadata for anyone who expands technical details.
const PUBLIC_MODEL_LABEL: Record<ResearchModel, string> = {
  M3_SHRUNK: "Ennovera's forecast",
  V0_CONTROL: 'the baseline comparison model',
}

function parseGameweek(q: string, fallback: number): number {
  const m = q.match(/\bgw\s*([1-4])\b/) || q.match(/\bgame\s*[\s-]?\s*week\s*([1-4])\b/)
  return m ? parseInt(m[1], 10) : fallback
}

// "top 10" / "ten" / bare "top" (defaults to 5) -- deterministic, never
// asks the LLM to count.
const WORD_NUMBERS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 }
function extractRequestedCount(q: string): number {
  const digit = q.match(/\btop\s*(\d{1,2})\b/) || q.match(/\b(\d{1,2})\s+(?:midfielders?|defenders?|forwards?|attackers?|strikers?|goalkeepers?|players?|mids?|defs?|fwds?|gks?|diffeders?|atatckers?)\b/)
  if (digit) return Math.min(50, Math.max(1, parseInt(digit[1], 10)))
  for (const [word, n] of Object.entries(WORD_NUMBERS)) {
    if (new RegExp(`\\b${word}\\b`).test(q)) return n
  }
  return 5
}

// A short correction phrase narrowing an earlier broader request ("I said
// midfielders, not all players", "no, midfielders only", "just
// defenders") -- detected so the answer never falls back to a generic
// summary when the user is explicitly re-scoping a position request.
function isNarrowingCorrection(q: string): boolean {
  return /\bnot\s+all\b|\bi\s+said\b|^no[,]?\s|\bonly\b|^just\b/.test(q)
}

type Position = 'GK' | 'DEF' | 'MID' | 'FWD'

// Every DISTINCT position mentioned, in first-mention order -- supports
// "top 10 midfielders, 10 defenders and ten attackers" in one message.
// Includes the required shorthand (md/mid, def, fwd) and the specific
// misspellings observed in real user messages (diffeders, atatckers),
// plus a few common variants; this is pattern-based typo tolerance for
// known shapes, not a general spellchecker/fuzzy-match.
function matchAllPositions(q: string): Position[] {
  const patterns: [Position, RegExp][] = [
    ['MID', /\bmds?\b|\bmids?\b|\bmidfield(er)?s?\b|\bmidfeilders?\b/],
    ['DEF', /\bdefs?\b|\bdefend(er)?s?\b|\bdiffend(er)?s?\b|\bdiffeders?\b|\bdefendors?\b/],
    ['FWD', /\bfwds?\b|\bforwards?\b|\bstrikers?\b|\battackers?\b|\batatckers?\b|\battakers?\b/],
    ['GK', /\bgks?\b|\bgoalkeepers?\b|\bkeepers?\b/],
  ]
  const found: Position[] = []
  for (const [pos, re] of patterns) {
    if (re.test(q) && !found.includes(pos)) found.push(pos)
  }
  return found
}

// Is this a ranking-style question at all ("best"/"top"/"highest"/"good
// choices"), independent of which/how-many positions it names? Split out
// from matchAllPositions so a bare position mention with no ranking intent
// (e.g. "tell me about defenders" as part of a different question) doesn't
// misfire into the ranking branch.
function isRankingQuestion(q: string): boolean {
  return /\bbest\b|\bhighest\b|\btop\b|\bgood\s+choices?\b/.test(q)
}

type AlternativesIntent =
  | { kind: 'PLAYER'; playerName: string }
  | { kind: 'XI_OBJECTS' }
  | { kind: 'AMBIGUOUS' }

// Distinguishes three different things a user might mean by "alternatives"
// -- (A) alternative individual players, (B) the site's stored Optional-XI
// lineup objects, (C) a legally affordable transfer under budget/ownership
// constraints (handled separately at the call site, not here, since it
// needs the Own-Start squad/bank, not just text). Returns null if the
// question isn't an alternatives-style question at all.
function detectAlternativesQuery(q: string, players: OwnStartPlayer[]): AlternativesIntent | null {
  // \baltern\w*tiv\w*\b tolerates the common letter-order/vowel-swap typos
  // seen in real messages (e.g. "alternetives") without hardcoding every
  // individual misspelling -- "altern" + anything + "tiv" + anything is
  // distinctive enough not to false-positive on unrelated words.
  const mentionsAlternative = /\baltern\w*tiv\w*\b/.test(q) || /\bsubstitutes?\s+for\b|\binstead\s+of\b/.test(q)
  if (!mentionsAlternative) return null
  // "alternative team(s)/squad(s)/xi(s)/lineup(s)" -> the stored Optional-XI objects.
  if (/\baltern\w*tiv\w*\s*(to|for)?\s*(the\s+)?(team|squad|xi|lineup|line[\s-]?up)s?\b/.test(q)) {
    return { kind: 'XI_OBJECTS' }
  }
  // "alternative(s) to/for <player name>" -- match against the currently
  // known squad so a real name (however the user typed it) resolves.
  const named = findMentionedPlayer(q, players)
  if (named) return { kind: 'PLAYER', playerName: named.name }
  // Bare "alternatives (for/this) (this) gameweek" with no name and no
  // explicit team/squad wording -- genuinely ambiguous per spec.
  return { kind: 'AMBIGUOUS' }
}

function detectLegalTransferQuery(q: string): boolean {
  return /\blegal(ly)?\s+(afford|transfer|bring|sign)/.test(q) || /\bcan\s+i\s+(afford|bring\s+in|sign)\b/.test(q)
}

// An explicit object mention in the CURRENT question always wins, same
// precedence rule as parseModel -- "why this captain?" on the Best XI tab
// must answer about Best XI, but "what about the blank slate?" must switch
// even without repeating a GW/model.
function parseObject(q: string, fallback: ObjectLabel): ObjectLabel {
  if (/\bbest\s*[-]?\s*xi\b/.test(q)) return 'B_LEGAL_BEST_XI'
  if (/\bblank[\s-]*slate\b/.test(q)) return 'A_BLANK_SLATE'
  if (/\boptional\s*xi\s*1\b|\boption\s*1\b/.test(q)) return 'OPTIONAL_XI_1'
  if (/\boptional\s*xi\s*2\b|\boption\s*2\b/.test(q)) return 'OPTIONAL_XI_2'
  if (/\boptional\s*xi\s*3\b|\boption\s*3\b/.test(q)) return 'OPTIONAL_XI_3'
  if (/\boptional\s*xi\s*4\b|\boption\s*4\b/.test(q)) return 'OPTIONAL_XI_4'
  if (/\boptional\s*xi\b|\bprimary\b/.test(q)) return 'PRIMARY'
  if (/\bown[\s-]*start\b|\bai\s*manager\b|\bmanager\s*team\b/.test(q)) return 'OWN_START'
  return fallback
}

function parseTwoGameweeks(q: string, fallback: number): [number, number] {
  const gwNums = Array.from(q.matchAll(/(?:gw|gameweek)\s*([1-4])\b/g)).map((m) => parseInt(m[1], 10))
  if (gwNums.length >= 2 && gwNums[0] !== gwNums[1]) return [gwNums[0], gwNums[1]]
  const single = parseGameweek(q, fallback)
  return [Math.max(1, single - 1), single]
}

function detectModelMention(q: string): ResearchModel | 'BOTH' | null {
  const hasM3 = q.includes('m3_shrunk') || q.includes('m3 shrunk') || /\bm3\b/.test(q)
  const hasV0 = q.includes('v0_control') || q.includes('v0 control') || /\bv0\b/.test(q)
  if (hasM3 && hasV0) return 'BOTH'
  if (hasV0) return 'V0_CONTROL'
  if (hasM3) return 'M3_SHRUNK'
  return null
}

// An explicit model mention in the CURRENT question always wins (a user
// switching models mid-conversation must never keep getting the old
// model's answer). Only when the current question is silent on model does
// this fall back to the most recently mentioned model in history, so a
// natural follow-up like "what about GW2?" keeps talking about whichever
// model was already under discussion instead of silently resetting to the
// M3_SHRUNK default.
function parseModel(q: string, history: ConversationTurn[] = []): ResearchModel | 'BOTH' {
  const current = detectModelMention(q)
  if (current) return current
  for (let i = history.length - 1; i >= 0; i--) {
    const prior = detectModelMention(history[i].content.toLowerCase())
    if (prior && prior !== 'BOTH') return prior
  }
  return 'M3_SHRUNK'
}

function toReferencedPlayer(p: OwnStartPlayer): ReferencedPlayer {
  return {
    id: p.stable_player_id,
    name: p.name,
    webName: p.name,
    club: p.club,
    position: p.position,
    price: p.price,
    predictedXp: p.predicted_xp,
    actualPoints: p.actual_points,
    matchStatus: p.actual_points !== null ? 'FT' : 'NOT_STARTED',
    isCaptain: p.is_captain,
    isViceCaptain: p.is_vice,
  }
}

function findMentionedPlayer(question: string, players: OwnStartPlayer[]): OwnStartPlayer | undefined {
  const q = question.toLowerCase()
  return players.find((p) => {
    const parts = p.name.toLowerCase().split(/\s+/).filter((w) => w.length > 2)
    return parts.some((part) => q.includes(part))
  })
}

// Never surface the source export's internal technical codes verbatim.
const NOTE_TEXT: Record<string, string> = {
  XI_ONLY_no_autosub: 'An alternative starting XI. No reserve bench or automatic substitutions.',
}
const formatNote = (note: string): string => NOTE_TEXT[note] ?? note

const citation = (model: ResearchModel, gw: number, artifactVersion?: string) =>
  `${model} GW${gw}${artifactVersion ? ` (artifact ${artifactVersion})` : ''}`

// Never surface raw formation JSON/repr in a chat answer -- reduce to a
// human-readable "DEF-MID-FWD" string (GK implicit), matching the page's
// own formatFormation.
function formatFormation(f: unknown): string {
  if (f === null || f === undefined) return 'unknown'
  if (typeof f === 'object') {
    const o = f as Record<string, number>
    if (o.DEF !== undefined || o.MID !== undefined || o.FWD !== undefined) {
      return `${o.DEF ?? 0}-${o.MID ?? 0}-${o.FWD ?? 0}`
    }
    return 'unknown'
  }
  const s = String(f)
  if (/^\d(-\d){1,2}$/.test(s)) return s
  if (s.trim().startsWith('{')) {
    try {
      return formatFormation(JSON.parse(s.replace(/'/g, '"')))
    } catch {
      return 'unknown'
    }
  }
  return s === 'None' || s === 'nan' ? 'unknown' : s
}

export interface FantasyPageContext {
  model: ResearchModel
  gameweek: number
  object: ObjectLabel
}

// The public M3-only Fantasy page (identified by pageContext being set)
// must never volunteer a V0_CONTROL comparison the user didn't ask for --
// an explicit "compare"/"vs" question still reaches the compare branch
// above regardless, this only trims unsolicited SUGGESTIONS.
function withoutUnsolicitedV0(suggestions: string[], pageContext: FantasyPageContext | undefined, fallback: string): string[] {
  if (!pageContext) return suggestions
  const filtered = suggestions.filter((s) => !s.toLowerCase().includes('v0_control'))
  return filtered.length > 0 ? filtered : [fallback]
}

export async function buildResearchGroundedAnswer(
  question: string,
  intent: ChatIntent,
  lang: 'en' | 'ku',
  history: ConversationTurn[] = [],
  pageContext?: FantasyPageContext
): Promise<FantasyChatResponse> {
  const t0 = Date.now()
  const q = question.toLowerCase()
  const sourceTypes: DataSourceType[] = ['ENNOVERA_RESEARCH_ARTIFACT']

  const na = (reason: string, gw: number, model: ResearchModel, sourceStatus: string = 'NOT_AVAILABLE'): FantasyChatResponse => {
    // TEMPORARILY_UNAVAILABLE (network/server failure) must never be
    // phrased as "this forecast doesn't exist" -- that would turn a
    // transient connectivity problem into a false missing-data claim.
    const isTemporaryFailure = sourceStatus === 'TEMPORARILY_UNAVAILABLE'
    const answer = isTemporaryFailure
      ? (lang === 'ku'
          ? `ناتوانرێت زانیاری ئێستا باربکرێت (کێشەی پەیوەندی، نەک نەبوونی پێشبینی): ${reason}`
          : `Temporarily unable to load that data (a connectivity issue, not a missing forecast): ${reason}`)
      : (lang === 'ku'
          ? `ئەم زانیارییە بەردەست نییە: ${reason}`
          : `That information is not available yet: ${reason}`)
    return {
      answer,
      intent,
      requestedGameweek: gw,
      contextStatus: 'GENERAL',
      sourceTypes,
      sourceBadge: `${model} GW${gw} • ${isTemporaryFailure ? 'Connection issue' : 'Not available'}`,
      referencedPlayers: [],
      suggestedFollowups: withoutUnsolicitedV0(["Show Ennovera's GW3 forecast", 'Compare M3_SHRUNK and V0_CONTROL for GW2'], pageContext, "Show Ennovera's GW3 forecast"),
      generatedAt: new Date().toISOString(),
      dataSnapshot: isTemporaryFailure ? 'RESEARCH_ARTIFACT_TEMPORARILY_UNAVAILABLE' : 'RESEARCH_ARTIFACT_NOT_AVAILABLE',
      llmUsed: false,
      responseTimeMs: Date.now() - t0,
      researchModel: model,
      researchGameweek: gw,
      researchArtifactStatus: sourceStatus,
    }
  }

  if (intent === 'GAMEWEEK_DELTA') {
    const model = parseModel(q, history) === 'BOTH' ? 'M3_SHRUNK' : (parseModel(q, history) as ResearchModel)
    const [gwA, gwB] = parseTwoGameweeks(q, 3)
    const [respA, respB] = await Promise.all([fetchOwnStart(gwA, model), fetchOwnStart(gwB, model)])

    if (respA.status !== 'HISTORICAL_RECONSTRUCTION' && respA.status !== 'FINAL_FROZEN_FORECAST') {
      return na(respA.reason || `${model} GW${gwA} is not available.`, gwA, model, respA.status)
    }
    if (respB.status !== 'HISTORICAL_RECONSTRUCTION' && respB.status !== 'FINAL_FROZEN_FORECAST') {
      return na(respB.reason || `${model} GW${gwB} is not available.`, gwB, model, respB.status)
    }

    const inA = new Set((respA.players || []).map((p) => p.stable_player_id))
    const inB = new Set((respB.players || []).map((p) => p.stable_player_id))
    const droppedOut = (respA.players || []).filter((p) => !inB.has(p.stable_player_id))
    const broughtIn = (respB.players || []).filter((p) => !inA.has(p.stable_player_id))
    const transfer = respB.transfer_event
    const bothPlayed = respA.net_points != null && respB.net_points != null

    const lines: string[] = []
    lines.push(
      lang === 'ku'
        ? `گۆڕانکارییەکانی ${PUBLIC_MODEL_LABEL[model]} لە GW${gwA} بۆ GW${gwB}:`
        : `Changes in ${PUBLIC_MODEL_LABEL[model]} from GW${gwA} to GW${gwB}:`
    )
    if (transfer && transfer.player_out && transfer.player_in) {
      lines.push(`- Transfer: ${transfer.player_out} → ${transfer.player_in}`)
    } else if (broughtIn.length > 0 || droppedOut.length > 0) {
      lines.push(`- Squad changes: out ${droppedOut.map((p) => p.name).join(', ') || 'none'}; in ${broughtIn.map((p) => p.name).join(', ') || 'none'}`)
    } else {
      lines.push('- No squad transfer recorded between these gameweeks.')
    }
    if (bothPlayed) {
      const netDelta = (respB.net_points ?? 0) - (respA.net_points ?? 0)
      lines.push(`- Net points: GW${gwA}=${respA.net_points} → GW${gwB}=${respB.net_points} (${netDelta >= 0 ? '+' : ''}${netDelta.toFixed(1)})`)
    } else {
      lines.push(`- Net points: GW${gwA}=${respA.net_points ?? 'not available'}, GW${gwB}=${respB.net_points ?? 'actual points not available yet (not played)'}.`)
    }

    return {
      answer: lines.join('\n'),
      intent,
      requestedGameweek: gwB,
      contextStatus: 'GENERAL',
      sourceTypes,
      sourceBadge: `${citation(model, gwA, respA.artifact_version)} vs ${citation(model, gwB, respB.artifact_version)}`,
      referencedPlayers: [...droppedOut, ...broughtIn].map(toReferencedPlayer),
      suggestedFollowups: withoutUnsolicitedV0([`Compare M3_SHRUNK and V0_CONTROL for GW${gwB}`, `Who was the captain in GW${gwB}?`], pageContext, `Who was the captain in GW${gwB}?`),
      generatedAt: new Date().toISOString(),
      dataSnapshot: 'RESEARCH_ARTIFACT_HISTORICAL_RECONSTRUCTION',
      llmUsed: false,
      responseTimeMs: Date.now() - t0,
      researchModel: model,
      researchGameweek: gwB,
      researchArtifactVersion: respB.artifact_version,
      researchArtifactStatus: respB.status,
    }
  }

  // RESEARCH_MODEL_QUERY
  const modelSel = pageContext && !detectModelMention(q) ? pageContext.model : parseModel(q, history)
  const gw = parseGameweek(q, pageContext?.gameweek ?? 3)
  const objectSel = parseObject(q, pageContext?.object ?? 'OWN_START')

  const POS_NAME: Record<Position, string> = { MID: 'midfielder', DEF: 'defender', FWD: 'forward', GK: 'goalkeeper' }

  // Alternatives: distinguish player alternatives, stored Optional-XI
  // objects, and legal-transfer-under-constraints -- three different
  // things a bare "alternatives" question could mean. Checked before
  // position-ranking since neither pattern overlaps the ranking wording.
  if (modelSel !== 'BOTH') {
    const model = modelSel as ResearchModel
    const ownStartForAlts = await fetchOwnStart(gw, model)
    const altsPlayers = ownStartForAlts.players || []
    const altIntent = detectAlternativesQuery(q, altsPlayers)
    if (altIntent) {
      if (detectLegalTransferQuery(q) && altIntent.kind === 'PLAYER') {
        // Legal-transfer-under-constraints: distinct from an unconstrained
        // player alternative -- must actually check bank/price/position
        // against the Own-Start squad, never just relabel a suggestion.
        const target = altsPlayers.find((p) => p.name === altIntent.playerName)
        if (!target) return na(`Could not resolve "${altIntent.playerName}" in the Own-Start squad.`, gw, model)
        const bank = ownStartForAlts.bank_after ?? 0
        const budget = bank + (target.price ?? 0)
        const pool = await fetchFullPool(gw, model, target.position, 50)
        if (pool.status !== 'AVAILABLE') return na(pool.reason || 'Full player pool unavailable.', gw, model, pool.status)
        const ownedIds = new Set(altsPlayers.map((p) => p.stable_player_id))
        const affordable = (pool.players || [])
          .filter((p) => !ownedIds.has(p.stable_player_id) && (p.price ?? Infinity) <= budget)
        const answer = `Checking against the Own-Start squad's bank (£${bank.toFixed(1)}m) and ${target.name}'s price (£${(target.price ?? 0).toFixed(1)}m) gives a budget of £${budget.toFixed(1)}m for a same-position (${target.position}) replacement. ` +
          `${affordable.length} eligible ${POS_NAME[target.position]}(s) fit that budget and aren't already in the squad: ` +
          `${affordable.slice(0, 5).map((p) => `${p.name} (£${(p.price ?? 0).toFixed(1)}m, xP ${p.predicted_xp ?? 'n/a'})`).join(', ') || 'none found'}. ` +
          `This checks price and position only -- it does not check per-club ownership limits (max 3 per real-world club) or the free-transfer/hit-cost rules, so confirm those separately before calling a specific swap fully legal.`
        return {
          answer, intent, requestedGameweek: gw, contextStatus: 'GENERAL', sourceTypes,
          sourceBadge: `${citation(model, gw)} • Legal-transfer check`,
          referencedPlayers: affordable.slice(0, 5).map((p, i) => ({
            id: p.stable_player_id, name: p.name, webName: p.name, club: p.club, position: p.position,
            price: p.price ?? 0, priceUnavailable: p.price == null,
            predictedXp: p.predicted_xp ?? 0, xpUnavailable: p.predicted_xp == null,
            actualPoints: null, matchStatus: 'NOT_STARTED',
          })),
          suggestedFollowups: withoutUnsolicitedV0([`Alternatives to ${target.name}`, `Show ${OBJECT_LABELS.OWN_START} GW${gw}`], pageContext, `Show ${OBJECT_LABELS.OWN_START} GW${gw}`),
          generatedAt: new Date().toISOString(), dataSnapshot: 'RESEARCH_ARTIFACT_FINAL_FROZEN_FORECAST',
          llmUsed: false, responseTimeMs: Date.now() - t0,
          researchModel: model, researchGameweek: gw, researchArtifactStatus: ownStartForAlts.status,
        }
      }
      if (altIntent.kind === 'PLAYER') {
        const target = altsPlayers.find((p) => p.name === altIntent.playerName)
        if (!target) return na(`Could not resolve "${altIntent.playerName}".`, gw, model)
        const pool = await fetchFullPool(gw, model, target.position, 30)
        if (pool.status !== 'AVAILABLE') return na(pool.reason || 'Full player pool unavailable.', gw, model, pool.status)
        const others = (pool.players || []).filter((p) => p.stable_player_id !== target.stable_player_id).slice(0, 5)
        const lines = [
          `Alternative ${POS_NAME[target.position]}s to ${target.name} (predicted xP ${target.predicted_xp ?? 'n/a'}, £${(target.price ?? 0).toFixed(1)}m), ranked league-wide by predicted xP:`,
        ]
        for (const p of others) {
          const xpDiff = (p.predicted_xp ?? 0) - (target.predicted_xp ?? 0)
          const priceDiff = (p.price ?? 0) - (target.price ?? 0)
          lines.push(`- ${p.name} (${p.club}) vs ${p.opponent_resolved ?? 'unknown opponent'}${p.was_home === true ? ' (H)' : p.was_home === false ? ' (A)' : ''}: ` +
            `xP ${p.predicted_xp ?? 'n/a'} (${xpDiff >= 0 ? '+' : ''}${xpDiff.toFixed(2)} vs ${target.name}), ` +
            `£${(p.price ?? 0).toFixed(1)}m (${priceDiff >= 0 ? '+' : ''}${priceDiff.toFixed(1)}m)`)
        }
        lines.push('This lists alternative players by forecast only -- it is not a claim that any of these was the model\'s original selection rationale, and it does not check budget/ownership legality (ask for a "legal transfer" check for that).')
        return {
          answer: lines.join('\n'), intent, requestedGameweek: gw, contextStatus: 'GENERAL', sourceTypes,
          sourceBadge: `${citation(model, gw)} • Full pool`,
          referencedPlayers: others.map((p) => ({
            id: p.stable_player_id, name: p.name, webName: p.name, club: p.club, position: p.position,
            price: p.price ?? 0, priceUnavailable: p.price == null,
            predictedXp: p.predicted_xp ?? 0, xpUnavailable: p.predicted_xp == null,
            actualPoints: null, matchStatus: 'NOT_STARTED',
          })),
          suggestedFollowups: withoutUnsolicitedV0([`Why was ${target.name} selected?`, `Show ${OBJECT_LABELS.OWN_START} GW${gw}`], pageContext, `Show ${OBJECT_LABELS.OWN_START} GW${gw}`),
          generatedAt: new Date().toISOString(), dataSnapshot: 'RESEARCH_ARTIFACT_FULL_POOL',
          llmUsed: false, responseTimeMs: Date.now() - t0,
          researchModel: model, researchGameweek: gw, researchArtifactStatus: pool.status,
        }
      }
      if (altIntent.kind === 'XI_OBJECTS' || altIntent.kind === 'AMBIGUOUS') {
        const currentObj = pageContext?.object ?? objectSel
        const otherLabels = (Object.keys(OBJECT_LABELS) as ObjectLabel[]).filter((l) => l !== 'OWN_START' && l !== currentObj)
        const otherResults = await Promise.all(otherLabels.map((l) => fetchObjectData(gw, model, l)))
        const lines: string[] = []
        if (altIntent.kind === 'AMBIGUOUS') {
          lines.push(`"Alternatives" could mean alternative players (e.g. "alternatives to Foden") or alternative lineups for this gameweek -- showing the alternative lineup options since none was named:`)
        } else {
          lines.push(`Alternative lineup options for GW${gw} (besides ${OBJECT_LABELS[currentObj]}):`)
        }
        otherLabels.forEach((label, i) => {
          const r = otherResults[i]
          if (r.status === 'HISTORICAL_RECONSTRUCTION' || r.status === 'FINAL_FROZEN_FORECAST') {
            lines.push(`- ${OBJECT_LABELS[label]}: formation ${formatFormation(r.formation)}, captain ${r.captain ?? 'n/a'}, predicted XI xP ${r.predicted_xi_xp ?? 'n/a'}`)
          }
        })
        if (lines.length === 1) lines.push('No other lineup options are available for this gameweek.')
        return {
          answer: lines.join('\n'), intent, requestedGameweek: gw, contextStatus: 'GENERAL', sourceTypes,
          sourceBadge: `${citation(model, gw)} • Alternative lineups`,
          referencedPlayers: [],
          suggestedFollowups: withoutUnsolicitedV0(otherLabels.slice(0, 2).map((l) => `Show ${OBJECT_LABELS[l]} GW${gw}`), pageContext, `Show ${OBJECT_LABELS.B_LEGAL_BEST_XI} GW${gw}`),
          generatedAt: new Date().toISOString(), dataSnapshot: 'RESEARCH_ARTIFACT_HISTORICAL_RECONSTRUCTION',
          llmUsed: false, responseTimeMs: Date.now() - t0,
          researchModel: model, researchGameweek: gw, researchArtifactStatus: 'AVAILABLE',
        }
      }
    }
  }

  // Position ranking -- "best midfielder", "top 10 midfielders, 10
  // defenders and ten attackers", etc. Supports multiple positions in one
  // message. Prefers the FULL eligible candidate pool (league-wide, not
  // just one decision object's ~11-15 players) when available for this
  // GW/model (currently only the registered final pair); falls back to
  // ranking within the resolved decision object -- clearly labeled as
  // such -- for GW1-3, which never had a full-pool export.
  const positions = matchAllPositions(q)
  if (modelSel !== 'BOTH' && positions.length > 0 && (isRankingQuestion(q) || isNarrowingCorrection(q))) {
    const model = modelSel as ResearchModel
    const count = extractRequestedCount(q)
    const poolResults = await Promise.all(positions.map((pos) => fetchFullPool(gw, model, pos, count)))
    const allAvailable = poolResults.every((r) => r.status === 'AVAILABLE')

    if (allAvailable) {
      const lines: string[] = [`Top ${count} by predicted xP for GW${gw} (full eligible player pool, not just one squad/lineup):`]
      const referencedPlayers: ReferencedPlayer[] = []
      positions.forEach((pos, i) => {
        const r = poolResults[i]
        lines.push(`\n${POS_NAME[pos].toUpperCase()}S (${r.total_matching_filter} eligible):`)
        for (const p of r.players || []) {
          lines.push(`- ${p.name} (${p.club}) vs ${p.opponent_resolved ?? 'unknown opponent'}${p.was_home === true ? ' (H)' : p.was_home === false ? ' (A)' : ''}: ` +
            `xP ${p.predicted_xp ?? 'n/a'}${p.price != null ? `, £${p.price.toFixed(1)}m` : ''}${p.p_start != null ? `, P(start) ${(p.p_start * 100).toFixed(0)}%` : ''}`)
          if (referencedPlayers.length < 15) {
            referencedPlayers.push({
              id: p.stable_player_id, name: p.name, webName: p.name, club: p.club, position: p.position,
              price: p.price ?? 0, priceUnavailable: p.price == null,
              predictedXp: p.predicted_xp ?? 0, xpUnavailable: p.predicted_xp == null,
              actualPoints: null, matchStatus: 'NOT_STARTED',
            })
          }
        }
      })
      if (poolResults.some((r) => (r.total_matching_filter ?? 0) < count)) {
        lines.push(`\n(Fewer than ${count} were eligible for at least one requested position -- the actual eligible count is shown above.)`)
      }
      return {
        answer: lines.join('\n'), intent, requestedGameweek: gw, contextStatus: 'GENERAL', sourceTypes,
        sourceBadge: `${citation(model, gw)} • Full pool`,
        referencedPlayers,
        suggestedFollowups: withoutUnsolicitedV0([`Why was ${poolResults[0].players?.[0]?.name || 'this player'} ranked there?`, `Show ${OBJECT_LABELS.B_LEGAL_BEST_XI} GW${gw}`], pageContext, `Show ${OBJECT_LABELS.B_LEGAL_BEST_XI} GW${gw}`),
        generatedAt: new Date().toISOString(), dataSnapshot: 'RESEARCH_ARTIFACT_FULL_POOL',
        llmUsed: false, responseTimeMs: Date.now() - t0,
        researchModel: model, researchGameweek: gw, researchArtifactStatus: 'AVAILABLE',
      }
    }

    // Fallback: full pool not available for this GW (e.g. GW1-3) -- rank
    // within the resolved decision object instead, explicitly labeled as
    // object-scoped rather than league-wide.
    const objLabel = OBJECT_LABELS[objectSel]
    let candidates: { name: string; position: string; predicted_xp?: number | null; actual_points?: number | null }[] = []
    let sourceStatus = 'NOT_AVAILABLE'
    let reason = `${model} GW${gw} is not available.`
    if (objectSel === 'OWN_START') {
      const resp = await fetchOwnStart(gw, model)
      sourceStatus = resp.status
      reason = resp.reason || reason
      candidates = resp.players || []
    } else {
      const resp = await fetchObjectData(gw, model, objectSel)
      sourceStatus = resp.status
      reason = resp.reason || reason
      candidates = Array.isArray(resp.player_membership) ? resp.player_membership : []
    }
    if (sourceStatus !== 'HISTORICAL_RECONSTRUCTION' && sourceStatus !== 'FINAL_FROZEN_FORECAST') {
      return na(reason, gw, model, sourceStatus)
    }
    const lines: string[] = [`Full league-wide ranking isn't available for GW${gw} (${poolResults.find((r) => r.reason)?.reason || 'no full pool export for this gameweek'}). Ranking instead among the players actually in ${objLabel}:`]
    const referencedPlayers: ReferencedPlayer[] = []
    for (const pos of positions) {
      const inPosition = candidates.filter((p) => p.position === pos)
      const ranked = inPosition.filter((p) => p.predicted_xp !== null && p.predicted_xp !== undefined)
        .sort((a, b) => (b.predicted_xp as number) - (a.predicted_xp as number))
      lines.push(`\n${POS_NAME[pos].toUpperCase()}S:`)
      if (ranked.length === 0) {
        lines.push(inPosition.length === 0 ? `- none present in ${objLabel}.` : `- present but no predicted xP available for this object.`)
      } else {
        for (const p of ranked) {
          lines.push(`- ${p.name}: xP ${p.predicted_xp}`)
          if (referencedPlayers.length < 15) {
            referencedPlayers.push({
              id: -1 - referencedPlayers.length, name: p.name, webName: p.name, club: '', position: pos,
              price: 0, priceUnavailable: true, predictedXp: p.predicted_xp ?? 0, xpUnavailable: p.predicted_xp == null,
              actualPoints: p.actual_points ?? null, matchStatus: 'NOT_STARTED',
            })
          }
        }
      }
    }
    return {
      answer: lines.join('\n'), intent, requestedGameweek: gw, contextStatus: 'GENERAL', sourceTypes,
      sourceBadge: `${citation(model, gw)} • ${objLabel}`,
      referencedPlayers,
      suggestedFollowups: withoutUnsolicitedV0([`Show ${model === 'M3_SHRUNK' ? OBJECT_LABELS.B_LEGAL_BEST_XI : objLabel} GW${gw}`], pageContext, `Show ${objLabel} GW${gw}`),
      generatedAt: new Date().toISOString(), dataSnapshot: 'RESEARCH_ARTIFACT_HISTORICAL_RECONSTRUCTION',
      llmUsed: false, responseTimeMs: Date.now() - t0,
      researchModel: model, researchGameweek: gw, researchArtifactStatus: sourceStatus,
    }
  }

  if (modelSel === 'BOTH' || q.includes('compare') || q.includes(' vs ')) {
    const [m3, v0] = await Promise.all([fetchOwnStart(gw, 'M3_SHRUNK'), fetchOwnStart(gw, 'V0_CONTROL')])
    if (m3.status !== 'HISTORICAL_RECONSTRUCTION' && m3.status !== 'FINAL_FROZEN_FORECAST') {
      return na(m3.reason || `M3_SHRUNK GW${gw} is not available.`, gw, 'M3_SHRUNK', m3.status)
    }
    if (v0.status !== 'HISTORICAL_RECONSTRUCTION' && v0.status !== 'FINAL_FROZEN_FORECAST') {
      return na(v0.reason || `V0_CONTROL GW${gw} is not available.`, gw, 'V0_CONTROL', v0.status)
    }
    const m3Ids = new Set((m3.players || []).map((p) => p.stable_player_id))
    const v0Ids = new Set((v0.players || []).map((p) => p.stable_player_id))
    const onlyM3 = (m3.players || []).filter((p) => !v0Ids.has(p.stable_player_id))
    const onlyV0 = (v0.players || []).filter((p) => !m3Ids.has(p.stable_player_id))

    const lines = [
      lang === 'ku'
        ? `بەراوردی M3_SHRUNK و V0_CONTROL بۆ GW${gw}:`
        : `M3_SHRUNK vs V0_CONTROL for GW${gw}:`,
      `- Net points: M3_SHRUNK=${m3.net_points}, V0_CONTROL=${v0.net_points}`,
      `- Players unique to M3_SHRUNK: ${onlyM3.map((p) => p.name).join(', ') || 'none'}`,
      `- Players unique to V0_CONTROL: ${onlyV0.map((p) => p.name).join(', ') || 'none'}`,
      'This is a historical reconstruction of an already-completed gameweek, not a live or prospective forecast.',
    ]

    return {
      answer: lines.join('\n'),
      intent,
      requestedGameweek: gw,
      contextStatus: 'GENERAL',
      sourceTypes,
      sourceBadge: `${citation('M3_SHRUNK', gw, m3.artifact_version)} vs ${citation('V0_CONTROL', gw, v0.artifact_version)}`,
      referencedPlayers: [...onlyM3, ...onlyV0].map(toReferencedPlayer),
      suggestedFollowups: withoutUnsolicitedV0(
        gw > 1
          ? [`Show Ennovera's GW${gw} forecast`, `What changed between GW${gw - 1} and GW${gw}?`]
          : [`Show Ennovera's GW${gw} forecast`, `Compare M3_SHRUNK and V0_CONTROL for GW${gw + 1}`],
        pageContext, `Show Ennovera's GW${gw} forecast`
      ),
      generatedAt: new Date().toISOString(),
      dataSnapshot: 'RESEARCH_ARTIFACT_HISTORICAL_RECONSTRUCTION',
      llmUsed: false,
      responseTimeMs: Date.now() - t0,
      researchModel: 'M3_SHRUNK',
      researchGameweek: gw,
      researchArtifactVersion: m3.artifact_version,
      researchArtifactStatus: m3.status,
    }
  }

  const model = modelSel

  // Non-Own-Start decision object (Best XI, Blank Slate, Optional XI 1-4 /
  // Primary): answer about THAT object specifically, using the same
  // artifact API the page itself renders from. This is what keeps "why
  // this captain?" on the Best XI tab from silently answering about the
  // AI Manager instead.
  if (objectSel !== 'OWN_START') {
    const objResp = await fetchObjectData(gw, model, objectSel)
    const objLabel = OBJECT_LABELS[objectSel]
    if (objResp.status !== 'HISTORICAL_RECONSTRUCTION' && objResp.status !== 'FINAL_FROZEN_FORECAST') {
      return na(objResp.reason || `${model} GW${gw} ${objLabel} is not available.`, gw, model, objResp.status)
    }
    const membership = Array.isArray(objResp.player_membership) ? objResp.player_membership : null
    const switchedNote = pageContext && pageContext.object !== objectSel
      ? ` (switched from the page's selected ${OBJECT_LABELS[pageContext.object]} because the question named ${objLabel} explicitly)`
      : ''
    const lines: string[] = []
    lines.push(
      lang === 'ku'
        ? `${model} GW${gw} ${objLabel}${switchedNote}:`
        : `${model} GW${gw} ${objLabel}${switchedNote}:`
    )
    if (objResp.captain) lines.push(`- Captain: ${objResp.captain}${objResp.vice ? ` • Vice: ${objResp.vice}` : ''}`)
    if (objResp.formation) lines.push(`- Formation: ${formatFormation(objResp.formation)}`)
    lines.push(`- Predicted XI xP: ${objResp.predicted_xi_xp ?? 'n/a'}`)
    const finalPts = objResp.final_points ?? objResp.corrected_points
    lines.push(objResp.status === 'FINAL_FROZEN_FORECAST'
      ? '- This gameweek has not been played yet -- no final points exist.'
      : `- Final points: ${finalPts ?? 'n/a'}`)
    if (membership) {
      lines.push(`- Players: ${membership.map((p) => p.name).join(', ')}`)
    } else {
      lines.push('- Player selections are not available for this historical decision object (the source export does not include a per-player roster here).')
    }
    if (objResp.note) lines.push(`- ${formatNote(objResp.note)}`)

    const referencedPlayers: ReferencedPlayer[] = membership
      ? membership.slice(0, 6).map((p) => ({
          id: p.stable_player_id ?? -1, name: p.name, webName: p.name, club: '', position: p.position as any,
          price: p.price ?? 0, priceUnavailable: p.price === null || p.price === undefined,
          predictedXp: p.predicted_xp ?? 0, xpUnavailable: p.predicted_xp === null || p.predicted_xp === undefined,
          actualPoints: p.actual_points ?? null,
          matchStatus: p.actual_points !== null && p.actual_points !== undefined ? 'FT' : 'NOT_STARTED',
          isCaptain: p.is_captain ?? (p.name === objResp.captain), isViceCaptain: p.is_vice ?? (p.name === objResp.vice),
        }))
      : []

    return {
      answer: lines.join('\n'),
      intent,
      requestedGameweek: gw,
      contextStatus: 'GENERAL',
      sourceTypes,
      sourceBadge: `${citation(model, gw)} • ${objLabel}`,
      referencedPlayers,
      suggestedFollowups: withoutUnsolicitedV0([`Show GW${gw} AI Manager`, `Compare M3_SHRUNK and V0_CONTROL for GW${gw}`], pageContext, `Show GW${gw} AI Manager`),
      generatedAt: new Date().toISOString(),
      dataSnapshot: 'RESEARCH_ARTIFACT_HISTORICAL_RECONSTRUCTION',
      llmUsed: false,
      responseTimeMs: Date.now() - t0,
      researchModel: model,
      researchGameweek: gw,
      researchArtifactStatus: objResp.status,
    }
  }

  const resp = await fetchOwnStart(gw, model)
  if (resp.status !== 'HISTORICAL_RECONSTRUCTION' && resp.status !== 'FINAL_FROZEN_FORECAST') {
    return na(resp.reason || `${model} GW${gw} is not available.`, gw, model, resp.status)
  }
  const players = resp.players || []
  const mentioned = findMentionedPlayer(question, players)

  let answer: string
  let referencedPlayers: ReferencedPlayer[]

  const isFutureForecast = resp.status === 'FINAL_FROZEN_FORECAST'
  const modelLabel = PUBLIC_MODEL_LABEL[model]

  if (mentioned) {
    // Selection-explanation style answer for one named player. Predeadline
    // factors only (xP, rank among same-position squad members, price) --
    // never uses the post-hoc actual result to explain why a predeadline
    // selection was made. Tense depends on whether this GW has actually
    // been played: a FINAL_FROZEN_FORECAST (future GW) player was
    // "selected in the starting XI", never claimed to have "started" --
    // that verb asserts a real-world event that has not happened yet.
    referencedPlayers = [toReferencedPlayer(mentioned)]
    const roleText = isFutureForecast
      ? (mentioned.role === 'XI' ? 'was selected in the starting XI' : 'was placed on the bench')
      : (mentioned.role === 'XI' ? 'started' : 'was on the bench (did not count)')
    const capText = mentioned.is_captain ? ' as captain' : mentioned.is_vice ? ' as vice-captain' : ''
    const isWhyQuestion = /\bwhy\b|\bselect/.test(q)
    const samePosition = [...players].filter((p) => p.position === mentioned.position).sort((a, b) => b.predicted_xp - a.predicted_xp)
    const squadRank = samePosition.findIndex((p) => p.stable_player_id === mentioned.stable_player_id) + 1
    const priceText = mentioned.price != null ? `£${mentioned.price.toFixed(1)}m` : 'price unavailable'
    if (isWhyQuestion) {
      // League-wide rank via the full candidate pool -- separate from the
      // squad-relative rank above, only shown when the full pool is
      // actually available for this GW/model (currently only the
      // registered final pair; never fabricated for GW1-3).
      let leagueRankText = ''
      const pool = await fetchFullPool(gw, model, mentioned.position, 500)
      if (pool.status === 'AVAILABLE' && pool.players) {
        const leagueIdx = pool.players.findIndex((p) => p.stable_player_id === mentioned.stable_player_id)
        if (leagueIdx >= 0) {
          leagueRankText = `, and #${leagueIdx + 1} of ${pool.total_matching_filter} ${mentioned.position}s league-wide by predicted xP`
        }
      }
      answer =
        `In ${modelLabel} for GW${gw}, ${mentioned.name} ${roleText}${capText}. Predeadline evidence available: predicted xP ${mentioned.predicted_xp} ` +
        `(ranked #${squadRank} of ${samePosition.length} ${mentioned.position}s in this squad by predicted xP${leagueRankText}), price ${priceText}. ` +
        (mentioned.role === 'XI'
          ? `This shows he ranked well on predeadline forecast evidence -- it is not, by itself, the model's full selection rationale (budget/formation tradeoffs), which was not preserved in the exported artifact.`
          : `The detailed selection rationale beyond these predeadline numbers (e.g. exact formation/budget tradeoffs considered) was not preserved in the exported artifact.`)
    } else {
      const actualText = isFutureForecast
        ? ' (this gameweek has not been played yet, so no actual points exist)'
        : (mentioned.actual_points !== null ? `, scoring ${mentioned.actual_points} actual points` : ' (no completed-match result recorded)')
      answer =
        lang === 'ku'
          ? `لە ${modelLabel} بۆ GW${gw} دا، ${mentioned.name} ${roleText}${capText} بە ٪xP پێشبینیکراوی ${mentioned.predicted_xp}${actualText}.`
          : `In ${modelLabel} for GW${gw}, ${mentioned.name} ${roleText}${capText} with a predicted xP of ${mentioned.predicted_xp}${actualText}.`
    }

    if (mentioned.role === 'BENCH') {
      const nearestStarter = [...players]
        .filter((p) => p.role === 'XI' && p.position === mentioned.position)
        .sort((a, b) => a.predicted_xp - b.predicted_xp)[0]
      if (nearestStarter) {
        const nearestVerb = isFutureForecast ? 'selected to start' : 'started'
        answer += lang === 'ku'
          ? ` نزیکترین بژاردەی جێگرەوە لەم پۆزیشنە ${nearestStarter.name} بوو (٪xP=${nearestStarter.predicted_xp}).`
          : ` The nearest alternative in that position ${nearestVerb} was ${nearestStarter.name} (xP=${nearestStarter.predicted_xp}).`
        referencedPlayers.push(toReferencedPlayer(nearestStarter))
      }
    }
  } else {
    const xi = players.filter((p) => p.role === 'XI').sort((a, b) => b.predicted_xp - a.predicted_xp)
    const captain = players.find((p) => p.is_captain)
    const list = xi.slice(0, 5).map((p) => `${p.name} (${p.position}, xP=${p.predicted_xp}${p.actual_points !== null ? `, actual=${p.actual_points}` : ''})`)
    const pointsText = isFutureForecast
      ? 'Actual points are not available yet (this gameweek has not been played).'
      : `Net points: ${resp.net_points ?? 'not available'} (gross ${resp.gross_points ?? 'not available'}).`
    answer =
      lang === 'ku'
        ? `${modelLabel}، GW${gw}: ${isFutureForecast ? 'هێشتا خاڵی ڕاستەقینە بەردەست نییە.' : `کۆی خاڵی نیشتەجێ ${resp.net_points ?? 'نەزانراو'}`}. کاپتن: ${captain?.name || 'نەزانراو'}. باشترین یاریزانان: ${list.join('; ')}.`
        : `${modelLabel} for GW${gw}: ${pointsText} Captain: ${captain?.name || 'unknown'}. Top starters: ${list.join('; ')}.`
    referencedPlayers = xi.slice(0, 5).map(toReferencedPlayer)
  }

  return {
    answer,
    intent,
    requestedGameweek: gw,
    contextStatus: 'GENERAL',
    sourceTypes,
    sourceBadge: citation(model, gw, resp.artifact_version),
    referencedPlayers,
    suggestedFollowups: withoutUnsolicitedV0(
      gw > 1
        ? [`Compare M3_SHRUNK and V0_CONTROL for GW${gw}`, `What changed between GW${gw - 1} and GW${gw}?`]
        : [`Compare M3_SHRUNK and V0_CONTROL for GW${gw}`, `Show GW${gw + 1} forecast`],
      pageContext, `Show GW${gw} Best XI`
    ),
    generatedAt: new Date().toISOString(),
    dataSnapshot: 'RESEARCH_ARTIFACT_HISTORICAL_RECONSTRUCTION',
    llmUsed: false,
    responseTimeMs: Date.now() - t0,
    researchModel: model,
    researchGameweek: gw,
    researchArtifactVersion: resp.artifact_version,
    researchArtifactStatus: resp.status,
  }
}
