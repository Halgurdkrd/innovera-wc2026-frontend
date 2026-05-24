'use client'

import { useState } from 'react'
import type { Match } from '@/types'
import type { Language } from './Navbar'

interface UserPredictionProps {
  match: Match
  language: Language
}

type Outcome = 'home' | 'draw' | 'away' | null

const labels = {
  EN: {
    title: 'Your Prediction',
    homeWin: 'Home Win',
    draw: 'Draw',
    awayWin: 'Away Win',
    score: 'Predicted Score',
    lock: 'Lock My Prediction',
    locked: 'Prediction Locked ✓',
    pastKickoff: 'Predictions closed',
    placeholder: '--',
    vs: '-',
  },
  KU: {
    title: 'پێشبینیەکەت',
    homeWin: 'مەیدانەکە دەبەرێت',
    draw: 'یەکسان',
    awayWin: 'میوان دەبەرێت',
    score: 'ئەنجامی پێشبینیکراو',
    lock: 'پێشبینیەکەم قووڵ بکە',
    locked: 'پێشبینی قووڵکراو ✓',
    pastKickoff: 'پێشبینی داخرابوو',
    placeholder: '--',
    vs: '-',
  },
}

export default function UserPrediction({ match, language }: UserPredictionProps) {
  const t = labels[language]
  const [outcome, setOutcome] = useState<Outcome>(null)
  const [homeScore, setHomeScore] = useState('')
  const [awayScore, setAwayScore] = useState('')
  const [locked, setLocked] = useState(false)

  const pastKickoff =
    match.status !== 'upcoming' ||
    new Date(match.match_time) < new Date()

  const canLock = !locked && !pastKickoff && outcome !== null

  const handleLock = () => {
    if (!canLock) return
    setLocked(true)
    // TODO: save to Supabase user_predictions table when auth is implemented
  }

  const btnClass = (type: Outcome) => {
    const base =
      'flex-1 py-4 px-3 rounded-xl border-2 font-semibold text-sm transition-all duration-200 flex flex-col items-center gap-1'
    if (outcome === type)
      return `${base} border-[#F0A500] bg-[#F0A500]/15 text-[#F0A500]`
    if (locked)
      return `${base} border-[#30363D] text-[#8B949E] cursor-not-allowed opacity-50`
    return `${base} border-[#30363D] text-[#8B949E] hover:border-[#F0A500]/50 hover:text-[#E6EDF3]`
  }

  return (
    <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-5">
      {/* Title */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-[#E6EDF3]">{t.title}</h3>
        {pastKickoff && !locked && (
          <span className="text-xs text-[#F85149] font-medium bg-[#F85149]/10 border border-[#F85149]/30 px-2.5 py-0.5 rounded-full">
            {t.pastKickoff}
          </span>
        )}
      </div>

      {/* Outcome buttons */}
      <div className="flex gap-3">
        <button
          className={btnClass('home')}
          onClick={() => !locked && !pastKickoff && setOutcome('home')}
          disabled={locked || pastKickoff}
        >
          <span className="text-xl">{match.home_team_flag || '🏳️'}</span>
          <span>{t.homeWin}</span>
          <span className="text-xs opacity-70">{match.home_team}</span>
        </button>

        <button
          className={btnClass('draw')}
          onClick={() => !locked && !pastKickoff && setOutcome('draw')}
          disabled={locked || pastKickoff}
        >
          <span className="text-xl">🤝</span>
          <span>{t.draw}</span>
          <span className="text-xs opacity-70">–</span>
        </button>

        <button
          className={btnClass('away')}
          onClick={() => !locked && !pastKickoff && setOutcome('away')}
          disabled={locked || pastKickoff}
        >
          <span className="text-xl">{match.away_team_flag || '🏳️'}</span>
          <span>{t.awayWin}</span>
          <span className="text-xs opacity-70">{match.away_team}</span>
        </button>
      </div>

      {/* Optional score input */}
      <div className="space-y-2">
        <p className="text-xs text-[#8B949E] font-medium">{t.score}</p>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={0}
            max={20}
            value={homeScore}
            onChange={(e) => !locked && !pastKickoff && setHomeScore(e.target.value)}
            disabled={locked || pastKickoff}
            placeholder={t.placeholder}
            className="w-16 h-12 rounded-lg bg-[#0D1117] border border-[#30363D] text-center text-lg font-bold text-[#E6EDF3] focus:border-[#F0A500] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <span className="text-[#8B949E] font-bold text-lg">—</span>
          <input
            type="number"
            min={0}
            max={20}
            value={awayScore}
            onChange={(e) => !locked && !pastKickoff && setAwayScore(e.target.value)}
            disabled={locked || pastKickoff}
            placeholder={t.placeholder}
            className="w-16 h-12 rounded-lg bg-[#0D1117] border border-[#30363D] text-center text-lg font-bold text-[#E6EDF3] focus:border-[#F0A500] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <div className="flex flex-col text-xs text-[#8B949E] text-center leading-tight">
            <span>{match.home_team}</span>
            <span className="text-[#30363D]">vs</span>
            <span>{match.away_team}</span>
          </div>
        </div>
      </div>

      {/* Lock button */}
      <button
        onClick={handleLock}
        disabled={!canLock}
        className={`w-full py-3 rounded-xl font-bold text-sm transition-all duration-200 ${
          locked
            ? 'bg-[#2EA043]/20 border border-[#2EA043]/40 text-[#2EA043] cursor-default'
            : canLock
            ? 'bg-[#F0A500] text-[#0D1117] hover:bg-[#D4920A] shadow-lg shadow-[#F0A500]/20'
            : 'bg-[#30363D]/50 text-[#8B949E] cursor-not-allowed'
        }`}
      >
        {locked ? t.locked : t.lock}
      </button>
    </div>
  )
}
