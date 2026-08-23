'use client'

import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import { useLanguage } from '@/hooks/useLanguage'
import MatchCard from '@/components/MatchCard'
import { supabasePublic } from '@/lib/supabase'
import type { Match } from '@/types'
import { parseMatchDate } from '@/lib/dates'

const labels = {
  EN: {
    hero_title: 'AI-Powered Premier League Predictions',
    hero_subtitle: 'Real-time AI predictions for every Premier League 2026-27 match',
    hero_badge: 'Powered by AI',
    matches_title: "Today's Matches",
    tomorrow_title: "Tomorrow's Matches",
    no_matches: 'No matches scheduled for today',
    explore: 'View Predictions',
  },
  KU: {
    hero_title: 'ئینۆڤێرا — پێشبینیکەری زیرەکی دەستکردی پرێمیەر لیگ',
    hero_subtitle: 'پێشبینی هوشی دەستکرد بۆ هەموو یارییەکانی پرێمیەر لیگ ٢٠٢٦-٢٧',
    hero_badge: 'زیرەکی دەستکرد',
    matches_title: 'یارییەکانی ئەمڕۆ',
    tomorrow_title: 'یارییەکانی سبەینێ',
    no_matches: 'هیچ یاری ئەمڕۆ بەرنامەریزی نەکراوە',
    explore: 'پێشبینیەکان ببینە',
  },
}

const COMPETITION = 'PL2026-27'

