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
    subtitle: 'Calibrated Premier League decision intelligence combining central expected points with probabilistic scoring distributions.',
    beta: 'Beta',
    gameweek: 'Gameweek',
    deadline: 'Official Deadline',
    expectedPts: 'Projected Gameweek Score',
    bank: 'In Bank',
    freeTransfers: 'Free Transfers',
    tabPlan: 'Gameweek Plan',
    tabPerf: 'Performance',
    tabTransfers: 'Transfers',
    tabCaptain: 'Captaincy',
    tabChips: 'Chip Strategy',
    holdTransferTitle: 'Hold Transfer (No Move Recommended)',
    holdTransferDesc: 'Current owned squad is projected to outperform all available single and double transfer replacement candidates within budget.',
    transfersHeading: 'Recommended Transfers',
    out: 'OUT',
    in: 'IN',
    hitCost: 'Hit Cost',
    expGain: '3-GW Opportunity Gain',
    captTitle: 'Recommended Captain',
    viceTitle: 'Vice-Captain',
    haulProb: '10+ Points Chance',
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
    deadline: 'کاتی کۆتایی فەرمی',
    expectedPts: 'خاڵی پێشبینیکراوی ئەم هەفتەیە',
    bank: 'بودجەی ماوە',
    freeTransfers: 'گواستنەوەی بێ بەرامەر',
    tabPlan: 'پلانی گەڕ',
    tabPerf: 'ئەنجامەکان',
    tabTransfers: 'گواستنەوەکان',
    tabCaptain: 'کاپتنی',
    tabChips: 'ستراتیژی چیپەکان',
    holdTransferTitle: 'گواستنەوە مەکە (پێکهاتە جێگیرە)',
    holdTransferDesc: 'پێکهاتەی ئێستا ئاستی بەرزترە لە هەر بژاردەیەکی گواستنەوە لە بازاڕدا لەم هەفتەیەدا.',
    transfersHeading: 'گواستنەوەی پێشنیارکراو',
    out: 'چوونەدەرەوە',
    in: 'هاتنەژوورەوە',
    hitCost: 'سزای خاڵ',
    expGain: 'قازانجی ٣ هەفتە',
    captTitle: 'کاپتنی پێشنیارکراو',
    viceTitle: 'جێگری کاپتن',
    haulProb: 'دەرفەتی دەستکەوتی ١٠+ خاڵ',
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

function formatDeadline(isoString?: string): string {
  if (!isoString) return 'Fri, 4 Sep 2026, 17:30 UTC'
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return isoString
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
      timeZoneName: 'short',
    }
    return d.toLocaleDateString('en-GB', options)
  } catch {
    return isoString
  }
}

