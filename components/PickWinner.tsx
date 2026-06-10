'use client'

import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Sk } from '@/components/SkeletonCard'

// Champion pick locks after all matchday-1 group games complete
const PICK_LOCK_DATE = new Date('2026-06-17T23:59:59Z')

// ── Static data ───────────────────────────────────────────────────────────────

const GROUPS: Record<string, string[]> = {
  A: ['Mexico','South Korea','South Africa','Czech Republic'],
  B: ['Canada','Switzerland','Qatar','Bosnia-Herzegovina'],
  C: ['Brazil','Morocco','Scotland','Haiti'],
  D: ['USA','Paraguay','Australia','Turkey'],
  E: ['Germany','Curaçao',"Côte d'Ivoire",'Ecuador'],
  F: ['Netherlands','Japan','Tunisia','Sweden'],
  G: ['Belgium','Egypt','Iran','New Zealand'],
  H: ['Spain','Cabo Verde','Saudi Arabia','Uruguay'],
  I: ['France','Senegal','Norway','Iraq'],
  J: ['Argentina','Algeria','Austria','Jordan'],
  K: ['Portugal','Colombia','Uzbekistan','Congo DR'],
  L: ['England','Croatia','Ghana','Panama'],
}

const FLAGS: Record<string, string> = {
  Mexico:'🇲🇽','South Korea':'🇰🇷','South Africa':'🇿🇦','Czech Republic':'🇨🇿',
  Canada:'🇨🇦',Switzerland:'🇨🇭',Qatar:'🇶🇦','Bosnia-Herzegovina':'🇧🇦',
  Brazil:'🇧🇷',Morocco:'🇲🇦',Scotland:'🏴󠁧󠁢󠁳󠁣󠁴󠁿',Haiti:'🇭🇹',
  USA:'🇺🇸',Paraguay:'🇵🇾',Australia:'🇦🇺',Turkey:'🇹🇷',
  Germany:'🇩🇪','Curaçao':'🇨🇼',"Côte d'Ivoire":'🇨🇮',Ecuador:'🇪🇨',
  Netherlands:'🇳🇱',Japan:'🇯🇵',Tunisia:'🇹🇳',Sweden:'🇸🇪',
  Belgium:'🇧🇪',Egypt:'🇪🇬',Iran:'🇮🇷','New Zealand':'🇳🇿',
  Spain:'🇪🇸','Cabo Verde':'🇨🇻','Saudi Arabia':'🇸🇦',Uruguay:'🇺🇾',
  France:'🇫🇷',Senegal:'🇸🇳',Norway:'🇳🇴',Iraq:'🇮🇶',
  Argentina:'🇦🇷',Algeria:'🇩🇿',Austria:'🇦🇹',Jordan:'🇯🇴',
  Portugal:'🇵🇹',Colombia:'🇨🇴',Uzbekistan:'🇺🇿','Congo DR':'🇨🇩',
  England:'🏴󠁧󠁢󠁥󠁮󠁧󠁿',Croatia:'🇭🇷',Ghana:'🇬🇭',Panama:'🇵🇦',
}

const ALL_TEAMS = Object.values(GROUPS).flat()
void ALL_TEAMS // referenced by parent via prop if needed

// ── Labels ────────────────────────────────────────────────────────────────────

