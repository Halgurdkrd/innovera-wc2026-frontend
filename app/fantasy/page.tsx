'use client'

import { useState, useEffect, useCallback } from 'react'
import Navbar from '@/components/Navbar'
import { PitchVisualization, ClubJerseySvg } from '@/components/fantasy/PitchVisualization'
import { FreshnessTag } from '@/components/ui/FreshnessTag'
import ErrorState from '@/components/ui/ErrorState'
import { useLanguage } from '@/hooks/useLanguage'
import {
  getFPLGameweekPlan,
  getFPLCaptain,
  getFPLTransfers,
  getFPLChips,
  getFPLPerformance,
} from '@/lib/api/fpl'
import type {
  FPLGameweekPlan,
  FPLCaptainResponse,
  FPLTransferRecommendation,
  FPLChipStatusItem,
  FPLPerformanceResponse,
  FPLPerformancePlayer,
} from '@/lib/api/types'

const L = {
  EN: {
    title: 'Fantasy AI',
    subtitle: 'Autonomous AI Manager for squad selection, optimal transfers, captaincy, and chip timing.',
    beta: 'Beta',
    gameweek: 'Gameweek',
    deadline: 'Next Deadline',
    expectedPts: 'Projected Gameweek Score',
    bank: 'In Bank',
    freeTransfers: 'Free Transfers',
    tabPlan: 'Gameweek Plan',
    tabTransfers: 'Transfers',
    tabCaptain: 'Captaincy',
    tabChips: 'Chip Strategy',
    tabPerf: 'Performance',
    holdTransferTitle: 'Hold Transfer (No Move Recommended)',
    holdTransferDesc: 'Current owned squad is projected to outperform all available single and double transfer replacement candidates within budget.',
    transfersHeading: 'Recommended Transfers',
    out: 'OUT',
    in: 'IN',
    hitCost: 'Hit Cost',
    expGain: '3-GW Opportunity Gain',
    captTitle: 'Recommended Captain',
    viceTitle: 'Vice-Captain',
    haulProb: 'Haul Odds (≥10 pts)',
    captScore: 'Selection Utility Score',
    topAlts: 'Top Alternatives',
    chipsHeading: 'Season Chip Inventory & Guidance',
    chipStatusUse: 'RECOMMENDED TO USE',
    chipStatusSave: 'HOLD / PRESERVE',
    chipStatusUsed: 'USED',
    chipStatusLocked: 'LOCKED',
    chipStatusExpired: 'EXPIRED',
    perfHeading: 'FPL Performance & Historical Ledger',
    perfNotice: 'Immutable pre-deadline AI predictions versus authenticated official post-match realizations.',
    totPts: 'Total Points',
    avgPts: 'Average / GW',
    captPts: 'Captain Points',
    transCost: 'Transfer Hits',
    benchMissed: 'Bench Points Missed',
    colGw: 'GW',
    colScore: 'Score',
    colCapt: 'Captain',
    colTrans: 'Transfers',
    colChip: 'Chip',
    colBench: 'Bench',
    loading: 'Calculating optimal Fantasy plan...',
    errorTitle: 'Unable to Load Fantasy Plan',
    errorDesc: 'Could not connect to the Fantasy optimization service. Please retry.',
    retry: 'Retry',
  },
  KU: {
    title: 'فانتاسی AI',
    subtitle: 'بەڕێوەبەری هۆشی دەستکرد بۆ پێکهاتە، گواستنەوەی یاریزانان، کاپتن و ستراتیژی چیپەکان.',
    beta: 'تاقیکاری',
    gameweek: 'گەڕی',
    deadline: 'کاتی کۆتایی',
    expectedPts: 'خاڵی پێشبینیکراوی ئەم هەفتەیە',
    bank: 'بودجەی ماوە',
    freeTransfers: 'گواستنەوەی بێ بەرامەر',
    tabPlan: 'پلانی گەڕ',
    tabTransfers: 'گواستنەوەکان',
    tabCaptain: 'کاپتنی',
    tabChips: 'ستراتیژی چیپەکان',
    tabPerf: 'ئەنجامەکان',
    holdTransferTitle: 'گواستنەوە مەکە (پێکهاتە جێگیرە)',
    holdTransferDesc: 'پێکهاتەی ئێستا ئاستی بەرزترە لە هەر بژاردەیەکی گواستنەوە لە بازاڕدا لەم هەفتەیەدا.',
    transfersHeading: 'گواستنەوەی پێشنیارکراو',
    out: 'چوونەدەرەوە',
    in: 'هاتنەژوورەوە',
    hitCost: 'سزای خاڵ',
    expGain: 'قازانجی ٣ هەفتە',
    captTitle: 'کاپتنی پێشنیارکراو',
    viceTitle: 'جێگری کاپتن',
    haulProb: 'دەرفەتی دەستکەوتی گەورە (≥١٠ خاڵ)',
    captScore: 'نمرەی شیاوی',
    topAlts: 'باشترین جێگرەوەکان',
    chipsHeading: 'لیستی چیپەکانی وەرز و ڕێنمایی',
    chipStatusUse: 'پێشنیاری بەکارهێنان دەکرێت',
    chipStatusSave: 'هەڵگرتن',
    chipStatusUsed: 'بەکارهاتووە',
    chipStatusLocked: 'داخراوە',
    chipStatusExpired: 'بەسەرچووە',
    perfHeading: 'ئەنجامەکانی AI لە وەرزی ٢٠٢٦-٢٧',
    perfNotice: 'تۆماری خاڵە ڕاستەقینەکانی بەدەستهاتوو لە گەڕی ١-ەوە.',
    totPts: 'کۆی گشتی خاڵەکان',
    avgPts: 'تێکڕا بۆ هەر گەڕێک',
    captPts: 'خاڵەکانی کاپتن',
    transCost: 'سزای گواستنەوە',
    benchMissed: 'خاڵی لەدەستچووی یەدەگ',
    colGw: 'گەڕ',
    colScore: 'خاڵ',
    colCapt: 'کاپتن',
    colTrans: 'گواستنەوە',
    colChip: 'چیپ',
    colBench: 'یەدەگ',
    loading: 'پلانی فانتاسی شیکاری بۆ دەکرێت...',
    errorTitle: 'کێشە لە بارکردنی پلانی فانتاسیدا هەیە',
    errorDesc: 'نەتوانرا پەیوەندی بە سێرڤەری فانتاسییەوە بکرێت. تکایە دووبارە هەوڵبدەرەوە.',
    retry: 'دووبارە هەوڵبدەرەوە',
  },
}

