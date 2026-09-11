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
}

export type ObjectLabel = 'OWN_START' | 'A_BLANK_SLATE' | 'B_LEGAL_BEST_XI' | 'PRIMARY' | 'OPTIONAL_XI_1' | 'OPTIONAL_XI_2' | 'OPTIONAL_XI_3' | 'OPTIONAL_XI_4'

interface ObjectMember {
  stable_player_id: number | null
  name: string
  position: string
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
    if (!res.ok) {
      return { status: 'NOT_AVAILABLE', reason: `Research API returned HTTP ${res.status}.`, model, gameweek: gw }
    }
    return await res.json()
  } catch {
    return { status: 'NOT_AVAILABLE', reason: 'Research API unreachable.', model, gameweek: gw }
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
      return { status: 'NOT_AVAILABLE', reason: `Research API returned HTTP ${res.status}.` }
    }
    return await res.json()
  } catch {
    return { status: 'NOT_AVAILABLE', reason: 'Research API unreachable.' }
  }
}

function parseGameweek(q: string, fallback: number): number {
  const m = q.match(/gw\s*([1-4])\b/) || q.match(/gameweek\s*([1-4])\b/)
  return m ? parseInt(m[1], 10) : fallback
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

  const na = (reason: string, gw: number, model: ResearchModel): FantasyChatResponse => ({
    answer:
      lang === 'ku'
        ? `ئەم زانیارییە بەردەست نییە: ${reason}`
        : `That information is not available yet: ${reason}`,
    intent,
    requestedGameweek: gw,
    contextStatus: 'GENERAL',
    sourceTypes,
    sourceBadge: `${model} GW${gw} • Not available`,
    referencedPlayers: [],
    suggestedFollowups: ['Show M3_SHRUNK GW3 own start', 'Compare M3_SHRUNK and V0_CONTROL for GW2'],
    generatedAt: new Date().toISOString(),
    dataSnapshot: 'RESEARCH_ARTIFACT_NOT_AVAILABLE',
    llmUsed: false,
    responseTimeMs: Date.now() - t0,
    researchModel: model,
    researchGameweek: gw,
    researchArtifactStatus: 'NOT_AVAILABLE',
  })

  if (intent === 'GAMEWEEK_DELTA') {
    const model = parseModel(q, history) === 'BOTH' ? 'M3_SHRUNK' : (parseModel(q, history) as ResearchModel)
    const [gwA, gwB] = parseTwoGameweeks(q, 3)
    const [respA, respB] = await Promise.all([fetchOwnStart(gwA, model), fetchOwnStart(gwB, model)])

    if (respA.status !== 'HISTORICAL_RECONSTRUCTION' && respA.status !== 'FINAL_FROZEN_FORECAST') {
      return na(respA.reason || `${model} GW${gwA} is not available.`, gwA, model)
    }
    if (respB.status !== 'HISTORICAL_RECONSTRUCTION' && respB.status !== 'FINAL_FROZEN_FORECAST') {
      return na(respB.reason || `${model} GW${gwB} is not available.`, gwB, model)
    }

    const inA = new Set((respA.players || []).map((p) => p.stable_player_id))
    const inB = new Set((respB.players || []).map((p) => p.stable_player_id))
    const droppedOut = (respA.players || []).filter((p) => !inB.has(p.stable_player_id))
    const broughtIn = (respB.players || []).filter((p) => !inA.has(p.stable_player_id))
    const transfer = respB.transfer_event
    const netDelta = (respB.net_points ?? 0) - (respA.net_points ?? 0)

    const lines: string[] = []
    lines.push(
      lang === 'ku'
        ? `گۆڕانکارییەکانی ${model} لە GW${gwA} بۆ GW${gwB}:`
        : `Changes for ${model} from GW${gwA} to GW${gwB}:`
    )
    if (transfer && transfer.player_out && transfer.player_in) {
      lines.push(`- Transfer: ${transfer.player_out} → ${transfer.player_in}`)
    } else if (broughtIn.length > 0 || droppedOut.length > 0) {
      lines.push(`- Squad changes: out ${droppedOut.map((p) => p.name).join(', ') || 'none'}; in ${broughtIn.map((p) => p.name).join(', ') || 'none'}`)
    } else {
      lines.push('- No squad transfer recorded between these gameweeks.')
    }
    lines.push(`- Net points: GW${gwA}=${respA.net_points} → GW${gwB}=${respB.net_points} (${netDelta >= 0 ? '+' : ''}${netDelta.toFixed(1)})`)

    return {
      answer: lines.join('\n'),
      intent,
      requestedGameweek: gwB,
      contextStatus: 'GENERAL',
      sourceTypes,
      sourceBadge: `${citation(model, gwA, respA.artifact_version)} vs ${citation(model, gwB, respB.artifact_version)}`,
      referencedPlayers: [...droppedOut, ...broughtIn].map(toReferencedPlayer),
      suggestedFollowups: [`Compare M3_SHRUNK and V0_CONTROL for GW${gwB}`, `Who was the ${model} captain in GW${gwB}?`],
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

  if (modelSel === 'BOTH' || q.includes('compare') || q.includes(' vs ')) {
    const [m3, v0] = await Promise.all([fetchOwnStart(gw, 'M3_SHRUNK'), fetchOwnStart(gw, 'V0_CONTROL')])
    if (m3.status !== 'HISTORICAL_RECONSTRUCTION' && m3.status !== 'FINAL_FROZEN_FORECAST') {
      return na(m3.reason || `M3_SHRUNK GW${gw} is not available.`, gw, 'M3_SHRUNK')
    }
    if (v0.status !== 'HISTORICAL_RECONSTRUCTION' && v0.status !== 'FINAL_FROZEN_FORECAST') {
      return na(v0.reason || `V0_CONTROL GW${gw} is not available.`, gw, 'V0_CONTROL')
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
      suggestedFollowups:
        gw > 1
          ? [`Show M3_SHRUNK GW${gw} own start`, `What changed for M3_SHRUNK between GW${gw - 1} and GW${gw}?`]
          : [`Show M3_SHRUNK GW${gw} own start`, `Compare M3_SHRUNK and V0_CONTROL for GW${gw + 1}`],
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
      return na(objResp.reason || `${model} GW${gw} ${objLabel} is not available.`, gw, model)
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
    if (objResp.note) lines.push(`- ${objResp.note}`)

    const referencedPlayers: ReferencedPlayer[] = membership
      ? membership.slice(0, 6).map((p) => ({
          id: p.stable_player_id ?? -1, name: p.name, webName: p.name, club: '', position: p.position as any,
          price: 0, predictedXp: 0, actualPoints: null, matchStatus: 'NOT_STARTED', isCaptain: p.name === objResp.captain, isViceCaptain: p.name === objResp.vice,
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
      suggestedFollowups: [`Show ${model} GW${gw} AI Manager`, `Compare M3_SHRUNK and V0_CONTROL for GW${gw}`],
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
    return na(resp.reason || `${model} GW${gw} is not available.`, gw, model)
  }
  const players = resp.players || []
  const mentioned = findMentionedPlayer(question, players)

  let answer: string
  let referencedPlayers: ReferencedPlayer[]

  if (mentioned) {
    // Selection-explanation style answer for one named player.
    referencedPlayers = [toReferencedPlayer(mentioned)]
    const roleText = mentioned.role === 'XI' ? 'started' : 'was on the bench (did not count)'
    const capText = mentioned.is_captain ? ' as captain' : mentioned.is_vice ? ' as vice-captain' : ''
    const actualText = mentioned.actual_points !== null ? `, scoring ${mentioned.actual_points} actual points` : ' (no completed-match result recorded)'
    answer =
      lang === 'ku'
        ? `لە ${model} GW${gw} دا، ${mentioned.name} ${roleText}${capText} بە ٪xP پێشبینیکراوی ${mentioned.predicted_xp}${actualText}.`
        : `In ${model} GW${gw}, ${mentioned.name} ${roleText}${capText} with a predicted xP of ${mentioned.predicted_xp}${actualText}.`

    if (mentioned.role === 'BENCH') {
      const nearestStarter = [...players]
        .filter((p) => p.role === 'XI' && p.position === mentioned.position)
        .sort((a, b) => a.predicted_xp - b.predicted_xp)[0]
      if (nearestStarter) {
        answer += lang === 'ku'
          ? ` نزیکترین بژاردەی جێگرەوە لەم پۆزیشنە ${nearestStarter.name} بوو (٪xP=${nearestStarter.predicted_xp}).`
          : ` The nearest alternative in that position who started was ${nearestStarter.name} (xP=${nearestStarter.predicted_xp}).`
        referencedPlayers.push(toReferencedPlayer(nearestStarter))
      }
    }
  } else {
    const xi = players.filter((p) => p.role === 'XI').sort((a, b) => b.predicted_xp - a.predicted_xp)
    const captain = players.find((p) => p.is_captain)
    const list = xi.slice(0, 5).map((p) => `${p.name} (${p.position}, xP=${p.predicted_xp}${p.actual_points !== null ? `, actual=${p.actual_points}` : ''})`)
    answer =
      lang === 'ku'
        ? `${model} GW${gw}: کۆی خاڵی نیشتەجێ ${resp.net_points} (کۆی گشتی ${resp.gross_points}). کاپتن: ${captain?.name || 'نەزانراو'}. باشترین یاریزانان: ${list.join('; ')}.`
        : `${model} GW${gw}: net points ${resp.net_points} (gross ${resp.gross_points}). Captain: ${captain?.name || 'unknown'}. Top starters: ${list.join('; ')}.`
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
    suggestedFollowups:
      gw > 1
        ? [`Compare M3_SHRUNK and V0_CONTROL for GW${gw}`, `What changed for ${model} between GW${gw - 1} and GW${gw}?`]
        : [`Compare M3_SHRUNK and V0_CONTROL for GW${gw}`, `Show ${model} GW${gw + 1} own start`],
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
