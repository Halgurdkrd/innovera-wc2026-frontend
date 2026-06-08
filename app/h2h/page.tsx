'use client'

import { useEffect, useState, useMemo } from 'react'
import Navbar from '@/components/Navbar'
import { useLanguage } from '@/hooks/useLanguage'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { API_BASE } from '@/lib/api'
import { Sk } from '@/components/SkeletonCard'

// ── Types ──────────────────────────────────────────────────────────────────────

interface TeamStats {
  team: string
  win_probability: number
  strength_tier: number
  avg_goals_scored?: number
  avg_goals_conceded?: number
  group?: string
}

interface MyPick {
  team: string
  picked_at: string
}

interface LeaderboardEntry {
  team: string
  pick_count: number
  percentage: number
}

type View = 'pick' | 'picked' | 'leaderboard'
type TierFilter = 'all' | '1' | '2' | '3'

// ── Static data ────────────────────────────────────────────────────────────────

const GROUPS: Record<string, string[]> = {
  A: ['Mexico', 'South Korea', 'South Africa', 'Czech Republic'],
  B: ['Canada', 'Switzerland', 'Qatar', 'Bosnia-Herzegovina'],
  C: ['Brazil', 'Morocco', 'Scotland', 'Haiti'],
  D: ['USA', 'Paraguay', 'Australia', 'Turkey'],
  E: ['Germany', 'Curaçao', "Côte d'Ivoire", 'Ecuador'],
  F: ['Netherlands', 'Japan', 'Tunisia', 'Sweden'],
  G: ['Belgium', 'Egypt', 'Iran', 'New Zealand'],
  H: ['Spain', 'Cabo Verde', 'Saudi Arabia', 'Uruguay'],
  I: ['France', 'Senegal', 'Norway', 'Iraq'],
  J: ['Argentina', 'Algeria', 'Austria', 'Jordan'],
  K: ['Portugal', 'Colombia', 'Uzbekistan', 'Congo DR'],
  L: ['England', 'Croatia', 'Ghana', 'Panama'],
}

const FLAGS: Record<string, string> = {
  Mexico: '🇲🇽', 'South Korea': '🇰🇷', 'South Africa': '🇿🇦', 'Czech Republic': '🇨🇿',
  Canada: '🇨🇦', Switzerland: '🇨🇭', Qatar: '🇶🇦', 'Bosnia-Herzegovina': '🇧🇦',
  Brazil: '🇧🇷', Morocco: '🇲🇦', Scotland: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', Haiti: '🇭🇹',
  USA: '🇺🇸', Paraguay: '🇵🇾', Australia: '🇦🇺', Turkey: '🇹🇷',
  Germany: '🇩🇪', 'Curaçao': '🇨🇼', "Côte d'Ivoire": '🇨🇮', Ecuador: '🇪🇨',
  Netherlands: '🇳🇱', Japan: '🇯🇵', Tunisia: '🇹🇳', Sweden: '🇸🇪',
  Belgium: '🇧🇪', Egypt: '🇪🇬', Iran: '🇮🇷', 'New Zealand': '🇳🇿',
  Spain: '🇪🇸', 'Cabo Verde': '🇨🇻', 'Saudi Arabia': '🇸🇦', Uruguay: '🇺🇾',
  France: '🇫🇷', Senegal: '🇸🇳', Norway: '🇳🇴', Iraq: '🇮🇶',
  Argentina: '🇦🇷', Algeria: '🇩🇿', Austria: '🇦🇹', Jordan: '🇯🇴',
  Portugal: '🇵🇹', Colombia: '🇨🇴', Uzbekistan: '🇺🇿', 'Congo DR': '🇨🇩',
  England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', Croatia: '🇭🇷', Ghana: '🇬🇭', Panama: '🇵🇦',
}

const TIER_1 = new Set(['France', 'Brazil', 'England', 'Spain', 'Argentina', 'Germany', 'Portugal'])
const TIER_2 = new Set(['Netherlands', 'Belgium', 'Croatia', 'USA', 'Mexico', 'South Korea', 'Japan', 'Morocco', 'Colombia', 'Uruguay', 'Switzerland', 'Canada'])

function teamTier(team: string): number {
  if (TIER_1.has(team)) return 1
  if (TIER_2.has(team)) return 2
  return 3
}

function teamGroup(team: string): string {
  for (const [g, teams] of Object.entries(GROUPS)) {
    if (teams.includes(team)) return g
  }
  return '?'
}

// ── Labels ─────────────────────────────────────────────────────────────────────

