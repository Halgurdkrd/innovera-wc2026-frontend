'use client'

import { useEffect, useState, useMemo, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { useLanguage } from '@/hooks/useLanguage'
import { localizeNum } from '@/lib/numbers'
import TeamCard from '@/components/TeamCard'
import GroupStagePredictions from '@/components/GroupStagePredictions'
import GroupStandingsPreview from '@/components/GroupStandingsPreview'
import BracketPredictions from '@/components/BracketPredictions'
import { supabasePublic } from '@/lib/supabase'
import { API_BASE } from '@/lib/api'
import type {
  GroupStanding, LuckScore, Team, BracketSlot,
  TournamentSimulation, TournamentGroup, TournamentBracketMatch,
} from '@/types'

// ── Raw simulation API shape (before mapping to TournamentSimulation) ────────

interface RawGroupTeam {
  team: string; pts: number; gd: number; gf: number
  avg_pts?: number; avg_gd?: number; avg_gf?: number; expected_rank?: number
}
interface RawAvgGroupTeam {
  team: string; avg_pts: number; avg_gd: number; avg_gf: number
  avg_ga: number; expected_rank: number
  pts?: number; gd?: number; gf?: number
  // pre-tournament API embeds qualify data per-team instead of stage_appearances
  qualify?: number
  qualify_probability?: number
  qualify_prob?: number
}
interface RawMatchResult { team_a?: string; team_b?: string; winner?: string }
interface RawSimulation {
  group_tables?: Record<string, RawGroupTeam[]>
  avg_group_tables?: Record<string, RawAvgGroupTeam[]>
  stage_appearances?: Record<string, Record<string, number>>
  predicted_bracket?: Record<string, RawMatchResult[]> & { champion?: string }
  winner_probs?: Record<string, number>
}

// ── Confederation lookup ───────────────────────────────────────────────────────

const CONFEDERATION_MAP: Record<string, string> = {
  USA: 'CONCACAF', Canada: 'CONCACAF', Mexico: 'CONCACAF',
  Panama: 'CONCACAF', Haiti: 'CONCACAF', Curaçao: 'CONCACAF',
  Brazil: 'CONMEBOL', Argentina: 'CONMEBOL', Uruguay: 'CONMEBOL',
  Colombia: 'CONMEBOL', Ecuador: 'CONMEBOL', Paraguay: 'CONMEBOL',
  Germany: 'UEFA', France: 'UEFA', England: 'UEFA', Spain: 'UEFA',
  Portugal: 'UEFA', Netherlands: 'UEFA', Belgium: 'UEFA',
  Switzerland: 'UEFA', Croatia: 'UEFA', Austria: 'UEFA', Turkey: 'UEFA',
  Scotland: 'UEFA', Norway: 'UEFA', Sweden: 'UEFA',
  'Czech Republic': 'UEFA', 'Bosnia-Herzegovina': 'UEFA',
  Japan: 'AFC', 'South Korea': 'AFC', Australia: 'AFC', Iran: 'AFC',
  'Saudi Arabia': 'AFC', Qatar: 'AFC', Iraq: 'AFC',
  Jordan: 'AFC', Uzbekistan: 'AFC',
  Morocco: 'CAF', Senegal: 'CAF', Egypt: 'CAF', Ghana: 'CAF',
  Tunisia: 'CAF', Algeria: 'CAF', "Côte d'Ivoire": 'CAF',
  'South Africa': 'CAF', 'Cabo Verde': 'CAF', 'Congo DR': 'CAF',
  'New Zealand': 'OFC',
}

const getConfederation = (teamName: string, row: GroupStanding) =>
  row.confederation ?? CONFEDERATION_MAP[teamName] ?? 'Other'

// ── Tabs ──────────────────────────────────────────────────────────────────────

type Tab = 'teams' | 'group_stage' | 'bracket' | 'scorers'

const tabLabels: Record<Tab, { EN: string; KU: string }> = {
  teams:       { EN: 'Teams',        KU: 'تیمەکان'     },
  group_stage: { EN: 'Group Stage',  KU: 'قۆناغی گروپ' },
  bracket:     { EN: 'Bracket',      KU: 'کۆتایی'       },
  scorers:     { EN: 'Scorers',      KU: 'گۆڵکارەکان'   },
}

// ── Confederation chips ───────────────────────────────────────────────────────

const CONFEDERATIONS = ['All', 'UEFA', 'CONMEBOL', 'CONCACAF', 'CAF', 'AFC', 'OFC'] as const
type Conf = typeof CONFEDERATIONS[number]

// ── Labels ────────────────────────────────────────────────────────────────────

const labels = {
  EN: {
    title: 'Explore — Innovera Predictor',
    subtitle: '48 teams · 12 groups · 3 host nations · FIFA World Cup 2026',
    searchPlaceholder: 'Search team or confederation…',
    noResults: 'No teams match your search',
    loading: 'Loading teams…',
    all: 'All',
    teamsCount: (n: number) => `${n} teams`,
  },
  KU: {
    title: 'گەڕان — ئینۆڤێرا پێشبینیکەر',
    subtitle: '٤٨ تیم · ١٢ گروپ · ٣ وڵاتی مێهوان · جامی جیهان ٢٠٢٦',
    searchPlaceholder: 'گەڕان بۆ تیم یان کۆنفیدراسیۆن…',
    noResults: 'هیچ تیمێک نەدۆزرایەوە',
    loading: 'تیمەکان بارکردن…',
    all: 'هەموو',
    teamsCount: (n: number) => `${n} تیم`,
  },
}

// ── Scorers tab inline component ─────────────────────────────────────────────

interface ScorerEntry {
  player_name: string; team: string; position: string
  xg_per90?: number; gls_per90?: number; xag_per90?: number; ast_per90?: number
  rating: number; opponent_factor: number; composite_score: number
}

function ScorersTabContent({ language }: { language: 'EN' | 'KU' }) {
  const [scorersTab, setScorersTab] = useState<'goals' | 'assists'>('goals')
  const [goals, setGoals] = useState<ScorerEntry[]>([])
  const [assists, setAssists] = useState<ScorerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const isKU = language === 'KU'

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`${API_BASE}/scorers/predicted-goals?top=20`).then(r => r.ok ? r.json() : null),
      fetch(`${API_BASE}/scorers/predicted-assists?top=20`).then(r => r.ok ? r.json() : null),
    ]).then(([g, a]) => {
      const norm = (d: unknown) => Array.isArray(d) ? d : ((d as Record<string, unknown>)?.players ?? (d as Record<string, unknown>)?.scorers ?? [])
      setGoals(norm(g) as ScorerEntry[])
      setAssists(norm(a) as ScorerEntry[])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const rows = scorersTab === 'goals' ? goals : assists
  const medal = (i: number) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['goals', 'assists'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setScorersTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              scorersTab === tab
                ? 'bg-[#F0A500] text-[#0D1117]'
                : 'bg-[#161B22] border border-[#30363D] text-[#8B949E] hover:text-[#E6EDF3]'
            }`}
          >
            {tab === 'goals' ? (isKU ? '🏆 باشترین گۆڵکارەکان' : '🏆 Top Scorers') : (isKU ? '🎯 باشترین گۆڵ دروستکارەکان' : '🎯 Top Assists')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 bg-[#161B22] border border-[#30363D] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-10 text-center text-[#8B949E] text-sm">
          {isKU ? 'داتا بەردەست نییە' : 'Scorer predictions not available.'}
        </div>
      ) : (
        <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
          {rows.map((s, i) => {
            const name = s.player_name.replace(/^(GK|DF|MF|FW)\s+/i, '')
            const diffDot = s.opponent_factor > 1.05 ? 'bg-emerald-500' : s.opponent_factor < 0.95 ? 'bg-red-500' : 'bg-yellow-400'
            return (
              <div key={i} className={`flex items-center gap-3 px-4 py-3 border-b border-[#30363D]/40 last:border-0 ${i === 0 ? 'bg-[#F0A500]/5' : ''}`}>
                <span className="text-sm font-bold w-7 text-center text-[#8B949E] flex-shrink-0">{medal(i)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#E6EDF3] truncate">{name}</p>
                  <p className="text-xs text-[#8B949E]">{s.team}</p>
                </div>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${diffDot}`} title="Group difficulty" />
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-[#F0A500]">{s.composite_score.toFixed(2)}</p>
                  <p className="text-[10px] text-[#8B949E]">{isKU ? 'نمرە' : 'Score'}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Transform raw API response → typed TournamentSimulation ──────────────────

const ROUND_MAP: Record<string, string> = {
  R32: 'Round of 32', R16: 'Round of 16',
  QF: 'Quarter-Finals', SF: 'Semi-Finals', Final: 'Final',
}

function buildTournamentSim(
  raw: RawSimulation | null,
  standings: GroupStanding[]
): TournamentSimulation | null {
  if (!raw) return null

  const flagLookup: Record<string, string> = {}
  for (const s of standings) {
    if (s.team_flag) flagLookup[s.team_name] = s.team_flag
  }

  const sourceGroups = raw.avg_group_tables ?? raw.group_tables ?? {}
  const groups: TournamentGroup[] = Object.entries(sourceGroups).map(
    ([group, rawTeams]) => ({
      group,
      teams: (rawTeams as (RawAvgGroupTeam | RawGroupTeam)[]).map((t) => {
        const avg = t as RawAvgGroupTeam
        const single = t as RawGroupTeam
        return {
          team: t.team,
          flag: flagLookup[t.team] ?? '🏳️',
          predicted_pts: avg.avg_pts ?? single.avg_pts ?? single.pts ?? 0,
          predicted_gd:  avg.avg_gd  ?? single.avg_gd  ?? single.gd  ?? 0,
          predicted_gf:  avg.avg_gf  ?? single.avg_gf  ?? single.gf  ?? 0,
          expected_rank: avg.expected_rank ?? undefined,
          qualify_prob: raw.stage_appearances?.[t.team]?.R32
            ?? avg.qualify
            ?? avg.qualify_probability
            ?? avg.qualify_prob
            ?? 0.5,
        }
      }),
    })
  )

  const bracket: TournamentBracketMatch[] = []
  for (const [key, name] of Object.entries(ROUND_MAP)) {
    const matches: RawMatchResult[] = raw.predicted_bracket?.[key] ?? []
    matches.forEach((m, idx) => {
      bracket.push({
        round: name,
        slot_number: idx + 1,
        team_a: m.team_a,
        team_a_flag: m.team_a ? (flagLookup[m.team_a] ?? '🏳️') : undefined,
        team_b: m.team_b,
        team_b_flag: m.team_b ? (flagLookup[m.team_b] ?? '🏳️') : undefined,
        predicted_winner: m.winner,
      })
    })
  }

  const probs = raw.winner_probs ?? {}
  const topEntry = Object.entries(probs).sort(([, a], [, b]) => b - a)[0]
  const champion = topEntry?.[0] ?? raw.predicted_bracket?.champion

  return {
    groups,
    bracket,
    predicted_champion: champion
      ? { team: champion, flag: flagLookup[champion], probability: probs[champion] ?? 0 }
      : undefined,
    winner_probs: probs,
    flag_map: flagLookup,
  }
}

// ── Inner page component (uses useSearchParams — must be inside Suspense) ─────

function ExplorePageContent() {
  const searchParams = useSearchParams()
  const { language, changeLanguage } = useLanguage()
  const [activeTab, setActiveTab] = useState<Tab>('teams')
  const tabsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const tab = searchParams.get('tab') as Tab | null
    if (tab && tab in tabLabels) {
      setActiveTab(tab)
      setTimeout(() => {
        tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [searchParams])

  const [standings, setStandings] = useState<GroupStanding[]>([])
  const [luckScores, setLuckScores] = useState<LuckScore[]>([])
  const [bracketSlots, setBracketSlots] = useState<BracketSlot[]>([])
  const [rawLiveSim, setRawLiveSim] = useState<RawSimulation | null>(null)
  const [rawPreSim, setRawPreSim] = useState<RawSimulation | null>(null)
  const [predTab, setPredTab] = useState<'live' | 'pre'>('live')
  const [loading, setLoading] = useState(true)
  const [simLoading, setSimLoading] = useState(true)
  const [preSimLoading, setPreSimLoading] = useState(true)

  const simulation = useMemo(() => buildTournamentSim(rawLiveSim, standings), [rawLiveSim, standings])
  const preSim    = useMemo(() => buildTournamentSim(rawPreSim, standings), [rawPreSim, standings])

  // qualify% delta: live minus pre-tournament, only for teams that have actually played
  const qualifyDiff = useMemo<Record<string, number>>(() => {
    if (!simulation || !preSim) return {}
    const playedTeams = new Set(standings.filter((r) => r.played > 0).map((r) => r.team_name))
    const preMap: Record<string, number> = {}
    for (const g of (preSim.groups ?? [])) {
      for (const t of (g.teams ?? [])) preMap[t.team] = t.qualify_prob
    }
    const diff: Record<string, number> = {}
    for (const g of (simulation.groups ?? [])) {
      for (const t of (g.teams ?? [])) {
        if (!playedTeams.has(t.team)) continue  // skip teams that haven't played yet
        if (preMap[t.team] != null) diff[t.team] = t.qualify_prob - preMap[t.team]
      }
    }
    return diff
  }, [simulation, preSim, standings])

  const [search, setSearch] = useState('')
  const [confFilter, setConfFilter] = useState<Conf>('All')

  const t = labels[language]

  const ENABLE_LUCK_SCORES = true
  const ENABLE_BRACKET     = false

  // ── Fetch Supabase data ───────────────────────────────────────────────────
  useEffect(() => {
    const lastFetch = { at: 0 }
    async function fetchData() {
      lastFetch.at = Date.now()
      setLoading(true)
      try {
        const { data } = await supabasePublic
          .from('group_standings')
          .select('*')
          .order('group_name')
          .order('position')
        if (data) setStandings(data as GroupStanding[])
      } catch (err) {
        console.error('[explore] standings fetch error:', err)
      } finally {
        setLoading(false)
      }

      if (ENABLE_LUCK_SCORES) {
        void (async () => {
          try {
            const { data, error } = await supabasePublic.from('luck_scores').select('*')
            if (!error && data) setLuckScores(data as LuckScore[])
          } catch { /* unavailable */ }
        })()
      }

      if (ENABLE_BRACKET) {
        void (async () => {
          try {
            const { data, error } = await supabasePublic.from('bracket').select('*').order('round')
            if (!error && data) setBracketSlots(data as BracketSlot[])
          } catch { /* table not created yet */ }
        })()
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
  }, [])

  // ── Fetch live simulation ─────────────────────────────────────────────────
  useEffect(() => {
    const ctrl = new AbortController()
    const tid = setTimeout(() => ctrl.abort(), 10000)

    fetch(`${API_BASE}/simulate/tournament`, { signal: ctrl.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: RawSimulation | null) => { clearTimeout(tid); setRawLiveSim(data ?? null) })
      .catch(() => clearTimeout(tid))
      .finally(() => setSimLoading(false))

    return () => { ctrl.abort(); clearTimeout(tid) }
  }, [])

  // ── Fetch pre-tournament snapshot ─────────────────────────────────────────
  useEffect(() => {
    const ctrl = new AbortController()
    const tid = setTimeout(() => ctrl.abort(), 10000)

    fetch(`${API_BASE}/simulate/tournament?mode=pre_tournament`, { signal: ctrl.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: RawSimulation | null) => {
        clearTimeout(tid)
        setRawPreSim(data ?? null)
      })
      .catch(() => clearTimeout(tid))
      .finally(() => setPreSimLoading(false))

    return () => { ctrl.abort(); clearTimeout(tid) }
  }, [])

  // ── Derive teams from standings ───────────────────────────────────────────
  const teams = useMemo<Team[]>(() => {
    if (!standings.length) return []

    const luckMap: Record<string, number[]> = {}
    for (const ls of luckScores) {
      if (!luckMap[ls.team_name]) luckMap[ls.team_name] = []
      luckMap[ls.team_name].push(ls.luck_rating ?? 0)
    }
    const luckAvgMap: Record<string, number> = {}
    for (const [team, scores] of Object.entries(luckMap)) {
      luckAvgMap[team] = scores.reduce((a, b) => a + b, 0) / scores.length
    }

    const seen = new Map<string, Team>()
    for (const row of standings) {
      if (!seen.has(row.team_name)) {
        seen.set(row.team_name, {
          name: row.team_name,
          flag: row.team_flag,
          group_name: row.group_name,
          confederation: getConfederation(row.team_name, row),
          position: row.position,
          played: row.played,
          won: row.won,
          drawn: row.drawn,
          lost: row.lost,
          points: row.points,
          goals_for: row.goals_for,
          goals_against: row.goals_against,
          goal_difference: row.goal_difference,
          luck_avg: luckAvgMap[row.team_name],
        })
      }
    }
    return Array.from(seen.values()).sort(
      (a, b) =>
        (a.group_name ?? '').localeCompare(b.group_name ?? '') ||
        (a.position ?? 99) - (b.position ?? 99)
    )
  }, [standings, luckScores])

  // ── Filter teams ──────────────────────────────────────────────────────────
  const filteredTeams = useMemo(() => {
    const q = search.toLowerCase()
    return teams.filter((t) => {
      const matchesSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        (t.confederation ?? '').toLowerCase().includes(q) ||
        (t.group_name ?? '').toLowerCase().includes(q)
      const matchesConf = confFilter === 'All' || t.confederation === confFilter
      return matchesSearch && matchesConf
    })
  }, [teams, search, confFilter])

  // ── Filter standings to groups with at least one match played ────────────
  const playedStandings = useMemo(() => {
    const playedGroups = new Set(standings.filter((r) => r.played > 0).map((r) => r.group_name))
    return standings.filter((r) => playedGroups.has(r.group_name))
  }, [standings])

  // ── Champion probability deltas ───────────────────────────────────────────
  const liveWinnerProbs = simulation?.winner_probs ?? {}
  const preWinnerProbs  = preSim?.winner_probs ?? {}
  const topChampions = Object.entries(liveWinnerProbs)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)

  return (
    <div className="min-h-screen bg-[#0D1117]">
      <Navbar language={language} onLanguageChange={changeLanguage} />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#E6EDF3]">{t.title}</h1>
          <p className="text-sm text-[#8B949E]">{t.subtitle}</p>
        </div>

        {/* Tabs */}
        <div ref={tabsRef} className="flex items-center gap-1 bg-[#161B22] border border-[#30363D] p-1 rounded-xl w-fit">
          {(Object.keys(tabLabels) as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === tab
                  ? 'bg-[#F0A500] text-[#0D1117]'
                  : 'text-[#8B949E] hover:text-[#E6EDF3]'
              }`}
            >
              {tabLabels[tab][language]}
            </button>
          ))}
        </div>

        {/* ── Teams tab ─────────────────────────────────────────────────── */}
        {activeTab === 'teams' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8B949E]"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="w-full bg-[#161B22] border border-[#30363D] rounded-lg pl-10 pr-4 py-2.5 text-sm text-[#E6EDF3] placeholder-[#8B949E] focus:border-[#F0A500] focus:outline-none transition-colors"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {CONFEDERATIONS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setConfFilter(c)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                      confFilter === c
                        ? 'bg-[#F0A500] border-[#F0A500] text-[#0D1117]'
                        : 'bg-[#161B22] border-[#30363D] text-[#8B949E] hover:border-[#F0A500]/50 hover:text-[#E6EDF3]'
                    }`}
                  >
                    {c === 'All' ? t.all : c}
                  </button>
                ))}
              </div>
            </div>

            {!loading && (
              <p className="text-xs text-[#8B949E]">{localizeNum(t.teamsCount(filteredTeams.length), language)}</p>
            )}

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div key={i} className="h-28 rounded-xl bg-[#161B22] border border-[#30363D] animate-pulse" />
                ))}
              </div>
            ) : filteredTeams.length === 0 ? (
              <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-12 text-center">
                <span className="text-4xl">🔍</span>
                <p className="mt-3 text-[#8B949E]">{t.noResults}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {filteredTeams.map((team) => (
                  <TeamCard key={team.name} team={team} language={language} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Group Stage tab ───────────────────────────────────────────── */}
        {activeTab === 'group_stage' && (
          <div className="space-y-10">
            {/* AI simulation with dual pre-tournament / live view */}
            <div className="space-y-4">
              {/* Dual-view tab toggle */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-1 bg-[#161B22] border border-[#30363D] p-1 rounded-xl w-fit">
                  {(['live', 'pre'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setPredTab(mode)}
                      className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                        predTab === mode
                          ? 'bg-[#F0A500] text-[#0D1117]'
                          : 'text-[#8B949E] hover:text-[#E6EDF3]'
                      }`}
                    >
                      {mode === 'live'
                        ? (language === 'KU' ? '📊 نوێکراوە' : '📊 Live Updated')
                        : (language === 'KU' ? '🔮 پێشبینی AI پێش تواناکارییەکان' : '🔮 Pre-Tournament AI')}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[#8B949E]">
                  {predTab === 'live'
                    ? (language === 'KU' ? 'نوێکراوە بە ئەنجامی ڕاستەقینەی یارییەکان' : 'Updated with real match results')
                    : (language === 'KU' ? 'پێشبینی AIـی پێش تواناکارییەکان — هەرگیز نابدرێتەوە' : "Frozen snapshot — our AI's original predictions before any matches")}
                </p>
              </div>

              {/* Champion probability changes — only on Live tab when both datasets loaded */}
              {predTab === 'live' && topChampions.length > 0 && Object.keys(preWinnerProbs).length > 0 && (
                <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4">
                  <p className="text-[10px] font-bold text-[#8B949E] uppercase tracking-wider mb-3">
                    {language === 'KU' ? '🏆 گۆڕانکاری پێشبینی بەرپیاو' : '🏆 Champion Probability Changes'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {topChampions.map(([team, liveProb]) => {
                      const preProb = preWinnerProbs[team] ?? 0
                      const delta = liveProb - preProb
                      const livePct = (liveProb * 100).toFixed(1)
                      const absDeltaPct = (Math.abs(delta) * 100).toFixed(1)
                      const flag = simulation?.flag_map?.[team] ?? '🏳️'
                      return (
                        <div
                          key={team}
                          className="flex items-center gap-1.5 bg-[#0D1117] border border-[#30363D] rounded-lg px-3 py-2"
                        >
                          <span className="text-sm">{flag}</span>
                          <span className="text-xs font-semibold text-[#E6EDF3]">{team}</span>
                          <span className="text-xs font-bold text-[#F0A500] tabular-nums">{localizeNum(livePct, language)}%</span>
                          {Math.abs(delta) * 100 >= 0.1 && (
                            <span className={`text-[10px] font-bold tabular-nums ${delta > 0 ? 'text-[#2EA043]' : 'text-[#F85149]'}`}>
                              {delta > 0 ? '↑' : '↓'}{localizeNum(absDeltaPct, language)}%
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <GroupStagePredictions
                groups={(predTab === 'live' ? simulation : preSim)?.groups ?? []}
                stageAppearances={(predTab === 'live' ? rawLiveSim : rawPreSim)?.stage_appearances ?? {}}
                standings={standings}
                loading={loading || (predTab === 'live' ? simLoading : preSimLoading)}
                language={language}
                qualifyDiff={predTab === 'live' ? qualifyDiff : undefined}
              />
            </div>

            {/* Real Group Standings — always visible, only groups with matches played */}
            {playedStandings.length > 0 && (
              <GroupStandingsPreview
                standings={playedStandings}
                language={language}
                loading={loading}
                maxGroups={12}
                title={language === 'KU' ? 'خشتەی ڕاستەقینەی گرووپەکان' : 'Real Group Standings'}
              />
            )}
          </div>
        )}

        {/* ── Bracket tab ───────────────────────────────────────────────── */}
        {activeTab === 'bracket' && (() => {
          const BRACKET_LOCK_DATE = new Date('2026-06-28T23:59:59Z')
          const bracketLocked = Date.now() >= BRACKET_LOCK_DATE.getTime()
          return (
            <div className="space-y-4">
              {bracketLocked ? (
                <div className="flex items-center gap-3 bg-[#30363D]/40 border border-[#30363D] rounded-xl px-4 py-3">
                  <span className="text-xl flex-shrink-0">🔒</span>
                  <p className="text-sm font-semibold text-[#8B949E]">
                    {language === 'KU'
                      ? 'بریکەت قفڵکرا — قۆناغی گروپ تەواو بووە'
                      : 'Bracket locked — group stage complete'}
                  </p>
                </div>
              ) : (
                <div className="bg-[#F0A500]/8 border border-[#F0A500]/40 rounded-xl px-4 py-4 flex gap-3">
                  <span className="text-2xl flex-shrink-0 mt-0.5">🔮</span>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-[#F0A500]">
                      {language === 'KU' ? 'دۆخی پێشبینی' : 'Preview Mode'}
                    </p>
                    <p className="text-xs text-[#8B949E] leading-relaxed">
                      {language === 'KU'
                        ? 'ئەم بریکەتە لەسەر بنەمای ئەنجامی پێشبینیکراوی گرووپەکانە. دەتوانیت ئێستا هەڵبژاردن بکەیت بۆ خۆشی، بەڵام بریکەتەکە نوێ دەبێتەوە بە تیمە ڕاستەقینەکان دوای تەواوبوونی قۆناغی گرووپەکان (٢٨ی حوزەیران). هەڵبژاردنەکانت ڕیسێت دەبنەوە.'
                        : 'This bracket is based on AI-predicted group results. You can make picks now for fun, but the bracket will update with real qualified teams after the group stage ends (June 28). Your picks will reset when the real bracket is set.'}
                    </p>
                  </div>
                </div>
              )}
              <BracketPredictions
                simulation={simulation}
                realSlots={bracketSlots}
                loading={loading || simLoading}
                language={language}
              />
            </div>
          )
        })()}

        {/* ── Scorers tab ───────────────────────────────────────────────── */}
        {activeTab === 'scorers' && (
          <ScorersTabContent language={language} />
        )}
      </main>
    </div>
  )
}

// ── Suspense boundary required by useSearchParams in Next.js App Router ───────

export default function ExplorePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0D1117]" />}>
      <ExplorePageContent />
    </Suspense>
  )
}
