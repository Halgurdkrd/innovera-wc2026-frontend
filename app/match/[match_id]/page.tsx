'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Navbar, { type Language } from '@/components/Navbar'
import ShapCard from '@/components/ShapCard'
import MomentumBar from '@/components/MomentumBar'
import LuckScoreBar from '@/components/LuckScoreBar'
import UserPrediction from '@/components/UserPrediction'
import { supabase } from '@/lib/supabase'
import type { Match, Prediction } from '@/types'

// ── helpers ────────────────────────────────────────────────────────────────────

const confidenceConfig = (score: number, lang: Language) => {
  if (score >= 80) return {
    label: lang === 'KU' ? 'زۆر دڵنیا' : 'High Confidence',
    color: '#2EA043',
  }
  if (score >= 60) return {
    label: lang === 'KU' ? 'دڵنیا' : 'Moderate Confidence',
    color: '#F0A500',
  }
  return {
    label: lang === 'KU' ? 'نادڵنیا' : 'Low Confidence',
    color: '#8B949E',
  }
}

const formatMatchTime = (iso: string) =>
  new Date(iso).toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const labels = {
  EN: {
    back: '← All Matches',
    live: '🔴 LIVE',
    finished: 'Full Time',
    upcoming: 'Upcoming',
    aiAnalysis: 'AI Analysis',
    shapTitle: 'Key Prediction Factors',
    shapSub: 'Powered by SHAP explainability',
    scorelineTitle: 'Most Likely Scorelines',
    momentumTitle: 'Team Momentum',
    keyPlayerTitle: 'Key Player Spotlight',
    impactScore: 'Impact Score',
    postMatchTitle: 'Post-Match Analysis',
    narrative: 'AI Match Narrative',
    shareCard: 'Share Prediction Card',
    shareDownload: 'Download Card',
    shareLoading: 'Generating…',
    noData: 'Prediction data not yet available for this match.',
  },
  KU: {
    back: '← هەموو یارییەکان',
    live: '🔴 ڕاستەوخۆ',
    finished: 'تەواوبوو',
    upcoming: 'داهاتوو',
    aiAnalysis: 'شیکاری AI',
    shapTitle: 'هۆکارەکانی پێشبینی',
    shapSub: 'بە هێزی SHAP',
    scorelineTitle: 'ئەنجامە پێشبینیکراوەکان',
    momentumTitle: 'مۆمێنتەمی تیمەکان',
    keyPlayerTitle: 'لاعبی گرنگ',
    impactScore: 'خەمەی کاریگەری',
    postMatchTitle: 'شیکاری دوای یاری',
    narrative: 'چیرۆکی یاری بە AI',
    shareCard: 'کارتی پێشبینی بەشبکە',
    shareDownload: 'داگرتن',
    shareLoading: 'ئامادەکردن…',
    noData: 'داتای پێشبینی بۆ ئەم یارییە بەردەست نیە.',
  },
}

// ── Scoreline card ─────────────────────────────────────────────────────────────

