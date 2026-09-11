'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { useLanguage } from '@/hooks/useLanguage'
import { useAuth } from '@/context/AuthContext'
import { supabase, supabasePublic } from '@/lib/supabase'
import { Sk } from '@/components/SkeletonCard'
import { PreMatchCard, PostMatchCard } from '@/components/PredictionCard'
import { teamFlagUrl } from '@/lib/flags'
import { fmtMatchDate } from '@/lib/dates'
import type { Match } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserPrediction {
  id: string
  user_id: string
  match_id: string
  predicted_winner: string          // 'home' | 'draw' | 'away'
  predicted_score: string | null    // "2-1"
  outcome?: string | null
  actual_outcome?: string | null
  points_earned?: number | null
  beat_ai?: boolean | null
  is_correct?: boolean | null
  created_at?: string
  match?: Match
}

type BadgeKey = 'TACTICAL_GENIUS' | 'UPSET_HUNTER' | 'DRAW_SPECIALIST' |
                'FAVORITE_BACKER' | 'RISK_TAKER' | 'BEGINNER'

// ── Labels ────────────────────────────────────────────────────────────────────

const L = {
  EN: {
    title: 'My Predictions',
    totalPts: 'Total Points',
    streak: 'Match Streak',
    accuracy: 'Prediction Accuracy',
    beatAI: 'Times Beat AI',
    identity: 'Your Football Identity',
    historyTitle: 'My Prediction History',
    emptyTitle: 'No predictions yet',
    emptyBody: 'Come back to make your first Premier League prediction!',
    viewMatches: 'View Upcoming Matches',
    pending: 'Pending',
    correct: 'Correct',
    wrong: 'Wrong',
    home: 'Home Win', draw: 'Draw', away: 'Away Win',
    share: 'Share My Stats',
    shareMsg: (name: string, pts: number, badge: string) =>
      `${name} has ${pts} pts on @InnoVeraAI Premier League predictions! Football identity: ${badge} ⚽ Ennovera`,
    loadMore: 'Load more',
    error: 'Could not load predictions. Please refresh.',
    retry: 'Retry',
  },
  KU: {
    title: 'پێشبینییەکانم',
    totalPts: 'کۆی خاڵەکان',
    streak: 'زنجیرەی پێشبینیە دروستەکان',
    accuracy: 'دروستی پێشبینییەکان',
    beatAI: '‏AI چەند جار بردتەوە لە',
    identity: 'ناسنامەی تۆپی پێت',
    historyTitle: 'مێژووی پێشبینییەکانم',
    emptyTitle: 'هێشتا پێشبینی نییە',
    emptyBody: 'بگەڕێوە بۆ یەکەم پێشبینیی پرێمیەر لیگت!',
    viewMatches: 'یارییە داهاتووەکان ببینە',
    pending: 'چاوەڕوان',
    correct: 'دروست',
    wrong: 'هەڵە',
    home: 'ماڵ دەبەرێت', draw: 'یەکسان', away: 'میوان دەبەرێت',
    share: 'ئامارەکانم هاوبەش بکە',
    shareMsg: (name: string, pts: number, badge: string) =>
      `${name} ${pts} خاڵی لە پێشبینییەکانی @InnoVeraAI پرێمیەر لیگ! نەریتی فوتبۆڵ: ${badge} ⚽ Ennovera`,
    loadMore: 'زیاتر بخوێنەوە',
    error: 'پێشبینییەکان نەگرانەوە. تکایە نوێ بکەوە.',
    retry: 'دووبارە هەوڵبدە',
  },
}

// ── Badge definitions ─────────────────────────────────────────────────────────

