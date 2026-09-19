'use client'

import { tr, type Language } from '@/lib/translations'
import {
  fillTime,
  fixtureProgress,
  fixtureProgressLine,
  forecastLabel,
  localizeNotice,
  resultsLabel,
  type ForecastStatus,
  type ReleaseNotice,
  type ReleaseStatusResponse,
  type RowRelease,
} from '@/lib/fantasy/releaseStatus'

// Viewer-local time with timezone name (same style as the existing
// "last official-data update" line).
export function formatLocalTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })
  } catch {
    return iso
  }
}

const FORECAST_STYLE: Record<ForecastStatus, string> = {
  EARLY: 'bg-sky-800 text-sky-100',
  FINAL_FROZEN: 'bg-emerald-900 text-emerald-200',
  HISTORICAL_RECONSTRUCTION: 'bg-amber-900 text-amber-200',
}

export function ForecastBadge({ forecast, language }: { forecast: ForecastStatus | null; language: Language }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded ${forecast ? FORECAST_STYLE[forecast] : 'bg-neutral-800 text-neutral-300'}`} data-testid="forecast-badge">
      {forecastLabel(forecast, language)}
    </span>
  )
}

// The two INDEPENDENT badges: Forecast (never changes when matches start)
// and Results (moves on its own), each with its own timestamp. For an early
// forecast, points are never scored, so the Results badge shows fixture
// progress only (never "actual points").
export function ReleaseBadges({ rel, releaseStatus, language }: { rel: RowRelease; releaseStatus: ReleaseStatusResponse | null; language: Language }) {
  if (!rel.forecast) return null
  const rsResults = releaseStatus?.results
  const forecastTime = releaseStatus?.forecast?.generated_at_utc
  const resultsTime = rel.lastUpdatedUtc ?? rsResults?.last_updated_utc ?? null
  const stale = rel.stale || rsResults?.stale === true
  const progress = fixtureProgress(rsResults)

  let resultsBadgeText: string | null = null
  let resultsStyle = 'bg-neutral-800 text-neutral-300'
  let resultsNote: string | null = null
  if (rel.historical) {
    resultsBadgeText = null // GW1-3 reconstruction: unchanged, no results badge
  } else if (rel.early && !rel.tracked) {
    // Early forecast: no scoring. Show fixture progress only.
    if (progress?.started) {
      resultsBadgeText = fixtureProgressLine(rsResults, language)
      resultsStyle = 'bg-neutral-800 text-neutral-200'
      resultsNote = tr('release_not_scored_early', language)
    } else {
      resultsBadgeText = progress ? resultsLabel('NOT_STARTED', language) : resultsLabel('NOT_TRACKED', language)
    }
  } else {
    resultsBadgeText = resultsLabel(rel.results, language)
    resultsStyle =
      rel.results === 'IN_PROGRESS' ? 'bg-yellow-600 text-yellow-50'
      : rel.results === 'PROVISIONAL' ? 'bg-amber-900 text-amber-200'
      : rel.results === 'FINAL' ? 'bg-emerald-900 text-emerald-200'
      : 'bg-neutral-800 text-neutral-300'
  }

  return (
    <div className="flex flex-col gap-1.5 mb-3 text-xs" data-testid="release-badges">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-neutral-500">{tr('release_forecast_label', language)}:</span>
        <ForecastBadge forecast={rel.forecast} language={language} />
        {rel.early && forecastTime && (
          <span className="text-neutral-400">{fillTime(tr('release_forecast_updated', language), formatLocalTime(forecastTime))}</span>
        )}
      </div>
      {resultsBadgeText && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-neutral-500">{tr('release_results_label', language)}:</span>
          <span className={`px-2 py-0.5 rounded ${resultsStyle}`} data-testid="results-badge">{resultsBadgeText}</span>
          {resultsTime && rel.tracked && (
            <span className="text-neutral-400">{fillTime(tr('release_results_updated', language), formatLocalTime(resultsTime))}</span>
          )}
          {rel.early && !rel.tracked && progress?.started && resultsTime && (
            <span className="text-neutral-400">{fillTime(tr('release_results_updated', language), formatLocalTime(resultsTime))}</span>
          )}
          {rel.early && rsResults?.next_kickoff_utc && (
            <span className="text-neutral-400">{fillTime(tr('release_next_kickoff', language), formatLocalTime(rsResults.next_kickoff_utc))}</span>
          )}
        </div>
      )}
      {resultsNote && <div className="text-sky-300">{resultsNote}</div>}
      {stale && rel.tracked && (
        <div className="text-orange-300" role="status" data-testid="results-stale">
          {resultsTime
            ? fillTime(tr('release_results_stale', language), formatLocalTime(resultsTime))
            : tr('release_results_stale_unknown', language)}
        </div>
      )}
    </div>
  )
}

const SEVERITY_STYLE: Record<string, string> = {
  info: 'border-sky-800/60 bg-sky-950/30 text-sky-200',
  warning: 'border-amber-700/60 bg-amber-950/30 text-amber-200',
  error: 'border-red-800/60 bg-red-950/30 text-red-200',
}

// Localized (EN/Sorani) notices from release-status, rendered at the top.
export function ReleaseNotices({ status, language }: { status: ReleaseStatusResponse | null; language: Language }) {
  const notices: ReleaseNotice[] = status?.notices ?? []
  if (notices.length === 0) return null
  return (
    <div className="mb-4 space-y-2" data-testid="release-notices">
      {notices.map((n) => (
        <div
          key={n.code}
          role={n.severity === 'error' ? 'alert' : 'status'}
          className={`text-xs sm:text-sm rounded-lg border px-3 py-2 ${SEVERITY_STYLE[n.severity] ?? SEVERITY_STYLE.info}`}
        >
          <bdi style={{ unicodeBidi: 'isolate' }}>{localizeNotice(n, status, language, formatLocalTime)}</bdi>
        </div>
      ))}
    </div>
  )
}

// Brief confirmation after the displayed release was swapped (e.g. early ->
// final frozen).
export function ReleaseSwapBanner({ kind, language }: { kind: 'final' | 'generic' | null; language: Language }) {
  if (!kind) return null
  return (
    <div role="status" className="mb-4 text-sm rounded-lg border border-emerald-700/60 bg-emerald-950/40 text-emerald-200 px-3 py-2" data-testid="release-swap-banner">
      {tr(kind === 'final' ? 'release_swapped_to_final' : 'release_swapped_generic', language)}
    </div>
  )
}
