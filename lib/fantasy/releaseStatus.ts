// Release model helpers shared by the /fantasy page, the background refresh
// poller and the fantasy chat. Framework-free and import-light (relative
// imports only) so it can be unit-tested directly under node.
//
// Two INDEPENDENT facts describe every published row:
//   forecast_status: EARLY | FINAL_FROZEN | HISTORICAL_RECONSTRUCTION
//                    (never changes when matches start)
//   results_status:  NOT_STARTED | IN_PROGRESS | PROVISIONAL | FINAL | NOT_TRACKED
// The legacy single `status` field conflated the two (and flipped a frozen
// forecast to "live provisional" once matches began), so it is only used as
// a fallback when the new fields are absent.

import { tr, type Language, type TranslationKey } from '../translations'

export type ForecastStatus = 'EARLY' | 'FINAL_FROZEN' | 'HISTORICAL_RECONSTRUCTION'
export type ResultsStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'PROVISIONAL' | 'FINAL' | 'NOT_TRACKED'

export type AutosubStatus =
  | 'PENDING_UNRESOLVED_FIXTURES'
  | 'NOT_APPLICABLE_XI_ONLY'
  | 'APPLIED_PROVISIONAL'
  | 'APPLIED_FINAL'
  | 'NONE_NEEDED'

export interface Reconciliation {
  xi_raw?: number | null
  captain_extra?: number | null
  autosub_adjustment?: number | null
  hit_cost?: number | null
  total?: number | null
  ok?: boolean | null
}

// Fields every own-start / object / full-pool row now carries in addition to
// the (unchanged) legacy `status` and live-overlay fields.
export interface ReleaseRowFields {
  status?: string
  forecast_status?: ForecastStatus | string | null
  results_status?: ResultsStatus | string | null
  release_id?: string | null
  release_hash?: string | null
  results_revision?: number | null
  results_last_updated_utc?: string | null
  results_stale?: boolean | null
  gameweek?: number
  points_so_far_xi_raw?: number | null
  captain_extra?: number | null
  captain_status?: string | null
  autosub_adjustment?: number | null
  autosub_status?: AutosubStatus | string | null
  hit_cost_applied?: number | null
  points_so_far_total?: number | null
  reconciliation?: Reconciliation | null
  players_yet_to_play?: string[] | null
  players_data_missing?: string[] | null
  pending_adjustments?: string[] | null
  finalization?: {
    status?: string
    gross_points?: number | null
    net_points?: number | null
    finalized_at_utc?: string | null
    revisions?: unknown[]
  } | null
  live_results_meta?: {
    fixtures_total?: number
    fixtures_not_started?: number
    fixtures_in_progress?: number
    fixtures_finished_provisional?: number
    fixtures_finished_confirmed?: number
    last_updated_utc?: string
    event_officially_finalized?: boolean
  } | null
}

// Per-player result fields (players for own-start, player_membership for objects).
export interface PlayerResultFields {
  actual_points?: number | null
  match_status?: string
  yet_to_play?: boolean | null
  data_missing?: boolean | null
  points_final?: boolean | null
  bonus_points?: number | null
  fixtures_remaining?: number | null
}

const FORECAST_VALUES = new Set(['EARLY', 'FINAL_FROZEN', 'HISTORICAL_RECONSTRUCTION'])
const RESULTS_VALUES = new Set(['NOT_STARTED', 'IN_PROGRESS', 'PROVISIONAL', 'FINAL', 'NOT_TRACKED'])

// ---------------------------------------------------------------------------
// Status resolution (new fields preferred, legacy `status` as fallback)
// ---------------------------------------------------------------------------

export function resolveForecastStatus(row: ReleaseRowFields | null | undefined): ForecastStatus | null {
  if (!row) return null
  if (row.forecast_status && FORECAST_VALUES.has(row.forecast_status)) return row.forecast_status as ForecastStatus
  switch (row.status) {
    case 'EARLY_FORECAST_SUBJECT_TO_UPDATE': return 'EARLY'
    // The legacy live/evaluated statuses only ever described the registered
    // final pair, so their forecast is the final frozen one.
    case 'FINAL_FROZEN_FORECAST':
    case 'LIVE_PROVISIONAL':
    case 'FINALIZED_EVALUATION': return 'FINAL_FROZEN'
    case 'HISTORICAL_RECONSTRUCTION': return 'HISTORICAL_RECONSTRUCTION'
    default: return null
  }
}

