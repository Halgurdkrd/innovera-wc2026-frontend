'use client'

import { useEffect, useState } from 'react'
import { API_BASE } from '@/lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────

interface PredictedScorer {
  player_name: string
  xg_per90: number
  position: string
  club: string
  data_source: string
}

interface RealScorer {
  player_name: string
  team: string
  minute: number
  assist_by?: string | null
  goal_type: string
}

interface ScorersData {
  home_team: string
  away_team: string
  predicted: {
    home_predicted_scorers: PredictedScorer[]
    away_predicted_scorers: PredictedScorer[]
    data_available: boolean
  }
  real_scorers: RealScorer[]
  is_finished: boolean
  has_real_data: boolean
}

interface Props {
  matchId: string
  homeTeam: string
  awayTeam: string
  isFinished: boolean
  language: 'EN' | 'KU'
}

// ── Sub-component: predicted column ───────────────────────────────────────────

function ScorerRow({
  scorer, index, realScorers, compact,
}: {
  scorer: PredictedScorer
  index: number
  realScorers: RealScorer[]
  compact: boolean
}) {
  const correct = realScorers.length > 0 && realScorers.some(r => {
    const a = r.player_name.toLowerCase()
    const b = scorer.player_name.toLowerCase()
    return a.includes(b.split(' ').at(-1)!) || b.includes(a.split(' ').at(-1)!)
  })

  const barPct = Math.min(100, (scorer.xg_per90 / 1.2) * 100)

  return (
    <div className={`flex items-center gap-2 ${compact ? 'py-1' : 'py-1.5'}`}>
      <span className="text-[10px] text-[#8B949E] w-4 flex-shrink-0 text-right">{index + 1}.</span>

      {realScorers.length > 0 && (
        <span className={`text-[10px] flex-shrink-0 ${correct ? 'text-[#2EA043]' : 'text-[#30363D]'}`}>
          {correct ? '✅' : '○'}
        </span>
      )}

      <div className="flex-1 min-w-0">
        <span className={`text-xs font-medium truncate block ${correct ? 'text-[#2EA043]' : 'text-[#E6EDF3]'}`}>
          {scorer.player_name}
        </span>
        {!compact && (
          <span className="text-[10px] text-[#8B949E] truncate block">{scorer.club}</span>
        )}
      </div>

      {!compact && (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="w-12 h-1.5 rounded-full bg-[#30363D] overflow-hidden">
            <div className="h-full rounded-full bg-[#F0A500]" style={{ width: `${barPct}%` }} />
          </div>
          <span className="text-[10px] text-[#F0A500] w-8 text-right tabular-nums">
            {scorer.xg_per90.toFixed(2)}
          </span>
        </div>
      )}
    </div>
  )
}

