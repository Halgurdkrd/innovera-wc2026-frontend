// Release-aware answers for the four "where do we stand" fantasy questions:
//   EXPECTED_POINTS  "What are our expected points?"
//   ACTUAL_SO_FAR    "How many actual points do we have so far?"
//   YET_TO_PLAY      "Who still has to play?"
//   POINTS_FINAL     "Are these points final?"
//
// Everything is derived from the SAME row (own-start / object) the /fantasy
// page displays, so the release id and results revision match the page. The
// forecast label (EARLY vs FINAL FROZEN) comes from forecast_status and is
// never changed by live results; predicted points are never used in place of
// actual points. Pure and import-light (relative imports only) so it can be
// tested under node with fixtures.

import { tr, type Language } from '../../translations'
import {
  deriveRowRelease,
  fixtureProgress,
  fixtureProgressLine,
  forecastLabel,
  formatUtc,
  reconciliationLine,
  reconciliationParts,
  resultsLabel,
  fillTime,
  type PlayerResultFields,
  type ReleaseRowFields,
  type ReleaseStatusResponse,
} from '../../fantasy/releaseStatus'

export type ReleaseQuestionKind = 'EXPECTED_POINTS' | 'ACTUAL_SO_FAR' | 'YET_TO_PLAY' | 'POINTS_FINAL'

// Words meaning "the team/object as a whole" (as opposed to one named player).
const TEAM_WORDS = /\b(our|we|us|team|squad|xi|manager|these|this|total|overall|whole)\b/
const RANKING_WORDS = /\b(top|best|highest|rank|ranking|most|captain)\b/

export function isTeamLevelQuestion(q: string): boolean {
  return TEAM_WORDS.test(q) || /ئێمە|تیمەکەمان|تیمی ئێمە|خاڵمان/.test(q)
}

