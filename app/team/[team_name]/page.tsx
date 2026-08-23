'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { useLanguage } from '@/hooks/useLanguage'
import { supabasePublic } from '@/lib/supabase'
import { Sk } from '@/components/SkeletonCard'
import { teamFlagUrl } from '@/lib/flags'
import type { Match } from '@/types'

const COMPETITION = 'PL2026-27'

// ── Labels ────────────────────────────────────────────────────────────────────

const L = {
  EN: {
    back: '← Back to Fixtures',
    fixtures: 'Fixtures & Results',
    noFixtures: 'Fixtures not available',
    venue: 'Venue',
    vs: 'vs',
    viewMatch: 'View Match →',
    notFound: 'Team not found.',
  },
  KU: {
    back: '← گەڕانەوە بۆ یارییەکان',
    fixtures: 'یارییەکان و ئەنجامەکان',
    noFixtures: 'یارییەکان بەردەست نیە',
    venue: 'زەوی',
    vs: 'دژ بە',
    viewMatch: 'بینینی یاری →',
    notFound: 'تیم نەدۆزرایەوە.',
  },
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TeamBadge({ name, size }: { name: string; size: number }) {
  const src = teamFlagUrl(name)
  if (src.startsWith('http')) {
    return <img src={src} alt={name} style={{ width: size, height: 'auto' }} className="rounded-sm mx-auto" />
  }
  return <span style={{ fontSize: size }} className="leading-none block">{src}</span>
}

function FixtureCard({ match, teamName, lang }: { match: Match; teamName: string; lang: 'EN' | 'KU' }) {
  const t = L[lang]
  const isHome = match.home_team === teamName
  const opponent = isHome ? match.away_team : match.home_team
  const datetime = match.match_date ?? match.match_time
  const [displayDate, setDisplayDate] = useState('')
  const [displayTime, setDisplayTime] = useState('')
  useEffect(() => {
    if (!datetime) return
    let s = datetime.replace(' ', 'T')
    if (!s.endsWith('Z') && !s.includes('+')) s += 'Z'
    const d = new Date(s)
    if (!isNaN(d.getTime())) {
      setDisplayDate(d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }))
      setDisplayTime(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    }
  }, [datetime])
  const matchId = match.match_id ?? match.id

  return (
    <Link
      href={`/match/${matchId}`}
      className="block bg-[#161B22] border border-[#30363D] rounded-xl p-4 hover:border-[#F0A500]/50 hover:bg-[#1C2128] transition-all"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <span className="text-2xl flex-shrink-0"><TeamBadge name={opponent} size={28} /></span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#E6EDF3] truncate">
              {t.vs} {opponent}
            </p>
            <p className="text-xs text-[#8B949E]">{displayDate} · {displayTime || '...'}</p>
            {match.tournament_stage && <p className="text-xs text-[#8B949E] truncate">{match.tournament_stage}</p>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-[10px] font-bold text-[#8B949E] bg-[#0D1117] border border-[#30363D] px-2 py-0.5 rounded-full">
            {isHome ? 'HOME' : 'AWAY'}
          </span>
          {match.status === 'finished' && match.home_score != null ? (
            <span className="text-sm font-extrabold text-[#E6EDF3]">{match.home_score} – {match.away_score}</span>
          ) : (
            <span className="text-[10px] text-[#F0A500]">{t.viewMatch}</span>
          )}
        </div>
      </div>
    </Link>
  )
}

function TeamSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-6 space-y-4">
        <Sk className="h-20 w-20 rounded-full mx-auto" />
        <Sk className="h-8 w-48 mx-auto" />
      </div>
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-[#161B22] border border-[#30363D] rounded-xl p-4 flex items-center gap-3">
          <Sk className="h-10 w-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Sk className="h-4 w-32" />
            <Sk className="h-3 w-44" />
          </div>
        </div>
      ))}
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

  const [fixtures, setFixtures] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!teamName) return
    async function fetchData() {
      setLoading(true)
      try {
        const { data, error } = await supabasePublic
          .from('matches')
          .select('*')
          .eq('competition', COMPETITION)
          .or(`home_team.eq.${teamName},away_team.eq.${teamName}`)
          .order('match_date')
        if (!error && data) setFixtures(data as Match[])
      } catch (err) {
        console.error('[team-profile] Supabase error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
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

        {/* ── Team Header ─────────────────────────────────────────────────── */}
        <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-6 text-center space-y-4">
          <span className="text-7xl leading-none block"><TeamBadge name={teamName} size={72} /></span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#E6EDF3]">{teamName}</h1>
        </div>

        {/* ── Fixtures ───────────────────────────────────────────────────── */}
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

      </main>
    </div>
  )
}