const BADGES: Record<BadgeKey, { emoji: string; nameEN: string; nameKU: string; descEN: string; descKU: string }> = {
  TACTICAL_GENIUS: {
    emoji: '🧠', nameEN: 'Tactical Genius', nameKU: 'ئەندازیاری تاکتیک',
    descEN: 'You read the game like a coach. Logic over emotion.',
    descKU: 'وەک ئەندازیارێکی فوتبۆڵ یاریەکە دەخوێنیتەوە.',
  },
  UPSET_HUNTER: {
    emoji: '🏹', nameEN: 'Upset Hunter', nameKU: 'نێچیری سەرنەگونی',
    descEN: 'You see upsets coming before they happen.',
    descKU: 'پێش ئەوەی ڕووبدات سەرنەگونیەکان دەبینی.',
  },
  DRAW_SPECIALIST: {
    emoji: '🤝', nameEN: 'Draw Specialist', nameKU: 'پسپۆڕی یەکسانی',
    descEN: 'You spot the balanced matches others miss.',
    descKU: 'یاری هاوسەنگەکان دەبینی کە کەسی تر نابینێت.',
  },
  FAVORITE_BACKER: {
    emoji: '⭐', nameEN: 'Favorite Backer', nameKU: 'پشتیوانی فێڤۆرێت',
    descEN: 'You trust the form book. Consistent and reliable.',
    descKU: 'بە فۆرمەکە متمانە دەکەی. ئارام و متمانەپێکراو.',
  },
  RISK_TAKER: {
    emoji: '🎲', nameEN: 'Risk Taker', nameKU: 'مەترسیگر',
    descEN: 'Bold calls. High risk, high reward.',
    descKU: 'بڕیارە جەسورەکان. مەترسی بەرز، خەڵاتی بەرز.',
  },
  BEGINNER: {
    emoji: '⚽', nameEN: 'Beginner', nameKU: 'سەرەتایی',
    descEN: 'Just getting started. Make your first predictions!',
    descKU: 'تازە دەستت پێکرد. یەکەم پێشبینییەکانت بکە!',
  },
}

function computeBadge(preds: UserPrediction[]): BadgeKey {
  if (preds.length < 5) return 'BEGINNER'

  const withResults = preds.filter(p => p.actual_outcome != null)
  const correct = withResults.filter(p => p.predicted_winner === p.actual_outcome).length
  const accuracy = withResults.length > 0 ? correct / withResults.length : 0
  const beatAi = preds.filter(p => p.beat_ai === true).length
  const draws = preds.filter(p => p.predicted_winner === 'draw').length
  const drawRatio = preds.length > 0 ? draws / preds.length : 0

  if (withResults.length >= 10 && accuracy >= 0.7) return 'TACTICAL_GENIUS'
  if (beatAi >= 5) return 'UPSET_HUNTER'
  if (draws >= 3 && drawRatio >= 0.3) return 'DRAW_SPECIALIST'
  if (drawRatio >= 0.5) return 'RISK_TAKER'
  return 'FAVORITE_BACKER'
}

function PredFlag({ name }: { name: string }) {
  const src = teamFlagUrl(name)
  if (src.startsWith('http')) {
    return <img src={src} alt={name} className="h-5 w-auto rounded-sm flex-shrink-0" />
  }
  return <span className="h-5 w-5 flex items-center justify-center text-sm leading-none flex-shrink-0">{src}</span>
}

// ── Outcome label ─────────────────────────────────────────────────────────────

function OutcomeLabel({ outcome, lang, homeTeam, awayTeam }: {
  outcome: string; lang: 'EN' | 'KU'; homeTeam?: string; awayTeam?: string
}) {
  const winSuffix = lang === 'KU' ? ' دەبەرێت' : ' Win'
  const map: Record<string, string> = {
    home: homeTeam ? homeTeam + winSuffix : (lang === 'KU' ? 'ماڵ دەبەرێت' : 'Home Win'),
    draw: lang === 'KU' ? 'یەکسان' : 'Draw',
    away: awayTeam ? awayTeam + winSuffix : (lang === 'KU' ? 'میوان دەبەرێت' : 'Away Win'),
  }
  return <span className="font-semibold">{map[outcome] ?? outcome}</span>
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ icon, value, label, gold = false }: { icon: string; value: string; label: string; gold?: boolean }) {
  return (
    <div className={`bg-[#161B22] border rounded-xl p-4 flex items-center gap-3 ${gold ? 'border-[#F0A500]/40' : 'border-[#30363D]'}`}>
      <span className="text-2xl flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className={`text-2xl font-extrabold leading-none ${gold ? 'text-[#F0A500]' : 'text-[#E6EDF3]'}`}>{value}</p>
        <p className="text-xs text-[#8B949E] mt-0.5 leading-tight">{label}</p>
      </div>
    </div>
  )
}

// ── Prediction card (mobile) ──────────────────────────────────────────────────

