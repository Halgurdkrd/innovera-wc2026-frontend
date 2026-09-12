// Grounds Ennovera fantasy-chat answers about the verified M3_SHRUNK / V0_CONTROL
// research artifacts. Runs server-side (called from chatEngine.ts inside the
// /api/fantasy/chat route), so it fetches the backend directly rather than
// through the client-facing /api/research-fpl/* proxy routes.
//
// Every number in every answer comes straight from the fetched artifact --
// retrieval, filtering, ranking, and all arithmetic stay 100% deterministic,
// never delegated to the LLM. naturalize() (below) is the one, narrow,
// optional use of an LLM in this file: given an ALREADY-COMPUTED, fact-
// complete deterministic answer, it may rephrase it more conversationally --
// it is explicitly forbidden (by its own system prompt) from adding,
// removing, or changing any name/number/claim, and any failure/timeout/
// refusal falls back to the deterministic text unchanged. It is never used
// for retrieval, ranking, legality, or arithmetic.

import type { ChatIntent, ConversationTurn, DataSourceType, FantasyChatResponse, ReferencedPlayer } from './types'

export type ResearchModel = 'M3_SHRUNK' | 'V0_CONTROL'

interface OwnStartPlayer {
  stable_player_id: number
  name: string
  web_name?: string | null
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
  // MODEL FORECASTS -- never the official FPL percentage.
  p_start?: number | null
  p_sub?: number | null
  p_dnp?: number | null
  p_appearance?: number | null
  // OFFICIAL FPL AVAILABILITY -- the raw acquisition's own fields, kept
  // structurally separate from the model forecasts above.
  official_chance_of_playing_this_round?: number | null
  official_chance_of_playing_next_round?: number | null
  official_news?: string | null
  official_news_added?: string | null
  official_fpl_status?: string | null
  // SUPPLEMENTAL outlook (see supplemental_outlook.py) -- present only
  // when outlook_is_supplemental is true; never part of the frozen xP.
  likely_range?: [number, number] | null
  upside_score?: number | null
  high_upside_score?: number | null
  prob_10_plus?: number | null
  prob_15_plus?: number | null
  outlook_is_supplemental?: boolean | null
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
  predicted_xi_total_xp?: number | null
}

export type ObjectLabel = 'OWN_START' | 'A_BLANK_SLATE' | 'B_LEGAL_BEST_XI' | 'PRIMARY' | 'OPTIONAL_XI_1' | 'OPTIONAL_XI_2' | 'OPTIONAL_XI_3' | 'OPTIONAL_XI_4'

interface ObjectMember {
  stable_player_id: number | null
  name: string
  web_name?: string | null
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
  // Official FPL short display name (e.g. "B.Fernandes", "Strand Larsen")
  // -- the presentation-layer name users actually recognize. null when no
  // clean official mapping exists (falls back to `name`, the full name,
  // never fabricated or shortened by this app itself).
  web_name?: string | null
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
  // Derived MODEL forecast (p_start + p_sub) -- not an official value.
  p_appearance?: number | null
  expected_minutes: number | null
  // OFFICIAL FPL AVAILABILITY -- the raw acquisition's own fields, kept
  // structurally separate from the model forecast fields above. Missing
  // stays null/undefined, never defaulted to "fully available".
  official_chance_of_playing_this_round?: number | null
  official_chance_of_playing_next_round?: number | null
  official_news?: string | null
  official_news_added?: string | null
  // SUPPLEMENTAL outlook (see supplemental_outlook.py) -- present only
  // when outlook_is_supplemental is true; never part of the frozen xP.
  likely_range?: [number, number] | null
  upside_score?: number | null
  high_upside_score?: number | null
  prob_10_plus?: number | null
  prob_15_plus?: number | null
  prob_20_plus?: number | null
  outlook_is_supplemental?: boolean | null
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

interface PlayerActualsGwRow {
  minutes: number | null
  starts: number | null
  total_points: number | null
  played: boolean | null
  goals_scored: number | null
  assists: number | null
  source: string
}
interface PlayerActualsResponse {
  status: string
  reason?: string
  stable_player_id?: number
  name?: string
  season?: string
  gameweeks?: Record<string, PlayerActualsGwRow>
  missing_gameweeks?: number[]
}
async function fetchPlayerActuals(playerId: number, gameweeks: number[]): Promise<PlayerActualsResponse> {
  const url = `${upstreamBase()}/api/v1/research-fpl/player-actuals?player_id=${playerId}&gameweeks=${gameweeks.join(',')}`
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 4000)
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' })
    clearTimeout(timeoutId)
    if (!res.ok) return { status: 'TEMPORARILY_UNAVAILABLE', reason: `Research API returned HTTP ${res.status}.` }
    return await res.json()
  } catch {
    return { status: 'TEMPORARILY_UNAVAILABLE', reason: 'Research API unreachable.' }
  }
}

// Recognizes a question about ACTUAL past results (minutes/points/starts/
// appearances already recorded in a specific gameweek) -- distinct from,
// and higher precedence than, a selection/forecast question. A real bug
// this fixes: "how many minutes did Larsen play in GW1, 2 and 3?" was
// answered with a GW4 selection summary and forecast xP, because nothing
// in the engine recognized "actual past minutes" as a different kind of
// question from "is he selected/forecast for the upcoming gameweek".
// Deliberately narrow (specific stat words + explicit past-GW evidence)
// so it can never misfire on a genuine forecast/selection question, which
// asks about upcoming expected minutes/points, not recorded ones.
const HISTORICAL_STAT_WORDS = /\bminutes\b|\bpoints\b|\bstart(ed|s)?\b|\bplayed\b|\bappear(ed|ance)?s?\b|\bgoals\b|\bassists\b/i
const ACTUAL_EVIDENCE_WORDS = /\bactual\b|\brecorded\b|\breal\b|\bhow many\b|\bwhich (games?|gameweeks?)\b|\bdid he\b|\bhave they\b/i
// A forecast/selection question ("expected minutes for GW4", "predicted
// points", "will he start") must stay on the forecast path even when it
// shares a stat word with a historical-actuals question -- checked
// wherever a HISTORICAL_STAT_WORDS match alone would otherwise be enough
// (specifically the follow-up-continuation path, which has no explicit
// "actual/recorded/how many" evidence word of its own to lean on). A real
// bug this guards against: "what are Larsen's expected minutes for GW4?"
// asked right after an unrelated historical-actuals exchange was
// mis-treated as a continuation of that exchange purely because it also
// contains the word "minutes".
const FORECAST_EXCLUSION_WORDS = /\bexpected\b|\bpredicted\b|\bforecast\b|\bwill (he|she|they)\b|\bselected\b|\bxp\b/i
function extractExplicitGameweeks(q: string): number[] {
  const found = new Set<number>()
  // Ranges: "gameweeks 1 to 3", "GW1-3"
  const rangeMatches = Array.from(q.matchAll(/\bg(?:ameweeks?|w)s?\s*(\d)\s*(?:-|to|–)\s*(\d)\b/gi))
  for (const m of rangeMatches) {
    const a = parseInt(m[1], 10), b = parseInt(m[2], 10)
    for (let i = Math.min(a, b); i <= Math.max(a, b); i++) found.add(i)
  }
  // Explicit lists: "gameweeks 1, 2 and 3", "GW1, GW2, GW3", bare "gw2"
  const listMatches = Array.from(q.matchAll(/\bgw\s*([1-4])\b/gi))
  for (const m of listMatches) found.add(parseInt(m[1], 10))
  if (found.size === 0) {
    // "gameweeks 1, 2 and 3" without repeating "gw" per number
    const gwListPrefix = q.match(/\bgameweeks?\b([\s,and\d]+)/i)
    if (gwListPrefix) {
      const nums = Array.from(gwListPrefix[1].matchAll(/[1-4]/g)).map((m) => parseInt(m[0], 10))
      nums.forEach((n) => found.add(n))
    }
  }
  return Array.from(found).sort((a, b) => a - b)
}
function isHistoricalStatsQuestion(q: string): boolean {
  const explicitGws = extractExplicitGameweeks(q)
  return explicitGws.length > 0 && HISTORICAL_STAT_WORDS.test(q) && (ACTUAL_EVIDENCE_WORDS.test(q) || /\bhow many\b/i.test(q))
}
type HistoricalStat = 'minutes' | 'points' | 'starts' | 'goals' | 'assists'
function detectRequestedStat(q: string, fallback: HistoricalStat): HistoricalStat {
  if (/\bpoints?\b/i.test(q)) return 'points'
  if (/\bstart(ed|s)?\b/i.test(q)) return 'starts'
  if (/\bgoals?\b/i.test(q)) return 'goals'
  if (/\bassists?\b/i.test(q)) return 'assists'
  if (/\bminutes?\b/i.test(q)) return 'minutes'
  return fallback
}

// Friendly public label -- chat prose must not lead with the internal
// model identifier (M3_SHRUNK/V0_CONTROL); that stays in sourceBadge/
// metadata for anyone who expands technical details.
const PUBLIC_MODEL_LABEL: Record<ResearchModel, string> = {
  M3_SHRUNK: "Ennovera's forecast",
  V0_CONTROL: 'the baseline comparison model',
}
const PUBLIC_MODEL_LABEL_KU: Record<ResearchModel, string> = {
  M3_SHRUNK: 'پێشبینی ئینۆڤێرا',
  V0_CONTROL: 'مۆدێلی بەراوردی بنەڕەت',
}
function publicModelLabel(model: ResearchModel, lang: 'en' | 'ku'): string {
  return lang === 'ku' ? PUBLIC_MODEL_LABEL_KU[model] : PUBLIC_MODEL_LABEL[model]
}

function parseGameweek(q: string, fallback: number): number {
  const m = q.match(/\bgw\s*([1-4])\b/) || q.match(/\bgame\s*[\s-]?\s*week\s*([1-4])\b/)
  return m ? parseInt(m[1], 10) : fallback
}

// Gameweek resolution with conversational stickiness -- an explicit GW in
// the CURRENT message always wins; otherwise, a GW explicitly established
// earlier in THIS conversation (by either party) persists into a later
// bare follow-up, taking precedence over the page's own (unchanged, still
// passive) starting gameweek. A real bug this fixes: page starts on GW3,
// user explicitly asks about "GW4 AI Manager", then asks a bare "why
// Martin Ødegaard?" -- without this, the bare follow-up silently reverted
// to the page's original GW3 (where the full candidate pool required to
// resolve a named player doesn't even exist for the historical
// reconstruction range), instead of staying on the GW4 the conversation
// had already moved to. Falls back to the page context (the initial
// context supplied by the page/tab), then the function's own final
// default, exactly matching the required precedence order.
function lastGwMentionIn(text: string): number | null {
  // The LAST occurrence within one message, not the first -- a reply like
  // "changed between GW3 and GW4" or "GW3=62.16, GW4=60.39" names the
  // gameweek the conversation is now newly focused on LAST, and a plain
  // first-match regex was picking up the earlier, now-superseded GW3
  // mention instead, defeating stickiness entirely.
  const matches = Array.from(text.matchAll(/\bgw\s*([1-4])\b|\bgame\s*[\s-]?\s*week\s*([1-4])\b/gi))
  if (matches.length === 0) return null
  const last = matches[matches.length - 1]
  return parseInt(last[1] || last[2], 10)
}
// Returns null (rather than an arbitrary hardcoded default) when neither
// the current message, conversation history, nor an explicit page context
// name a gameweek -- the caller resolves that case via
// resolveEffectiveGameweek, which asks the backend for the latest
// REGISTERED gameweek instead of silently defaulting to a stale constant.
function parseGameweekSticky(q: string, pageContextGw: number | undefined, history: ConversationTurn[]): number | null {
  const current = lastGwMentionIn(q)
  if (current != null) return current
  for (let i = history.length - 1; i >= 0; i--) {
    const m = lastGwMentionIn(history[i].content)
    if (m != null) return m
  }
  return pageContextGw ?? null
}

// Backend's own notion of "latest registered forecast" (the same field
// the Fantasy page itself uses to choose its default gameweek) -- used
// ONLY as the last-resort fallback, when a page supplies no context at
// all (e.g. the homepage's shared assistant) and the conversation itself
// never named a gameweek. Never used to override an explicit or sticky
// gameweek that was already resolved.
let _latestGwCache: { value: number; fetchedAtMs: number } | null = null
async function fetchLatestRegisteredGameweek(): Promise<number | null> {
  if (_latestGwCache && Date.now() - _latestGwCache.fetchedAtMs < 60000) return _latestGwCache.value
  const url = `${upstreamBase()}/api/v1/research-fpl/status`
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' })
    clearTimeout(timeoutId)
    if (!res.ok) return null
    const data = await res.json()
    if (typeof data.final_pair_gameweek !== 'number') return null
    _latestGwCache = { value: data.final_pair_gameweek, fetchedAtMs: Date.now() }
    return data.final_pair_gameweek
  } catch {
    return null
  }
}

// The single entry point for resolving "which gameweek is this question
// about" -- explicit mention > conversational stickiness > page context >
// latest registered forecast (fetched live, never a hardcoded constant)
// > 3 (only if the backend itself is unreachable). Matches the required
// precedence: a fantasy question with no explicit context anywhere (e.g.
// asked from the homepage's shared assistant, which supplies no
// pageContext at all) must use the latest registered forecast, not an
// old GW2/GW3 snapshot.
async function resolveEffectiveGameweek(q: string, pageContextGw: number | undefined, history: ConversationTurn[]): Promise<number> {
  const sticky = parseGameweekSticky(q, pageContextGw, history)
  if (sticky != null) return sticky
  const latest = await fetchLatestRegisteredGameweek()
  return latest ?? 3
}

// "top 10" / "ten" / bare "top" (defaults to 5) -- deterministic, never
// asks the LLM to count.
const WORD_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  // Sorani number words (یەک=1 ... دە=10).
  'یەک': 1, 'دوو': 2, 'سێ': 3, 'چوار': 4, 'پێنج': 5, 'شەش': 6, 'حەوت': 7, 'هەشت': 8, 'نۆ': 9, 'دە': 10,
}
function extractRequestedCount(q: string): number {
  const digit = q.match(/\btop\s*(\d{1,2})\b/) || q.match(/\b(\d{1,2})\s+(?:midfielders?|defenders?|forwards?|attackers?|strikers?|goalkeepers?|players?|mids?|defs?|fwds?|gks?|diffeders?|atatckers?)\b/)
  if (digit) return Math.min(50, Math.max(1, parseInt(digit[1], 10)))
  // \b is defined over ASCII word characters only -- it does not detect a
  // boundary around Arabic-script text (Kurdish letters aren't \w), so
  // Sorani number words are matched by whitespace-split containment
  // instead of a \b-anchored regex.
  const qWords = q.split(/\s+/)
  for (const [word, n] of Object.entries(WORD_NUMBERS)) {
    if (/^[a-z]+$/.test(word) ? new RegExp(`\\b${word}\\b`).test(q) : qWords.includes(word)) return n
  }
  return 5
}

