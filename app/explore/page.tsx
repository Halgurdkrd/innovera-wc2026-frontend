'use client'

import { useEffect, useState, useMemo } from 'react'
import Navbar, { type Language } from '@/components/Navbar'
import TeamCard from '@/components/TeamCard'
import TeamProfile from '@/components/TeamProfile'
import FullStandings from '@/components/FullStandings'
import Bracket from '@/components/Bracket'
import { supabase } from '@/lib/supabase'
import type { GroupStanding, LuckScore, Team, BracketSlot } from '@/types'

// ── Confederation lookup (best-effort; falls back to group standing field) ─────

const CONFEDERATION_MAP: Record<string, string> = {
  // CONCACAF (host nations + others)
  USA: 'CONCACAF', Canada: 'CONCACAF', Mexico: 'CONCACAF',
  'Costa Rica': 'CONCACAF', Honduras: 'CONCACAF', Jamaica: 'CONCACAF',
  Panama: 'CONCACAF', Haiti: 'CONCACAF',
  // CONMEBOL
  Brazil: 'CONMEBOL', Argentina: 'CONMEBOL', Uruguay: 'CONMEBOL',
  Colombia: 'CONMEBOL', Chile: 'CONMEBOL', Ecuador: 'CONMEBOL',
  Peru: 'CONMEBOL', Venezuela: 'CONMEBOL', Bolivia: 'CONMEBOL', Paraguay: 'CONMEBOL',
  // UEFA
  Germany: 'UEFA', France: 'UEFA', England: 'UEFA', Spain: 'UEFA',
  Portugal: 'UEFA', Netherlands: 'UEFA', Italy: 'UEFA', Belgium: 'UEFA',
  Switzerland: 'UEFA', Croatia: 'UEFA', Denmark: 'UEFA', Poland: 'UEFA',
  Austria: 'UEFA', Serbia: 'UEFA', Ukraine: 'UEFA', Turkey: 'UEFA',
  Hungary: 'UEFA', Scotland: 'UEFA', Norway: 'UEFA', Sweden: 'UEFA',
  Slovakia: 'UEFA', Romania: 'UEFA', Czech: 'UEFA', Wales: 'UEFA',
  // AFC
  Japan: 'AFC', 'South Korea': 'AFC', Australia: 'AFC', Iran: 'AFC',
  'Saudi Arabia': 'AFC', Qatar: 'AFC', 'China PR': 'AFC', Iraq: 'AFC',
  Jordan: 'AFC', Indonesia: 'AFC', Uzbekistan: 'AFC',
  // CAF
  Morocco: 'CAF', Senegal: 'CAF', Nigeria: 'CAF', Egypt: 'CAF',
  Cameroon: 'CAF', Ghana: 'CAF', Tunisia: 'CAF', Algeria: 'CAF',
  'Ivory Coast': 'CAF', Mali: 'CAF', Comoros: 'CAF',
  // OFC
  'New Zealand': 'OFC',
}

const getConfederation = (teamName: string, row: GroupStanding) =>
  row.confederation ?? CONFEDERATION_MAP[teamName] ?? 'Other'

// ── Tabs ───────────────────��───────────────────────────────────────────────────

type Tab = 'teams' | 'standings' | 'bracket'

const tabLabels: Record<Tab, { EN: string; KU: string }> = {
  teams:     { EN: 'Teams',     KU: 'تیمەکان' },
  standings: { EN: 'Standings', KU: 'پلەبەندی' },
  bracket:   { EN: 'Bracket',   KU: 'کۆتایی'   },
}

// ── Confederation filter chips ───────────��────────────────────────────────────

const CONFEDERATIONS = ['All', 'UEFA', 'CONMEBOL', 'CONCACAF', 'CAF', 'AFC', 'OFC'] as const
type Conf = typeof CONFEDERATIONS[number]

// ── Labels ───────────────────────���─────────────────────��──────────────────────

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
    title: 'گەڕان — Innovera Predictor',
    subtitle: '٤٨ تیم · ١٢ گروپ · ٣ وڵاتی مێهوان · جامی جیهان ٢٠٢٦',
    searchPlaceholder: 'گەڕان بۆ تیم یان کۆنفیدراسیۆن…',
    noResults: 'هیچ تیمێک نەدۆزرایەوە',
    loading: 'تیمەکان بارکردن…',
    all: 'هەموو',
    teamsCount: (n: number) => `${n} تیم`,
  },
}