function PredictedColumns({
  homeTeam, awayTeam, homePredicted, awayPredicted, realScorers, compact, language,
}: {
  homeTeam: string; awayTeam: string
  homePredicted: PredictedScorer[]; awayPredicted: PredictedScorer[]
  realScorers: RealScorer[]; compact: boolean; language: 'EN' | 'KU'
}) {
  const noData = language === 'KU' ? 'داتا بەردەست نییە' : 'No data available'
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <p className="text-[10px] text-[#8B949E] font-semibold mb-2 truncate">{homeTeam}</p>
        {homePredicted.length > 0
          ? homePredicted.map((s, i) => <ScorerRow key={i} scorer={s} index={i} realScorers={realScorers} compact={compact} />)
          : <p className="text-[10px] text-[#30363D]">{noData}</p>
        }
      </div>
      <div>
        <p className="text-[10px] text-[#8B949E] font-semibold mb-2 truncate">{awayTeam}</p>
        {awayPredicted.length > 0
          ? awayPredicted.map((s, i) => <ScorerRow key={i} scorer={s} index={i} realScorers={realScorers} compact={compact} />)
          : <p className="text-[10px] text-[#30363D]">{noData}</p>
        }
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PredictedScorers({ matchId, homeTeam, awayTeam, isFinished, language }: Props) {
  const [data, setData] = useState<ScorersData | null>(null)
  const [loading, setLoading] = useState(true)
  const isKU = language === 'KU'

  useEffect(() => {
    if (!matchId) { setLoading(false); return }
    ;(async () => {
      try {
        const res = await fetch(`${API_BASE}/scorers/compare/${matchId}`)
        if (res.ok) setData(await res.json())
      } catch { /* fetch is best-effort — page still loads on error */ }
      finally { setLoading(false) }
    })()
  }, [matchId])

  if (loading) {
    return (
      <div className="mt-4 h-20 rounded-xl bg-[#161B22] border border-[#30363D] animate-pulse" />
    )
  }

  if (!data?.predicted?.data_available) return null

  const homePredicted = data.predicted.home_predicted_scorers ?? []
  const awayPredicted = data.predicted.away_predicted_scorers ?? []
  const realScorers   = data.real_scorers ?? []
  const finished      = data.is_finished || isFinished

  return (
    <div className="mt-4 bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#30363D] flex items-center gap-2">
        <span className="text-base">⚽</span>
        <span className="text-sm font-bold text-[#E6EDF3]">
          {finished
            ? (isKU ? 'توپئەندازان' : 'Goal Scorers')
            : (isKU ? 'توپئەندازانی چاوەڕوانکراو' : 'Predicted Top Scorers')}
        </span>
        {!finished && (
          <span className="text-[10px] text-[#8B949E] ml-auto italic">
            {isKU ? 'لەسەر ئامارەکانی xG/90' : 'Based on xG/90 stats'}
          </span>
        )}
      </div>

      <div className="p-4">
        {/* ── Post-match: real scorers first ── */}
        {finished && realScorers.length > 0 && (
          <div className="space-y-2 mb-4">
            {realScorers.map((s, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="text-[#F0A500] font-bold text-xs w-8 text-right tabular-nums flex-shrink-0">
                  {s.minute}&apos;
                </span>
                <span className="text-[#E6EDF3] font-semibold">{s.player_name}</span>
                <span className="text-[#8B949E] text-xs">({s.team})</span>
                {s.assist_by && (
                  <span className="text-[#8B949E] text-[10px] ml-auto">
                    {isKU ? 'یارمەتی' : 'Assist'}: {s.assist_by}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Prediction comparison after real scorers ── */}
        {finished && realScorers.length > 0 && (homePredicted.length > 0 || awayPredicted.length > 0) && (
          <div className="pt-3 border-t border-[#30363D]">
            <p className="text-[10px] text-[#8B949E] mb-2">
              {isKU ? 'AI پێشبینی کرد بوو:' : 'AI had predicted:'}
            </p>
            <PredictedColumns
              homeTeam={homeTeam} awayTeam={awayTeam}
              homePredicted={homePredicted} awayPredicted={awayPredicted}
              realScorers={realScorers} compact language={language}
            />
          </div>
        )}

        {/* ── Pre-match: predicted scorers only ── */}
        {!finished && (
          <>
            <PredictedColumns
              homeTeam={homeTeam} awayTeam={awayTeam}
              homePredicted={homePredicted} awayPredicted={awayPredicted}
              realScorers={[]} compact={false} language={language}
            />
            <p className="text-[10px] text-[#8B949E]/60 italic mt-3">
              {isKU
                ? '⚠️ لەسەر ئامارەکانی لیگەکانی ئەوروپا. دەرکەوتنی تیم جیاواز دەبێت.'
                : '⚠️ Based on European league stats. Squad eligibility may vary.'}
            </p>
          </>
        )}

        {/* No real scorers yet for a finished match */}
        {finished && realScorers.length === 0 && (
          <p className="text-xs text-[#8B949E] text-center py-2">
            {isKU ? 'زانیاری توپئەنداز بەردەست نییە' : 'Scorer data not yet available'}
          </p>
        )}
      </div>
    </div>
  )
}