// A short correction phrase narrowing an earlier broader request ("I said
// midfielders, not all players", "no, midfielders only", "just
// defenders") -- detected so the answer never falls back to a generic
// summary when the user is explicitly re-scoping a position request.
function isNarrowingCorrection(q: string): boolean {
  // نەخێر = "no", تەنها = "only", نەک = "not" -- found missing via a
  // Sorani multi-turn-correction test ("نەخێر، تەنها ناوەڕاست", "no, only
  // midfield") that fell through to the generic manager summary despite
  // matchAllPositions correctly detecting MID -- the position-ranking
  // branch's OTHER condition (isRankingQuestion) also wasn't met since
  // no "best/top" word was present, so neither half of the OR fired.
  return /\bnot\s+all\b|\bi\s+said\b|^no[,]?\s|\bonly\b|^just\b/.test(q)
    || q.includes('نەخێر') || q.includes('تەنها') || q.includes('نەک')
}

// "why is Haaland's average 8 but upside higher" / "average vs range" /
// "what's the difference between mean and upside" style questions --
// distinct from a plain "why selected" question, this asks about the
// STATISTICAL relationship between the mean forecast and the supplemental
// outlook, not about squad selection.
function isAverageVsUpsideQuestion(q: string): boolean {
  // تێکڕا/مامناوەند = average/mean; بەرزبوونەوە/بەرزایی/مەودا = upside/range
  // -- required Sorani acceptance phrase: "جیاوازی نێوان تێکڕا و
  // بەرزبوونەوە چیە؟" ("what is the difference between average and upside?").
  const hasAverageWord = /\baverage\b|\bmean\b/.test(q) || q.includes('تێکڕا') || q.includes('مامناوەند')
  const hasUpsideWord = /\bupside\b|\brange\b|\bhigher\b|\bp80\b|\bp90\b|\bpercentile\b/.test(q) || q.includes('بەرزبوونەوە') || q.includes('بەرزایی') || q.includes('مەودا')
  return hasAverageWord && hasUpsideWord
}

const NATURALIZE_SYSTEM_PROMPT_EN =
  'You rephrase an already-correct, fact-complete answer about a fantasy football forecast to sound more natural and ' +
  'conversational. You are NOT answering the question yourself and you have no other knowledge of football, players, ' +
  'or this product. Rules, no exceptions: (1) Never add a name, number, team, statistic, or claim that is not already ' +
  'present in the FACTS. (2) Never remove a number or caveat that is present in the FACTS -- especially phrases like ' +
  '"not available", "supplemental", "not part of the original frozen forecast", or any percentage/xP/price value. ' +
  '(3) Never invent a reason, cause, or explanation (e.g. budget or formation reasoning) that is not literally stated ' +
  'in the FACTS. (4) Keep it to 2-4 short sentences. (5) If you cannot rephrase it faithfully, reply with exactly the ' +
  'original FACTS text unchanged. Respond in English only.'

const NATURALIZE_SYSTEM_PROMPT_KU =
  'تۆ وەڵامێکی ڕاست و تەواو دەربارەی پێشبینی یاری فەنتازی دەگۆڕیت بۆ زمانێکی سروشتیتر و گفتوگۆیی بە کوردیی سۆرانی. تۆ ' +
  'وەڵامی پرسیارەکە بە شێوەیەکی سەربەخۆ ناکەیتەوە و هیچ زانیارییەکی تر دەربارەی تۆپی پێ یان ئەم بەرهەمە نیت. یاساکان، ' +
  'بەبێputیش: (١) هەرگیز ناوێک، ژمارەیەک، تیمێک، ئامارێک یان بانگەشەیەک زیاد مەکە کە لە زانیارییەکاندا (FACTS) نییە. ' +
  '(٢) هەرگیز ژمارە یان ئاگادارییەک لاماکە کە لە زانیارییەکاندا هەیە -- بە تایبەت وشەکانی وەک "بەردەست نییە"، "تەواوکەر"، ' +
  'یان هەر ڕێژەیەک/xP/نرخ. (٣) هەرگیز هۆکارێک مەربنووسە کە لە زانیارییەکاندا ڕاستەوخۆ نەهاتووە. (٤) وەڵامەکە کورت بێت ' +
  '(٢-٤ ڕستە). (٥) ئەگەر نەتوانیت بە دڵنیاییەوە بیگۆڕیت، دەقی FACTS بە بێ گۆڕانکاری بگەڕێنەوە. تەنها بە کوردیی سۆرانی وەڵام بدەوە.'

// Extracts every number (integer or decimal) from a string -- used to
// verify the LLM's rephrasing didn't drop, add, or change a number.
function extractNumbers(text: string): string[] {
  return (text.match(/\d+(?:\.\d+)?/g) || []).map((n) => n.replace(/^0+(?=\d)/, ''))
}

// Real, structural fact-preservation validation -- NOT relying on the
// system prompt's own instructions alone to guarantee consistency (an
// instruction can be ignored or partially followed). Compares the
// rephrased text's numbers against the original facts' numbers (every
// number in the original must still appear somewhere in the rephrasing;
// extra numbers are also rejected, since that would mean the model added
// a figure not present in the source) and confirms a short list of
// required keywords/names (e.g. a player's name) are still present
// verbatim. Returns false -- meaning "fall back to the verified text" --
// on any mismatch, never applies a "partial credit" allowance.
export function validateFactPreservation(original: string, rephrased: string, requiredVerbatim: string[]): boolean {
  const origNums = extractNumbers(original).sort()
  const newNums = extractNumbers(rephrased).sort()
  if (origNums.length !== newNums.length) return false
  for (let i = 0; i < origNums.length; i++) {
    if (origNums[i] !== newNums[i]) return false
  }
  for (const req of requiredVerbatim) {
    if (req && !rephrased.includes(req)) return false
  }
  // A negation ("not", "no", "never", "نییە", "نەک") present in the
  // original must not be silently dropped -- catches the model
  // "resolving" an uncertainty/caveat into a false certainty.
  const origHasNegation = /\bnot\b|\bno\b|\bnever\b|نییە|نەک|هیچ/.test(original.toLowerCase())
  const newHasNegation = /\bnot\b|\bno\b|\bnever\b|نییە|نەک|هیچ/.test(rephrased.toLowerCase())
  if (origHasNegation && !newHasNegation) return false
  return true
}

// The ONE narrow, optional use of an LLM in this file -- given an already-
// computed, fact-complete deterministic answer, asks the existing Groq
// provider to rephrase it more naturally. Bounded timeout; any failure,
// timeout, empty response, an obviously-truncated reply, OR a failed
// post-hoc fact-preservation check (numbers/required names/negations
// must all survive verbatim -- the system prompt's own instructions are
// not treated as sufficient guarantee on their own) falls back to the
// original deterministic text unchanged. Never used for retrieval,
// ranking, legality, or arithmetic -- purely cosmetic phrasing of facts
// already fully determined before this is called.
async function naturalize(factsText: string, lang: 'en' | 'ku', requiredVerbatim: string[] = []): Promise<string> {
  const groqKey = process.env.GROQ_API_KEY
  if (!groqKey || !groqKey.trim()) return factsText
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 4000)
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: lang === 'ku' ? NATURALIZE_SYSTEM_PROMPT_KU : NATURALIZE_SYSTEM_PROMPT_EN },
          { role: 'user', content: `FACTS:\n${factsText}` },
        ],
        temperature: 0.2,
        max_tokens: 300,
      }),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (!res.ok) return factsText
    const data = await res.json()
    const rephrased = data.choices?.[0]?.message?.content?.trim()
    if (!rephrased || rephrased.length <= 10) return factsText
    if (!validateFactPreservation(factsText, rephrased, requiredVerbatim)) return factsText
    return rephrased
  } catch {
    return factsText
  }
}

type Position = 'GK' | 'DEF' | 'MID' | 'FWD'

// Every DISTINCT position mentioned, in first-mention order -- supports
// "top 10 midfielders, 10 defenders and ten attackers" in one message.
// Includes the required shorthand (md/mid, def, fwd) and the specific
// misspellings observed in real user messages (diffeders, atatckers),
// plus a few common variants; this is pattern-based typo tolerance for
// known shapes, not a general spellchecker/fuzzy-match.
// Sorani football position words -- confirmed against the acceptance test
// "باشترین دە هێرشبەر..." for FWD (هێرشبەر). DEF/GK are common, reasonably
// confident Sorani football vocabulary; MID (ناوەڕاست, literally "middle")
// is the least certain of the four -- no Sorani test phrase exercises it,
// so its translation quality has not been independently verified.
const KURDISH_POSITION_WORDS: [Position, string[]][] = [
  ['FWD', ['هێرشبەر']],
  ['DEF', ['بەرگریکار', 'بەرگری']],
  ['GK', ['دەروازەوان']],
  ['MID', ['ناوەڕاست']],
]
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
  for (const [pos, words] of KURDISH_POSITION_WORDS) {
    if (!found.includes(pos) && words.some((w) => q.includes(w))) found.push(pos)
  }
  return found
}

// Is this a ranking-style question at all ("best"/"top"/"highest"/"good
// choices"), independent of which/how-many positions it names? Split out
// from matchAllPositions so a bare position mention with no ranking intent
// (e.g. "tell me about defenders" as part of a different question) doesn't
// misfire into the ranking branch.
function isRankingQuestion(q: string): boolean {
  return /\bbest\b|\bhighest\b|\btop\b|\bgood\s+choices?\b/.test(q) || q.includes('باشترین') || q.includes('بەرزترین')
}

type AlternativesIntent =
  | { kind: 'PLAYER'; playerName: string; stablePlayerId: number }
  | { kind: 'XI_OBJECTS' }
  | { kind: 'AMBIGUOUS' }
  | { kind: 'AMBIGUOUS_PLAYER'; candidateNames: string[] }

