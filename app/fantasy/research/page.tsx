'use client'

import { useState, useEffect, useCallback } from 'react'
import Navbar from '@/components/Navbar'
import { PitchVisualization } from '@/components/fantasy/PitchVisualization'
import ErrorState from '@/components/ui/ErrorState'
import { useLanguage } from '@/hooks/useLanguage'
import type { FPLPlayer } from '@/lib/api/types'

// Additive research view -- does NOT modify or replace the existing FPL-03
// experience at /fantasy. Displays the VERIFIED M3_SHRUNK/V0_CONTROL research
// artifacts (GW1-3 historical reconstruction only; GW4 shows NOT_AVAILABLE
// until a real pair is registered -- never a fabricated substitute).

type Model = 'M3_SHRUNK' | 'V0_CONTROL'

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
  model?: Model
  gameweek?: number
  players?: OwnStartPlayer[]
  transfer_event?: { player_out: string | null; player_in: string | null } | null
  hit_cost?: number
  free_transfers_before?: number | null
  gross_points?: number
  net_points?: number
  artifact_version?: string
}

function toFplPlayer(p: OwnStartPlayer): FPLPlayer {
  return {
    player_id: p.stable_player_id,
    name: p.name,
    web_name: p.name,
    club: p.club,
    position: p.position,
    price: p.price,
    expected_points: p.predicted_xp,
    expected_minutes: 0, // not exported this release -- see research/website_chat_integration_plan
    starting_prob: p.role === 'XI' ? 1 : 0,
    haul_prob: 0,
    is_starting: p.role === 'XI',
    is_captain: p.is_captain,
    is_vice_captain: p.is_vice,
    bench_order: p.role === 'BENCH' ? 1 : null,
  }
}

async function fetchOwnStart(gw: number, model: Model): Promise<OwnStartResponse> {
  const res = await fetch(`/api/research-fpl/own-start?gw=${gw}&model=${model}`)
  return res.json()
}

export default function ResearchView() {
  const { language, changeLanguage } = useLanguage()
  const [gw, setGw] = useState(1)
  const [m3, setM3] = useState<OwnStartResponse | null>(null)
  const [v0, setV0] = useState<OwnStartResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (targetGw: number) => {
    setLoading(true)
    setError(null)
    try {
      const [m3Res, v0Res] = await Promise.all([fetchOwnStart(targetGw, 'M3_SHRUNK'), fetchOwnStart(targetGw, 'V0_CONTROL')])
      setM3(m3Res)
      setV0(v0Res)
    } catch (e) {
      setError('Could not reach the research API.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(gw)
  }, [gw, load])

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <Navbar language={language} onLanguageChange={changeLanguage} />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">Ennovera Research View</h1>
          <p className="text-neutral-400 text-sm">
            M3_SHRUNK (provisional primary research model) vs V0_CONTROL (benchmark research model).
            Separate from the live Fantasy AI Manager above. GW1-3 shown here are a historical
            reconstruction, not a prospective forecast.
          </p>
        </div>

        <div className="flex gap-2 mb-6">
          {[1, 2, 3, 4].map((g) => (
            <button
              key={g}
              onClick={() => setGw(g)}
              className={`px-3 py-1 rounded text-sm ${gw === g ? 'bg-emerald-600' : 'bg-neutral-800'}`}
            >
              GW{g}
            </button>
          ))}
        </div>

        {loading && <div className="text-neutral-400">Loading…</div>}
        {error && <ErrorState message={error} onRetry={() => load(gw)} />}

        {!loading && !error && (
          <div className="grid md:grid-cols-2 gap-6">
            {[{ label: 'M3_SHRUNK', data: m3 }, { label: 'V0_CONTROL', data: v0 }].map(({ label, data }) => (
              <div key={label} className="bg-neutral-900 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-semibold">{label}</h2>
                  <span className={`text-xs px-2 py-0.5 rounded ${data?.status === 'NOT_AVAILABLE' ? 'bg-red-900 text-red-200' : 'bg-amber-900 text-amber-200'}`}>
                    {data?.status === 'NOT_AVAILABLE' ? 'Not available' : 'Historical reconstruction'}
                  </span>
                </div>
                {data?.status === 'NOT_AVAILABLE' && (
                  <div className="text-neutral-400 text-sm py-8 text-center">
                    Not available: {data.reason}
                  </div>
                )}
                {data?.status === 'HISTORICAL_RECONSTRUCTION' && data.players && (
                  <>
                    <div className="text-sm text-neutral-400 mb-2">
                      Net points: <span className="text-white font-semibold">{data.net_points}</span>
                      {' '}(gross {data.gross_points}, hit cost {data.hit_cost}, FT before {data.free_transfers_before ?? '—'})
                      {data.transfer_event && (
                        <div>Transfer: {data.transfer_event.player_out ?? '—'} → {data.transfer_event.player_in ?? '—'}</div>
                      )}
                    </div>
                    <PitchVisualization
                      formation="4-4-2"
                      startingXI={data.players.filter((p) => p.role === 'XI').map(toFplPlayer)}
                      bench={data.players.filter((p) => p.role === 'BENCH').map(toFplPlayer)}
                    />
                    <div className="text-xs text-neutral-500 mt-2">
                      Artifact version: {data.artifact_version}. Actual points shown are real, official
                      results for this already-completed gameweek (GW1-3), not a live/finalized-GW4 score.
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
