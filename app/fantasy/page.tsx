'use client'

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { PitchVisualization } from '@/components/fantasy/PitchVisualization'
import ErrorState from '@/components/ui/ErrorState'
import { useLanguage } from '@/hooks/useLanguage'
import { useFantasyChatContext } from '@/context/FantasyChatContext'
import { tr, type Language, type TranslationKey } from '@/lib/translations'
import type { FPLPlayer } from '@/lib/api/types'
import { useReleasePolling } from '@/hooks/useReleasePolling'
import { ForecastBadge, ReleaseBadges, ReleaseNotices, ReleaseSwapBanner } from '@/components/fantasy/ReleaseStatusPanel'
import {
  deriveRowRelease,
  fillTime,
  isXiOnlyObject,
  objectHasBench,
  reconciliationLine,
  reconciliationParts,
  type ReleaseRowFields,
  type ReleaseStatusResponse,
  type RowRelease,
} from '@/lib/fantasy/releaseStatus'
import { formatLocalTime } from '@/components/fantasy/ReleaseStatusPanel'

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
  web_name?: string | null
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
  // Live/partial-GW results overlay (research_fpl_service._apply_live_overlay) --
  // only present once an official-results snapshot has been fetched for
  // this gameweek. 'NOT_STARTED' is distinct from a confirmed 'DID_NOT_PLAY'
  // zero -- never collapse the two into one "hasResult" boolean.
  match_status?: 'NOT_STARTED' | 'IN_PROGRESS' | 'FINISHED_PROVISIONAL' | 'FINISHED_CONFIRMED' | 'DID_NOT_PLAY' | 'NOT_TRACKED' | 'FT' | 'FINISHED' | 'LIVE'
  // Release-model per-player result fields: null actual_points means yet to
  // play OR data missing -- never a zero.
  yet_to_play?: boolean | null
  data_missing?: boolean | null
  points_final?: boolean | null
  bonus_points?: number | null
  fixtures_remaining?: number | null
}

interface LiveResultsMeta {
  gw_completion_status?: string
  fixtures_total?: number
  fixtures_finished_confirmed?: number
  fixtures_finished_provisional?: number
  fixtures_in_progress?: number
  fixtures_not_started?: number
  last_updated_utc?: string
  event_officially_finalized?: boolean
}

interface OwnStartResponse extends ReleaseRowFields {
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
  // Points-so-far overlay (present only once a live snapshot exists for
  // this gameweek -- see app/services/gw_partial_scoring.py).
  points_so_far_xi_raw?: number
  captain_status?: string
  captain_extra?: number
  hit_cost_applied?: number
  points_so_far_total?: number
  bench_points_so_far_raw?: number
  dnp_starter_count?: number
  pending_adjustments?: string[]
  live_results_meta?: LiveResultsMeta
}

interface ObjectResponse extends ReleaseRowFields {
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
  points_so_far_xi_raw?: number
  captain_status?: string
  captain_extra?: number
  points_so_far_total?: number
  bench_points_so_far_raw?: number
  dnp_starter_count?: number
  pending_adjustments?: string[]
  live_results_meta?: LiveResultsMeta
}

