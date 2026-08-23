'use client'

import { useEffect, useState, useMemo } from 'react'
import Navbar from '@/components/Navbar'
import { useLanguage } from '@/hooks/useLanguage'
import { localizeNum } from '@/lib/numbers'
import MatchCard from '@/components/MatchCard'
import { supabasePublic } from '@/lib/supabase'
import type { Match } from '@/types'

const COMPETITION = 'PL2026-27'

const labels = {
  EN: {
    title: 'Fixtures & Results',
    subtitle: '380 matches · 20 clubs · Premier League 2026-27',
    searchPlaceholder: 'Search team…',
    noResults: 'No matches found',
    loading: 'Loading fixtures…',
    all: 'All Gameweeks',
    matchesCount: (n: number) => `${n} matches`,
  },
  KU: {
    title: 'یارییەکان و ئەنجامەکان',
    subtitle: '٣٨٠ یاری · ٢٠ باشگە · پرێمیەر لیگ ٢٠٢٦-٢٧',
    searchPlaceholder: 'گەڕان بۆ تیم…',
    noResults: 'هیچ یارییەک نەدۆزرایەوە',
    loading: 'یارییەکان باردەکرێن…',
    all: 'هەموو هەفتەکان',
    matchesCount: (n: number) => `${n} یاری`,
  },
}

function ExplorePageContent() {
  const { language, changeLanguage } = useLanguage()
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [gwFilter, setGwFilter] = useState('All')

  const t = labels[language]

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const { data, error } = await supabasePublic
          .from('matches')
          .select('*')
          .eq('competition', COMPETITION)
          .order('match_date', { ascending: true })
        if (!error && data) {
          const normalized = (data as Match[]).map(m => ({
            ...m,
            home_win_probability: m.home_win_probability != null ? m.home_win_probability * 100 : undefined,
            draw_probability: m.draw_probability != null ? m.draw_probability * 100 : undefined,
            away_win_probability: m.away_win_probability != null ? m.away_win_probability * 100 : undefined,
          }))
          setMatches(normalized)
        }
      } catch (err) {
        console.error('[explore] fetch error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const gameweeks = useMemo(() => {
    const set = new Set<string>()
    for (const m of matches) if (m.tournament_stage) set.add(m.tournament_stage)
    return Array.from(set).sort((a, b) => {
      const na = parseInt(a.replace(/\D/g, ''), 10)
      const nb = parseInt(b.replace(/\D/g, ''), 10)
      return (isNaN(na) ? 0 : na) - (isNaN(nb) ? 0 : nb)
    })
  }, [matches])

  const filteredMatches = useMemo(() => {
    const q = search.toLowerCase()
    return matches.filter((m) => {
      const matchesSearch = !q ||
        m.home_team.toLowerCase().includes(q) ||
        m.away_team.toLowerCase().includes(q)
      const matchesGw = gwFilter === 'All' || m.tournament_stage === gwFilter
      return matchesSearch && matchesGw
    })
  }, [matches, search, gwFilter])

  return (
    <div className="min-h-screen bg-[#0D1117]">
      <Navbar language={language} onLanguageChange={changeLanguage} />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#E6EDF3]">{t.title}</h1>
          <p className="text-sm text-[#8B949E]">{t.subtitle}</p>
        </div>

        {/* Search + gameweek filter */}
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
          <select
            value={gwFilter}
            onChange={(e) => setGwFilter(e.target.value)}
            className="bg-[#161B22] border border-[#30363D] rounded-lg px-3 py-2.5 text-sm text-[#E6EDF3] focus:border-[#F0A500] focus:outline-none transition-colors"
          >
            <option value="All">{t.all}</option>
            {gameweeks.map((gw) => (
              <option key={gw} value={gw}>{gw}</option>
            ))}
          </select>
        </div>

        {!loading && (
          <p className="text-xs text-[#8B949E]">{localizeNum(t.matchesCount(filteredMatches.length), language)}</p>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-64 rounded-xl bg-[#161B22] border border-[#30363D] animate-pulse" />
            ))}
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-12 text-center">
            <span className="text-4xl">🔍</span>
            <p className="mt-3 text-[#8B949E]">{t.noResults}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredMatches.map((match) => (
              <MatchCard key={match.match_id ?? match.id} match={match} language={language} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default function ExplorePage() {
  return <ExplorePageContent />
}