function ScorelineCard({
  home, away, homeFlag, awayFlag, prob, rank,
}: {
  home: string; away: string; homeFlag?: string; awayFlag?: string
  prob: number; rank: number
}) {
  const colors = ['#F0A500', '#8B949E', '#CD7F32'] // gold, silver, bronze
  const color = colors[rank - 1] ?? '#30363D'

  return (
    <div
      className="flex items-center justify-between bg-[#0D1117] border rounded-xl px-4 py-3 gap-3"
      style={{ borderColor: color + '50' }}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span
          className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold flex-shrink-0"
          style={{ color, backgroundColor: color + '20' }}
        >
          {rank}
        </span>
        <span className="text-base">{homeFlag || '🏳️'}</span>
        <span
          className="text-xl font-extrabold"
          style={{ color }}
        >
          {home}–{away}
        </span>
        <span className="text-base">{awayFlag || '🏳️'}</span>
      </div>
      <span
        className="text-sm font-bold flex-shrink-0"
        style={{ color }}
      >
        {prob.toFixed(0)}%
      </span>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function MatchDetailPage({
  params,
}: {
  params: { match_id: string }
}) {
  const [language, setLanguage] = useState<Language>('EN')
  const [match, setMatch] = useState<Match | null>(null)
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [loading, setLoading] = useState(true)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [shareLoading, setShareLoading] = useState(false)

  const t = labels[language]
  const { match_id } = params

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const [matchRes, predRes] = await Promise.all([
        supabase.from('matches').select('*').eq('id', match_id).single(),
        supabase.from('predictions').select('*').eq('match_id', match_id).single(),
      ])
      if (matchRes.data) setMatch(matchRes.data as Match)
      if (predRes.data) setPrediction(predRes.data as Prediction)
      setLoading(false)
    }
    fetchData()
  }, [match_id])

  const handleShareCard = async () => {
    if (!match) return
    setShareLoading(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL
      const res = await fetch(`${apiUrl}/card?match_id=${match_id}`)
      if (res.ok) {
        const data = await res.json()
        setShareUrl(data.url ?? data.download_url ?? null)
      }
    } catch {
      // share card is best-effort
    } finally {
      setShareLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D1117]">
        <Navbar language={language} onLanguageChange={setLanguage} />
        <div className="mx-auto max-w-4xl px-4 py-12 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-[#161B22] border border-[#30363D] animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-[#0D1117]">
        <Navbar language={language} onLanguageChange={setLanguage} />
        <div className="mx-auto max-w-4xl px-4 py-24 text-center">
          <p className="text-[#8B949E]">Match not found.</p>
          <Link href="/" className="mt-4 inline-block text-[#F0A500] hover:underline">{t.back}</Link>
        </div>
      </div>
    )
  }

  const confidence = confidenceConfig(match.ai_confidence, language)
  const isFinished = match.status === 'finished'
  const isLive = match.status === 'live'

  return (
    <div className="min-h-screen bg-[#0D1117]">
      <Navbar language={language} onLanguageChange={setLanguage} />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-8">
        {/* Back */}
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-[#8B949E] hover:text-[#F0A500] transition-colors">
          {t.back}
        </Link>

        {/* ── Match Header ─────────────────────────────────────────────────── */}
        <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-6 space-y-6">
          {/* Status + venue */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              {isLive ? (
                <span className="flex items-center gap-1.5 text-xs font-bold text-[#F85149] bg-[#F85149]/10 border border-[#F85149]/30 px-3 py-1 rounded-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#F85149] animate-ping inline-block" />
                  {t.live}
                </span>
              ) : isFinished ? (
                <span className="text-xs font-semibold text-[#8B949E] bg-[#30363D]/50 px-3 py-1 rounded-full">
                  {t.finished}
                </span>
              ) : (
                <span className="text-xs font-semibold text-[#F0A500] bg-[#F0A500]/10 border border-[#F0A500]/30 px-3 py-1 rounded-full">
                  {t.upcoming} · {formatMatchTime(match.match_time)}
                </span>
              )}
              {match.group_name && (
                <span className="text-xs text-[#8B949E] bg-[#0D1117] border border-[#30363D] px-2.5 py-1 rounded-full">
                  {match.group_name}
                </span>
              )}
            </div>
            {/* AI Confidence badge */}
            <span
              className="text-xs font-bold px-3 py-1 rounded-full border"
              style={{ color: confidence.color, borderColor: confidence.color + '40', backgroundColor: confidence.color + '15' }}
            >
              {confidence.label}
            </span>
          </div>

          {/* Teams row */}
          <div className="flex items-center justify-between gap-4">
            {/* Home */}
            <div className="flex flex-col items-center gap-2 flex-1 text-center">
              <span className="text-5xl sm:text-6xl">{match.home_team_flag || '🏳️'}</span>
              <span className="text-base sm:text-xl font-bold text-[#E6EDF3]">{match.home_team}</span>
              {isFinished || isLive ? (
                <span className="text-4xl font-extrabold text-[#E6EDF3]">{match.home_score ?? 0}</span>
              ) : (
                <span className="text-lg font-bold text-[#F0A500]">{Math.round(match.home_win_probability)}%</span>
              )}
            </div>

            {/* Centre */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              {isLive ? (
                <span className="text-3xl font-extrabold text-[#F85149] animate-pulse">
                  {match.home_score ?? 0} — {match.away_score ?? 0}
                </span>
              ) : isFinished ? (
                <span className="text-3xl font-extrabold text-[#E6EDF3]">
                  {match.home_score} — {match.away_score}
                </span>
              ) : (
                <span className="text-2xl font-bold text-[#30363D]">VS</span>
              )}
              {match.venue && (
                <span className="text-xs text-[#8B949E] text-center max-w-[120px]">{match.venue}</span>
              )}
            </div>

            {/* Away */}
            <div className="flex flex-col items-center gap-2 flex-1 text-center">
              <span className="text-5xl sm:text-6xl">{match.away_team_flag || '🏳️'}</span>
              <span className="text-base sm:text-xl font-bold text-[#E6EDF3]">{match.away_team}</span>
              {isFinished || isLive ? (
                <span className="text-4xl font-extrabold text-[#E6EDF3]">{match.away_score ?? 0}</span>
              ) : (
                <span className="text-lg font-bold text-[#F0A500]">{Math.round(match.away_win_probability)}%</span>
              )}
            </div>
          </div>

          {/* Win probability bars */}
          {!isFinished && (
            <div className="space-y-2">
              <div className="flex gap-0.5 h-3 rounded-full overflow-hidden">
                <div
                  className="bg-[#2EA043] rounded-l-full transition-all duration-1000"
                  style={{ width: `${match.home_win_probability}%` }}
                />
                <div
                  className="bg-[#8B949E] transition-all duration-1000"
                  style={{ width: `${match.draw_probability}%` }}
                />
                <div
                  className="bg-[#F85149] rounded-r-full transition-all duration-1000"
                  style={{ width: `${match.away_win_probability}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-[#8B949E]">
                <span className="text-[#2EA043] font-semibold">
                  {Math.round(match.home_win_probability)}% {language === 'KU' ? 'ماڵ' : 'Home'}
                </span>
                <span>
                  {Math.round(match.draw_probability)}% {language === 'KU' ? 'یەکسان' : 'Draw'}
                </span>
                <span className="text-[#F85149] font-semibold">
                  {language === 'KU' ? 'دەرەوە' : 'Away'} {Math.round(match.away_win_probability)}%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── AI Analysis sections (need prediction data) ──────────────────── */}
        {!prediction ? (
          <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-8 text-center">
            <span className="text-3xl">🤖</span>
            <p className="mt-3 text-[#8B949E]">{t.noData}</p>
          </div>
        ) : (
          <>
            {/* SHAP reasons */}
            {prediction.shap_reasons && prediction.shap_reasons.length > 0 && (
              <section className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-[#E6EDF3]">{t.shapTitle}</h2>
                  <p className="text-xs text-[#8B949E]">{t.shapSub}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {prediction.shap_reasons.slice(0, 4).map((r, i) => (
                    <ShapCard key={i} reason={r} language={language} />
                  ))}
                </div>
              </section>
            )}

            {/* Most likely scorelines */}
            {prediction.scorelines && prediction.scorelines.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-lg font-bold text-[#E6EDF3]">{t.scorelineTitle}</h2>
                <div className="space-y-2">
                  {prediction.scorelines.slice(0, 3).map((s, i) => (
                    <ScorelineCard
                      key={i}
                      rank={i + 1}
                      home={String(s.home_score)}
                      away={String(s.away_score)}
                      homeFlag={match.home_team_flag}
                      awayFlag={match.away_team_flag}
                      prob={s.probability * 100}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Momentum */}
            {prediction.momentum && prediction.momentum.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-lg font-bold text-[#E6EDF3]">{t.momentumTitle}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {prediction.momentum.slice(0, 2).map((m, i) => (
                    <MomentumBar key={i} momentum={m} language={language} />
                  ))}
                </div>
              </section>
            )}

            {/* Key player */}
            {prediction.key_player && (
              <section className="space-y-4">
                <h2 className="text-lg font-bold text-[#E6EDF3]">{t.keyPlayerTitle}</h2>
                <div className="bg-[#161B22] border border-[#F0A500]/30 rounded-xl p-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F0A500]/10 border-2 border-[#F0A500]/40 text-3xl flex-shrink-0">
                      {prediction.key_player.team_flag || '⭐'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-lg font-bold text-[#E6EDF3]">{prediction.key_player.name}</p>
                      <p className="text-sm text-[#8B949E]">
                        {prediction.key_player.role} · {prediction.key_player.team}
                      </p>
                      {prediction.key_player.stat && (
                        <p className="mt-1 text-xs text-[#F0A500]">{prediction.key_player.stat}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-center flex-shrink-0">
                      <span className="text-2xl font-extrabold text-[#F0A500]">
                        {prediction.key_player.impact_score.toFixed(1)}
                      </span>
                      <span className="text-[10px] text-[#8B949E]">{t.impactScore}</span>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </>
        )}

        {/* ── User Prediction (only for upcoming matches) ───────────────────── */}
        <UserPrediction match={match} language={language} />

        {/* ── Post-Match Analysis ───────────────────────────────────────────── */}
        {isFinished && prediction && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-[#E6EDF3]">{t.postMatchTitle}</h2>

            {prediction.luck_score !== undefined && (
              <LuckScoreBar
                score={prediction.luck_score}
                label={prediction.luck_label}
                language={language}
              />
            )}

            {prediction.ai_narrative && (
              <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">🤖</span>
                  <h3 className="text-sm font-semibold text-[#E6EDF3]">{t.narrative}</h3>
                </div>
                <p className="text-sm text-[#8B949E] leading-relaxed whitespace-pre-line">
                  {prediction.ai_narrative}
                </p>
              </div>
            )}

            {/* Share card */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleShareCard}
                disabled={shareLoading}
                className="inline-flex items-center gap-2 bg-[#161B22] border border-[#30363D] hover:border-[#F0A500]/50 text-[#E6EDF3] hover:text-[#F0A500] text-sm font-semibold px-5 py-2.5 rounded-lg transition-all"
              >
                <span>📤</span>
                {shareLoading ? t.shareLoading : t.shareCard}
              </button>
              {shareUrl && (
                <a
                  href={shareUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#F0A500] hover:bg-[#D4920A] text-[#0D1117] font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
                >
                  ⬇️ {t.shareDownload}
                </a>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
