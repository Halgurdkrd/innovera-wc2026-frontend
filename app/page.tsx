'use client'

import { useState, useEffect } from 'react'
import Navbar, { type Language } from '@/components/Navbar'
import MatchCard from '@/components/MatchCard'
import LuckScoreSection from '@/components/LuckScoreSection'
import GroupStandingsPreview from '@/components/GroupStandingsPreview'
import { supabase } from '@/lib/supabase'
import type { Match, LuckScore, GroupStanding } from '@/types'

const labels = {
  EN: {
    hero_title: 'AI-Powered World Cup 2026 Predictions',
    hero_subtitle: 'Real-time AI predictions, luck scores, and group standings for every FIFA World Cup 2026 match',
    hero_badge: 'Powered by AI',
    matches_title: "Today's Matches",
    no_matches: 'No matches scheduled for today',
    explore: 'Explore Predictions',
  },
  KU: {
    hero_title: 'ئینۆڤێرا — پێشبینیکەری زیرەکی دەستکردی جامی جیهانی',
    hero_subtitle: 'پێشبینی هوشی دەستکرد، خەمەی خۆشبەختی، و پلەبەندی گروپ بۆ هەموو یارییەکانی جامی جیهان',
    hero_badge: 'بە هوشی دەستکرد',
    matches_title: 'یارییەکانی ئەمڕۆ',
    no_matches: 'هیچ یاری ئەمڕۆ بەرنامەریزی نەکراوە',
    explore: 'پێشبینیەکان بپشکنە',
  },
}

export default function HomePage() {
  const [language, setLanguage] = useState<Language>('EN')
  const [matches, setMatches] = useState<Match[]>([])
  const [luckScores, setLuckScores] = useState<LuckScore[]>([])
  const [standings, setStandings] = useState<GroupStanding[]>([])
  const [loading, setLoading] = useState(true)

  const t = labels[language]

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const today = new Date().toISOString().split('T')[0]
      const yesterday = new Date(Date.now() - 864e5).toISOString().split('T')[0]

      const [matchRes, luckRes, standingsRes] = await Promise.all([
        supabase
          .from('matches')
          .select('*')
          .eq('match_date', today)
          .order('match_time', { ascending: true }),
        supabase
          .from('luck_scores')
          .select('*')
          .eq('match_date', yesterday),
        supabase
          .from('group_standings')
          .select('*')
          .order('group_name')
          .order('position'),
      ])

      if (matchRes.data) setMatches(matchRes.data as Match[])
      if (luckRes.data) setLuckScores(luckRes.data as LuckScore[])
      if (standingsRes.data) setStandings(standingsRes.data as GroupStanding[])
      setLoading(false)
    }

    fetchData()
  }, [])

  return (
    <div className="min-h-screen bg-[#0D1117]">
      <Navbar language={language} onLanguageChange={setLanguage} />

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
                <span className="text-[#F0A500]">Innovera</span> World Cup{' '}
                <span className="text-[#F0A500]">2026</span> AI Predictor
              </>
            ) : (
              <><span className="text-[#F0A500]">ئینۆڤێرا</span> — پێشبینیکەری زیرەکی دەستکردی جامی جیهانی</>
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

          {/* Stats strip */}
          <div className="mt-14 grid grid-cols-3 gap-4 max-w-lg mx-auto">
            {[
              { value: '48', label: language === 'KU' ? 'یاری' : 'Matches' },
              { value: '32', label: language === 'KU' ? 'تیم' : 'Teams' },
              { value: '3', label: language === 'KU' ? 'وڵات مێهوان' : 'Host Nations' },
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

        {/* ── Yesterday's Luck Scores ── */}
        {loading ? (
          <div className="h-48 bg-[#161B22] border border-[#30363D] rounded-xl animate-pulse" />
        ) : (
          <LuckScoreSection scores={luckScores} language={language} />
        )}

        {/* ── Group Standings Preview ── */}
        {loading ? (
          <div className="h-64 bg-[#161B22] border border-[#30363D] rounded-xl animate-pulse" />
        ) : (
          <GroupStandingsPreview standings={standings} language={language} />
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
                {language === 'KU' ? 'ئینۆڤێرا پێشبینیکەر' : 'Innovera Predictor'}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-[#8B949E]">
              <a href="/about" className="hover:text-[#E6EDF3] transition-colors">
                {language === 'KU' ? 'دەربارە' : 'About'}
              </a>
              <span>·</span>
              <span>
                {language === 'KU'
                  ? 'هەموو حوقوقەکان پارێزراون © ٢٠٢٦ innovera.ai'
                  : '© 2026 innovera.ai · AI predictions for entertainment purposes.'}
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
