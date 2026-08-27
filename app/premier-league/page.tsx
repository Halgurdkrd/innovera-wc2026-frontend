'use client'

import { useState, useEffect, useCallback } from 'react'
import Navbar from '@/components/Navbar'
import ProbabilityBar from '@/components/ui/ProbabilityBar'
import { FreshnessTag } from '@/components/ui/FreshnessTag'
import ErrorState from '@/components/ui/ErrorState'
import { useLanguage } from '@/hooks/useLanguage'
import { getPLFixtures, getPLTable } from '@/lib/api/pl'
import type { PLFixture, PLTableResponse } from '@/lib/api/types'

const L = {
  EN: {
    title: 'Premier League AI',
    subtitle: 'AI-powered match probabilities and season forecasts, updated before every fixture.',
    seasonBadge: '2026-27 Live Season',
    tabFixtures: 'Gameweek Predictions',
    tabTable: 'AI Season Projection',
    gameweek: 'Gameweek',
    strongPick: 'Strong Pick',
    confidenceHigh: 'High Confidence',
    confidenceMed: 'Moderate',
    confidenceLow: 'Toss-up',
    predHome: 'Home Win',
    predDraw: 'Draw',
    predAway: 'Away Win',
    cutoffNotice: 'Inference based on pre-match team Elo and rolling 5-game form.',
    simHeading: '10,000 Monte Carlo Season Forecast',
    simSub: 'Vectorized league simulations running after every fixture cycle.',
    colPos: 'Pos',
    colTeam: 'Club',
    colXPts: 'Exp Pts',
    colChamp: 'Title %',
    colTop4: 'Top 4 %',
    colTop6: 'Top 6 %',
    colReleg: 'Relegation %',
    loading: 'Loading Premier League intelligence...',
    errorTitle: 'Unable to Load Premier League Data',
    errorDesc: 'Could not connect to the match intelligence service. Please retry.',
    retry: 'Retry',
    statusFinished: 'Final',
    statusScheduled: 'Scheduled',
  },
  KU: {
    title: 'پریمیەر لیگ AI',
    subtitle: 'پێشبینییەکانی یارییەکان و خەمڵاندنی وەرز بە هۆشی دەستکرد پێش هەر یارییەک نوێ دەکرێتەوە.',
    seasonBadge: 'وەرزی ٢٠٢٦-٢٧ ڕاستەوخۆ',
    tabFixtures: 'پێشبینییەکانی هەفتە',
    tabTable: 'خەمڵاندنی وەرز بە AI',
    gameweek: 'گەڕی',
    strongPick: 'هەڵبژاردەی بەهێز',
    confidenceHigh: 'متمانەی بەرز',
    confidenceMed: 'مامناوەند',
    confidenceLow: 'نزیک',
    predHome: 'بردنەوەی خاوەن یاریگە',
    predDraw: 'یەکسانبوون',
    predAway: 'بردنەوەی میوان',
    cutoffNotice: 'پێشبینییەکان لەسەر بنەمای هێزی Elo و ئاستی ٥ یاری ڕابردوو ئەنجام دراون.',
    simHeading: '١٠،٠٠٠ خەمڵاندنی وەرزی مۆنتی کارلۆ',
    simSub: 'شیکاری وەرز لە دوای هەر گەڕێک نوێ دەکرێتەوە.',
    colPos: 'پلە',
    colTeam: 'یانە',
    colXPts: 'خاڵی پێشبینیکراو',
    colChamp: 'پاڵەوان %',
    colTop4: 'چوارینە %',
    colTop6: 'شەشینە %',
    colReleg: 'دابەزین %',
    loading: 'زانیارییەکان باردەکرێن...',
    errorTitle: 'کێشە لە بارکردنی زانیارییەکاندا هەیە',
    errorDesc: 'نەتوانرا پەیوەندی بە سێرڤەرەوە بکرێت. تکایە دووبارە هەوڵبدەرەوە.',
    retry: 'دووبارە هەوڵبدەرەوە',
    statusFinished: 'کۆتایی هات',
    statusScheduled: 'دیاریکراو',
  },
}

