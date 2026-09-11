'use client'

import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import { useLanguage } from '@/hooks/useLanguage'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { API_BASE } from '@/lib/api'
import { localizeNum } from '@/lib/numbers'

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserProfile {
  user_id: string
  username: string
  total_points: number
  weekly_points: number
  beat_ai_count: number
  prediction_streak: number
  correct_predictions: number
  total_predictions: number
}

type Tab = 'weekly' | 'total'

// ── Labels ────────────────────────────────────────────────────────────────────

const labels = {
  EN: {
    title: 'Leaderboard',
    subtitle: 'Top predictors competing against AI · Premier League 2026-27',
    weekly: 'This Week',
    total: 'Tournament Total',
    rank: 'Rank',
    player: 'Player',
    points: 'Points',
    streak: 'Streak',
    beatAI: 'Beat AI',
    you: 'You',
    shareRank: 'Share My Rank',
    shareLoading: 'Generating…',
    shareCopied: 'Copied!',
    myRank: 'Your Ranking',
    loading: 'Loading leaderboard…',
    noData: 'No predictions submitted yet — be the first!',
    loginPrompt: 'Login to track your rank and compete on the leaderboard',
    loginBtn: 'Login',
    outside50: (rank: number) => `You are ranked #${rank} overall`,
    top3Labels: ['🥇', '🥈', '🥉'],
  },
  KU: {
    title: 'پلەبەندی',
    subtitle: 'باشترین پێشبینیکەران دژ بە AI · پرێمیەر لیگ ٢٠٢٦-٢٧',
    weekly: 'ئەم هەفتەیە',
    total: 'کۆی پاڵەوانەتییەکە',
    rank: 'پلە',
    player: 'یاریزان',
    points: 'خاڵ',
    streak: 'زنجیرە',
    beatAI: 'دژ بە AI',
    you: 'تۆ',
    shareRank: 'پلەکەم بەشبکە',
    shareLoading: 'ئامادەکردن…',
    shareCopied: 'کۆپیکرا!',
    myRank: 'پلەی تۆ',
    loading: 'پلەبەندی بارکردن…',
    noData: 'هێشتا پێشبینی نەنێردراوە — یەکەمین بە!',
    loginPrompt: 'بچە ژوورەوە بۆ بینینی پلەکەت و بەشداربوون لە پلەبەندی',
    loginBtn: 'چوونەژوورەوە',
    outside50: (rank: number) => `تۆ لە پلەی #${rank} ی گشتیدایی`,
    top3Labels: ['🥇', '🥈', '🥉'],
  },
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Avatar({
  url,
  name,
  size = 'sm',
}: {
  url?: string | null
  name: string
  size?: 'sm' | 'md'
}) {
  const dim = size === 'md' ? 'h-10 w-10 text-sm' : 'h-8 w-8 text-xs'
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className={`${dim} rounded-full object-cover flex-shrink-0`}
      />
    )
  }
  return (
    <div
      className={`${dim} rounded-full bg-[#F0A500]/20 border border-[#F0A500]/40 flex items-center justify-center flex-shrink-0`}
    >
      <span className="font-bold text-[#F0A500]">{name[0]?.toUpperCase() ?? 'U'}</span>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const { language, changeLanguage } = useLanguage()
  const [activeTab, setActiveTab] = useState<Tab>('weekly')
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [shareState, setShareState] = useState<'idle' | 'loading' | 'copied'>('idle')

  const { user, openAuthModal } = useAuth()
  const t = labels[language]
  const n = (v: string | number) => localizeNum(v, language)

  // Fetch top 50 + current user's profile
  const ENABLE_LEADERBOARD = true

  useEffect(() => {
    if (!ENABLE_LEADERBOARD) {
      setProfiles([])
      setLoading(false)
      return
    }

    const lastFetch = { at: 0 }
    async function fetchData() {
      lastFetch.at = Date.now()
      setLoading(true)
      try {
        const orderCol = activeTab === 'weekly' ? 'weekly_points' : 'total_points'

        const [topRes, myRes] = await Promise.all([
          supabase
            .from('user_profiles')
            .select('user_id,username,total_points,weekly_points,beat_ai_count,prediction_streak,correct_predictions,total_predictions')
            .order(orderCol, { ascending: false })
            .limit(50),
          user
            ? supabase
                .from('user_profiles')
                .select('user_id,username,total_points,weekly_points,beat_ai_count,prediction_streak,correct_predictions,total_predictions')
                .eq('user_id', user.id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
        ])

        if (topRes.data) setProfiles(topRes.data as UserProfile[])
        if (myRes.data) setUserProfile(myRes.data as UserProfile)
      } catch (err) {
        console.error('[leaderboard] fetch error:', err)
      } finally {
        setLoading(false)
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user])

  // Share rank using native share or clipboard fallback
  const handleShare = async () => {
    if (!userProfile) return
    setShareState('loading')

    const sortedProfiles = [...profiles].sort((a, b) => {
      const col = activeTab === 'weekly' ? 'weekly_points' : 'total_points'
      return b[col] - a[col]
    })
    const rank = sortedProfiles.findIndex((p) => p.user_id === userProfile.user_id) + 1
    const pts = activeTab === 'weekly' ? userProfile.weekly_points : userProfile.total_points
    const text = `I'm #${rank > 0 ? rank : '?'} on the Ennovera Premier League Leaderboard with ${pts} points! 🏆 Can you beat me? Ennovera`

    try {
      // Try API rank-card first
      const apiUrl = API_BASE
      const res = await fetch(`${apiUrl}/rank-card?user_id=${userProfile.user_id}&rank=${rank}&points=${pts}`)
      if (res.ok) {
        const data = await res.json()
        const shareUrl = data.url ?? data.download_url
        if (shareUrl && navigator.share) {
          await navigator.share({ title: 'My Ennovera Rank', url: shareUrl, text })
          setShareState('idle')
          return
        }
      }
    } catch {
      // fall through to clipboard
    }

    // Clipboard fallback
    try {
      if (navigator.share) {
        await navigator.share({ title: 'My Ennovera Rank', text })
      } else {
        await navigator.clipboard.writeText(text)
        setShareState('copied')
        setTimeout(() => setShareState('idle'), 2500)
        return
      }
    } catch {
      // ignore
    }
    setShareState('idle')
  }

  const sortedProfiles = [...profiles].sort((a, b) => {
    const col = activeTab === 'weekly' ? 'weekly_points' : 'total_points'
    return b[col] - a[col]
  })

  const userRank = userProfile
    ? sortedProfiles.findIndex((p) => p.user_id === userProfile.user_id) + 1
    : 0
  const userInTop50 = userRank > 0
  const displayPts = (p: UserProfile) =>
    activeTab === 'weekly' ? p.weekly_points : p.total_points

  return (
    <div className="min-h-screen bg-[#0D1117]">
      <Navbar language={language} onLanguageChange={changeLanguage} />

      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-8">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏆</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#E6EDF3]">{t.title}</h1>
          </div>
          <p className="text-sm text-[#8B949E]">{t.subtitle}</p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-[#161B22] border border-[#30363D] p-1 rounded-xl w-fit">
          {(['weekly', 'total'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === tab
                  ? 'bg-[#F0A500] text-[#0D1117]'
                  : 'text-[#8B949E] hover:text-[#E6EDF3]'
              }`}
            >
              {tab === 'weekly' ? t.weekly : t.total}
            </button>
          ))}
        </div>

        {/* Test-mode notice */}
        <div className="bg-[#58A6FF]/10 border border-[#58A6FF]/30 rounded-xl px-4 py-3">
          <p className="text-sm text-[#58A6FF]">
            {language === 'KU'
              ? '🧪 دۆخی تاقیکردنەوە — خاڵەکان بۆ تاقیکردنەوە تۆمار دەکرێن.'
              : '🧪 Test Mode — Points are being tracked for testing and may be reset for fair play.'}
          </p>
        </div>

        {/* Login prompt (non-blocking) */}
        {!user && (
          <div className="flex items-center justify-between bg-[#F0A500]/5 border border-[#F0A500]/20 rounded-xl px-4 py-3">
            <p className="text-sm text-[#F0A500]">{t.loginPrompt}</p>
            <button
              onClick={() => openAuthModal(language)}
              className="text-xs font-bold text-[#0D1117] bg-[#F0A500] hover:bg-[#D4920A] px-3 py-1.5 rounded-lg transition-colors flex-shrink-0 ml-3"
            >
              {t.loginBtn}
            </button>
          </div>
        )}

        {/* My rank + share (when logged in) */}
        {user && userProfile && (
          <div className="bg-[#161B22] border border-[#F0A500]/30 rounded-xl p-4 flex items-center gap-4">
            <Avatar name={userProfile.username} size="md" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#8B949E]">{t.myRank}</p>
              <p className="text-base font-bold text-[#E6EDF3] break-words">{userProfile.username}</p>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-sm font-bold text-[#F0A500]">
                  {userInTop50 ? `#${n(userRank)}` : t.outside50(userRank || 51)}
                </span>
                <span className="text-xs text-[#8B949E]">
                  {n(displayPts(userProfile))} {t.points}
                </span>
              </div>
            </div>
            <button
              onClick={handleShare}
              disabled={shareState === 'loading'}
              className="flex-shrink-0 flex items-center gap-1.5 bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-[#E6EDF3] text-xs font-semibold px-3 py-2 rounded-lg transition-colors disabled:opacity-60"
            >
              <span>📤</span>
              {shareState === 'loading'
                ? t.shareLoading
                : shareState === 'copied'
                ? t.shareCopied
                : t.shareRank}
            </button>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-14 rounded-xl bg-[#161B22] border border-[#30363D] animate-pulse"
              />
            ))}
          </div>
        ) : sortedProfiles.length === 0 ? (
          <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-12 text-center">
            <span className="text-4xl">🏆</span>
            <p className="mt-3 text-[#8B949E]">{t.noData}</p>
          </div>
        ) : (
          <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
            {/* Column headers */}
            <div className="grid grid-cols-[2.5rem_1fr_4.5rem] sm:grid-cols-[3rem_1fr_5rem_4rem_4rem] gap-2 px-4 py-2.5 border-b border-[#30363D] text-[10px] font-bold text-[#8B949E] uppercase tracking-wider">
              <div className="text-center">{t.rank}</div>
              <div>{t.player}</div>
              <div className="text-center">{t.points}</div>
              <div className="hidden sm:block text-center">{t.streak}</div>
              <div className="hidden sm:block text-center">{t.beatAI}</div>
            </div>

            {sortedProfiles.map((profile, index) => {
              const rank = index + 1
              const isCurrentUser = profile.user_id === user?.id
              const medal = t.top3Labels[index]

              return (
                <div
                  key={profile.user_id}
                  className={`grid grid-cols-[2.5rem_1fr_4.5rem] sm:grid-cols-[3rem_1fr_5rem_4rem_4rem] gap-2 px-4 py-3 items-center border-b border-[#30363D]/50 transition-colors ${
                    isCurrentUser
                      ? 'bg-[#F0A500]/8 border-l-2 border-l-[#F0A500]'
                      : 'hover:bg-[#0D1117]/40'
                  }`}
                >
                  {/* Rank */}
                  <div className="text-center">
                    {medal ? (
                      <span className="text-lg">{medal}</span>
                    ) : (
                      <span
                        className={`text-sm font-bold tabular-nums ${
                          isCurrentUser ? 'text-[#F0A500]' : 'text-[#8B949E]'
                        }`}
                      >
                        {n(rank)}
                      </span>
                    )}
                  </div>

                  {/* Player */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar name={profile.username} />
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-semibold break-words ${
                          isCurrentUser ? 'text-[#F0A500]' : 'text-[#E6EDF3]'
                        }`}
                      >
                        {profile.username}
                      </p>
                      {isCurrentUser && (
                        <span className="text-[10px] text-[#F0A500] font-bold">{t.you}</span>
                      )}
                    </div>
                  </div>

                  {/* Points */}
                  <div className="text-center">
                    <span
                      className={`text-sm font-extrabold tabular-nums ${
                        isCurrentUser ? 'text-[#F0A500]' : 'text-[#E6EDF3]'
                      }`}
                    >
                      {n(displayPts(profile).toLocaleString())}
                    </span>
                  </div>

                  {/* Streak */}
                  <div className="hidden sm:block text-center">
                    <span className="text-xs text-[#8B949E] font-medium">
                      {profile.prediction_streak > 0 ? `🔥 ${n(profile.prediction_streak)}` : n(profile.prediction_streak)}
                    </span>
                  </div>

                  {/* Beat AI */}
                  <div className="hidden sm:block text-center">
                    <span className="text-xs text-[#58A6FF] font-medium">
                      {n(profile.beat_ai_count)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* User outside top 50 */}
        {user && userProfile && !userInTop50 && !loading && (
          <div className="bg-[#161B22] border border-[#30363D] rounded-xl px-4 py-3">
            <div className="grid grid-cols-[2.5rem_1fr_4.5rem] sm:grid-cols-[3rem_1fr_5rem_4rem_4rem] gap-2 items-center text-[#8B949E]">
              <div className="text-center text-sm font-bold">…</div>
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar name={userProfile.username} />
                <span className="text-sm font-semibold text-[#F0A500] break-words min-w-0">
                  {userProfile.username}
                </span>
              </div>
              <div className="text-center text-sm font-extrabold text-[#F0A500] tabular-nums">
                {n(displayPts(userProfile).toLocaleString())}
              </div>
              <div className="hidden sm:block text-center text-xs">
                {userProfile.prediction_streak > 0 ? `🔥 ${n(userProfile.prediction_streak)}` : n(userProfile.prediction_streak)}
              </div>
              <div className="hidden sm:block text-center text-xs text-[#58A6FF]">{n(userProfile.beat_ai_count)}</div>
            </div>
          </div>
        )}

        {/* Footer watermark */}
        <p className="text-center text-[10px] text-[#30363D] tracking-widest">Ennovera</p>
      </main>
    </div>
  )
}