// Distinguishes three different things a user might mean by "alternatives"
// -- (A) alternative individual players, (B) the site's stored Optional-XI
// lineup objects, (C) a legally affordable transfer under budget/ownership
// constraints (handled separately at the call site, not here, since it
// needs the Own-Start squad/bank, not just text). Returns null if the
// question isn't an alternatives-style question at all. `pool` should be
// the FULL eligible candidate pool (not just one object's own roster) --
// "if I change Isak, what are the best alternatives?" must resolve Isak
// even when he isn't a member of whichever object happens to be the
// current page tab or the AI Manager squad.
function detectAlternativesQuery<T extends NamedEntity>(q: string, pool: T[]): AlternativesIntent | null {
  // \baltern\w*tiv\w*\b tolerates the common letter-order/vowel-swap typos
  // seen in real messages (e.g. "alternetives") without hardcoding every
  // individual misspelling -- "altern" + anything + "tiv" + anything is
  // distinctive enough not to false-positive on unrelated words.
  // جێگر = the Sorani stem for "substitute/replacement" -- matches both
  // "جێگرەوە" ("substitute", the acceptance test "جێگرەوەکانی کێن؟") and
  // "جێگرەکان" ("the alternatives", plural/definite -- found missing via
  // paraphrase testing: "ئەگەر ئیساک بگۆڕم باشترین جێگرەکان چین؟" fell
  // through to a generic explanation instead of the alternatives branch
  // because the exact suffix "ەوە" wasn't present in this inflection).
  const mentionsAlternative = /\baltern\w*tiv\w*\b/.test(q) || /\bsubstitutes?\s+for\b|\binstead\s+of\b/.test(q) || q.includes('جێگر')
  if (!mentionsAlternative) return null
  // "alternative(s) to/for <player name>" -- checked BEFORE the bare
  // team/squad wording below, since a real player name always wins over a
  // generic "team" match (a name is stronger, more specific evidence).
  const mention = resolvePlayerMention(q, pool)
  if (mention.kind === 'FOUND') return { kind: 'PLAYER', playerName: mention.player.name, stablePlayerId: mention.player.stable_player_id }
  if (mention.kind === 'AMBIGUOUS') return { kind: 'AMBIGUOUS_PLAYER', candidateNames: mention.candidates.map((c) => c.name) }
  // "alternative team(s)/squad(s)/xi(s)/lineup(s)" -> the stored Optional-XI objects.
  if (/\baltern\w*tiv\w*\s*(to|for)?\s*(the\s+)?(team|squad|xi|lineup|line[\s-]?up)s?\b/.test(q)) {
    return { kind: 'XI_OBJECTS' }
  }
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
    webName: p.web_name ?? p.name,
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

// Kurdish (Sorani) uses several Arabic-script letters not present in
// standard Arabic (پ چ ژ ڵ ڕ گ ڤ ە) -- their presence is a strong, cheap
// signal this text is Kurdish, not Arabic, without needing a full
// language-ID model. This is a heuristic, not a linguistic guarantee: pure
// Arabic-script text using ONLY letters shared with Arabic (e.g. a short
// message using common words) cannot be distinguished from Arabic by this
// check alone -- since this product supports no Arabic UI/chat at all,
// defaulting any Arabic-script input to Kurdish in that ambiguous case is
// the correct choice for this product, not a claim that the heuristic
// itself can tell the two languages apart in general.
const KURDISH_SPECIFIC_CHARS = /[پچژڵڕگڤە]/
const ARABIC_SCRIPT = /[؀-ۿ]/
function isSoraniScript(text: string): boolean {
  return ARABIC_SCRIPT.test(text)
}

// Normalizes the handful of letter variants Kurdish/Arabic typists mix up
// interchangeably (Arabic ي vs Kurdish ی, Arabic ك vs Kurdish ک, plus the
// standalone/final hamza forms of alef) so matching doesn't silently fail
// over a keyboard-layout difference. Comparison-only -- never mutates what
// is shown back to the user or any stable player identity.
function normalizeKurdishArabic(text: string): string {
  return text
    .replace(/[يی]/g, 'ی') // ي/ی -> ی (Kurdish yeh)
    .replace(/[ك]/g, 'ک') // ك -> ک (Kurdish kaf)
    .replace(/[آأإ]/g, 'ا') // أ/إ/آ -> ا
}

// Best-effort phonetic transliteration from Arabic-script Kurdish into a
// rough Latin consonant skeleton, for matching a Kurdish-written player
// name (e.g. "فۆدن") against the Latin source name ("Foden") when no
// Kurdish name dictionary exists. This is a heuristic approximation, not a
// verified transliteration table -- it will not correctly match every
// name, particularly ones with sounds Kurdish script represents ambiguously.
const KURDISH_TO_LATIN: Record<string, string> = {
  'ا': '', 'ب': 'b', 'پ': 'p', 'ت': 't', 'ج': 'j', 'چ': 'c',
  'ح': 'h', 'خ': 'x', 'د': 'd', 'ر': 'r', 'ڕ': 'r', 'ز': 'z',
  'ژ': 'j', 'س': 's', 'ش': 's', 'ع': '', 'غ': 'g', 'ف': 'f',
  'ڤ': 'v', 'ق': 'q', 'ک': 'k', 'گ': 'g', 'ل': 'l', 'ڵ': 'l',
  'م': 'm', 'ن': 'n', 'و': 'w', 'ۆ': 'o', 'ه': 'h', 'ە': 'e',
  'ی': 'y', 'ێ': 'i',
}
function transliterateToLatinSkeleton(text: string): string {
  const normalized = normalizeKurdishArabic(text)
  let out = ''
  for (const ch of normalized) {
    out += KURDISH_TO_LATIN[ch] ?? ''
  }
  // Consonant skeleton: drop vowel-ish letters so e.g. "foden"/"fodn" both
  // reduce to "fdn", tolerant of exactly which vowel Kurdish script implied.
  return out.replace(/[aeiouwy]/g, '')
}

// A handful of explicitly VERIFIED Kurdish transliteration aliases --
// checked before the heuristic skeleton matcher, since an exact known
// alias is real evidence, not a guess. Not a comprehensive dictionary
// (building one for all 494 GW4 candidates is future work); extend as
// more are confirmed.
const KNOWN_KURDISH_ALIASES: Record<string, string> = {
  'هالاند': 'Haaland',
  'فۆدن': 'Foden',
  // Isak's transliterated skeleton ("سک"/"sk") is only 2 characters --
  // below the 3-char minimum the heuristic fallback requires to avoid
  // short-token false collisions (see resolvePlayerMention) -- so he can
  // never resolve through that path alone. Added as a verified exact
  // alias instead, per the explicit named-player support requirement.
  'ئیساک': 'Isak',
  'ساکا': 'Saka',
  'برونۆ': 'Bruno Fernandes',
  'بڕۆنۆ': 'Bruno Fernandes',
}

interface NamedEntity {
  stable_player_id: number
  name: string
}

export type PlayerMentionResult<T extends NamedEntity = OwnStartPlayer> =
  | { kind: 'FOUND'; player: T }
  | { kind: 'AMBIGUOUS'; candidates: T[] }
  | { kind: 'NONE' }

// Resolves a player mention to a stable ID (via the matched entity, which
// always carries stable_player_id/name -- OwnStartPlayer, ObjectMember-like
// records, and FullPoolPlayer all satisfy this shape), preferring exact
// Latin substring matches and known aliases over the heuristic consonant-
// skeleton matcher, and explicitly reporting a COLLISION (multiple
// distinct players sharing the same matched skeleton) as ambiguous
// rather than silently picking the first one found. Generic so the SAME
// resolution logic (and its collision detection) is used whether matching
// against one decision object's ~15 players or the full ~500-player pool
// -- named-player questions must be resolvable regardless of which object
// happens to be the current page tab.
// Diacritic/special-letter normalization for matching only -- the ORIGINAL
// name is always what's returned/displayed (via the matched player object
// itself), never this normalized form. NFKD + combining-mark stripping
// handles ordinary accents (é, ü, ñ, ç); the explicit map covers the
// Latin letters that decomposition does NOT reduce to a plain letter+mark
// (Ø, Å, Æ, ß are their own code points, not "O with a diacritic").
const SPECIAL_LETTER_MAP: Record<string, string> = { 'ø': 'o', 'å': 'a', 'æ': 'ae', 'ß': 'ss', 'đ': 'd', 'ł': 'l' }
function normalizeForMatch(s: string): string {
  const lower = s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  return lower.replace(/[øåæßđł]/g, (c) => SPECIAL_LETTER_MAP[c] ?? c).trim()
}

// True only if `needle` appears in `haystack` as a whole word (Unicode-
// letter/digit-aware boundaries) -- NOT bare substring containment. A real
// bug this fixes: "why Martin Ødegaard is good CHOICE" matched a player
// named "Mohamed-Ali Cho" purely because the English word "choice"
// contains "cho" as a substring, with no word boundary check at all.
function isWordChar(ch: string | undefined): boolean {
  if (!ch) return false
  if (/[0-9]/.test(ch)) return true
  // Any cased Unicode letter (Latin incl. Ø/Å/é/etc.) differs between its
  // lower/upper forms -- avoids needing the regex \p{L} Unicode property
  // escape, which requires the 'u' flag (unavailable at this project's
  // configured TS compile target).
  return ch.toLowerCase() !== ch.toUpperCase()
}
function wordBoundaryIncludes(haystack: string, needle: string): boolean {
  if (!needle) return false
  let idx = haystack.indexOf(needle)
  while (idx !== -1) {
    if (!isWordChar(haystack[idx - 1]) && !isWordChar(haystack[idx + needle.length])) return true
    idx = haystack.indexOf(needle, idx + 1)
  }
  return false
}

// Matching precedence (weakest evidence only ever used when everything
// stronger is silent): (1) exact normalized FULL name as a whole phrase --
// "Martin Ødegaard" typed in full must resolve directly to him, never
// become ambiguous merely because another player also happens to share
// his first name ("Martin Dubravka"); (2) a single distinctive surname
// (>=4 letters, to avoid short/common-word collisions) as a whole word;
// (3) verified Kurdish aliases; (4) a constrained Sorani phonetic-skeleton
// fallback, exact-equality only. Ordinary words ("choice", "good", "best")
// can never match at any tier because every tier requires a real word-
// boundary match against an actual (multi-letter) name token, not a raw
// substring. Collisions at any tier are reported AMBIGUOUS, never guessed.
function resolvePlayerMention<T extends NamedEntity>(question: string, players: T[]): PlayerMentionResult<T> {
  const qNorm = normalizeForMatch(question)

  // Precedence 1: exact normalized full name, present verbatim as a phrase.
  const fullNameMatches = players.filter((p) => wordBoundaryIncludes(qNorm, normalizeForMatch(p.name)))
  if (fullNameMatches.length > 0) {
    const distinctIds = new Set(fullNameMatches.map((p) => p.stable_player_id))
    if (distinctIds.size === 1) return { kind: 'FOUND', player: fullNameMatches[0] }
    return { kind: 'AMBIGUOUS', candidates: fullNameMatches }
  }

  // Precedence 2: one distinctive name part (surname, or any sufficiently
  // long name token) present as a whole word -- e.g. bare "Foden" or "Isak".
  const surnameMatches = players.filter((p) => {
    const parts = normalizeForMatch(p.name).split(/\s+/).filter((w) => w.length >= 4)
    return parts.some((part) => wordBoundaryIncludes(qNorm, part))
  })
  if (surnameMatches.length > 0) {
    const distinctIds = new Set(surnameMatches.map((p) => p.stable_player_id))
    if (distinctIds.size === 1) return { kind: 'FOUND', player: surnameMatches[0] }
    return { kind: 'AMBIGUOUS', candidates: surnameMatches }
  }

  if (!isSoraniScript(question)) return { kind: 'NONE' }
  const q = question.toLowerCase()

  // Precedence 3: known-alias check (exact, verified) before the heuristic fallback.
  for (const [alias, englishFragment] of Object.entries(KNOWN_KURDISH_ALIASES)) {
    if (q.includes(alias)) {
      const matches = players.filter((p) => p.name.toLowerCase().includes(englishFragment.toLowerCase()))
      if (matches.length === 1) return { kind: 'FOUND', player: matches[0] }
      if (matches.length > 1) return { kind: 'AMBIGUOUS', candidates: matches }
    }
  }

  // Precedence 4: heuristic phonetic transliteration fallback (e.g.
  // "فۆدن" for "Foden" when no known alias/full name matched) -- NOT
  // relied on alone: any skeleton collision across multiple distinct
  // players is reported as ambiguous rather than picking whichever
  // happens to be first in the array. EXACT skeleton equality only --
  // NOT ".includes()" substring containment, which was a confirmed real
  // bug (a common Kurdish word's transliterated skeleton was a substring
  // of unrelated players' skeletons purely by coincidence).
  const tokens = question.split(/\s+/).map(transliterateToLatinSkeleton).filter((t) => t.length >= 3)
  if (tokens.length === 0) return { kind: 'NONE' }
  const skeletonMatches = players.filter((p) => {
    const nameParts = p.name.toLowerCase().split(/\s+/).filter((w) => w.length > 2)
    const nameSkeletons = nameParts.map((w) => w.replace(/[aeiouwy]/g, ''))
    return tokens.some((t) => nameSkeletons.some((ns) => ns.length >= 3 && ns === t))
  })
  const distinctSkeletonIds = new Set(skeletonMatches.map((p) => p.stable_player_id))
  if (distinctSkeletonIds.size === 1) return { kind: 'FOUND', player: skeletonMatches[0] }
  if (distinctSkeletonIds.size > 1) return { kind: 'AMBIGUOUS', candidates: skeletonMatches }
  return { kind: 'NONE' }
}

// Collects EVERY distinctly-named player mentioned in a question --
// unlike resolvePlayerMention (which reports 2+ matches as an unresolved
// AMBIGUOUS collision), a comparison question ("compare Saka and Palmer")
// is SUPPOSED to name multiple real players, so finding several distinct
// matches here is success, not ambiguity. Uses the same precedence as
// resolvePlayerMention (exact full name first; distinctive name-part
// second, only when no full name matched at all) so an ordinary word
// still can never accidentally match (same word-boundary + normalization
// guarantees).
function findAllDistinctPlayerMentions<T extends NamedEntity & { predicted_xp?: number | null }>(question: string, players: T[]): T[] {
  const qNorm = normalizeForMatch(question)
  const byId = new Map<number, T>()
  for (const p of players) {
    if (wordBoundaryIncludes(qNorm, normalizeForMatch(p.name))) byId.set(p.stable_player_id, p)
  }
  if (byId.size === 0) {
    // Surname-tier fallback: group by the SPECIFIC matched token first --
    // a real bug this fixes: "compare Saka and Palmer" pulled in a third,
    // irrelevant player (a backup goalkeeper also surnamed Palmer)
    // alongside the two clearly-intended players, because every player
    // sharing that surname was collected with no way to prefer the
    // relevant one. When one token matches multiple distinct players,
    // keeps only the highest predicted-xP match for that token (the
    // most likely one a user comparing real candidates means), rather
        // than silently including every same-surname player found.
    const byToken = new Map<string, T[]>()
    for (const p of players) {
      const parts = normalizeForMatch(p.name).split(/\s+/).filter((w) => w.length >= 4)
      for (const part of parts) {
        if (wordBoundaryIncludes(qNorm, part)) {
          const list = byToken.get(part) ?? []
          list.push(p)
          byToken.set(part, list)
        }
      }
    }
    Array.from(byToken.values()).forEach((matches) => {
      const best = matches.reduce((a: T, b: T) => ((b.predicted_xp ?? -Infinity) > (a.predicted_xp ?? -Infinity) ? b : a))
      byId.set(best.stable_player_id, best)
    })
  }
  // Sorani fallback (known aliases, then phonetic-skeleton tokens) -- only
  // when no Latin match was found at all, mirroring resolvePlayerMention's
  // own precedence. Each Kurdish token is resolved independently and any
  // per-token collision is reduced the same way as the surname tier above
  // (highest predicted xP), so "compare Ronaldo-ish players" style
  // ambiguity never silently pulls in every same-skeleton player.
  if (byId.size === 0 && isSoraniScript(question)) {
    for (const [alias, englishFragment] of Object.entries(KNOWN_KURDISH_ALIASES)) {
      if (question.toLowerCase().includes(alias)) {
        const matches = players.filter((p) => p.name.toLowerCase().includes(englishFragment.toLowerCase()))
        if (matches.length > 0) {
          const best = matches.reduce((a, b) => ((b.predicted_xp ?? -Infinity) > (a.predicted_xp ?? -Infinity) ? b : a))
          byId.set(best.stable_player_id, best)
        }
      }
    }
    const tokens = question.split(/\s+/).map(transliterateToLatinSkeleton).filter((t) => t.length >= 3)
    for (const t of tokens) {
      const matches = players.filter((p) => {
        const nameParts = p.name.toLowerCase().split(/\s+/).filter((w) => w.length > 2)
        return nameParts.some((w) => w.replace(/[aeiouwy]/g, '') === t)
      })
      if (matches.length > 0) {
        const best = matches.reduce((a, b) => ((b.predicted_xp ?? -Infinity) > (a.predicted_xp ?? -Infinity) ? b : a))
        byId.set(best.stable_player_id, best)
      }
    }
  }
  return Array.from(byId.values())
}

// Explicitly separates "Official FPL availability" (the raw acquisition's
// own status/chance/news, e.g. Gakpo's 75%) from the model's OWN P(start)
// forecast -- never presents one as the other, and never claims a missing
// official percentage means "fully available". Answers questions like "is
// Gakpo's 75% official or predicted by Ennovera?" directly and correctly.
function isAvailabilityQuestion(q: string): boolean {
  return /\bavailab|\bchance\b|\bofficial\b|\binjur|\bfit(ness)?\b|\bdoubt/.test(q) || q.includes('ڕێژە') || q.includes('چانس') || q.includes('بەردەستبوون') || q.includes('فەرمی')
}

function availabilityClause(p: { p_start?: number | null; official_chance_of_playing_this_round?: number | null; official_chance_of_playing_next_round?: number | null; official_news?: string | null }, lang: 'en' | 'ku', force = false): string {
  const officialPct = p.official_chance_of_playing_next_round ?? p.official_chance_of_playing_this_round
  if (officialPct == null && p.p_start == null) return ''
  if (officialPct == null && !force) return ''
  const modelPct = p.p_start != null ? `${Math.round(p.p_start * 100)}%` : null
  if (officialPct != null && modelPct != null) {
    return lang === 'ku'
      ? ` Official FPL availability (ڕێژەی فەرمی FPL) ${officialPct}%${p.official_news ? ` (${p.official_news})` : ''} یە -- ئەمە جیاوازە لە Model P(start) (پێشبینی مۆدێل) کە ${modelPct}ـە؛ مۆدێل ڕاستەوخۆ ڕێژەی فەرمی وەرناگرێت، بەڵکو خۆی ژمارە دەردەکات.`
      : ` Official FPL availability is ${officialPct}%${p.official_news ? ` (${p.official_news})` : ''} -- this is separate from Ennovera's own Model P(start) forecast of ${modelPct}, which is not a direct copy of the official percentage.`
  }
  if (officialPct != null) {
    return lang === 'ku'
      ? ` Official FPL availability (ڕێژەی فەرمی) ${officialPct}%ـە${p.official_news ? ` (${p.official_news})` : ''}.`
      : ` Official FPL availability is ${officialPct}%${p.official_news ? ` (${p.official_news})` : ''}.`
  }
  return lang === 'ku'
    ? ` Model P(start) (پێشبینی مۆدێل) ${modelPct}ـە؛ ڕێژەی فەرمی FPL بۆ ئەم یاریزانە بەردەست نییە.`
    : ` Model P(start) is ${modelPct}; an official FPL availability percentage is not available for this player.`
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
  rawQuestion: string,
  intent: ChatIntent,
  lang: 'en' | 'ku',
  history: ConversationTurn[] = [],
  pageContext?: FantasyPageContext
): Promise<FantasyChatResponse> {
  const t0 = Date.now()
  const sourceTypes: DataSourceType[] = ['ENNOVERA_RESEARCH_ARTIFACT']

  // Resolved-clarification carryover: if the immediately preceding
  // assistant turn was a "Which player did you mean: ..." clarification
  // and this message is now short and unambiguous (a bare full name, or a
  // click-through), the ORIGINAL question's intent (e.g. "why is X a good
  // choice?") must still be answered -- not just a bare fact-dump for
  // whichever name was typed, and never another round of clarification. A
  // real, required behavior: "A full-name response or card click must
  // resolve it and answer the original question, rather than restart
  // clarification." Reconstructed by combining the prior user question's
  // wording with the newly-disambiguated name so both the original intent
  // ("why"/"select"/etc.) and the now-specific name are present together.
  let question = rawQuestion
  const lastAssistant = history.length > 0 ? history[history.length - 1] : null
  const priorUser = history.length > 1 ? history[history.length - 2] : null
  const looksLikeClarificationReply = rawQuestion.trim().split(/\s+/).length <= 5
  if (
    lastAssistant?.role === 'assistant' && priorUser?.role === 'user' &&
    /which player did you mean|کامیان مەبەستتە/i.test(lastAssistant.content) &&
    looksLikeClarificationReply
  ) {
    question = `${priorUser.content} (${rawQuestion})`
  }
  const q = question.toLowerCase()

  // Language precedence: (1) an explicit in-message request for a specific
  // reply language wins outright; (2) otherwise a clearly Sorani-script
  // question overrides an English UI default -- typing a Kurdish question
  // should get a Kurdish answer even if the UI toggle still says English;
  // (3) otherwise the UI-toggle language passed in by the caller is used
  // as-is, which is the right default for a short/ambiguous message that
  // gives no language signal of its own.
  if (/\banswer in english\b|\bin english please\b/.test(q)) {
    lang = 'en'
  } else if (/بە\s*کوردی|بە\s*سۆرانی/.test(question) || (lang !== 'ku' && isSoraniScript(question))) {
    lang = 'ku'
  }

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

  // ACTUAL past-results question ("how many minutes did Larsen play in
  // GW1, 2 and 3?") -- checked FIRST, before any selection/forecast
  // logic, since this asks what already happened, not what's selected or
  // expected for the upcoming gameweek. Explicit GW1/GW2/GW3 here are
  // never replaced by "latest registered gameweek" -- that fallback only
  // applies to forecast/selection questions, not to a request for a
  // specific historical record.
  {
    const priorHistorical = lastAssistant?.role === 'assistant' ? lastAssistant.content.match(/^(.+?)'s recorded (\w+) in ([\d-]+)/) : null
    const priorGws = priorHistorical ? Array.from(new Set(Array.from(lastAssistant!.content.matchAll(/GW(\d)\b/g)).map((m) => parseInt(m[1], 10)))).sort((a, b) => a - b) : []
    const onlyGwMatch = q.match(/\bonly\s+gameweek\s+(one|two|three|four|[1-4])\b|\bjust\s+gw\s*([1-4])\b/i)
    const isFollowup = !!priorHistorical && !FORECAST_EXCLUSION_WORDS.test(q) && (
      HISTORICAL_STAT_WORDS.test(q) || /\bonly\b|\bjust\b|\bwhat about\b|\bhis\b|\bhe\b|\bshe\b|\bher\b/i.test(q)
    )
    if (isHistoricalStatsQuestion(q) || isFollowup) {
      const model = (pageContext?.model) || 'M3_SHRUNK'
      const poolGw = await fetchLatestRegisteredGameweek() ?? 3
      const pool = await fetchFullPool(poolGw, model, undefined, 500)
      let target: FullPoolPlayer | null = null
      if (pool.status === 'AVAILABLE' && pool.players) {
        const mention = resolvePlayerMention(question, pool.players)
        if (mention.kind === 'AMBIGUOUS') {
          const names = mention.candidates.map((p) => p.name).join(', ')
          return {
            answer: lang === 'ku' ? `کامیان مەبەستتە: ${names}؟` : `Which player did you mean: ${names}?`,
            intent, requestedGameweek: poolGw, contextStatus: 'GENERAL', sourceTypes,
            sourceBadge: 'Historical stats • Clarification needed', referencedPlayers: [],
            suggestedFollowups: [], generatedAt: new Date().toISOString(), dataSnapshot: 'RESEARCH_ARTIFACT_CLARIFICATION_NEEDED',
            llmUsed: false, responseTimeMs: Date.now() - t0,
          }
        }
        if (mention.kind === 'FOUND') target = mention.player
      }
      // Follow-up with no new player named -- reuse the prior player by
      // re-resolving their name from the prior reply (never guessing a
      // stable ID that wasn't actually re-verified against the pool).
      if (!target && priorHistorical && pool.status === 'AVAILABLE' && pool.players) {
        const priorName = priorHistorical[1]
        target = pool.players.find((p) => p.name === priorName) ?? null
      }
      if (target) {
        const explicitGws = extractExplicitGameweeks(q)
        let gws = explicitGws.length > 0 ? explicitGws : priorGws
        if (onlyGwMatch) {
          const wordToNum: Record<string, number> = { one: 1, two: 2, three: 3, four: 4 }
          const raw = onlyGwMatch[1] || onlyGwMatch[2]
          const n = wordToNum[raw?.toLowerCase()] ?? parseInt(raw, 10)
          gws = [n]
        }
        if (gws.length === 0) gws = [1, 2, 3]
        const stat = detectRequestedStat(q, priorHistorical ? (priorHistorical[2] as HistoricalStat) : 'minutes')
        const season = priorHistorical ? priorHistorical[3] : '2026-27'
        const actuals = await fetchPlayerActuals(target.stable_player_id, gws)
        if (actuals.status !== 'AVAILABLE') {
          return na(actuals.reason || 'Historical GW1-3 records are not available.', poolGw, model as ResearchModel, actuals.status)
        }
        const lines: string[] = []
        const statLabel = stat === 'starts' ? (lang === 'ku' ? 'یاری دەستپێکردن' : 'starts') : stat
        if (stat === 'starts') {
          const started = gws.filter((g) => (actuals.gameweeks?.[String(g)]?.starts ?? 0) > 0)
          const notStarted = gws.filter((g) => actuals.gameweeks?.[String(g)] && (actuals.gameweeks[String(g)].starts ?? 0) === 0)
          const missing = actuals.missing_gameweeks || []
          // Same opening-line template as the numeric-stat branch below
          // ("X's recorded STAT in SEASON ...") so a later follow-up
          // ("only gameweek two", "and his points?") can recognize a
          // "starts" answer as historical-context too, not just the
          // numeric list format.
          lines.push(lang === 'ku'
            ? `${target.name} تۆماری ${statLabel} لە ${season}: یاری دەستی پێکردووە لە ${started.map((g) => `GW${g}`).join(', ') || 'هیچ'}.`
            : `${target.name}'s recorded ${statLabel} in ${season}: started in ${started.map((g) => `GW${g}`).join(', ') || 'none'}.`)
          if (notStarted.length) lines.push(lang === 'ku' ? `دەستی پێنەکردووە لە: ${notStarted.map((g) => `GW${g}`).join(', ')}.` : `Did not start: ${notStarted.map((g) => `GW${g}`).join(', ')}.`)
          if (missing.length) lines.push(lang === 'ku' ? `تۆماری بەردەست نییە بۆ: ${missing.map((g) => `GW${g}`).join(', ')}.` : `No archived record for: ${missing.map((g) => `GW${g}`).join(', ')}.`)
        } else {
          lines.push(lang === 'ku' ? `${target.name} تۆماری ${statLabel} لە ${season} بۆ:` : `${target.name}'s recorded ${statLabel} in ${season} were:`)
          lines.push('')
          let sum = 0
          let anyMissing = false
          for (const g of gws) {
            const row = actuals.gameweeks?.[String(g)]
            if (!row) { lines.push(`GW${g}: ${lang === 'ku' ? 'تۆمار بەردەست نییە' : 'no record available'}`); anyMissing = true; continue }
            const value = stat === 'points' ? row.total_points : stat === 'goals' ? row.goals_scored : stat === 'assists' ? row.assists : row.minutes
            lines.push(`GW${g}: ${value ?? (lang === 'ku' ? 'تۆمار بەردەست نییە' : 'no record available')}`)
            if (typeof value === 'number') sum += value
          }
          lines.push('')
          lines.push(lang === 'ku'
            ? `کۆ: ${sum} ${statLabel}${anyMissing ? ' (تەنها گەڕە تۆمارکراوەکان)' : ''}.`
            : `Total: ${sum} ${statLabel}${anyMissing ? ' (recorded gameweeks only)' : ''}.`)
        }
        return {
          answer: lines.join('\n'), intent, requestedGameweek: poolGw, contextStatus: 'GENERAL', sourceTypes,
          sourceBadge: `Official FPL event-live archive • ${target.name}`,
          referencedPlayers: [{
            id: target.stable_player_id, name: target.name, webName: target.web_name ?? target.name, club: target.club, position: target.position,
            price: target.price ?? 0, priceUnavailable: target.price == null, predictedXp: target.predicted_xp ?? 0, xpUnavailable: true,
            actualPoints: null, matchStatus: 'FT',
          }],
          suggestedFollowups: [`And his points?`, `Which games did he start?`],
          generatedAt: new Date().toISOString(), dataSnapshot: 'OFFICIAL_FPL_HISTORICAL_ACTUALS',
          llmUsed: false, responseTimeMs: Date.now() - t0,
        }
      }
      if (isHistoricalStatsQuestion(q)) {
        // A genuine historical-stats question, but the named player
        // could not be resolved at all -- say so plainly rather than
        // falling through to an unrelated selection/forecast summary.
        return na(`Could not resolve the named player against the current eligible pool.`, poolGw, model as ResearchModel)
      }
    }
  }

  if (intent === 'GAMEWEEK_DELTA') {
    const model = parseModel(q, history) === 'BOTH' ? 'M3_SHRUNK' : (parseModel(q, history) as ResearchModel)
    const [gwA, gwB] = parseTwoGameweeks(q, 3)
    // Keeps the active decision object from the page/conversation unless
    // the question names a different one explicitly -- a two-GW question
    // about Best XI must compare Best XI, not silently substitute the AI
    // Manager (a real bug: this branch previously always used Own-Start).
    const deltaObject = parseObject(q, pageContext?.object ?? 'OWN_START')

    if (deltaObject === 'OWN_START') {
      const [respA, respB] = await Promise.all([fetchOwnStart(gwA, model), fetchOwnStart(gwB, model)])
      if (respA.status !== 'HISTORICAL_RECONSTRUCTION' && respA.status !== 'FINAL_FROZEN_FORECAST') {
        return na(respA.reason || `${model} GW${gwA} is not available.`, gwA, model, respA.status)
      }
      if (respB.status !== 'HISTORICAL_RECONSTRUCTION' && respB.status !== 'FINAL_FROZEN_FORECAST') {
        return na(respB.reason || `${model} GW${gwB} is not available.`, gwB, model, respB.status)
      }

      const xiA = new Set((respA.players || []).filter((p) => p.role === 'XI').map((p) => p.stable_player_id))
      const xiB = new Set((respB.players || []).filter((p) => p.role === 'XI').map((p) => p.stable_player_id))
      const squadA = new Set((respA.players || []).map((p) => p.stable_player_id))
      const squadB = new Set((respB.players || []).map((p) => p.stable_player_id))
      const droppedOut = (respA.players || []).filter((p) => !squadB.has(p.stable_player_id))
      const broughtIn = (respB.players || []).filter((p) => !squadA.has(p.stable_player_id))
      const xiOut = (respA.players || []).filter((p) => xiA.has(p.stable_player_id) && squadB.has(p.stable_player_id) && !xiB.has(p.stable_player_id))
      const xiIn = (respB.players || []).filter((p) => xiB.has(p.stable_player_id) && squadA.has(p.stable_player_id) && !xiA.has(p.stable_player_id))
      const transfer = respB.transfer_event
      const capA = respA.players?.find((p) => p.is_captain)
      const capB = respB.players?.find((p) => p.is_captain)
      const viceA = respA.players?.find((p) => p.is_vice)
      const viceB = respB.players?.find((p) => p.is_vice)
      const isFutureB = respB.status === 'FINAL_FROZEN_FORECAST'
      const isFutureA = respA.status === 'FINAL_FROZEN_FORECAST'

      const lines: string[] = [lang === 'ku'
        ? `گۆڕانکارییەکانی ${publicModelLabel(model, 'ku')} (AI Manager) لە GW${gwA} بۆ GW${gwB}:`
        : `Changes in ${publicModelLabel(model, 'en')}'s AI Manager from GW${gwA} to GW${gwB}:`]
      if (transfer && transfer.player_out && transfer.player_in) {
        lines.push(`- Transfer: ${transfer.player_out} → ${transfer.player_in}`)
      } else if (broughtIn.length > 0 || droppedOut.length > 0) {
        lines.push(`- Squad changes: out ${droppedOut.map((p) => p.name).join(', ') || 'none'}; in ${broughtIn.map((p) => p.name).join(', ') || 'none'}`)
      } else {
        lines.push('- No squad transfer recorded between these gameweeks.')
      }
      if (xiOut.length > 0 || xiIn.length > 0) {
        lines.push(`- Starting XI changes (same squad, different role): benched ${xiOut.map((p) => p.name).join(', ') || 'none'}; promoted to XI ${xiIn.map((p) => p.name).join(', ') || 'none'}`)
      }
      if (capA?.name !== capB?.name || viceA?.name !== viceB?.name) {
        lines.push(`- Captain: ${capA?.name ?? 'unknown'} → ${capB?.name ?? 'unknown'}; Vice: ${viceA?.name ?? 'unknown'} → ${viceB?.name ?? 'unknown'}`)
      }
      if (respA.hit_cost != null || respB.hit_cost != null || respA.free_transfers_before != null || respB.free_transfers_before != null) {
        lines.push(`- Hit cost: ${respA.hit_cost ?? 'n/a'} → ${respB.hit_cost ?? 'n/a'}; Free transfers before: ${respA.free_transfers_before ?? 'n/a'} → ${respB.free_transfers_before ?? 'n/a'}; Bank after: ${respA.bank_after ?? 'n/a'} → ${respB.bank_after ?? 'n/a'}`)
      }
      // Never present a forecast-vs-actual gap as a "measured improvement" --
      // only compares two like-for-like quantities, and states plainly
      // when one or both sides are still a forecast.
      if (!isFutureA && !isFutureB) {
        const netDelta = (respB.net_points ?? 0) - (respA.net_points ?? 0)
        lines.push(`- Net points (both actual): GW${gwA}=${respA.net_points} → GW${gwB}=${respB.net_points} (${netDelta >= 0 ? '+' : ''}${netDelta.toFixed(1)})`)
      } else {
        lines.push(`- Net points: GW${gwA}=${isFutureA ? 'forecast only, gameweek not yet played' : (respA.net_points ?? 'not available')}; GW${gwB}=${isFutureB ? 'forecast only, gameweek not yet played' : (respB.net_points ?? 'not available')}. Predicted XI xP: GW${gwA}=${respA.predicted_xi_total_xp ?? 'n/a'}, GW${gwB}=${respB.predicted_xi_total_xp ?? 'n/a'} (a forecast total, not comparable to a realized net-points total).`)
      }

      return {
        answer: lines.join('\n'), intent, requestedGameweek: gwB, contextStatus: 'GENERAL', sourceTypes,
        sourceBadge: `${citation(model, gwA, respA.artifact_version)} vs ${citation(model, gwB, respB.artifact_version)} • AI Manager`,
        referencedPlayers: [...droppedOut, ...broughtIn, ...xiOut, ...xiIn].map(toReferencedPlayer),
        suggestedFollowups: withoutUnsolicitedV0([`Show GW${gwB} AI Manager`, `Who was the captain in GW${gwB}?`], pageContext, `Who was the captain in GW${gwB}?`),
        generatedAt: new Date().toISOString(), dataSnapshot: 'RESEARCH_ARTIFACT_HISTORICAL_RECONSTRUCTION',
        llmUsed: false, responseTimeMs: Date.now() - t0,
        researchModel: model, researchGameweek: gwB, researchArtifactVersion: respB.artifact_version, researchArtifactStatus: respB.status,
      }
    }

    // A fresh-selection object (Best XI, Blank-Slate, Optional XI) has no
    // ownership/transfer history -- differences between two gameweeks are
    // "selection changes" (each gameweek's forecast independently re-
    // selecting the best players under that object's rule), never called
    // a "transfer", which only applies to the continuing AI Manager squad.
    const objLabel = OBJECT_LABELS[deltaObject]
    const [objA, objB] = await Promise.all([fetchObjectData(gwA, model, deltaObject), fetchObjectData(gwB, model, deltaObject)])
    if (objA.status !== 'HISTORICAL_RECONSTRUCTION' && objA.status !== 'FINAL_FROZEN_FORECAST') {
      return na(objA.reason || `${model} GW${gwA} ${objLabel} is not available.`, gwA, model, objA.status)
    }
    if (objB.status !== 'HISTORICAL_RECONSTRUCTION' && objB.status !== 'FINAL_FROZEN_FORECAST') {
      return na(objB.reason || `${model} GW${gwB} ${objLabel} is not available.`, gwB, model, objB.status)
    }
    const memA = Array.isArray(objA.player_membership) ? objA.player_membership : []
    const memB = Array.isArray(objB.player_membership) ? objB.player_membership : []
    const namesA = new Set(memA.map((p) => p.name))
    const namesB = new Set(memB.map((p) => p.name))
    const outNames = memA.filter((p) => !namesB.has(p.name))
    const inNames = memB.filter((p) => !namesA.has(p.name))
    const isFutureB = objB.status === 'FINAL_FROZEN_FORECAST'
    const isFutureA = objA.status === 'FINAL_FROZEN_FORECAST'

    const lines: string[] = [`Selection changes in ${objLabel} (${model}) from GW${gwA} to GW${gwB} -- a fresh independent selection each gameweek, not a manager's transfers:`]
    lines.push(`- Formation: ${formatFormation(objA.formation)} → ${formatFormation(objB.formation)}`)
    if (objA.captain !== objB.captain || objA.vice !== objB.vice) {
      lines.push(`- Captain: ${objA.captain ?? 'unknown'} → ${objB.captain ?? 'unknown'}; Vice: ${objA.vice ?? 'unknown'} → ${objB.vice ?? 'unknown'}`)
    }
    if (outNames.length > 0 || inNames.length > 0) {
      lines.push(`- Selection changes: out ${outNames.map((p) => p.name).join(', ') || 'none'}; in ${inNames.map((p) => p.name).join(', ') || 'none'}`)
    } else {
      lines.push('- No selection changes between these gameweeks (same 11 players).')
    }
    if (!isFutureA && !isFutureB) {
      const finalA = objA.final_points ?? objA.corrected_points
      const finalB = objB.final_points ?? objB.corrected_points
      lines.push(`- Final points (both actual): GW${gwA}=${finalA ?? 'n/a'} → GW${gwB}=${finalB ?? 'n/a'}`)
    } else {
      lines.push(`- Predicted XI xP: GW${gwA}=${objA.predicted_xi_xp ?? 'n/a'}${isFutureA ? ' (forecast, not played)' : ''}, GW${gwB}=${objB.predicted_xi_xp ?? 'n/a'}${isFutureB ? ' (forecast, not played)' : ''} -- not comparable to a realized points total when either side is still a forecast.`)
    }

    return {
      answer: lines.join('\n'), intent, requestedGameweek: gwB, contextStatus: 'GENERAL', sourceTypes,
      sourceBadge: `${citation(model, gwA)} vs ${citation(model, gwB)} • ${objLabel}`,
      referencedPlayers: [...outNames, ...inNames].slice(0, 10).map((p) => ({
        id: p.stable_player_id ?? -1, name: p.name, webName: p.web_name ?? p.name, club: '', position: p.position as any,
        price: p.price ?? 0, priceUnavailable: p.price == null, predictedXp: p.predicted_xp ?? 0, xpUnavailable: p.predicted_xp == null,
        actualPoints: p.actual_points ?? null, matchStatus: p.actual_points != null ? 'FT' : 'NOT_STARTED',
      })),
      suggestedFollowups: withoutUnsolicitedV0([`Show GW${gwB} ${objLabel}`], pageContext, `Show GW${gwB} ${objLabel}`),
      generatedAt: new Date().toISOString(), dataSnapshot: 'RESEARCH_ARTIFACT_HISTORICAL_RECONSTRUCTION',
      llmUsed: false, responseTimeMs: Date.now() - t0,
      researchModel: model, researchGameweek: gwB, researchArtifactStatus: objB.status,
    }
  }

  // RESEARCH_MODEL_QUERY
  const modelSel = pageContext && !detectModelMention(q) ? pageContext.model : parseModel(q, history)
  // "This gameweek" (no explicit GW number in the message) resolves to the
  // page's current gameweek, which itself now defaults to the latest
  // REGISTERED gameweek (see app/fantasy/page.tsx) rather than a stale
  // hardcoded value -- the answer states which GW was actually used
  // (gwWasExplicit) whenever that resolution wasn't spelled out by the user.
  const gwExplicitInMessage = /\bgw\s*([1-4])\b/.test(q) || /\bgame\s*[\s-]?\s*week\s*([1-4])\b/.test(q)
  const gw = await resolveEffectiveGameweek(q, pageContext?.gameweek, history)
  const gwUsedNote = (lang: 'en' | 'ku') => gwExplicitInMessage ? '' : (lang === 'ku' ? '، دوایین هەفتەی تۆمارکراو' : ', the latest registered gameweek')
  const objectSel = parseObject(q, pageContext?.object ?? 'OWN_START')

  const POS_NAME: Record<Position, string> = { MID: 'midfielder', DEF: 'defender', FWD: 'forward', GK: 'goalkeeper' }

  // Object-DEFINITION comparison questions ("why is Best £100m different
  // from AI Manager?") -- a real bug: buildResearchGroundedAnswer had no
  // branch at all for this intent (it was only ever handled by the old
  // FPL-03 legacy demo path, which is bypassed whenever pageContext is
  // set, i.e. on the real Fantasy page), so it fell through every other
  // branch and dumped a generic single-object summary instead of ever
  // explaining the actual structural difference. Answers with the real
  // definitional distinction plus a source-backed example from THIS
  // gameweek's own recorded data -- never a bare player list, and never a
  // claim about the manager's transfer policy beyond what its own
  // recorded fields (hit_cost/free_transfers_before) actually show.
  if (intent === 'TEAM_OBJECT_QUERY' && modelSel !== 'BOTH') {
    const model = modelSel as ResearchModel
    const mentionsBestXI = /\bbest\s*[-]?\s*xi\b/.test(q)
    const otherObject: ObjectLabel = mentionsBestXI ? 'B_LEGAL_BEST_XI' : (objectSel !== 'OWN_START' ? objectSel : 'A_BLANK_SLATE')
    const otherLabel = OBJECT_LABELS[otherObject]
    const [ownStartResp, otherResp] = await Promise.all([fetchOwnStart(gw, model), fetchObjectData(gw, model, otherObject)])

    const defLines: string[] = [
      lang === 'ku'
        ? `${otherLabel} و AI Manager دەتوانن جیاواز بن تەنانەت ئەگەر پێشبینی هەمان یاریزانیش بەکاربهێنن، چونکە هەریەکەیان وەڵامی پرسیارێکی جیاواز دەدەنەوە:`
        : `${otherLabel} and AI Manager can differ even when built from the same player forecasts, because they answer different questions:`,
      lang === 'ku'
        ? `- ${otherLabel} تیمێکی نوێی یاسایی ١٥ یاریزانە کە بۆ ئەم هەفتەیە دروستکراوە تەنها لەژێر مەرجی بوودجە (هەتا ١٠٠ ملیۆن پاوەند) و پێکهاتەی تیم -- هیچ مێژووی گواستنەوە یان خاوەندارێتی نییە.`
        : `- ${otherLabel} is a fresh legal 15-player squad selected for this gameweek under budget (up to £100m) and squad-composition constraints only -- it carries no transfer or ownership history.`,
      lang === 'ku'
        ? `- AI Manager خاوەندارێتی، باڵانس، نرخی کڕین/فرۆشتن، و گواستنەوە ئازادەکان لە گەڕی پێشوو دەگوازێتەوە؛ هەڵبژاردنەکانی ئەم گەڕە سنووردارە بەوەی چ گواستنەوەیەک یاسایی دەتوانێت بکات (و نرخی سزای خاڵ، ئەگەر هەبێت)، نەک تەنها خاڵی پێشبینیکراو.`
        : `- AI Manager carries ownership, bank, purchase/selling prices, and free transfers forward from the previous gameweek; its choices this gameweek are constrained by which transfer(s) it can legally make (and any point-hit cost), not just raw forecast xP.`,
    ]
    const ownAvailable = ownStartResp.status === 'HISTORICAL_RECONSTRUCTION' || ownStartResp.status === 'FINAL_FROZEN_FORECAST'
    const otherAvailable = otherResp.status === 'HISTORICAL_RECONSTRUCTION' || otherResp.status === 'FINAL_FROZEN_FORECAST'
    if (ownAvailable) {
      const t = ownStartResp.transfer_event
      const transferDesc = t && (t.player_out || t.player_in)
        ? `transferred ${t.player_out ?? 'nobody'} out and ${t.player_in ?? 'nobody'} in`
        : 'made no transfer'
      defLines.push(`For GW${gw}: AI Manager ${transferDesc} (hit cost ${ownStartResp.hit_cost ?? 'n/a'}, ${ownStartResp.free_transfers_before ?? 'n/a'} free transfer(s) before this gameweek) -- ${otherLabel} is a fresh selection unconstrained by any of that.`)
      const ownCap = ownStartResp.players?.find((p) => p.is_captain)?.name
      if (otherAvailable) {
        defLines.push(`Captain for GW${gw}: AI Manager = ${ownCap ?? 'n/a'}, ${otherLabel} = ${otherResp.captain ?? 'n/a'}.`)
      }
    }
    return {
      answer: defLines.join('\n'), intent, requestedGameweek: gw, contextStatus: 'GENERAL', sourceTypes,
      sourceBadge: `${citation(model, gw)} • ${OBJECT_LABELS.OWN_START} vs ${otherLabel}`,
      referencedPlayers: [],
      suggestedFollowups: withoutUnsolicitedV0([`Show GW${gw} AI Manager`, `Show GW${gw} ${otherLabel}`], pageContext, `Show GW${gw} ${otherLabel}`),
      generatedAt: new Date().toISOString(), dataSnapshot: 'RESEARCH_ARTIFACT_HISTORICAL_RECONSTRUCTION',
      llmUsed: false, responseTimeMs: Date.now() - t0,
      researchModel: model, researchGameweek: gw, researchArtifactStatus: ownStartResp.status,
    }
  }

  // Player comparison ("compare Saka and Palmer", "which is better,
  // Ødegaard or Bruno?") -- previously only reachable via the legacy
  // engine's hardcoded 4-name allowlist (and the old fixed GW2/GW3 demo
  // data even when it DID match), so most real player names never
  // triggered a comparison at all. Resolves every distinctly-named player
  // against the FULL eligible pool for the correctly-resolved gameweek,
  // never the old demo snapshot.
  if (modelSel !== 'BOTH' && (/\bcompare\b|\bvs\.?\b|\bversus\b|which (one )?is better\b|better than\b|\bor\b/i.test(q) || q.includes('بەراورد') || q.includes('یان'))) {
    const model = modelSel as ResearchModel
    const pool = await fetchFullPool(gw, model, undefined, 500)
    if (pool.status === 'AVAILABLE' && pool.players) {
      const mentioned = findAllDistinctPlayerMentions(q, pool.players)
      if (mentioned.length >= 2) {
        const rows = mentioned.slice(0, 4)
        const lines = [`Comparison for GW${gw}${gwUsedNote(lang)}:`]
        for (const p of rows) {
          const officialPct = p.official_chance_of_playing_next_round ?? p.official_chance_of_playing_this_round
          lines.push(
            `- ${p.name} (${p.club}, ${p.position}): xP ${p.predicted_xp ?? 'n/a'}` +
            `${p.price != null ? `, £${p.price.toFixed(1)}m` : ''}` +
            `${p.expected_minutes != null ? `, expected minutes ${p.expected_minutes}` : ''}` +
            `${p.p_start != null ? `, model P(start) ${(p.p_start * 100).toFixed(0)}%` : ''}` +
            `${officialPct != null ? `, Official FPL availability ${officialPct.toFixed(0)}%` : ''}` +
            `${p.likely_range ? `, likely range ${p.likely_range[0]}-${p.likely_range[1]}, P80 upside ${p.upside_score ?? 'n/a'}` : ''}`
          )
        }
        const ranked = [...rows].sort((a, b) => (b.predicted_xp ?? 0) - (a.predicted_xp ?? 0))
        const gap = (ranked[0].predicted_xp ?? 0) - (ranked[1].predicted_xp ?? 0)
        lines.push(`Ennovera's forecast favors ${ranked[0].name} by ${gap.toFixed(2)} xP -- a forecast comparison only, not a claim either is legally available for your squad.`)
        return {
          answer: lines.join('\n'), intent, requestedGameweek: gw, contextStatus: 'GENERAL', sourceTypes,
          sourceBadge: `${citation(model, gw)} • Player comparison`,
          referencedPlayers: rows.map((p) => ({
            id: p.stable_player_id, name: p.name, webName: p.web_name ?? p.name, club: p.club, position: p.position,
            price: p.price ?? 0, priceUnavailable: p.price == null, predictedXp: p.predicted_xp ?? 0, xpUnavailable: p.predicted_xp == null,
            actualPoints: null, matchStatus: 'NOT_STARTED',
          })),
          suggestedFollowups: withoutUnsolicitedV0([`Why was ${ranked[0].name} selected?`, `Alternatives to ${ranked[1].name}`], pageContext, `Show ${OBJECT_LABELS.OWN_START} GW${gw}`),
          generatedAt: new Date().toISOString(), dataSnapshot: 'RESEARCH_ARTIFACT_FULL_POOL',
          llmUsed: false, responseTimeMs: Date.now() - t0,
          researchModel: model, researchGameweek: gw, researchArtifactStatus: 'AVAILABLE',
        }
      }
    }
    // Pool unavailable (e.g. historical GW1-3, no full-pool export) or no
    // 2 distinct players resolved -- fall through rather than guessing;
    // the generic named-player/ranking/object logic below still applies.
  }

  // Budget/price-filtered query ("best midfielder under £7m", "show five
  // forwards costing no more than £8m") -- previously only reachable via
  // the legacy engine's fixed GW2/GW3 demo top-players list. Price is
  // always interpreted as whole-and-decimal £ MILLIONS (matching the
  // site's own display convention), never raw price "tenths".
  if (modelSel !== 'BOTH' && intent === 'BUDGET_QUERY') {
    const model = modelSel as ResearchModel
    const positions = matchAllPositions(q)
    const pos: Position = positions[0] ?? 'MID'
    const priceMatch = q.match(/(?:under|below|no more than|cheaper than|costing(?:\s+no more than)?)\s*£?\s*(\d+(?:\.\d+)?)\s*m?\b/i) || q.match(/£\s*(\d+(?:\.\d+)?)\s*m\b/i)
    const priceCeiling = priceMatch ? parseFloat(priceMatch[1]) : null
    const count = extractRequestedCount(q)
    const pool = await fetchFullPool(gw, model, pos, 500)
    if (pool.status !== 'AVAILABLE' || !pool.players) {
      return na(pool.reason || `Full player pool unavailable for GW${gw} -- a complete candidate pool exists only for the currently registered final pair, not every historical gameweek.`, gw, model, pool.status)
    }
    const filtered = (priceCeiling != null ? pool.players.filter((p) => p.price != null && p.price <= priceCeiling) : pool.players).slice(0, count)
    const priceLine = priceCeiling != null ? ` under £${priceCeiling.toFixed(1)}m` : ''
    const lines = [`Top ${count} ${POS_NAME[pos]}s${priceLine} for GW${gw}${gwUsedNote(lang)} (full eligible pool, ranked by predicted xP):`]
    for (const p of filtered) {
      const officialPct = p.official_chance_of_playing_next_round ?? p.official_chance_of_playing_this_round
      lines.push(`- ${p.name} (${p.club}) vs ${p.opponent_resolved ?? 'unknown opponent'}${p.was_home === true ? ' (H)' : p.was_home === false ? ' (A)' : ''}: ` +
        `xP ${p.predicted_xp ?? 'n/a'}${p.price != null ? `, £${p.price.toFixed(1)}m` : ''}${p.p_start != null ? `, model P(start) ${(p.p_start * 100).toFixed(0)}%` : ''}` +
        `${officialPct != null ? `, Official FPL availability ${officialPct.toFixed(0)}%` : ''}`)
    }
    if (filtered.length === 0) lines.push(priceCeiling != null ? `No ${POS_NAME[pos]}s in the full eligible pool are priced at or under £${priceCeiling.toFixed(1)}m.` : `No ${POS_NAME[pos]}s available.`)
    lines.push('This is a forecast/price-filtered recommendation only -- it does not check budget, ownership, or free-transfer legality for your own squad (ask for a "legal transfer" check for that).')
    return {
      answer: lines.join('\n'), intent, requestedGameweek: gw, contextStatus: 'GENERAL', sourceTypes,
      sourceBadge: `${citation(model, gw)} • Full pool`,
      referencedPlayers: filtered.map((p) => ({
        id: p.stable_player_id, name: p.name, webName: p.web_name ?? p.name, club: p.club, position: p.position,
        price: p.price ?? 0, priceUnavailable: p.price == null, predictedXp: p.predicted_xp ?? 0, xpUnavailable: p.predicted_xp == null,
        actualPoints: null, matchStatus: 'NOT_STARTED',
      })),
      suggestedFollowups: withoutUnsolicitedV0([`Why was ${filtered[0]?.name ?? 'this player'} ranked there?`, `Show ${OBJECT_LABELS.B_LEGAL_BEST_XI} GW${gw}`], pageContext, `Show ${OBJECT_LABELS.B_LEGAL_BEST_XI} GW${gw}`),
      generatedAt: new Date().toISOString(), dataSnapshot: 'RESEARCH_ARTIFACT_FULL_POOL',
      llmUsed: false, responseTimeMs: Date.now() - t0,
      researchModel: model, researchGameweek: gw, researchArtifactStatus: 'AVAILABLE',
    }
  }

  // Alternatives: distinguish player alternatives, stored Optional-XI
  // objects, and legal-transfer-under-constraints -- three different
  // things a bare "alternatives" question could mean. Checked before
  // position-ranking since neither pattern overlaps the ranking wording.
  // The named player is resolved against the FULL eligible pool (not just
  // the Own-Start squad or the current page tab) -- "if I change Isak,
  // what are the best alternatives?" must resolve Isak even when he isn't
  // a member of whichever object happens to be on screen; a real bug
  // (Isak unresolved, falling back to "alternative lineups") was caused
  // by searching only the Own-Start roster here.
  if (modelSel !== 'BOTH') {
    const model = modelSel as ResearchModel
    const fullPoolForAlts = await fetchFullPool(gw, model, undefined, 500)
    const altIntent = fullPoolForAlts.status === 'AVAILABLE' && fullPoolForAlts.players
      ? detectAlternativesQuery(q, fullPoolForAlts.players)
      : detectAlternativesQuery(q, [] as FullPoolPlayer[])
    if (altIntent && altIntent.kind === 'AMBIGUOUS_PLAYER') {
      return {
        answer: lang === 'ku' ? `کامیان مەبەستتە: ${altIntent.candidateNames.join('، ')}؟` : `Which player did you mean: ${altIntent.candidateNames.join(', ')}?`,
        intent, requestedGameweek: gw, contextStatus: 'GENERAL', sourceTypes,
        sourceBadge: `${citation(model, gw)} • Clarification needed`, referencedPlayers: [],
        suggestedFollowups: withoutUnsolicitedV0(altIntent.candidateNames.slice(0, 2).map((n) => `Alternatives to ${n}`), pageContext, `Show ${OBJECT_LABELS.OWN_START} GW${gw}`),
        generatedAt: new Date().toISOString(), dataSnapshot: 'RESEARCH_ARTIFACT_CLARIFICATION_NEEDED',
        llmUsed: false, responseTimeMs: Date.now() - t0, researchModel: model, researchGameweek: gw, researchArtifactStatus: 'AVAILABLE',
      }
    }
    if (altIntent) {
      if (detectLegalTransferQuery(q) && altIntent.kind === 'PLAYER') {
        // Legal-transfer-under-constraints: distinct from an unconstrained
        // player alternative -- must actually check bank/price/position
        // against the Own-Start squad, never just relabel a suggestion.
        // The named player must actually be OWNED (in the Own-Start squad)
        // for a "transfer" to make sense -- if he's only in the full pool
        // (e.g. named from a Best XI/Optional-XI context), say so plainly
        // and fall back to unconstrained alternatives instead of silently
        // treating an unowned player as a legal-transfer target.
        const ownStartForAlts = await fetchOwnStart(gw, model)
        const altsPlayers = ownStartForAlts.players || []
        const target = altsPlayers.find((p) => p.stable_player_id === altIntent.stablePlayerId)
        if (!target) {
          const poolTarget = fullPoolForAlts.players?.find((p) => p.stable_player_id === altIntent.stablePlayerId)
          const nameForNote = poolTarget?.name ?? altIntent.playerName
          const note = lang === 'ku'
            ? `${nameForNote} لە تیمی AI Manager دا نییە، بۆیە گواستنەوەیەکی یاسایی بۆ ئەو بابەتی نییە. لێرەدا جێگرەوەکان بەپێی پێشبینی خاڵ نیشان دەدرێن (بەبێ پشکنینی بوودجە/ خاوەندارێتی):`
            : `${nameForNote} is not currently in the AI Manager squad, so there's no legal transfer to evaluate for him. Showing unconstrained forecast alternatives instead (budget/ownership not checked):`
          const posForAlt = poolTarget?.position
          const altsPool = posForAlt ? (fullPoolForAlts.players || []).filter((p) => p.position === posForAlt && p.stable_player_id !== altIntent.stablePlayerId).slice(0, 5) : []
          const lines = [note, ...altsPool.map((p) => `- ${p.name} (${p.club}): xP ${p.predicted_xp ?? 'n/a'}${p.price != null ? `, £${p.price.toFixed(1)}m` : ''}`)]
          return {
            answer: lines.join('\n'), intent, requestedGameweek: gw, contextStatus: 'GENERAL', sourceTypes,
            sourceBadge: `${citation(model, gw)} • Full pool`,
            referencedPlayers: altsPool.map((p) => ({
              id: p.stable_player_id, name: p.name, webName: p.web_name ?? p.name, club: p.club, position: p.position,
              price: p.price ?? 0, priceUnavailable: p.price == null,
              predictedXp: p.predicted_xp ?? 0, xpUnavailable: p.predicted_xp == null,
              actualPoints: null, matchStatus: 'NOT_STARTED',
            })),
            suggestedFollowups: withoutUnsolicitedV0([`Show ${OBJECT_LABELS.OWN_START} GW${gw}`], pageContext, `Show ${OBJECT_LABELS.OWN_START} GW${gw}`),
            generatedAt: new Date().toISOString(), dataSnapshot: 'RESEARCH_ARTIFACT_FULL_POOL',
            llmUsed: false, responseTimeMs: Date.now() - t0,
            researchModel: model, researchGameweek: gw, researchArtifactStatus: 'AVAILABLE',
          }
        }
        const bank = ownStartForAlts.bank_after ?? 0
        const budget = bank + (target.price ?? 0)
        const pool = await fetchFullPool(gw, model, target.position, 50)
        if (pool.status !== 'AVAILABLE') return na(pool.reason || 'Full player pool unavailable.', gw, model, pool.status)
        const ownedIds = new Set(altsPlayers.map((p) => p.stable_player_id))
        const affordable = (pool.players || [])
          .filter((p) => !ownedIds.has(p.stable_player_id) && (p.price ?? Infinity) <= budget)
        const affordableListText = affordable.slice(0, 5).map((p) => `${p.name} (£${(p.price ?? 0).toFixed(1)}m, xP ${p.predicted_xp ?? 'n/a'})`).join(', ')
        const answer = lang === 'ku'
          ? `بەپێی باڵانسی تیمی AI Manager (£${bank.toFixed(1)}m) و نرخی ${target.name} (£${(target.price ?? 0).toFixed(1)}m)، بوودجەیەکی £${budget.toFixed(1)}m بۆ گۆڕینەوەیەکی هاوپۆزیشن (${target.position}) بەردەستە. ` +
            `${affordable.length} یاریزانی ${target.position} گونجاون لەم بوودجەیەدا و لە تیمەکەدا نین: ` +
            `${affordableListText || (lang === 'ku' ? 'هیچ نەدۆزرایەوە' : 'none found')}. ` +
            `ئەمە تەنها نرخ و پۆزیشن دەپشکنێت -- سنووری خاوەندارێتی یانە (زۆرترین ٣ یاریزان بۆ هەر یانەیەک) یان یاساکانی گواستنەوەی ئازاد/سزای خاڵ ناپشکنێت، تکایە ئەوانە بە جیا دڵنیایان بکەرەوە پێش ئەوەی بڵێیت گۆڕینەوەکە بە تەواوی یاسایی یە.`
          : `Checking against the Own-Start squad's bank (£${bank.toFixed(1)}m) and ${target.name}'s price (£${(target.price ?? 0).toFixed(1)}m) gives a budget of £${budget.toFixed(1)}m for a same-position (${target.position}) replacement. ` +
          `${affordable.length} eligible ${POS_NAME[target.position]}(s) fit that budget and aren't already in the squad: ` +
          `${affordableListText || 'none found'}. ` +
          `This checks price and position only -- it does not check per-club ownership limits (max 3 per real-world club) or the free-transfer/hit-cost rules, so confirm those separately before calling a specific swap fully legal.`
        return {
          answer, intent, requestedGameweek: gw, contextStatus: 'GENERAL', sourceTypes,
          sourceBadge: `${citation(model, gw)} • Legal-transfer check`,
          referencedPlayers: affordable.slice(0, 5).map((p, i) => ({
            id: p.stable_player_id, name: p.name, webName: p.web_name ?? p.name, club: p.club, position: p.position,
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
        const target = fullPoolForAlts.players?.find((p) => p.stable_player_id === altIntent.stablePlayerId)
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
            id: p.stable_player_id, name: p.name, webName: p.web_name ?? p.name, club: p.club, position: p.position,
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
      const lines: string[] = [`Top ${count} by predicted xP for GW${gw}${gwUsedNote(lang)} (full eligible player pool, not just one squad/lineup):`]
      const referencedPlayers: ReferencedPlayer[] = []
      positions.forEach((pos, i) => {
        const r = poolResults[i]
        lines.push(`\n${POS_NAME[pos].toUpperCase()}S (${r.total_matching_filter} eligible):`)
        for (const p of r.players || []) {
          const officialPct = p.official_chance_of_playing_next_round ?? p.official_chance_of_playing_this_round
          lines.push(`- ${p.name} (${p.club}) vs ${p.opponent_resolved ?? 'unknown opponent'}${p.was_home === true ? ' (H)' : p.was_home === false ? ' (A)' : ''}: ` +
            `xP ${p.predicted_xp ?? 'n/a'}${p.price != null ? `, £${p.price.toFixed(1)}m` : ''}${p.p_start != null ? `, model P(start) ${(p.p_start * 100).toFixed(0)}%` : ''}` +
            `${officialPct != null ? `, Official FPL availability ${officialPct.toFixed(0)}%` : ''}` +
            `${p.likely_range ? `, likely range ${p.likely_range[0]}-${p.likely_range[1]}, P80 upside ${p.upside_score ?? 'n/a'}` : ''}`)
          if (referencedPlayers.length < 15) {
            referencedPlayers.push({
              id: p.stable_player_id, name: p.name, webName: p.web_name ?? p.name, club: p.club, position: p.position,
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

  // "why is Haaland's average 8 but upside higher?" -- a question about
  // the mean-vs-outlook relationship itself, not about squad selection.
  // Looks the player up in the full pool (works regardless of which
  // decision object is currently in view) so it isn't limited to whoever
  // happens to be in the current squad/XI.
  if (modelSel !== 'BOTH' && isAverageVsUpsideQuestion(q)) {
    const model = modelSel as ResearchModel
    const pool = await fetchFullPool(gw, model, undefined, 500)
    if (pool.status !== 'AVAILABLE' || !pool.players) {
      return na(pool.reason || 'Full player pool unavailable.', gw, model, pool.status)
    }
    // Uses the same resolvePlayerMention as every other named-player path
    // (Latin substring -> known Kurdish aliases -> exact-skeleton
    // fallback, with real collision detection) instead of a Latin-only ad
    // hoc matcher -- this branch previously could not resolve a Sorani-
    // written player name at all.
    const mention = resolvePlayerMention(question, pool.players)
    if (mention.kind === 'AMBIGUOUS') {
      const names = mention.candidates.map((p) => p.name).join(', ')
      return {
        answer: lang === 'ku' ? `کامیان مەبەستتە: ${names}؟` : `Which player did you mean: ${names}?`,
        intent, requestedGameweek: gw, contextStatus: 'GENERAL', sourceTypes,
        sourceBadge: `${citation(model, gw)} • Clarification needed`,
        referencedPlayers: mention.candidates.slice(0, 5).map((p) => ({
          id: p.stable_player_id, name: p.name, webName: p.web_name ?? p.name, club: p.club, position: p.position,
          price: p.price ?? 0, priceUnavailable: p.price == null, predictedXp: p.predicted_xp ?? 0, xpUnavailable: p.predicted_xp == null,
          actualPoints: null, matchStatus: 'NOT_STARTED',
        })),
        suggestedFollowups: withoutUnsolicitedV0(mention.candidates.slice(0, 2).map((p) => `Why was ${p.name} selected?`), pageContext, `Show ${OBJECT_LABELS.B_LEGAL_BEST_XI} GW${gw}`),
        generatedAt: new Date().toISOString(), dataSnapshot: 'RESEARCH_ARTIFACT_CLARIFICATION_NEEDED',
        llmUsed: false, responseTimeMs: Date.now() - t0, researchModel: model, researchGameweek: gw, researchArtifactStatus: 'AVAILABLE',
      }
    }
    const target = mention.kind === 'FOUND' ? mention.player : undefined
    if (!target) {
      const clarify = lang === 'ku'
        ? `کامیان یاریزانە؟ دەتوانم پەیوەندی نێوان تێکڕا و بەرزبوونەوە بۆ هەر یاریزانێکی GW${gw} ڕوون بکەمەوە ئەگەر ناوی بڵێیت.`
        : `Which player did you mean? I can explain the average-vs-upside relationship for any GW${gw} player if you name them.`
      return {
        answer: clarify,
        intent, requestedGameweek: gw, contextStatus: 'GENERAL', sourceTypes,
        sourceBadge: `${citation(model, gw)} • Clarification needed`, referencedPlayers: [],
        suggestedFollowups: withoutUnsolicitedV0([`Show ${OBJECT_LABELS.B_LEGAL_BEST_XI} GW${gw}`], pageContext, `Show ${OBJECT_LABELS.B_LEGAL_BEST_XI} GW${gw}`),
        generatedAt: new Date().toISOString(), dataSnapshot: 'RESEARCH_ARTIFACT_CLARIFICATION_NEEDED',
        llmUsed: false, responseTimeMs: Date.now() - t0, researchModel: model, researchGameweek: gw, researchArtifactStatus: 'AVAILABLE',
      }
    }
    let factsText: string
    if (target.outlook_is_supplemental && target.upside_score != null && target.likely_range) {
      const [p25, p75] = [target.likely_range[0], target.likely_range[1]]
      factsText =
        `${target.name}'s average expected points for GW${gw} is ${target.predicted_xp}. This is the MEAN of a supplemental estimated points distribution ` +
        `(not part of the original frozen forecast) -- the middle 50% of realistic outcomes falls between ${p25} and ${p75} points, and the 80th-percentile ` +
        `upside is ${target.upside_score} points. The average is a single summary number that a genuinely uncertain outcome (whether he scores, plays 90 ` +
        `minutes, gets a clean sheet, etc.) will often land above or below -- the upside figure describes a good-case scenario within that same distribution, ` +
        `not a different or more likely prediction, and outcomes above the 80th percentile remain possible too.`
    } else {
      factsText =
        `${target.name}'s average expected points for GW${gw} is ${target.predicted_xp}. A supplemental range/upside distribution has not been published ` +
        `for this player yet, so I can't give you specific P25/P75/P80 numbers here -- but in general, an average (mean) forecast summarizes a whole range ` +
        `of possible outcomes into one number, so higher scores above that average are always possible even without a calculated upside figure.`
    }
    const answerText = await naturalize(factsText, lang, [target.name])
    return {
      answer: answerText, intent, requestedGameweek: gw, contextStatus: 'GENERAL', sourceTypes,
      sourceBadge: `${citation(model, gw)} • Outlook explanation`,
      referencedPlayers: [{
        id: target.stable_player_id, name: target.name, webName: target.web_name ?? target.name, club: target.club, position: target.position,
        price: target.price ?? 0, priceUnavailable: target.price == null,
        predictedXp: target.predicted_xp ?? 0, xpUnavailable: target.predicted_xp == null,
        actualPoints: null, matchStatus: 'NOT_STARTED',
      }],
      suggestedFollowups: withoutUnsolicitedV0([`Why was ${target.name} selected?`, `Show ${OBJECT_LABELS.B_LEGAL_BEST_XI} GW${gw}`], pageContext, `Show ${OBJECT_LABELS.B_LEGAL_BEST_XI} GW${gw}`),
      generatedAt: new Date().toISOString(), dataSnapshot: 'RESEARCH_ARTIFACT_FULL_POOL',
      llmUsed: answerText !== factsText, responseTimeMs: Date.now() - t0,
      researchModel: model, researchGameweek: gw, researchArtifactStatus: 'AVAILABLE',
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

  // Cross-object named-player resolution: search the full eligible pool
  // for a named player, then check EVERY decision object (AI Manager,
  // Best XI, Best £100m Squad, Optional XI Primary, Optional XI 1-4) for
  // membership -- BEFORE assuming the question is about whichever object
  // happens to be the current page tab. A real, reproduced bug: "Why was
  // Foden selected for GW4?" asked while the Best XI tab was open
  // returned the ENTIRE Best XI roster, because object-branching ran
  // first and never checked whether a player was even named -- Foden
  // isn't in Best XI at all (he's in the AI Manager XI). Player
  // resolution now always runs first; the object-dump/summary fallback
  // further below is reached only when no player is named in the message.
  const fullPoolForMention = await fetchFullPool(gw, model, undefined, 500)
  const poolPlayers = fullPoolForMention.status === 'AVAILABLE' ? (fullPoolForMention.players || []) : []
  const globalMention: PlayerMentionResult<FullPoolPlayer> = poolPlayers.length > 0 ? resolvePlayerMention(question, poolPlayers) : { kind: 'NONE' }

  if (globalMention.kind === 'AMBIGUOUS') {
    const names = globalMention.candidates.map((p) => p.name).join(', ')
    return {
      answer: lang === 'ku' ? `کامیان مەبەستتە: ${names}؟` : `Which player did you mean: ${names}?`,
      intent, requestedGameweek: gw, contextStatus: 'GENERAL', sourceTypes,
      sourceBadge: `${citation(model, gw)} • Clarification needed`,
      referencedPlayers: globalMention.candidates.slice(0, 5).map((p) => ({
        id: p.stable_player_id, name: p.name, webName: p.web_name ?? p.name, club: p.club, position: p.position,
        price: p.price ?? 0, priceUnavailable: p.price == null, predictedXp: p.predicted_xp ?? 0, xpUnavailable: p.predicted_xp == null,
        actualPoints: null, matchStatus: 'NOT_STARTED',
      })),
      suggestedFollowups: withoutUnsolicitedV0(globalMention.candidates.slice(0, 2).map((p) => `Why was ${p.name} selected?`), pageContext, `Show ${OBJECT_LABELS.OWN_START} GW${gw}`),
      generatedAt: new Date().toISOString(), dataSnapshot: 'RESEARCH_ARTIFACT_CLARIFICATION_NEEDED',
      llmUsed: false, responseTimeMs: Date.now() - t0, researchModel: model, researchGameweek: gw, researchArtifactStatus: 'AVAILABLE',
    }
  }

  if (globalMention.kind === 'FOUND') {
    const target = globalMention.player
    const allLabels = Object.keys(OBJECT_LABELS) as ObjectLabel[]
    const otherLabels = allLabels.filter((l) => l !== 'OWN_START')
    const [ownStartResp, ...otherResps] = await Promise.all([
      fetchOwnStart(gw, model),
      ...otherLabels.map((l) => fetchObjectData(gw, model, l)),
    ])

    interface Membership { label: ObjectLabel; role: 'XI' | 'BENCH'; isCaptain: boolean; isVice: boolean; ownStart?: OwnStartPlayer }
    const memberships: Membership[] = []
    const ownStartAvailable = ownStartResp.status === 'HISTORICAL_RECONSTRUCTION' || ownStartResp.status === 'FINAL_FROZEN_FORECAST'
    if (ownStartAvailable) {
      const m = (ownStartResp.players || []).find((p) => p.stable_player_id === target.stable_player_id)
      if (m) memberships.push({ label: 'OWN_START', role: m.role, isCaptain: m.is_captain, isVice: m.is_vice, ownStart: m })
    }
    otherLabels.forEach((label, i) => {
      const r = otherResps[i]
      if (r.status !== 'HISTORICAL_RECONSTRUCTION' && r.status !== 'FINAL_FROZEN_FORECAST') return
      const membership = Array.isArray(r.player_membership) ? r.player_membership : null
      const m = membership?.find((p) => (p.stable_player_id != null ? p.stable_player_id === target.stable_player_id : p.name === target.name))
      if (m) memberships.push({ label, role: 'XI', isCaptain: !!m.is_captain || m.name === r.captain, isVice: !!m.is_vice || m.name === r.vice })
    })

    const isFutureForecast = ownStartAvailable
      ? ownStartResp.status === 'FINAL_FROZEN_FORECAST'
      : otherResps.some((r) => r.status === 'FINAL_FROZEN_FORECAST')
    const isWhyQuestion = /\bwhy\b|\bselect/.test(q) || q.includes('بۆچی') || q.includes('هەڵبژار')
    // Positional rank/count, not the whole (all-positions) pool -- a real
    // bug: "#81 of 494 MIDs" previously paired an OVERALL rank/count
    // (poolPlayers has every position) with a positional label, when 494
    // is the size of the ENTIRE candidate pool, not the MID-only count.
    // poolPlayers is already sorted by predicted xP descending, so
    // filtering to one position preserves that relative order.
    const samePositionLeaguePool = poolPlayers.filter((p) => p.position === target.position)
    const leagueIdx = samePositionLeaguePool.findIndex((p) => p.stable_player_id === target.stable_player_id)
    const leagueRankText = leagueIdx >= 0 ? `#${leagueIdx + 1} of ${samePositionLeaguePool.length} ${target.position}s league-wide by predicted xP` : ''
    const priceText = target.price != null ? `£${target.price.toFixed(1)}m` : 'price unavailable'
    const xpText = target.predicted_xp != null ? `${target.predicted_xp}` : 'not available'
    const referencedPlayers: ReferencedPlayer[] = [{
      id: target.stable_player_id, name: target.name, webName: target.web_name ?? target.name, club: target.club, position: target.position,
      price: target.price ?? 0, priceUnavailable: target.price == null,
      predictedXp: target.predicted_xp ?? 0, xpUnavailable: target.predicted_xp == null,
      actualPoints: null, matchStatus: isFutureForecast ? 'NOT_STARTED' : 'NOT_STARTED',
    }]

    let factsText: string
    if (memberships.length === 0) {
      // Present only in the full eligible pool -- never invent a squad he
      // wasn't part of, per spec ("if the player is only in the full pool
      // and not selected, say that he was not selected").
      factsText = lang === 'ku'
        ? `${target.name} لە هیچ یەکێک لە پێکهاتەکانی GW${gw} دا هەڵنەبژێردراوە (AI Manager, Best XI, Best £100m Squad, یان Optional XI). لە کۆگای گشتیدا: خاڵی پێشبینیکراو ${xpText}, نرخ ${priceText}${leagueRankText ? `, پلە ${leagueRankText}` : ''}.`
        : `${target.name} was not selected in any GW${gw} decision object (AI Manager, Best XI, Best £100m Squad, or the Optional XIs). In the full eligible pool: predicted xP ${xpText}, price ${priceText}${leagueRankText ? `, ranked ${leagueRankText}` : ''}.`
    } else if (memberships.length === 1) {
      const m = memberships[0]
      const objLabel = OBJECT_LABELS[m.label]
      const capText = m.isCaptain ? (lang === 'ku' ? ' وەک کاپتن' : ' as captain') : m.isVice ? (lang === 'ku' ? ' وەک جێگری کاپتن' : ' as vice-captain') : ''
      if (m.label === 'OWN_START' && m.ownStart) {
        const p = m.ownStart
        const samePosition = [...(ownStartResp.players || [])].filter((x) => x.position === p.position).sort((a, b) => b.predicted_xp - a.predicted_xp)
        const squadRank = samePosition.findIndex((x) => x.stable_player_id === p.stable_player_id) + 1
        const roleTextEn = isFutureForecast ? (p.role === 'XI' ? 'was selected in the starting XI' : 'was placed on the bench') : (p.role === 'XI' ? 'started' : 'was on the bench (did not count)')
        const roleTextKu = isFutureForecast ? (p.role === 'XI' ? 'هەڵبژێردراوە بۆ یاریی سەرەکی' : 'خرایە سەر یەدەگ') : (p.role === 'XI' ? 'دەستی پێکرد' : 'لەسەر یەدەگ بوو (نەژمێردرا)')
        const transferText = p.was_transferred_in_this_gw
          ? (lang === 'ku' ? ' ئەم یاریزانە لەم گەڕەدا گوازراوەتەوە ناو تیمەکە.' : ' He was transferred INTO the squad this gameweek.')
          : (lang === 'ku' ? ' ئەم یاریزانە لە تیمی پێشوو پارێزراوە (گواستنەوە نییە لەم گەڕەدا).' : ' He was retained from the prior squad (no transfer this gameweek).')
        factsText = lang === 'ku'
          ? `${target.name} لە AI Manager (تیمی تایبەتی خۆت) بۆ GW${gw} دایە، نەک لە ${otherLabels.map((l) => OBJECT_LABELS[l]).join('، ')}.${transferText} ${roleTextKu}${capText}. خاڵی پێشبینیکراو ${xpText} (پلە #${squadRank} لە ${samePosition.length} یاریزانی ${p.position} لەم تیمەدا${leagueRankText ? `، ${leagueRankText}` : ''})، نرخ ${priceText}.`
          : `${target.name} is in the AI Manager (your continuing squad) for GW${gw}, not in ${otherLabels.map((l) => OBJECT_LABELS[l]).join(', ')}.${transferText} He ${roleTextEn}${capText}, with a predicted xP of ${xpText} (ranked #${squadRank} of ${samePosition.length} ${p.position}s in this squad${leagueRankText ? `, ${leagueRankText}` : ''}), price ${priceText}.`
      } else {
        const otherObjectNames = allLabels.filter((l) => l !== m.label).map((l) => OBJECT_LABELS[l]).join(', ')
        const roleTextEn = isFutureForecast ? 'was selected in the starting XI' : 'started'
        const roleTextKu = isFutureForecast ? 'هەڵبژێردراوە بۆ یاریی سەرەکی' : 'دەستی پێکرد'
        factsText = lang === 'ku'
          ? `${target.name} لە ${objLabel} بۆ GW${gw} دایە، نەک لە ${otherObjectNames}. ${roleTextKu}${capText}. خاڵی پێشبینیکراو ${xpText}${leagueRankText ? `، ${leagueRankText}` : ''}، نرخ ${priceText}. تێبینی: ${objLabel} تەنها پێکهاتەی یاریی سەرەکییە (١١ یاریزان) -- زانیاری یەدەگ/گۆڕینی خۆکار بۆ ئەم بابەتە بەردەست نییە.`
          : `${target.name} is in ${objLabel} for GW${gw}, not in ${otherObjectNames}. He ${roleTextEn}${capText}, with a predicted xP of ${xpText}${leagueRankText ? `, ${leagueRankText}` : ''}, price ${priceText}. Note: ${objLabel} is a starting-XI-only object (11 players) -- bench/autosub information isn't available for it.`
      }
    } else {
      // Present in more than one object -- explain each briefly rather
      // than guessing which one the user meant, per spec.
      const perObjectLines = memberships.map((m) => {
        const capText = m.isCaptain ? (lang === 'ku' ? ' (کاپتن)' : ' (captain)') : m.isVice ? (lang === 'ku' ? ' (جێگری کاپتن)' : ' (vice-captain)') : ''
        const roleText = m.role === 'BENCH' ? (lang === 'ku' ? 'یەدەگ' : 'bench') : (lang === 'ku' ? 'یاریی سەرەکی' : 'starting XI')
        return `- ${OBJECT_LABELS[m.label]}: ${roleText}${capText}`
      })
      factsText = lang === 'ku'
        ? `${target.name} لە چەند پێکهاتەیەکی GW${gw} دا هەڵبژێردراوە:\n${perObjectLines.join('\n')}\nخاڵی پێشبینیکراو ${xpText}${leagueRankText ? `، ${leagueRankText}` : ''}، نرخ ${priceText}.`
        : `${target.name} is selected in more than one GW${gw} decision object:\n${perObjectLines.join('\n')}\nPredicted xP ${xpText}${leagueRankText ? `, ${leagueRankText}` : ''}, price ${priceText}.`
    }

    // For an explicit "why" question, add the tradeoff/context evidence a
    // useful explanation needs beyond bare xP/rank -- fixture, expected
    // minutes, and the nearest same-position alternative by forecast --
    // rather than only ever a list of numbers. Never invents a tactical
    // role, injury assessment, or optimizer reasoning not present in the
    // retrieved data.
    if (isWhyQuestion) {
      const fixtureBit = target.opponent_resolved
        ? `${lang === 'ku' ? 'یاری بەرامبەر' : 'fixture: vs'} ${target.opponent_resolved}${target.was_home === true ? (lang === 'ku' ? ' (ماڵەوە)' : ' (home)') : target.was_home === false ? (lang === 'ku' ? ' (دەرەوە)' : ' (away)') : ''}`
        : null
      const minutesBit = target.expected_minutes != null
        ? (lang === 'ku' ? `خولەکی پێشبینیکراو ${target.expected_minutes}` : `expected minutes ${target.expected_minutes}`)
        : null
      const extras = [fixtureBit, minutesBit].filter(Boolean).join(lang === 'ku' ? '، ' : ', ')
      if (extras) factsText += lang === 'ku' ? ` ${extras}.` : ` ${extras}.`

      const altAbove = leagueIdx > 0 ? samePositionLeaguePool[leagueIdx - 1] : null
      const altBelow = leagueIdx >= 0 && leagueIdx + 1 < samePositionLeaguePool.length ? samePositionLeaguePool[leagueIdx + 1] : null
      const altCandidate = altAbove ?? altBelow
      if (altCandidate) {
        const xpDiff = (altCandidate.predicted_xp ?? 0) - (target.predicted_xp ?? 0)
        const priceDiff = altCandidate.price != null && target.price != null ? altCandidate.price - target.price : null
        const priceDiffText = priceDiff != null && Math.abs(priceDiff) > 0.05
          ? (lang === 'ku' ? `، جیاوازی نرخ ${priceDiff >= 0 ? '+' : ''}£${priceDiff.toFixed(1)}m` : `, price difference ${priceDiff >= 0 ? '+' : ''}£${priceDiff.toFixed(1)}m`)
          : ''
        // Distinguishes an UNRESTRICTED forecast-only candidate (this
        // sentence) from a legally affordable replacement (budget/
        // ownership/free-transfer rules checked) -- these are different
        // questions, and a bare xP-difference comparison omits the
        // material budget tradeoff of actually making the swap.
        factsText += lang === 'ku'
          ? ` نزیکترین بژاردەی هاوپۆزیشن بەپێی پێشبینی (بێ سنوور، بێ پشکنینی یاسایی): ${altCandidate.name} (xP ${altCandidate.predicted_xp ?? 'n/a'}${xpDiff !== 0 ? `، ${xpDiff >= 0 ? '+' : ''}${xpDiff.toFixed(2)} بەراورد بە ${target.name}` : ''}${priceDiffText}). ئەمە یاسایی گواستنەوە (بوودجە/خاوەندارێتی) ناپشکنێت -- بۆ ئەوە داوای \"جێگرەوەی یاسایی\" بکە.`
          : ` Nearest same-position alternative by forecast (unrestricted, not a legality check): ${altCandidate.name} (xP ${altCandidate.predicted_xp ?? 'n/a'}${xpDiff !== 0 ? `, ${xpDiff >= 0 ? '+' : ''}${xpDiff.toFixed(2)} vs ${target.name}` : ''}${priceDiffText}). This does not check budget/ownership/free-transfer legality -- ask for a "legal transfer" check for that.`
      }
      // Explicit statement of what evidence supports this explanation vs.
      // what optimizer rationale (formation/budget tradeoffs actually
      // weighed at selection time) was never preserved in the export.
      factsText += lang === 'ku'
        ? ' ئەم پێداویستییانەی سەرەوە لە کۆگای پارێزراودا هاتوون؛ هۆکاری تەواوی هەڵبژاردنی مۆدێل (وەک بوودجە یان پێکهاتە) لە کۆکراوەی هەناردەکراودا نەپاراستراوە.'
        : ' The figures above come directly from the preserved forecast/rank/price evidence; the model\'s full selection rationale (e.g. exact formation/budget tradeoffs weighed at selection time) was not preserved in the exported artifact.'
    }

    // Official FPL availability vs. model P(start) -- always disclosed when
    // an official chance-of-playing figure exists (a real doubt/injury
    // flag is material context regardless of what was literally asked),
    // and also whenever the question explicitly asks about availability/
    // chance/injury (e.g. "Is Gakpo's 75% official or predicted?").
    factsText += availabilityClause(target, lang, isAvailabilityQuestion(q))

    const answerText = isWhyQuestion || memberships.length !== 1 ? await naturalize(factsText, lang, [target.name]) : factsText
    return {
      answer: answerText, intent, requestedGameweek: gw, contextStatus: 'GENERAL', sourceTypes,
      sourceBadge: memberships.length === 1 ? `${citation(model, gw)} • ${OBJECT_LABELS[memberships[0].label]}` : `${citation(model, gw)} • Cross-object`,
      referencedPlayers,
      suggestedFollowups: withoutUnsolicitedV0([`Alternatives to ${target.name}`, `Show ${OBJECT_LABELS.OWN_START} GW${gw}`], pageContext, `Show ${OBJECT_LABELS.OWN_START} GW${gw}`),
      generatedAt: new Date().toISOString(), dataSnapshot: 'RESEARCH_ARTIFACT_CROSS_OBJECT',
      llmUsed: answerText !== factsText, responseTimeMs: Date.now() - t0,
      researchModel: model, researchGameweek: gw, researchArtifactStatus: 'AVAILABLE',
    }
  }

  // No player named in the message -- fall back to object-level summaries
  // below, using the same object/tab precedence as before.

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
          id: p.stable_player_id ?? -1, name: p.name, webName: p.web_name ?? p.name, club: '', position: p.position as any,
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
  const mentionResult = resolvePlayerMention(question, players)
  if (mentionResult.kind === 'AMBIGUOUS') {
    // A genuine collision (e.g. a Kurdish-script mention matching more
    // than one distinct player) -- ask one targeted question rather than
    // silently picking the first candidate or falling through to the
    // generic manager summary.
    const names = mentionResult.candidates.map((p) => p.name).join(', ')
    return {
      answer: lang === 'ku'
        ? `کامیان مەبەستتە: ${names}؟`
        : `Which player did you mean: ${names}?`,
      intent, requestedGameweek: gw, contextStatus: 'GENERAL', sourceTypes,
      sourceBadge: `${citation(model, gw)} • Clarification needed`,
      referencedPlayers: mentionResult.candidates.slice(0, 5).map(toReferencedPlayer),
      suggestedFollowups: withoutUnsolicitedV0(mentionResult.candidates.slice(0, 2).map((p) => `Why was ${p.name} selected?`), pageContext, `Show ${OBJECT_LABELS.OWN_START} GW${gw}`),
      generatedAt: new Date().toISOString(), dataSnapshot: 'RESEARCH_ARTIFACT_CLARIFICATION_NEEDED',
      llmUsed: false, responseTimeMs: Date.now() - t0, researchModel: model, researchGameweek: gw, researchArtifactStatus: resp.status,
    }
  }
  const mentioned = mentionResult.kind === 'FOUND' ? mentionResult.player : undefined

  let answer: string
  let referencedPlayers: ReferencedPlayer[]
  let llmUsedForAnswer = false

  const isFutureForecast = resp.status === 'FINAL_FROZEN_FORECAST'
  const modelLabel = publicModelLabel(model, lang)

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
    // بۆچی = "why" (Sorani), هەڵبژێردراوە/هەڵبژاردن = "selected" -- from
    // the acceptance test "بۆچی فۆدن بۆ هەفتەی چوارەم هەڵبژێردراوە؟".
    const isWhyQuestion = /\bwhy\b|\bselect/.test(q) || q.includes('بۆچی') || q.includes('هەڵبژار')
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
      // Built directly in the resolved answer language -- correct even if
      // the naturalize() LLM call fails/times out, not solely dependent on
      // the LLM to also perform translation (matches how every other
      // dual-language branch in this file works).
      let whyFacts: string
      if (lang === 'ku') {
        const roleTextKu = isFutureForecast
          ? (mentioned.role === 'XI' ? 'هەڵبژێردراوە بۆ یاریی سەرەکی' : 'خرایە سەر یەدەگ')
          : (mentioned.role === 'XI' ? 'دەستی پێکرد' : 'لەسەر یەدەگ بوو (نەژمێردرا)')
        const capTextKu = mentioned.is_captain ? ' وەک کاپتن' : mentioned.is_vice ? ' وەک جێگری کاپتن' : ''
        whyFacts =
          `لە ${modelLabel} بۆ GW${gw} دا، ${mentioned.name} ${roleTextKu}${capTextKu}. بەڵگەی پێش کۆتایی بەردەستە: خاڵی پێشبینیکراو ${mentioned.predicted_xp} ` +
          `(پلە #${squadRank} لە ${samePosition.length} یاریزانی ${mentioned.position} لەم تیمەدا بەپێی خاڵی پێشبینیکراو${leagueRankText ? `، و پلە لە ئاستی هەموو لیگدا بەردەستە` : ''})، نرخ ${priceText}. ` +
          (mentioned.role === 'XI'
            ? `ئەمە نیشان دەدات کە بەپێی بەڵگەی پێشبینی پێش کۆتایی باش بووە -- بەخۆیەوە هۆکاری تەواوی هەڵبژاردن نییە (وەک بوودجە/پێکهاتە)، کە لە کۆکراوەکەدا نەپاراستراوە.`
            : `هۆکاری وردی هەڵبژاردن جگە لەم ژمارانە (وەک بوودجە/پێکهاتە) لە کۆکراوەکەدا نەپاراستراوە.`)
      } else {
        whyFacts =
          `In ${modelLabel} for GW${gw}, ${mentioned.name} ${roleText}${capText}. Predeadline evidence available: predicted xP ${mentioned.predicted_xp} ` +
          `(ranked #${squadRank} of ${samePosition.length} ${mentioned.position}s in this squad by predicted xP${leagueRankText}), price ${priceText}. ` +
          (mentioned.role === 'XI'
            ? `This shows he ranked well on predeadline forecast evidence -- it is not, by itself, the model's full selection rationale (budget/formation tradeoffs), which was not preserved in the exported artifact.`
            : `The detailed selection rationale beyond these predeadline numbers (e.g. exact formation/budget tradeoffs considered) was not preserved in the exported artifact.`)
      }
      answer = await naturalize(whyFacts, lang, [mentioned.name])
      llmUsedForAnswer = answer !== whyFacts
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
        ? `${modelLabel}، ${OBJECT_LABELS.OWN_START}، GW${gw}${gwUsedNote('ku')}: ${isFutureForecast ? 'هێشتا خاڵی ڕاستەقینە بەردەست نییە.' : `کۆی خاڵی نیشتەجێ ${resp.net_points ?? 'نەزانراو'}`}. کاپتن: ${captain?.name || 'نەزانراو'}. باشترین یاریزانان: ${list.join('; ')}.`
        : `${modelLabel} ${OBJECT_LABELS.OWN_START} for GW${gw}${gwUsedNote('en')}: ${pointsText} Captain: ${captain?.name || 'unknown'}. Top starters: ${list.join('; ')}.`
    referencedPlayers = xi.slice(0, 5).map(toReferencedPlayer)
  }

  return {
    answer,
    intent,
    requestedGameweek: gw,
    contextStatus: 'GENERAL',
    sourceTypes,
    sourceBadge: `${citation(model, gw, resp.artifact_version)} • ${OBJECT_LABELS.OWN_START}`,
    referencedPlayers,
    suggestedFollowups: withoutUnsolicitedV0(
      gw > 1
        ? [`Compare M3_SHRUNK and V0_CONTROL for GW${gw}`, `What changed between GW${gw - 1} and GW${gw}?`]
        : [`Compare M3_SHRUNK and V0_CONTROL for GW${gw}`, `Show GW${gw + 1} forecast`],
      pageContext, `Show GW${gw} Best XI`
    ),
    generatedAt: new Date().toISOString(),
    dataSnapshot: 'RESEARCH_ARTIFACT_HISTORICAL_RECONSTRUCTION',
    llmUsed: llmUsedForAnswer,
    responseTimeMs: Date.now() - t0,
    researchModel: model,
    researchGameweek: gw,
    researchArtifactVersion: resp.artifact_version,
    researchArtifactStatus: resp.status,
  }
}
