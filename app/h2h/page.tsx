'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import H2HIcon from '@/components/H2HIcon'
import { useLanguage } from '@/hooks/useLanguage'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { API_BASE } from '@/lib/api'

// H2H starts June 17 2026 00:00 UTC — after all teams have played matchday 1
const H2H_START = new Date('2026-06-17T00:00:00Z')

function getCountdown() {
  const diff = H2H_START.getTime() - Date.now()
  if (diff <= 0) return null
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    mins: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    secs: Math.floor((diff % (1000 * 60)) / 1000),
  }
}


const TEAM_FLAGS: Record<string, string> = {
  France: '🇫🇷', Argentina: '🇦🇷', Spain: '🇪🇸', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  Germany: '🇩🇪', Brazil: '🇧🇷', Portugal: '🇵🇹', Netherlands: '🇳🇱',
  Belgium: '🇧🇪', Croatia: '🇭🇷', Norway: '🇳🇴', Uruguay: '🇺🇾',
  Colombia: '🇨🇴', Mexico: '🇲🇽', USA: '🇺🇸', Japan: '🇯🇵',
  Morocco: '🇲🇦', Senegal: '🇸🇳', 'South Korea': '🇰🇷', Australia: '🇦🇺',
  Switzerland: '🇨🇭', Turkey: '🇹🇷', Ecuador: '🇪🇨', Canada: '🇨🇦',
  Iran: '🇮🇷', 'Saudi Arabia': '🇸🇦', Qatar: '🇶🇦', Iraq: '🇮🇶',
  Egypt: '🇪🇬', Algeria: '🇩🇿', 'South Africa': '🇿🇦', Ghana: '🇬🇭',
  Tunisia: '🇹🇳', "Côte d'Ivoire": '🇨🇮', 'New Zealand': '🇳🇿',
  Haiti: '🇭🇹', 'Curaçao': '🇨🇼', Jordan: '🇯🇴', 'Cabo Verde': '🇨🇻',
  'Congo DR': '🇨🇩', 'Bosnia-Herzegovina': '🇧🇦', Sweden: '🇸🇪',
  Panama: '🇵🇦', Paraguay: '🇵🇾', Uzbekistan: '🇺🇿', Scotland: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  Austria: '🇦🇹', 'Czech Republic': '🇨🇿',
}

const TEAM_STRENGTH: Record<string, string> = {
  France: 'Elite', Argentina: 'Elite', Spain: 'Elite', England: 'Elite',
  Germany: 'Elite', Brazil: 'Elite', Portugal: 'Strong', Netherlands: 'Strong',
  Belgium: 'Strong', Croatia: 'Strong', Norway: 'Strong', Uruguay: 'Strong',
  Colombia: 'Medium', Mexico: 'Medium', USA: 'Medium', Japan: 'Medium',
  Morocco: 'Medium', Senegal: 'Medium', 'South Korea': 'Medium', Turkey: 'Medium',
  Switzerland: 'Medium', Austria: 'Medium', Sweden: 'Medium',
}

const STRENGTH_STYLE: Record<string, string> = {
  Elite: 'border-yellow-400 bg-yellow-400/10',
  Strong: 'border-blue-400 bg-blue-400/10',
  Medium: 'border-green-400 bg-green-400/10',
  Underdog: 'border-gray-600 bg-gray-600/10',
}

