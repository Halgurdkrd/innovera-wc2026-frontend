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
import type { Match } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserPrediction {
  id: string
  user_id: string
  match_id: string
  predicted_outcome: 'home' | 'draw' | 'away'
  predicted_home_score: number | null
  predicted_away_score: number | null
  actual_outcome?: string | null
  points_earned?: number | null
  beat_ai?: boolean | null
  created_at: string
  match?: Match
}

interface UserBracket {
  id: string
  user_id: string
  picks: Record<string, unknown>
  score: number
  is_active: boolean
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
    bracketTitle: 'Bracket',
    bracketSubmitted: 'Bracket Submitted ✓',
    bracketChampion: 'Predicted champion',
    bracketPoints: 'Bracket points so far',
    bracketCta: 'Submit Your Bracket',
    bracketHint: 'Pick your tournament winner and bracket for bonus points',
    historyTitle: 'My Prediction History',
    emptyTitle: 'No predictions yet',
    emptyBody: 'The tournament starts June 11 — come back to make your first prediction!',
    viewMatches: 'View Upcoming Matches',
    pending: 'Pending',
    correct: 'Correct',
    wrong: 'Wrong',
    home: 'Home Win', draw: 'Draw', away: 'Away Win',
    share: 'Share My Stats',
    shareMsg: (name: string, pts: number, badge: string) =>
      `${name} has ${pts} pts on @InnoVeraAI WC2026 predictions! Football identity: ${badge} ⚽ innovera.ai`,
    loadMore: 'Load more',
    error: 'Could not load predictions. Please refresh.',
    retry: 'Retry',
  },
  KU: {
    title: 'پێشبینییەکانم',
    totalPts: 'کۆی خاڵەکان',
    streak: 'زنجیرەی دروستەکان',
    accuracy: 'تەواوی پێشبینی',
    beatAI: 'چەند جار AI مەغلوب کرد',
    identity: 'نەریتی فوتبۆڵیت',
    bracketTitle: 'براکێت',
    bracketSubmitted: 'براکێت نێردرا ✓',
    bracketChampion: 'چەمپیۆنی پێشبینیکراو',
    bracketPoints: 'خاڵی براکێت تا ئێستا',
    bracketCta: 'براکێتەکەت بنێرە',
    bracketHint: 'یاریگەری تیمی بەرز و براکێتەکەت هەڵبژێرە بۆ خاڵی زیادە',
    historyTitle: 'مێژووی پێشبینییەکانم',
    emptyTitle: 'هێشتا پێشبینی نییە',
    emptyBody: 'تورنامێنت لە ١١ی حوزەیران دەستپێدەکات — بگەڕێوە بۆ یەکەم پێشبینییەکانت!',
    viewMatches: 'یارییە داهاتووەکان ببینە',
    pending: 'چاوەڕوان',
    correct: 'دروست',
    wrong: 'هەڵە',
    home: 'ماڵ دەبەرێت', draw: 'یەکسان', away: 'میوان دەبەرێت',
    share: 'ئامارەکانم هاوبەش بکە',
    shareMsg: (name: string, pts: number, badge: string) =>
      `${name} ${pts} خاڵی لە پێشبینییەکانی @InnoVeraAI WC2026! نەریتی فوتبۆڵ: ${badge} ⚽ innovera.ai`,
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
    emoji: '⚽', nameEN: 'Beginner', nameKU: 'تازەکار',
    descEN: 'Just getting started. Make your first predictions!',
    descKU: 'تازە دەستت پێکرد. یەکەم پێشبینییەکانت بکە!',
  },
}

