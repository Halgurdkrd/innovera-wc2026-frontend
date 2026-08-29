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
    subtitle: 'Season-long autonomous AI manager combining central expected points with calibrated probabilistic distributions.',
    gameweek: 'Active Gameweek',
    deadline: 'Next Deadline',
    expectedPts: 'Projected Score',
    livePts: 'Live Official Score',
    bank: 'In Bank',
    freeTransfers: 'Free Transfers',
    tabPlan: 'Gameweek Plan',
    tabPerf: 'Performance',
    tabTransfers: 'Transfers',
    tabCaptain: 'Captaincy',
    tabChips: 'Chip Strategy',
    holdTransferTitle: 'Hold Transfer (No Move Recommended)',
    holdTransferDesc: 'Current carried squad is projected to outperform all available single and double transfer replacement candidates within budget.',
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
    perfHeading: 'Season-Long Gameweek History & Ledger',
    perfNotice: 'Immutable pre-deadline AI predictions versus authenticated official live and finalized match outcomes.',
    totPts: 'Season Total',
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
    loading: 'Loading Fantasy intelligence...',
    errorTitle: 'Unable to Load Fantasy Plan',
    errorDesc: 'Could not connect to the Fantasy optimization service. Please retry.',
    retry: 'Retry',
  },
  KU: {
    title: 'فانتاسی AI',
    subtitle: 'بەڕێوەبەری هۆشی دەستکرد بۆ وەرزی ٢٠٢٦-٢٧ بە بەکارهێنانی مۆدێلی ئەگەری و پێشبینی ورد.',
    gameweek: 'گەڕی چالاک',
    deadline: 'کاتی کۆتایی داهاتوو',
    expectedPts: 'خاڵی پێشبینیکراو',
    livePts: 'خاڵی ڕاستەوخۆ',
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
    perfHeading: 'تۆماری ئەنجامە مێژووییەکانی هەموو گەڕەکان',
    perfNotice: 'پێشبینییە نەگۆڕەکانی پێش یارییەکان بەرامبەر خاڵە فەرمییە ڕاستەقینەکان.',
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
    loading: 'زانیارییەکانی فانتاسی باردەکرێن...',
    errorTitle: 'کێشە لە بارکردنی فانتاسیدا هەیە',
    errorDesc: 'نەتوانرا پەیوەندی بە سێرڤەری فانتاسییەوە بکرێت. تکایە دووبارە هەوڵبدەرەوە.',
    retry: 'دووبارە هەوڵبدەرەوە',
  },
}

function formatIraqTime(isoString?: string): string {
  if (!isoString) return 'Fri, 4 Sep 2026, 8:30 PM Iraq Time'
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return isoString
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Baghdad',
    }
    const formatted = d.toLocaleDateString('en-US', options)
    return `${formatted} Iraq Time`
  } catch {
    return isoString
  }
}