export default function HomePage() {
  const { language, changeLanguage } = useLanguage()
  const [matches, setMatches] = useState<Match[]>([])
  const [tomorrowMatches, setTomorrowMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [gameweek, setGameweek] = useState<string | null>(null)

  const t = labels[language]

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        // Use local calendar date, not UTC, so e.g. a 04:00 Baghdad match
        // (01:00 UTC next day) correctly appears under "Today's Matches".
        const now = new Date()
        const dayStart      = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
        const twoDaysEnd    = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2)

        const matchRes = await supabasePublic.from('matches').select('*')
          .eq('competition', COMPETITION)
          .gte('match_date', dayStart.toISOString())
          .lt('match_date', twoDaysEnd.toISOString())
          .order('match_date', { ascending: true })    // match_time column does not exist

        if (matchRes.data) {
          // Supabase stores probabilities as 0–1 decimals; MatchCard expects 0–100
          const normalized = (matchRes.data as Match[]).map(m => ({
            ...m,
            home_win_probability: m.home_win_probability != null ? m.home_win_probability * 100 : undefined,
            draw_probability: m.draw_probability != null ? m.draw_probability * 100 : undefined,
            away_win_probability: m.away_win_probability != null ? m.away_win_probability * 100 : undefined,
          }))
          // Split into today vs tomorrow by local date
          setMatches(normalized.filter(m => {
            const d = parseMatchDate(m.match_date ?? m.match_time)
            return d ? d < tomorrowStart : true
          }))
          setTomorrowMatches(normalized.filter(m => {
            const d = parseMatchDate(m.match_date ?? m.match_time)
            return d ? d >= tomorrowStart && d < twoDaysEnd : false
          }))
          setGameweek(normalized.find(m => m.tournament_stage)?.tournament_stage ?? null)
        }
      } catch (err) {
        console.error('[home] fetch error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  return (
    <div className="min-h-screen bg-[#0D1117]">
      <Navbar language={language} onLanguageChange={changeLanguage} />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-16">
        {/* ── Hero ── */}
        <section className="relative text-center py-16 sm:py-24 overflow-hidden">
          {/* Background glow */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <div className="h-[400px] w-[600px] rounded-full bg-[#F0A500]/5 blur-3xl" />
          </div>

          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#F0A500]/30 bg-[#F0A500]/10 px-4 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#F0A500] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#F0A500]" />
            </span>
            <span className="text-xs font-semibold text-[#F0A500]">{t.hero_badge}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-[#E6EDF3] tracking-tight leading-tight max-w-4xl mx-auto">
            {language === 'EN' ? (
              <>
                <span className="text-[#F0A500]">Ennovera</span> Premier League{' '}
                <span className="text-[#F0A500]">AI</span> Predictor
              </>
            ) : (
              <><span className="text-[#F0A500]">ئینۆڤێرا</span> — پێشبینیکەری زیرەکی دەستکردی پرێمیەر لیگ</>
            )}
          </h1>

          <p className="mt-6 text-base sm:text-lg text-[#8B949E] max-w-2xl mx-auto leading-relaxed">
            {t.hero_subtitle}
          </p>

          <div className="mt-10 flex items-center justify-center">
            <a
              href="#matches"
              className="inline-flex items-center gap-2 rounded-xl bg-[#F0A500] px-8 py-3.5 text-base font-bold text-[#0D1117] hover:bg-[#D4920A] transition-colors shadow-lg shadow-[#F0A500]/20"
            >
              {t.explore}
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
              </svg>
            </a>
          </div>

          {/* Gameweek badge */}
          {gameweek && (
            <div className="mt-10 flex items-center justify-center">
              <span className="text-sm font-bold text-[#F0A500] bg-[#F0A500]/10 border border-[#F0A500]/30 px-4 py-1.5 rounded-full">
                {gameweek}
              </span>
            </div>
          )}

          {/* Stats strip */}
          <div className="mt-8 grid grid-cols-3 gap-4 max-w-lg mx-auto">
            {[
              { value: '380', label: language === 'KU' ? 'یاری' : 'Matches' },
              { value: '20', label: language === 'KU' ? 'باشگە' : 'Clubs' },
              { value: '38', label: language === 'KU' ? 'هەفتە' : 'Gameweeks' },
            ].map(({ value, label }) => (
              <div key={label} className="bg-[#161B22] border border-[#30363D] rounded-xl p-4">
                <p className="text-2xl font-extrabold text-[#F0A500]">{value}</p>
                <p className="text-xs text-[#8B949E] mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Today's Matches ── */}
        <section id="matches" className="space-y-6 scroll-mt-20">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-[#E6EDF3]">{t.matches_title}</h2>
            {!loading && (
              <span className="text-xs font-medium bg-[#161B22] border border-[#30363D] text-[#8B949E] px-2.5 py-0.5 rounded-full">
                {matches.length} {language === 'KU' ? 'یاری' : 'matches'}
              </span>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 h-64 animate-pulse" />
              ))}
            </div>
          ) : matches.length === 0 ? (
            <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-12 text-center">
              <span className="text-4xl">⚽</span>
              <p className="mt-4 text-[#8B949E]">{t.no_matches}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {matches.map((match) => (
                <MatchCard key={match.id} match={match} language={language} />
              ))}
            </div>
          )}
        </section>

        {/* ── Tomorrow's Matches ── */}
        {(loading || tomorrowMatches.length > 0) && (
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-[#E6EDF3]">{t.tomorrow_title}</h2>
              {!loading && (
                <span className="text-xs font-medium bg-[#161B22] border border-[#30363D] text-[#8B949E] px-2.5 py-0.5 rounded-full">
                  {tomorrowMatches.length} {language === 'KU' ? 'یاری' : 'matches'}
                </span>
              )}
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 h-64 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {tomorrowMatches.map((match) => (
                  <MatchCard key={match.id} match={match} language={language} />
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-[#30363D] bg-[#0D1117]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-[#F0A500]">
                <span className="text-xs font-bold text-[#0D1117]">I</span>
              </div>
              <span className="text-sm font-semibold text-[#E6EDF3]">
                {language === 'KU' ? 'ئینۆڤێرا هوشی دەستکرد' : 'Ennovera AI'}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-[#8B949E]">
              <a href="/about" className="hover:text-[#E6EDF3] transition-colors">
                {language === 'KU' ? 'دەربارە' : 'About'}
              </a>
              <span>·</span>
              <span>
                {language === 'KU'
                  ? 'هەموو حوقوقەکان پارێزراون © ٢٠٢٦ Ennovera'
                  : '© 2026 Ennovera · AI predictions for entertainment purposes.'}
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
