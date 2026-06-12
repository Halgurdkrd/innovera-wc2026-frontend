'use client'

import { useState, useEffect } from 'react'
import type { Match } from '@/types'
import type { Language } from './Navbar'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { parseMatchDate } from '@/lib/dates'

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
    scoreRequired: 'Enter your predicted score to lock',
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
    scoreRequired: 'خاڵی پێشبینیت بنووسە بۆ قفڵکردن',
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

  const matchId = match.match_id ?? match.id

  // Load existing prediction and lock the form on mount
  useEffect(() => {
    if (!user || !matchId) return
    supabase
      .from('user_predictions')
      .select('predicted_winner,predicted_score')
      .eq('user_id', user.id)
      .eq('match_id', matchId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return
        const parsedOutcome = data.predicted_winner as Outcome
        const parts = (data.predicted_score as string | null)?.split('-')
        const hs = parts?.[0] ?? ''
        const as_ = parts?.[1] ?? ''
        setOutcome(parsedOutcome)
        setHomeScore(hs)
        setAwayScore(as_)
        setLocked(true)
        // Notify parent so the downloadable PreMatchCard also reflects this prediction
        if (parsedOutcome) {
          onLock?.({
            outcome: parsedOutcome,
            homeScore: hs !== '' ? Number(hs) : undefined,
            awayScore: as_ !== '' ? Number(as_) : undefined,
          })
        }
      })
  }, [user?.id, matchId])

  const isScheduled = match.status === 'scheduled' || match.status === 'upcoming'
  const kickoffDate = parseMatchDate(match.match_date ?? match.match_time)
  const pastKickoff = !isScheduled || (kickoffDate ? kickoffDate < new Date() : false)

  const scoresEntered = homeScore !== '' && awayScore !== ''
  const canLock = !locked && !pastKickoff && outcome !== null && scoresEntered

  const handleLock = async () => {
    if (!canLock) return
    setLocked(true)
    onLock?.({
      outcome: outcome as 'home' | 'draw' | 'away',
      homeScore: homeScore !== '' ? Number(homeScore) : undefined,
      awayScore: awayScore !== '' ? Number(awayScore) : undefined,
    })

    if (!user) return  // just lock locally if not logged in (UI already handled)

    if (!matchId) {
      console.error('[UserPrediction] match has no match_id — cannot persist')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase.from('user_predictions').upsert(
        {
          user_id: user.id,
          match_id: matchId,
          predicted_winner: outcome,
          predicted_score: homeScore !== '' && awayScore !== '' ? `${homeScore}-${awayScore}` : null,
        },
        { onConflict: 'user_id,match_id' }
      )
      if (error) {
        console.error('[UserPrediction] upsert failed:', error.message, '| code:', error.code, '| details:', error.details)
      } else {
        console.log('[UserPrediction] saved — match_id:', matchId, 'outcome:', outcome)
      }
    } catch (err) {
      console.error('[UserPrediction] unexpected error:', err)
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

      {/* Score-required hint */}
      {outcome !== null && !scoresEntered && !locked && !pastKickoff && (
        <p className="text-xs text-[#F0A500] text-center">{t.scoreRequired}</p>
      )}

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
    </div>
  )
}
