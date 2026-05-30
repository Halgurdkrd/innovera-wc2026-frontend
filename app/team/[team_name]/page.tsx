'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { useLanguage } from '@/hooks/useLanguage'
import { supabase } from '@/lib/supabase'
import { Sk } from '@/components/SkeletonCard'
import type { Match, GroupStanding } from '@/types'
import { API_BASE } from '@/lib/api'

// ── Static maps ───────────────────────────────────────────────────────────────

const FLAG_MAP: Record<string, string> = {
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

const CONF_MAP: Record<string, string> = {
  USA: 'CONCACAF', Canada: 'CONCACAF', Mexico: 'CONCACAF', Panama: 'CONCACAF',
  Haiti: 'CONCACAF', 'Curaçao': 'CONCACAF',
  Brazil: 'CONMEBOL', Argentina: 'CONMEBOL', Uruguay: 'CONMEBOL',
  Colombia: 'CONMEBOL', Ecuador: 'CONMEBOL', Paraguay: 'CONMEBOL',
  Germany: 'UEFA', France: 'UEFA', England: 'UEFA', Spain: 'UEFA',
  Portugal: 'UEFA', Netherlands: 'UEFA', Belgium: 'UEFA', Switzerland: 'UEFA',
  Croatia: 'UEFA', Austria: 'UEFA', Turkey: 'UEFA', Scotland: 'UEFA',
  Norway: 'UEFA', Sweden: 'UEFA', 'Czech Republic': 'UEFA', 'Bosnia-Herzegovina': 'UEFA',
  Japan: 'AFC', 'South Korea': 'AFC', Australia: 'AFC', Iran: 'AFC',
  'Saudi Arabia': 'AFC', Qatar: 'AFC', Iraq: 'AFC', Jordan: 'AFC', Uzbekistan: 'AFC',
  Morocco: 'CAF', Senegal: 'CAF', Egypt: 'CAF', Ghana: 'CAF', Tunisia: 'CAF',
  Algeria: 'CAF', "Côte d'Ivoire": 'CAF', 'South Africa': 'CAF',
  'Cabo Verde': 'CAF', 'Congo DR': 'CAF', 'New Zealand': 'OFC',
}

const FIFA_RANKS: Record<string, number> = {
  Argentina: 1, France: 2, Spain: 3, England: 4, Brazil: 5,
  Belgium: 6, Netherlands: 7, Portugal: 8, Colombia: 9, Croatia: 11,
  Morocco: 12, USA: 13, Mexico: 14, Switzerland: 15, Germany: 16,
  Uruguay: 17, Japan: 18, Senegal: 19, Ecuador: 21, Australia: 22,
  'South Korea': 23, Canada: 24, Iran: 25, Austria: 28, Tunisia: 30,
  'Saudi Arabia': 32, Egypt: 32, Turkey: 32, Ghana: 33, Qatar: 35,
  Sweden: 36, 'Czech Republic': 36, Norway: 38, Paraguay: 40,
  Scotland: 42, 'New Zealand': 43, "Côte d'Ivoire": 45, Panama: 46,
  'Bosnia-Herzegovina': 51, 'South Africa': 57, 'Cabo Verde': 64,
  Iraq: 68, 'Congo DR': 72, Jordan: 74, Uzbekistan: 76, Haiti: 79,
  'Curaçao': 82,
}

function styleFromRank(rank: number) {
  if (rank <= 5)  return { style: 'High Press',        setPiece: 'High',   attack: 9, defense: 9, pressing: 9 }
  if (rank <= 10) return { style: 'Possession Based',  setPiece: 'High',   attack: 8, defense: 8, pressing: 8 }
  if (rank <= 15) return { style: 'High Press',        setPiece: 'High',   attack: 8, defense: 7, pressing: 7 }
  if (rank <= 20) return { style: 'Counter Attack',    setPiece: 'Medium', attack: 7, defense: 7, pressing: 6 }
  if (rank <= 30) return { style: 'Direct Play',       setPiece: 'Medium', attack: 6, defense: 6, pressing: 5 }
  if (rank <= 45) return { style: 'Counter Attack',    setPiece: 'Low',    attack: 5, defense: 5, pressing: 5 }
  return           { style: 'Defensive',               setPiece: 'Low',    attack: 4, defense: 5, pressing: 3 }
}

// ── Labels ────────────────────────────────────────────────────────────────────

const L = {
  EN: {
    back: '← Back to Explore',
    group: 'Group',
    fifa: 'FIFA',
    winProb: 'Tournament Win Probability',
    simSub: 'Based on 500 simulations',
    fixtures: 'Group Stage Fixtures',
    style: 'Playing Style',
    attack: 'Attack', defense: 'Defense', pressing: 'Pressing',
    setPiece: 'Set Piece Threat',
    keyPlayers: 'Key Players',
    keyPlayersNA: 'Player data available from June 11',
    form: 'Recent Form',
    formNA: 'Form data available from June 11',
    noFixtures: 'Fixtures not available',
    venue: 'Venue',
    vs: 'vs',
    viewMatch: 'View Match →',
    notFound: 'Team not found.',
  },
  KU: {
    back: '← گەڕانەوە بۆ گەڕان',
    group: 'گروپ',
    fifa: 'FIFA',
    winProb: 'ئەگەری بردنەوەی نازناوەکە',
    simSub: 'لەسەر بنەمای ٥٠٠ شێوەکاری',
    fixtures: 'یارییەکانی قۆناغی گروپ',
    style: 'شێوازی یاری',
    attack: 'ئێڕش', defense: 'بەرگری', pressing: 'فشار',
    setPiece: 'مەترسی تۆپی کوێستە',
    keyPlayers: 'لاعبانی گرنگ',
    keyPlayersNA: 'داتای لاعبان لە ١١ی حوزەیران بەردەست دەبێت',
    form: 'فۆرمی ئاخری',
    formNA: 'داتای فۆرم لە ١١ی حوزەیران بەردەست دەبێت',
    noFixtures: 'یارییەکان بەردەست نیە',
    venue: 'زەوی',
    vs: 'دژ بە',
    viewMatch: 'بینینی یاری →',
    notFound: 'تیم نەدۆزرایەوە.',
  },
}

// ── Sub-components ────────────────────────────────────────────────────────────

function RatingBar({ label, value, max = 10 }: { label: string; value: number; max?: number }) {
  const pct = (value / max) * 100
  const color = value >= 8 ? '#2EA043' : value >= 6 ? '#F0A500' : '#8B949E'
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[#8B949E] w-20 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-[#30363D] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-bold tabular-nums flex-shrink-0" style={{ color }}>
        {value}/{max}
      </span>
    </div>
  )
}

function FixtureCard({ match, teamName, lang }: { match: Match; teamName: string; lang: 'EN' | 'KU' }) {
  const t = L[lang]
  const isHome = match.home_team === teamName
  const opponent = isHome ? match.away_team : match.home_team
  const opponentFlag = FLAG_MAP[opponent] ?? '🏳️'
  const datetime = match.match_date ?? match.match_time
  const dateStr = datetime ? new Date(datetime).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) : ''
  const timeStr = datetime ? new Date(datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
  const matchId = match.match_id ?? match.id

  return (
    <Link
      href={`/match/${matchId}`}
      className="block bg-[#161B22] border border-[#30363D] rounded-xl p-4 hover:border-[#F0A500]/50 hover:bg-[#1C2128] transition-all"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <span className="text-2xl flex-shrink-0">{opponentFlag}</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#E6EDF3] truncate">
              {isHome ? `${t.vs} ${opponent}` : `${t.vs} ${opponent}`}
            </p>
            <p className="text-xs text-[#8B949E]">{dateStr} · {timeStr}</p>
            {match.venue && <p className="text-xs text-[#8B949E] truncate">{match.venue}</p>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-[10px] font-bold text-[#8B949E] bg-[#0D1117] border border-[#30363D] px-2 py-0.5 rounded-full">
            {isHome ? 'HOME' : 'AWAY'}
          </span>
          <span className="text-[10px] text-[#F0A500]">{t.viewMatch}</span>
        </div>
      </div>
    </Link>
  )
}

function TeamSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-6 space-y-4">
        <Sk className="h-20 w-20 rounded-full mx-auto" />
        <Sk className="h-8 w-48 mx-auto" />
        <div className="flex justify-center gap-2">
          <Sk className="h-6 w-20 rounded-full" />
          <Sk className="h-6 w-16 rounded-full" />
        </div>
      </div>
      {/* Win prob */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-3">
        <Sk className="h-5 w-48" />
        <Sk className="h-10 w-24" />
        <Sk className="h-3 w-full rounded-full" />
      </div>
      {/* Fixtures */}
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-[#161B22] border border-[#30363D] rounded-xl p-4 flex items-center gap-3">
          <Sk className="h-10 w-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Sk className="h-4 w-32" />
            <Sk className="h-3 w-44" />
          </div>
        </div>
      ))}
      {/* Style */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-3">
        <Sk className="h-5 w-32" />
        {[1, 2, 3].map(i => <Sk key={i} className="h-3 w-full rounded-full" />)}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TeamProfilePage() {
  const { language, changeLanguage } = useLanguage()
  const router = useRouter()
  const routeParams = useParams()
  const teamName = decodeURIComponent(routeParams.team_name as string)
  const t = L[language]

  const [standing, setStanding] = useState<GroupStanding | null>(null)
  const [fixtures, setFixtures] = useState<Match[]>([])
  const [winProb, setWinProb] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const flag = FLAG_MAP[teamName] ?? '🏳️'
  const confederation = CONF_MAP[teamName] ?? 'FIFA'
  const fifaRank = FIFA_RANKS[teamName] ?? null
  const styleData = fifaRank ? styleFromRank(fifaRank) : null

  useEffect(() => {
    if (!teamName) return
    async function fetchData() {
      setLoading(true)
      try {
        // Standing + fixtures in parallel
        const [standingRes, fixturesRes] = await Promise.all([
          supabase.from('group_standings').select('*').eq('team_name', teamName).maybeSingle(),
          supabase
            .from('matches')
            .select('*')
            .or(`home_team.eq.${teamName},away_team.eq.${teamName}`)
            .order('match_date'),
        ])
        if (standingRes.data) setStanding(standingRes.data as GroupStanding)
        if (fixturesRes.data) setFixtures(fixturesRes.data as Match[])
      } catch (err) {
        console.error('[team-profile] Supabase error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [teamName])

  // Fetch win probability from HF API — non-blocking, 10s timeout
  useEffect(() => {
    const apiUrl = API_BASE
    if (!teamName) return
    const controller = new AbortController()
    const tid = setTimeout(() => controller.abort(), 10000)
    fetch(`${apiUrl}/simulate/tournament`, { signal: controller.signal })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.winner_probs) {
          const prob = data.winner_probs[teamName] ?? 0
          setWinProb(prob)
        }
      })
      .catch(() => {})
      .finally(() => clearTimeout(tid))
    return () => { controller.abort(); clearTimeout(tid) }
  }, [teamName])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D1117]">
        <Navbar language={language} onLanguageChange={changeLanguage} />
        <main className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">
          <button onClick={() => router.back()} className="text-sm text-[#8B949E] hover:text-[#F0A500] transition-colors">
            {t.back}
          </button>
          <TeamSkeleton />
        </main>
      </div>
    )
  }

  if (!teamName) {
    return (
      <div className="min-h-screen bg-[#0D1117]">
        <Navbar language={language} onLanguageChange={changeLanguage} />
        <div className="mx-auto max-w-2xl px-4 py-24 text-center">
          <p className="text-[#8B949E]">{t.notFound}</p>
        </div>
      </div>
    )
  }

  const groupName = standing?.group_name ?? null
  const probPct = winProb != null ? (winProb * 100) : null

  return (
    <div className="min-h-screen bg-[#0D1117]">
      <Navbar language={language} onLanguageChange={changeLanguage} />

      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">

        {/* Back */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1 text-sm text-[#8B949E] hover:text-[#F0A500] transition-colors"
        >
          {t.back}
        </button>

        {/* ── S1: Team Header ─────────────────────────────────────────────── */}
        <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-6 text-center space-y-4">
          <span className="text-7xl leading-none block">{flag}</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#E6EDF3]">{teamName}</h1>
          <div className="flex items-center justify-center flex-wrap gap-2">
            {groupName && (
              <span className="text-xs font-semibold text-[#F0A500] bg-[#F0A500]/10 border border-[#F0A500]/30 px-3 py-1 rounded-full">
                {t.group} {groupName}
              </span>
            )}
            <span className="text-xs font-semibold text-[#58A6FF] bg-[#58A6FF]/10 border border-[#58A6FF]/30 px-3 py-1 rounded-full">
              {confederation}
            </span>
            {fifaRank && (
              <span className="text-xs font-semibold text-[#8B949E] bg-[#0D1117] border border-[#30363D] px-3 py-1 rounded-full">
                #{fifaRank} {t.fifa}
              </span>
            )}
          </div>
          {/* Live standing row */}
          {standing && standing.played > 0 && (
            <div className="flex items-center justify-center gap-4 text-sm border-t border-[#30363D] pt-4">
              {[
                { v: standing.played,          label: language === 'KU' ? 'یاری' : 'P' },
                { v: standing.won,             label: language === 'KU' ? 'بردوو' : 'W' },
                { v: standing.drawn,           label: language === 'KU' ? 'یەکسان' : 'D' },
                { v: standing.lost,            label: language === 'KU' ? 'دەرباز' : 'L' },
                { v: standing.goal_difference, label: 'GD' },
                { v: standing.points,          label: language === 'KU' ? 'خاڵ' : 'Pts', gold: true },
              ].map(({ v, label, gold }) => (
                <div key={label} className="flex flex-col items-center">
                  <span className={`text-base font-bold ${gold ? 'text-[#F0A500]' : 'text-[#E6EDF3]'}`}>
                    {v >= 0 ? (label === 'GD' && v > 0 ? '+' : '') : ''}{v}
                  </span>
                  <span className="text-[10px] text-[#8B949E]">{label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── S2: Tournament Win Probability ──────────────────────────────── */}
        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-4">
          <div>
            <h2 className="text-base font-bold text-[#E6EDF3]">{t.winProb}</h2>
            <p className="text-xs text-[#8B949E] mt-0.5">{t.simSub}</p>
          </div>
          {winProb === null ? (
            <div className="space-y-3">
              <Sk className="h-10 w-20 rounded" />
              <Sk className="h-2 w-full rounded-full" />
            </div>
          ) : (
            <>
              <p className="text-4xl font-extrabold text-[#F0A500]">
                {probPct! > 0 ? `${probPct!.toFixed(1)}%` : '<1%'}
              </p>
              <div className="h-3 rounded-full bg-[#30363D] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#F0A500] transition-all duration-1000"
                  style={{ width: probPct! > 0 ? `${Math.min(100, probPct! * 5)}%` : '1%' }}
                />
              </div>
            </>
          )}
        </div>

        {/* ── S3: Group Fixtures ───────────────────────────────────────────── */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-[#E6EDF3]">{t.fixtures}</h2>
          {fixtures.length === 0 ? (
            <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-6 text-center text-sm text-[#8B949E]">
              {t.noFixtures}
            </div>
          ) : (
            <div className="space-y-2">
              {fixtures.map(m => (
                <FixtureCard key={m.match_id ?? m.id} match={m} teamName={teamName} lang={language} />
              ))}
            </div>
          )}
        </section>

        {/* ── S4: Playing Style ────────────────────────────────────────────── */}
        {styleData && (
          <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#E6EDF3]">{t.style}</h2>
              <span className="text-xs font-bold text-[#F0A500] bg-[#F0A500]/10 border border-[#F0A500]/30 px-2.5 py-1 rounded-full">
                {styleData.style}
              </span>
            </div>
            <div className="space-y-3">
              <RatingBar label={t.attack}   value={styleData.attack}   />
              <RatingBar label={t.defense}  value={styleData.defense}  />
              <RatingBar label={t.pressing} value={styleData.pressing} />
            </div>
            <div className="flex items-center justify-between border-t border-[#30363D] pt-3">
              <span className="text-xs text-[#8B949E]">{t.setPiece}</span>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                styleData.setPiece === 'High'
                  ? 'text-[#F0A500] bg-[#F0A500]/10 border-[#F0A500]/30'
                  : styleData.setPiece === 'Medium'
                  ? 'text-[#8B949E] bg-[#30363D]/50 border-[#30363D]'
                  : 'text-[#8B949E]/60 bg-transparent border-[#30363D]/50'
              }`}>
                {styleData.setPiece}
              </span>
            </div>
          </div>
        )}

        {/* ── S5: Key Players ──────────────────────────────────────────────── */}
        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-3">
          <h2 className="text-base font-bold text-[#E6EDF3]">{t.keyPlayers}</h2>
          <div className="flex items-center gap-3 py-2">
            <span className="text-2xl">👥</span>
            <p className="text-sm text-[#8B949E]">{t.keyPlayersNA}</p>
          </div>
        </div>

        {/* ── S6: Recent Form ───────────────────────────────────────────────── */}
        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-3">
          <h2 className="text-base font-bold text-[#E6EDF3]">{t.form}</h2>
          <div className="flex items-center gap-3 py-2">
            <span className="text-2xl">📊</span>
            <p className="text-sm text-[#8B949E]">{t.formNA}</p>
          </div>
        </div>

      </main>
    </div>
  )
}