interface StatusResponse {
  status: string
  final_pair_registered?: boolean
  final_pair_gameweek?: number | null
  published_final_pairs?: { gameweek: number; freeze_id: string; release_hash?: string }[]
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
    // Real official FPL short display name when available (e.g.
    // "B.Fernandes", "Strand Larsen") -- previously this was silently
    // fed the full name here (a placeholder from before the backend
    // exposed a real web_name), so PitchVisualization's own
    // `web_name || name` preference never actually showed anything but
    // the full name despite already being written to prefer it.
    web_name: p.web_name ?? p.name,
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
    // Prefer the real per-player match_status from the live-results
    // overlay (NOT_STARTED/IN_PROGRESS/FINISHED_PROVISIONAL/
    // FINISHED_CONFIRMED/DID_NOT_PLAY/NOT_TRACKED) -- only falls back to
    // the coarse hasResult-based guess for rows that predate this field
    // (e.g. GW1-3 historical reconstruction rows with no live overlay).
    match_status: p.match_status ?? (hasResult ? 'FT' : 'NOT_TRACKED'),
    yet_to_play: p.yet_to_play ?? undefined,
    data_missing: p.data_missing ?? undefined,
    points_final: p.points_final ?? undefined,
    bonus_points: p.bonus_points ?? undefined,
    fixtures_remaining: p.fixtures_remaining ?? undefined,
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

interface LiveStatusResponse {
  status: string
  gameweek?: number
  gw_completion_status?: string
  // Release-model fields (same shape as release-status `results`).
  results_status?: string
  finalized?: boolean
  next_kickoff_utc?: string | null
}

async function fetchLiveStatus(gw?: number): Promise<LiveStatusResponse> {
  const res = await fetch(gw ? `/api/research-fpl/live-status?gw=${gw}` : '/api/research-fpl/live-status', { cache: 'no-store' })
  return res.json()
}

interface EarlyStatusResponse {
  status: string
  target_gw?: number
  generated_at_utc?: string
  hours_before_deadline?: number
}

async function fetchEarlyStatus(): Promise<EarlyStatusResponse> {
  const res = await fetch('/api/research-fpl/early-status', { cache: 'no-store' })
  return res.json()
}

// "Refresh now" (task requirement) -- triggers an immediate official-
// results refresh on the backend, then the caller re-fetches own-start/
// object data via its existing onRetry/load() path. Never blocks longer
// than the backend route's own bounded timeout.
async function triggerLiveRefresh(): Promise<void> {
  try {
    await fetch('/api/research-fpl/live-status/refresh', { method: 'POST', cache: 'no-store' })
  } catch {
    // Best-effort -- onRetry()'s own re-fetch will simply show whatever
    // the last successful backend snapshot was.
  }
}

interface RosterPlayer { stable_player_id: number; name: string; position: string; club: string; price_tenths?: number }
interface BenchReconstruction {
  status: string
  artifact_version?: string
  starting_players?: RosterPlayer[]
  bench_players?: RosterPlayer[]
  bench_uniqueness_note?: string
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
  formation?: string | null
  bench_reconstruction?: BenchReconstruction
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
      {!isXiOnlyObject(tab) && obj.bench_reconstruction?.status === 'VERIFIED_MATCH' && (
        <div className="mt-2 mb-2 p-2 rounded border border-neutral-700 bg-neutral-900/60">
          <div className="text-[11px] font-semibold text-neutral-300 mb-1">
            {language === 'KU' ? `دانانی یاریزانان: ${obj.formation ?? '—'}` : `Formation: ${obj.formation ?? '—'}`}
            {' • '}{language === 'KU' ? 'یەدەگی بنیادنراوەتەوە' : 'Reconstructed bench'}
          </div>
          <div className="text-[11px] text-neutral-400">
            {language === 'KU' ? 'یاریزانانی سەرەکی: ' : 'Starters: '}
            {(obj.bench_reconstruction.starting_players ?? []).map((p) => p.name).join(', ')}
          </div>
          <div className="text-[11px] text-neutral-400 mt-0.5">
            {language === 'KU' ? 'یەدەگ (بە ڕیزبەندی): ' : 'Bench (in order): '}
            {(obj.bench_reconstruction.bench_players ?? []).map((p) => `${p.name} (${p.position})`).join(', ')}
          </div>
          {obj.bench_reconstruction.bench_uniqueness_note && (
            <div className="text-[10px] text-amber-500/80 mt-1">{obj.bench_reconstruction.bench_uniqueness_note}</div>
          )}
        </div>
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

// Legacy `status` is now used ONLY for availability (is there data to show?).
// The forecast label and the results state come from the release model
// (forecast_status / results_status), which never conflate the two.
function statusBadge(status: string | undefined) {
  const isTemporaryFailure = status === 'TEMPORARILY_UNAVAILABLE'
  const isAvailable = status === 'HISTORICAL_RECONSTRUCTION' || status === 'FINAL_FROZEN_FORECAST' || status === 'LIVE_PROVISIONAL' ||
    status === 'EARLY_FORECAST_SUBJECT_TO_UPDATE' || status === 'FINALIZED_EVALUATION'
  return { isAvailable, isTemporaryFailure }
}

function formatUpdateTime(iso: string | undefined, language: Language): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleString(language === 'KU' ? 'en-GB' : 'en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })
  } catch {
    return iso
  }
}

function captainStatusText(status: string | undefined, language: Language): string | null {
  switch (status) {
    case 'PENDING_CAPTAIN_HAS_NOT_PLAYED': return tr('captain_status_pending', language)
    case 'CAPTAIN_DNP_VICE_APPLIED_PROVISIONAL': return tr('captain_status_dnp_vice_applied', language)
    case 'CAPTAIN_DNP_VICE_PENDING': return tr('captain_status_dnp_vice_pending', language)
    default: return null
  }
}

const AUTOSUB_KEYS = {
  PENDING_UNRESOLVED_FIXTURES: 'release_autosub_PENDING_UNRESOLVED_FIXTURES',
  NOT_APPLICABLE_XI_ONLY: 'release_autosub_NOT_APPLICABLE_XI_ONLY',
  APPLIED_PROVISIONAL: 'release_autosub_APPLIED_PROVISIONAL',
  APPLIED_FINAL: 'release_autosub_APPLIED_FINAL',
  NONE_NEEDED: 'release_autosub_NONE_NEEDED',
} as const

// Footer wording per state -- never claims a gameweek "has not been played"
// once its matches have started, and never relabels a frozen forecast.
function releaseFootnote(rel: RowRelease, language: Language): string {
  if (rel.early) return tr('early_forecast_note', language)
  if (rel.historical) return 'Actual points shown are real, official results for this already-completed gameweek.'
  if (rel.final) return 'Final points -- the gameweek has been finalized.'
  if (rel.live) return 'Points so far are provisional and will update automatically as official data refreshes.'
  return 'Predicted values only -- this gameweek has not been played.'
}

// Shared "actual points so far / final" block for OWN_START and XI-only
// objects -- SEPARATE from the frozen expected points shown elsewhere, only
// rendered when results are scored against this release (never for an early
// forecast) and a total exists; never fabricated from predicted xP.
function PointsSoFarBlock({ data, rel, releaseStatus, language, onRefresh, refreshing }: {
  data: ReleaseRowFields
  rel: RowRelease
  releaseStatus: ReleaseStatusResponse | null
  language: Language
  onRefresh?: () => void
  refreshing?: boolean
}) {
  if (!rel.tracked || data.points_so_far_total == null) return null
  const meta = data.live_results_meta ?? undefined
  const rsr = releaseStatus?.results
  const total = rsr?.fixtures_total ?? meta?.fixtures_total
  const notStarted = rsr?.fixtures_not_started ?? meta?.fixtures_not_started
  const completed = rsr
    ? (rsr.fixtures_finished_confirmed ?? 0) + (rsr.fixtures_finished_provisional ?? 0)
    : (meta?.fixtures_finished_confirmed ?? 0) + (meta?.fixtures_finished_provisional ?? 0)
  const lastUpdated = rel.lastUpdatedUtc ?? rsr?.last_updated_utc ?? meta?.last_updated_utc ?? undefined
  const captainText = captainStatusText(data.captain_status ?? undefined, language)
  const recLine = reconciliationLine(data, language)
  const recParts = reconciliationParts(data)
  const autosubKey = data.autosub_status ? AUTOSUB_KEYS[data.autosub_status as keyof typeof AUTOSUB_KEYS] : undefined
  const yetToPlay = data.players_yet_to_play ?? []
  const pending = data.pending_adjustments ?? []
  const fin = data.finalization
  return (
    <div className="bg-amber-950/30 border border-amber-800/50 rounded-lg p-3 mb-3 text-sm" data-testid="points-so-far">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-amber-300 font-semibold">{rel.final ? tr('release_actual_final_label', language) : tr('points_so_far_label', language)}</div>
        {onRefresh && !rel.final && (
          <button onClick={onRefresh} disabled={refreshing} className="text-xs px-2 py-0.5 rounded bg-amber-900/60 text-amber-200 hover:bg-amber-800/60 disabled:opacity-50">
            {refreshing ? '…' : tr('refresh_now_button', language)}
          </button>
        )}
      </div>
      <div className="text-white font-bold text-lg mt-1">
        <bdi style={{ unicodeBidi: 'isolate' }}>{data.points_so_far_total}</bdi>
      </div>
      {recLine && (
        <div className="text-neutral-300 text-xs mt-1" data-testid="reconciliation-line">
          <bdi style={{ unicodeBidi: 'isolate' }}>{recLine}</bdi>
        </div>
      )}
      {recParts?.ok === false && <div className="text-orange-300 text-xs mt-1">{tr('release_reconciliation_mismatch', language)}</div>}
      {fin?.status === 'FINALIZED' && (
        <div className="text-emerald-300 text-xs mt-1">
          <bdi style={{ unicodeBidi: 'isolate' }}>{`${tr('release_results_final', language)}: ${fin.net_points ?? '—'}${fin.gross_points != null ? ` (gross ${fin.gross_points})` : ''}`}</bdi>
        </div>
      )}
      {captainText && <div className="text-amber-200 text-xs mt-1">{captainText}</div>}
      {autosubKey && <div className="text-amber-200/90 text-xs mt-1">{tr(autosubKey, language)}</div>}
      {pending.length > 0 && (
        <div className="mt-1">
          <div className="text-amber-200/90 text-[11px] font-semibold">{tr('release_pending_adjustments', language)}</div>
          {pending.map((p, i) => (
            <div key={i} className="text-amber-200/80 text-xs">{p}</div>
          ))}
        </div>
      )}
      {yetToPlay.length > 0 && (
        <div className="text-neutral-300 text-xs mt-1">
          {tr('release_yet_to_play_list', language)}: <bdi style={{ unicodeBidi: 'isolate' }}>{yetToPlay.join(', ')}</bdi>
        </div>
      )}
      {(total !== undefined || lastUpdated) && (
        <div className="text-neutral-400 text-xs mt-2 flex flex-wrap gap-x-3">
          {total !== undefined && <span>{tr('matches_completed_label', language)}: {completed}/{total}</span>}
          {notStarted !== undefined && <span>{tr('matches_remaining_label', language)}: {notStarted}</span>}
          {lastUpdated && <span>{tr('last_updated_label', language)}: {formatUpdateTime(lastUpdated, language)}</span>}
        </div>
      )}
      {!rel.final && <div className="text-neutral-500 text-[11px] mt-1">{tr('release_provisional_legend', language)}</div>}
      {!rel.final && <div className="text-neutral-500 text-[11px] mt-1">{tr('final_evaluation_deferred', language)}</div>}
    </div>
  )
}

function OwnStartView({ data, onRetry, onRefreshStatus, language, releaseStatus }: { data: OwnStartResponse | null; onRetry: () => void; onRefreshStatus: () => void; language: Language; releaseStatus: ReleaseStatusResponse | null }) {
  const { isAvailable, isTemporaryFailure } = statusBadge(data?.status)
  const rel = deriveRowRelease(data)
  const [refreshing, setRefreshing] = useState(false)
  const handleRefresh = async () => {
    setRefreshing(true)
    await triggerLiveRefresh()
    onRetry()
    onRefreshStatus()
    setRefreshing(false)
  }
  // Only claim "not played yet" while no fixture has actually started.
  const fx = releaseStatus?.results
  const gwStarted = rel.tracked || (fx ? (fx.fixtures_not_started ?? 0) < (fx.fixtures_total ?? 0) : false)
  const showNotPlayed = !gwStarted && !rel.historical && rel.forecast !== null
  return (
    <div className="bg-neutral-900 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold">{tabTitle('OWN_START', language)}</h2>
        {(isTemporaryFailure || !isAvailable)
          ? <span className={`text-xs px-2 py-0.5 rounded ${isTemporaryFailure ? 'bg-orange-900 text-orange-200' : 'bg-red-900 text-red-200'}`}>
              {isTemporaryFailure ? tr('status_connection_issue', language) : tr('status_not_available', language)}
            </span>
          : <ForecastBadge forecast={rel.forecast} language={language} />}
      </div>
      <p className="text-xs text-neutral-500 mb-3">{tabDescription('OWN_START', language)}</p>
      {isAvailable && <ReleaseBadges rel={rel} releaseStatus={releaseStatus} language={language} />}
      {isTemporaryFailure ? (
        <ErrorState message={language === 'KU' ? tr('fantasy_temp_unavailable', language) : 'Temporarily unable to load data. This is a connectivity issue, not a missing forecast.'} onRetry={onRetry} />
      ) : !isAvailable && (
        <div className="text-neutral-400 text-sm py-8 text-center">{tr('final_forecast_not_available', language)}: {data?.reason}</div>
      )}
      {isAvailable && data?.players && (
        <>
          <div className="text-sm text-neutral-400 mb-2">
            {tr('own_start_predicted_xi', language)}: <span className="text-white font-semibold"><bdi style={{ unicodeBidi: 'isolate' }}>{data.predicted_xi_total_xp ?? '—'}</bdi></span>
            {' '}{language === 'KU'
              ? <bdi style={{ unicodeBidi: 'isolate' }}>{`(خاڵی سزا ${data.hit_cost}، گواستنەوەی ئازاد پێش ${data.free_transfers_before ?? '—'})`}</bdi>
              : <bdi style={{ unicodeBidi: 'isolate' }}>{`(hit cost ${data.hit_cost}, FT before ${data.free_transfers_before ?? '—'})`}</bdi>}
            {showNotPlayed && <div className="text-amber-300 text-xs mt-1">{tr('own_start_not_played', language)}</div>}
            {rel.early && <div className="text-sky-300 text-xs mt-1">{tr('early_forecast_note', language)}</div>}
            {rel.historical && (
              <div className="mt-1">
                {tr('own_start_net_points', language)}: <span className="text-white font-semibold"><bdi style={{ unicodeBidi: 'isolate' }}>{data.net_points}</bdi></span>
                {' '}{language === 'KU'
                  ? <bdi style={{ unicodeBidi: 'isolate' }}>{`(کۆی خاو ${data.gross_points}، خاڵی سزا ${data.hit_cost}، گواستنەوەی ئازاد پێش ${data.free_transfers_before ?? '—'})`}</bdi>
                  : <bdi style={{ unicodeBidi: 'isolate' }}>{`(gross ${data.gross_points}, hit cost ${data.hit_cost}, FT before ${data.free_transfers_before ?? '—'})`}</bdi>}
              </div>
            )}
            {data.transfer_event && (data.transfer_event.player_out || data.transfer_event.player_in) && (
              <div>{tr('own_start_transfer', language)}: <bdi style={{ unicodeBidi: 'isolate' }}>{data.transfer_event.player_out ?? '—'} → {data.transfer_event.player_in ?? '—'}</bdi></div>
            )}
          </div>
          <PointsSoFarBlock data={data} rel={rel} releaseStatus={releaseStatus} language={language} onRefresh={handleRefresh} refreshing={refreshing} />
          <PitchVisualization
            formation={computeFormationFromXI(data.players)}
            startingXI={data.players.filter((p) => p.role === 'XI').map((p) => toFplPlayer(p))}
            bench={objectHasBench('OWN_START', data.players) ? benchWithPriorities(data.players.filter((p) => p.role === 'BENCH')) : []}
            researchMode
            language={language}
            provenance={{
              model: MODEL, season: '2026-27', gameweek: data.gameweek ?? 0, object: 'AI Manager',
              status: data.status ?? 'UNKNOWN', artifactVersion: data.artifact_version,
            }}
          />
          <div className="text-xs text-neutral-500 mt-2">
            Artifact version: {data.artifact_version}. {releaseFootnote(rel, language)}
          </div>
        </>
      )}
    </div>
  )
}

function ObjectView({ tabId, tabTitle, data, onRetry, onRefreshStatus, language, releaseStatus }: { tabId: ObjectLabel; tabTitle: string; data: ObjectResponse | null; onRetry: () => void; onRefreshStatus: () => void; language: Language; releaseStatus: ReleaseStatusResponse | null }) {
  const { isAvailable, isTemporaryFailure } = statusBadge(data?.status)
  const rel = deriveRowRelease(data)
  const membership = data?.player_membership
  const hasMembershipList = Array.isArray(membership)
  const [refreshing, setRefreshing] = useState(false)
  const handleRefresh = async () => {
    setRefreshing(true)
    await triggerLiveRefresh()
    onRetry()
    onRefreshStatus()
    setRefreshing(false)
  }
  // Actual/results cell: never merged with the frozen expected points.
  const resultsCell = rel.historical || !rel.forecast
    ? (data?.final_points ?? data?.corrected_points ?? '—')
    : rel.final
    ? (data?.finalization?.net_points ?? data?.points_so_far_total ?? '—')
    : rel.live
    ? `${data?.points_so_far_total ?? '—'} (${tr('points_so_far_label', language)})`
    : tr('object_not_played_yet', language)
  const resultsLabelText = rel.live || rel.final ? tr(rel.final ? 'release_actual_final_label' : 'release_actual_label', language) : tr('object_final_points', language)
  return (
    <div className="bg-neutral-900 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold">{tabTitle}</h2>
        {(isTemporaryFailure || !isAvailable)
          ? <span className={`text-xs px-2 py-0.5 rounded ${isTemporaryFailure ? 'bg-orange-900 text-orange-200' : 'bg-red-900 text-red-200'}`}>
              {isTemporaryFailure ? tr('status_connection_issue', language) : tr('status_not_available', language)}
            </span>
          : <ForecastBadge forecast={rel.forecast} language={language} />}
      </div>
      <p className="text-xs text-neutral-500 mb-3">{tabDescription(tabId, language)}</p>
      {isAvailable && <ReleaseBadges rel={rel} releaseStatus={releaseStatus} language={language} />}
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
              {resultsLabelText}: <bdi style={{ unicodeBidi: 'isolate' }}>{resultsCell}</bdi>
            </div>
            {rel.early && <div className="text-xs text-sky-300">{tr('early_forecast_note', language)}</div>}
            {data?.note && <div className="text-xs text-neutral-500">{formatNote(data.note)}</div>}
          </div>
          {data && <PointsSoFarBlock data={data} rel={rel} releaseStatus={releaseStatus} language={language} onRefresh={handleRefresh} refreshing={refreshing} />}
          {hasMembershipList ? (
            <PitchVisualization
              formation={data?.formation ? formatFormation(data.formation) : computeFormationFromXI(membership as PlayerRow[])}
              startingXI={(membership as PlayerRow[]).filter((p) => p.role !== 'BENCH').map((p) => toFplPlayer(p))}
              // XI-only objects (Primary/Optional XI) and any object with no
              // BENCH-role players render no bench at all.
              bench={objectHasBench(tabId, membership as PlayerRow[]) ? benchWithPriorities((membership as PlayerRow[]).filter((p) => p.role === 'BENCH')) : []}
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
  const { setFantasyContext } = useFantasyChatContext()
  const router = useRouter()
  const searchParams = useSearchParams()

  const urlGw = parseInt(searchParams.get('gw') || '', 10)
  const urlTab = searchParams.get('tab') as ObjectLabel | null
  // Not hardcoded to GW4: an explicit URL gw is honored up to GW5 now
  // that an early forecast can exist there too -- this cap should track
  // whichever gameweek is currently the furthest real, servable one
  // (final pair or early forecast), not a fixed number.
  const hadExplicitGw = urlGw >= 1 && urlGw <= 38
  const [gw, setGwState] = useState<number>(hadExplicitGw ? urlGw : HISTORICAL_MAX_GW)
  const [tab, setTabState] = useState<ObjectLabel>(urlTab && TAB_IDS.has(urlTab) ? urlTab : DEFAULT_TAB)
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [liveStatus, setLiveStatus] = useState<LiveStatusResponse | null>(null)
  const [earlyStatus, setEarlyStatus] = useState<EarlyStatusResponse | null>(null)
  const [activeRelease, setActiveRelease] = useState<ReleaseStatusResponse | null>(null)
  useEffect(() => {
    const ctrl = new AbortController()
    fetch('/api/research-fpl/release-status', { cache: 'no-store', signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setActiveRelease(j && j.status === 'AVAILABLE' ? j : null))
      .catch(() => setActiveRelease(null))
    return () => ctrl.abort()
  }, [])
  const [ownStart, setOwnStart] = useState<OwnStartResponse | null>(null)
  const [objectData, setObjectData] = useState<ObjectResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshPageStatuses = useCallback(() => {
    // Results state is fetched for the FINAL-PAIR gameweek (what the header/tab
    // wording describes), not the backend's default active gameweek.
    fetchStatus()
      .then((st) => {
        setStatus(st)
        return fetchLiveStatus(st?.final_pair_gameweek ?? undefined).then(setLiveStatus)
      })
      .catch(() => { setStatus(null); setLiveStatus(null) })
    fetchEarlyStatus().then(setEarlyStatus).catch(() => setEarlyStatus(null))
  }, [])

  useEffect(() => {
    refreshPageStatuses()
  }, [refreshPageStatuses])

  // The frozen forecast gameweek is "live" once any official fixture data
  // has been fetched for it and at least one match has started/finished --
  // used to correct wording that would otherwise wrongly say "not yet
  // played" once the gameweek is actually underway.
  const finalGwIsLive = liveStatus?.status === 'AVAILABLE' &&
    liveStatus.gameweek === status?.final_pair_gameweek &&
    liveStatus.gw_completion_status !== 'NOT_STARTED'
  // Results state of the registered final gameweek (independent of its
  // forecast label, which stays "final frozen forecast" throughout).
  const finalGwResults: string = liveStatus?.results_status ?? (finalGwIsLive ? 'IN_PROGRESS' : 'NOT_STARTED')

  // Keeps the single, site-wide chat assistant's Fantasy context in sync
  // with this page's own selected gameweek/decision object -- the
  // assistant is mounted globally (root layout), outside this page's
  // component tree, so it reads this via shared context rather than a
  // prop. Cleared on unmount so navigating away never leaves stale
  // Fantasy context fabricated on an unrelated page.
  useEffect(() => {
    setFantasyContext({ model: MODEL, gameweek: gw, object: tab })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gw, tab])
  useEffect(() => {
    // True-unmount-only cleanup (empty deps) -- clearing on every gw/tab
    // change instead would flash the shared context to null between
    // updates rather than just when leaving the Fantasy page entirely.
    return () => setFantasyContext(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // Default to the ACTIVE gameweek when it has a servable release (final or
    // early) -- gameweek-aware, so it advances on its own (GW6, GW7...) --
    // otherwise to the latest registered final pair.
    const activeGw = activeRelease?.gameweek
    const activeServable = activeRelease?.forecast?.status === 'FINAL_FROZEN' || activeRelease?.forecast?.status === 'EARLY'
    const target = activeGw && activeServable ? activeGw : status?.final_pair_gameweek
    if (!hadExplicitGw && target && target !== gw) {
      setGwState(target)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, activeRelease, hadExplicitGw])

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

  // A normal load shows the loading state; a silent load (background
  // refresh after the release/results revision changed) swaps the data in
  // place without flashing, and is dropped if the user navigated meanwhile.
  const navSeq = useRef(0)
  const load = useCallback(async (targetGw: number, targetTab: ObjectLabel, opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true
    const seq = silent ? navSeq.current : ++navSeq.current
    if (!silent) {
      setLoading(true)
      setError(null)
    }
    try {
      if (targetTab === 'OWN_START') {
        const d = await fetchOwnStart(targetGw, MODEL)
        if (seq === navSeq.current) setOwnStart(d)
      } else {
        const d = await fetchObject(targetGw, MODEL, targetTab)
        if (seq === navSeq.current) setObjectData(d)
      }
    } catch {
      if (!silent && seq === navSeq.current) setError('Could not reach the Ennovera Fantasy service.')
    } finally {
      if (!silent && seq === navSeq.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(gw, tab)
  }, [gw, tab, load])

  // Bounded background refresh of the release/results state (adaptive
  // cadence, paused while hidden, stops once finalized -- see
  // hooks/useReleasePolling.ts). Only gameweeks past the historical range
  // have a live release to track.
  const [swapNotice, setSwapNotice] = useState<'final' | 'generic' | null>(null)
  const swapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (swapTimer.current) clearTimeout(swapTimer.current) }, [])
  const { status: releaseStatus, refreshNow: refreshReleaseStatus } = useReleasePolling({
    gw,
    enabled: gw > HISTORICAL_MAX_GW,
    onChange: (next, prev) => {
      // Re-fetch the displayed object (new results revision / manifest / release).
      load(gw, tab, { silent: true })
      if (prev.forecast?.release_id !== next.forecast?.release_id) {
        refreshPageStatuses()
        setSwapNotice(prev.forecast?.status === 'EARLY' && next.forecast?.status === 'FINAL_FROZEN' ? 'final' : 'generic')
        if (swapTimer.current) clearTimeout(swapTimer.current)
        swapTimer.current = setTimeout(() => setSwapNotice(null), 10000)
      }
    },
  })

  // ONE short dynamic status line, in priority order: an honestly-recovered
  // gameweek always leads with that fact (the headline is "which lineup is
  // this", not the live score); otherwise results state, then forecast state.
  const statusLine = useMemo(() => {
    if (!releaseStatus || releaseStatus.status !== 'AVAILABLE') return null
    const forecast = releaseStatus.forecast
    const results = releaseStatus.results
    if (forecast?.status === 'EARLY_PUBLISHED_RECOVERY') {
      return tr('fantasy_status_recovery', language).replace('{gw}', String(releaseStatus.gameweek ?? gw))
    }
    if (results?.finalized === true || results?.status === 'FINAL') {
      return tr('fantasy_status_final', language)
    }
    if (results?.status === 'PROVISIONAL') {
      return tr('fantasy_status_provisional', language)
    }
    if (results?.status === 'IN_PROGRESS') {
      return fillTime(tr('fantasy_status_live_points', language), formatLocalTime(results.last_updated_utc))
    }
    if (forecast?.generated_at_utc) {
      return fillTime(tr('fantasy_status_forecast_updated', language), formatLocalTime(forecast.generated_at_utc))
    }
    return null
  }, [releaseStatus, gw, language])

  // Collapsed "About this gameweek": only rendered when there is something
  // genuinely non-obvious to say (the recovery case) -- never repeated
  // elsewhere on the page.
  const aboutGwText = useMemo(() => {
    if (releaseStatus?.forecast?.status === 'EARLY_PUBLISHED_RECOVERY') {
      return tr('fantasy_about_recovery', language).replace('{gw}', String(releaseStatus.gameweek ?? gw))
    }
    return null
  }, [releaseStatus, gw, language])

  const finalGwSet = useMemo(() => new Set<number>((status?.published_final_pairs?.map((p) => p.gameweek) ?? []).concat(status?.final_pair_gameweek ? [status.final_pair_gameweek] : [])), [status])

  const gwButtons = useMemo(() => {
    const base = [1, 2, 3]
    const finals = (status?.published_final_pairs?.map((p) => p.gameweek) ?? []).concat(status?.final_pair_gameweek ? [status.final_pair_gameweek] : [])
    for (const finalGw of finals) if (finalGw && !base.includes(finalGw)) base.push(finalGw)
    const earlyGw = earlyStatus?.status === 'AVAILABLE' ? earlyStatus.target_gw : null
    if (earlyGw && !base.includes(earlyGw)) base.push(earlyGw)
    return base.sort((a, b) => a - b)
  }, [status, earlyStatus])

  const activeTabTitle = tabTitle(tab, language)

  return (
    <div className="min-h-screen bg-[#0D1117] text-[#E6EDF3]" dir={language === 'KU' ? 'rtl' : 'ltr'}>
      <Navbar language={language} onLanguageChange={changeLanguage} />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">
            {language === 'KU' ? 'ئینۆڤێرا فەنتازی' : 'Ennovera Fantasy'}
          </h1>
          <p className="text-neutral-400 text-sm">
            <bdi style={{ unicodeBidi: 'isolate' }}>GW{gw}</bdi>
          </p>
          {statusLine && (
            <p className="text-neutral-400 text-sm mt-1" data-testid="fantasy-status-line">
              <bdi style={{ unicodeBidi: 'isolate' }}>{statusLine}</bdi>
            </p>
          )}
          {aboutGwText && (
            <details className="mt-2 text-xs text-neutral-500">
              <summary className="cursor-pointer select-none hover:text-neutral-300">{tr('fantasy_about_toggle', language)}</summary>
              <p className="mt-1 text-neutral-400">
                <bdi style={{ unicodeBidi: 'isolate' }}>{aboutGwText}</bdi>
              </p>
            </details>
          )}
        </div>

        <ReleaseSwapBanner kind={swapNotice} language={language} />
        <ReleaseNotices status={releaseStatus} language={language} />

        <div className="flex gap-2 mb-3 flex-wrap">
          {gwButtons.map((g) => (
            <button
              key={g}
              onClick={() => setGw(g)}
              className={`px-3 py-1 rounded text-sm ${gw === g ? 'bg-emerald-600' : 'bg-neutral-800'}`}
            >
              <bdi style={{ unicodeBidi: 'isolate' }}>GW{g}{
                (finalGwSet.has(g))
                  ? (language === 'KU' ? ' (پێشبینی' : ' (Forecast') + (g === status?.final_pair_gameweek && finalGwResults === 'IN_PROGRESS' ? (language === 'KU' ? ' • لە یاریدایە' : ' • Live') : '') + ')'
                  : (earlyStatus?.status === 'AVAILABLE' && earlyStatus.target_gw === g ? (language === 'KU' ? ' (زوو)' : ' (Early)') : '')
              }</bdi>
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
            ? <OwnStartView data={ownStart} onRetry={() => load(gw, tab)} onRefreshStatus={refreshReleaseStatus} language={language} releaseStatus={releaseStatus} />
            : <ObjectView tabId={tab} tabTitle={activeTabTitle} data={objectData} onRetry={() => load(gw, tab)} onRefreshStatus={refreshReleaseStatus} language={language} releaseStatus={releaseStatus} />
        )}
      </div>
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
