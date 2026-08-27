'use client'

import { useState, useEffect, useCallback } from 'react'
import Navbar from '@/components/Navbar'
import { PitchVisualization } from '@/components/fantasy/PitchVisualization'
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
    perfHeading: '2026-27 Prospective AI Performance',
    perfNotice: 'Tracking real realized points achieved by Ennovera AI starting from Gameweek 1.',
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
    freeTransfers: 'گواستنەوەی بێ بەرامبەر',
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
      console.error('[Fantasy Page] General fetch error:', err)
      setError(err?.message || 'Failed loading Fantasy AI intelligence.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFantasyData()
  }, [fetchFantasyData])

  const deadlineFormatted = plan?.deadline
    ? new Date(plan.deadline).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—'

  return (
    <div className="min-h-screen bg-[#0D1117] text-[#E6EDF3]">
      <Navbar language={language} onLanguageChange={changeLanguage} />

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-6 pb-24 md:pb-12">
        {/* Hero Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#30363D] pb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-black text-[#E6EDF3] tracking-tight">
                {t.title}
              </h1>
              <span className="text-xs font-bold text-[#F0A500] bg-[#F0A500]/15 border border-[#F0A500]/40 px-2.5 py-0.5 rounded-full">
                {t.beta}
              </span>
            </div>
            <p className="text-sm text-[#8B949E] mt-1.5 max-w-2xl">{t.subtitle}</p>
          </div>

          <FreshnessTag generatedAt={plan?.generated_at} />
        </div>

        {/* Hero Key Metrics Card */}
        {plan && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#161B22] border border-[#30363D] p-4 rounded-2xl shadow-xl">
            <div className="p-3 bg-[#0D1117]/60 rounded-xl border border-[#30363D]/40">
              <div className="text-[11px] font-semibold text-[#8B949E] uppercase">{t.gameweek}</div>
              <div className="text-xl font-black text-[#58A6FF] mt-0.5">GW {plan.gameweek}</div>
            </div>

            <div className="p-3 bg-[#0D1117]/60 rounded-xl border border-[#30363D]/40">
              <div className="text-[11px] font-semibold text-[#8B949E] uppercase">{t.deadline}</div>
              <div className="text-xs sm:text-sm font-bold text-[#E6EDF3] mt-1 truncate" title={deadlineFormatted}>
                {deadlineFormatted}
              </div>
            </div>

            <div className="p-3 bg-[#0D1117]/60 rounded-xl border border-[#30363D]/40">
              <div className="text-[11px] font-semibold text-[#8B949E] uppercase">{t.expectedPts}</div>
              <div className="text-xl font-black text-[#3FB950] mt-0.5">
                {plan.expected_total_points.toFixed(1)} <span className="text-xs font-normal">pts</span>
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
                      <div className="h-10 w-10 rounded-full bg-[#F0A500]/20 border border-[#F0A500] text-[#F0A500] font-black text-sm flex items-center justify-center">
                        C
                      </div>
                      <div>
                        <div className="font-extrabold text-sm text-[#E6EDF3]">{plan.captain.name}</div>
                        <div className="text-xs text-[#8B949E]">{plan.captain.club} • £{plan.captain.price.toFixed(1)}m</div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#30363D]/40 flex justify-between items-center text-xs text-[#8B949E]">
                      <span>{t.viceTitle}: <strong className="text-[#E6EDF3]">{plan.vice_captain.name}</strong></span>
                      <span className="text-[11px] font-semibold text-[#58A6FF]">{plan.vice_captain.expected_points.toFixed(1)} xP</span>
                    </div>
                  </div>

                  {/* Chip Guidance Card */}
                  <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4 shadow-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#58A6FF] uppercase tracking-wider">
                        {t.tabChips}
                      </span>
                      <span
                        className={`text-xs font-extrabold px-2 py-0.5 rounded ${
                          plan.chip_recommendation.action === 'USE'
                            ? 'bg-[#3FB950]/20 text-[#3FB950] border border-[#3FB950]/40'
                            : 'bg-[#8B949E]/10 text-[#8B949E] border border-[#8B949E]/30'
                        }`}
                      >
                        {plan.chip_recommendation.action === 'USE'
                          ? `ACTIVATE ${plan.chip_recommendation.chip_name?.toUpperCase()}`
                          : 'HOLD CHIPS'}
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
                  <span className="text-xs text-[#8B949E]">
                    {t.freeTransfers}: <strong className="text-[#58A6FF]">{plan.free_transfers}</strong>
                  </span>
                </div>

                {transfers.length === 0 ? (
                  <div className="bg-[#161B22] border border-[#238636]/40 rounded-2xl p-6 sm:p-8 text-center space-y-3">
                    <div className="h-12 w-12 rounded-full bg-[#238636]/20 border border-[#238636] text-[#3FB950] flex items-center justify-center mx-auto text-xl font-bold">
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

            {/* TAB 5: PERFORMANCE */}
            {activeTab === 'perf' && performance && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-base font-bold text-[#E6EDF3]">{t.perfHeading}</h2>
                  <p className="text-xs text-[#8B949E] mt-0.5">{t.perfNotice}</p>
                </div>

                {/* Scorecards */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="bg-[#161B22] border border-[#30363D] p-3 rounded-xl text-center">
                    <div className="text-[10px] text-[#8B949E] uppercase font-bold">{t.totPts}</div>
                    <div className="text-xl font-black text-[#3FB950] mt-1">{performance.total_points}</div>
                  </div>
                  <div className="bg-[#161B22] border border-[#30363D] p-3 rounded-xl text-center">
                    <div className="text-[10px] text-[#8B949E] uppercase font-bold">{t.avgPts}</div>
                    <div className="text-xl font-black text-[#58A6FF] mt-1">{performance.average_points.toFixed(1)}</div>
                  </div>
                  <div className="bg-[#161B22] border border-[#30363D] p-3 rounded-xl text-center">
                    <div className="text-[10px] text-[#8B949E] uppercase font-bold">{t.captPts}</div>
                    <div className="text-xl font-black text-[#F0A500] mt-1">{performance.captain_points}</div>
                  </div>
                  <div className="bg-[#161B22] border border-[#30363D] p-3 rounded-xl text-center">
                    <div className="text-[10px] text-[#8B949E] uppercase font-bold">{t.transCost}</div>
                    <div className="text-xl font-black text-[#F85149] mt-1">-{performance.transfer_costs}</div>
                  </div>
                  <div className="bg-[#161B22] border border-[#30363D] p-3 rounded-xl text-center">
                    <div className="text-[10px] text-[#8B949E] uppercase font-bold">{t.benchMissed}</div>
                    <div className="text-xl font-black text-[#8B949E] mt-1">{performance.bench_points_missed}</div>
                  </div>
                </div>

                {/* Weekly Table */}
                <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden shadow-xl">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#30363D] bg-[#0D1117]/60 text-[#8B949E] uppercase font-bold">
                        <th className="py-3 px-4 text-center">{t.colGw}</th>
                        <th className="py-3 px-4 text-center">{t.colScore}</th>
                        <th className="py-3 px-4">{t.colCapt}</th>
                        <th className="py-3 px-4 text-center">{t.colTrans}</th>
                        <th className="py-3 px-4 text-center">{t.colChip}</th>
                        <th className="py-3 px-4 text-center">{t.colBench}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#30363D]/40 font-medium">
                      {performance.history.map((h) => (
                        <tr key={h.gameweek} className="hover:bg-white/[0.02]">
                          <td className="py-3 px-4 text-center font-bold text-[#58A6FF]">GW {h.gameweek}</td>
                          <td className="py-3 px-4 text-center font-extrabold text-sm text-[#3FB950]">{h.score} pts</td>
                          <td className="py-3 px-4 font-bold text-[#E6EDF3]">{h.captain_name} ({h.captain_pts} pts)</td>
                          <td className="py-3 px-4 text-center text-[#8B949E]">{h.transfers_made} (cost -{h.hit_cost})</td>
                          <td className="py-3 px-4 text-center text-[#8B949E]">{h.chip_used}</td>
                          <td className="py-3 px-4 text-center text-[#8B949E]">{h.bench_pts} pts</td>
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
