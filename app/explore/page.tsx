'use client'

import { useEffect, useState, useMemo, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { useLanguage } from '@/hooks/useLanguage'
import TeamCard from '@/components/TeamCard'
import GroupStagePredictions from '@/components/GroupStagePredictions'
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
  // single-run fields present for compat but prefer avg_*
  pts?: number; gd?: number; gf?: number
}
interface RawMatchResult { team_a?: string; team_b?: string; winner?: string }
interface RawSimulation {
  group_tables?: Record<string, RawGroupTeam[]>
  avg_group_tables?: Record<string, RawAvgGroupTeam[]>   // averages across all simulations
  stage_appearances?: Record<string, Record<string, number>>
  predicted_bracket?: Record<string, RawMatchResult[]> & { champion?: string }
  winner_probs?: Record<string, number>
}

// ── Confederation lookup ───────────────────────────────────────────────────────

const CONFEDERATION_MAP: Record<string, string> = {
  // CONCACAF
  USA: 'CONCACAF', Canada: 'CONCACAF', Mexico: 'CONCACAF',
  Panama: 'CONCACAF', Haiti: 'CONCACAF', Curaçao: 'CONCACAF',
  // CONMEBOL
  Brazil: 'CONMEBOL', Argentina: 'CONMEBOL', Uruguay: 'CONMEBOL',
  Colombia: 'CONMEBOL', Ecuador: 'CONMEBOL', Paraguay: 'CONMEBOL',
  // UEFA
  Germany: 'UEFA', France: 'UEFA', England: 'UEFA', Spain: 'UEFA',
  Portugal: 'UEFA', Netherlands: 'UEFA', Belgium: 'UEFA',
  Switzerland: 'UEFA', Croatia: 'UEFA', Austria: 'UEFA', Turkey: 'UEFA',
  Scotland: 'UEFA', Norway: 'UEFA', Sweden: 'UEFA',
  'Czech Republic': 'UEFA', 'Bosnia-Herzegovina': 'UEFA',
  // AFC
  Japan: 'AFC', 'South Korea': 'AFC', Australia: 'AFC', Iran: 'AFC',
  'Saudi Arabia': 'AFC', Qatar: 'AFC', Iraq: 'AFC',
  Jordan: 'AFC', Uzbekistan: 'AFC',
  // CAF
  Morocco: 'CAF', Senegal: 'CAF', Egypt: 'CAF', Ghana: 'CAF',
  Tunisia: 'CAF', Algeria: 'CAF', "Côte d'Ivoire": 'CAF',
  'South Africa': 'CAF', 'Cabo Verde': 'CAF', 'Congo DR': 'CAF',
  // OFC
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
      {/* Sub-tab toggle */}
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

// ── Inner page component (uses useSearchParams — must be inside Suspense) ─────

function ExplorePageContent() {
  const searchParams = useSearchParams()
  const { language, changeLanguage } = useLanguage()
  const [activeTab, setActiveTab] = useState<Tab>('teams')
  const tabsRef = useRef<HTMLDivElement>(null)

  // Re-runs whenever the URL search params change (works with client-side <Link> navigation)
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
  const [rawSim, setRawSim] = useState<RawSimulation | null>(null)
  const [loading, setLoading] = useState(true)
  const [simLoading, setSimLoading] = useState(true)

  // Transform raw API response into typed TournamentSimulation whenever
  // either the raw API data or the standings (flags) change.
  const simulation = useMemo<TournamentSimulation | null>(() => {
    if (!rawSim) return null

    const flagLookup: Record<string, string> = {}
    for (const s of standings) {
      if (s.team_flag) flagLookup[s.team_name] = s.team_flag
    }

    // Prefer avg_group_tables (averages across all runs) over group_tables (single run)
    const sourceGroups = rawSim.avg_group_tables ?? rawSim.group_tables ?? {}
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
            qualify_prob: rawSim.stage_appearances?.[t.team]?.R32 ?? 0.5,
          }
        }),
      })
    )

    const ROUND_MAP: Record<string, string> = {
      R32: 'Round of 32', R16: 'Round of 16',
      QF: 'Quarter-Finals', SF: 'Semi-Finals', Final: 'Final',
    }
    const bracket: TournamentBracketMatch[] = []
    for (const [key, name] of Object.entries(ROUND_MAP)) {
      const matches: RawMatchResult[] = rawSim.predicted_bracket?.[key] ?? []
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

    const probs = rawSim.winner_probs ?? {}
    // Use the highest-probability team from the aggregate, not the last single-run winner
    const topEntry = Object.entries(probs).sort(([, a], [, b]) => b - a)[0]
    const champion = topEntry?.[0] ?? rawSim.predicted_bracket?.champion
    return {
      groups,
      bracket,
      predicted_champion: champion
        ? { team: champion, flag: flagLookup[champion], probability: probs[champion] ?? 0 }
        : undefined,
      winner_probs: probs,
      flag_map: flagLookup,
    }
  }, [rawSim, standings])

  const [search, setSearch] = useState('')
  const [confFilter, setConfFilter] = useState<Conf>('All')

  const t = labels[language]

  // ── Feature flags — enable when tables are created and RLS configured ────────
  const ENABLE_LUCK_SCORES = false   // luck_scores table not yet in schema
  const ENABLE_BRACKET     = false   // bracket table not yet in schema

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

  // ── Fetch tournament simulation (10 s timeout so simLoading never hangs) ──
  useEffect(() => {
    const ctrl = new AbortController()
    const tid = setTimeout(() => ctrl.abort(), 10000)

    fetch(`${API_BASE}/simulate/tournament`, { signal: ctrl.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: RawSimulation | null) => { clearTimeout(tid); setRawSim(data ?? null) })
      .catch(() => clearTimeout(tid))
      .finally(() => setSimLoading(false))

    return () => { ctrl.abort(); clearTimeout(tid) }
  }, [])

  // ── Derive teams from standings ───────────────────────────────────────────
  const teams = useMemo<Team[]>(() => {
    if (!standings.length) return []

    const luckMap: Record<string, number[]> = {}
    for (const ls of luckScores) {
      if (!luckMap[ls.team_name]) luckMap[ls.team_name] = []
      luckMap[ls.team_name].push(ls.luck_score)
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
            {/* Search + filter row */}
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
              <p className="text-xs text-[#8B949E]">{t.teamsCount(filteredTeams.length)}</p>
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
          <GroupStagePredictions
            groups={simulation?.groups ?? []}
            stageAppearances={rawSim?.stage_appearances ?? {}}
            standings={standings}
            loading={loading || simLoading}
            language={language}
          />
        )}

        {/* ── Bracket tab ───────────────────────────────────────────────── */}
        {activeTab === 'bracket' && (
          <BracketPredictions
            simulation={simulation}
            realSlots={bracketSlots}
            loading={loading || simLoading}
            language={language}
          />
        )}

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
