'use client'

import Link from 'next/link'
import type { Match } from '@/types'
import type { Language } from './Navbar'

interface MatchCardProps {
  match: Match
  language: Language
}

const confidenceLabel = (score: number, lang: Language) => {
  if (lang === 'KU') {
    if (score >= 80) return { label: 'زۆر دڵنیا', color: '#2EA043' }
    if (score >= 60) return { label: 'دڵنیا', color: '#F0A500' }
    return { label: 'نادڵنیا', color: '#8B949E' }
  }
  if (score >= 80) return { label: 'High Confidence', color: '#2EA043' }
  if (score >= 60) return { label: 'Moderate', color: '#F0A500' }
  return { label: 'Low Confidence', color: '#8B949E' }
}

const statusBadge = (status: Match['status'], lang: Language) => {
  if (status === 'live') return { label: lang === 'KU' ? '🔴 ڕاستەوخۆ' : '🔴 LIVE', color: '#F85149' }
  if (status === 'finished') return { label: lang === 'KU' ? 'تەواوبوو' : 'Full Time', color: '#8B949E' }
  return null
}

export default function MatchCard({ match, language }: MatchCardProps) {
  const confidence = confidenceLabel(match.ai_confidence, language)
  const live = statusBadge(match.status, language)
  const timeStr = match.match_time
    ? new Date(match.match_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '--:--'

  return (
    <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 flex flex-col gap-4 hover:border-[#F0A500]/40 transition-colors group">
      {/* Header: time / live + confidence */}
      <div className="flex items-center justify-between">
        {live ? (
          <span className="text-xs font-bold" style={{ color: live.color }}>{live.label}</span>
        ) : (
          <span className="text-xs text-[#8B949E] font-medium">{timeStr}</span>
        )}
        <span
          className="text-xs font-semibold px-2.5 py-0.5 rounded-full border"
          style={{ color: confidence.color, borderColor: confidence.color + '40', backgroundColor: confidence.color + '15' }}
        >
          {confidence.label}
        </span>
      </div>

      {/* Teams row */}
      <div className="flex items-center justify-between gap-3">
        {/* Home team */}
        <div className="flex flex-col items-center gap-1.5 flex-1 text-center">
          <span className="text-2xl">{match.home_team_flag || '🏳️'}</span>
          <span className="text-sm font-semibold text-[#E6EDF3] leading-tight">{match.home_team}</span>
          {match.status === 'finished' && match.home_score !== undefined ? (
            <span className="text-xl font-extrabold text-[#E6EDF3]">{match.home_score}</span>
          ) : (
            <span className="text-xs font-bold text-[#F0A500]">{Math.round(match.home_win_probability)}%</span>
          )}
        </div>

        {/* VS / Score */}
        <div className="flex flex-col items-center gap-1">
          {match.status === 'live' ? (
            <span className="text-lg font-extrabold text-[#F85149] animate-pulse">
              {match.home_score ?? 0} — {match.away_score ?? 0}
            </span>
          ) : (
            <span className="text-lg font-bold text-[#30363D]">VS</span>
          )}
          {match.group_name && (
            <span className="text-xs text-[#8B949E] bg-[#0D1117] border border-[#30363D] px-2 py-0.5 rounded">
              {match.group_name}
            </span>
          )}
        </div>

        {/* Away team */}
        <div className="flex flex-col items-center gap-1.5 flex-1 text-center">
          <span className="text-2xl">{match.away_team_flag || '🏳️'}</span>
          <span className="text-sm font-semibold text-[#E6EDF3] leading-tight">{match.away_team}</span>
          {match.status === 'finished' && match.away_score !== undefined ? (
            <span className="text-xl font-extrabold text-[#E6EDF3]">{match.away_score}</span>
          ) : (
            <span className="text-xs font-bold text-[#F0A500]">{Math.round(match.away_win_probability)}%</span>
          )}
        </div>
      </div>

      {/* Probability bars (hide for finished matches) */}
      {match.status !== 'finished' && (
        <div className="space-y-1.5">
          <div className="flex gap-0.5 h-2 rounded-full overflow-hidden">
            <div
              className="bg-[#2EA043] rounded-l-full transition-all duration-700"
              style={{ width: `${match.home_win_probability}%` }}
            />
            <div
              className="bg-[#8B949E] transition-all duration-700"
              style={{ width: `${match.draw_probability}%` }}
            />
            <div
              className="bg-[#F85149] rounded-r-full transition-all duration-700"
              style={{ width: `${match.away_win_probability}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-[#8B949E]">
            <span>{language === 'KU' ? 'ماڵ' : 'Home'}</span>
            <span>{language === 'KU' ? 'یەکسان' : 'Draw'} {Math.round(match.draw_probability)}%</span>
            <span>{language === 'KU' ? 'دەرەوە' : 'Away'}</span>
          </div>
        </div>
      )}

      {/* Predict button → links to match detail */}
      <Link
        href={`/match/${match.id}`}
        className="w-full block text-center bg-[#F0A500] hover:bg-[#D4920A] text-[#0D1117] font-semibold text-sm py-2.5 rounded-lg transition-colors"
      >
        {language === 'KU'
          ? match.status === 'finished' ? 'بینینی شیکاری' : 'پێشبینی'
          : match.status === 'finished' ? 'View Analysis' : 'Predict'}
      </Link>

      {/* Watermark */}
      <p className="text-center text-[9px] text-[#30363D] tracking-widest font-medium select-none">
        innovera.ai
      </p>
    </div>
  )
}