export function resolveResultsStatus(row: ReleaseRowFields | null | undefined): ResultsStatus | null {
  if (!row) return null
  if (row.results_status && RESULTS_VALUES.has(row.results_status)) return row.results_status as ResultsStatus
  const meta = row.live_results_meta
  switch (row.status) {
    case 'EARLY_FORECAST_SUBJECT_TO_UPDATE':
    case 'HISTORICAL_RECONSTRUCTION': return 'NOT_TRACKED'
    case 'FINAL_FROZEN_FORECAST': return 'NOT_STARTED'
    case 'FINALIZED_EVALUATION': return 'FINAL'
    case 'LIVE_PROVISIONAL': {
      if (!meta || !meta.fixtures_total) return 'IN_PROGRESS'
      const notStarted = meta.fixtures_not_started ?? 0
      const inProgress = meta.fixtures_in_progress ?? 0
      if (inProgress > 0) return 'IN_PROGRESS'
      if (notStarted >= meta.fixtures_total) return 'NOT_STARTED'
      if (notStarted > 0) return 'IN_PROGRESS'
      return meta.event_officially_finalized ? 'FINAL' : 'PROVISIONAL'
    }
    default: return null
  }
}

export interface RowRelease {
  forecast: ForecastStatus | null
  results: ResultsStatus | null
  // True when actual points are scored against this release (a live/final
  // results overlay exists), independent of the forecast label.
  tracked: boolean
  // Points so far are still moving (in progress or provisional).
  live: boolean
  final: boolean
  early: boolean
  historical: boolean
  releaseId: string | null
  revision: number | null
  lastUpdatedUtc: string | null
  stale: boolean
}

export function deriveRowRelease(row: ReleaseRowFields | null | undefined): RowRelease {
  const forecast = resolveForecastStatus(row)
  const results = resolveResultsStatus(row)
  const tracked = results === 'IN_PROGRESS' || results === 'PROVISIONAL' || results === 'FINAL'
  return {
    forecast,
    results,
    tracked,
    live: results === 'IN_PROGRESS' || results === 'PROVISIONAL',
    final: results === 'FINAL',
    early: forecast === 'EARLY',
    historical: forecast === 'HISTORICAL_RECONSTRUCTION',
    releaseId: row?.release_id ?? null,
    revision: row?.results_revision ?? null,
    lastUpdatedUtc: row?.results_last_updated_utc ?? row?.live_results_meta?.last_updated_utc ?? null,
    stale: row?.results_stale === true,
  }
}

// ---------------------------------------------------------------------------
// Labels (single source for page + chat so EN/KU agree)
// ---------------------------------------------------------------------------

export function forecastLabel(f: ForecastStatus | 'NONE' | null | undefined, lang: Language): string {
  switch (f) {
    case 'EARLY': return tr('release_forecast_early', lang)
    case 'FINAL_FROZEN': return tr('release_forecast_final', lang)
    case 'HISTORICAL_RECONSTRUCTION': return tr('release_forecast_historical', lang)
    default: return tr('release_forecast_none', lang)
  }
}

export function resultsLabel(r: ResultsStatus | null | undefined, lang: Language): string {
  switch (r) {
    case 'NOT_STARTED': return tr('release_results_not_started', lang)
    case 'IN_PROGRESS': return tr('release_results_in_progress', lang)
    case 'PROVISIONAL': return tr('release_results_provisional', lang)
    case 'FINAL': return tr('release_results_final', lang)
    case 'NOT_TRACKED': return tr('release_results_not_tracked', lang)
    default: return '—'
  }
}

export function fillTime(template: string, time: string): string {
  return template.split('{time}').join(time)
}

// Deterministic UTC rendering (never depends on the viewer's/server's locale).
export function formatUtc(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC'
}

// ---------------------------------------------------------------------------
// release-status endpoint shape
// ---------------------------------------------------------------------------

export interface ReleaseNotice { code: string; severity: 'info' | 'warning' | 'error' | string; text_en?: string }

export interface ReleaseResultsSummary {
  status?: ResultsStatus | string
  label?: string
  fixtures_total?: number
  fixtures_not_started?: number
  fixtures_in_progress?: number
  fixtures_finished_provisional?: number
  fixtures_finished_confirmed?: number
  last_updated_utc?: string | null
  last_attempt_utc?: string | null
  stale?: boolean
  stale_reason?: string | null
  revision?: number | null
  officially_finalized?: boolean
  finalized?: boolean
  scored_against_release?: boolean
  corrections?: number
  // Optional, not yet in the backend contract: earliest upcoming kickoff.
  next_kickoff_utc?: string | null
}