const HOW_IT_WORKS = [
  {
    icon: '⚽',
    titleEN: 'Pick Your Team',
    titleKU: 'تیمەکەت هەڵبژێرە',
    descEN: 'Each round pick one team playing that matchday',
    descKU: 'هەر قۆناغێک یەک تیم هەڵبژێرە کە ئەو ڕۆژە یاری دەکات',
  },
  {
    icon: '⚔️',
    titleEN: 'Get Matched',
    titleKU: 'بەرامبەر دانان',
    descEN: 'System pairs you with another user randomly',
    descKU: 'سیستەم تۆ و کەسێکی تر بە ڕاستەوخۆ بەرامبەر یەک دادەنێت',
  },
  {
    icon: '📊',
    titleEN: 'Best Result Advances',
    titleKU: 'باشترین ئەنجام سەردەکەوێت بۆ ئاستی دواتر',
    descEN: 'Your team wins = you advance. Ties decided by goal difference',
    descKU: 'ئەگەر تیمەکەت بردییەوە تۆ سەردەکەوی. یەکسانبوون لەگەل بەرامبەر بەجیاوازی گۆڵ هەژمار دەکرێت',
  },
  {
    icon: '🏆',
    titleEN: 'Last One Standing Wins',
    titleKU: 'بمێنەرەوە بۆ سەرکەوتن',
    descEN: 'Last person standing wins the championship!',
    descKU: 'کۆتا کەسایەتی براوەی جامەکە دەبێت',
  },
]

const SCHEDULE = [
  { n: 'Group Round 1', k: 'قۆناغی گروپ ١', d: 'June 17–21', desc: 'Pick from all 48 teams' },
  { n: 'Group Round 2', k: 'قۆناغی گروپ ٢', d: 'June 21–26', desc: 'Can change your team' },
  { n: 'Group Round 3', k: 'قۆناغی گروپ ٣', d: 'June 26–27', desc: 'Final group round' },
  { n: 'Round of 16', k: 'چونە دەرەوە — یەکسانی نییە', d: 'June 28 – July 2', desc: 'Knockout begins' },
  { n: 'Quarter Finals', k: 'چارەکی کۆتایی', d: 'July 4–5', desc: '8 teams remain' },
  { n: 'Semi Finals', k: 'نیوەی کۆتایی', d: 'July 8–9', desc: '4 teams remain' },
  { n: 'Final', k: 'پاڵەوان دیاری دەکرێت! 🏆', d: 'July 19', desc: 'Champion decided' },
]

