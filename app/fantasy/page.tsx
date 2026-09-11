'use client'

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { PitchVisualization } from '@/components/fantasy/PitchVisualization'
import { AskEnnoveraChat } from '@/components/fantasy/AskEnnoveraChat'
import ErrorState from '@/components/ui/ErrorState'
import { useLanguage } from '@/hooks/useLanguage'
import type { FPLPlayer } from '@/lib/api/types'

// Ennovera Fantasy -- the M3_SHRUNK-backed public fantasy experience.
// V0_CONTROL and FPL-03 remain in the codebase/backend for internal
// benchmarking and recovery, but are not part of this public display.
// GW1-3 is a historical reconstruction of already-completed gameweeks;
// a further gameweek is shown only once a real registered final pair
// exists (never assumed, never fabricated).

const MODEL = 'M3_SHRUNK' as const

type ObjectLabel = 'B_LEGAL_BEST_XI' | 'OWN_START' | 'A_BLANK_SLATE' | 'PRIMARY' | 'OPTIONAL_XI_1' | 'OPTIONAL_XI_2' | 'OPTIONAL_XI_3' | 'OPTIONAL_XI_4'

// Exact required order -- Best XI first and default.
const TABS: { id: ObjectLabel; title: string }[] = [
  { id: 'B_LEGAL_BEST_XI', title: 'Best XI' },
  { id: 'OWN_START', title: 'AI Manager' },
  { id: 'A_BLANK_SLATE', title: 'Best £100m Squad' },
  { id: 'PRIMARY', title: 'Optional XI: Primary' },
  { id: 'OPTIONAL_XI_1', title: 'Optional XI 1' },
  { id: 'OPTIONAL_XI_2', title: 'Optional XI 2' },
  { id: 'OPTIONAL_XI_3', title: 'Optional XI 3' },
  { id: 'OPTIONAL_XI_4', title: 'Optional XI 4' },
]
const TAB_IDS = new Set(TABS.map((t) => t.id))
const DEFAULT_TAB: ObjectLabel = 'B_LEGAL_BEST_XI'
const HISTORICAL_MAX_GW = 3

// Short, honest description of each object's real constraints -- these are
// genuinely different selections with different rules, never a claim that
// one is "better" than another.
const TAB_DESCRIPTIONS: Record<ObjectLabel, string> = {
  B_LEGAL_BEST_XI: 'An alternative starting XI: the highest-xP legal XI for this gameweek. No reserve bench or automatic substitutions.',
  OWN_START: 'Persistent season-long manager: carried squad, bank, free transfers, and one real transfer decision per gameweek.',
  A_BLANK_SLATE: 'A fresh 15-player squad for this gameweek, including starters and substitutes.',
  PRIMARY: 'An alternative starting XI for this gameweek. No reserve bench or automatic substitutions.',
  OPTIONAL_XI_1: 'An alternative starting XI for this gameweek. No reserve bench or automatic substitutions.',
  OPTIONAL_XI_2: 'An alternative starting XI for this gameweek. No reserve bench or automatic substitutions.',
  OPTIONAL_XI_3: 'An alternative starting XI for this gameweek. No reserve bench or automatic substitutions.',
  OPTIONAL_XI_4: 'An alternative starting XI for this gameweek. No reserve bench or automatic substitutions.',
}

interface PlayerRow {
  stable_player_id: number
  name: string
  club: string
  position: 'GK' | 'DEF' | 'MID' | 'FWD'
  price: number | null
  role: 'XI' | 'BENCH'
  is_captain: boolean
  is_vice: boolean
  predicted_xp: number | null
  actual_points: number | null
  counted_contribution: number | null
  was_transferred_in_this_gw: boolean
  p_start?: number | null
  p_sub?: number | null
  p_dnp?: number | null
  expected_minutes?: number | null
  probability_fields_available?: boolean
  minutes?: number
  id_resolved?: boolean
  opponent?: string | null
  opponent_resolved?: string | null
  was_home?: boolean | null
  fixture_id?: string | null
  likely_range?: [number, number] | null
  upside_score?: number | null
  high_upside_score?: number | null
  prob_10_plus?: number | null
  prob_15_plus?: number | null
  prob_20_plus?: number | null
  outlook_is_supplemental?: boolean | null
}

interface OwnStartResponse {
  status: string
  reason?: string
  model?: string
  gameweek?: number
  players?: PlayerRow[]
  transfer_event?: { player_out: string | null; player_in: string | null } | null
  hit_cost?: number
  free_transfers_before?: number | null
  gross_points?: number | null
  net_points?: number | null
  predicted_xi_total_xp?: number | null
  artifact_version?: string
}