export interface ReleaseStatusResponse {
  status: string
  reason?: string
  gameweek?: number
  season?: string
  deadline_iso?: string | null
  deadline_passed?: boolean
  forecast?: {
    status?: 'EARLY' | 'FINAL_FROZEN' | 'NONE' | string
    release_id?: string | null
    generated_at_utc?: string | null
    content_hash?: string | null
    early_versions?: { freeze_id: string; generated_at_utc: string }[]
  }
  final_freeze?: {
    window_start_utc?: string | null
    window_end_utc?: string | null
    window?: string
    registered?: boolean
    publication_state?: string
  }
  results?: ReleaseResultsSummary
  bundle?: { manifest_hash?: string | null; generated_at_utc?: string | null; export_version?: string | null }
  notices?: ReleaseNotice[]
  next_kickoff_utc?: string | null
}

export function isAvailableReleaseStatus(s: ReleaseStatusResponse | null | undefined): s is ReleaseStatusResponse {
  return !!s && s.status === 'AVAILABLE'
}

// Identity of what is displayed -- when it changes the page re-fetches the
// object rows (release swap, new results revision, new bundle, or results
// state change).
export function releaseSignature(s: ReleaseStatusResponse | null | undefined): string {
  if (!s) return ''
  return [
    s.forecast?.release_id ?? '',
    s.results?.revision ?? '',
    s.bundle?.manifest_hash ?? '',
    s.results?.status ?? '',
    s.results?.finalized ? 'F' : '',
  ].join('|')
}

// Localized notice text. Known codes use the site's i18n registry (EN and
// Sorani); an unknown code falls back to the backend-supplied English text.
const NOTICE_KEYS = {
  FINAL_NOT_REGISTERED_DEADLINE_PASSED: 'release_notice_FINAL_NOT_REGISTERED_DEADLINE_PASSED',
  EARLY_FORECAST_STALE: 'release_notice_EARLY_FORECAST_STALE',
  RESULTS_STALE: 'release_notice_RESULTS_STALE',
  MATCHES_COMPLETE_POINTS_PROVISIONAL: 'release_notice_MATCHES_COMPLETE_POINTS_PROVISIONAL',
  FINAL_REGISTRATION_PENDING_PUBLICATION: 'release_notice_FINAL_REGISTRATION_PENDING_PUBLICATION',
  RESULTS_NOT_SCORED_AGAINST_EARLY_FORECAST: 'release_notice_RESULTS_NOT_SCORED_AGAINST_EARLY_FORECAST',
} as const

export function localizeNotice(n: ReleaseNotice, s: ReleaseStatusResponse | null | undefined, lang: Language, formatTime: (iso: string | null | undefined) => string): string {
  const key = (NOTICE_KEYS as Record<string, TranslationKey>)[n.code]
  if (!key) return n.text_en ?? n.code
  const unknown = tr('release_unknown_time', lang)
  let iso: string | null | undefined
  if (n.code === 'RESULTS_STALE') iso = s?.results?.last_updated_utc
  else iso = s?.forecast?.generated_at_utc
  const time = iso ? formatTime(iso) : unknown
  return fillTime(tr(key, lang), time)
}

// ---------------------------------------------------------------------------
// Reconciliation ("raw XI + captain/vice extra + autosub − hits = total")
// ---------------------------------------------------------------------------

export function reconciliationParts(row: ReleaseRowFields): { xi: number; cap: number; auto: number; hit: number; total: number; ok: boolean | null } | null {
  const r = row.reconciliation
  const xi = r?.xi_raw ?? row.points_so_far_xi_raw
  const total = r?.total ?? row.points_so_far_total
  if (xi == null || total == null) return null
  return {
    xi,
    cap: r?.captain_extra ?? row.captain_extra ?? 0,
    auto: r?.autosub_adjustment ?? row.autosub_adjustment ?? 0,
    hit: r?.hit_cost ?? row.hit_cost_applied ?? 0,
    total,
    ok: r?.ok ?? null,
  }
}

