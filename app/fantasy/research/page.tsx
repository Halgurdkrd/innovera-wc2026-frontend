'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Navbar from '@/components/Navbar'
import { PitchVisualization } from '@/components/fantasy/PitchVisualization'
import ErrorState from '@/components/ui/ErrorState'
import { useLanguage } from '@/hooks/useLanguage'
import type { FPLPlayer } from '@/lib/api/types'

// Additive research view -- does NOT modify or replace the existing FPL-03
// experience at /fantasy. Displays the VERIFIED M3_SHRUNK/V0_CONTROL research
// artifacts: GW1-3 is always a historical reconstruction; a further GW is
// shown only if scripts/discover_final_pair.py finds a real, hash-verified
// committed pair in the registry (never fabricated, never assumed to be GW4
// specifically -- whatever GW the registered pair actually declares).

type Model = 'M3_SHRUNK' | 'V0_CONTROL'
type ObjectLabel = 'OWN_START' | 'A_BLANK_SLATE' | 'B_LEGAL_BEST_XI' | 'PRIMARY' | 'OPTIONAL_XI_1' | 'OPTIONAL_XI_2' | 'OPTIONAL_XI_3' | 'OPTIONAL_XI_4'

const OBJECT_TABS: { label: ObjectLabel; title: string }[] = [
  { label: 'OWN_START', title: 'Own-Start Manager' },
  { label: 'A_BLANK_SLATE', title: 'Blank Slate' },
  { label: 'B_LEGAL_BEST_XI', title: 'Best XI' },
  { label: 'PRIMARY', title: 'Optional XI: Primary' },
  { label: 'OPTIONAL_XI_1', title: 'Optional XI 1' },
  { label: 'OPTIONAL_XI_2', title: 'Optional XI 2' },
  { label: 'OPTIONAL_XI_3', title: 'Optional XI 3' },
  { label: 'OPTIONAL_XI_4', title: 'Optional XI 4' },
]

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
  // Present only on Blank-Slate/Best-XI historical membership rows (a
  // different source than Own-Start): real recorded minutes/points for an
  // already-completed gameweek, and whether the name resolved to a stable ID.
  minutes?: number
  id_resolved?: boolean
}

interface OwnStartResponse {
  status: string
  reason?: string
  model?: Model
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
  model?: Model
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
  final_pair_freeze_id?: string | null
}

function isHistoricalGw(gw: number) {
  return gw >= 1 && gw <= 3
}

// Never claims a match has (not) started for a row with no live match-state
// evidence -- historical rows with a real recorded result show FT/real
// points; anything else (an unrecorded historical row, or a genuinely
// unplayed forecast row) is honestly labelled NOT_TRACKED rather than a
// guessed "Not Started".
function toFplPlayer(p: PlayerRow): FPLPlayer {
  const hasResult = p.actual_points !== null && p.actual_points !== undefined
  return {
    player_id: p.stable_player_id,
    name: p.name,
    web_name: p.name,
    club: p.club,
    position: p.position,
    price: p.price ?? 0,
    expected_points: p.predicted_xp ?? 0,
    expected_minutes: p.expected_minutes ?? 0,
    starting_prob: p.p_start ?? (p.role === 'XI' ? 1 : 0),
    haul_prob: 0,
    is_starting: p.role === 'XI',
    is_captain: p.is_captain,
    is_vice_captain: p.is_vice,
    bench_order: p.role === 'BENCH' ? 1 : null,
    actual_points: p.actual_points,
    match_status: hasResult ? 'FT' : 'NOT_TRACKED',
    p_sub: p.p_sub ?? null,
    p_dnp: p.p_dnp ?? null,
  }
}

async function fetchOwnStart(gw: number, model: Model): Promise<OwnStartResponse> {
  const res = await fetch(`/api/research-fpl/own-start?gw=${gw}&model=${model}`)
  return res.json()
}

async function fetchObject(gw: number, model: Model, object: ObjectLabel): Promise<ObjectResponse> {
  const res = await fetch(`/api/research-fpl/object?gw=${gw}&model=${model}&object=${object}`)
  return res.json()
}

async function fetchStatus(): Promise<StatusResponse> {
  const res = await fetch('/api/research-fpl/status')
  return res.json()
}

