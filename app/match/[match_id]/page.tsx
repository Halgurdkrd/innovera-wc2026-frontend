'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import CardModal from '@/components/CardModal'
import ShapCard from '@/components/ShapCard'
import MomentumBar from '@/components/MomentumBar'
import LuckScoreBar from '@/components/LuckScoreBar'
import UserPrediction from '@/components/UserPrediction'
import { Sk } from '@/components/SkeletonCard'
import { useLanguage } from '@/hooks/useLanguage'
import { supabase } from '@/lib/supabase'
import type { Match, Prediction, LuckScore } from '@/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDateTime(iso?: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleString([], {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function fmtDate(iso?: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString([], {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

function confidenceCfg(score?: number) {
  if (!score) return { label: 'LOW', labelKU: 'کەم', color: '#8B949E' }
  if (score >= 75) return { label: 'HIGH', labelKU: 'بەرز', color: '#2EA043' }
  if (score >= 50) return { label: 'MEDIUM', labelKU: 'مامناوەند', color: '#F0A500' }
  return { label: 'LOW', labelKU: 'کەم', color: '#8B949E' }
}

function luckLabel(score?: number): 'Lucky' | 'Deserved' | 'Unlucky' {
  if (score == null) return 'Deserved'
  if (score > 1) return 'Lucky'
  if (score < -1) return 'Unlucky'
  return 'Deserved'
}

// ── Labels ────────────────────────────────────────────────────────────────────

const L = {
  EN: {
    back: '← Back',
    scheduled: 'Scheduled',
    live: '🔴 LIVE',
    finished: 'Full Time',
    group: 'Group',
    aiCard: 'AI Prediction',
    homeWin: 'Home Win', draw: 'Draw', awayWin: 'Away Win',
    confidence: 'AI Confidence',
    scorelines: 'Most Likely Scorelines',
    shapTitle: 'Why AI Thinks This',
    shapSub: 'Powered by SHAP explainability',
    momentum: 'Team Momentum',
    keyPlayer: 'Key Player Spotlight',
    impact: 'Impact',
    postMatch: 'Post-Match Analysis',
    luckTitle: 'Luck Scores',
    narrative: 'AI Match Narrative',
    share: 'Share Prediction Card',
    shareDownload: 'View Card',
    shareLoading: 'Generating…',
    noPred: 'AI prediction not yet available.',
    noPredSoon: 'Prediction arrives ~2 hours before kickoff.',
    noMatch: 'Match not found.',
  },
  KU: {
    back: '← گەڕانەوە',
    scheduled: 'بەرنامەریزیکراو',
    live: '🔴 ڕاستەوخۆ',
    finished: 'تەواوبوو',
    group: 'گروپ',
    aiCard: 'پێشبینی AI',
    homeWin: 'ماڵ دەبەرێت', draw: 'یەکسان', awayWin: 'میوان دەبەرێت',
    confidence: 'دڵنیایی AI',
    scorelines: 'ئەنجامە پێشبینیکراوەکان',
    shapTitle: 'بۆچی AI ئەمە پێشبینی دەکات',
    shapSub: 'بە هێزی SHAP',
    momentum: 'مۆمێنتەمی تیمەکان',
    keyPlayer: 'لاعبی گرنگ',
    impact: 'کاریگەری',
    postMatch: 'شیکاری دوای یاری',
    luckTitle: 'خەمەی بەخت',
    narrative: 'چیرۆکی یاری بە AI',
    share: 'کارتی پێشبینی بەشبکە',
    shareDownload: 'بینینی کارت',
    shareLoading: 'ئامادەکردن…',
    noPred: 'پێشبینی AI بۆ ئەم یارییە بەردەست نیە.',
    noPredSoon: 'پێشبینی نزیکەی ٢ کاتژمێر پێش دەستپێکردن دێت.',
    noMatch: 'یاری نەدۆزرایەوە.',
  },
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status, lang }: { status: Match['status']; lang: 'EN' | 'KU' }) {
  const t = L[lang]
  if (status === 'live') return (
    <span className="flex items-center gap-1.5 text-xs font-bold text-[#F85149] bg-[#F85149]/10 border border-[#F85149]/30 px-3 py-1 rounded-full">
      <span className="h-1.5 w-1.5 rounded-full bg-[#F85149] animate-ping" />
      {t.live}
    </span>
  )
  if (status === 'finished') return (
    <span className="text-xs font-semibold text-[#8B949E] bg-[#30363D]/50 px-3 py-1 rounded-full">
      {t.finished}
    </span>
  )
  return (
    <span className="text-xs font-semibold text-[#F0A500] bg-[#F0A500]/10 border border-[#F0A500]/30 px-3 py-1 rounded-full">
      {t.scheduled}
    </span>
  )
}