export default function FantasyPage() {
  const { language, changeLanguage } = useLanguage()
  const t = L[language]

  const [activeTab, setActiveTab] = useState<'plan' | 'perf' | 'transfers' | 'captain' | 'chips'>('plan')
  const [planSubView, setPlanSubView] = useState<'active_manager' | 'gw3_best_xi' | 'gw3_squad_100m' | 'gw3_manager'>('active_manager')
  const [plan, setPlan] = useState<FPLGameweekPlan | null>(null)
  const [captainData, setCaptainData] = useState<FPLCaptainResponse | null>(null)
  const [transfers, setTransfers] = useState<FPLTransferRecommendation[]>([])
  const [chips, setChips] = useState<FPLChipStatusItem[]>([])
  const [performance, setPerformance] = useState<FPLPerformanceResponse | null>(null)
  const [selectedPerfGW, setSelectedPerfGW] = useState<number>(2)
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

  // Active GW record (GW2) & Historical selected GW
  const activeGWRecord = performance?.gameweeks?.find((g) => g.gameweek === 2) || performance?.gameweeks?.[1]
  const selectedGWRecord =
    performance?.gameweeks?.find((g) => g.gameweek === selectedPerfGW) || activeGWRecord || performance?.gameweeks?.[0]

  // Dynamic calculations for GW2 live state
  const starters = activeGWRecord?.starting_xi || []
  const completedStarters = starters.filter(
    (p) =>
      p.match_status === 'FT' ||
      (p.actual_points !== null && p.actual_points !== undefined && p.minutes !== null && p.match_status !== 'NOT_STARTED')
  ).length
  const remainingStarters = 11 - completedStarters

  // Dynamic Manager Live score calculation
  const startersRawPoints = starters.reduce((acc, p) => {
    return acc + (p.actual_points !== null && p.actual_points !== undefined ? p.actual_points : 0)
  }, 0)
  const captActualBase = activeGWRecord?.captain?.actual_base ?? (starters.find((p) => p.is_captain)?.actual_points ?? 0)
  const captMultiplier = activeGWRecord?.captain?.captain_multiplier ?? 2
  const captBonus = captActualBase > 0 ? captActualBase * (captMultiplier - 1) : 0
  const managerLiveScore = startersRawPoints + captBonus
  const captainTotalContribution = captActualBase > 0 ? captActualBase * captMultiplier : 0

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
              <span className="text-[10px] font-bold px-2.5 py-0.5 bg-[#F0A500]/15 text-[#F0A500] border border-[#F0A500]/40 rounded-full uppercase tracking-wider">
                GW2 • LIVE
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#8B949E] mt-1 max-w-2xl">
              {t.subtitle}
            </p>
          </div>
          <FreshnessTag generatedAt={plan?.generated_at} />
        </div>

        {/* Global Gameweek Status Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Active GW Card */}
          <div className="p-3 bg-[#161B22] rounded-xl border border-[#30363D] flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-[#F0A500]/15 text-[#F0A500] flex items-center justify-center font-black text-xs border border-[#F0A500]/30">
              GW2
            </div>
            <div>
              <div className="text-[11px] font-semibold text-[#8B949E] uppercase">Active Gameweek</div>
              <div className="text-sm font-extrabold text-[#E6EDF3] flex items-center gap-1.5">
                <span>GW2</span>
                <span className="text-[9px] px-1.5 py-0.2 bg-[#F0A500] text-[#0D1117] font-black rounded">LIVE</span>
              </div>
            </div>
          </div>

          {/* Next Deadline Card in Iraq Time */}
          <div className="p-3 bg-[#161B22] rounded-xl border border-[#30363D] flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-[#58A6FF]/10 text-[#58A6FF] flex items-center justify-center font-bold text-sm">
              ⏱
            </div>
            <div>
              <div className="text-[11px] font-semibold text-[#8B949E] uppercase">GW3 Deadline</div>
              <div className="text-xs font-bold text-[#E6EDF3]" title="2026-09-04T17:30:00Z (17:30 UTC)">
                Fri, 4 Sep • 8:30 PM Iraq Time
              </div>
            </div>
          </div>

          {/* Live vs Predicted Score Card */}
          <div className="p-3 bg-[#0D1117]/60 rounded-xl border border-[#30363D]/40 flex justify-between items-center">
            <div>
              <div className="text-[11px] font-semibold text-[#8B949E] uppercase">GW2 Live Score</div>
              <div className="text-xl font-black text-[#3FB950] mt-0.5">
                {managerLiveScore} <span className="text-xs font-normal text-[#8B949E]">pts (Live)</span>
              </div>
              <div className="text-[10px] text-[#8B949E]">Predicted: 74.05 xP</div>
            </div>
            <div className="text-right">
              <span className="text-[10px] px-2 py-0.5 bg-[#58A6FF]/15 text-[#58A6FF] border border-[#58A6FF]/30 rounded-full font-bold">
                {completedStarters} Finished • {remainingStarters} Remaining
              </span>
            </div>
          </div>

          {/* Season State Card */}
          <div className="p-3 bg-[#0D1117]/60 rounded-xl border border-[#30363D]/40 flex justify-between items-center">
            <div>
              <div className="text-[11px] font-semibold text-[#8B949E] uppercase">Season Total</div>
              <div className="text-sm font-extrabold text-[#58A6FF] mt-0.5">
                {108 + managerLiveScore} pts
              </div>
              <div className="text-[10px] text-[#8B949E]">Bank: £0.2m • 1 FT</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-semibold text-[#8B949E] uppercase">Captain (GW2)</div>
              <div className="text-xs font-extrabold text-[#F0A500] mt-0.5">
                Haaland ({captainTotalContribution} pts)
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs (Performance is Second) */}
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
        ) : (
          <div className="space-y-6">
            {/* TAB 1: GAMEWEEK PLAN (Focuses on Active GW2 + Next GW3 Panel) */}
            {activeTab === 'plan' && (
              <div className="space-y-6">
                {/* Team Object & Horizon Selector */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-[#161B22] p-2 rounded-xl border border-[#30363D]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setPlanSubView('active_manager')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
                        planSubView === 'active_manager'
                          ? 'bg-[#58A6FF] text-[#0D1117]'
                          : 'text-[#8B949E] hover:text-[#E6EDF3]'
                      }`}
                    >
                      <span>GW2 AI MANAGER TEAM</span>
                      <span className="text-[9px] px-1.5 py-0.2 bg-[#F0A500] text-[#0D1117] font-black rounded">LIVE</span>
                    </button>

                    <button
                      onClick={() => setPlanSubView('gw3_best_xi')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
                        planSubView === 'gw3_best_xi'
                          ? 'bg-[#58A6FF] text-[#0D1117]'
                          : 'text-[#8B949E] hover:text-[#E6EDF3]'
                      }`}
                    >
                      <span>GW3 EXPECTED BEST XI (83.09 xP)</span>
                      <span className="text-[9px] px-1.5 py-0.2 bg-[#3FB950] text-[#0D1117] font-black rounded">FROZEN</span>
                    </button>

                    <button
                      onClick={() => setPlanSubView('gw3_squad_100m')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
                        planSubView === 'gw3_squad_100m'
                          ? 'bg-[#58A6FF] text-[#0D1117]'
                          : 'text-[#8B949E] hover:text-[#E6EDF3]'
                      }`}
                    >
                      <span>GW3 BEST PLAYABLE £100M (80.75 xP)</span>
                      <span className="text-[9px] px-1.5 py-0.2 bg-[#3FB950] text-[#0D1117] font-black rounded">FROZEN</span>
                    </button>

                    <button
                      onClick={() => setPlanSubView('gw3_manager')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
                        planSubView === 'gw3_manager'
                          ? 'bg-[#58A6FF] text-[#0D1117]'
                          : 'text-[#8B949E] hover:text-[#E6EDF3]'
                      }`}
                    >
                      <span>GW3 AI MANAGER</span>
                      <span className="text-[9px] px-1.5 py-0.2 bg-[#F0A500] text-[#0D1117] font-black rounded">PENDING</span>
                    </button>
                  </div>

                  {/* Next Gameweek Teaser in Iraq Time */}
                  <div className="text-right hidden md:block">
                    <div className="text-[10px] uppercase font-bold text-[#8B949E]">Next Deadline (GW3)</div>
                    <div className="text-xs font-bold text-[#58A6FF]">Fri, 4 Sep • 8:30 PM Iraq Time</div>
                  </div>
                </div>

                {/* Sub-view Rendering */}
                {planSubView === 'gw3_manager' ? (
                  <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-8 text-center space-y-4 shadow-xl">
                    <div className="inline-flex h-12 w-12 rounded-full bg-[#F0A500]/15 text-[#F0A500] items-center justify-center text-xl font-bold">
                      ⏱
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <h3 className="text-lg font-bold text-[#E6EDF3]">GW3 AI Manager Team</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-[#F0A500]/15 text-[#F0A500] border border-[#F0A500]/30 rounded-full">
                        STATUS: PENDING
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-[#8B949E] max-w-xl mx-auto leading-relaxed">
                      GW3 Manager Team will be finalized after GW2 completion and before the official GW3 deadline.
                    </p>
                    <div className="p-4 bg-[#0D1117] border border-[#30363D]/60 rounded-xl max-w-lg mx-auto text-xs text-[#8B949E] space-y-2 text-left">
                      <div className="text-[#58A6FF] font-semibold">
                        Expected Best XI (83.09 xP) and Best Playable £100m (80.75 xP) are already available for GW3.
                      </div>
                      <div className="leading-relaxed">
                        <strong>AI Manager Meaning:</strong> Ennovera's season-long AI manager. The squad carries forward from Gameweek to Gameweek and follows real FPL transfer, budget and squad rules.
                      </div>
                    </div>
                  </div>
                ) : planSubView === 'gw3_best_xi' || planSubView === 'gw3_squad_100m' ? (
                  /* GW3 Analytical Benchmarks */
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    <div className="lg:col-span-2 space-y-3">
                      <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black uppercase text-[#E6EDF3]">
                              {planSubView === 'gw3_best_xi' ? 'GW3 Expected Best XI' : 'GW3 Best Playable £100m Squad'}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-[#3FB950]/15 text-[#3FB950] border border-[#3FB950]/30 rounded">
                              {planSubView === 'gw3_best_xi' ? '83.09 xP' : '80.75 xP'}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-[#58A6FF]/10 text-[#58A6FF] border border-[#58A6FF]/30 rounded">
                              FROZEN PRE-DEADLINE
                            </span>
                          </div>
                          <p className="text-[11px] text-[#8B949E] leading-relaxed max-w-xl">
                            {planSubView === 'gw3_best_xi'
                              ? 'Highest projected XI without the full £100m 15-player squad-budget constraint. Formation and maximum-three-per-club rules still apply. (Theoretical Model xP Ceiling)'
                              : 'Highest projected starting XI obtainable from a fully legal 15-player FPL squad costing no more than £100m. Starting XI: £83.5m • Bench: £16.5m • Total: £100.0m • Bank: £0.0m'}
                          </p>
                        </div>
                        <div className="text-right sm:text-right shrink-0">
                          <div className="text-xs font-bold text-[#58A6FF]">
                            Likely Range: {planSubView === 'gw3_best_xi' ? '74 – 91 pts' : '72 – 89 pts'}
                          </div>
                          <div className="text-[10px] text-[#8B949E]">
                            Upside (P80): {planSubView === 'gw3_best_xi' ? '94 pts' : '92 pts'} • High-Upside (P90): {planSubView === 'gw3_best_xi' ? '100 pts' : '98 pts'}
                          </div>
                        </div>
                      </div>

                      {plan && (
                        <PitchVisualization
                          formation={plan.formation}
                          startingXI={plan.starting_xi}
                          bench={planSubView === 'gw3_squad_100m' ? plan.bench : []}
                          language={language}
                        />
                      )}
                    </div>

                    {/* Right Col: Captaincy & Methodology */}
                    <div className="space-y-4">
                      {plan && (
                        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4 shadow-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#F0A500] uppercase tracking-wider">
                              ★ {t.captTitle} (GW3)
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
                                {plan.captain.club} • £{(plan.captain.price ?? 14.5).toFixed(1)}m • 10+ Points Chance: {Math.round(plan.captain.haul_probability * 100)}%
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
                      )}

                      <div className="bg-[#0D1117] border border-[#30363D] rounded-xl p-3.5 text-[11px] text-[#8B949E] space-y-1">
                        <div className="font-bold text-[#E6EDF3]">Ennovera Hybrid Architecture</div>
                        <p className="leading-relaxed">
                          Central expected points are generated from Ennovera's frozen C10-E ranking model, while uncertainty percentiles and joint ranges are produced by the calibrated Level-5 probability engine.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Active GW2 Live Manager Plan */
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    <div className="lg:col-span-2 space-y-3">
                      {/* Active GW2 Banner */}
                      <div className="bg-[#161B22] border border-[#F0A500]/40 rounded-xl p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3 shadow-lg">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black uppercase text-[#E6EDF3]">
                              GW2 AI Manager Team
                            </span>
                            <span className="text-[10px] font-black px-2 py-0.5 bg-[#F0A500] text-[#0D1117] rounded uppercase">
                              LIVE IN PROGRESS
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-[#58A6FF]/10 text-[#58A6FF] border border-[#58A6FF]/30 rounded">
                              FROZEN PRE-DEADLINE
                            </span>
                          </div>
                          <p className="text-[11px] text-[#8B949E] leading-relaxed max-w-xl">
                            Authentic frozen decision carried forward from GW1. Squad: 3-4-3 • Bank: £0.2m • Free Transfers: 1.
                          </p>
                        </div>
                        <div className="text-right sm:text-right shrink-0">
                          <div className="text-xs font-bold text-[#3FB950]">
                            Live Score: {managerLiveScore} pts (In Progress)
                          </div>
                          <div className="text-[10px] text-[#8B949E]">
                            Predicted: 74.05 xP • {completedStarters}/11 Starters Finished
                          </div>
                        </div>
                      </div>

                      {/* GW2 Pitch Visualization */}
                      {activeGWRecord && (
                        <PitchVisualization
                          formation={activeGWRecord.formation}
                          startingXI={activeGWRecord.starting_xi as any}
                          bench={activeGWRecord.bench as any}
                          language={language}
                        />
                      )}
                    </div>

                    {/* Right Col: Live Captain & Next GW Panel */}
                    <div className="space-y-4">
                      {/* GW2 Live Captain Pick */}
                      <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4 shadow-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#F0A500] uppercase tracking-wider">
                            ★ GW2 Captain Result
                          </span>
                          <span className="text-xs font-bold text-[#3FB950] bg-[#3FB950]/10 border border-[#3FB950]/30 px-2 py-0.5 rounded">
                            {captainTotalContribution} pts (Live)
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-xl bg-[#F0A500] text-[#0D1117] font-black text-xl flex items-center justify-center shadow">
                            C
                          </div>
                          <div>
                            <h3 className="font-extrabold text-base text-[#E6EDF3]">
                              {activeGWRecord?.captain?.name || 'Erling Haaland'}
                            </h3>
                            <p className="text-xs text-[#8B949E]">
                              {activeGWRecord?.captain?.club || 'Man City'} • Predicted: {activeGWRecord?.captain?.predicted_base_xp?.toFixed(2) || '7.90'} xP
                            </p>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-[#30363D]/40 space-y-1 text-xs">
                          <div className="flex justify-between items-center text-[#8B949E]">
                            <span>Captain Match Status:</span>
                            <strong className="text-[#3FB950]">FT (Match Finished)</strong>
                          </div>
                          <div className="flex justify-between items-center text-[#8B949E]">
                            <span>Captain Contribution:</span>
                            <strong className="text-[#3FB950]">
                              {captActualBase} pts (Base) × 2 = {captainTotalContribution} pts
                            </strong>
                          </div>
                          <div className="flex justify-between items-center text-[#8B949E]">
                            <span>Vice-Captain:</span>
                            <strong className="text-[#E6EDF3]">Cole Palmer (Not Started)</strong>
                          </div>
                        </div>
                      </div>

                      {/* Next Gameweek Panel */}
                      <div className="bg-gradient-to-br from-[#161B22] to-[#0D1117] border border-[#58A6FF]/40 rounded-xl p-4 shadow-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#58A6FF] uppercase tracking-wider">
                            Next Gameweek: GW3
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-[#58A6FF]/15 text-[#58A6FF] border border-[#58A6FF]/30 rounded-full">
                            UPCOMING
                          </span>
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="text-[#8B949E]">
                            Official Deadline:
                          </div>
                          <div className="font-bold text-[#E6EDF3]">
                            {formatIraqTime('2026-09-04T17:30:00Z')}
                          </div>
                          <div className="text-[11px] text-[#8B949E]">
                            (17:30 UTC)
                          </div>
                        </div>
                        <div className="pt-2 border-t border-[#30363D]/50 flex gap-2">
                          <button
                            onClick={() => setPlanSubView('gw3_best_xi')}
                            className="flex-1 py-1.5 px-2 bg-[#58A6FF]/10 hover:bg-[#58A6FF]/20 text-[#58A6FF] border border-[#58A6FF]/30 rounded-lg text-xs font-bold transition-colors text-center"
                          >
                            View Expected Best XI (83.09 xP)
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: PERFORMANCE (FULL GAMEWEEK HISTORY EXPLORER) */}
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
                    <div className="text-[11px] font-semibold text-[#8B949E] uppercase">Historical Score (GW1)</div>
                    <div className="text-2xl font-black text-[#3FB950] mt-1">{performance.summary.historical_actual_total} pts</div>
                    <div className="text-[10px] text-[#8B949E]">Predicted: {performance.summary.historical_projected_total.toFixed(1)} xP (+{performance.summary.historical_delta.toFixed(1)})</div>
                  </div>
                  <div className="p-3 bg-[#161B22] rounded-xl border border-[#30363D]">
                    <div className="text-[11px] font-semibold text-[#8B949E] uppercase">Live GW2 Score</div>
                    <div className="text-2xl font-black text-[#F0A500] mt-1">{managerLiveScore} pts</div>
                    <div className="text-[10px] text-[#8B949E]">Predicted: 74.05 xP • {completedStarters}/11 Finished</div>
                  </div>
                  <div className="p-3 bg-[#161B22] rounded-xl border border-[#30363D]">
                    <div className="text-[11px] font-semibold text-[#8B949E] uppercase">Cumulative Season Pts</div>
                    <div className="text-2xl font-black text-[#58A6FF] mt-1">{108 + managerLiveScore} pts</div>
                    <div className="text-[10px] text-[#8B949E]">GW1 (108) + GW2 ({managerLiveScore} Live)</div>
                  </div>
                  <div className="p-3 bg-[#161B22] rounded-xl border border-[#30363D]">
                    <div className="text-[11px] font-semibold text-[#8B949E] uppercase">GW3 Status</div>
                    <div className="text-2xl font-black text-[#58A6FF] mt-1">FROZEN</div>
                    <div className="text-[10px] text-[#8B949E]">Best XI: 83.09 xP (Upcoming)</div>
                  </div>
                </div>

                {/* Gameweek History Explorer Selector */}
                <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-5 space-y-5 shadow-xl">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-[#30363D]/60 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#8B949E]">
                        Select Historical Gameweek:
                      </span>
                      <div className="flex gap-1.5">
                        {performance.gameweeks.map((gw) => (
                          <button
                            key={gw.gameweek}
                            onClick={() => setSelectedPerfGW(gw.gameweek)}
                            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                              selectedPerfGW === gw.gameweek
                                ? 'bg-[#58A6FF] text-[#0D1117]'
                                : 'bg-[#0D1117] text-[#8B949E] hover:text-[#E6EDF3] border border-[#30363D]'
                            }`}
                          >
                            <span>GW {gw.gameweek}</span>
                            <span
                              className={`text-[9px] px-1 py-0.2 rounded font-black ${
                                gw.status === 'COMPLETE'
                                  ? 'bg-[#3FB950]/20 text-[#3FB950]'
                                  : gw.status === 'LIVE'
                                  ? 'bg-[#F0A500]/20 text-[#F0A500]'
                                  : 'bg-[#58A6FF]/20 text-[#58A6FF]'
                              }`}
                            >
                              {gw.status === 'COMPLETE' ? '✓' : gw.status === 'LIVE' ? 'LIVE' : 'UPCOMING'}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex items-center gap-1 bg-[#0D1117] p-1 rounded-lg border border-[#30363D]">
                      <button
                        onClick={() => setPerfViewMode('pitch')}
                        className={`px-2.5 py-1 text-xs font-bold rounded ${
                          perfViewMode === 'pitch' ? 'bg-[#161B22] text-[#58A6FF]' : 'text-[#8B949E]'
                        }`}
                      >
                        Pitch View
                      </button>
                      <button
                        onClick={() => setPerfViewMode('table')}
                        className={`px-2.5 py-1 text-xs font-bold rounded ${
                          perfViewMode === 'table' ? 'bg-[#161B22] text-[#58A6FF]' : 'text-[#8B949E]'
                        }`}
                      >
                        Table View
                      </button>
                    </div>
                  </div>

                  {/* Selected GW Details Header */}
                  {selectedGWRecord && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#0D1117] p-4 rounded-xl border border-[#30363D]">
                        <div>
                          <div className="text-[10px] text-[#8B949E] uppercase font-semibold">Classification & Model</div>
                          <div className="text-xs font-extrabold text-[#E6EDF3] mt-0.5">{selectedGWRecord.classification}</div>
                          <div className="text-[10px] text-[#58A6FF]">{selectedGWRecord.model_version}</div>
                        </div>

                        <div>
                          <div className="text-[10px] text-[#8B949E] uppercase font-semibold">Official Deadline</div>
                          <div className="text-xs font-bold text-[#E6EDF3] mt-0.5">
                            {formatIraqTime(selectedGWRecord.deadline)}
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] text-[#8B949E] uppercase font-semibold">Predicted vs Actual</div>
                          <div className="text-xs font-extrabold text-[#3FB950] mt-0.5">
                            Predicted: {selectedGWRecord.projected_total.toFixed(2)} xP
                          </div>
                          <div className="text-xs font-bold text-[#E6EDF3]">
                            Actual: {selectedGWRecord.gameweek === 2
                              ? `${managerLiveScore} pts (Live)`
                              : selectedGWRecord.actual_total !== null
                              ? `${selectedGWRecord.actual_total} pts`
                              : 'PENDING'}
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] text-[#8B949E] uppercase font-semibold">Transfers & Chip</div>
                          <div className="text-xs font-bold text-[#E6EDF3] mt-0.5">
                            {selectedGWRecord.transfers_made === 0 ? 'No Transfers (0 hit)' : `${selectedGWRecord.transfers_made} Transfer(s)`}
                          </div>
                          <div className="text-[10px] text-[#8B949E]">
                            Chip: {selectedGWRecord.chip_used} • Bank: £{selectedGWRecord.bank.toFixed(1)}m
                          </div>
                        </div>
                      </div>

                      {/* Pitch or Table Representation */}
                      {selectedGWRecord.starting_xi && selectedGWRecord.starting_xi.length > 0 ? (
                        perfViewMode === 'pitch' ? (
                          <PitchVisualization
                            formation={selectedGWRecord.formation}
                            startingXI={selectedGWRecord.starting_xi as any}
                            bench={selectedGWRecord.bench as any}
                            language={language}
                          />
                        ) : (
                          <div className="overflow-x-auto bg-[#0D1117] rounded-xl border border-[#30363D]">
                            <table className="w-full text-xs text-left text-[#E6EDF3]">
                              <thead className="bg-[#161B22] text-[#8B949E] border-b border-[#30363D]">
                                <tr>
                                  <th className="px-4 py-2.5">Player</th>
                                  <th className="px-4 py-2.5">Pos</th>
                                  <th className="px-4 py-2.5">Club</th>
                                  <th className="px-4 py-2.5">Fixture</th>
                                  <th className="px-4 py-2.5">Predicted xP</th>
                                  <th className="px-4 py-2.5">Actual Pts</th>
                                  <th className="px-4 py-2.5">Mins</th>
                                  <th className="px-4 py-2.5">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#30363D]/60">
                                {selectedGWRecord.starting_xi.map((p) => {
                                  const isFT = p.match_status === 'FT'
                                  const isLive = p.match_status === 'LIVE'

                                  return (
                                    <tr key={p.player_id} className="hover:bg-[#161B22]/50">
                                      <td className="px-4 py-2.5 font-bold flex items-center gap-1.5">
                                        <span>{p.name}</span>
                                        {p.is_captain && (
                                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#F0A500] text-[#0D1117] font-black">
                                            C
                                          </span>
                                        )}
                                        {p.is_vice_captain && (
                                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#E6EDF3] text-[#0D1117] font-black">
                                            V
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-4 py-2.5 text-[#58A6FF]">{p.position}</td>
                                      <td className="px-4 py-2.5 text-[#8B949E]">{p.club}</td>
                                      <td className="px-4 py-2.5 text-[#8B949E]">
                                        {p.opponent ? `${p.opponent} (${p.home_away || 'H'})` : '—'}
                                      </td>
                                      <td className="px-4 py-2.5 font-semibold text-[#3FB950]">
                                        {p.predicted_xp.toFixed(2)}
                                      </td>
                                      <td className="px-4 py-2.5 font-bold text-[#E6EDF3]">
                                        {isFT || isLive ? (
                                          p.is_captain ? (
                                            <span className="text-[#3FB950]">{((p.actual_points ?? 0) * 2)} (2x)</span>
                                          ) : (
                                            p.actual_points ?? 0
                                          )
                                        ) : (
                                          <span className="text-[#8B949E]">Not Started</span>
                                        )}
                                      </td>
                                      <td className="px-4 py-2.5 text-[#8B949E]">
                                        {p.minutes !== null && p.minutes !== undefined ? `${p.minutes}'` : '—'}
                                      </td>
                                      <td className="px-4 py-2.5 text-[#8B949E]">
                                        {p.match_status === 'FT' ? (
                                          <span className="text-[#3FB950] font-semibold">FT</span>
                                        ) : p.match_status === 'LIVE' ? (
                                          <span className="text-[#F0A500] font-semibold">LIVE</span>
                                        ) : (
                                          <span className="text-[#8B949E]">Not Started</span>
                                        )}
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        )
                      ) : (
                        <div className="p-8 text-center bg-[#0D1117] rounded-xl border border-[#30363D] text-sm text-[#8B949E]">
                          GW3 Manager Team is currently PENDING freeze and will appear once GW2 matches conclude.
                        </div>
                      )}
                    </div>
                  )}
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
                <div className="bg-gradient-to-r from-[#161B22] to-[#1c222c] border border-[#F0A500]/40 rounded-2xl p-6 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#F0A500] uppercase tracking-wider">
                      ★ {t.captTitle} (GW3 Forecast)
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
                          {captainData.captain.club} • {captainData.captain.position} • £{(captainData.captain.price ?? 14.5).toFixed(1)}m
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
