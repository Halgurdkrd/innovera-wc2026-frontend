'use client'

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { PitchVisualization } from '@/components/fantasy/PitchVisualization'
import { AskEnnoveraChat } from '@/components/fantasy/AskEnnoveraChat'
import ErrorState from '@/components/ui/ErrorState'
import { useLanguage } from '@/hooks/useLanguage'
import { tr, type Language, type TranslationKey } from '@/lib/translations'
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
const TABS: { id: ObjectLabel; title: string; titleKey: TranslationKey }[] = [
  { id: 'B_LEGAL_BEST_XI', title: 'Best XI', titleKey: 'fantasy_tab_best_xi' },
  { id: 'OWN_START', title: 'AI Manager', titleKey: 'fantasy_tab_ai_manager' },
  { id: 'A_BLANK_SLATE', title: 'Best £100m Squad', titleKey: 'fantasy_tab_blank_slate' },
  { id: 'PRIMARY', title: 'Optional XI: Primary', titleKey: 'fantasy_tab_primary' },
  { id: 'OPTIONAL_XI_1', title: 'Optional XI 1', titleKey: 'fantasy_tab_opt1' },
  { id: 'OPTIONAL_XI_2', title: 'Optional XI 2', titleKey: 'fantasy_tab_opt2' },
  { id: 'OPTIONAL_XI_3', title: 'Optional XI 3', titleKey: 'fantasy_tab_opt3' },
  { id: 'OPTIONAL_XI_4', title: 'Optional XI 4', titleKey: 'fantasy_tab_opt4' },
]
const TAB_IDS = new Set(TABS.map((t) => t.id))
const DEFAULT_TAB: ObjectLabel = 'B_LEGAL_BEST_XI'
const HISTORICAL_MAX_GW = 3

function tabTitle(id: ObjectLabel, lang: Language): string {
  const tab = TABS.find((t) => t.id === id)
  return tab ? tr(tab.titleKey, lang) : id
}

