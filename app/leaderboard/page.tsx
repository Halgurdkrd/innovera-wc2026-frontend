'use client'

import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import { useLanguage } from '@/hooks/useLanguage'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { API_BASE } from '@/lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserProfile {
  id: string
  username: string
  avatar_url?: string | null
  total_points: number
  weekly_points: number
  beat_ai_count: number
  streak: number
}

type Tab = 'weekly' | 'total'

// ── Labels ────────────────────────────────────────────────────────────────────

const labels = {
  EN: {
    title: 'Leaderboard',
    subtitle: 'Top predictors competing against AI · FIFA World Cup 2026',
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
    subtitle: 'باشترین پێشبینیکەران دژ بە AI · جامی جیهانی FIFA ٢٠٢٦',
    weekly: 'ئەم هەفتەیە',
    total: 'کۆی تورنووان',
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

  // Fetch top 50 + current user's profile
  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const orderCol = activeTab === 'weekly' ? 'weekly_points' : 'total_points'

        const [topRes, myRes] = await Promise.all([
          supabase
            .from('user_profiles')
            .select('id,username,avatar_url,total_points,weekly_points,beat_ai_count,streak')
            .order(orderCol, { ascending: false })
            .limit(50),
          user
            ? supabase
                .from('user_profiles')
                .select('id,username,avatar_url,total_points,weekly_points,beat_ai_count,streak')
                .eq('id', user.id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
        ])

        if (topRes.data) setProfiles(topRes.data as UserProfile[])
        if (myRes.data) setUserProfile(myRes.data as UserProfile)
      } catch { /* network error — show empty leaderboard */ }
      setLoading(false)
    }
    fetchData()
  }, [activeTab, user])

  // Share rank using native share or clipboard fallback
  const handleShare = async () => {
    if (!userProfile) return
    setShareState('loading')

    const sortedProfiles = [...profiles].sort((a, b) => {
      const col = activeTab === 'weekly' ? 'weekly_points' : 'total_points'
      return b[col] - a[col]
    })
    const rank = sortedProfiles.findIndex((p) => p.id === userProfile.id) + 1
    const pts = activeTab === 'weekly' ? userProfile.weekly_points : userProfile.total_points
    const text = `I'm #${rank > 0 ? rank : '?'} on the Innovera WC2026 Leaderboard with ${pts} points! 🏆 Can you beat me? innovera.ai`

    try {
      // Try API rank-card first
      const apiUrl = API_BASE
      const res = await fetch(`${apiUrl}/rank-card?user_id=${userProfile.id}&rank=${rank}&points=${pts}`)
      if (res.ok) {
        const data = await res.json()
        const shareUrl = data.url ?? data.download_url
        if (shareUrl && navigator.share) {
          await navigator.share({ title: 'My Innovera Rank', url: shareUrl, text })
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
        await navigator.share({ title: 'My Innovera Rank', text })
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
    ? sortedProfiles.findIndex((p) => p.id === userProfile.id) + 1
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
            <Avatar url={userProfile.avatar_url} name={userProfile.username} size="md" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#8B949E]">{t.myRank}</p>
              <p className="text-base font-bold text-[#E6EDF3] truncate">{userProfile.username}</p>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-sm font-bold text-[#F0A500]">
                  {userInTop50 ? `#${userRank}` : t.outside50(userRank || 51)}
                </span>
                <span className="text-xs text-[#8B949E]">
                  {displayPts(userProfile)} {t.points}
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
            <div className="grid grid-cols-[3rem_1fr_5rem_4rem_4rem] gap-2 px-4 py-2.5 border-b border-[#30363D] text-[10px] font-bold text-[#8B949E] uppercase tracking-wider">
              <div className="text-center">{t.rank}</div>
              <div>{t.player}</div>
              <div className="text-center">{t.points}</div>
              <div className="text-center">{t.streak}</div>
              <div className="text-center">{t.beatAI}</div>
            </div>

            {sortedProfiles.map((profile, index) => {
              const rank = index + 1
              const isCurrentUser = profile.id === user?.id
              const medal = t.top3Labels[index]

              return (
                <div
                  key={profile.id}
                  className={`grid grid-cols-[3rem_1fr_5rem_4rem_4rem] gap-2 px-4 py-3 items-center border-b border-[#30363D]/50 transition-colors ${
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
                        {rank}
                      </span>
                    )}
                  </div>

                  {/* Player */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar url={profile.avatar_url} name={profile.username} />
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-semibold truncate ${
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
                      {displayPts(profile).toLocaleString()}
                    </span>
                  </div>

                  {/* Streak */}
                  <div className="text-center">
                    <span className="text-xs text-[#8B949E] font-medium">
                      {profile.streak > 0 ? `🔥 ${profile.streak}` : `${profile.streak}`}
                    </span>
                  </div>

                  {/* Beat AI */}
                  <div className="text-center">
                    <span className="text-xs text-[#58A6FF] font-medium">
                      {profile.beat_ai_count}
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
            <div className="grid grid-cols-[3rem_1fr_5rem_4rem_4rem] gap-2 items-center text-[#8B949E]">
              <div className="text-center text-sm font-bold">…</div>
              <div className="flex items-center gap-2.5">
                <Avatar url={userProfile.avatar_url} name={userProfile.username} />
                <span className="text-sm font-semibold text-[#F0A500] truncate">
                  {userProfile.username}
                </span>
              </div>
              <div className="text-center text-sm font-extrabold text-[#F0A500] tabular-nums">
                {displayPts(userProfile).toLocaleString()}
              </div>
              <div className="text-center text-xs">
                {userProfile.streak > 0 ? `🔥 ${userProfile.streak}` : `${userProfile.streak}`}
              </div>
              <div className="text-center text-xs text-[#58A6FF]">{userProfile.beat_ai_count}</div>
            </div>
          </div>
        )}

        {/* Footer watermark */}
        <p className="text-center text-[10px] text-[#30363D] tracking-widest">innovera.ai</p>
      </main>
    </div>
  )
}