const L = {
  EN: {
    back: '← Back',
    title: 'WC2026 H2H Challenge',
    subtitle: 'Head-to-Head · FIFA World Cup 2026',
    comingSoonBadge: '⏳ H2H unlocks when all teams have played',
    comingSoonSub: 'After all 48 teams play matchday 1',
    countdownLabel: 'Starting In',
    howItWorks: 'How It Works',
    schedule: 'Schedule',
    registeredTitle: '✅ You are registered!',
    registeredSub: 'Come back June 17 to make your first pick',
    loginTitle: 'Login to join H2H Challenge',
    loginSub: 'Sign in to participate when H2H begins',
    loginBtn: 'Login / Sign Up',
    tabPick: 'Pick',
    tabMatchup: 'My Match',
    tabLeaders: 'Leaders',
    alive: 'Alive',
    total: 'Total',
    loginRequired: 'Login required to pick',
    loginBtn2: 'Login',
    yourPick: 'Your Pick',
    stillAlive: '✅ Still Alive!',
    eliminatedMsg: '❌ Eliminated',
    pickWindowOpen: 'Pick window open — you can change your team',
    pickWindowClosed: '⏳ Pick window opens',
    pickWindowEnded: '🔒 Pick window closed for this round',
    noPick: 'No pick yet',
    noPickSub: 'Go to Pick tab to choose your team',
    pickNow: 'Pick Now',
    yourOpponent: 'Your Opponent',
    you: 'You',
    notPickedYet: 'Not picked yet',
    awaitingOpponent: 'Opponent will be assigned when the round starts',
    roundHistory: 'Round History',
    stillAliveCount: 'Still Alive',
    totalPlayers: 'Total Players',
    survivors: '✅ Survivors',
    eliminatedLabel: '❌ Eliminated',
    outRound: 'Out: Round',
    confirmPick: '🎯 Confirm Pick',
    picking: 'Picking…',
    loginFirst: 'Login First',
  },
  KU: {
    back: '← گەڕانەوە',
    title: 'چالەنجی H2H جامی جیهانی ٢٠٢٦',
    subtitle: 'چالەنجی سەر بەسەر · جامی جیهانی ٢٠٢٦',
    comingSoonBadge: 'H2H كراوەدەبێت کاتێک هەموو تیمەکان یاریان کردووە',
    comingSoonSub: 'دوای ئەوەی ٤٨ تیم یەکەم یاریان لە قۆناغی گروپدا ئەندام دا',
    countdownLabel: 'دەستپێدەکات لە',
    howItWorks: 'چۆن کار دەکات',
    schedule: 'خشتەی ئاستەکان',
    registeredTitle: '✅ تۆ تۆمارکراوی!',
    registeredSub: '١٧ی ئەم مانگە دێبەرەوە بۆ یەکەم هەڵبژاردنەکەت',
    loginTitle: 'چوونەژوورەوە بۆ بەشداری لە چالەنجی H2H',
    loginSub: 'چوونەژوورەوە بۆ بەشداریکردن کاتێک H2H دەستپێدەکات',
    loginBtn: 'چوونەژووو / تۆمارکردن',
    tabPick: 'هەڵبژاردن',
    tabMatchup: 'یارییەکەم',
    tabLeaders: 'پێشکەوتوان',
    alive: 'ژیو',
    total: 'کۆی گشتی',
    loginRequired: 'چوونەژوورەوە پێویستە بۆ هەڵبژاردن',
    loginBtn2: 'چوونەژوورەوە',
    yourPick: 'هەڵبژاردنی تۆ',
    stillAlive: '✅ هێشتا ژیوی!',
    eliminatedMsg: '❌ دەرکراو',
    pickWindowOpen: 'پەنجەرەی هەڵبژاردن کراوەیە — دەتوانی تیمەکەت بگۆڕی',
    pickWindowClosed: '⏳ پەنجەرەی هەڵبژاردن دەکرێتەوە',
    pickWindowEnded: '🔒 پەنجەرەی هەڵبژاردن داخراوە بۆ ئەم خولە',
    noPick: 'هێشتا هەڵبژاردن نەکراوە',
    noPickSub: 'بڕۆ بۆ تابی هەڵبژاردن بۆ هەڵبژاردنی تیمەکەت',
    pickNow: 'ئێستا هەڵبژێرە',
    yourOpponent: 'بەرامبەرەکەت',
    you: 'تۆ',
    notPickedYet: 'هێشتا هەڵنەبژێراوە',
    awaitingOpponent: 'بەرامبەرەکەت دیاری دەکرێت کاتێک قۆناغەکە دەستپێدەکات',
    roundHistory: 'مێژووی قۆناغەکان',
    stillAliveCount: 'هێشتا ژیو',
    totalPlayers: 'کۆی یاریکەران',
    survivors: '✅ بەردەوامان',
    eliminatedLabel: '❌ دەرکراوان',
    outRound: 'دەرکرا: قۆناغی',
    confirmPick: '🎯 دڵنیابوونەوە لە هەڵبژاردن',
    picking: 'هەڵبژێردراو…',
    loginFirst: 'یەکەم چوونەژوورەوە',
  },
}