// Deterministic classification of the four release questions (English and
// Sorani). Returns null for anything else so existing routing is untouched.
export function classifyReleaseQuestion(rawQ: string): ReleaseQuestionKind | null {
  const q = rawQ.toLowerCase().trim()
  const team = isTeamLevelQuestion(q)

  // (d) Are these points final?
  if (
    /\b(are|is)\b.*\b(points?|score|result|results)\b.*\b(final|finali[sz]ed|confirmed|official|provisional)\b/.test(q) ||
    /\b(final|finali[sz]ed|official)\b.*\b(points?|score)\b.*\?$/.test(q) ||
    /\b(are|is)\b.*\b(final|finali[sz]ed)\b/.test(q) && /\b(points?|score|gameweek|gw\s*\d|results?)\b/.test(q) ||
    /\bhas\b.*\b(gameweek|gw\s*\d)\b.*\bfinali[sz]ed\b/.test(q) ||
    /\bpoints?\b.*\b(provisional|final)\b\??$/.test(q) && /\b(are|is)\b/.test(q) ||
    /خاڵەکان.*(کۆتایین|کۆتایی|کاتیین|پشتڕاست)/.test(q) ||
    /(کۆتایین|کۆتایی).*خاڵ/.test(q)
  ) {
    return 'POINTS_FINAL'
  }

  // (c) Who still has to play?
  if (
    /\bwho\b.*\b(still|yet)\b.*\b(to play|has to play|have to play|to come|waiting|left to play|remaining)\b/.test(q) ||
    /\bwho\b.*\b(has|have)\s*(n't|not|yet)\b.*\bplayed\b/.test(q) ||
    /\bwho\b.*\bhasn'?t\b.*\bplayed\b/.test(q) ||
    /\bwho\b.*\b(is|are)\s+(still\s+)?(waiting|to play|yet to play)\b/.test(q) ||
    /\bwho\s+(is|are)\s+(left|remaining)\b/.test(q) ||
    /\b(yet to play|still to play|still waiting|waiting to play|left to play)\b/.test(q) && /\bwho\b|\bplayers?\b/.test(q) ||
    /کێ هێشتا یاری نەکردووە|کێ هێشتا یاری|کێ ماوە/.test(q)
  ) {
    return 'YET_TO_PLAY'
  }

  // (a) Expected points (frozen forecast) -- team-level only, never a
  // ranking ("highest xP") or a single named player's xP.
  if (
    !RANKING_WORDS.test(q.replace(/\bour captain\b/g, '')) &&
    team &&
    (/\b(expected|predicted|projected|forecast(ed)?)\b.*\b(points?|xp|total|score)\b/.test(q) || /\b(xp|expected points)\b/.test(q)) &&
    !/\bactual\b|\bso far\b/.test(q)
  ) {
    return 'EXPECTED_POINTS'
  }
  if (/خاڵی (پێشبینیکراو|چاوەڕوانکراو)/.test(q) && isTeamLevelQuestion(q)) return 'EXPECTED_POINTS'

  // (b) Actual points so far.
  if (
    (/\bactual\b.*\bpoints?\b/.test(q) && (team || /\bhow many\b/.test(q))) ||
    (/\bpoints?\b.*\bso far\b|\bscore so far\b|\bso far\b.*\bpoints?\b/.test(q) && team) ||
    /\bhow many points\b.*\b(do we|have we|we have|do we have|does (our|the) )/.test(q) ||
    /\b(our|the team'?s?|the manager'?s?)\s+(current\s+|live\s+)?(score|points)\b/.test(q) ||
    /\bwhat('?s| is)\s+(our|the)\s+(current\s+|live\s+)?(score|points)\b/.test(q) ||
    /چەند خاڵمان|چەند خاڵمان هەیە|خاڵی ڕاستەقینە/.test(q)
  ) {
    return 'ACTUAL_SO_FAR'
  }

  return null
}

// ---------------------------------------------------------------------------
// Answer building
// ---------------------------------------------------------------------------

interface Member extends PlayerResultFields {
  name: string
  role?: string
  is_captain?: boolean
}

export interface ReleaseAnswerRow extends ReleaseRowFields {
  predicted_xi_total_xp?: number | null
  predicted_xi_xp?: number | null
  players?: Member[]
  player_membership?: Member[] | 'NOT_AVAILABLE'
}

export interface ReleaseAnswerInput {
  kind: ReleaseQuestionKind
  lang: 'en' | 'ku'
  gw: number
  objectLabel: string
  row: ReleaseAnswerRow
  releaseStatus?: ReleaseStatusResponse | null
}

function membersOf(row: ReleaseAnswerRow): Member[] {
  if (Array.isArray(row.players)) return row.players
  if (Array.isArray(row.player_membership)) return row.player_membership
  return []
}

// Local-language helper.
function L(lang: 'en' | 'ku', en: string, ku: string): string { return lang === 'ku' ? ku : en }
function trLang(lang: 'en' | 'ku'): Language { return lang === 'ku' ? 'KU' : 'EN' }

export interface ReleaseContextFacts {
  gameweek: number
  objectLabel: string
  forecast: ReturnType<typeof deriveRowRelease>['forecast']
  results: ReturnType<typeof deriveRowRelease>['results']
  releaseId: string | null
  revision: number | null
  resultsUpdatedUtc: string | null
  forecastGeneratedUtc: string | null
  // Official fixture data time (release-status), shown when nothing is scored.
  fixturesUpdatedUtc: string | null
}

// The identity of what is being answered from -- the same release id and
// results revision the page renders from (row fields first; release-status
// only fills gaps such as the forecast generation time).
export function releaseContextFacts(row: ReleaseAnswerRow, gw: number, objectLabel: string, rs?: ReleaseStatusResponse | null): ReleaseContextFacts {
  const rel = deriveRowRelease(row)
  return {
    gameweek: gw,
    objectLabel,
    forecast: rel.forecast,
    results: rel.results,
    releaseId: rel.releaseId ?? rs?.forecast?.release_id ?? null,
    revision: rel.revision ?? rs?.results?.revision ?? null,
    resultsUpdatedUtc: rel.lastUpdatedUtc ?? rs?.results?.last_updated_utc ?? null,
    forecastGeneratedUtc: rs?.forecast?.generated_at_utc ?? null,
    fixturesUpdatedUtc: rs?.results?.last_updated_utc ?? null,
  }
}

// One-line preamble present in EVERY answer: gameweek, decision object,
// forecast status, and results status with its update time.
export function releasePreamble(f: ReleaseContextFacts, lang: 'en' | 'ku'): string {
  const tl = trLang(lang)
  const forecast = forecastLabel(f.forecast, tl)
  let resultsPart: string
  if (f.results === 'NOT_TRACKED' || f.results === null) {
    const ft = formatUtc(f.fixturesUpdatedUtc)
    const fixtureTime = ft ? L(lang, `; official fixture data updated ${ft}`, `؛ داتای فەرمیی یارییەکان نوێکرایەوە ${ft}`) : ''
    resultsPart = `${tr('release_results_label', tl)}: ${resultsLabel('NOT_TRACKED', tl)}${fixtureTime}`
  } else {
    const t = formatUtc(f.resultsUpdatedUtc)
    const upd = t ? fillTime(tr('release_results_updated', tl), t) : L(lang, 'no results update yet', 'هێشتا نوێکردنەوەی ئەنجام نییە')
    resultsPart = `${tr('release_results_label', tl)}: ${resultsLabel(f.results, tl)}; ${upd}${f.revision != null ? ` (r${f.revision})` : ''}`
  }
  const fTime = f.forecast === 'EARLY' && f.forecastGeneratedUtc ? ` (${fillTime(tr('release_forecast_updated', tl), formatUtc(f.forecastGeneratedUtc) ?? '')})` : ''
  return `GW${f.gameweek} • ${f.objectLabel} • ${tr('release_forecast_label', tl)}: ${forecast}${fTime} • ${resultsPart}`
}


// For an early forecast the fixtures may already be under way, but points are
// never scored against it -- say so, and show fixture progress only.
function earlyFixturesNote(rel: ReturnType<typeof deriveRowRelease>, rs: ReleaseStatusResponse | null | undefined, lang: 'en' | 'ku'): string | null {
  if (!rel.early) return null
  const progress = fixtureProgress(rs?.results)
  if (!progress || !progress.started) return null
  return `${fixtureProgressLine(rs?.results, trLang(lang))}. ${tr('release_not_scored_early', trLang(lang))}`
}

export function buildReleaseAnswerText(input: ReleaseAnswerInput): string {
  const { kind, lang, gw, objectLabel, row, releaseStatus } = input
  const tl = trLang(lang)
  const facts = releaseContextFacts(row, gw, objectLabel, releaseStatus)
  const rel = deriveRowRelease(row)
  const head = releasePreamble(facts, lang)
  const members = membersOf(row)
  const officiallyFinalized = releaseStatus?.results?.officially_finalized ?? row.live_results_meta?.event_officially_finalized ?? false
  const finalized = row.finalization?.status === 'FINALIZED' || releaseStatus?.results?.finalized === true

  if (kind === 'EXPECTED_POINTS') {
    const xp = row.predicted_xi_total_xp ?? row.predicted_xi_xp
    const label = forecastLabel(rel.forecast, tl)
    const lines = [head]
    lines.push(xp == null
      ? L(lang, `The frozen expected points total is not available for this release (${label}).`, `کۆی خاڵی پێشبینیکراوی جێگیرکراو بۆ ئەم بڵاوکردنەوەیە بەردەست نییە (${label}).`)
      : L(lang,
          `Expected points: ${xp} xP -- the frozen forecast total for this ${label.toLowerCase()} (a forecast, not a result).`,
          `کۆی خاڵی پێشبینیکراو: ${xp} xP -- کۆی پێشبینی جێگیرکراو بۆ ${label} (پێشبینییە، نەک ئەنجامی ڕاستەقینە).`))
    if (rel.early) lines.push(tr('early_forecast_note', tl))
    if (rel.tracked && row.points_so_far_total != null) {
      lines.push(L(lang,
        `Actual points so far are a separate figure: ${row.points_so_far_total} (${resultsLabel(rel.results, tl)}); the expected points above are unchanged by results.`,
        `خاڵی ڕاستەقینەی هەتا ئێستا ژمارەیەکی جیاوازە: ${row.points_so_far_total} (${resultsLabel(rel.results, tl)})؛ خاڵی پێشبینیکراوی سەرەوە بە ئەنجامەکان ناگۆڕێت.`))
    }
    return lines.join('\n')
  }

  if (kind === 'ACTUAL_SO_FAR') {
    const lines = [head]
    if (rel.results === 'NOT_TRACKED' || rel.results === null) {
      lines.push(L(lang,
        `No results are scored for this release (${forecastLabel(rel.forecast, tl)}), so there are no actual points to report. Expected points are a forecast and are not used as a substitute.`,
        `هیچ ئەنجامێک بۆ ئەم بڵاوکردنەوەیە (${forecastLabel(rel.forecast, tl)}) تۆمار نەکراوە، بۆیە خاڵی ڕاستەقینە نییە. خاڵی پێشبینیکراو پێشبینییە و جێگرەوەی خاڵی ڕاستەقینە نییە.`))
      const ea = earlyFixturesNote(rel, releaseStatus, lang)
      if (ea) lines.push(ea)
      return lines.join('\n')
    }
    if (rel.results === 'NOT_STARTED') {
      lines.push(L(lang,
        'No matches have started yet, so there are no actual points so far.',
        'هێشتا هیچ یارییەک دەستی پێنەکردووە، بۆیە هێشتا خاڵی ڕاستەقینە نییە.'))
      return lines.join('\n')
    }
    const total = row.points_so_far_total
    const provisional = rel.results !== 'FINAL'
    lines.push(total == null
      ? L(lang, 'The points-so-far total is not available yet.', 'کۆی خاڵی هەتا ئێستا هێشتا بەردەست نییە.')
      : L(lang,
          `${provisional ? 'Actual points so far' : 'Final actual points'}: ${total}${provisional ? ' (provisional)' : ' (final)'}.`,
          `خاڵی ڕاستەقینەی هەتا ئێستا: ${total}${provisional ? ' (کاتیی)' : ' (کۆتایی)'}.`))
    const rec = reconciliationLine(row, tl)
    if (rec) lines.push(`${L(lang, 'Breakdown', 'وردەکاری')}: ${rec}`)
    const parts = reconciliationParts(row)
    if (parts && parts.ok === false) lines.push(tr('release_reconciliation_mismatch', tl))
    if (row.autosub_status) {
      const key = `release_autosub_${row.autosub_status}` as Parameters<typeof tr>[0]
      try { const t = tr(key, tl); if (t) lines.push(t) } catch { /* unknown autosub status: skip */ }
    }
    const pending = row.pending_adjustments ?? []
    if (pending.length) lines.push(`${tr('release_pending_adjustments', tl)}: ${pending.join(' ')}`)
    const yet = row.players_yet_to_play ?? []
    if (yet.length) lines.push(`${tr('release_yet_to_play_list', tl)}: ${yet.join(', ')}`)
    const fx = releaseStatus?.results ?? row.live_results_meta
    if (fx && fx.fixtures_total != null) {
      const done = (fx.fixtures_finished_confirmed ?? 0) + (fx.fixtures_finished_provisional ?? 0)
      lines.push(L(lang,
        `Matches completed: ${done}/${fx.fixtures_total}; in progress: ${fx.fixtures_in_progress ?? 0}; not started: ${fx.fixtures_not_started ?? 0}.`,
        `یاری تەواوبووە: ${done}/${fx.fixtures_total}؛ بەردەوام: ${fx.fixtures_in_progress ?? 0}؛ دەستی پێنەکردووە: ${fx.fixtures_not_started ?? 0}.`))
    }
    return lines.join('\n')
  }

  if (kind === 'YET_TO_PLAY') {
    const lines = [head]
    if (rel.results === 'NOT_TRACKED' || rel.results === null) {
      lines.push(L(lang,
        'No results are tracked for this release, so there is no play-state to report; the gameweek has not been scored against this forecast.',
        'هیچ ئەنجامێک بۆ ئەم بڵاوکردنەوەیە بەدواداچوونی بۆ ناکرێت، بۆیە دۆخی یاریکردن بەردەست نییە.'))
      const ey = earlyFixturesNote(rel, releaseStatus, lang)
      if (ey) lines.push(ey)
      return lines.join('\n')
    }
    const explicit = row.players_yet_to_play
    const derived = members.filter((m) => m.yet_to_play === true || (m.yet_to_play == null && m.match_status === 'NOT_STARTED')).map((m) => m.name)
    const yet = Array.isArray(explicit) ? explicit : derived
    const inProgress = members.filter((m) => m.match_status === 'IN_PROGRESS').map((m) => m.name)
    lines.push(yet.length
      ? L(lang, `Yet to play (${yet.length}): ${yet.join(', ')}.`, `هێشتا یاریان نەکردووە (${yet.length}): ${yet.join(', ')}.`)
      : L(lang, 'Nobody is yet to play -- every player\'s fixtures have started or finished.', 'هیچ کەس نەماوە یاری بکات -- یارییەکانی هەموو یاریزانان دەستیان پێکردووە یان تەواوبوون.'))
    if (inProgress.length) lines.push(L(lang, `Playing now (match in progress): ${inProgress.join(', ')}.`, `ئێستا لە یاریدان (یارییەکە بەردەوامە): ${inProgress.join(', ')}.`))
    return lines.join('\n')
  }

  // POINTS_FINAL
  const lines = [head]
  if (rel.results === 'NOT_TRACKED' || rel.results === null) {
    lines.push(L(lang,
      `No -- there are no points to finalize: no results are scored for this release (${forecastLabel(rel.forecast, tl)}).`,
      `نەخێر -- خاڵێک نییە کۆتایی بکرێت: هیچ ئەنجامێک بۆ ئەم بڵاوکردنەوەیە (${forecastLabel(rel.forecast, tl)}) تۆمار نەکراوە.`))
  } else if (rel.results === 'FINAL' || finalized) {
    const net = row.finalization?.net_points
    lines.push(L(lang,
      `Yes -- final${net != null ? `: ${net} net points` : ''}${officiallyFinalized ? ' (officially finalized).' : '.'}`,
      `بەڵێ -- کۆتایی${net != null ? `: ${net} خاڵی نیشتەجێ` : ''}${officiallyFinalized ? ' (بە فەرمی کۆتایی پێهێنراوە).' : '.'}`))
  } else {
    lines.push(L(lang,
      `No -- ${resultsLabel(rel.results, 'EN')}.${officiallyFinalized ? ' The official FPL event is finalized; Ennovera\'s final scoring is not yet confirmed.' : ' Official confirmation (bonus points and corrections) is still pending.'}`,
      `نەخێر -- ${resultsLabel(rel.results, 'KU')}.${officiallyFinalized ? ' ڕووداوی فەرمی FPL کۆتایی پێهێنراوە؛ هەڵسەنگاندنی کۆتایی ئینۆڤێرا هێشتا پشتڕاست نەکراوەتەوە.' : ' پشتڕاستکردنەوەی فەرمی (خاڵی بۆنس و ڕاستکردنەوەکان) هێشتا چاوەڕوانە.'}`))
  }
  return lines.join('\n')
}