const L = {
  EN: {
    pageTitle: 'H2H Team Picker',
    pageSub: 'Pick the team you think will win the World Cup',
    pickHeading: 'Choose Your Team',
    pickSub: 'One pick only — choose wisely',
    filterAll: 'All',
    filterElite: 'Elite',
    filterContenders: 'Contenders',
    filterUnderdogs: 'Underdogs',
    search: 'Search team…',
    groupLabel: 'Group',
    tierLabel: (t: number) => t === 1 ? '⭐ Elite' : t === 2 ? '🔥 Contender' : '💪 Underdog',
    confirm: 'Confirm Pick',
    pickBtn: 'Pick this team',
    cancel: 'Cancel',
    confirmTitle: (team: string) => `Confirm: ${FLAGS[team] ?? ''} ${team}?`,
    confirmSub: 'You can\'t change your pick later.',
    confirmYes: 'Yes, lock it in',
    picking: 'Locking…',
    pickedHeading: 'Your Pick',
    pickedAt: 'Picked on',
    viewLeaderboard: 'View Leaderboard',
    backToPick: 'Back',
    lbHeading: 'Pick Leaderboard',
    lbSub: 'See which teams other fans are backing',
    lbTeam: 'Team',
    lbPicks: 'Picks',
    lbPct: '%',
    yourPick: 'Your pick',
    winProb: 'Win probability',
    notLoggedIn: 'Sign in to make your pick',
    signIn: 'Sign In',
    loading: 'Loading…',
    error: 'Something went wrong. Please try again.',
    alreadyPicked: 'You already made your pick!',
    stats: 'Team Stats',
    group: 'Group',
  },
  KU: {
    pageTitle: 'هەڵبژاردنی تیم',
    pageSub: 'تیمێک هەڵبژێرە کە فیکر دەکەی قازانجی جامی جیهانی دەبات',
    pickHeading: 'تیمەکەت هەڵبژێرە',
    pickSub: 'تەنها یەک هەڵبژاردن — بە وریایی هەڵبژێرە',
    filterAll: 'هەموو',
    filterElite: 'یەکەم دەرجە',
    filterContenders: 'بەرژەوەندان',
    filterUnderdogs: 'قەڵەمێکان',
    search: 'گەڕانی تیم…',
    groupLabel: 'گروپ',
    tierLabel: (t: number) => t === 1 ? '⭐ یەکەم دەرجە' : t === 2 ? '🔥 بەرژەوەند' : '💪 قەڵەمێ',
    confirm: 'دڵنیاکردنەوە',
    pickBtn: 'ئەم تیمە هەڵبژێرە',
    cancel: 'هەڵوەشاندنەوە',
    confirmTitle: (team: string) => `دڵنیای؟: ${FLAGS[team] ?? ''} ${team}`,
    confirmSub: 'دواتر ناتوانیت هەڵبژاردنەکەت بگۆڕیت.',
    confirmYes: 'بەڵێ، دابنێ',
    picking: 'تۆمارکردن…',
    pickedHeading: 'هەڵبژاردنەکەت',
    pickedAt: 'کاتی هەڵبژاردن',
    viewLeaderboard: 'بینینی کەڤڵ',
    backToPick: 'گەڕانەوە',
    lbHeading: 'کەڤڵی هەڵبژاردن',
    lbSub: 'ببینە چ تیمانە پشتیوانیان لەگەڵ دایە',
    lbTeam: 'تیم',
    lbPicks: 'هەڵبژاردن',
    lbPct: '%',
    yourPick: 'هەڵبژاردنی تۆ',
    winProb: 'ئەگەری بردن',
    notLoggedIn: 'داخڵ بوو بۆ هەڵبژاردن',
    signIn: 'داخڵ بوو',
    loading: 'چاوەڕێ بکە…',
    error: 'هەڵەیەک روویدا. تکایە دووبارە هەوڵ بدە.',
    alreadyPicked: 'تۆ پێشتر هەڵبژاردنت کردووە!',
    stats: 'ئامارەکانی تیم',
    group: 'گروپ',
  },
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function H2HPage() {
  const { language, changeLanguage } = useLanguage()
  const { user, loading: authLoading, openAuthModal } = useAuth()
  const t = L[language]

  const [view, setView] = useState<View>('pick')
  const [tierFilter, setTierFilter] = useState<TierFilter>('all')
  const [search, setSearch] = useState('')
  const [confirming, setConfirming] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [myPick, setMyPick] = useState<MyPick | null>(null)
  const [teamStats, setTeamStats] = useState<TeamStats[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState('')

  // ── Load initial data ────────────────────────────────────────────────────────

  useEffect(() => {
    if (authLoading) return
    loadData()
  }, [authLoading, user])

  async function loadData() {
    setDataLoading(true)
    setError('')
    try {
      const headers: Record<string, string> = {}
      if (user) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`
        }
      }

      const [statsRes, lbRes, pickRes] = await Promise.all([
        fetch(`${API_BASE}/h2h/team-stats`),
        fetch(`${API_BASE}/h2h/leaderboard`),
        user ? fetch(`${API_BASE}/h2h/my-pick`, { headers }) : Promise.resolve(null),
      ])

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setTeamStats(Array.isArray(statsData) ? statsData : (statsData.teams ?? []))
      }

      if (lbRes.ok) {
        const lbData = await lbRes.json()
        setLeaderboard(Array.isArray(lbData) ? lbData : (lbData.leaderboard ?? lbData.picks ?? []))
      }

      if (pickRes && pickRes.ok) {
        const pickData = await pickRes.json()
        const pick = pickData.pick ?? pickData
        if (pick?.team) {
          setMyPick(pick)
          setView('picked')
        }
      }
    } catch {
      setError(t.error)
    } finally {
      setDataLoading(false)
    }
  }

  // ── Submit pick ──────────────────────────────────────────────────────────────

  async function submitPick(team: string) {
    if (!user) return
    setSubmitting(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${API_BASE}/h2h/pick`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ team }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.detail ?? errData.message ?? res.statusText)
      }
      const data = await res.json()
      setMyPick({ team, picked_at: data.picked_at ?? new Date().toISOString() })
      setConfirming(null)
      setView('picked')
      await loadData()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t.error)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Derived data ─────────────────────────────────────────────────────────────

  const statsMap = useMemo(() => {
    const m: Record<string, TeamStats> = {}
    teamStats.forEach(s => { m[s.team] = s })
    return m
  }, [teamStats])

  const filteredTeams = useMemo(() => {
    const q = search.toLowerCase()
    return Object.entries(GROUPS).reduce<Record<string, string[]>>((acc, [group, teams]) => {
      const filtered = teams.filter(team => {
        if (q && !team.toLowerCase().includes(q)) return false
        if (tierFilter === '1') return TIER_1.has(team)
        if (tierFilter === '2') return TIER_2.has(team)
        if (tierFilter === '3') return !TIER_1.has(team) && !TIER_2.has(team)
        return true
      })
      if (filtered.length) acc[group] = filtered
      return acc
    }, {})
  }, [search, tierFilter])

  const myPickStats = myPick ? statsMap[myPick.team] : null
  const myLbEntry = leaderboard.find(e => e.team === myPick?.team)

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0D1117] text-[#E6EDF3]">
      <Navbar language={language} onLanguageChange={changeLanguage} />

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#E6EDF3]">{t.pageTitle}</h1>
          <p className="mt-1 text-sm text-[#8B949E]">{t.pageSub}</p>
        </div>

        {/* Auth gate */}
        {!authLoading && !user && (
          <div className="mb-6 flex items-center justify-between rounded-xl border border-[#F0A500]/30 bg-[#F0A500]/10 px-4 py-3">
            <span className="text-sm text-[#E6EDF3]">{t.notLoggedIn}</span>
            <button
              onClick={() => openAuthModal(language)}
              className="rounded-lg bg-[#F0A500] px-4 py-1.5 text-sm font-semibold text-[#0D1117] hover:bg-[#D4920A] transition-colors"
            >
              {t.signIn}
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg border border-[#F85149]/30 bg-[#F85149]/10 px-4 py-3 text-sm text-[#F85149]">
            {error}
          </div>
        )}

        {/* Main loading skeleton */}
        {(authLoading || dataLoading) && (
          <div className="space-y-3">
            <Sk className="h-10 w-full" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <Sk key={i} className="h-14 w-full" />
              ))}
            </div>
          </div>
        )}

        {/* ── View: pick (no pick yet) ── */}
        {!authLoading && !dataLoading && view === 'pick' && (
          <>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#E6EDF3]">{t.pickHeading}</h2>
                <p className="text-xs text-[#8B949E]">{t.pickSub}</p>
              </div>

              {/* Leaderboard toggle */}
              <button
                onClick={() => setView('leaderboard')}
                className="self-start sm:self-auto rounded-lg border border-[#30363D] bg-[#161B22] px-3 py-1.5 text-xs font-medium text-[#8B949E] hover:text-[#E6EDF3] transition-colors"
              >
                {t.viewLeaderboard}
              </button>
            </div>

            {/* Search + tier filter */}
            <div className="mb-4 flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t.search}
                className="flex-1 rounded-lg border border-[#30363D] bg-[#161B22] px-3 py-2 text-sm text-[#E6EDF3] placeholder-[#8B949E] focus:border-[#F0A500]/50 focus:outline-none"
              />
              <div className="flex gap-1">
                {(['all', '1', '2', '3'] as TierFilter[]).map(tier => {
                  const label = tier === 'all' ? t.filterAll : tier === '1' ? t.filterElite : tier === '2' ? t.filterContenders : t.filterUnderdogs
                  return (
                    <button
                      key={tier}
                      onClick={() => setTierFilter(tier)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                        tierFilter === tier
                          ? 'bg-[#F0A500] text-[#0D1117]'
                          : 'border border-[#30363D] bg-[#161B22] text-[#8B949E] hover:text-[#E6EDF3]'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Teams grid by group */}
            <div className="space-y-4">
              {Object.entries(filteredTeams).map(([group, teams]) => (
                <div key={group}>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded bg-[#21262D] px-2 py-0.5 text-xs font-bold text-[#8B949E]">
                      {t.groupLabel} {group}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                    {teams.map(team => {
                      const tier = teamTier(team)
                      const stats = statsMap[team]
                      return (
                        <button
                          key={team}
                          onClick={() => user ? setConfirming(team) : openAuthModal(language)}
                          className="flex items-center gap-2.5 rounded-xl border border-[#30363D] bg-[#161B22] px-3 py-2.5 text-left hover:border-[#F0A500]/50 hover:bg-[#21262D] transition-all group"
                        >
                          <span className="text-2xl flex-shrink-0">{FLAGS[team] ?? '🏳️'}</span>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-[#E6EDF3] group-hover:text-[#F0A500] transition-colors">
                              {team}
                            </p>
                            <p className="text-[10px] text-[#8B949E]">
                              {t.tierLabel(tier)}
                              {stats?.win_probability ? ` · ${(stats.win_probability * 100).toFixed(1)}%` : ''}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── View: picked ── */}
        {!authLoading && !dataLoading && view === 'picked' && myPick && (
          <div className="space-y-4">
            {/* Your pick card */}
            <div className="rounded-2xl border border-[#F0A500]/40 bg-gradient-to-br from-[#F0A500]/10 to-[#161B22] p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#F0A500]">
                {t.pickedHeading}
              </p>
              <div className="flex items-center gap-4">
                <span className="text-5xl">{FLAGS[myPick.team] ?? '🏳️'}</span>
                <div>
                  <h2 className="text-2xl font-bold text-[#E6EDF3]">{myPick.team}</h2>
                  <p className="text-xs text-[#8B949E]">
                    {t.groupLabel} {teamGroup(myPick.team)} · {t.tierLabel(teamTier(myPick.team))}
                  </p>
                  {myPick.picked_at && (
                    <p className="mt-0.5 text-[10px] text-[#8B949E]">
                      {t.pickedAt}: {new Date(myPick.picked_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              {/* Stats row */}
              {myPickStats && (
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {myPickStats.win_probability != null && (
                    <div className="rounded-lg bg-[#0D1117]/50 px-3 py-2">
                      <p className="text-[10px] text-[#8B949E]">{t.winProb}</p>
                      <p className="text-sm font-bold text-[#F0A500]">
                        {(myPickStats.win_probability * 100).toFixed(1)}%
                      </p>
                    </div>
                  )}
                  {myPickStats.avg_goals_scored != null && (
                    <div className="rounded-lg bg-[#0D1117]/50 px-3 py-2">
                      <p className="text-[10px] text-[#8B949E]">Avg Goals</p>
                      <p className="text-sm font-bold text-[#E6EDF3]">
                        {myPickStats.avg_goals_scored.toFixed(2)}
                      </p>
                    </div>
                  )}
                  {myLbEntry && (
                    <div className="rounded-lg bg-[#0D1117]/50 px-3 py-2">
                      <p className="text-[10px] text-[#8B949E]">Fan picks</p>
                      <p className="text-sm font-bold text-[#E6EDF3]">
                        {myLbEntry.pick_count} ({myLbEntry.percentage?.toFixed(1)}%)
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Leaderboard preview / toggle */}
            <button
              onClick={() => setView('leaderboard')}
              className="w-full rounded-xl border border-[#30363D] bg-[#161B22] px-4 py-3 text-sm font-medium text-[#8B949E] hover:text-[#E6EDF3] hover:border-[#F0A500]/30 transition-all text-center"
            >
              {t.viewLeaderboard} →
            </button>
          </div>
        )}

        {/* ── View: leaderboard ── */}
        {!authLoading && !dataLoading && view === 'leaderboard' && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#E6EDF3]">{t.lbHeading}</h2>
                <p className="text-xs text-[#8B949E]">{t.lbSub}</p>
              </div>
              <button
                onClick={() => setView(myPick ? 'picked' : 'pick')}
                className="rounded-lg border border-[#30363D] bg-[#161B22] px-3 py-1.5 text-xs font-medium text-[#8B949E] hover:text-[#E6EDF3] transition-colors"
              >
                ← {t.backToPick}
              </button>
            </div>

            {leaderboard.length === 0 ? (
              <div className="rounded-xl border border-[#30363D] bg-[#161B22] px-6 py-10 text-center text-sm text-[#8B949E]">
                No picks yet. Be the first!
              </div>
            ) : (
              <div className="rounded-xl border border-[#30363D] bg-[#161B22] overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-[#30363D] px-4 py-2.5">
                  <span className="text-xs font-semibold text-[#8B949E]">{t.lbTeam}</span>
                  <span className="text-xs font-semibold text-[#8B949E] text-right w-14">{t.lbPicks}</span>
                  <span className="text-xs font-semibold text-[#8B949E] text-right w-10">{t.lbPct}</span>
                </div>

                {/* Rows */}
                <div className="divide-y divide-[#30363D]/40">
                  {leaderboard.map((entry, idx) => {
                    const isMyPick = entry.team === myPick?.team
                    const maxPicks = leaderboard[0]?.pick_count ?? 1
                    return (
                      <div
                        key={entry.team}
                        className={`grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-2.5 items-center ${
                          isMyPick ? 'bg-[#F0A500]/10' : ''
                        }`}
                      >
                        {/* Team */}
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-5 text-center text-xs font-bold text-[#8B949E] flex-shrink-0">
                            {idx + 1}
                          </span>
                          <span className="text-lg flex-shrink-0">{FLAGS[entry.team] ?? '🏳️'}</span>
                          <div className="min-w-0">
                            <span className={`text-sm font-semibold truncate block ${isMyPick ? 'text-[#F0A500]' : 'text-[#E6EDF3]'}`}>
                              {entry.team}
                              {isMyPick && (
                                <span className="ml-1.5 rounded bg-[#F0A500]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#F0A500]">
                                  {t.yourPick}
                                </span>
                              )}
                            </span>
                            {/* Bar */}
                            <div className="mt-0.5 h-1 w-full max-w-[120px] rounded-full bg-[#21262D]">
                              <div
                                className="h-1 rounded-full bg-[#F0A500]/60"
                                style={{ width: `${Math.round((entry.pick_count / maxPicks) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        {/* Picks count */}
                        <span className="text-sm font-semibold text-[#E6EDF3] text-right w-14">
                          {entry.pick_count}
                        </span>
                        {/* Percentage */}
                        <span className={`text-sm font-bold text-right w-10 ${isMyPick ? 'text-[#F0A500]' : 'text-[#8B949E]'}`}>
                          {entry.percentage?.toFixed(1)}%
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Confirm modal ── */}
      {confirming && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[#30363D] bg-[#161B22] p-6">
            <div className="mb-1 text-center text-4xl">{FLAGS[confirming] ?? '🏳️'}</div>
            <h3 className="mb-1 text-center text-lg font-bold text-[#E6EDF3]">
              {t.confirmTitle(confirming)}
            </h3>
            <p className="mb-5 text-center text-sm text-[#8B949E]">{t.confirmSub}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirming(null)}
                disabled={submitting}
                className="flex-1 rounded-xl border border-[#30363D] py-2.5 text-sm font-semibold text-[#8B949E] hover:text-[#E6EDF3] transition-colors disabled:opacity-50"
              >
                {t.cancel}
              </button>
              <button
                onClick={() => submitPick(confirming)}
                disabled={submitting}
                className="flex-1 rounded-xl bg-[#F0A500] py-2.5 text-sm font-bold text-[#0D1117] hover:bg-[#D4920A] transition-colors disabled:opacity-60"
              >
                {submitting ? t.picking : t.confirmYes}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