interface ObjectResponse {
  status: string
  reason?: string
  model?: string
  gameweek?: number
  object?: string
  formation?: string | null
  squad_cost?: number
  captain?: string
  vice?: string
  predicted_xi_xp?: number | null
  final_points?: number | null
  corrected_points?: number | null
  note?: string
  player_membership?: PlayerRow[] | 'NOT_AVAILABLE'
}

interface StatusResponse {
  status: string
  final_pair_registered?: boolean
  final_pair_gameweek?: number | null
}

// A bare NaN never reaches here (the export pipeline now refuses to publish
// one), but this stays defensive: never claim "Not Started" for a row with
// no live match-state evidence -- historical rows with a real recorded
// result show FT/real points; anything else is honestly NOT_TRACKED.
function toFplPlayer(p: PlayerRow, benchIndex?: { outfield: number; isReserveGk: boolean; unknown: boolean }): FPLPlayer {
  const hasResult = p.actual_points !== null && p.actual_points !== undefined
  return {
    player_id: p.stable_player_id,
    name: p.name,
    web_name: p.name,
    club: p.club,
    position: p.position,
    price: p.price ?? 0,
    price_unavailable: p.price === undefined || p.price === null,
    expected_points: p.predicted_xp ?? 0,
    xp_unavailable: p.predicted_xp === undefined || p.predicted_xp === null,
    // Left null (never coerced to 0) when genuinely unavailable, so the
    // modal's own "missing vs real zero" check actually has something to
    // distinguish -- a real forecast of 0 expected minutes is a legitimate,
    // different fact from "we have no forecast for this decision object".
    expected_minutes: p.expected_minutes ?? null,
    // Real P(start) only -- a role of 'XI' means this player WAS selected,
    // not that a start-probability of 100% was forecast. Left undefined
    // when the source has no real per-player probability (matches the
    // PitchVisualization display contract exactly).
    starting_prob: p.p_start ?? undefined,
    haul_prob: 0,
    is_starting: p.role === 'XI',
    is_captain: p.is_captain,
    is_vice_captain: p.is_vice,
    bench_order: benchIndex ? benchIndex.outfield : null,
    is_reserve_gk: benchIndex?.isReserveGk,
    bench_order_unknown: benchIndex?.unknown,
    actual_points: p.actual_points,
    match_status: hasResult ? 'FT' : 'NOT_TRACKED',
    p_sub: p.p_sub ?? null,
    p_dnp: p.p_dnp ?? null,
    // Real fixture data from the frozen source (opponent_resolved/was_home)
    // -- left undefined (never a fabricated placeholder) when the source
    // genuinely has none, e.g. an unresolved transferred-out player row.
    opponent: p.opponent_resolved ?? undefined,
    home_away: p.was_home === true ? 'H' : p.was_home === false ? 'A' : undefined,
    // SUPPLEMENTAL outlook (Monte Carlo, separate from the frozen xP
    // above) -- only ever set when the source explicitly flagged it as
    // such; left undefined otherwise so the modal's "Range not available"
    // path renders instead of a fabricated range.
    likely_range: p.outlook_is_supplemental && p.likely_range ? p.likely_range : undefined,
    upside_score: p.outlook_is_supplemental && p.upside_score != null ? p.upside_score : undefined,
    high_upside_score: p.outlook_is_supplemental && p.high_upside_score != null ? p.high_upside_score : undefined,
    prob_10_plus: p.outlook_is_supplemental && p.prob_10_plus != null ? p.prob_10_plus : undefined,
    prob_15_plus: p.outlook_is_supplemental && p.prob_15_plus != null ? p.prob_15_plus : undefined,
    prob_20_plus: p.outlook_is_supplemental && p.prob_20_plus != null ? p.prob_20_plus : undefined,
    outlook_is_supplemental: p.outlook_is_supplemental ?? undefined,
  }
}

// Verified source order is preserved (never re-sorted by points/price/xP).
// The reserve goalkeeper is identified by position and labelled separately;
// the remaining outfield substitutes keep their real 1/2/3 priority from
// that same source order.
function benchWithPriorities(bench: PlayerRow[]): FPLPlayer[] {
  let outfieldSeen = 0
  return bench.map((p) => {
    const isReserveGk = p.position === 'GK'
    if (!isReserveGk) outfieldSeen += 1
    return toFplPlayer(p, { outfield: outfieldSeen, isReserveGk, unknown: false })
  })
}