function ProbBar({ homeProb, drawProb, awayProb, homeName, awayName, lang }: {
  homeProb: number; drawProb: number; awayProb: number
  homeName: string; awayName: string; lang: 'EN' | 'KU'
}) {
  const t = L[lang]
  return (
    <div className="space-y-2">
      <div className="flex gap-0.5 h-3 rounded-full overflow-hidden">
        <div className="bg-[#2EA043] rounded-l-full transition-all duration-1000" style={{ width: `${homeProb}%` }} />
        <div className="bg-[#8B949E] transition-all duration-1000" style={{ width: `${drawProb}%` }} />
        <div className="bg-[#F85149] rounded-r-full transition-all duration-1000" style={{ width: `${awayProb}%` }} />
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-[#2EA043] font-semibold">{homeName} {Math.round(homeProb)}%</span>
        <span className="text-[#8B949E]">{t.draw} {Math.round(drawProb)}%</span>
        <span className="text-[#F85149] font-semibold">{Math.round(awayProb)}% {awayName}</span>
      </div>
    </div>
  )
}

function ScorelineRow({ home, away, homeFlag, awayFlag, prob, rank }: {
  home: number; away: number; homeFlag?: string; awayFlag?: string
  prob: number; rank: number
}) {
  const colors = ['#F0A500', '#8B949E', '#CD7F32']
  const color = colors[rank - 1] ?? '#30363D'
  return (
    <div className="flex items-center gap-3 bg-[#0D1117] border rounded-xl px-4 py-3" style={{ borderColor: color + '50' }}>
      <span className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold flex-shrink-0"
        style={{ color, backgroundColor: color + '20' }}>
        {rank}
      </span>
      <span className="text-base flex-shrink-0">{homeFlag || '🏳️'}</span>
      <span className="text-xl font-extrabold flex-1" style={{ color }}>
        {home} – {away}
      </span>
      <span className="text-base flex-shrink-0">{awayFlag || '🏳️'}</span>
      <span className="text-sm font-bold tabular-nums" style={{ color }}>{(prob * 100).toFixed(0)}%</span>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function MatchSkeleton({ lang }: { lang: 'EN' | 'KU' }) {
  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-6 space-y-6">
        <div className="flex justify-between">
          <Sk className="h-7 w-24 rounded-full" />
          <Sk className="h-7 w-20 rounded-full" />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col items-center gap-2 flex-1">
            <Sk className="h-14 w-14 rounded-full" />
            <Sk className="h-4 w-20" />
            <Sk className="h-5 w-10" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <Sk className="h-8 w-16" />
            <Sk className="h-3 w-24" />
          </div>
          <div className="flex flex-col items-center gap-2 flex-1">
            <Sk className="h-14 w-14 rounded-full" />
            <Sk className="h-4 w-20" />
            <Sk className="h-5 w-10" />
          </div>
        </div>
        <Sk className="h-3 w-full rounded-full" />
      </div>
      {/* AI card skeleton */}
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-3">
          <Sk className="h-5 w-40" />
          <Sk className="h-3 w-full rounded-full" />
          <Sk className="h-3 w-3/4 rounded-full" />
        </div>
      ))}
      <p className="text-center text-xs text-[#8B949E]">
        {lang === 'KU' ? 'پێشبینییەکانی ئەی ئای بارئەکرێت…' : 'AI predictions loading…'}
      </p>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MatchDetailPage() {
  const { language, changeLanguage } = useLanguage()
  const router = useRouter()
  const routeParams = useParams()
  const match_id = routeParams.match_id as string
  const t = L[language]

  const [match, setMatch] = useState<Match | null>(null)
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [homeLuck, setHomeLuck] = useState<LuckScore | null>(null)
  const [awayLuck, setAwayLuck] = useState<LuckScore | null>(null)
  const [loading, setLoading] = useState(true)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [shareLoading, setShareLoading] = useState(false)
  const [showCardModal, setShowCardModal] = useState(false)
  const probBarRef = useRef<HTMLDivElement>(null)
  const [probsVisible, setProbsVisible] = useState(false)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      console.log('[match-detail] looking up match_id:', match_id)
      try {
        const [matchRes, predRes] = await Promise.all([
          supabase.from('matches').select('*').eq('match_id', match_id).maybeSingle(),
          supabase.from('predictions').select('*').eq('match_id', match_id).maybeSingle(),
        ])
        console.log('[match-detail] match data:', matchRes.data, 'error:', matchRes.error?.message)

        if (matchRes.error) console.error('[match] fetch error:', matchRes.error.message)
        if (predRes.error) console.error('[prediction] fetch error:', predRes.error.message)

        const raw = matchRes.data as Record<string, unknown> | null
        if (raw) {
          // Build a clean Match object without mutating the Supabase response
          const m: Match = {
            ...(raw as unknown as Match),
            match_id: raw.match_id as string | undefined,
            id: (raw.id ?? raw.match_id) as string | undefined,
          }
          setMatch(m)

          // Fetch luck scores — use eq on the date portion only
          const matchDateStr = (m.match_date ?? '').split('T')[0]
          if (matchDateStr) {
            const luckRes = await supabase
              .from('luck_scores')
              .select('*')
              .in('team_name', [m.home_team, m.away_team])
              .eq('match_date', matchDateStr)
            if (luckRes.data) {
              const rows = luckRes.data as LuckScore[]
              setHomeLuck(rows.find(r => r.team_name === m.home_team) ?? null)
              setAwayLuck(rows.find(r => r.team_name === m.away_team) ?? null)
            }
          }
        }

        if (predRes.data) setPrediction(predRes.data as Prediction)
      } catch (err) {
        console.error('[match-detail] unexpected error:', err)
      } finally {
        // Always clear loading — prevents infinite spinner on any error
        setLoading(false)
      }
    }
    fetchData()
  }, [match_id])

  // Animate prob bars on mount
  useEffect(() => {
    const timer = setTimeout(() => setProbsVisible(true), 150)
    return () => clearTimeout(timer)
  }, [])

  const handleShareCard = async () => {
    if (!match) return
    setShareLoading(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL
      const res = await fetch(`${apiUrl}/cards/card?match_id=${match_id}`)
      if (res.ok) {
        const data = await res.json()
        const url = data.url ?? data.download_url ?? null
        setShareUrl(url)
        if (url) setShowCardModal(true)
      }
    } catch { /* share is best-effort */ }
    finally { setShareLoading(false) }
  }

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D1117]">
        <Navbar language={language} onLanguageChange={changeLanguage} />
        <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-6">
          <button onClick={() => router.back()} className="text-sm text-[#8B949E] hover:text-[#F0A500] transition-colors">
            {t.back}
          </button>
          <MatchSkeleton lang={language} />
        </main>
      </div>
    )
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-[#0D1117]">
        <Navbar language={language} onLanguageChange={changeLanguage} />
        <div className="mx-auto max-w-4xl px-4 py-24 text-center space-y-4">
          <p className="text-4xl">🏟️</p>
          <p className="text-[#8B949E]">{t.noMatch}</p>
          <button onClick={() => router.back()} className="text-[#F0A500] hover:underline text-sm">
            {t.back}
          </button>
        </div>
      </div>
    )
  }

  const isFinished = match.status === 'finished'
  const isLive = match.status === 'live'
  const isScheduled = match.status === 'scheduled' || match.status === 'upcoming'
  const datetime = match.match_date ?? match.match_time
  const confidence = confidenceCfg(match.ai_confidence)

  const hasProbs = match.home_win_probability != null

  return (
    <div className="min-h-screen bg-[#0D1117]">
      <Navbar language={language} onLanguageChange={changeLanguage} />

      {showCardModal && shareUrl && (
        <CardModal imageUrl={shareUrl} language={language} onClose={() => setShowCardModal(false)} />
      )}

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-8">

        {/* Back */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1 text-sm text-[#8B949E] hover:text-[#F0A500] transition-colors"
        >
          {t.back}
        </button>

        {/* ── SECTION 1: Match Header ──────────────────────────────────────── */}
        <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-6 space-y-6">

          {/* Status row */}
          <div className="flex items-center flex-wrap gap-2 justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={match.status} lang={language} />
              {match.tournament_stage && (
                <span className="text-xs text-[#8B949E] bg-[#0D1117] border border-[#30363D] px-2.5 py-1 rounded-full">
                  {match.tournament_stage}
                </span>
              )}
              {match.group_name && (
                <span className="text-xs text-[#8B949E] bg-[#0D1117] border border-[#30363D] px-2.5 py-1 rounded-full">
                  {t.group} {match.group_name}
                </span>
              )}
            </div>
            {match.ai_confidence != null && (
              <span
                className="text-xs font-bold px-3 py-1 rounded-full border"
                style={{ color: confidence.color, borderColor: confidence.color + '40', backgroundColor: confidence.color + '15' }}
              >
                {t.confidence}: {language === 'KU' ? confidence.labelKU : confidence.label}
              </span>
            )}
          </div>

          {/* Date + venue */}
          {datetime && (
            <p className="text-xs text-[#8B949E]">
              {fmtDateTime(datetime)}
              {match.venue && <> · {match.venue}</>}
            </p>
          )}

          {/* Teams */}
          <div className="flex items-center justify-between gap-4">
            {/* Home */}
            <div className="flex flex-col items-center gap-2 flex-1 text-center">
              <span className="text-5xl sm:text-6xl">{match.home_team_flag || '🏳️'}</span>
              <span className="text-base sm:text-xl font-bold text-[#E6EDF3]">{match.home_team}</span>
              {(isFinished || isLive) ? (
                <span className="text-4xl font-extrabold text-[#E6EDF3]">{match.home_score ?? 0}</span>
              ) : hasProbs ? (
                <span className="text-lg font-bold text-[#F0A500]">{Math.round(match.home_win_probability!)}%</span>
              ) : null}
            </div>

            {/* Centre */}
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              {isLive ? (
                <span className="text-3xl font-extrabold text-[#F85149] animate-pulse">
                  {match.home_score ?? 0} – {match.away_score ?? 0}
                </span>
              ) : isFinished ? (
                <span className="text-3xl font-extrabold text-[#E6EDF3]">
                  {match.home_score ?? 0} – {match.away_score ?? 0}
                </span>
              ) : (
                <span className="text-2xl font-bold text-[#30363D]">VS</span>
              )}
            </div>

            {/* Away */}
            <div className="flex flex-col items-center gap-2 flex-1 text-center">
              <span className="text-5xl sm:text-6xl">{match.away_team_flag || '🏳️'}</span>
              <span className="text-base sm:text-xl font-bold text-[#E6EDF3]">{match.away_team}</span>
              {(isFinished || isLive) ? (
                <span className="text-4xl font-extrabold text-[#E6EDF3]">{match.away_score ?? 0}</span>
              ) : hasProbs ? (
                <span className="text-lg font-bold text-[#F0A500]">{Math.round(match.away_win_probability!)}%</span>
              ) : null}
            </div>
          </div>

          {/* Animated prob bars */}
          {hasProbs && !isFinished && (
            <div ref={probBarRef}>
              <ProbBar
                homeProb={probsVisible ? match.home_win_probability! : 0}
                drawProb={probsVisible ? (match.draw_probability ?? 0) : 0}
                awayProb={probsVisible ? match.away_win_probability! : 0}
                homeName={match.home_team}
                awayName={match.away_team}
                lang={language}
              />
            </div>
          )}
        </div>

        {/* ── SECTION 2: AI Prediction Card ───────────────────────────────── */}
        {!prediction ? (
          <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-8 text-center space-y-2">
            <span className="text-4xl">🤖</span>
            <p className="text-[#8B949E]">{t.noPred}</p>
            {isScheduled && (
              <p className="text-xs text-[#8B949E]/60">{t.noPredSoon}</p>
            )}
          </div>
        ) : (
          <>
            {/* Win prob bars inside AI card (from prediction if match has no prob cols) */}
            {hasProbs && (
              <section className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-[#E6EDF3]">{t.aiCard}</h2>
                  {match.ai_confidence != null && (
                    <span
                      className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border"
                      style={{ color: confidence.color, borderColor: confidence.color + '40', backgroundColor: confidence.color + '15' }}
                    >
                      {language === 'KU' ? confidence.labelKU : confidence.label}
                    </span>
                  )}
                </div>
                <ProbBar
                  homeProb={match.home_win_probability!}
                  drawProb={match.draw_probability ?? 0}
                  awayProb={match.away_win_probability!}
                  homeName={match.home_team}
                  awayName={match.away_team}
                  lang={language}
                />
              </section>
            )}

            {/* Scorelines */}
            {prediction.scorelines && prediction.scorelines.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-lg font-bold text-[#E6EDF3]">{t.scorelines}</h2>
                <div className="space-y-2">
                  {prediction.scorelines.slice(0, 3).map((s, i) => (
                    <ScorelineRow
                      key={i}
                      rank={i + 1}
                      home={s.home_score}
                      away={s.away_score}
                      homeFlag={match.home_team_flag}
                      awayFlag={match.away_team_flag}
                      prob={s.probability}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* ── SECTION 3: SHAP reasons ───────────────────────────────── */}
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

            {/* ── SECTION 4: Momentum ───────────────────────────────────── */}
            {prediction.momentum && prediction.momentum.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-lg font-bold text-[#E6EDF3]">{t.momentum}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {prediction.momentum.slice(0, 2).map((m, i) => (
                    <MomentumBar key={i} momentum={m} language={language} />
                  ))}
                </div>
              </section>
            )}

            {/* ── SECTION 5: Key Player ─────────────────────────────────── */}
            {prediction.key_player && (
              <section className="space-y-3">
                <h2 className="text-lg font-bold text-[#E6EDF3]">{t.keyPlayer}</h2>
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
                      <span className="text-[10px] text-[#8B949E]">{t.impact}</span>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </>
        )}

        {/* ── SECTION 6: User Prediction (scheduled only) ─────────────────── */}
        {(isScheduled || isLive) && <UserPrediction match={match} language={language} />}

        {/* ── SECTION 7: Post-Match (finished only) ───────────────────────── */}
        {isFinished && (
          <section className="space-y-5">
            <h2 className="text-lg font-bold text-[#E6EDF3]">{t.postMatch}</h2>

            {/* Luck bars — one per team */}
            {(homeLuck || awayLuck) && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[#8B949E] uppercase tracking-wide">{t.luckTitle}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {homeLuck && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-[#E6EDF3] flex items-center gap-1.5">
                        <span>{match.home_team_flag || '🏳️'}</span>
                        {match.home_team}
                      </p>
                      <LuckScoreBar
                        score={homeLuck.luck_score}
                        label={luckLabel(homeLuck.luck_score)}
                        language={language}
                      />
                    </div>
                  )}
                  {awayLuck && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-[#E6EDF3] flex items-center gap-1.5">
                        <span>{match.away_team_flag || '🏳️'}</span>
                        {match.away_team}
                      </p>
                      <LuckScoreBar
                        score={awayLuck.luck_score}
                        label={luckLabel(awayLuck.luck_score)}
                        language={language}
                      />
                    </div>
                  )}
                  {/* Fallback: luck from predictions table */}
                  {!homeLuck && !awayLuck && prediction?.luck_score != null && (
                    <LuckScoreBar
                      score={prediction.luck_score}
                      label={prediction.luck_label}
                      language={language}
                    />
                  )}
                </div>
              </div>
            )}

            {/* AI Narrative */}
            {(prediction?.ai_narrative || match.narrative) && (
              <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">🤖</span>
                  <h3 className="text-sm font-semibold text-[#E6EDF3]">{t.narrative}</h3>
                </div>
                <p className="text-sm text-[#8B949E] leading-relaxed whitespace-pre-line">
                  {prediction?.ai_narrative ?? match.narrative}
                </p>
              </div>
            )}

            {/* ── SECTION 8: Share Card ─────────────────────────────────── */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={handleShareCard}
                disabled={shareLoading}
                className="inline-flex items-center gap-2 bg-[#161B22] border border-[#30363D] hover:border-[#F0A500]/50 text-[#E6EDF3] hover:text-[#F0A500] text-sm font-semibold px-5 py-2.5 rounded-lg transition-all disabled:opacity-60"
              >
                <span>📤</span>
                {shareLoading ? t.shareLoading : t.share}
              </button>
              {shareUrl && !showCardModal && (
                <button
                  onClick={() => setShowCardModal(true)}
                  className="inline-flex items-center gap-2 bg-[#F0A500] hover:bg-[#D4920A] text-[#0D1117] font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
                >
                  👁 {t.shareDownload}
                </button>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
