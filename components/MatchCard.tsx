'use client'

import Link from 'next/link'
import type { Match } from '@/types'
import type { Language } from './Navbar'
import { teamFlagUrl } from '@/lib/flags'
import { fmtMatchTime } from '@/lib/dates'

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
  const confidence = confidenceLabel(match.ai_confidence ?? 0, language)
  const live = statusBadge(match.status, language)
  const matchId = match.match_id ?? match.id ?? ''
  const timeStr = fmtMatchTime(match.match_date ?? match.match_time)
  const hasProbs = (match.home_win_probability ?? 0) > 0 || (match.away_win_probability ?? 0) > 0

  return (
    <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 flex flex-col gap-4 hover:border-[#F0A500]/40 transition-colors group">
      {/* Header: time / live + confidence */}
      <div className="flex items-center justify-between">
        {live ? (
          <span className="text-xs font-bold" style={{ color: live.color }}>{live.label}</span>
        ) : (
          <span className="text-xs text-[#8B949E] font-medium">{timeStr}</span>
        )}
        <div className="flex items-center gap-1.5">
          {match.lineup_updated && (
            <span
              title="Updated with confirmed lineups"
              className="text-[10px] text-[#F0A500] bg-[#F0A500]/10 border border-[#F0A500]/30 rounded-full px-1.5 py-0.5 font-bold leading-none"
            >
              ⚡
            </span>
          )}
          <span
            className="text-xs font-semibold px-2.5 py-0.5 rounded-full border"
            style={{ color: confidence.color, borderColor: confidence.color + '40', backgroundColor: confidence.color + '15' }}
          >
            {confidence.label}
          </span>
        </div>
      </div>

      {/* Teams row */}
      <div className="flex items-center justify-between gap-3">
        {/* Home team */}
        <div className="flex flex-col items-center gap-1.5 flex-1 text-center">
          <img src={teamFlagUrl(match.home_team)} alt={match.home_team} className="h-8 w-auto rounded-sm object-cover" loading="lazy" />
          <Link href={`/team/${encodeURIComponent(match.home_team)}`} className="text-sm font-semibold text-[#E6EDF3] hover:text-[#F0A500] leading-tight transition-colors" onClick={e => e.stopPropagation()}>{match.home_team}</Link>
          {match.status === 'finished' && match.home_score !== undefined ? (
            <span className="text-xl font-extrabold text-[#E6EDF3]">{match.home_score}</span>
          ) : hasProbs ? (
            <span className="text-xs font-bold text-[#F0A500]">{Math.round(match.home_win_probability ?? 0)}%</span>
          ) : null}
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
          <img src={teamFlagUrl(match.away_team)} alt={match.away_team} className="h-8 w-auto rounded-sm object-cover" loading="lazy" />
          <Link href={`/team/${encodeURIComponent(match.away_team)}`} className="text-sm font-semibold text-[#E6EDF3] hover:text-[#F0A500] leading-tight transition-colors" onClick={e => e.stopPropagation()}>{match.away_team}</Link>
          {match.status === 'finished' && match.away_score !== undefined ? (
            <span className="text-xl font-extrabold text-[#E6EDF3]">{match.away_score}</span>
          ) : hasProbs ? (
            <span className="text-xs font-bold text-[#F0A500]">{Math.round(match.away_win_probability ?? 0)}%</span>
          ) : null}
        </div>
      </div>

      {/* Probability bars (hide for finished matches and when no real data) */}
      {match.status !== 'finished' && hasProbs && (
        <div className="space-y-1.5">
          <div className="flex gap-0.5 h-2 rounded-full overflow-hidden">
            <div
              className="bg-[#2EA043] rounded-l-full transition-all duration-700"
              style={{ width: `${match.home_win_probability}%` }}
            />
            <div
              className="bg-[#8B949E] transition-all duration-700"
              style={{ width: `${match.draw_probability ?? 0}%` }}
            />
            <div
              className="bg-[#F85149] rounded-r-full transition-all duration-700"
              style={{ width: `${match.away_win_probability ?? 0}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-[#8B949E]">
            <span className="text-[#2EA043] font-semibold">{Math.round(match.home_win_probability ?? 0)}%</span>
            <span className="flex-shrink-0 mx-1">{language === 'KU' ? 'یەکسان' : 'Draw'} {Math.round(match.draw_probability ?? 0)}%</span>
            <span className="text-[#F85149] font-semibold">{Math.round(match.away_win_probability ?? 0)}%</span>
          </div>
        </div>
      )}

      {/* Predict button → links to match detail */}
      <Link
        href={`/match/${matchId}`}
        className="w-full block text-center bg-[#F0A500] hover:bg-[#D4920A] text-[#0D1117] font-semibold text-sm py-2.5 rounded-lg transition-colors"
      >
        {language === 'KU'
          ? match.status === 'finished' ? 'بینینی شیکاری' : 'پێشبینی'
          : match.status === 'finished' ? 'View Analysis' : 'Predict'}
      </Link>

      {/* Watermark */}
      <p className="text-center text-[9px] text-[#30363D] tracking-widest font-medium select-none">
        Ennovera
      </p>
    </div>
  )
}