const L = {
  EN: {
    title: '🏆 Who Will Win the World Cup?',
    subtitle: 'Pick before June 17 — earn 50 bonus points if you\'re right',
    search: 'Search team…',
    group: 'Group',
    aiTitle: 'AI Thinks…',
    aiSub: 'Based on 10,000 simulations',
    lockBtn: 'Lock My Pick 🔒',
    loginBtn: 'Login to Save Your Pick',
    changeBtn: 'Change pick',
    alreadyPicked: 'You picked',
    lockedPick: '🔒 Your pick is locked',
    lockedMsg: 'Picks are locked — matchday 1 is underway',
    saved: 'Pick saved! Good luck 🤞',
    saving: 'Saving…',
    points: 'Correct tournament winner = 50 bonus points',
    showAI: 'See AI predictions ▾',
    hideAI: 'Hide AI predictions ▴',
    lockCountdown: (days: number) => `🔒 Locks in ${days} day${days === 1 ? '' : 's'}`,
  },
  KU: {
    title: '🏆 کێ جامی جیهانی دەبات؟',
    subtitle: 'هەڵبژاردن خۆت بکە پێش ١٧ی حوزەیران · ٥٠ خاڵی زیادە وەربگرە ئەگەر دروست بوو',
    search: 'تیم بگەڕێ…',
    group: 'گروپ',
    aiTitle: '‏AI چی فیکر دەکات…',
    aiSub: 'دەرئەنجامی ١٠,٠٠٠ شێوەکاری',
    lockBtn: 'هەڵبژاردنم داخەم 🔒',
    loginBtn: 'چوونەژوورەوە بۆ پاشەکەوتکردن',
    changeBtn: 'گۆڕانی هەڵبژاردن',
    alreadyPicked: 'هەڵبژاردتە',
    lockedPick: '🔒 هەڵبژاردنەکەت قفڵ کرا',
    lockedMsg: 'هەڵبژاردن داخراون — یارییەکانی ئەستێرەی یەکەم دەستپێکردووە',
    saved: 'پاشەکەوت کرا! بەختێکی باش 🤞',
    saving: 'پاشەکەوتکردن…',
    points: 'بەرزترین تیمی دروست = ٥٠ خاڵی زیادە',
    showAI: 'پێشبینی AI ببینە ▾',
    hideAI: 'پێشبینی AI بپۆشە ▴',
    lockCountdown: (days: number) => `🔒 ${days} ڕۆژ تا قفڵبوون`,
  },
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  winnerProbs?: Record<string, number>
  flagMap?: Record<string, string>
  language: 'EN' | 'KU'
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PickWinner({ winnerProbs = {}, language }: Props) {
  const t = L[language]
  const { user, openAuthModal } = useAuth()

  const isAfterLock = Date.now() >= PICK_LOCK_DATE.getTime()
  const daysToLock  = Math.ceil((PICK_LOCK_DATE.getTime() - Date.now()) / 86_400_000)

  const [selected,     setSelected]     = useState<string | null>(null)
  const [existingPick, setExistingPick] = useState<string | null>(null)
  const [saving,       setSaving]       = useState(false)
  const [saved,        setSaved]        = useState(false)
  const [pickLoading,  setPickLoading]  = useState(false)
  const [search,       setSearch]       = useState('')
  const [showAI,       setShowAI]       = useState(false)

  // After lock date, existing picks can't be changed. New users can still make a first pick.
  const locked = isAfterLock && existingPick !== null

  // Load existing pick from champion_picks table
  useEffect(() => {
    if (!user) { setExistingPick(null); setSelected(null); return }
    setPickLoading(true)
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('champion_picks')
          .select('team_name')
          .eq('user_id', user.id)
          .maybeSingle()
        if (error) {
          console.warn('[PickWinner] load error:', error.message)
          return
        }
        if (data?.team_name) {
          setExistingPick(data.team_name)
          setSelected(data.team_name)
        }
      } finally {
        setPickLoading(false)
      }
    })()
  }, [user])

  const handleSave = async () => {
    if (!selected) return
    if (!user) { openAuthModal(language); return }
    setSaving(true)
    try {
      const { error } = await supabase
        .from('champion_picks')
        .upsert({ user_id: user.id, team_name: selected }, { onConflict: 'user_id' })
      if (error) {
        console.error('[PickWinner] save error:', error.message)
        return
      }
      setExistingPick(selected)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  const handleShare = async () => {
    if (!existingPick) return
    const msg = language === 'KU'
      ? `${FLAGS[existingPick] ?? '🏳️'} ${existingPick} هەڵدەبژێرم بۆ برینی جامی جیهانی ٢٠٢٦ • innovera.ai`
      : `${FLAGS[existingPick] ?? '🏳️'} I'm backing ${existingPick} to win the 2026 World Cup • innovera.ai`
    if (navigator.share) {
      await navigator.share({ title: 'Innovera — My World Cup Pick', text: msg }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(msg).catch(() => {})
    }
  }

  // Sorted top-8 AI probabilities
  const top8 = useMemo(() => {
    return Object.entries(winnerProbs)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
  }, [winnerProbs])
  const maxProb = top8[0]?.[1] ?? 1

  // Filtered team list
  const filteredGroups = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return GROUPS
    const result: Record<string, string[]> = {}
    for (const [g, teams] of Object.entries(GROUPS)) {
      const filtered = teams.filter(tm => tm.toLowerCase().includes(q))
      if (filtered.length) result[g] = filtered
    }
    return result
  }, [search])

  // ── AI probabilities panel ─────────────────────────────────────────────────

  const AIProbsPanel = () => (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-bold text-[#E6EDF3]">{t.aiTitle}</p>
        <p className="text-xs text-[#8B949E]">{t.aiSub}</p>
      </div>
      {top8.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Sk className="h-4 w-4 rounded-full flex-shrink-0" />
              <Sk className="h-3 flex-1 rounded-full" />
              <Sk className="h-3 w-10 flex-shrink-0" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {top8.map(([team, prob], i) => {
            const medals = ['🥇', '🥈', '🥉']
            const barW = Math.round((prob / maxProb) * 100)
            return (
              <div key={team} className="flex items-center gap-2">
                <span className="text-sm w-4 flex-shrink-0">{medals[i] ?? i + 1}</span>
                <span className="text-base flex-shrink-0">{FLAGS[team] ?? '🏳️'}</span>
                <span className="text-xs text-[#8B949E] w-20 truncate flex-shrink-0">{team}</span>
                <div className="flex-1 h-1.5 rounded-full bg-[#30363D] overflow-hidden min-w-0">
                  <div className="h-full rounded-full bg-[#F0A500]" style={{ width: `${barW}%` }} />
                </div>
                <span className="text-[10px] font-bold text-[#F0A500] tabular-nums w-10 text-right flex-shrink-0">
                  {(prob * 100).toFixed(1)}%
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  return (
    <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-5 sm:p-6 space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-lg sm:text-xl font-extrabold text-[#E6EDF3]">{t.title}</h2>
        <p className="mt-1 text-xs text-[#8B949E]">{t.subtitle}</p>
        {/* Countdown to lock — show 10 days out */}
        {!isAfterLock && daysToLock <= 10 && (
          <p className="mt-1 text-[11px] font-semibold text-[#F0A500]">
            {t.lockCountdown(daysToLock)}
          </p>
        )}
      </div>

      {/* Already picked banner */}
      {existingPick && (
        <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${
          locked
            ? 'bg-[#30363D]/40 border border-[#30363D]'
            : 'bg-[#F0A500]/10 border border-[#F0A500]/30'
        }`}>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{FLAGS[existingPick] ?? '🏳️'}</span>
            <div>
              <p className="text-xs text-[#8B949E]">
                {locked ? t.lockedPick : t.alreadyPicked}
              </p>
              <p className={`text-sm font-bold ${locked ? 'text-[#E6EDF3]' : 'text-[#F0A500]'}`}>
                {existingPick}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!locked && (
              <button
                onClick={() => setExistingPick(null)}
                className="text-xs text-[#8B949E] hover:text-[#E6EDF3] underline"
              >
                {t.changeBtn}
              </button>
            )}
            <button
              onClick={handleShare}
              className="text-xs font-bold text-[#0D1117] bg-[#F0A500] hover:bg-[#D4920A] px-2.5 py-1 rounded-lg transition-colors"
            >
              📤
            </button>
          </div>
        </div>
      )}

      {/* Success toast */}
      {saved && (
        <div className="bg-[#2EA043]/15 border border-[#2EA043]/40 rounded-xl px-4 py-3 text-sm font-semibold text-[#2EA043] text-center">
          {t.saved}
        </div>
      )}

      {/* Main layout: team picker + AI probs — hide picker when locked with existing pick */}
      {!locked && (
        <div className="lg:grid lg:grid-cols-2 lg:gap-6 space-y-5 lg:space-y-0">

          {/* Left: team picker */}
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8B949E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t.search}
                className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg pl-8 pr-3 py-2 text-xs text-[#E6EDF3] placeholder-[#8B949E] focus:border-[#F0A500] focus:outline-none"
              />
            </div>

            {/* Team grid by group */}
            <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
              {Object.entries(filteredGroups).map(([group, teams]) => (
                <div key={group}>
                  <p className="text-[9px] font-bold text-[#8B949E] uppercase tracking-widest mb-1.5">
                    {t.group} {group}
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {teams.map(team => {
                      const isActive = selected === team
                      return (
                        <button
                          key={team}
                          onClick={() => setSelected(isActive ? null : team)}
                          className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left transition-all ${
                            isActive
                              ? 'border-[#F0A500] bg-[#F0A500]/15 text-[#F0A500]'
                              : 'border-[#30363D] text-[#8B949E] hover:border-[#F0A500]/40 hover:text-[#E6EDF3]'
                          }`}
                        >
                          <span className="text-base flex-shrink-0">{FLAGS[team] ?? '🏳️'}</span>
                          <span className="text-[11px] font-semibold truncate flex-1">{team}</span>
                          {isActive && <span className="text-[10px] flex-shrink-0">✓</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: AI probabilities — always visible on desktop, toggle on mobile */}
          <div>
            <button
              className="lg:hidden w-full text-xs font-semibold text-[#F0A500] bg-[#F0A500]/10 border border-[#F0A500]/30 rounded-lg px-3 py-2 mb-3 transition-colors hover:bg-[#F0A500]/20"
              onClick={() => setShowAI(v => !v)}
            >
              {showAI ? t.hideAI : t.showAI}
            </button>
            <div className={showAI ? 'block' : 'hidden lg:block'}>
              <AIProbsPanel />
            </div>
          </div>
        </div>
      )}

      {/* When locked with a pick, show AI panel alone */}
      {locked && (
        <div className="hidden lg:block">
          <AIProbsPanel />
        </div>
      )}

      {/* Submit / lock state */}
      <div className="space-y-2">
        {locked ? (
          <p className="text-center text-xs font-semibold text-[#8B949E] bg-[#30363D]/40 rounded-xl py-3">
            {t.lockedMsg}
          </p>
        ) : !user ? (
          <button
            onClick={() => openAuthModal(language)}
            className="w-full bg-[#30363D]/60 hover:bg-[#30363D] text-[#8B949E] hover:text-[#E6EDF3] font-semibold text-sm py-3 rounded-xl transition-all border border-[#30363D]"
          >
            {t.loginBtn}
          </button>
        ) : (
          <button
            onClick={handleSave}
            disabled={!selected || saving || pickLoading}
            className={`w-full font-bold text-sm py-3 rounded-xl transition-all ${
              selected && !saving
                ? 'bg-[#F0A500] hover:bg-[#D4920A] text-[#0D1117] shadow-lg shadow-[#F0A500]/20'
                : 'bg-[#30363D]/50 text-[#8B949E] cursor-not-allowed'
            }`}
          >
            {saving ? t.saving : t.lockBtn}
          </button>
        )}
        <p className="text-center text-[10px] text-[#8B949E]">⭐ {t.points}</p>
      </div>
    </div>
  )
}