export default function PremierLeaguePage() {
  const { language, changeLanguage } = useLanguage()
  const t = L[language]

  const [activeTab, setActiveTab] = useState<'fixtures' | 'table'>('fixtures')
  const [selectedGW, setSelectedGW] = useState<number>(2)
  const [fixtures, setFixtures] = useState<PLFixture[]>([])
  const [tableData, setTableData] = useState<PLTableResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (activeTab === 'fixtures') {
        const data = await getPLFixtures(selectedGW)
        setFixtures(data)
      } else {
        const data = await getPLTable()
        setTableData(data)
      }
    } catch (err: any) {
      console.error('[PL Page] Fetch error:', err)
      setError(err?.message || 'Failed loading Premier League data.')
    } finally {
      setLoading(false)
    }
  }, [activeTab, selectedGW])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="min-h-screen bg-[#0D1117] text-[#E6EDF3]">
      <Navbar language={language} onLanguageChange={changeLanguage} />

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-6 pb-24 md:pb-12">
        {/* Top Hero Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#30363D] pb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-black text-[#E6EDF3] tracking-tight">
                {t.title}
              </h1>
              <span className="text-xs font-bold text-[#238636] bg-[#238636]/15 border border-[#238636]/40 px-2.5 py-0.5 rounded-full">
                {t.seasonBadge}
              </span>
            </div>
            <p className="text-sm text-[#8B949E] mt-1.5 max-w-2xl">{t.subtitle}</p>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-[#161B22] p-1 rounded-xl border border-[#30363D] self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('fixtures')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'fixtures'
                  ? 'bg-[#238636] text-white shadow'
                  : 'text-[#8B949E] hover:text-[#E6EDF3]'
              }`}
            >
              {t.tabFixtures}
            </button>
            <button
              onClick={() => setActiveTab('table')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'table'
                  ? 'bg-[#238636] text-white shadow'
                  : 'text-[#8B949E] hover:text-[#E6EDF3]'
              }`}
            >
              {t.tabTable}
            </button>
          </div>
        </div>

        {/* Content Area */}
        {error ? (
          <ErrorState
            message={error || t.errorDesc}
            retryLabel={t.retry}
            onRetry={fetchData}
          />
        ) : activeTab === 'fixtures' ? (
          <div className="space-y-6">
            {/* Gameweek Horizontal Selector */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-[#30363D]">
              {Array.from({ length: 38 }, (_, i) => i + 1).map((gw) => {
                const isSelected = gw === selectedGW
                const isFinished = gw === 1
                const isCurrent = gw === 2
                return (
                  <button
                    key={gw}
                    onClick={() => setSelectedGW(gw)}
                    className={`flex-shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                      isSelected
                        ? 'bg-[#58A6FF]/20 border-[#58A6FF] text-[#58A6FF]'
                        : isCurrent
                        ? 'bg-[#238636]/10 border-[#238636]/40 text-[#3FB950]'
                        : isFinished
                        ? 'bg-[#161B22] border-[#30363D] text-[#8B949E]'
                        : 'bg-[#161B22]/50 border-transparent text-[#8B949E]/70 hover:text-[#E6EDF3]'
                    }`}
                  >
                    {t.gameweek} {gw}
                    {isFinished && <span className="ml-1 text-[10px] opacity-70">✓</span>}
                  </button>
                )
              })}
            </div>

            {/* Fixture List */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-44 rounded-xl bg-[#161B22] border border-[#30363D] animate-pulse p-4"
                  />
                ))}
              </div>
            ) : fixtures.length === 0 ? (
              <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-12 text-center text-[#8B949E]">
                No fixtures scheduled for Gameweek {selectedGW}.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fixtures.map((f) => (
                  <PLFixtureCard key={f.id || f.fixture_id} fixture={f} t={t} />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Season Projection Table */
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#161B22] border border-[#30363D] p-4 rounded-xl">
              <div>
                <h2 className="text-base font-bold text-[#E6EDF3]">{t.simHeading}</h2>
                <p className="text-xs text-[#8B949E] mt-0.5">{t.simSub}</p>
              </div>
              <FreshnessTag generatedAt={tableData?.generated_at} />
            </div>

            {loading ? (
              <div className="h-96 rounded-xl bg-[#161B22] border border-[#30363D] animate-pulse" />
            ) : !tableData ? (
              <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-12 text-center text-[#8B949E]">
                Projection data is currently updating.
              </div>
            ) : (
              <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#30363D] bg-[#0D1117]/60 text-[#8B949E] uppercase font-bold">
                        <th className="py-3 px-4 w-12 text-center">{t.colPos}</th>
                        <th className="py-3 px-4">{t.colTeam}</th>
                        <th className="py-3 px-4 text-center">{t.colXPts}</th>
                        <th className="py-3 px-4 text-center text-[#F0A500]">{t.colChamp}</th>
                        <th className="py-3 px-4 text-center text-[#58A6FF]">{t.colTop4}</th>
                        <th className="py-3 px-4 text-center text-[#A371F7]">{t.colTop6}</th>
                        <th className="py-3 px-4 text-center text-[#F85149]">{t.colReleg}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#30363D]/40 font-medium">
                      {tableData.standings.map((team, idx) => (
                        <tr
                          key={team.team_name}
                          className={`hover:bg-white/[0.02] transition-colors ${
                            idx === 0
                              ? 'bg-[#F0A500]/5'
                              : idx < 4
                              ? 'bg-[#58A6FF]/5'
                              : idx >= 17
                              ? 'bg-[#F85149]/5'
                              : ''
                          }`}
                        >
                          <td className="py-3 px-4 text-center font-bold">
                            <span
                              className={`inline-block w-6 h-6 leading-6 rounded-full text-xs ${
                                idx === 0
                                  ? 'bg-[#F0A500] text-[#0D1117]'
                                  : idx < 4
                                  ? 'bg-[#58A6FF]/20 text-[#58A6FF]'
                                  : idx >= 17
                                  ? 'bg-[#F85149]/20 text-[#F85149]'
                                  : 'text-[#8B949E]'
                              }`}
                            >
                              {team.position}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-[#E6EDF3]">{team.team_name}</td>
                          <td className="py-3 px-4 text-center text-sm font-extrabold text-[#3FB950]">
                            {team.expected_points.toFixed(1)}
                          </td>
                          <td className="py-3 px-4 text-center font-semibold text-[#F0A500]">
                            {team.champion_pct > 0 ? `${team.champion_pct.toFixed(1)}%` : '—'}
                          </td>
                          <td className="py-3 px-4 text-center font-semibold text-[#58A6FF]">
                            {team.top4_pct > 0 ? `${team.top4_pct.toFixed(1)}%` : '—'}
                          </td>
                          <td className="py-3 px-4 text-center font-semibold text-[#A371F7]">
                            {team.top6_pct > 0 ? `${team.top6_pct.toFixed(1)}%` : '—'}
                          </td>
                          <td className="py-3 px-4 text-center font-semibold text-[#F85149]">
                            {team.relegation_pct > 0 ? `${team.relegation_pct.toFixed(1)}%` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function PLFixtureCard({ fixture, t }: { fixture: PLFixture; t: any }) {
  const isFinished = fixture.status === 'finished'
  const hp = fixture.home_win_probability
  const dp = fixture.draw_probability
  const ap = fixture.away_win_probability

  const dateFormatted = new Date(fixture.match_date).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4 sm:p-5 flex flex-col justify-between space-y-4 hover:border-[#58A6FF]/40 transition-all shadow-lg">
      {/* Card Header: Stage, Kickoff, Strong Pick Badge */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-[#8B949E] uppercase tracking-wider">
          {fixture.tournament_stage}
        </span>
        <div className="flex items-center gap-2">
          {fixture.strong_pick && (
            <span className="font-extrabold text-[10px] text-[#F0A500] bg-[#F0A500]/10 border border-[#F0A500]/30 px-2 py-0.5 rounded-full">
              ★ {t.strongPick}
            </span>
          )}
          <span className="text-[#8B949E]">{dateFormatted}</span>
        </div>
      </div>

      {/* Team Names & Scores */}
      <div className="grid grid-cols-5 items-center gap-2 text-center">
        <div className="col-span-2 text-right">
          <div className="font-bold text-sm sm:text-base text-[#E6EDF3] truncate" title={fixture.home_team}>
            {fixture.home_team}
          </div>
        </div>

        <div className="col-span-1 flex flex-col items-center justify-center">
          {isFinished ? (
            <div className="text-base sm:text-lg font-black text-[#E6EDF3] bg-[#0D1117] px-2.5 py-0.5 rounded border border-[#30363D]">
              {fixture.home_score} - {fixture.away_score}
            </div>
          ) : (
            <span className="text-xs font-extrabold text-[#8B949E] bg-[#0D1117] px-2 py-1 rounded border border-[#30363D]">
              VS
            </span>
          )}
        </div>

        <div className="col-span-2 text-left">
          <div className="font-bold text-sm sm:text-base text-[#E6EDF3] truncate" title={fixture.away_team}>
            {fixture.away_team}
          </div>
        </div>
      </div>

      {/* Outcome Probability Bar */}
      <div className="space-y-1.5 pt-1">
        <ProbabilityBar
          homeProb={hp * 100}
          drawProb={dp * 100}
          awayProb={ap * 100}
          homeLabel={fixture.home_team}
          awayLabel={fixture.away_team}
        />
      </div>

      {/* Footer Details: Confidence & Prediction */}
      <div className="flex items-center justify-between text-xs pt-2 border-t border-[#30363D]/50 text-[#8B949E]">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px]">AI Pick:</span>
          <span className="font-bold text-[#E6EDF3]">
            {fixture.predicted_outcome === 'H'
              ? `${fixture.home_team}`
              : fixture.predicted_outcome === 'A'
              ? `${fixture.away_team}`
              : t.predDraw}
          </span>
        </div>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
            fixture.confidence === 'HIGH'
              ? 'text-[#3FB950] bg-[#3FB950]/10 border border-[#3FB950]/30'
              : fixture.confidence === 'MEDIUM'
              ? 'text-[#58A6FF] bg-[#58A6FF]/10 border border-[#58A6FF]/30'
              : 'text-[#8B949E] bg-[#8B949E]/10 border border-[#8B949E]/30'
          }`}
        >
          {fixture.confidence === 'HIGH'
            ? t.confidenceHigh
            : fixture.confidence === 'MEDIUM'
            ? t.confidenceMed
            : t.confidenceLow}
        </span>
      </div>
    </div>
  )
}