// Short, honest description of each object's real constraints -- these are
// genuinely different selections with different rules, never a claim that
// one is "better" than another. English kept verbatim (unchanged copy);
// Kurdish falls back to the shared "alternative XI" phrasing already
// translated for the equivalent English text, since the underlying
// constraint (no bench/autosub) is the same across every non-Own-Start tab.
const TAB_DESCRIPTIONS_EN: Record<ObjectLabel, string> = {
  B_LEGAL_BEST_XI: 'An alternative starting XI: the highest-xP legal XI for this gameweek. No reserve bench or automatic substitutions.',
  OWN_START: 'Persistent season-long manager: carried squad, bank, free transfers, and one real transfer decision per gameweek.',
  A_BLANK_SLATE: 'A fresh 15-player squad for this gameweek, including starters and substitutes.',
  PRIMARY: 'An alternative starting XI for this gameweek. No reserve bench or automatic substitutions.',
  OPTIONAL_XI_1: 'An alternative starting XI for this gameweek. No reserve bench or automatic substitutions.',
  OPTIONAL_XI_2: 'An alternative starting XI for this gameweek. No reserve bench or automatic substitutions.',
  OPTIONAL_XI_3: 'An alternative starting XI for this gameweek. No reserve bench or automatic substitutions.',
  OPTIONAL_XI_4: 'An alternative starting XI for this gameweek. No reserve bench or automatic substitutions.',
}
const TAB_DESCRIPTIONS_KU: Record<ObjectLabel, string> = {
  B_LEGAL_BEST_XI: tr('fantasy_desc_best_xi', 'KU'),
  OWN_START: tr('fantasy_desc_ai_manager', 'KU'),
  A_BLANK_SLATE: tr('fantasy_desc_blank_slate', 'KU'),
  PRIMARY: tr('fantasy_desc_optional', 'KU'),
  OPTIONAL_XI_1: tr('fantasy_desc_optional', 'KU'),
  OPTIONAL_XI_2: tr('fantasy_desc_optional', 'KU'),
  OPTIONAL_XI_3: tr('fantasy_desc_optional', 'KU'),
  OPTIONAL_XI_4: tr('fantasy_desc_optional', 'KU'),
}
function tabDescription(id: ObjectLabel, lang: Language): string {
  return lang === 'KU' ? TAB_DESCRIPTIONS_KU[id] : TAB_DESCRIPTIONS_EN[id]
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

interface SquadOutlookObject {
  status: string
  reason?: string
  mean?: number
  p25?: number
  p75?: number
  p80?: number
  definition?: string
  definition_note?: string
  bench_membership_available?: boolean
  raw_starting_xi_total?: { mean: number; p25: number; p75: number; p80: number } | null
}

interface SquadOutlookResponse {
  status: string
  reason?: string
  label?: string
  method?: string
  dependence_assumption?: string
  objects?: Record<string, SquadOutlookObject>
}

async function fetchSquadOutlook(gw: number, model: string): Promise<SquadOutlookResponse> {
  const res = await fetch(`/api/research-fpl/squad-outlook?gw=${gw}&model=${model}`, { cache: 'no-store' })
  return res.json()
}

// Section 9: publish AND display the squad/XI-level outlook -- mean,
// middle-50% likely range, and P80 upside for the currently viewed
// decision object, computed from independent joint-scenario simulation
// (never player-quantile summation). Always labelled SUPPLEMENTAL / NOT
// CALIBRATED, and the dependence assumption is stated explicitly rather
// than implied by aligned draw indices.
function SquadOutlookPanel({ gw, tab, model, language }: { gw: number; tab: ObjectLabel; model: string; language: Language }) {
  const [data, setData] = useState<SquadOutlookResponse | null>(null)
  useEffect(() => {
    let cancelled = false
    fetchSquadOutlook(gw, model).then((d) => { if (!cancelled) setData(d) }).catch(() => { if (!cancelled) setData(null) })
    return () => { cancelled = true }
  }, [gw, model])

  if (!data || data.status !== 'AVAILABLE' || !data.objects) return null
  const obj = data.objects[tab]
  if (!obj || obj.status !== 'AVAILABLE') return null

  return (
    <div className="mb-4 p-3 rounded-lg border border-amber-700/40 bg-amber-950/20">
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <span className="text-sm font-bold text-amber-300">{tr('squad_outlook_title', language)}</span>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-800/60 text-amber-200">{tr('pitch_supplemental', language)}</span>
      </div>
      <div className="text-xs text-neutral-300 mb-1">
        {tr('squad_outlook_mean', language)}: <b><bdi style={{ unicodeBidi: 'isolate' }}>{obj.mean}</bdi></b>
        {' • '}{tr('pitch_likely_range', language)}: <bdi style={{ unicodeBidi: 'isolate' }}>{obj.p25}-{obj.p75}</bdi>
        {' • '}{tr('pitch_upside_p80', language)}: <bdi style={{ unicodeBidi: 'isolate' }}>{obj.p80}</bdi>
      </div>
      {obj.raw_starting_xi_total && (
        <div className="text-[11px] text-neutral-400 mb-1">{tr('squad_outlook_raw_xi_note', language)}</div>
      )}
      <div className="text-[11px] text-amber-400/90">{tr('squad_outlook_not_calibrated', language)}</div>
      <div className="text-[11px] text-neutral-500 mt-1">{tr('squad_outlook_dependence_note', language)}</div>
    </div>
  )
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

function OwnStartView({ data, onRetry, language }: { data: OwnStartResponse | null; onRetry: () => void; language: Language }) {
  const { isForecast, isAvailable, isTemporaryFailure } = statusBadge(data?.status)
  return (
    <div className="bg-neutral-900 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold">{tabTitle('OWN_START', language)}</h2>
        <span className={`text-xs px-2 py-0.5 rounded ${isTemporaryFailure ? 'bg-orange-900 text-orange-200' : !isAvailable ? 'bg-red-900 text-red-200' : isForecast ? 'bg-emerald-900 text-emerald-200' : 'bg-amber-900 text-amber-200'}`}>
          {isTemporaryFailure ? tr('status_connection_issue', language) : !isAvailable ? tr('status_not_available', language) : isForecast ? tr('status_final_frozen', language) : tr('status_historical', language)}
        </span>
      </div>
      <p className="text-xs text-neutral-500 mb-3">{tabDescription('OWN_START', language)}</p>
      {isTemporaryFailure ? (
        <ErrorState message={language === 'KU' ? tr('fantasy_temp_unavailable', language) : 'Temporarily unable to load data. This is a connectivity issue, not a missing forecast.'} onRetry={onRetry} />
      ) : !isAvailable && (
        <div className="text-neutral-400 text-sm py-8 text-center">{tr('final_forecast_not_available', language)}: {data?.reason}</div>
      )}
      {isAvailable && data?.players && (
        <>
          <div className="text-sm text-neutral-400 mb-2">
            {isForecast ? (
              <>
                {tr('own_start_predicted_xi', language)}: <span className="text-white font-semibold"><bdi style={{ unicodeBidi: 'isolate' }}>{data.predicted_xi_total_xp ?? '—'}</bdi></span>
                {' '}{language === 'KU'
                  ? <bdi style={{ unicodeBidi: 'isolate' }}>{`(خاڵی سزا ${data.hit_cost}، گواستنەوەی ئازاد پێش ${data.free_transfers_before ?? '—'})`}</bdi>
                  : <bdi style={{ unicodeBidi: 'isolate' }}>{`(hit cost ${data.hit_cost}, FT before ${data.free_transfers_before ?? '—'})`}</bdi>}
                <div className="text-amber-300 text-xs mt-1">{tr('own_start_not_played', language)}</div>
              </>
            ) : (
              <>
                {tr('own_start_net_points', language)}: <span className="text-white font-semibold"><bdi style={{ unicodeBidi: 'isolate' }}>{data.net_points}</bdi></span>
                {' '}{language === 'KU'
                  ? <bdi style={{ unicodeBidi: 'isolate' }}>{`(کۆی خاو ${data.gross_points}، خاڵی سزا ${data.hit_cost}، گواستنەوەی ئازاد پێش ${data.free_transfers_before ?? '—'})`}</bdi>
                  : <bdi style={{ unicodeBidi: 'isolate' }}>{`(gross ${data.gross_points}, hit cost ${data.hit_cost}, FT before ${data.free_transfers_before ?? '—'})`}</bdi>}
              </>
            )}
            {data.transfer_event && (data.transfer_event.player_out || data.transfer_event.player_in) && (
              <div>{tr('own_start_transfer', language)}: <bdi style={{ unicodeBidi: 'isolate' }}>{data.transfer_event.player_out ?? '—'} → {data.transfer_event.player_in ?? '—'}</bdi></div>
            )}
          </div>
          <PitchVisualization
            formation={computeFormationFromXI(data.players)}
            startingXI={data.players.filter((p) => p.role === 'XI').map((p) => toFplPlayer(p))}
            bench={benchWithPriorities(data.players.filter((p) => p.role === 'BENCH'))}
            researchMode
            language={language}
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

function ObjectView({ tabId, tabTitle, data, onRetry, language }: { tabId: ObjectLabel; tabTitle: string; data: ObjectResponse | null; onRetry: () => void; language: Language }) {
  const { isForecast, isAvailable, isTemporaryFailure } = statusBadge(data?.status)
  const membership = data?.player_membership
  const hasMembershipList = Array.isArray(membership)
  return (
    <div className="bg-neutral-900 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold">{tabTitle}</h2>
        <span className={`text-xs px-2 py-0.5 rounded ${isTemporaryFailure ? 'bg-orange-900 text-orange-200' : !isAvailable ? 'bg-red-900 text-red-200' : isForecast ? 'bg-emerald-900 text-emerald-200' : 'bg-amber-900 text-amber-200'}`}>
          {isTemporaryFailure ? tr('status_connection_issue', language) : !isAvailable ? tr('status_not_available', language) : isForecast ? tr('status_final_frozen', language) : tr('status_historical', language)}
        </span>
      </div>
      <p className="text-xs text-neutral-500 mb-3">{tabDescription(tabId, language)}</p>
      {isTemporaryFailure ? (
        <ErrorState message={language === 'KU' ? tr('fantasy_temp_unavailable', language) : 'Temporarily unable to load data. This is a connectivity issue, not a missing forecast.'} onRetry={onRetry} />
      ) : !isAvailable && <div className="text-neutral-400 text-sm py-8 text-center">{tr('final_forecast_not_available', language)}: {data?.reason}</div>}
      {isAvailable && (
        <>
          <div className="text-sm text-neutral-300 space-y-1 mb-3">
            {data?.formation && <div>{tr('object_formation', language)}: <span className="font-semibold text-white"><bdi style={{ unicodeBidi: 'isolate' }}>{formatFormation(data.formation)}</bdi></span></div>}
            {data?.captain && <div>{tr('object_captain', language)}: <bdi style={{ unicodeBidi: 'isolate' }}>{data.captain}</bdi> {data?.vice && <><bdi style={{ unicodeBidi: 'isolate' }}>{`• ${tr('object_vice', language)}: ${data.vice}`}</bdi></>}</div>}
            <div>
              {tr('object_predicted_xi_xp', language)}: <bdi style={{ unicodeBidi: 'isolate' }}>{data?.predicted_xi_xp ?? '—'}</bdi>
              {' • '}
              {tr('object_final_points', language)}: <bdi style={{ unicodeBidi: 'isolate' }}>{isForecast ? tr('object_not_played_yet', language) : (data?.final_points ?? data?.corrected_points ?? '—')}</bdi>
            </div>
            {data?.note && <div className="text-xs text-neutral-500">{formatNote(data.note)}</div>}
          </div>
          {hasMembershipList ? (
            <PitchVisualization
              formation={data?.formation ? formatFormation(data.formation) : computeFormationFromXI(membership as PlayerRow[])}
              startingXI={(membership as PlayerRow[]).filter((p) => p.role !== 'BENCH').map((p) => toFplPlayer(p))}
              bench={benchWithPriorities((membership as PlayerRow[]).filter((p) => p.role === 'BENCH'))}
              researchMode
              language={language}
              provenance={{
                model: MODEL, season: '2026-27', gameweek: data?.gameweek ?? 0, object: tabTitle,
                status: data?.status ?? 'UNKNOWN',
              }}
            />
          ) : (
            <div className="text-sm text-neutral-400 py-6 text-center border border-dashed border-neutral-700 rounded">
              {tr('object_selections_unavailable', language)}
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
  const hadExplicitGw = urlGw >= 1 && urlGw <= 4
  const [gw, setGwState] = useState<number>(hadExplicitGw ? urlGw : HISTORICAL_MAX_GW)
  const [tab, setTabState] = useState<ObjectLabel>(urlTab && TAB_IDS.has(urlTab) ? urlTab : DEFAULT_TAB)
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [ownStart, setOwnStart] = useState<OwnStartResponse | null>(null)
  const [objectData, setObjectData] = useState<ObjectResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStatus().then(setStatus).catch(() => setStatus(null))
  }, [])

  // "This gameweek" (on the page and in chat) must resolve to the latest
  // REGISTERED gameweek, not a hardcoded historical default -- a real bug
  // traced to exactly this: with no `?gw=` in the URL, the page defaulted
  // to GW3 (HISTORICAL_MAX_GW) even after GW4 was registered, which then
  // fed a stale GW3 into pageContext and made chat questions like "best
  // attackers" silently answer about GW3. Only auto-upgrades when the
  // user did NOT explicitly choose a GW via the URL, so an explicit link
  // to an older gameweek is still respected.
  useEffect(() => {
    if (!hadExplicitGw && status?.final_pair_gameweek && status.final_pair_gameweek !== gw) {
      setGwState(status.final_pair_gameweek)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, hadExplicitGw])

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

  const activeTabTitle = tabTitle(tab, language)

  return (
    <div className="min-h-screen bg-[#0D1117] text-[#E6EDF3]" dir={language === 'KU' ? 'rtl' : 'ltr'}>
      <Navbar language={language} onLanguageChange={changeLanguage} />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">{language === 'KU' ? 'ئینۆڤێرا فەنتازی' : 'Ennovera Fantasy'}</h1>
          <p className="text-neutral-400 text-sm">
            {language === 'KU' ? (
              <>بە هوشی دەستکردی مۆدێلی <bdi style={{ unicodeBidi: 'isolate' }}>Ennovera</bdi> کاردەکات. GW١-<bdi style={{ unicodeBidi: 'isolate' }}>{HISTORICAL_MAX_GW}</bdi> بازسازیکردنەوەی مێژووییە بۆ هەفتانەی تەواوبووە.
                {status?.final_pair_registered
                  ? <> GW<bdi style={{ unicodeBidi: 'isolate' }}>{status.final_pair_gameweek}</bdi> پێشبینییەکی جێگیرکراوی تۆمارکراوە، هێشتا یاری نەکراوە.</>
                  : ' هیچ هەفتەیەکی تر پێشبینیی جێگیرکراوی تۆمارکراوی نییە.'}
              </>
            ) : (
              <>Powered by the M3_SHRUNK model. GW1-{HISTORICAL_MAX_GW} is a historical reconstruction of already-completed gameweeks.
                {status?.final_pair_registered
                  ? ` GW${status.final_pair_gameweek} is a registered final frozen forecast, not yet played.`
                  : ' No further gameweek has a registered final forecast yet.'}
              </>
            )}
          </p>
        </div>

        <div className="flex gap-2 mb-3 flex-wrap">
          {gwButtons.map((g) => (
            <button
              key={g}
              onClick={() => setGw(g)}
              className={`px-3 py-1 rounded text-sm ${gw === g ? 'bg-emerald-600' : 'bg-neutral-800'}`}
            >
              <bdi style={{ unicodeBidi: 'isolate' }}>GW{g}{status?.final_pair_gameweek === g ? (language === 'KU' ? ' (پێشبینی)' : ' (Forecast)') : ''}</bdi>
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
              {tabTitle(t.id, language)}
            </button>
          ))}
        </div>

        {loading && <div className="text-neutral-400">{tr('fantasy_loading', language)}</div>}
        {error && <ErrorState message={error} onRetry={() => load(gw, tab)} />}

        {!loading && !error && <SquadOutlookPanel gw={gw} tab={tab} model={MODEL} language={language} />}

        {!loading && !error && (
          tab === 'OWN_START'
            ? <OwnStartView data={ownStart} onRetry={() => load(gw, tab)} language={language} />
            : <ObjectView tabId={tab} tabTitle={activeTabTitle} data={objectData} onRetry={() => load(gw, tab)} language={language} />
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
