// Grounds Ennovera fantasy-chat answers about the verified M3_SHRUNK / V0_CONTROL
// research artifacts. Runs server-side (called from chatEngine.ts inside the
// /api/fantasy/chat route), so it fetches the backend directly rather than
// through the client-facing /api/research-fpl/* proxy routes.
//
// Every number in the answers below comes straight from the fetched artifact.
// The LLM is never used to produce these answers -- the governance rules for
// this integration require deterministic numerical grounding for M3/V0
// research-model queries, with no invented scores, rankings, or legality.

import type { ChatIntent, DataSourceType, FantasyChatResponse, ReferencedPlayer } from './types'

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

function upstreamBase(): string {
  return (process.env.BACKEND_INTERNAL_URL || process.env.VPS_BACKEND_URL || 'http://127.0.0.1:8000').trim().replace(/\/+$/, '')
}

async function fetchOwnStart(gw: number, model: ResearchModel): Promise<OwnStartResponse> {
  const url = `${upstreamBase()}/api/v1/research-fpl/gameweek/${gw}/own-start?model=${encodeURIComponent(model)}`
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 4000)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)
    if (!res.ok) {
      return { status: 'NOT_AVAILABLE', reason: `Research API returned HTTP ${res.status}.`, model, gameweek: gw }
    }
    return await res.json()
  } catch {
    return { status: 'NOT_AVAILABLE', reason: 'Research API unreachable.', model, gameweek: gw }
  }
}

function parseGameweek(q: string, fallback: number): number {
  const m = q.match(/gw\s*([1-4])\b/) || q.match(/gameweek\s*([1-4])\b/)
  return m ? parseInt(m[1], 10) : fallback
}

function parseTwoGameweeks(q: string, fallback: number): [number, number] {
  const gwNums = Array.from(q.matchAll(/(?:gw|gameweek)\s*([1-4])\b/g)).map((m) => parseInt(m[1], 10))
  if (gwNums.length >= 2 && gwNums[0] !== gwNums[1]) return [gwNums[0], gwNums[1]]
  const single = parseGameweek(q, fallback)
  return [Math.max(1, single - 1), single]
}

function parseModel(q: string): ResearchModel | 'BOTH' {
  const hasM3 = q.includes('m3_shrunk') || q.includes('m3 shrunk') || /\bm3\b/.test(q)
  const hasV0 = q.includes('v0_control') || q.includes('v0 control') || /\bv0\b/.test(q)
  if (hasM3 && hasV0) return 'BOTH'
  if (hasV0) return 'V0_CONTROL'
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

export async function buildResearchGroundedAnswer(
  question: string,
  intent: ChatIntent,
  lang: 'en' | 'ku'
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
    const model = parseModel(q) === 'BOTH' ? 'M3_SHRUNK' : (parseModel(q) as ResearchModel)
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
  const modelSel = parseModel(q)
  const gw = parseGameweek(q, 3)

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