export default function FantasyPage() {
  const { language, changeLanguage } = useLanguage()
  const t = L[language]

  const [activeTab, setActiveTab] = useState<'plan' | 'perf' | 'transfers' | 'captain' | 'chips'>('plan')
  const [planSubView, setPlanSubView] = useState<'best_xi' | 'squad_100m' | 'manager'>('best_xi')
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
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#E6EDF3] flex items-center gap-2">
                {t.title}
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 bg-[#3FB950]/15 text-[#3FB950] border border-[#3FB950]/40 rounded-full uppercase tracking-wider">
                ENNOVERA HYBRID
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 bg-[#58A6FF]/10 text-[#58A6FF] border border-[#58A6FF]/30 rounded-full">
                FROZEN PRE-DEADLINE
              </span>
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
                GW3
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
                <div className="text-xs font-bold text-[#E6EDF3] truncate" title={plan.deadline}>
                  {formatDeadline(plan.deadline)}
                </div>
              </div>
            </div>

            <div className="p-3 bg-[#0D1117]/60 rounded-xl border border-[#30363D]/40">
              <div className="text-[11px] font-semibold text-[#8B949E] uppercase">Expected Best XI xP</div>
              <div className="text-xl font-black text-[#3FB950] mt-0.5">
                {(plan.expected_best_xi?.expected_total_points || plan.expected_total_points).toFixed(2)} <span className="text-xs font-normal text-[#8B949E]">xP</span>
              </div>
              <div className="text-[10px] text-[#8B949E]">Likely: 74–91 pts | Upside: 94 pts</div>
            </div>

            <div className="p-3 bg-[#0D1117]/60 rounded-xl border border-[#30363D]/40 flex justify-between items-center">
              <div>
                <div className="text-[11px] font-semibold text-[#8B949E] uppercase">Best £100m Squad</div>
                <div className="text-sm font-extrabold text-[#58A6FF] mt-0.5">
                  {(plan.best_playable_100m?.expected_total_points || 80.75).toFixed(2)} xP
                </div>
                <div className="text-[10px] text-[#8B949E]">Likely: 72–89 pts</div>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-semibold text-[#8B949E] uppercase">{t.freeTransfers}</div>
                <div className="text-sm font-extrabold text-[#3FB950] mt-0.5">{plan.free_transfers}</div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Tabs (Performance is 2nd) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-[#30363D] scrollbar-none">
          {[
            { id: 'plan', label: t.tabPlan },
            { id: 'perf', label: t.tabPerf },
            { id: 'transfers', label: t.tabTransfers },
            { id: 'captain', label: t.tabCaptain },
            { id: 'chips', label: t.tabChips },
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
              <div className="space-y-4">
                {/* Sub-view switcher for Plan: Best XI vs Best £100m vs Manager Team */}
                <div className="flex items-center gap-2 bg-[#161B22] p-1.5 rounded-xl border border-[#30363D] w-fit flex-wrap">
                  <button
                    onClick={() => setPlanSubView('best_xi')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
                      planSubView === 'best_xi'
                        ? 'bg-[#58A6FF] text-[#0D1117]'
                        : 'text-[#8B949E] hover:text-[#E6EDF3]'
                    }`}
                  >
                    <span>EXPECTED BEST XI (83.09 xP)</span>
                    <span className="text-[9px] px-1.5 py-0.2 bg-[#3FB950] text-[#0D1117] font-extrabold rounded">FROZEN</span>
                  </button>
                  <button
                    onClick={() => setPlanSubView('squad_100m')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
                      planSubView === 'squad_100m'
                        ? 'bg-[#58A6FF] text-[#0D1117]'
                        : 'text-[#8B949E] hover:text-[#E6EDF3]'
                    }`}
                  >
                    <span>BEST PLAYABLE £100M (80.75 xP)</span>
                    <span className="text-[9px] px-1.5 py-0.2 bg-[#3FB950] text-[#0D1117] font-extrabold rounded">FROZEN</span>
                  </button>
                  <button
                    onClick={() => setPlanSubView('manager')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
                      planSubView === 'manager'
                        ? 'bg-[#58A6FF] text-[#0D1117]'
                        : 'text-[#8B949E] hover:text-[#E6EDF3]'
                    }`}
                  >
                    <span>AI MANAGER TEAM</span>
                    <span className="text-[9px] px-1.5 py-0.2 bg-[#F0A500] text-[#0D1117] font-extrabold rounded">PENDING</span>
                  </button>
                </div>

                {/* Sub-View Content */}
                {planSubView === 'manager' ? (
                  <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-8 text-center space-y-3 shadow-xl">
                    <div className="inline-flex h-12 w-12 rounded-full bg-[#F0A500]/10 text-[#F0A500] items-center justify-center text-xl font-bold mb-1">
                      ⏱
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <h3 className="text-lg font-bold text-[#E6EDF3]">AI Manager Team</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-[#F0A500]/15 text-[#F0A500] border border-[#F0A500]/30 rounded-full">
                        STATUS: PENDING
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-[#8B949E] max-w-xl mx-auto leading-relaxed">
                      GW3 Manager Team will be finalized after GW2 completion and before the GW3 deadline.
                    </p>
                    <div className="p-3 bg-[#0D1117] border border-[#30363D]/60 rounded-xl max-w-lg mx-auto text-xs text-[#8B949E] space-y-1">
                      <div className="text-[#58A6FF] font-semibold">
                        Expected Best XI (83.09 xP) and Best Playable £100m (80.75 xP) are already available.
                      </div>
                      <div>
                        Description: Practical recommendation based on your current squad, bank, free transfers and transfer rules.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    {/* Left 2 Cols: Pitch & Bench */}
                    <div className="lg:col-span-2 space-y-3">
                      {/* Object Banner */}
                      <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-3.5 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black uppercase text-[#E6EDF3]">
                              {planSubView === 'best_xi' ? 'Expected Best XI' : 'Best Playable £100m Squad'}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-[#3FB950]/15 text-[#3FB950] border border-[#3FB950]/30 rounded">
                              {planSubView === 'best_xi'
                                ? `${(plan.expected_best_xi?.expected_total_points || plan.expected_total_points).toFixed(2)} xP`
                                : `${(plan.best_playable_100m?.expected_total_points || 80.75).toFixed(2)} xP`}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-[#58A6FF]/10 text-[#58A6FF] border border-[#58A6FF]/30 rounded">
                              FROZEN PRE-DEADLINE
                            </span>
                          </div>
                          <p className="text-[11px] text-[#8B949E] leading-relaxed max-w-xl">
                            {planSubView === 'best_xi'
                              ? 'Highest projected XI without the full £100m 15-player squad-budget constraint. Formation and maximum-three-per-club rules still apply. (Theoretical Model xP Ceiling)'
                              : 'Highest projected starting XI obtained from a fully legal 15-player FPL squad costing no more than £100m. Starting XI: £83.5m • Bench: £16.5m • Total: £100.0m • Bank: £0.0m'}
                          </p>
                        </div>
                        <div className="text-right sm:text-right shrink-0">
                          <div className="text-xs font-bold text-[#58A6FF]">
                            Likely Range: {planSubView === 'best_xi' ? '74 – 91 pts' : '72 – 89 pts'}
                          </div>
                          <div className="text-[10px] text-[#8B949E]">
                            Upside (P80): {planSubView === 'best_xi' ? '94 pts' : '92 pts'} • High-Upside (P90): {planSubView === 'best_xi' ? '100 pts' : '98 pts'}
                          </div>
                        </div>
                      </div>

                      <PitchVisualization
                        formation={plan.formation}
                        startingXI={plan.starting_xi}
                        bench={planSubView === 'squad_100m' ? plan.bench : []}
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
                            {plan.captain.expected_points.toFixed(2)} xP
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-xl bg-[#F0A500] text-[#0D1117] font-black text-xl flex items-center justify-center shadow">
                            C
                          </div>
                          <div>
                            <h3 className="font-extrabold text-base text-[#E6EDF3]">{plan.captain.name}</h3>
                            <p className="text-xs text-[#8B949E]">
                              {plan.captain.club} • £{plan.captain.price.toFixed(1)}m • 10+ Points Chance: {Math.round(plan.captain.haul_probability * 100)}%
                            </p>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-[#30363D]/40 space-y-1 text-xs">
                          <div className="flex justify-between items-center text-[#8B949E]">
                            <span>Captain contribution:</span>
                            <strong className="text-[#3FB950]">{(plan.captain.expected_points * 2).toFixed(2)} projected pts (2x)</strong>
                          </div>
                          <div className="flex justify-between items-center text-[#8B949E]">
                            <span>{t.viceTitle}: <strong className="text-[#E6EDF3]">{plan.vice_captain.name}</strong></span>
                            <span className="text-[#3FB950] font-semibold">{plan.vice_captain.expected_points.toFixed(2)} xP</span>
                          </div>
                          <p className="text-[10px] text-[#8B949E] italic pt-1 border-t border-[#30363D]/30">
                            Captain points are counted twice in the projected team total.
                          </p>
                        </div>
                      </div>

                      {/* Distribution Summary Card */}
                      <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4 shadow-lg space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#58A6FF] uppercase tracking-wider">
                            Team Probability Metrics
                          </span>
                          <span className="text-[10px] font-bold text-[#8B949E]">500k Joint Draws</span>
                        </div>
                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between text-[#8B949E]">
                            <span>Median Score:</span>
                            <strong className="text-[#E6EDF3]">{planSubView === 'best_xi' ? '83.0 pts' : '81.0 pts'}</strong>
                          </div>
                          <div className="flex justify-between text-[#8B949E]">
                            <span>Likely Range [P25, P75]:</span>
                            <strong className="text-[#58A6FF]">{planSubView === 'best_xi' ? '74 – 91 pts' : '72 – 89 pts'}</strong>
                          </div>
                          <div className="flex justify-between text-[#8B949E]">
                            <span>Upside Score (P80):</span>
                            <strong className="text-[#F0A500]">{planSubView === 'best_xi' ? '94 pts' : '92 pts'}</strong>
                          </div>
                          <div className="flex justify-between text-[#8B949E]">
                            <span>High-Upside Score (P90):</span>
                            <strong className="text-[#D29922]">{planSubView === 'best_xi' ? '100 pts' : '98 pts'}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Methodology Notice */}
                      <div className="bg-[#0D1117] border border-[#30363D] rounded-xl p-3.5 text-[11px] text-[#8B949E] space-y-1">
                        <div className="font-bold text-[#E6EDF3]">Ennovera Hybrid Methodology</div>
                        <p className="leading-relaxed">
                          Central expected points are produced by Ennovera's frozen ranking model, while uncertainty and score probabilities are derived from Ennovera's calibrated Level-5 probability engine.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: PERFORMANCE V2 */}
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
                </div>

                {/* Performance Summary Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-[#161B22] rounded-xl border border-[#30363D]">
                    <div className="text-[11px] font-semibold text-[#8B949E] uppercase">Historical Actual (GW1)</div>
                    <div className="text-2xl font-black text-[#3FB950] mt-1">{performance.summary.historical_actual_total} pts</div>
                    <div className="text-[10px] text-[#8B949E]">Delta: +{performance.summary.historical_delta.toFixed(1)} pts</div>
                  </div>
                  <div className="p-3 bg-[#161B22] rounded-xl border border-[#30363D]">
                    <div className="text-[11px] font-semibold text-[#8B949E] uppercase">Historical Projected (GW1)</div>
                    <div className="text-2xl font-black text-[#58A6FF] mt-1">{performance.summary.historical_projected_total.toFixed(1)} xP</div>
                    <div className="text-[10px] text-[#8B949E]">1 Completed GW</div>
                  </div>
                  <div className="p-3 bg-[#161B22] rounded-xl border border-[#30363D]">
                    <div className="text-[11px] font-semibold text-[#8B949E] uppercase">Prospective GW2 Status</div>
                    <div className="text-2xl font-black text-[#F0A500] mt-1">IN PROGRESS</div>
                    <div className="text-[10px] text-[#8B949E]">Projected: 77.41 xP</div>
                  </div>
                  <div className="p-3 bg-[#161B22] rounded-xl border border-[#30363D]">
                    <div className="text-[11px] font-semibold text-[#8B949E] uppercase">Prospective GW3 Status</div>
                    <div className="text-2xl font-black text-[#58A6FF] mt-1">FROZEN</div>
                    <div className="text-[10px] text-[#8B949E]">Projected: 83.09 xP</div>
                  </div>
                </div>

                {/* Historical vs Prospective Ledger */}
                <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden shadow-lg">
                  <div className="p-4 border-b border-[#30363D] flex justify-between items-center">
                    <h3 className="text-sm font-bold text-[#E6EDF3]">Gameweek Ledger (GW1 – GW3)</h3>
                    <span className="text-xs text-[#8B949E]">Official Points</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left text-[#E6EDF3]">
                      <thead className="bg-[#0D1117] text-[#8B949E] border-b border-[#30363D]">
                        <tr>
                          <th className="px-4 py-2.5">{t.colGw}</th>
                          <th className="px-4 py-2.5">Predicted (Best XI)</th>
                          <th className="px-4 py-2.5">Actual Score</th>
                          <th className="px-4 py-2.5">{t.colCapt}</th>
                          <th className="px-4 py-2.5">{t.colChip}</th>
                          <th className="px-4 py-2.5">Classification</th>
                          <th className="px-4 py-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#30363D]/60">
                        <tr className="hover:bg-[#0D1117]/50">
                          <td className="px-4 py-3 font-bold text-[#58A6FF]">GW 1</td>
                          <td className="px-4 py-3 font-semibold text-[#3FB950]">78.65 xP</td>
                          <td className="px-4 py-3 font-bold text-[#E6EDF3]">108 pts (Manager) / 79 pts (Best XI)</td>
                          <td className="px-4 py-3">Haaland (4 pts)</td>
                          <td className="px-4 py-3 text-[#8B949E]">None</td>
                          <td className="px-4 py-3 text-[10px] text-[#8B949E]">HISTORICAL_REPLAY</td>
                          <td className="px-4 py-3 text-[#3FB950] font-bold">COMPLETED</td>
                        </tr>
                        <tr className="hover:bg-[#0D1117]/50">
                          <td className="px-4 py-3 font-bold text-[#58A6FF]">GW 2</td>
                          <td className="px-4 py-3 font-semibold text-[#3FB950]">77.41 xP</td>
                          <td className="px-4 py-3 font-bold text-[#F0A500]">PENDING</td>
                          <td className="px-4 py-3">Haaland</td>
                          <td className="px-4 py-3 text-[#8B949E]">None</td>
                          <td className="px-4 py-3 text-[10px] text-[#8B949E]">AUTHENTIC_PROSPECTIVE</td>
                          <td className="px-4 py-3 text-[#F0A500] font-bold">IN_PROGRESS</td>
                        </tr>
                        <tr className="hover:bg-[#0D1117]/50">
                          <td className="px-4 py-3 font-bold text-[#58A6FF]">GW 3</td>
                          <td className="px-4 py-3 font-semibold text-[#3FB950]">83.09 xP</td>
                          <td className="px-4 py-3 font-bold text-[#8B949E]">PENDING</td>
                          <td className="px-4 py-3">Haaland (C)</td>
                          <td className="px-4 py-3 text-[#8B949E]">None</td>
                          <td className="px-4 py-3 text-[10px] text-[#8B949E]">DEPLOYED_HYBRID_PROSPECTIVE</td>
                          <td className="px-4 py-3 text-[#58A6FF] font-bold">FROZEN</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: TRANSFERS */}
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

            {/* TAB 4: CAPTAIN */}
            {activeTab === 'captain' && captainData && (
              <div className="space-y-6">
                {/* Hero Captain Card */}
                <div className="bg-gradient-to-r from-[#161B22] to-[#1c222c] border border-[#F0A500]/40 rounded-2xl p-6 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#F0A500] uppercase tracking-wider">
                      ★ {t.captTitle}
                    </span>
                    <span className="text-xs font-bold text-[#F0A500] bg-[#F0A500]/10 border border-[#F0A500]/30 px-3 py-1 rounded-full">
                      {captainData.captain.expected_points.toFixed(2)} xP ({(captainData.captain.expected_points * 2).toFixed(2)} pts with 2x)
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
                          <span className="text-xs font-extrabold text-[#58A6FF]">{alt.expected_points.toFixed(2)} xP</span>
                        </div>
                        <div className="font-extrabold text-sm text-[#E6EDF3]">{alt.name}</div>
                        <div className="text-xs text-[#8B949E]">{alt.club}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: CHIPS */}
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
          </div>
        )}
      </main>
    </div>
  )
}
