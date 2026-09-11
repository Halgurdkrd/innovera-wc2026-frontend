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
  return /\baverage\b|\bmean\b/.test(q) && /\bupside\b|\brange\b|\bhigher\b|\bp80\b|\bp90\b|\bpercentile\b/.test(q)
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

// The ONE narrow, optional use of an LLM in this file -- given an already-
// computed, fact-complete deterministic answer, asks the existing Groq
// provider to rephrase it more naturally. Bounded timeout; any failure,
// timeout, empty response, or the model echoing back an obviously-truncated
// reply falls back to the original deterministic text unchanged. Never
// used for retrieval, ranking, legality, or arithmetic -- purely cosmetic
// phrasing of facts already fully determined before this is called.
async function naturalize(factsText: string, lang: 'en' | 'ku'): Promise<string> {
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
    return rephrased && rephrased.length > 10 ? rephrased : factsText
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
  // جێگرەوە = "substitute/replacement" -- the Sorani word behind the
  // acceptance test "جێگرەوەکانی کێن؟" ("who are the alternatives?").
  const mentionsAlternative = /\baltern\w*tiv\w*\b/.test(q) || /\bsubstitutes?\s+for\b|\binstead\s+of\b/.test(q) || q.includes('جێگرەوە')
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
}

export type PlayerMentionResult =
  | { kind: 'FOUND'; player: OwnStartPlayer }
  | { kind: 'AMBIGUOUS'; candidates: OwnStartPlayer[] }
  | { kind: 'NONE' }

// Resolves a player mention to a stable ID (via the matched OwnStartPlayer,
// which always carries stable_player_id), preferring exact Latin
// substring matches and known aliases over the heuristic consonant-
// skeleton matcher, and explicitly reporting a COLLISION (multiple
// distinct players sharing the same matched skeleton) as ambiguous
// rather than silently picking the first one found.
function resolvePlayerMention(question: string, players: OwnStartPlayer[]): PlayerMentionResult {
  const q = question.toLowerCase()
  const latinMatches = players.filter((p) => {
    const parts = p.name.toLowerCase().split(/\s+/).filter((w) => w.length > 2)
    return parts.some((part) => q.includes(part))
  })
  if (latinMatches.length === 1) return { kind: 'FOUND', player: latinMatches[0] }
  if (latinMatches.length > 1) {
    // Multiple players share a substring of their name (e.g. two "Silva"s)
    // -- a real collision, not resolved by guessing the first.
    const distinctIds = new Set(latinMatches.map((p) => p.stable_player_id))
    if (distinctIds.size > 1) return { kind: 'AMBIGUOUS', candidates: latinMatches }
    return { kind: 'FOUND', player: latinMatches[0] }
  }
  if (!isSoraniScript(question)) return { kind: 'NONE' }

  // Known-alias check (exact, verified) before the heuristic fallback.
  for (const [alias, englishFragment] of Object.entries(KNOWN_KURDISH_ALIASES)) {
    if (q.includes(alias)) {
      const matches = players.filter((p) => p.name.toLowerCase().includes(englishFragment.toLowerCase()))
      if (matches.length === 1) return { kind: 'FOUND', player: matches[0] }
      if (matches.length > 1) return { kind: 'AMBIGUOUS', candidates: matches }
    }
  }

  // Heuristic phonetic transliteration fallback (e.g. "فۆدن" for "Foden"
  // when no known alias/full name matched) -- NOT relied on alone: any
  // skeleton collision across multiple distinct players is reported as
  // ambiguous rather than picking whichever happens to be first in the array.
  const tokens = question.split(/\s+/).map(transliterateToLatinSkeleton).filter((t) => t.length >= 3)
  if (tokens.length === 0) return { kind: 'NONE' }
  const skeletonMatches = players.filter((p) => {
    const nameParts = p.name.toLowerCase().split(/\s+/).filter((w) => w.length > 2)
    const nameSkeletons = nameParts.map((w) => w.replace(/[aeiouwy]/g, ''))
    return tokens.some((t) => nameSkeletons.some((ns) => ns.length >= 3 && (ns === t || ns.includes(t) || t.includes(ns))))
  })
  const distinctSkeletonIds = new Set(skeletonMatches.map((p) => p.stable_player_id))
  if (distinctSkeletonIds.size === 1) return { kind: 'FOUND', player: skeletonMatches[0] }
  if (distinctSkeletonIds.size > 1) return { kind: 'AMBIGUOUS', candidates: skeletonMatches }
  return { kind: 'NONE' }
}

function findMentionedPlayer(question: string, players: OwnStartPlayer[]): OwnStartPlayer | undefined {
  const result = resolvePlayerMention(question, players)
  // Existing callers (alternatives detection, average-vs-upside) keep
  // their current behavior -- ambiguous collisions fall through to
  // whatever they already do for "no player named" rather than every
  // call site needing to handle a three-way result. The main named-
  // player branch below uses resolvePlayerMention() directly so it CAN
  // ask a clarifying question on a genuine collision.
  return result.kind === 'FOUND' ? result.player : undefined
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
        ? `گۆڕانکارییەکانی ${publicModelLabel(model, 'ku')} لە GW${gwA} بۆ GW${gwB}:`
        : `Changes in ${publicModelLabel(model, 'en')} from GW${gwA} to GW${gwB}:`
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
    const qLower = question.toLowerCase()
    const target = pool.players.find((p) => {
      const parts = p.name.toLowerCase().split(/\s+/).filter((w) => w.length > 2)
      return parts.some((part) => qLower.includes(part))
    })
    if (!target) {
      return {
        answer: `Which player did you mean? I can explain the average-vs-upside relationship for any GW${gw} player if you name them.`,
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
    const answerText = await naturalize(factsText, lang)
    return {
      answer: answerText, intent, requestedGameweek: gw, contextStatus: 'GENERAL', sourceTypes,
      sourceBadge: `${citation(model, gw)} • Outlook explanation`,
      referencedPlayers: [{
        id: target.stable_player_id, name: target.name, webName: target.name, club: target.club, position: target.position,
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
      answer = await naturalize(whyFacts, lang)
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
    llmUsed: llmUsedForAnswer,
    responseTimeMs: Date.now() - t0,
    researchModel: model,
    researchGameweek: gw,
    researchArtifactVersion: resp.artifact_version,
    researchArtifactStatus: resp.status,
  }
}