function PredCard({ pred, lang }: { pred: UserPrediction; lang: 'EN' | 'KU' }) {
  const t = L[lang]
  const m = pred.match
  const hasResult = pred.actual_outcome != null
  const isCorrect = hasResult && pred.predicted_winner === pred.actual_outcome
  const isWrong = hasResult && pred.predicted_winner !== pred.actual_outcome
  const pts = pred.points_earned ?? 0

  const borderColor = isCorrect ? 'border-l-[#2EA043]' : isWrong ? 'border-l-[#F85149]' : 'border-l-[#F0A500]'
  const isExact = hasResult && pred.predicted_score != null && m?.home_score != null &&
    pred.predicted_score === `${m.home_score}-${m.away_score}`

  const [displayDate, setDisplayDate] = useState('')
  useEffect(() => {
    if (!m?.match_date) return
    let s = m.match_date.replace(' ', 'T')
    if (!s.endsWith('Z') && !s.includes('+')) s += 'Z'
    const d = new Date(s)
    if (!isNaN(d.getTime())) {
      setDisplayDate(d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }))
    }
  }, [m?.match_date])

  return (
    <div className={`bg-[#161B22] border border-[#30363D] border-l-2 ${borderColor} rounded-xl p-4 space-y-3`}>
      {/* Teams + score */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <PredFlag name={m?.home_team ?? ''} />
          <span className="text-xs font-semibold text-[#E6EDF3] truncate">{m?.home_team ?? '—'}</span>
        </div>
        <div className="flex flex-col items-center flex-shrink-0 mx-1">
          {m?.status === 'finished' && m?.home_score != null ? (
            <span className="text-sm font-extrabold text-[#E6EDF3] tabular-nums">
              {m.home_score} – {m.away_score}
            </span>
          ) : (
            <span className="text-xs text-[#8B949E]">vs</span>
          )}
        </div>
        <div className="flex items-center gap-2 min-w-0 flex-row-reverse">
          <PredFlag name={m?.away_team ?? ''} />
          <span className="text-xs font-semibold text-[#E6EDF3] truncate">{m?.away_team ?? '—'}</span>
        </div>
      </div>

      {/* Picks + status */}
      <div className="flex items-center justify-between text-xs gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[#8B949E]">My pick:</span>
          <span className={`px-2 py-0.5 rounded-full font-semibold ${
            isCorrect ? 'bg-[#2EA043]/20 text-[#2EA043]'
            : isWrong ? 'bg-[#F85149]/20 text-[#F85149]'
            : 'bg-[#F0A500]/15 text-[#F0A500]'
          }`}>
            <OutcomeLabel outcome={pred.predicted_winner} lang={lang} homeTeam={m?.home_team} awayTeam={m?.away_team} />
            {pred.predicted_score && (
              <span className="font-normal opacity-80"> ({pred.predicted_score})</span>
            )}
          </span>
          {isExact && (
            <span className="text-[#2EA043] font-bold text-[10px]">🎯 Exact!</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {pred.beat_ai && (
            <span className="text-[#2EA043] font-bold text-[10px]">Beat AI ✓</span>
          )}
          <span className={`font-bold ${pts > 0 ? 'text-[#F0A500]' : 'text-[#8B949E]'}`}>
            {hasResult ? `+${pts} pts` : t.pending}
          </span>
        </div>
      </div>

      {/* Date */}
      {displayDate && (
        <p className="text-[10px] text-[#30363D]">
          {displayDate}
        </p>
      )}
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        {[1,2,3,4].map(i => (
          <div key={i} className="bg-[#161B22] border border-[#30363D] rounded-xl p-4 space-y-2">
            <Sk className="h-8 w-16" />
            <Sk className="h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-6 space-y-3">
        <Sk className="h-16 w-16 rounded-full mx-auto" />
        <Sk className="h-6 w-40 mx-auto" />
        <Sk className="h-4 w-64 mx-auto" />
      </div>
      {[1,2,3].map(i => (
        <div key={i} className="bg-[#161B22] border border-[#30363D] rounded-xl p-4 space-y-2">
          <Sk className="h-4 w-full" />
          <Sk className="h-3 w-3/4" />
        </div>
      ))}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MyPredictionsPage() {
  const { language, changeLanguage } = useLanguage()
  const { user, loading: authLoading, openAuthModal } = useAuth()
  const router = useRouter()
  const t = L[language]

  const [predictions, setPredictions] = useState<UserPrediction[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState(false)
  const [page, setPage] = useState(1)
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null)
  const PAGE_SIZE = 10
  const badgeRef = useRef<HTMLDivElement>(null)

  // Redirect if not logged in once auth resolves
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/')
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (!user) return
    const lastFetch = { at: 0 }
    async function fetchData() {
      lastFetch.at = Date.now()
      setDataLoading(true)
      setError(false)
      try {
        const predsRes = await supabase
          .from('user_predictions')
          .select('*')
          .eq('user_id', user!.id)  // created_at column does not exist — no order()

        if (predsRes.error) console.error('[my-predictions] user_predictions error:', predsRes.error.message, predsRes.error.code)

        const preds = (predsRes.data ?? []) as UserPrediction[]

        // Fetch match details for each prediction
        const matchIds = preds.map(p => p.match_id).filter(Boolean)
        console.log('[my-predictions] matchIds to fetch:', matchIds)
        if (matchIds.length > 0) {
          const { data: matchRows, error: matchErr } = await supabase
            .from('matches')
            .select('match_id,home_team,away_team,match_date,home_score,away_score,status,group_name,home_win_probability,draw_probability,away_win_probability')
            .eq('competition', 'PL2026-27')
            .in('match_id', matchIds)
          if (matchErr) {
            console.error('[my-predictions] match fetch error:', matchErr.message, matchErr.code)
          } else {
            console.log('[my-predictions] matchRows fetched:', matchRows?.length, matchRows?.[0])
            const matchMap: Record<string, Match> = {}
            for (const m of matchRows ?? []) matchMap[(m as Record<string,unknown>).match_id as string] = m as unknown as Match
            for (const p of preds) { if (matchMap[p.match_id]) p.match = matchMap[p.match_id] }
          }
        }

        setPredictions(preds)
      } catch (err) {
        console.error('[my-predictions] fetch error:', err)
        setError(true)
      } finally {
        setDataLoading(false)
      }
    }

    fetchData()

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastFetch.at > 30_000) {
        void fetchData()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [user])

  // Auth loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0D1117]">
        <Navbar language={language} onLanguageChange={changeLanguage} />
        <main className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">
          <PageSkeleton />
        </main>
      </div>
    )
  }

  // Not logged in — redirect already fired, show nothing
  if (!user) return null

  // Stats computation
  const withResults = predictions.filter(p => p.actual_outcome != null)
  const correct = withResults.filter(p => p.predicted_winner === p.actual_outcome).length
  const totalPoints = predictions.reduce((s, p) => s + (p.points_earned ?? 0), 0)
  const accuracy = withResults.length > 0 ? Math.round((correct / withResults.length) * 100) : null
  const beatAiCount = predictions.filter(p => p.beat_ai === true).length

  let streak = 0
  for (const p of predictions) {
    if (p.actual_outcome == null) continue
    if (p.predicted_winner === p.actual_outcome) streak++
    else break
  }

  const badgeKey = computeBadge(predictions)
  const badge = BADGES[badgeKey]

  const displayName =
    (user.user_metadata?.name as string | undefined) ??
    user.email?.split('@')[0] ??
    'Predictor'

  const handleShare = async () => {
    const msg = t.shareMsg(displayName, totalPoints, badge.nameEN)
    if (navigator.share) {
      await navigator.share({ title: 'Ennovera', text: msg, url: 'https://aifootballp.com' })
    } else {
      await navigator.clipboard.writeText(msg)
    }
  }

  const downloadBadge = async () => {
    if (!badgeRef.current) return
    const html2canvas = (await import('html2canvas')).default
    const canvas = await html2canvas(badgeRef.current, {
      backgroundColor: '#0D1117',
      scale: 2,
      useCORS: true,
      logging: false,
    })
    const link = document.createElement('a')
    link.download = 'innovera-pl2026-badge.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const shareBadge = async () => {
    if (!badgeRef.current) return
    const html2canvas = (await import('html2canvas')).default
    const canvas = await html2canvas(badgeRef.current, {
      backgroundColor: '#0D1117',
      scale: 2,
      useCORS: true,
      logging: false,
    })
    canvas.toBlob(async (blob) => {
      if (!blob) return
      if (navigator.share && typeof navigator.canShare === 'function') {
        const file = new File([blob], 'innovera-badge.png', { type: 'image/png' })
        try {
          await navigator.share({
            title: 'My Ennovera PL Badge',
            text: `${displayName} — ${badge.nameEN} on Ennovera Premier League Predictor!`,
            files: [file],
          })
          return
        } catch { /* fallthrough to download */ }
      }
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = 'innovera-pl2026-badge.png'
      link.href = url
      link.click()
      URL.revokeObjectURL(url)
    })
  }

  const visiblePreds = predictions.slice(0, page * PAGE_SIZE)

  return (
    <div className="min-h-screen bg-[#0D1117]">
      <Navbar language={language} onLanguageChange={changeLanguage} />

      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-[#E6EDF3]">{t.title}</h1>
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#F0A500] bg-[#F0A500]/10 border border-[#F0A500]/30 px-3 py-1.5 rounded-lg hover:bg-[#F0A500]/20 transition-colors"
          >
            📤 {t.share}
          </button>
        </div>

        {dataLoading ? <PageSkeleton /> : error ? (
          <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-8 text-center space-y-3">
            <p className="text-[#8B949E]">{t.error}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-sm font-semibold text-[#F0A500] hover:underline"
            >
              {t.retry}
            </button>
          </div>
        ) : (
          <>
            {/* ── S2: Stat Cards (2×2) ──────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon="⭐" value={String(totalPoints)} label={t.totalPts} gold />
              <StatCard icon="🔥" value={streak > 0 ? String(streak) : '—'} label={t.streak} />
              <StatCard icon="🎯" value={accuracy != null ? `${accuracy}%` : '—%'} label={t.accuracy} />
              <StatCard icon="🤖" value={String(beatAiCount)} label={t.beatAI} />
            </div>

            {/* ── S3: Football Identity Badge ───────────────────────────── */}
            <div
              ref={badgeRef}
              className="bg-gradient-to-br from-[#161B22] to-[#0D1117] border border-[#F0A500]/30 rounded-2xl p-6 text-center space-y-3"
              style={{ boxShadow: '0 0 40px rgba(240,165,0,0.07)' }}
            >
              {/* Branding header — included in PNG */}
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-[#F0A500] tracking-widest uppercase">🏆 Ennovera · PL 26-27</span>
                <span className="text-[10px] text-[#8B949E]">Ennovera</span>
              </div>

              <p className="text-xs font-semibold text-[#F0A500] uppercase tracking-widest">{t.identity}</p>
              <span className="text-6xl block leading-none">{badge.emoji}</span>
              <p className="text-xl font-extrabold text-[#F0A500]">
                {language === 'KU' ? badge.nameKU : badge.nameEN}
              </p>
              <p className="text-sm text-[#8B949E] max-w-xs mx-auto leading-relaxed">
                {language === 'KU' ? badge.descKU : badge.descEN}
              </p>

              {/* User name + mini stats */}
              <div className="pt-2 border-t border-[#30363D]/50 space-y-1">
                <p className="text-sm font-bold text-[#E6EDF3]">{displayName}</p>
                <p className="text-xs text-[#8B949E]">
                  {totalPoints} {language === 'KU' ? 'خاڵ' : 'pts'}
                  {accuracy != null && ` · ${accuracy}% ${language === 'KU' ? 'تەواوی' : 'accuracy'}`}
                </p>
                <p className="text-[9px] text-[#30363D] tracking-widest font-medium select-none">PREMIER LEAGUE 2026-27</p>
              </div>
            </div>

            {/* Download + Share buttons */}
            <div className="flex gap-2">
              <button
                onClick={downloadBadge}
                className="flex-1 flex items-center justify-center gap-1.5 bg-[#F0A500] hover:bg-[#D4920A] text-[#0D1117] font-bold text-sm py-2.5 rounded-xl transition-colors"
              >
                📥 {language === 'KU' ? 'داگرتن' : 'Download Badge'}
              </button>
              <button
                onClick={shareBadge}
                className="flex-1 flex items-center justify-center gap-1.5 bg-[#161B22] hover:bg-[#21262D] text-[#E6EDF3] font-bold text-sm py-2.5 rounded-xl border border-[#30363D] hover:border-[#F0A500]/40 transition-all"
              >
                📤 {language === 'KU' ? 'هاوبەشکردن' : 'Share Badge'}
              </button>
            </div>

            {/* ── S5: Prediction History ───────────────────────────────── */}
            <section className="space-y-4">
              <h2 className="text-base font-bold text-[#E6EDF3]">{t.historyTitle}</h2>

              {predictions.length === 0 ? (
                <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-10 text-center space-y-4">
                  <span className="text-5xl block">⚽</span>
                  <p className="font-bold text-[#E6EDF3]">{t.emptyTitle}</p>
                  <p className="text-sm text-[#8B949E] max-w-xs mx-auto leading-relaxed">{t.emptyBody}</p>
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 bg-[#F0A500] hover:bg-[#D4920A] text-[#0D1117] font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors"
                  >
                    {t.viewMatches} →
                  </Link>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {visiblePreds.map(pred => (
                      <div key={pred.id} className="space-y-2">
                        {/* Prediction row with 📥 toggle button */}
                        <div className="relative">
                          <Link href={`/match/${pred.match_id}`} className="block rounded-xl hover:ring-1 hover:ring-[#F0A500]/30 transition-all">
                            <PredCard pred={pred} lang={language} />
                          </Link>
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpandedCardId(expandedCardId === pred.id ? null : pred.id) }}
                            title={expandedCardId === pred.id ? 'Close card' : 'Download prediction card'}
                            className="absolute top-2 right-2 text-[10px] font-bold text-[#0D1117] bg-[#F0A500] hover:bg-[#D4920A] px-1.5 py-0.5 rounded-full transition-colors leading-none z-10"
                          >
                            {expandedCardId === pred.id ? '✕' : '📥'}
                          </button>
                        </div>

                        {/* Expanded card — pre-match or post-match depending on status */}
                        {expandedCardId === pred.id && pred.match && (
                          <div className="overflow-x-auto pt-1 pb-2">
                            {pred.match.status === 'finished' && pred.match.home_score != null ? (
                              <PostMatchCard
                                homeTeam={pred.match.home_team}
                                awayTeam={pred.match.away_team}
                                homeFlag={teamFlagUrl(pred.match.home_team)}
                                awayFlag={teamFlagUrl(pred.match.away_team)}
                                homeScore={pred.match.home_score ?? 0}
                                awayScore={pred.match.away_score ?? 0}
                                group={pred.match.group_name ?? undefined}
                                userPrediction={
                                  pred.predicted_winner === 'home' ? `${pred.match.home_team} Win`
                                  : pred.predicted_winner === 'away' ? `${pred.match.away_team} Win`
                                  : 'Draw'
                                }
                                userCorrect={pred.actual_outcome != null ? pred.predicted_winner === pred.actual_outcome : undefined}
                                pointsEarned={pred.points_earned ?? undefined}
                                isLoggedIn={!!user}
                                language={language}
                              />
                            ) : (
                              <PreMatchCard
                                homeTeam={pred.match.home_team}
                                awayTeam={pred.match.away_team}
                                homeFlag={teamFlagUrl(pred.match.home_team)}
                                awayFlag={teamFlagUrl(pred.match.away_team)}
                                matchDate={fmtMatchDate(pred.match.match_date) || undefined}
                                group={pred.match.group_name ?? undefined}
                                homeWinProb={pred.match.home_win_probability ?? 33}
                                drawProb={pred.match.draw_probability ?? 34}
                                awayWinProb={pred.match.away_win_probability ?? 33}
                                userPrediction={
                                  pred.predicted_winner === 'home' ? `${pred.match.home_team} Win`
                                  : pred.predicted_winner === 'away' ? `${pred.match.away_team} Win`
                                  : 'Draw'
                                }
                                userScore={
                                  (() => { const p = pred.predicted_score?.split('-'); return p?.length === 2 ? `${p[0]} — ${p[1]}` : undefined })()
                                }
                                isLocked={true}
                                language={language}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {predictions.length > visiblePreds.length && (
                    <button
                      onClick={() => setPage(p => p + 1)}
                      className="w-full py-2.5 text-sm font-semibold text-[#8B949E] bg-[#161B22] border border-[#30363D] rounded-xl hover:border-[#F0A500]/40 hover:text-[#E6EDF3] transition-all"
                    >
                      {t.loadMore}
                    </button>
                  )}
                </>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}