export function reconciliationLine(row: ReleaseRowFields, lang: Language): string | null {
  const p = reconciliationParts(row)
  if (!p) return null
  return tr('release_reconciliation', lang)
    .replace('{xi}', String(p.xi))
    .replace('{cap}', String(p.cap))
    .replace('{auto}', String(p.auto))
    .replace('{hit}', String(p.hit))
    .replace('{total}', String(p.total))
}

// ---------------------------------------------------------------------------
// XI-only objects render no bench
// ---------------------------------------------------------------------------

// Decision objects that are XI-only by definition (no bench, no autosubs).
const XI_ONLY_OBJECTS = new Set(['PRIMARY', 'OPTIONAL_XI_1', 'OPTIONAL_XI_2', 'OPTIONAL_XI_3', 'OPTIONAL_XI_4'])

export function isXiOnlyObject(object: string): boolean {
  return XI_ONLY_OBJECTS.has(object)
}

export function objectHasBench(object: string, members: { role?: string }[] | null | undefined): boolean {
  if (isXiOnlyObject(object)) return false
  return !!members && members.some((m) => m.role === 'BENCH')
}

// ---------------------------------------------------------------------------
// Poll cadence (pure)
// ---------------------------------------------------------------------------

export const POLL_FAST_MS = 30_000
export const POLL_PROVISIONAL_MS = 120_000
export const POLL_IDLE_MS = 600_000
export const POLL_BACKOFF_CAP_MS = 300_000
export const KICKOFF_WINDOW_MS = 20 * 60_000

export interface PollState {
  resultsStatus?: ResultsStatus | string | null
  finalized?: boolean | null
  fixturesInProgress?: number | null
  nextKickoffUtc?: string | null
  nowMs: number
  consecutiveErrors?: number
}

// Base cadence ignoring errors: 30s while results are in progress / a fixture
// is live / a kickoff is within 20 minutes; 120s while provisional and not
// finalized; 10 minutes otherwise. `null` = stop polling (finalized).
export function baseDelayMs(state: PollState): number | null {
  if (state.finalized) return null
  const nextKickoff = state.nextKickoffUtc ? Date.parse(state.nextKickoffUtc) : NaN
  const kickoffSoon = Number.isFinite(nextKickoff) && nextKickoff - state.nowMs <= KICKOFF_WINDOW_MS
  if (state.resultsStatus === 'IN_PROGRESS' || (state.fixturesInProgress ?? 0) > 0 || kickoffSoon) return POLL_FAST_MS
  if (state.resultsStatus === 'PROVISIONAL') return POLL_PROVISIONAL_MS
  return POLL_IDLE_MS
}

// With errors: exponential backoff from the base cadence, capped at 5 min
// (a base already at/above the cap is never made faster).
export function nextPollDelayMs(state: PollState): number | null {
  const base = baseDelayMs(state)
  if (base === null) return null
  const errors = Math.max(0, Math.floor(state.consecutiveErrors ?? 0))
  if (errors === 0 || base >= POLL_BACKOFF_CAP_MS) return base
  return Math.min(POLL_BACKOFF_CAP_MS, base * 2 ** errors)
}

export function pollStateFromStatus(s: ReleaseStatusResponse | null | undefined, nowMs: number, consecutiveErrors: number): PollState {
  const r = s?.results
  return {
    resultsStatus: r?.status ?? null,
    finalized: r?.finalized === true,
    fixturesInProgress: r?.fixtures_in_progress ?? 0,
    nextKickoffUtc: r?.next_kickoff_utc ?? s?.next_kickoff_utc ?? null,
    nowMs,
    consecutiveErrors,
  }
}

// ---------------------------------------------------------------------------
// Fixture progress (shown for an early forecast, where points are NOT scored)
// ---------------------------------------------------------------------------

export function fixtureProgress(r: ReleaseResultsSummary | null | undefined): { done: number; total: number; live: number; started: boolean } | null {
  if (!r || r.fixtures_total == null) return null
  const done = (r.fixtures_finished_confirmed ?? 0) + (r.fixtures_finished_provisional ?? 0)
  const live = r.fixtures_in_progress ?? 0
  return { done, total: r.fixtures_total, live, started: done > 0 || live > 0 }
}

export function fixtureProgressLine(r: ReleaseResultsSummary | null | undefined, lang: Language): string | null {
  const f = fixtureProgress(r)
  if (!f) return null
  return tr('release_fixtures_progress', lang)
    .replace('{done}', String(f.done))
    .replace('{total}', String(f.total))
    .replace('{live}', String(f.live))
}