function ProbabilityTable({ players }: { players: PlayerRow[] }) {
  const withProb = players.filter((p) => p.probability_fields_available)
  if (withProb.length === 0) {
    return (
      <div className="text-xs text-neutral-500 py-3">
        Probability-card fields (P(start), P(sub), P(DNP), expected minutes) are not available for this gameweek's source artifact.
      </div>
    )
  }
  return (
    <div className="overflow-x-auto mt-3">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-neutral-400 border-b border-neutral-800">
            <th className="text-left py-1 pr-2">Player</th>
            <th className="text-right py-1 px-2">P(start)</th>
            <th className="text-right py-1 px-2">P(sub)</th>
            <th className="text-right py-1 px-2">P(DNP)</th>
            <th className="text-right py-1 pl-2">Exp. mins</th>
          </tr>
        </thead>
        <tbody>
          {withProb.map((p) => (
            <tr key={p.stable_player_id} className="border-b border-neutral-900">
              <td className="py-1 pr-2 text-neutral-200">{p.name}</td>
              <td className="text-right py-1 px-2">{p.p_start != null ? `${Math.round(p.p_start * 100)}%` : '—'}</td>
              <td className="text-right py-1 px-2">{p.p_sub != null ? `${Math.round(p.p_sub * 100)}%` : '—'}</td>
              <td className="text-right py-1 px-2">{p.p_dnp != null ? `${Math.round(p.p_dnp * 100)}%` : '—'}</td>
              <td className="text-right py-1 pl-2">{p.expected_minutes != null ? p.expected_minutes.toFixed(0) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function OwnStartCard({ label, data }: { label: Model; data: OwnStartResponse | null }) {
  const isForecast = data?.status === 'FINAL_FROZEN_FORECAST'
  const isAvailable = data?.status === 'HISTORICAL_RECONSTRUCTION' || isForecast
  return (
    <div className="bg-neutral-900 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold">{label}</h2>
        <span className={`text-xs px-2 py-0.5 rounded ${!isAvailable ? 'bg-red-900 text-red-200' : isForecast ? 'bg-emerald-900 text-emerald-200' : 'bg-amber-900 text-amber-200'}`}>
          {!isAvailable ? 'Not available' : isForecast ? 'Final frozen forecast' : 'Historical reconstruction'}
        </span>
      </div>
      {!isAvailable && (
        <div className="text-neutral-400 text-sm py-8 text-center">Not available: {data?.reason}</div>
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
            formation="4-4-2"
            startingXI={data.players.filter((p) => p.role === 'XI').map(toFplPlayer)}
            bench={data.players.filter((p) => p.role === 'BENCH').map(toFplPlayer)}
            researchMode
          />
          {isForecast && <ProbabilityTable players={data.players} />}
          <div className="text-xs text-neutral-500 mt-2">
            Artifact version: {data.artifact_version}. {isForecast
              ? 'Predicted values only -- this gameweek has not been played.'
              : "Actual points shown are real, official results for this already-completed gameweek, not a live/forecast score."}
          </div>
        </>
      )}
    </div>
  )
}

function ObjectCard({ label, data }: { label: Model; data: ObjectResponse | null }) {
  const isForecast = data?.status === 'FINAL_FROZEN_FORECAST'
  const isAvailable = data?.status === 'HISTORICAL_RECONSTRUCTION' || isForecast
  const membership = data?.player_membership
  const hasMembershipList = Array.isArray(membership)
  return (
    <div className="bg-neutral-900 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold">{label}</h2>
        <span className={`text-xs px-2 py-0.5 rounded ${!isAvailable ? 'bg-red-900 text-red-200' : isForecast ? 'bg-emerald-900 text-emerald-200' : 'bg-amber-900 text-amber-200'}`}>
          {!isAvailable ? 'Not available' : isForecast ? 'Final frozen forecast' : 'Historical reconstruction'}
        </span>
      </div>
      {!isAvailable && <div className="text-neutral-400 text-sm py-8 text-center">Not available: {data?.reason}</div>}
      {isAvailable && (
        <div className="text-sm text-neutral-300 space-y-1">
          {data?.formation && <div>Formation: {typeof data.formation === 'string' ? data.formation : JSON.stringify(data.formation)}</div>}
          {data?.captain && <div>Captain: {data.captain} {data?.vice && `• Vice: ${data.vice}`}</div>}
          <div>
            Predicted XI xP: {data?.predicted_xi_xp ?? '—'}
            {' • '}
            Final points: {isForecast ? 'not played yet' : (data?.final_points ?? data?.corrected_points ?? '—')}
          </div>
          {data?.note && <div className="text-xs text-neutral-500">{data.note}</div>}
          {hasMembershipList ? (
            <div className="mt-2 text-xs">
              {(['XI', 'BENCH'] as const).map((role) => {
                const rows = (membership as PlayerRow[]).filter((p) => p.role === role)
                if (rows.length === 0) return null
                return (
                  <div key={role} className="mb-2">
                    <div className="text-neutral-500 mb-1">{role === 'XI' ? 'Starting XI' : 'Bench'} ({rows.length}):</div>
                    <ul className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                      {rows.map((p) => {
                        const isCap = p.is_captain || (!!data?.captain && p.name === data.captain)
                        const isVice = p.is_vice || (!!data?.vice && p.name === data.vice)
                        return (
                          <li key={p.stable_player_id ?? p.name} className="text-neutral-300 truncate">
                            {p.name} <span className="text-neutral-500">({p.position})</span>
                            {isCap && <span className="text-amber-400"> C</span>}
                            {isVice && <span className="text-neutral-400"> V</span>}
                            {p.minutes !== undefined && (
                              <span className="text-neutral-500"> — {p.minutes}′, {p.actual_points ?? 0}pts</span>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-xs text-neutral-500 mt-2">
              Player membership is not available for this historical decision object (the source export does not include a per-player roster for this object at this gameweek).
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ResearchView() {
  const { language, changeLanguage } = useLanguage()
  const [gw, setGw] = useState(1)
  const [object, setObject] = useState<ObjectLabel>('OWN_START')
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [ownStart, setOwnStart] = useState<{ m3: OwnStartResponse | null; v0: OwnStartResponse | null }>({ m3: null, v0: null })
  const [objectData, setObjectData] = useState<{ m3: ObjectResponse | null; v0: ObjectResponse | null }>({ m3: null, v0: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStatus().then(setStatus).catch(() => setStatus(null))
  }, [])

  const load = useCallback(async (targetGw: number, targetObject: ObjectLabel) => {
    setLoading(true)
    setError(null)
    try {
      if (targetObject === 'OWN_START') {
        const [m3, v0] = await Promise.all([fetchOwnStart(targetGw, 'M3_SHRUNK'), fetchOwnStart(targetGw, 'V0_CONTROL')])
        setOwnStart({ m3, v0 })
      } else {
        const [m3, v0] = await Promise.all([fetchObject(targetGw, 'M3_SHRUNK', targetObject), fetchObject(targetGw, 'V0_CONTROL', targetObject)])
        setObjectData({ m3, v0 })
      }
    } catch (e) {
      setError('Could not reach the research API.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(gw, object)
  }, [gw, object, load])

  const gwButtons = useMemo(() => {
    const base = [1, 2, 3]
    const finalGw = status?.final_pair_gameweek
    if (finalGw && !base.includes(finalGw)) base.push(finalGw)
    else if (!finalGw) base.push(4) // allow probing the conventional next GW even with no pair registered yet
    return base.sort((a, b) => a - b)
  }, [status])

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <Navbar language={language} onLanguageChange={changeLanguage} />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">Ennovera Research View</h1>
          <p className="text-neutral-400 text-sm">
            M3_SHRUNK (provisional primary research model) vs V0_CONTROL (benchmark research model).
            Separate from the live Fantasy AI Manager. GW1-3 is a historical reconstruction.
            {status?.final_pair_registered
              ? ` A real registered final pair exists for GW${status.final_pair_gameweek} (frozen forecast, not yet played).`
              : ' No further gameweek has a registered final pair yet.'}
          </p>
        </div>

        <div className="flex gap-2 mb-3 flex-wrap">
          {gwButtons.map((g) => (
            <button
              key={g}
              onClick={() => setGw(g)}
              className={`px-3 py-1 rounded text-sm ${gw === g ? 'bg-emerald-600' : 'bg-neutral-800'}`}
            >
              GW{g}{status?.final_pair_gameweek === g ? ' (Forecast)' : isHistoricalGw(g) ? '' : ''}
            </button>
          ))}
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {OBJECT_TABS.map((t) => (
            <button
              key={t.label}
              onClick={() => setObject(t.label)}
              className={`px-2.5 py-1 rounded text-xs ${object === t.label ? 'bg-sky-700' : 'bg-neutral-800 text-neutral-300'}`}
            >
              {t.title}
            </button>
          ))}
        </div>

        {loading && <div className="text-neutral-400">Loading…</div>}
        {error && <ErrorState message={error} onRetry={() => load(gw, object)} />}

        {!loading && !error && (
          <div className="grid md:grid-cols-2 gap-6">
            {object === 'OWN_START' ? (
              <>
                <OwnStartCard label="M3_SHRUNK" data={ownStart.m3} />
                <OwnStartCard label="V0_CONTROL" data={ownStart.v0} />
              </>
            ) : (
              <>
                <ObjectCard label="M3_SHRUNK" data={objectData.m3} />
                <ObjectCard label="V0_CONTROL" data={objectData.v0} />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