// ── Page ────────────────────────��─────────────────────────────────────────────

export default function ExplorePage() {
  const [language, setLanguage] = useState<Language>('EN')
  const [activeTab, setActiveTab] = useState<Tab>('teams')
  const [standings, setStandings] = useState<GroupStanding[]>([])
  const [luckScores, setLuckScores] = useState<LuckScore[]>([])
  const [bracketSlots, setBracketSlots] = useState<BracketSlot[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [confFilter, setConfFilter] = useState<Conf>('All')
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)

  const t = labels[language]

  // ── Fetch ────────────���─────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const [standingsRes, luckRes, bracketRes] = await Promise.all([
        supabase.from('group_standings').select('*').order('group_name').order('position'),
        supabase.from('luck_scores').select('*'),
        supabase.from('bracket').select('*').order('round').order('slot_number'),
      ])
      if (standingsRes.data) setStandings(standingsRes.data as GroupStanding[])
      if (luckRes.data) setLuckScores(luckRes.data as LuckScore[])
      if (bracketRes.data) setBracketSlots(bracketRes.data as BracketSlot[])
      setLoading(false)
    }
    fetchData()
  }, [])

  // ── Derive teams from standings ────────────────────��───────────────────────
  const teams = useMemo<Team[]>(() => {
    if (!standings.length) return []

    // Build luck avg map: teamName → avg luck
    const luckMap: Record<string, number[]> = {}
    for (const ls of luckScores) {
      if (!luckMap[ls.team_name]) luckMap[ls.team_name] = []
      luckMap[ls.team_name].push(ls.luck_score)
    }
    const luckAvgMap: Record<string, number> = {}
    for (const [team, scores] of Object.entries(luckMap)) {
      luckAvgMap[team] = scores.reduce((a, b) => a + b, 0) / scores.length
    }

    // One team per unique name, highest position row wins
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
    return Array.from(seen.values()).sort((a, b) =>
      (a.group_name ?? '').localeCompare(b.group_name ?? '') ||
      (a.position ?? 99) - (b.position ?? 99)
    )
  }, [standings, luckScores])

  // ── Filter teams ───────────────────────────��───────────────────────────────
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
      <Navbar language={language} onLanguageChange={setLanguage} />

      {/* Team profile overlay */}
      {selectedTeam && (
        <TeamProfile
          team={selectedTeam}
          language={language}
          onClose={() => setSelectedTeam(null)}
        />
      )}

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#E6EDF3]">{t.title}</h1>
          <p className="text-sm text-[#8B949E]">{t.subtitle}</p>
        </div>

        {/* ── Tabs ───────────────��───────────────────────────────────────── */}
        <div className="flex items-center gap-1 bg-[#161B22] border border-[#30363D] p-1 rounded-xl w-fit">
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

        {/* ── Teams tab ─────────���───────────────────────────────────────── */}
        {activeTab === 'teams' && (
          <div className="space-y-6">
            {/* Search + filter row */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search input */}
              <div className="relative flex-1">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8B949E]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="w-full bg-[#161B22] border border-[#30363D] rounded-lg pl-10 pr-4 py-2.5 text-sm text-[#E6EDF3] placeholder-[#8B949E] focus:border-[#F0A500] focus:outline-none transition-colors"
                />
              </div>

              {/* Confederation chips */}
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

            {/* Count badge */}
            {!loading && (
              <p className="text-xs text-[#8B949E]">
                {t.teamsCount(filteredTeams.length)}
              </p>
            )}

            {/* Grid */}
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
                  <TeamCard
                    key={team.name}
                    team={team}
                    language={language}
                    onClick={setSelectedTeam}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Standings tab ─────────────────────────────────────────────── */}
        {activeTab === 'standings' && (
          loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-48 rounded-xl bg-[#161B22] border border-[#30363D] animate-pulse" />
              ))}
            </div>
          ) : (
            <FullStandings standings={standings} language={language} />
          )
        )}

        {/* ── Bracket tab ─────────────────���──────────────────────────────── */}
        {activeTab === 'bracket' && (
          loading ? (
            <div className="h-64 rounded-xl bg-[#161B22] border border-[#30363D] animate-pulse" />
          ) : (
            <Bracket slots={bracketSlots} language={language} />
          )
        )}
      </main>
    </div>
  )
}