export default function FantasyPage() {
  const { language, changeLanguage } = useLanguage()
  const t = L[language]

  const [activeTab, setActiveTab] = useState<'plan' | 'transfers' | 'captain' | 'chips' | 'perf'>('plan')
  const [plan, setPlan] = useState<FPLGameweekPlan | null>(null)
  const [captainData, setCaptainData] = useState<FPLCaptainResponse | null>(null)
  const [transfers, setTransfers] = useState<FPLTransferRecommendation[]>([])
  const [chips, setChips] = useState<FPLChipStatusItem[]>([])
  const [performance, setPerformance] = useState<FPLPerformanceResponse | null>(null)
  const [selectedPerfGW, setSelectedPerfGW] = useState<number>(1)
  const [perfViewMode, setPerfViewMode] = useState<'pitch' | 'table'>('pitch')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFantasyData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const results = await Promise.allSettled([
        getFPLGameweekPlan(),
        getFPLCaptain(),
        getFPLTransfers(),
        getFPLChips(),
        getFPLPerformance(),
      ])

      const [planRes, captRes, transRes, chipsRes, perfRes] = results

      if (planRes.status === 'fulfilled') {
        setPlan(planRes.value)
      } else {
        console.error('[Fantasy Page] Gameweek Plan failed:', planRes.reason)
        setError(planRes.reason?.message || 'Failed loading Gameweek Plan.')
      }

      if (captRes.status === 'fulfilled') {
        setCaptainData(captRes.value)
      } else {
        console.warn('[Fantasy Page] Captain data failed:', captRes.reason)
      }

      if (transRes.status === 'fulfilled') {
        setTransfers(transRes.value)
      } else {
        console.warn('[Fantasy Page] Transfers data failed:', transRes.reason)
      }

      if (chipsRes.status === 'fulfilled') {
        setChips(chipsRes.value)
      } else {
        console.warn('[Fantasy Page] Chips data failed:', chipsRes.reason)
      }

      if (perfRes.status === 'fulfilled') {
        setPerformance(perfRes.value)
      } else {
        console.warn('[Fantasy Page] Performance data failed:', perfRes.reason)
      }
    } catch (err: any) {
      console.error('[Fantasy Page] Unexpected error:', err)
      setError(err?.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFantasyData()
  }, [fetchFantasyData])

  const selectedGWObj = performance?.gameweeks?.find((g) => g.gameweek === selectedPerfGW) || performance?.gameweeks?.[0]

  return (
    <div className="min-h-screen bg-[#0D1117] text-[#E6EDF3] flex flex-col font-sans selection:bg-[#58A6FF]/30">
      <Navbar language={language} onLanguageChange={changeLanguage} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header Title Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#30363D] pb-5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#E6EDF3] flex items-center gap-2">
                {t.title}
                <span className="text-xs font-semibold px-2 py-0.5 bg-[#58A6FF]/10 text-[#58A6FF] border border-[#58A6FF]/30 rounded-full">
                  {t.beta}
                </span>
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-[#8B949E] mt-1 max-w-2xl">
              {t.subtitle}
            </p>
          </div>
          <FreshnessTag generatedAt={plan?.generated_at} />
        </div>

        {/* Global Gameweek Status Bar */}
        {plan && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-[#161B22] rounded-xl border border-[#30363D] flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-[#58A6FF]/10 text-[#58A6FF] flex items-center justify-center font-bold text-sm">
                GW
              </div>
              <div>
                <div className="text-[11px] font-semibold text-[#8B949E] uppercase">{t.gameweek}</div>
                <div className="text-sm font-extrabold text-[#E6EDF3]">GW {plan.gameweek}</div>
              </div>
            </div>

            <div className="p-3 bg-[#161B22] rounded-xl border border-[#30363D] flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-[#F0A500]/10 text-[#F0A500] flex items-center justify-center font-bold text-sm">
                ⏱
              </div>
              <div>
                <div className="text-[11px] font-semibold text-[#8B949E] uppercase">{t.deadline}</div>
                <div className="text-xs font-bold text-[#E6EDF3] truncate">{plan.deadline}</div>
              </div>
            </div>

            <div className="p-3 bg-[#0D1117]/60 rounded-xl border border-[#30363D]/40">
              <div className="text-[11px] font-semibold text-[#8B949E] uppercase">{t.expectedPts}</div>
              <div className="text-xl font-black text-[#3FB950] mt-0.5">
                {plan.expected_total_points.toFixed(2)} <span className="text-xs font-normal">pts</span>
              </div>
            </div>

            <div className="p-3 bg-[#0D1117]/60 rounded-xl border border-[#30363D]/40 flex justify-between items-center">
              <div>
                <div className="text-[11px] font-semibold text-[#8B949E] uppercase">{t.bank}</div>
                <div className="text-sm font-extrabold text-[#E6EDF3] mt-0.5">£{plan.bank.toFixed(1)}m</div>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-semibold text-[#8B949E] uppercase">{t.freeTransfers}</div>
                <div className="text-sm font-extrabold text-[#58A6FF] mt-0.5">{plan.free_transfers}</div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-[#30363D] scrollbar-none">
          {[
            { id: 'plan', label: t.tabPlan },
            { id: 'transfers', label: t.tabTransfers },
            { id: 'captain', label: t.tabCaptain },
            { id: 'chips', label: t.tabChips },
            { id: 'perf', label: t.tabPerf },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 text-xs font-bold whitespace-nowrap rounded-t-lg transition-all border-b-2 ${
                activeTab === tab.id
                  ? 'border-[#58A6FF] text-[#58A6FF] bg-[#161B22]'
                  : 'border-transparent text-[#8B949E] hover:text-[#E6EDF3]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Main Tabs Content */}
        {loading ? (
          <div className="h-96 rounded-2xl bg-[#161B22] border border-[#30363D] animate-pulse" />
        ) : error ? (
          <ErrorState
            message={error || t.errorDesc}
            retryLabel={t.retry}
            onRetry={fetchFantasyData}
          />
        ) : !plan ? null : (
          <div className="space-y-6">
            {/* TAB 1: GAMEWEEK PLAN */}
            {activeTab === 'plan' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Left 2 Cols: Pitch & Bench */}
                <div className="lg:col-span-2">
                  <PitchVisualization
                    formation={plan.formation}
                    startingXI={plan.starting_xi}
                    bench={plan.bench}
                    language={language}
                  />
                </div>

                {/* Right Col: Captaincy & Strategy Cards */}
                <div className="space-y-4">
                  {/* Captain Pick Card */}
                  <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4 shadow-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#F0A500] uppercase tracking-wider">
                        ★ {t.captTitle}
                      </span>
                      <span className="text-xs font-bold text-[#3FB950] bg-[#3FB950]/10 border border-[#3FB950]/30 px-2 py-0.5 rounded">
                        {plan.captain.expected_points.toFixed(1)} xP
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-[#F0A500] text-[#0D1117] font-black text-xl flex items-center justify-center shadow">
                        C
                      </div>
                      <div>
                        <h3 className="font-extrabold text-base text-[#E6EDF3]">{plan.captain.name}</h3>
                        <p className="text-xs text-[#8B949E]">
                          {plan.captain.club} • £{plan.captain.price.toFixed(1)}m
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#30363D]/40 flex justify-between items-center text-xs">
                      <span className="text-[#8B949E]">{t.viceTitle}: <strong className="text-[#E6EDF3]">{plan.vice_captain.name}</strong></span>
                      <span className="text-[#3FB950] font-semibold">{plan.vice_captain.expected_points.toFixed(1)} xP</span>
                    </div>
                  </div>

                  {/* Chip Strategy Card */}
                  <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4 shadow-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#58A6FF] uppercase tracking-wider">
                        {language === 'KU' ? 'ستراتیژی چیپ' : 'Chip Strategy'}
                      </span>
                      <span className="text-[10px] font-extrabold bg-[#58A6FF]/10 text-[#58A6FF] border border-[#58A6FF]/30 px-2 py-0.5 rounded-full">
                        {plan.chip_recommendation.action === 'SAVE' || plan.chip_recommendation.action === 'HOLD' ? 'HOLD CHIPS' : plan.chip_recommendation.action}
                      </span>
                    </div>
                    <p className="text-xs text-[#8B949E] leading-relaxed">
                      {plan.chip_recommendation.reason}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: TRANSFERS */}
            {activeTab === 'transfers' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-[#E6EDF3]">{t.transfersHeading}</h2>
                  <span className="text-xs text-[#8B949E]">{transfers.length} recommendations</span>
                </div>

                {transfers.length === 0 ? (
                  <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-8 text-center space-y-2 shadow-lg">
                    <div className="inline-flex h-12 w-12 rounded-full bg-[#238636]/10 text-[#3FB950] items-center justify-center text-xl font-bold mb-2">
                      ✓
                    </div>
                    <h3 className="text-lg font-bold text-[#E6EDF3]">{t.holdTransferTitle}</h3>
                    <p className="text-xs sm:text-sm text-[#8B949E] max-w-xl mx-auto leading-relaxed">
                      {t.holdTransferDesc}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {transfers.map((tr, i) => (
                      <div key={i} className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-4 shadow-lg">
                        <div className="grid grid-cols-2 gap-3 items-center">
                          <div className="p-3 bg-[#F85149]/10 border border-[#F85149]/30 rounded-lg">
                            <span className="text-[10px] font-black text-[#F85149] uppercase">{t.out}</span>
                            <div className="font-bold text-sm text-[#E6EDF3] truncate">{tr.player_out}</div>
                          </div>
                          <div className="p-3 bg-[#3FB950]/10 border border-[#3FB950]/30 rounded-lg">
                            <span className="text-[10px] font-black text-[#3FB950] uppercase">{t.in}</span>
                            <div className="font-bold text-sm text-[#E6EDF3] truncate">{tr.player_in}</div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-xs text-[#8B949E] pt-2 border-t border-[#30363D]/40">
                          <span>{t.expGain}: <strong className="text-[#3FB950]">+{tr.expected_gain} pts</strong></span>
                          <span>{t.hitCost}: <strong className="text-[#E6EDF3]">{tr.hit_points} pts</strong></span>
                          <span>{t.bank}: <strong className="text-[#E6EDF3]">£{tr.bank_after}m</strong></span>
                        </div>

                        <p className="text-xs text-[#8B949E] italic">{tr.reason}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: CAPTAIN */}
            {activeTab === 'captain' && captainData && (
              <div className="space-y-6">
                {/* Hero Captain Card */}
                <div className="bg-gradient-to-r from-[#161B22] to-[#1c222c] border border-[#F0A500]/40 rounded-2xl p-6 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#F0A500] uppercase tracking-widest">
                      ★ {t.captTitle}
                    </span>
                    <span className="text-xs font-bold text-[#F0A500] bg-[#F0A500]/10 border border-[#F0A500]/30 px-3 py-1 rounded-full">
                      {captainData.captain.expected_points.toFixed(1)} xP ({captainData.captain.expected_points * 2} pts with 2x)
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-2xl bg-[#F0A500] text-[#0D1117] font-black text-2xl flex items-center justify-center shadow-lg">
                        C
                      </div>
                      <div>
                        <h2 className="text-xl sm:text-2xl font-black text-[#E6EDF3]">{captainData.captain.name}</h2>
                        <div className="text-sm text-[#8B949E]">
                          {captainData.captain.club} • {captainData.captain.position} • £{captainData.captain.price.toFixed(1)}m
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="bg-[#0D1117]/80 p-3 rounded-xl border border-[#30363D]/60 text-center">
                        <div className="text-[10px] text-[#8B949E] uppercase font-bold">{t.haulProb}</div>
                        <div className="text-lg font-black text-[#3FB950]">
                          {(captainData.captain.haul_probability * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top Alternatives */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-[#E6EDF3]">{t.topAlts}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {captainData.alternatives.map((alt, i) => (
                      <div key={i} className="bg-[#161B22] border border-[#30363D] rounded-xl p-4 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-[#8B949E]">#{i + 1} Alternative</span>
                          <span className="text-xs font-extrabold text-[#58A6FF]">{alt.expected_points.toFixed(1)} xP</span>
                        </div>
                        <div className="font-extrabold text-sm text-[#E6EDF3]">{alt.name}</div>
                        <div className="text-xs text-[#8B949E]">{alt.club}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: CHIPS */}
            {activeTab === 'chips' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-[#E6EDF3]">{t.chipsHeading}</h2>
                  <span className="text-xs text-[#8B949E]">{chips.length} Official Season Chips</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {chips.map((c) => (
                    <div key={c.chip_id} className="bg-[#161B22] border border-[#30363D] rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-sm text-[#E6EDF3]">{c.name}</span>
                        <span
                          className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                            c.status === 'AVAILABLE'
                              ? 'bg-[#3FB950]/15 text-[#3FB950] border-[#3FB950]/30'
                              : c.status === 'USED'
                              ? 'bg-[#8B949E]/10 text-[#8B949E] border-[#8B949E]/30'
                              : 'bg-[#F0A500]/10 text-[#F0A500] border-[#F0A500]/30'
                          }`}
                        >
                          {c.status}
                        </span>
                      </div>
                      <p className="text-xs text-[#8B949E] leading-relaxed">{c.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 5: PERFORMANCE V2 */}
            {activeTab === 'perf' && performance && (
              <div className="space-y-6">
                {/* Header Title */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-[#E6EDF3]">{t.perfHeading}</h2>
                    <p className="text-xs text-[#8B949E] mt-0.5">
                      {t.perfNotice}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold px-2.5 py-1 bg-[#238636]/15 text-[#3FB950] border border-[#238636]/30 rounded-full uppercase tracking-wider">
                      Prospective Start: GW 2
                    </span>
                  </div>
                </div>

                {/* Prospective Official Summary Scorecards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-[#161B22] border border-[#30363D] p-3 rounded-xl text-center">
                    <div className="text-[10px] text-[#8B949E] uppercase font-bold">Completed Prospective GWs</div>
                    <div className="text-xl font-black text-[#58A6FF] mt-1">
                      {performance.summary?.prospective_completed_gws ?? 0}
                    </div>
                  </div>
                  <div className="bg-[#161B22] border border-[#30363D] p-3 rounded-xl text-center">
                    <div className="text-[10px] text-[#8B949E] uppercase font-bold">Prospective Actual Points</div>
                    <div className="text-xl font-black text-[#8B949E] mt-1">
                      {performance.summary?.prospective_actual_total !== null && (performance.summary?.prospective_completed_gws ?? 0) > 0 ? performance.summary.prospective_actual_total : '—'}
                    </div>
                  </div>
                  <div className="bg-[#161B22] border border-[#30363D] p-3 rounded-xl text-center">
                    <div className="text-[10px] text-[#8B949E] uppercase font-bold">Average Actual / GW</div>
                    <div className="text-xl font-black text-[#8B949E] mt-1">
                      {performance.summary?.prospective_actual_total !== null && (performance.summary?.prospective_completed_gws ?? 0) > 0 ? (performance.summary.prospective_actual_total / performance.summary.prospective_completed_gws).toFixed(1) : '—'}
                    </div>
                  </div>
                  <div className="bg-[#161B22] border border-[#30363D] p-3 rounded-xl text-center">
                    <div className="text-[10px] text-[#8B949E] uppercase font-bold">Locked GW2 Projected</div>
                    <div className="text-xl font-black text-[#3FB950] mt-1">
                      74.05 <span className="text-xs font-normal">xP</span>
                    </div>
                  </div>
                </div>

                {/* Gameweek Selector */}
                <div className="flex items-center gap-2 border-b border-[#30363D] pb-3 overflow-x-auto">
                  <span className="text-xs font-bold text-[#8B949E] uppercase mr-2 whitespace-nowrap">Select Gameweek:</span>
                  {(performance.gameweeks || []).map((gw) => (
                    <button
                      key={gw.gameweek}
                      onClick={() => setSelectedPerfGW(gw.gameweek)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                        selectedPerfGW === gw.gameweek
                          ? 'bg-[#58A6FF]/20 text-[#58A6FF] border border-[#58A6FF]/50 shadow'
                          : 'bg-[#161B22] text-[#8B949E] border border-[#30363D] hover:text-[#E6EDF3]'
                      }`}
                    >
                      <span>GW {gw.gameweek}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold ${
                          gw.classification === 'HISTORICAL_REPLAY'
                            ? 'bg-[#F0A500]/20 text-[#F0A500]'
                            : 'bg-[#3FB950]/20 text-[#3FB950]'
                        }`}
                      >
                        {gw.classification === 'HISTORICAL_REPLAY' ? 'HISTORICAL REPLAY' : 'PROSPECTIVE (LOCKED)'}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Selected Gameweek Deep Dive */}
                {selectedGWObj && (
                  <div className="space-y-6">
                    {/* Hero GW Banner */}
                    <div className="bg-gradient-to-r from-[#161B22] via-[#1c2333] to-[#161B22] border border-[#30363D] rounded-2xl p-5 shadow-xl space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#30363D]/60 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-[#58A6FF]/10 text-[#58A6FF] font-black text-base flex items-center justify-center">
                            GW{selectedGWObj.gameweek}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-extrabold text-base text-[#E6EDF3]">
                                Gameweek {selectedGWObj.gameweek} Ledger
                              </h3>
                              <span
                                className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                                  selectedGWObj.status === 'COMPLETE'
                                    ? 'bg-[#238636]/20 text-[#3FB950] border-[#238636]/40'
                                    : 'bg-[#58A6FF]/20 text-[#58A6FF] border-[#58A6FF]/40 animate-pulse'
                                }`}
                              >
                                {selectedGWObj.status}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#8B949E]">
                              Model: <span className="font-semibold text-[#E6EDF3]">{selectedGWObj.model_version}</span> • Formation: <span className="font-semibold text-[#E6EDF3]">{selectedGWObj.formation}</span> • Deadline: <span className="font-semibold text-[#E6EDF3]">{selectedGWObj.deadline}</span>
                            </p>
                          </div>
                        </div>

                        {/* View Switcher */}
                        <div className="flex items-center bg-[#0D1117] p-1 rounded-lg border border-[#30363D]">
                          <button
                            onClick={() => setPerfViewMode('pitch')}
                            className={`px-3 py-1 text-xs font-bold rounded ${
                              perfViewMode === 'pitch' ? 'bg-[#161B22] text-[#58A6FF] shadow' : 'text-[#8B949E] hover:text-[#E6EDF3]'
                            }`}
                          >
                            Pitch View
                          </button>
                          <button
                            onClick={() => setPerfViewMode('table')}
                            className={`px-3 py-1 text-xs font-bold rounded ${
                              perfViewMode === 'table' ? 'bg-[#161B22] text-[#58A6FF] shadow' : 'text-[#8B949E] hover:text-[#E6EDF3]'
                            }`}
                          >
                            Table View
                          </button>
                        </div>
                      </div>

                      {/* Score Metrics Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-[#0D1117]/80 border border-[#30363D]/60 p-3 rounded-xl text-center">
                          <div className="text-[10px] text-[#8B949E] uppercase font-bold">Projected Score</div>
                          <div className="text-xl font-black text-[#58A6FF] mt-0.5">
                            {selectedGWObj.projected_total.toFixed(2)} <span className="text-xs font-normal">xP</span>
                          </div>
                          <div className="text-[9px] text-[#8B949E] mt-0.5">
                            XI: {selectedGWObj.xi_predicted_base.toFixed(2)} + Capt: {selectedGWObj.captain_expected_bonus.toFixed(2)}
                          </div>
                        </div>

                        <div className="bg-[#0D1117]/80 border border-[#30363D]/60 p-3 rounded-xl text-center">
                          <div className="text-[10px] text-[#8B949E] uppercase font-bold">Actual Points</div>
                          <div className="text-xl font-black text-[#3FB950] mt-0.5">
                            {selectedGWObj.actual_total !== null ? `${selectedGWObj.actual_total} pts` : 'Pending'}
                          </div>
                          <div className="text-[9px] text-[#8B949E] mt-0.5">
                            {selectedGWObj.actual_total !== null
                              ? `XI Raw: ${selectedGWObj.xi_raw_actual} + Capt Extra: +${selectedGWObj.captain_actual_extra}`
                              : 'Awaiting match finish'}
                          </div>
                        </div>

                        <div className="bg-[#0D1117]/80 border border-[#30363D]/60 p-3 rounded-xl text-center">
                          <div className="text-[10px] text-[#8B949E] uppercase font-bold">Realization Delta</div>
                          <div
                            className={`text-xl font-black mt-0.5 ${
                              selectedGWObj.delta === null
                                ? 'text-[#8B949E]'
                                : selectedGWObj.delta >= 0
                                ? 'text-[#3FB950]'
                                : 'text-[#F85149]'
                            }`}
                          >
                            {selectedGWObj.delta !== null ? `${selectedGWObj.delta > 0 ? '+' : ''}${selectedGWObj.delta.toFixed(2)} pts` : 'Pending'}
                          </div>
                          <div className="text-[9px] text-[#8B949E] mt-0.5">
                            {selectedGWObj.delta !== null ? (selectedGWObj.delta >= 0 ? 'Outperformed' : 'Underperformed') : 'Pending match finish'}
                          </div>
                        </div>

                        <div className="bg-[#0D1117]/80 border border-[#30363D]/60 p-3 rounded-xl text-center">
                          <div className="text-[10px] text-[#8B949E] uppercase font-bold">15-Player Squad Total</div>
                          <div className="text-xl font-black text-[#F0A500] mt-0.5">
                            {selectedGWObj.total_15_raw_actual !== null ? `${selectedGWObj.total_15_raw_actual} pts` : 'Pending'}
                          </div>
                          <div className="text-[9px] text-[#8B949E] mt-0.5">
                            {selectedGWObj.bench_actual !== null ? `Bench Total: ${selectedGWObj.bench_actual} pts` : 'Pending'}
                          </div>
                        </div>
                      </div>

                      {/* Captain Accounting Card */}
                      <div className="bg-[#0D1117]/60 border border-[#30363D]/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-[#F0A500] text-[#0D1117] font-black text-base flex items-center justify-center shadow">
                            C
                          </div>
                          <div>
                            <div className="text-xs text-[#8B949E] font-semibold">SELECTED CAPTAIN</div>
                            <div className="font-extrabold text-sm text-[#E6EDF3]">
                              {selectedGWObj.captain.name} <span className="text-xs text-[#8B949E]">({selectedGWObj.captain.club})</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
                          <div className="p-2 bg-[#161B22] rounded-lg border border-[#30363D]/40">
                            <div className="text-[9px] text-[#8B949E] uppercase">Predicted Base</div>
                            <div className="font-bold text-[#58A6FF]">{selectedGWObj.captain.predicted_base_xp.toFixed(2)} xP</div>
                          </div>
                          <div className="p-2 bg-[#161B22] rounded-lg border border-[#30363D]/40">
                            <div className="text-[9px] text-[#8B949E] uppercase">Expected (2x)</div>
                            <div className="font-bold text-[#58A6FF]">{selectedGWObj.captain.expected_captain_contribution.toFixed(2)} xP</div>
                          </div>
                          <div className="p-2 bg-[#161B22] rounded-lg border border-[#30363D]/40">
                            <div className="text-[9px] text-[#8B949E] uppercase">Actual Base</div>
                            <div className="font-bold text-[#3FB950]">
                              {selectedGWObj.captain.actual_base !== null ? `${selectedGWObj.captain.actual_base} pts` : 'Pending'}
                            </div>
                          </div>
                          <div className="p-2 bg-[#161B22] rounded-lg border border-[#30363D]/40">
                            <div className="text-[9px] text-[#8B949E] uppercase">Actual (2x)</div>
                            <div className="font-bold text-[#F0A500]">
                              {selectedGWObj.captain.actual_captain_contribution !== null ? `${selectedGWObj.captain.actual_captain_contribution} pts` : 'Pending'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Squad Visualization (Pitch or Table) */}
                    {perfViewMode === 'pitch' ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-[#8B949E] uppercase tracking-wider">
                            Gameweek {selectedGWObj.gameweek} Starting XI ({selectedGWObj.formation})
                          </h4>
                          <span className="text-xs text-[#8B949E]">
                            Values: <span className="text-[#58A6FF] font-bold">Predicted xP</span> → <span className="text-[#3FB950] font-bold">Actual Pts</span>
                          </span>
                        </div>

                        {/* Custom Pitch for Performance with Predicted & Actual Metrics */}
                        <div className="relative w-full rounded-2xl overflow-hidden border border-[#238636]/40 bg-gradient-to-b from-[#0e3a1f] via-[#124d29] to-[#0a2e18] shadow-2xl p-4 sm:p-6 min-h-[480px] flex flex-col justify-between">
                          {/* Pitch Turf Markings */}
                          <div className="absolute inset-0 pointer-events-none opacity-20">
                            <div className="absolute inset-x-4 inset-y-4 border border-white/40 rounded-xl" />
                            <div className="absolute top-1/2 inset-x-4 border-t border-white/40 -translate-y-1/2" />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-28 w-28 rounded-full border border-white/40" />
                          </div>

                          {/* Row 1: Goalkeeper */}
                          <div className="relative z-10 flex justify-center items-center py-1">
                            {selectedGWObj.starting_xi.filter((p) => p.position === 'GK').map((p) => (
                              <PerfPlayerPitchCard key={p.player_id} player={p} />
                            ))}
                          </div>

                          {/* Row 2: Defenders */}
                          <div className="relative z-10 flex justify-around items-center py-1 gap-1 sm:gap-2">
                            {selectedGWObj.starting_xi.filter((p) => p.position === 'DEF').map((p) => (
                              <PerfPlayerPitchCard key={p.player_id} player={p} />
                            ))}
                          </div>

                          {/* Row 3: Midfielders */}
                          <div className="relative z-10 flex justify-around items-center py-1 gap-1 sm:gap-2">
                            {selectedGWObj.starting_xi.filter((p) => p.position === 'MID').map((p) => (
                              <PerfPlayerPitchCard key={p.player_id} player={p} />
                            ))}
                          </div>

                          {/* Row 4: Forwards */}
                          <div className="relative z-10 flex justify-around items-center py-1 gap-1 sm:gap-2">
                            {selectedGWObj.starting_xi.filter((p) => p.position === 'FWD').map((p) => (
                              <PerfPlayerPitchCard key={p.player_id} player={p} />
                            ))}
                          </div>
                        </div>

                        {/* Bench Section */}
                        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4 space-y-3">
                          <div className="flex items-center justify-between border-b border-[#30363D]/60 pb-2">
                            <span className="text-xs font-bold text-[#E6EDF3] uppercase tracking-wider">
                              Gameweek {selectedGWObj.gameweek} Bench ({selectedGWObj.bench.length} Substitutes)
                            </span>
                            <span className="text-xs text-[#8B949E]">
                              {selectedGWObj.bench_actual !== null ? `Total Realized: ${selectedGWObj.bench_actual} pts` : 'Pending'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {selectedGWObj.bench.map((player, idx) => (
                              <div
                                key={player.player_id}
                                className="bg-[#0D1117] border border-[#30363D] rounded-lg p-2.5 flex flex-col justify-between"
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[10px] font-bold text-[#8B949E] bg-[#30363D]/50 px-1.5 py-0.5 rounded">
                                    #{player.bench_order ?? idx + 1}
                                  </span>
                                  <span className="text-[10px] font-semibold text-[#58A6FF]">{player.position}</span>
                                </div>
                                <div className="flex items-center gap-2 mb-1">
                                  <ClubJerseySvg club={player.club} position={player.position} />
                                  <div className="min-w-0">
                                    <div className="truncate font-semibold text-xs text-[#E6EDF3]">{player.web_name}</div>
                                    <div className="text-[11px] text-[#8B949E] truncate">{player.club}</div>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between mt-2 pt-1 border-t border-[#30363D]/40 text-xs">
                                  <span className="text-[#58A6FF] font-bold">{player.predicted_xp.toFixed(2)} xP</span>
                                  <span className="font-extrabold text-[#3FB950]">
                                    {player.actual_points !== null ? `${player.actual_points} pts` : 'Pending'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Table View of 15 Players */
                      <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden shadow-lg">
                        <div className="p-4 border-b border-[#30363D] flex items-center justify-between">
                          <h4 className="text-xs font-bold text-[#E6EDF3] uppercase tracking-wider">
                            Gameweek {selectedGWObj.gameweek} Complete 15-Player Comparison Table
                          </h4>
                          <span className="text-xs text-[#8B949E]">11 Starters + 4 Bench</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-[#0D1117]/80 text-[#8B949E] uppercase font-bold border-b border-[#30363D]/60">
                              <tr>
                                <th className="py-2.5 px-3">Role</th>
                                <th className="py-2.5 px-3">Player</th>
                                <th className="py-2.5 px-3">Club</th>
                                <th className="py-2.5 px-3">Opponent</th>
                                <th className="py-2.5 px-3 text-center">Predicted xP</th>
                                <th className="py-2.5 px-3 text-center">Actual Pts</th>
                                <th className="py-2.5 px-3 text-center">Delta</th>
                                <th className="py-2.5 px-3 text-center">Minutes</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#30363D]/30">
                              {/* Starters */}
                              {selectedGWObj.starting_xi.map((p) => (
                                <tr key={p.player_id} className="hover:bg-white/[0.02] transition-colors">
                                  <td className="py-2.5 px-3 font-semibold text-[#58A6FF]">
                                    {p.is_captain ? <span className="bg-[#F0A500] text-[#0D1117] px-1.5 py-0.5 rounded font-black">C</span> : p.is_vice_captain ? <span className="bg-[#E6EDF3] text-[#0D1117] px-1.5 py-0.5 rounded font-black">V</span> : 'XI'}
                                  </td>
                                  <td className="py-2.5 px-3 font-bold text-[#E6EDF3] flex items-center gap-2">
                                    <ClubJerseySvg club={p.club} position={p.position} />
                                    {p.web_name}
                                  </td>
                                  <td className="py-2.5 px-3 text-[#8B949E]">{p.club}</td>
                                  <td className="py-2.5 px-3 text-[#8B949E]">{p.opponent ? `${p.opponent} (${p.home_away || 'H'})` : '—'}</td>
                                  <td className="py-2.5 px-3 text-center font-bold text-[#58A6FF]">{p.predicted_xp.toFixed(2)}</td>
                                  <td className="py-2.5 px-3 text-center font-black text-[#3FB950]">{p.actual_points !== null ? p.actual_points : 'Pending'}</td>
                                  <td className={`py-2.5 px-3 text-center font-bold ${p.delta !== null ? (p.delta >= 0 ? 'text-[#3FB950]' : 'text-[#F85149]') : 'text-[#8B949E]'}`}>
                                    {p.delta !== null ? `${p.delta > 0 ? '+' : ''}${p.delta.toFixed(2)}` : 'Pending'}
                                  </td>
                                  <td className="py-2.5 px-3 text-center text-[#8B949E]">{p.minutes !== null ? `${p.minutes}'` : '—'}</td>
                                </tr>
                              ))}

                              {/* Bench Header */}
                              <tr className="bg-[#0D1117]/60">
                                <td colSpan={8} className="py-2 px-3 text-[11px] font-bold text-[#8B949E] uppercase tracking-wider">
                                  Bench Substitutes
                                </td>
                              </tr>

                              {/* Bench */}
                              {selectedGWObj.bench.map((p, idx) => (
                                <tr key={p.player_id} className="hover:bg-white/[0.02] transition-colors bg-[#0D1117]/20">
                                  <td className="py-2.5 px-3 font-semibold text-[#8B949E]">
                                    #{p.bench_order ?? idx + 1}
                                  </td>
                                  <td className="py-2.5 px-3 font-bold text-[#E6EDF3] flex items-center gap-2">
                                    <ClubJerseySvg club={p.club} position={p.position} />
                                    {p.web_name}
                                  </td>
                                  <td className="py-2.5 px-3 text-[#8B949E]">{p.club}</td>
                                  <td className="py-2.5 px-3 text-[#8B949E]">{p.opponent ? `${p.opponent} (${p.home_away || 'H'})` : '—'}</td>
                                  <td className="py-2.5 px-3 text-center font-bold text-[#58A6FF]">{p.predicted_xp.toFixed(2)}</td>
                                  <td className="py-2.5 px-3 text-center font-black text-[#3FB950]">{p.actual_points !== null ? p.actual_points : 'Pending'}</td>
                                  <td className={`py-2.5 px-3 text-center font-bold ${p.delta !== null ? (p.delta >= 0 ? 'text-[#3FB950]' : 'text-[#F85149]') : 'text-[#8B949E]'}`}>
                                    {p.delta !== null ? `${p.delta > 0 ? '+' : ''}${p.delta.toFixed(2)}` : 'Pending'}
                                  </td>
                                  <td className="py-2.5 px-3 text-center text-[#8B949E]">{p.minutes !== null ? `${p.minutes}'` : '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Governance Exclusions Note */}
                    <div className="bg-[#0D1117] border border-[#30363D]/60 rounded-xl p-4 text-xs text-[#8B949E] space-y-1 shadow">
                      <div className="font-bold text-[#E6EDF3]">Governance & Ledger Integrity Note:</div>
                      <p>
                        {selectedGWObj.classification === 'HISTORICAL_REPLAY'
                          ? 'Gameweek 1 is classified as an authenticated historical retrospective replay. In accordance with Ennovera scientific governance, historical replay outcomes are separated from official prospective manager ledgers.'
                          : 'Gameweek 2 represents the first official prospective decision freeze. All player expected points and captaincy allocations were cryptographically locked prior to deadline.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function PerfPlayerPitchCard({ player }: { player: FPLPerformancePlayer }) {
  const isCap = player.is_captain
  const isVice = player.is_vice_captain

  return (
    <div className="flex flex-col items-center group cursor-pointer transition-transform hover:scale-105 select-none max-w-[80px] sm:max-w-[104px] w-full">
      {/* Jersey Icon Container & C/VC Badges */}
      <div className="relative flex items-center justify-center">
        {isCap && (
          <span
            className="absolute -top-1.5 -right-1.5 z-20 h-5 w-5 rounded-full bg-[#F0A500] text-[#0D1117] font-black text-[11px] flex items-center justify-center shadow-lg border border-black/40"
            title="Captain (2x Points)"
          >
            C
          </span>
        )}
        {isVice && !isCap && (
          <span
            className="absolute -top-1.5 -right-1.5 z-20 h-5 w-5 rounded-full bg-[#E6EDF3] text-[#0D1117] font-black text-[11px] flex items-center justify-center shadow-lg border border-black/40"
            title="Vice-Captain"
          >
            V
          </span>
        )}

        {/* Authentic Club Kit Silhouette */}
        <ClubJerseySvg club={player.club} position={player.position} isCaptain={isCap} />
      </div>

      {/* Name and Dual Metric Plate */}
      <div className="mt-1 w-full bg-[#0D1117]/90 backdrop-blur-sm border border-white/20 rounded px-1 py-1 text-center shadow">
        <div className="text-[10px] sm:text-xs font-bold text-[#E6EDF3] truncate" title={player.name}>
          {player.web_name}
        </div>
        <div className="text-[8px] sm:text-[9px] text-[#8B949E] truncate">
          {player.opponent ? `${player.club.slice(0, 3).toUpperCase()} • ${player.opponent.slice(0, 3).toUpperCase()}` : player.club}
        </div>
        <div className="flex items-center justify-center gap-1 text-[9px] sm:text-[10px] font-extrabold mt-0.5 border-t border-white/10 pt-0.5">
          <span className="text-[#58A6FF]" title="Predicted xP">{player.predicted_xp.toFixed(1)}</span>
          <span className="text-[#8B949E]">→</span>
          <span className={player.actual_points !== null ? 'text-[#3FB950]' : 'text-[#8B949E]'} title="Actual Points">
            {player.actual_points !== null ? `${player.actual_points}p` : '—'}
          </span>
        </div>
      </div>
    </div>
  )
}