export default function H2HPage() {
  const router = useRouter()
  const { language, changeLanguage } = useLanguage()
  const { user: authUser, openAuthModal } = useAuth()

  const [countdown, setCountdown] = useState(getCountdown())
  const [status, setStatus] = useState<Record<string, unknown> | null>(null)
  const [myStatus, setMyStatus] = useState<Record<string, unknown> | null>(null)
  const [teams, setTeams] = useState<string[]>([])
  const [teamStats, setTeamStats] = useState<Record<string, unknown> | null>(null)
  const [leaderboard, setLeaderboard] = useState<Record<string, unknown> | null>(null)
  const [selectedTeam, setSelectedTeam] = useState('')
  const [filter, setFilter] = useState('All')
  const [activeTab, setActiveTab] = useState<'pick' | 'matchup' | 'leaderboard'>('pick')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const tx = L[language]
  const H2H_STARTED = Date.now() >= H2H_START.getTime()

  // ── Countdown ticker ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (H2H_STARTED) return
    const timer = setInterval(() => setCountdown(getCountdown()), 1000)
    return () => clearInterval(timer)
  }, [H2H_STARTED])

  // ── Load public data ─────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [statusRes, teamsRes, statsRes, lbRes] = await Promise.all([
        fetch(`${API_BASE}/h2h/status`),
        fetch(`${API_BASE}/h2h/teams`),
        fetch(`${API_BASE}/h2h/team-stats`),
        fetch(`${API_BASE}/h2h/leaderboard`),
      ])
      if (statusRes.ok) setStatus(await statusRes.json())
      if (teamsRes.ok) {
        const d = await teamsRes.json()
        setTeams(d.teams || [])
      }
      if (statsRes.ok) setTeamStats(await statsRes.json())
      if (lbRes.ok) setLeaderboard(await lbRes.json())
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [])

  // ── Load my status ───────────────────────────────────────────────────────────
  const loadMyStatus = useCallback(async () => {
    if (!authUser) return
    try {
      const res = await fetch(`${API_BASE}/h2h/my-status/${authUser.id}`)
      if (res.ok) setMyStatus(await res.json())
    } catch (e) { console.error(e) }
  }, [authUser])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => { if (authUser) loadMyStatus() }, [authUser, loadMyStatus])

  // ── Submit pick ──────────────────────────────────────────────────────────────
  const submitPick = async () => {
    if (!selectedTeam || !authUser) return
    setSubmitting(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || ''
      const currentRound = (status?.current_round as Record<string, unknown> | undefined)?.round_number ?? 1
      const res = await fetch(`${API_BASE}/h2h/pick`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          user_id: authUser.id,
          team_name: selectedTeam,
          round_number: currentRound,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        await loadMyStatus()
        await loadData()
        setActiveTab('matchup')
        setSelectedTeam('')
      } else {
        setError(data.detail || 'Failed to pick')
      }
    } catch {
      setError('Network error. Try again.')
    }
    setSubmitting(false)
  }

  // ── COMING SOON VIEW ─────────────────────────────────────────────────────────
  if (!H2H_STARTED) {
    return (
      <div className="min-h-screen bg-slate-900 text-white pb-20">
        <Navbar language={language} onLanguageChange={changeLanguage} />
        <div className="max-w-2xl mx-auto px-4 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-400 mb-4 hover:text-white transition-colors"
          >
            {tx.back}
          </button>
        </div>

        {/* Header */}
        <div className="bg-gradient-to-b from-slate-800 to-slate-900 px-4 pt-6 pb-8 text-center">
          <div className="flex justify-center mb-3">
            <H2HIcon size={48} />
          </div>
          <h1 className="text-3xl font-bold mb-2">{tx.title}</h1>
          <p className="text-gray-400">{tx.subtitle}</p>
        </div>

        <div className="max-w-2xl mx-auto">
          {/* Announcement banner */}
          <div className="mx-4 mb-5">
            <div className="bg-yellow-500/10 border border-yellow-500 rounded-2xl p-5 text-center">
              <div className="text-yellow-400 font-bold text-lg mb-1">
                {tx.comingSoonBadge}
              </div>
              <div className="text-gray-300 text-sm">
                {tx.comingSoonSub}
              </div>
            </div>
          </div>

          {/* Countdown */}
          {countdown && (
            <div className="mx-4 mb-5">
              <div className="bg-slate-800 rounded-2xl p-5">
                <p className="text-center text-gray-400 text-xs mb-3 uppercase tracking-wider">
                  {tx.countdownLabel}
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {([
                    { v: countdown.days,  lEN: 'Days',  lKU: 'ڕۆژ' },
                    { v: countdown.hours, lEN: 'Hours', lKU: 'کاتژمێر' },
                    { v: countdown.mins,  lEN: 'Mins',  lKU: 'خولەک' },
                    { v: countdown.secs,  lEN: 'Secs',  lKU: 'چرکە' },
                  ] as { v: number; lEN: string; lKU: string }[]).map(({ v, lEN, lKU }) => (
                    <div key={lEN} className="bg-slate-700 rounded-xl p-3 text-center">
                      <div className="text-3xl font-bold text-yellow-400">
                        {String(v).padStart(2, '0')}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {language === 'KU' ? lKU : lEN}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* How it works */}
          <div className="mx-4 mb-5">
            <h2 className="font-bold text-lg mb-3 text-center">{tx.howItWorks}</h2>
            <div className="space-y-3">
              {HOW_IT_WORKS.map((step) => (
                <div key={step.titleEN} className="bg-slate-800 rounded-xl p-4 flex gap-3">
                  <div className="text-3xl shrink-0">{step.icon}</div>
                  <div>
                    <div className="font-bold mb-0.5">
                      {language === 'KU' ? step.titleKU : step.titleEN}
                    </div>
                    <div className="text-gray-400 text-sm">
                      {language === 'KU' ? step.descKU : step.descEN}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Schedule */}
          <div className="mx-4 mb-5">
            <h2 className="font-bold text-lg mb-3 text-center">{tx.schedule}</h2>
            <div className="bg-slate-800 rounded-2xl overflow-hidden">
              {SCHEDULE.map(({ n, k, d, desc }, i) => (
                <div
                  key={n}
                  className={`flex items-center gap-3 p-4 ${i < SCHEDULE.length - 1 ? 'border-b border-slate-700' : ''}`}
                >
                  <div className="w-7 h-7 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold text-gray-300 shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{language === 'KU' ? k : n}</div>
                    {language === 'EN' && <div className="text-gray-500 text-xs">{k}</div>}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-yellow-400 text-sm font-medium">{d}</div>
                    <div className="text-gray-500 text-xs">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="mx-4 mb-8">
            {authUser ? (
              <div className="bg-green-500/10 border border-green-500 rounded-2xl p-5 text-center">
                <div className="text-green-400 font-bold text-lg mb-1">{tx.registeredTitle}</div>
                <div className="text-gray-400 text-sm">{tx.registeredSub}</div>
              </div>
            ) : (
              <div className="bg-blue-500/10 border border-blue-500 rounded-2xl p-5 text-center">
                <div className="text-blue-400 font-bold text-lg mb-2">{tx.loginTitle}</div>
                <div className="text-gray-400 text-sm mb-4">{tx.loginSub}</div>
                <button
                  onClick={() => openAuthModal(language)}
                  className="bg-blue-600 text-white font-bold px-8 py-3 rounded-xl hover:bg-blue-700 transition-colors"
                >
                  {tx.loginBtn}
                </button>
              </div>
            )}
          </div>
        </div>{/* /max-w-2xl */}
      </div>
    )
  }

  // ── H2H ACTIVE VIEWS ─────────────────────────────────────────────────────────

  const currentRound = status?.current_round as Record<string, unknown> | undefined
  const myPick = myStatus?.my_pick as Record<string, unknown> | undefined
  const opponent = myStatus?.opponent as Record<string, unknown> | undefined
  const pickWindowOpen = (myStatus?.pick_window_open as boolean | undefined) || false

  const tabs = [
    { id: 'pick',        label: tx.tabPick,    icon: '⚽' },
    { id: 'matchup',     label: tx.tabMatchup, icon: '⚔️' },
    { id: 'leaderboard', label: tx.tabLeaders, icon: '🏆' },
  ]

  return (
    <div className="min-h-screen bg-slate-900 text-white pb-24">
      <Navbar language={language} onLanguageChange={changeLanguage} />

      <div className="max-w-2xl mx-auto px-4 pt-4 pb-2">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-400 mb-2 hover:text-white transition-colors"
        >
          {tx.back}
        </button>
      </div>

      {/* Header */}
      <div className="bg-slate-800 px-4 pt-4 pb-4 text-center border-b border-slate-700">
        <div className="flex items-center justify-center gap-2 mb-1">
          <H2HIcon size={32} />
          <h1 className="text-2xl font-bold">{tx.title}</h1>
        </div>
        {currentRound && (
          <div className="text-yellow-400 text-sm font-medium">
            {currentRound.round_name as string}
          </div>
        )}
        <div className="flex justify-center gap-6 mt-3 text-sm">
          <div className="text-center">
            <div className="text-xl font-bold text-green-400">
              {(status?.alive_count as number | undefined) ?? 0}
            </div>
            <div className="text-gray-400 text-xs">{tx.alive}</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-blue-400">
              {(status?.total_participants as number | undefined) ?? 0}
            </div>
            <div className="text-gray-400 text-xs">{tx.total}</div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-slate-700 bg-slate-800">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'pick' | 'matchup' | 'leaderboard')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-yellow-400 border-b-2 border-yellow-400'
                : 'text-gray-400'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── PICK TAB ── */}
      {activeTab === 'pick' && (
        <div className="max-w-2xl mx-auto p-4">
          {!authUser && (
            <div className="bg-yellow-500/10 border border-yellow-500 rounded-xl p-4 text-center mb-4">
              <div className="text-yellow-400 font-bold mb-1">{tx.loginRequired}</div>
              <button
                onClick={() => openAuthModal(language)}
                className="bg-yellow-500 text-black font-bold px-6 py-2 rounded-lg mt-2"
              >
                {tx.loginBtn2}
              </button>
            </div>
          )}

          {myPick && (
            <div className="bg-green-500/10 border border-green-500 rounded-xl p-4 text-center mb-4">
              <div className="text-green-400 font-bold">
                ✅ {tx.yourPick}: {TEAM_FLAGS[myPick.team_picked as string] || ''} {myPick.team_picked as string}
              </div>
              {pickWindowOpen && (
                <div className="text-gray-400 text-xs mt-1">{tx.pickWindowOpen}</div>
              )}
            </div>
          )}

          {!pickWindowOpen && currentRound && (() => {
            // Distinguish a window that hasn't opened yet (future) from one that
            // already closed (past) — the old copy always said "opens", which is
            // wrong once pick_closes has passed.
            const opens = currentRound.pick_opens ? new Date(currentRound.pick_opens as string) : null
            const closes = currentRound.pick_closes ? new Date(currentRound.pick_closes as string) : null
            const now = new Date()
            const isFuture = opens ? now < opens : false
            return (
              <div className="bg-slate-800 rounded-xl p-4 text-center mb-4 text-gray-400 text-sm">
                {isFuture
                  ? <>{tx.pickWindowClosed} {opens!.toLocaleDateString()}</>
                  : <>{tx.pickWindowEnded}{closes ? ` (${closes.toLocaleDateString()})` : ''}</>}
              </div>
            )
          })()}

          {pickWindowOpen && (
            <>
              {/* Strength filter */}
              <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                {['All', 'Elite', 'Strong', 'Medium', 'Underdog'].map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                      filter === f
                        ? 'bg-yellow-500 text-black font-bold'
                        : 'bg-slate-700 text-gray-300'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {/* Team grid */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {teams
                  .filter(teamName => filter === 'All' || (TEAM_STRENGTH[teamName] || 'Underdog') === filter)
                  .map(team => {
                    const picks = (teamStats?.teams as Array<{ team: string; count: number }> | undefined)
                      ?.find(s => s.team === team)?.count ?? 0
                    const isSelected = selectedTeam === team
                    const strength = TEAM_STRENGTH[team] || 'Underdog'
                    return (
                      <button
                        key={team}
                        onClick={() => setSelectedTeam(isSelected ? '' : team)}
                        className={`relative rounded-xl p-3 border-2 text-center transition-all ${
                          isSelected
                            ? 'border-yellow-400 bg-yellow-400/20 scale-105'
                            : STRENGTH_STYLE[strength]
                        }`}
                      >
                        <div className="text-4xl mb-1">{TEAM_FLAGS[team] || '🏳️'}</div>
                        <div className="text-xs font-medium leading-tight">{team}</div>
                        {picks > 0 && (
                          <div className="text-xs text-gray-400 mt-0.5">{picks}</div>
                        )}
                        {isSelected && (
                          <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full w-5 h-5 flex items-center justify-center text-black text-xs font-bold">
                            ✓
                          </div>
                        )}
                      </button>
                    )
                  })}
              </div>
            </>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500 rounded-xl p-3 text-red-400 text-sm mb-4 text-center">
              {error}
            </div>
          )}
        </div>
      )}

      {/* ── MATCHUP TAB ── */}
      {activeTab === 'matchup' && (
        <div className="max-w-2xl mx-auto p-4">
          {!myStatus?.has_pick ? (
            <div className="text-center text-gray-400 py-12">
              <div className="text-5xl mb-3">⚽</div>
              <div className="font-bold mb-1">{tx.noPick}</div>
              <div className="text-sm">{tx.noPickSub}</div>
              <button
                onClick={() => setActiveTab('pick')}
                className="mt-4 bg-yellow-500 text-black font-bold px-6 py-2 rounded-xl"
              >
                {tx.pickNow}
              </button>
            </div>
          ) : (
            <>
              {/* My pick card */}
              <div className="bg-slate-800 rounded-2xl p-5 mb-4 text-center">
                <div className="text-xs text-gray-400 uppercase mb-2">{tx.yourPick}</div>
                <div className="text-6xl mb-2">{TEAM_FLAGS[myPick?.team_picked as string] || '🏳️'}</div>
                <div className="text-xl font-bold">{myPick?.team_picked as string}</div>
                <div className={`mt-2 text-sm font-medium ${myPick?.is_alive ? 'text-green-400' : 'text-red-400'}`}>
                  {myPick?.is_alive ? tx.stillAlive : tx.eliminatedMsg}
                </div>
                {myPick?.result !== 'pending' && (
                  <div className="mt-1 text-gray-400 text-sm">
                    Result: {myPick?.result as string}
                    {myPick?.goal_difference !== undefined
                      ? ` (GD: ${(myPick.goal_difference as number) > 0 ? '+' : ''}${myPick.goal_difference})`
                      : ''}
                  </div>
                )}
              </div>

              {/* Opponent */}
              {opponent ? (
                <div className="bg-slate-800 rounded-2xl p-5 mb-4">
                  <div className="text-center text-xs text-gray-400 uppercase mb-4">{tx.yourOpponent}</div>
                  <div className="flex items-center justify-around">
                    <div className="text-center">
                      <div className="text-4xl mb-1">{TEAM_FLAGS[myPick?.team_picked as string] || '🏳️'}</div>
                      <div className="text-sm font-bold">{tx.you}</div>
                      <div className="text-xs text-gray-400">{myPick?.team_picked as string}</div>
                    </div>
                    <div className="text-2xl font-bold text-gray-500">VS</div>
                    <div className="text-center">
                      <div className="text-4xl mb-1">{TEAM_FLAGS[opponent.team_picked as string] || '❓'}</div>
                      <div className="text-sm font-bold">{opponent.username as string}</div>
                      <div className="text-xs text-gray-400">
                        {(opponent.team_picked as string) || tx.notPickedYet}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-800 rounded-2xl p-5 text-center text-gray-400 mb-4">
                  <div className="text-3xl mb-2">⏳</div>
                  <div className="text-sm">{tx.awaitingOpponent}</div>
                </div>
              )}

              {/* Round history */}
              {Array.isArray(myStatus?.history) && (myStatus.history as unknown[]).length > 0 && (
                <div className="bg-slate-800 rounded-2xl p-4">
                  <div className="font-bold mb-3 text-sm">{tx.roundHistory}</div>
                  {(myStatus.history as Array<Record<string, unknown>>).map(h => (
                    <div
                      key={h.round_number as number}
                      className="flex items-center gap-3 py-2 border-b border-slate-700 last:border-0"
                    >
                      <div className="text-2xl">{TEAM_FLAGS[h.team_picked as string] || '🏳️'}</div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          Round {h.round_number as number} — {h.team_picked as string}
                        </div>
                        <div className="text-xs text-gray-400">
                          GD: {(h.goal_difference as number) >= 0 ? '+' : ''}{h.goal_difference as number}
                          {' · '}Cumulative: {(h.cumulative_gd as number) >= 0 ? '+' : ''}{h.cumulative_gd as number}
                        </div>
                      </div>
                      <div className={`text-sm font-bold ${
                        h.result === 'win' ? 'text-green-400'
                          : h.result === 'loss' ? 'text-red-400'
                          : h.result === 'bye' ? 'text-blue-400'
                          : 'text-gray-400'
                      }`}>
                        {h.result === 'win' ? '✅ WIN'
                          : h.result === 'loss' ? '❌ LOSS'
                          : h.result === 'bye' ? '🎯 BYE'
                          : h.result === 'draw' ? '🤝 DRAW'
                          : '⏳'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── LEADERBOARD TAB ── */}
      {activeTab === 'leaderboard' && (
        <div className="max-w-2xl mx-auto p-4">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-green-900/30 border border-green-700 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-green-400">
                {(leaderboard?.alive_count as number | undefined) ?? 0}
              </div>
              <div className="text-xs text-gray-400">{tx.stillAliveCount}</div>
            </div>
            <div className="bg-slate-800 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-blue-400">
                {(leaderboard?.total as number | undefined) ?? 0}
              </div>
              <div className="text-xs text-gray-400">{tx.totalPlayers}</div>
            </div>
          </div>

          {/* Alive */}
          <h3 className="text-green-400 font-bold mb-2 text-sm">{tx.survivors}</h3>
          <div className="space-y-2 mb-4">
            {((leaderboard?.alive as Array<Record<string, unknown>>) || []).map((p, i) => (
              <div
                key={p.user_id as string}
                className={`bg-slate-800 rounded-xl p-3 flex items-center gap-3 ${
                  p.user_id === authUser?.id ? 'border border-yellow-400' : ''
                }`}
              >
                <span className="text-gray-400 w-5 text-sm shrink-0">{i + 1}</span>
                <span className="text-2xl shrink-0">{TEAM_FLAGS[p.team_picked as string] || '🏳️'}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {((p.user_profiles as Record<string, unknown> | undefined)?.username as string) || 'Player'}
                    {p.user_id === authUser?.id && ` (${tx.you})`}
                  </div>
                  <div className="text-xs text-gray-400">{p.team_picked as string}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-green-400">✅</div>
                  <div className="text-xs text-gray-500">
                    GD:{(p.cumulative_gd as number) >= 0 ? '+' : ''}{p.cumulative_gd as number}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Eliminated */}
          {((leaderboard?.eliminated as Array<Record<string, unknown>>) || []).length > 0 && (
            <>
              <h3 className="text-red-400 font-bold mb-2 text-sm">{tx.eliminatedLabel}</h3>
              <div className="space-y-2">
                {((leaderboard?.eliminated as Array<Record<string, unknown>>) || []).map(p => (
                  <div
                    key={p.user_id as string}
                    className="bg-slate-800/50 rounded-xl p-3 flex items-center gap-3 opacity-50"
                  >
                    <span className="text-2xl shrink-0">{TEAM_FLAGS[p.team_picked as string] || '🏳️'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {((p.user_profiles as Record<string, unknown> | undefined)?.username as string) || 'Player'}
                      </div>
                      <div className="text-xs text-red-400">{tx.outRound} {p.round_number as number}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Fixed bottom: confirm pick ── */}
      {activeTab === 'pick' && selectedTeam && pickWindowOpen && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 p-4 z-50">
          <div className="max-w-lg mx-auto flex items-center gap-4">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-3xl">{TEAM_FLAGS[selectedTeam] || '🏳️'}</span>
              <div>
                <div className="font-bold text-sm">{selectedTeam}</div>
                <div className="text-xs text-gray-400">{TEAM_STRENGTH[selectedTeam] || 'Underdog'}</div>
              </div>
            </div>
            <button
              onClick={submitPick}
              disabled={submitting || !authUser}
              className="bg-yellow-400 text-black font-bold px-6 py-3 rounded-xl disabled:opacity-50 whitespace-nowrap transition-opacity"
            >
              {submitting ? tx.picking : authUser ? tx.confirmPick : tx.loginFirst}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