async function fetchOwnStart(gw: number, model: string): Promise<OwnStartResponse> {
  const res = await fetch(`/api/research-fpl/own-start?gw=${gw}&model=${model}`, { cache: 'no-store' })
  return res.json()
}

async function fetchObject(gw: number, model: string, object: ObjectLabel): Promise<ObjectResponse> {
  const res = await fetch(`/api/research-fpl/object?gw=${gw}&model=${model}&object=${object}`, { cache: 'no-store' })
  return res.json()
}

async function fetchStatus(): Promise<StatusResponse> {
  const res = await fetch('/api/research-fpl/status', { cache: 'no-store' })
  return res.json()
}

// Formation arrives as a "4-4-2"-style string, a {GK,DEF,MID,FWD} object, or
// (for Blank-Slate specifically) that same object stringified with Python
// single-quote repr syntax -- never render any of those raw. Always reduce
// to a human-readable "DEF-MID-FWD" string, GK implicit as in real usage.
function formatFormation(f: unknown): string {
  if (f === null || f === undefined) return 'Unknown'
  if (typeof f === 'object') {
    const o = f as Record<string, number>
    if (o.DEF !== undefined || o.MID !== undefined || o.FWD !== undefined) {
      return `${o.DEF ?? 0}-${o.MID ?? 0}-${o.FWD ?? 0}`
    }
    return 'Unknown'
  }
  const s = String(f)
  if (/^\d(-\d){1,2}$/.test(s)) return s // already "4-4-2" style
  if (s.trim().startsWith('{')) {
    try {
      const o = JSON.parse(s.replace(/'/g, '"'))
      return formatFormation(o)
    } catch {
      return 'Unknown'
    }
  }
  return s === 'None' || s === 'nan' ? 'Unknown' : s
}

// The Own-Start decision object carries no formation field of its own (the
// AI Manager's XI shape can vary week to week) -- derive the real formation
// from the actual selected XI rather than displaying a fixed guess.
function computeFormationFromXI(players: PlayerRow[]): string {
  const xi = players.filter((p) => p.role === 'XI')
  const count = (pos: string) => xi.filter((p) => p.position === pos).length
  return `${count('DEF')}-${count('MID')}-${count('FWD')}`
}

// The source export carries internal technical codes in this field --
// never show them verbatim to users.
const NOTE_TEXT: Record<string, string> = {
  XI_ONLY_no_autosub: 'An alternative starting XI. No reserve bench or automatic substitutions.',
}
function formatNote(note: string): string {
  return NOTE_TEXT[note] ?? note
}

function statusBadge(status: string | undefined) {
  const isForecast = status === 'FINAL_FROZEN_FORECAST'
  const isEvaluated = status === 'FINALIZED_EVALUATION'
  const isTemporaryFailure = status === 'TEMPORARILY_UNAVAILABLE'
  const isAvailable = status === 'HISTORICAL_RECONSTRUCTION' || isForecast || isEvaluated
  return { isForecast, isEvaluated, isAvailable, isTemporaryFailure }
}

function OwnStartView({ data, onRetry }: { data: OwnStartResponse | null; onRetry: () => void }) {
  const { isForecast, isAvailable, isTemporaryFailure } = statusBadge(data?.status)
  return (
    <div className="bg-neutral-900 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold">AI Manager</h2>
        <span className={`text-xs px-2 py-0.5 rounded ${isTemporaryFailure ? 'bg-orange-900 text-orange-200' : !isAvailable ? 'bg-red-900 text-red-200' : isForecast ? 'bg-emerald-900 text-emerald-200' : 'bg-amber-900 text-amber-200'}`}>
          {isTemporaryFailure ? 'Connection issue' : !isAvailable ? 'Not available' : isForecast ? 'Final frozen forecast' : 'Historical reconstruction'}
        </span>
      </div>
      <p className="text-xs text-neutral-500 mb-3">{TAB_DESCRIPTIONS.OWN_START}</p>
      {isTemporaryFailure ? (
        <ErrorState message="Temporarily unable to load data. This is a connectivity issue, not a missing forecast." onRetry={onRetry} />
      ) : !isAvailable && (
        <div className="text-neutral-400 text-sm py-8 text-center">Final forecast not available: {data?.reason}</div>
      )}
      {isAvailable && data?.players && (
        <>
          <div className="text-sm text-neutral-400 mb-2">
            {isForecast ? (
              <>
                Predicted XI total xP: <span className="text-white font-semibold">{data.predicted_xi_total_xp ?? '—'}</span>
                {' '}(hit cost {data.hit_cost}, FT before {data.free_transfers_before ?? '—'})
                <div className="text-amber-300 text-xs mt-1">This gameweek has not been played yet -- no actual/net points exist.</div>
              </>
            ) : (
              <>
                Net points: <span className="text-white font-semibold">{data.net_points}</span>
                {' '}(gross {data.gross_points}, hit cost {data.hit_cost}, FT before {data.free_transfers_before ?? '—'})
              </>
            )}
            {data.transfer_event && (data.transfer_event.player_out || data.transfer_event.player_in) && (
              <div>Transfer: {data.transfer_event.player_out ?? '—'} → {data.transfer_event.player_in ?? '—'}</div>
            )}
          </div>
          <PitchVisualization
            formation={computeFormationFromXI(data.players)}
            startingXI={data.players.filter((p) => p.role === 'XI').map((p) => toFplPlayer(p))}
            bench={benchWithPriorities(data.players.filter((p) => p.role === 'BENCH'))}
            researchMode
            provenance={{
              model: MODEL, season: '2026-27', gameweek: data.gameweek ?? 0, object: 'AI Manager',
              status: data.status ?? 'UNKNOWN', artifactVersion: data.artifact_version,
            }}
          />
          <div className="text-xs text-neutral-500 mt-2">
            Artifact version: {data.artifact_version}. {isForecast
              ? 'Predicted values only -- this gameweek has not been played.'
              : 'Actual points shown are real, official results for this already-completed gameweek.'}
          </div>
        </>
      )}
    </div>
  )
}

function ObjectView({ tabId, tabTitle, data, onRetry }: { tabId: ObjectLabel; tabTitle: string; data: ObjectResponse | null; onRetry: () => void }) {
  const { isForecast, isAvailable, isTemporaryFailure } = statusBadge(data?.status)
  const membership = data?.player_membership
  const hasMembershipList = Array.isArray(membership)
  return (
    <div className="bg-neutral-900 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold">{tabTitle}</h2>
        <span className={`text-xs px-2 py-0.5 rounded ${isTemporaryFailure ? 'bg-orange-900 text-orange-200' : !isAvailable ? 'bg-red-900 text-red-200' : isForecast ? 'bg-emerald-900 text-emerald-200' : 'bg-amber-900 text-amber-200'}`}>
          {isTemporaryFailure ? 'Connection issue' : !isAvailable ? 'Not available' : isForecast ? 'Final frozen forecast' : 'Historical reconstruction'}
        </span>
      </div>
      <p className="text-xs text-neutral-500 mb-3">{TAB_DESCRIPTIONS[tabId]}</p>
      {isTemporaryFailure ? (
        <ErrorState message="Temporarily unable to load data. This is a connectivity issue, not a missing forecast." onRetry={onRetry} />
      ) : !isAvailable && <div className="text-neutral-400 text-sm py-8 text-center">Final forecast not available: {data?.reason}</div>}
      {isAvailable && (
        <>
          <div className="text-sm text-neutral-300 space-y-1 mb-3">
            {data?.formation && <div>Formation: <span className="font-semibold text-white">{formatFormation(data.formation)}</span></div>}
            {data?.captain && <div>Captain: {data.captain} {data?.vice && `• Vice: ${data.vice}`}</div>}
            <div>
              Predicted XI xP: {data?.predicted_xi_xp ?? '—'}
              {' • '}
              Final points: {isForecast ? 'not played yet' : (data?.final_points ?? data?.corrected_points ?? '—')}
            </div>
            {data?.note && <div className="text-xs text-neutral-500">{formatNote(data.note)}</div>}
          </div>
          {hasMembershipList ? (
            <PitchVisualization
              formation={data?.formation ? formatFormation(data.formation) : computeFormationFromXI(membership as PlayerRow[])}
              startingXI={(membership as PlayerRow[]).filter((p) => p.role !== 'BENCH').map((p) => toFplPlayer(p))}
              bench={benchWithPriorities((membership as PlayerRow[]).filter((p) => p.role === 'BENCH'))}
              researchMode
              provenance={{
                model: MODEL, season: '2026-27', gameweek: data?.gameweek ?? 0, object: tabTitle,
                status: data?.status ?? 'UNKNOWN',
              }}
            />
          ) : (
            <div className="text-sm text-neutral-400 py-6 text-center border border-dashed border-neutral-700 rounded">
              Player selections unavailable for this decision object at this gameweek. Score shown above is the verified aggregate.
            </div>
          )}
        </>
      )}
    </div>
  )
}

function FantasyPageInner() {
  const { language, changeLanguage } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()

  const urlGw = parseInt(searchParams.get('gw') || '', 10)
  const urlTab = searchParams.get('tab') as ObjectLabel | null
  const [gw, setGwState] = useState<number>(urlGw >= 1 && urlGw <= 4 ? urlGw : HISTORICAL_MAX_GW)
  const [tab, setTabState] = useState<ObjectLabel>(urlTab && TAB_IDS.has(urlTab) ? urlTab : DEFAULT_TAB)
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [ownStart, setOwnStart] = useState<OwnStartResponse | null>(null)
  const [objectData, setObjectData] = useState<ObjectResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStatus().then(setStatus).catch(() => setStatus(null))
  }, [])

  const setGw = useCallback((g: number) => {
    setGwState(g)
    const params = new URLSearchParams(Array.from(searchParams.entries()))
    params.set('gw', String(g))
    params.set('tab', tab)
    router.replace(`/fantasy?${params.toString()}`, { scroll: false })
  }, [router, searchParams, tab])

  const setTab = useCallback((t: ObjectLabel) => {
    setTabState(t)
    const params = new URLSearchParams(Array.from(searchParams.entries()))
    params.set('gw', String(gw))
    params.set('tab', t)
    router.replace(`/fantasy?${params.toString()}`, { scroll: false })
  }, [router, searchParams, gw])

  const load = useCallback(async (targetGw: number, targetTab: ObjectLabel) => {
    setLoading(true)
    setError(null)
    try {
      if (targetTab === 'OWN_START') {
        setOwnStart(await fetchOwnStart(targetGw, MODEL))
      } else {
        setObjectData(await fetchObject(targetGw, MODEL, targetTab))
      }
    } catch (e) {
      setError('Could not reach the Ennovera Fantasy service.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(gw, tab)
  }, [gw, tab, load])

  const gwButtons = useMemo(() => {
    const base = [1, 2, 3]
    const finalGw = status?.final_pair_gameweek
    if (finalGw && !base.includes(finalGw)) base.push(finalGw)
    return base.sort((a, b) => a - b)
  }, [status])

  const activeTabTitle = TABS.find((t) => t.id === tab)?.title || tab

  return (
    <div className="min-h-screen bg-[#0D1117] text-[#E6EDF3]">
      <Navbar language={language} onLanguageChange={changeLanguage} />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">Ennovera Fantasy</h1>
          <p className="text-neutral-400 text-sm">
            Powered by the M3_SHRUNK model. GW1-{HISTORICAL_MAX_GW} is a historical reconstruction of already-completed gameweeks.
            {status?.final_pair_registered
              ? ` GW${status.final_pair_gameweek} is a registered final frozen forecast, not yet played.`
              : ' No further gameweek has a registered final forecast yet.'}
          </p>
        </div>

        <div className="flex gap-2 mb-3 flex-wrap">
          {gwButtons.map((g) => (
            <button
              key={g}
              onClick={() => setGw(g)}
              className={`px-3 py-1 rounded text-sm ${gw === g ? 'bg-emerald-600' : 'bg-neutral-800'}`}
            >
              GW{g}{status?.final_pair_gameweek === g ? ' (Forecast)' : ''}
            </button>
          ))}
        </div>

        <div className="flex gap-2 mb-6 flex-wrap overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-2.5 py-1.5 rounded text-xs font-semibold whitespace-nowrap ${tab === t.id ? 'bg-sky-700' : 'bg-neutral-800 text-neutral-300'}`}
            >
              {t.title}
            </button>
          ))}
        </div>

        {loading && <div className="text-neutral-400">Loading…</div>}
        {error && <ErrorState message={error} onRetry={() => load(gw, tab)} />}

        {!loading && !error && (
          tab === 'OWN_START'
            ? <OwnStartView data={ownStart} onRetry={() => load(gw, tab)} />
            : <ObjectView tabId={tab} tabTitle={activeTabTitle} data={objectData} onRetry={() => load(gw, tab)} />
        )}
      </div>

      <AskEnnoveraChat language={language} pageContext={{ model: MODEL, gameweek: gw, object: tab }} />
    </div>
  )
}

export default function FantasyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0D1117]" />}>
      <FantasyPageInner />
    </Suspense>
  )
}