function computeBadge(preds: UserPrediction[]): BadgeKey {
  if (preds.length < 5) return 'BEGINNER'

  const withResults = preds.filter(p => p.actual_outcome != null)
  const correct = withResults.filter(p => p.predicted_outcome === p.actual_outcome).length
  const accuracy = withResults.length > 0 ? correct / withResults.length : 0
  const beatAi = preds.filter(p => p.beat_ai === true).length
  const draws = preds.filter(p => p.predicted_outcome === 'draw').length
  const drawRatio = preds.length > 0 ? draws / preds.length : 0

  if (withResults.length >= 10 && accuracy >= 0.7) return 'TACTICAL_GENIUS'
  if (beatAi >= 5) return 'UPSET_HUNTER'
  if (draws >= 3 && drawRatio >= 0.3) return 'DRAW_SPECIALIST'
  if (drawRatio >= 0.5) return 'RISK_TAKER'
  return 'FAVORITE_BACKER'
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
  const isCorrect = hasResult && pred.predicted_outcome === pred.actual_outcome
  const isWrong = hasResult && pred.predicted_outcome !== pred.actual_outcome
  const pts = pred.points_earned ?? 0

  const borderColor = isCorrect ? 'border-l-[#2EA043]' : isWrong ? 'border-l-[#F85149]' : 'border-l-[#F0A500]'

  return (
    <div className={`bg-[#161B22] border border-[#30363D] border-l-2 ${borderColor} rounded-xl p-4 space-y-3`}>
      {/* Teams */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg flex-shrink-0">{m?.home_team_flag ?? '🏳️'}</span>
          <span className="text-xs font-semibold text-[#E6EDF3] truncate">{m?.home_team ?? '—'}</span>
        </div>
        <span className="text-xs text-[#8B949E] flex-shrink-0 mx-2">vs</span>
        <div className="flex items-center gap-2 min-w-0 flex-row-reverse">
          <span className="text-lg flex-shrink-0">{m?.away_team_flag ?? '🏳️'}</span>
          <span className="text-xs font-semibold text-[#E6EDF3] truncate">{m?.away_team ?? '—'}</span>
        </div>
      </div>

      {/* Picks + status */}
      <div className="flex items-center justify-between text-xs gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[#8B949E]">My pick:</span>
          <span className={`px-2 py-0.5 rounded-full font-semibold ${
            isCorrect ? 'bg-[#2EA043]/20 text-[#2EA043]'
            : isWrong ? 'bg-[#F85149]/20 text-[#F85149]'
            : 'bg-[#F0A500]/15 text-[#F0A500]'
          }`}>
            <OutcomeLabel outcome={pred.predicted_outcome} lang={lang} homeTeam={m?.home_team} awayTeam={m?.away_team} />
          </span>
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
      {m?.match_date && (
        <p className="text-[10px] text-[#30363D]">
          {new Date(m.match_date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
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
  const [bracket, setBracket] = useState<UserBracket | null>(null)
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
        const [predsRes, bracketRes] = await Promise.all([
          supabase
            .from('user_predictions')
            .select('*')
            .eq('user_id', user!.id),  // created_at column does not exist — no order()
          supabase
            .from('user_brackets')
            .select('*')
            .eq('user_id', user!.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ])

        if (predsRes.error) console.error('[my-predictions] user_predictions error:', predsRes.error.message, predsRes.error.code)

        const preds = (predsRes.data ?? []) as UserPrediction[]

        // Fetch match details for each prediction
        const matchIds = preds.map(p => p.match_id).filter(Boolean)
        if (matchIds.length > 0) {
          const { data: matchRows } = await supabasePublic
            .from('matches')
            .select('match_id,home_team,away_team,match_date,home_score,away_score,status,group_name,home_team_flag,away_team_flag')
            .in('match_id', matchIds)
          const matchMap: Record<string, Match> = {}
          for (const m of matchRows ?? []) matchMap[m.match_id] = m as unknown as Match
          for (const p of preds) { if (matchMap[p.match_id]) p.match = matchMap[p.match_id] }
        }

        setPredictions(preds)
        setBracket(bracketRes.data as UserBracket | null)
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
  const correct = withResults.filter(p => p.predicted_outcome === p.actual_outcome).length
  const totalPoints = predictions.reduce((s, p) => s + (p.points_earned ?? 0), 0)
  const accuracy = withResults.length > 0 ? Math.round((correct / withResults.length) * 100) : null
  const beatAiCount = predictions.filter(p => p.beat_ai === true).length

  let streak = 0
  for (const p of predictions) {
    if (p.actual_outcome == null) continue
    if (p.predicted_outcome === p.actual_outcome) streak++
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
      await navigator.share({ title: 'Innovera Predictor', text: msg, url: 'https://innovera-wc2026-frontend.vercel.app' })
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
    link.download = 'innovera-wc2026-badge.png'
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
            title: 'My Innovera WC2026 Badge',
            text: `${displayName} — ${badge.nameEN} on Innovera WC2026 Predictor!`,
            files: [file],
          })
          return
        } catch { /* fallthrough to download */ }
      }
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = 'innovera-wc2026-badge.png'
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
                <span className="text-[10px] font-bold text-[#F0A500] tracking-widest uppercase">🏆 Innovera WC2026</span>
                <span className="text-[10px] text-[#8B949E]">innovera.ai</span>
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
                <p className="text-[9px] text-[#30363D] tracking-widest font-medium select-none">FIFA WORLD CUP 2026</p>
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

            {/* ── S4: Bracket Status ───────────────────────────────────── */}
            <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5">
              <p className="text-xs font-bold text-[#8B949E] uppercase tracking-wider mb-3">{t.bracketTitle}</p>
              {bracket ? (
                <div className="space-y-1">
                  <p className="text-sm font-bold text-[#2EA043]">{t.bracketSubmitted}</p>
                  <p className="text-xs text-[#8B949E]">{t.bracketPoints}: <span className="text-[#F0A500] font-bold">{bracket.score}</span></p>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs text-[#8B949E]">{t.bracketHint}</p>
                  <Link
                    href="/explore?tab=bracket"
                    className="flex-shrink-0 text-xs font-bold text-[#0D1117] bg-[#F0A500] hover:bg-[#D4920A] px-3 py-2 rounded-lg transition-colors"
                  >
                    {t.bracketCta}
                  </Link>
                </div>
              )}
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
                          <PredCard pred={pred} lang={language} />
                          <button
                            onClick={() => setExpandedCardId(expandedCardId === pred.id ? null : pred.id)}
                            title={expandedCardId === pred.id ? 'Close card' : 'Download prediction card'}
                            className="absolute top-2 right-2 text-[10px] font-bold text-[#0D1117] bg-[#F0A500] hover:bg-[#D4920A] px-1.5 py-0.5 rounded-full transition-colors leading-none"
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
                                  pred.predicted_outcome === 'home' ? `${pred.match.home_team} Win`
                                  : pred.predicted_outcome === 'away' ? `${pred.match.away_team} Win`
                                  : 'Draw'
                                }
                                userCorrect={pred.actual_outcome != null ? pred.predicted_outcome === pred.actual_outcome : undefined}
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
                                matchDate={pred.match.match_date ? new Date(pred.match.match_date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) : undefined}
                                group={pred.match.group_name ?? undefined}
                                homeWinProb={pred.match.home_win_probability ?? 33}
                                drawProb={pred.match.draw_probability ?? 34}
                                awayWinProb={pred.match.away_win_probability ?? 33}
                                userPrediction={
                                  pred.predicted_outcome === 'home' ? `${pred.match.home_team} Win`
                                  : pred.predicted_outcome === 'away' ? `${pred.match.away_team} Win`
                                  : 'Draw'
                                }
                                userScore={
                                  pred.predicted_home_score != null && pred.predicted_away_score != null
                                    ? `${pred.predicted_home_score} — ${pred.predicted_away_score}` : undefined
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
