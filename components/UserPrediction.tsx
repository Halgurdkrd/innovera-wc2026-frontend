'use client'

import { useState } from 'react'
import type { Match } from '@/types'
import type { Language } from './Navbar'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

export interface LockedPrediction {
  outcome: 'home' | 'draw' | 'away'
  homeScore?: number
  awayScore?: number
}

interface UserPredictionProps {
  match: Match
  language: Language
  onLock?: (pred: LockedPrediction) => void
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
    saving: 'Saving…',
    pastKickoff: 'Predictions closed',
    loginHint: 'Login to save your prediction',
    loginBtn: 'Login',
    placeholder: '--',
    vs: '-',
    saveError: 'Saved locally — login to sync',
  },
  KU: {
    title: 'پێشبینیەکەت',
    homeWin: 'مەیدانەکە دەبەرێت',
    draw: 'یەکسان',
    awayWin: 'میوان دەبەرێت',
    score: 'ئەنجامی پێشبینیکراو',
    lock: 'پێشبینیەکەم قووڵ بکە',
    locked: 'پێشبینی قووڵکراو ✓',
    saving: 'پاراستن…',
    pastKickoff: 'پێشبینی داخرابوو',
    loginHint: 'بچە ژوورەوە بۆ پاراستنی پێشبینیەکەت',
    loginBtn: 'چوونەژوورەوە',
    placeholder: '--',
    vs: '-',
    saveError: 'لە ئامێرەکەت پارێزرا — بچە ژوورەوە بۆ هاوکێشانەوە',
  },
}

export default function UserPrediction({ match, language, onLock }: UserPredictionProps) {
  const t = labels[language]
  const { user, openAuthModal } = useAuth()

  const [outcome, setOutcome] = useState<Outcome>(null)
  const [homeScore, setHomeScore] = useState('')
  const [awayScore, setAwayScore] = useState('')
  const [locked, setLocked] = useState(false)
  const [saving, setSaving] = useState(false)

  const isScheduled = match.status === 'scheduled' || match.status === 'upcoming'
  const kickoffTime = match.match_date ?? match.match_time
  const pastKickoff = !isScheduled || (kickoffTime ? new Date(kickoffTime) < new Date() : false)

  const canLock = !locked && !pastKickoff && outcome !== null

  const handleLock = async () => {
    if (!canLock) return
    setLocked(true)
    onLock?.({
      outcome: outcome as 'home' | 'draw' | 'away',
      homeScore: homeScore !== '' ? Number(homeScore) : undefined,
      awayScore: awayScore !== '' ? Number(awayScore) : undefined,
    })

    if (!user) return  // just lock locally if not logged in (UI already handled)

    setSaving(true)
    try {
      await supabase.from('user_predictions').upsert(
        {
          user_id: user.id,
          match_id: match.match_id ?? match.id,
          predicted_outcome: outcome,
          predicted_home_score: homeScore !== '' ? Number(homeScore) : null,
          predicted_away_score: awayScore !== '' ? Number(awayScore) : null,
        },
        { onConflict: 'user_id,match_id' }
      )
    } catch {
      // best-effort — prediction is locked locally regardless
    } finally {
      setSaving(false)
    }
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
    <div id="match-prediction-card" className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-5">
      {/* Title */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-[#E6EDF3]">{t.title}</h3>
        {pastKickoff && !locked && (
          <span className="text-xs text-[#F85149] font-medium bg-[#F85149]/10 border border-[#F85149]/30 px-2.5 py-0.5 rounded-full">
            {t.pastKickoff}
          </span>
        )}
      </div>

      {/* Login hint (non-blocking) */}
      {!user && !locked && !pastKickoff && (
        <div className="flex items-center justify-between bg-[#F0A500]/5 border border-[#F0A500]/20 rounded-lg px-3 py-2">
          <p className="text-xs text-[#F0A500]">{t.loginHint}</p>
          <button
            onClick={() => openAuthModal(language)}
            className="text-xs font-bold text-[#0D1117] bg-[#F0A500] hover:bg-[#D4920A] px-2.5 py-1 rounded-md transition-colors"
          >
            {t.loginBtn}
          </button>
        </div>
      )}

      {/* Outcome buttons */}
      <div className="flex gap-3">
        <button
          className={btnClass('home')}
          onClick={() => !locked && !pastKickoff && setOutcome('home')}
          disabled={locked || pastKickoff}
        >
          <span className="text-xl">{match.home_team_flag || '🏳️'}</span>
          <span className="text-xs font-semibold leading-tight text-center">{match.home_team}</span>
          <span className="text-[10px] opacity-60">{language === 'KU' ? 'دەبەرێت' : 'Win'}</span>
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
          <span className="text-xs font-semibold leading-tight text-center">{match.away_team}</span>
          <span className="text-[10px] opacity-60">{language === 'KU' ? 'دەبەرێت' : 'Win'}</span>
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
        disabled={!canLock || saving}
        className={`w-full py-3 rounded-xl font-bold text-sm transition-all duration-200 ${
          locked
            ? 'bg-[#2EA043]/20 border border-[#2EA043]/40 text-[#2EA043] cursor-default'
            : canLock
            ? 'bg-[#F0A500] text-[#0D1117] hover:bg-[#D4920A] shadow-lg shadow-[#F0A500]/20'
            : 'bg-[#30363D]/50 text-[#8B949E] cursor-not-allowed'
        }`}
      >
        {saving ? t.saving : locked ? t.locked : t.lock}
      </button>

      {/* Download card button — appears immediately after locking */}
      {locked && (
        <button
          onClick={async () => {
            const cardEl = document.getElementById('match-prediction-card')
            if (!cardEl) return
            const html2canvas = (await import('html2canvas')).default
            const canvas = await html2canvas(cardEl, {
              backgroundColor: '#0D1117', scale: 2, useCORS: true, logging: false,
            })
            const link = document.createElement('a')
            link.download = `innovera-${match.home_team}-vs-${match.away_team}.png`
            link.href = canvas.toDataURL('image/png')
            link.click()
          }}
          className="w-full py-2.5 rounded-xl font-bold text-sm bg-[#161B22] border border-[#F0A500]/50 text-[#F0A500] hover:bg-[#F0A500]/10 transition-colors flex items-center justify-center gap-2"
        >
          <span>📥</span>
          {language === 'KU' ? 'کارتی پێشبینی داگرە' : 'Download Prediction Card'}
        </button>
      )}
    </div>
  )
}
