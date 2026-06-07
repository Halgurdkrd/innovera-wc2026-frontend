'use client'

import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import { useLanguage } from '@/hooks/useLanguage'
import { API_BASE } from '@/lib/api'
import { teamFlagEmoji } from '@/lib/flags'
import { Sk } from '@/components/SkeletonCard'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Scorer {
  player_name: string
  team: string
  position: string
  xg_per90?: number
  gls_per90?: number
  xag_per90?: number
  ast_per90?: number
  fc26_ovr: number
  opponent_factor: number
  composite_score: number
  data_source: string
}

type Tab = 'goals' | 'assists'

// ── Labels ────────────────────────────────────────────────────────────────────

const L = {
  EN: {
    pageTitle: 'Predicted Player Rankings',
    pageSub: 'AI-powered rankings for FIFA World Cup 2026',
    goalsTab: '🏆 Top Scorers',
    assistsTab: '🎯 Top Assist Makers',
    goalsHeading: 'Predicted Top Scorers',
    assistsHeading: 'Predicted Top Assist Makers',
    rank: '#',
    player: 'Player',
    team: 'Team',
    pos: 'Pos',
    score: 'Score',
    xg: 'xG/90',
    gls: 'Gls/90',
    xag: 'xAG/90',
    ast: 'Ast/90',
    fc26: 'Rating',
    easyGroup: 'Easy group',
    avgGroup: 'Average',
    toughGroup: 'Tough group',
    error: 'Scorer predictions not available.',
    methodTitle: 'Methodology',
    method:
      'Rankings based on expected goals (xG/90), actual scoring rate, player rating, and opponent defensive quality in the group stage.',
  },
  KU: {
    pageTitle: 'پێشبینی ریزبەندی گۆلکارەکان',
    pageSub: 'بەپێی شیکاری AI بۆ جامی جیهانی FIFA ٢٠٢٦',
    goalsTab: '🏆 باشترین گۆلکارەکان',
    assistsTab: '🎯 باشترین گۆڵ دروستکارەکان',
    goalsHeading: 'پێشبینی ریزبەندی باشترین گۆلکارەکان',
    assistsHeading: 'پێشبینی ڕیزبەندی باشترین گۆڵ دروستکارەکان',
    rank: '#',
    player: 'یاریزان',
    team: 'تیم',
    pos: 'پۆز',
    score: 'خەمە',
    xg: 'xG/90',
    gls: 'گۆڵ/90',
    xag: 'xAG/90',
    ast: 'یارمەتی/90',
    fc26: 'نمرە',
    easyGroup: 'گروپی ئاسان',
    avgGroup: 'ئاسەتەواز',
    toughGroup: 'گروپی سەخت',
    error: 'پێشبینی گۆلکارەکان بەردەست نییە.',
    methodTitle: 'ڕێگای کارکردن',
    method:
      'پلەبەندی لەسەر بنەمای ئەگەری گۆڵ (xG/90)، ڕێژەی گۆڵی ڕاستەقینە، نمرەی یاریزان، و توانای بەرگریی ڕکابەران لە قۆناغی گرووپەکان.',
  },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const MEDALS = ['🥇', '🥈', '🥉']

const POS_STYLE: Record<string, { color: string; bg: string }> = {
  FW: { color: '#F85149', bg: '#F8514915' },
  MF: { color: '#F0A500', bg: '#F0A50015' },
  DF: { color: '#2EA043', bg: '#2EA04315' },
  GK: { color: '#58A6FF', bg: '#58A6FF15' },
}

function groupDot(factor: number, lang: 'EN' | 'KU') {
  const t = L[lang]
  if (factor > 1.05) return { color: '#2EA043', label: t.easyGroup }
  if (factor < 0.95) return { color: '#F85149', label: t.toughGroup }
  return { color: '#F0A500', label: t.avgGroup }
}

function cleanName(raw: string) {
  return raw.replace(/^(GK|DF|MF|FW)\s+/i, '')
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ScorersPage() {
  const { language, changeLanguage } = useLanguage()
  const [tab, setTab] = useState<Tab>('goals')
  const [goalScorers, setGoalScorers] = useState<Scorer[]>([])
  const [assistMakers, setAssistMakers] = useState<Scorer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const t = L[language]

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(false)
      try {
        const [goalsRes, assistsRes] = await Promise.all([
          fetch(`${API_BASE}/scorers/predicted-goals?top=30`),
          fetch(`${API_BASE}/scorers/predicted-assists?top=30`),
        ])
        if (goalsRes.ok) {
          const data = await goalsRes.json()
          setGoalScorers(Array.isArray(data) ? data : (data.players ?? data.scorers ?? []))
        }
        if (assistsRes.ok) {
          const data = await assistsRes.json()
          setAssistMakers(Array.isArray(data) ? data : (data.players ?? data.scorers ?? []))
        }
        if (!goalsRes.ok && !assistsRes.ok) setError(true)
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const list = tab === 'goals' ? goalScorers : assistMakers
  const isEmpty = !loading && !error && list.length === 0

  return (
    <div className="min-h-screen bg-[#0D1117]">
      <Navbar language={language} onLanguageChange={changeLanguage} />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-6 pb-24 md:pb-8">

        {/* ── Page header ── */}
        <div>
          <h1 className="text-2xl font-extrabold text-[#E6EDF3]">{t.pageTitle}</h1>
          <p className="text-sm text-[#8B949E] mt-1">{t.pageSub}</p>
        </div>

        {/* ── Tab switcher ── */}
        <div className="flex gap-2 flex-wrap">
          {(['goals', 'assists'] as Tab[]).map(key => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                tab === key
                  ? 'bg-[#F0A500] text-[#0D1117]'
                  : 'bg-[#161B22] border border-[#30363D] text-[#8B949E] hover:text-[#E6EDF3]'
              }`}
            >
              {key === 'goals' ? t.goalsTab : t.assistsTab}
            </button>
          ))}
        </div>

        {/* ── Section heading ── */}
        {!loading && (
          <h2 className="text-base font-bold text-[#E6EDF3]">
            {tab === 'goals' ? t.goalsHeading : t.assistsHeading}
          </h2>
        )}

        {/* ── Loading skeleton ── */}
        {loading && (
          <div className="space-y-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <Sk key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        )}

        {/* ── Error / empty ── */}
        {(error || isEmpty) && (
          <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-12 text-center">
            <span className="text-4xl">⚽</span>
            <p className="mt-4 text-[#8B949E]">{t.error}</p>
          </div>
        )}

        {/* ── Desktop table ── */}
        {!loading && !error && list.length > 0 && (
          <>
            <div className="hidden sm:block bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#30363D] text-[#8B949E] text-[11px] uppercase tracking-wide">
                    <th className="px-3 py-2.5 text-left w-10">{t.rank}</th>
                    <th className="px-3 py-2.5 text-left">{t.player}</th>
                    <th className="px-3 py-2.5 text-left hidden lg:table-cell">{t.team}</th>
                    <th className="px-3 py-2.5 text-right">{tab === 'goals' ? t.xg : t.xag}</th>
                    <th className="px-3 py-2.5 text-right">{tab === 'goals' ? t.gls : t.ast}</th>
                    <th className="px-3 py-2.5 text-right hidden md:table-cell">{t.fc26}</th>
                    <th className="px-3 py-2.5 text-right">{t.score}</th>
                    <th className="px-3 py-2.5 text-center w-8" />
                  </tr>
                </thead>
                <tbody>
                  {list.map((player, i) => {
                    const name = cleanName(player.player_name)
                    const { color: dotColor, label: dotLabel } = groupDot(player.opponent_factor, language)
                    const isGold = i === 0
                    const stat1 = tab === 'goals' ? player.xg_per90 : player.xag_per90
                    const stat2 = tab === 'goals' ? player.gls_per90 : player.ast_per90

                    return (
                      <tr
                        key={i}
                        className={`border-b border-[#30363D] last:border-0 transition-colors ${
                          isGold ? 'bg-[#F0A500]/5' : 'hover:bg-[#21262D]/50'
                        }`}
                      >
                        {/* Rank */}
                        <td className="px-3 py-2.5 text-center">
                          {MEDALS[i] ? (
                            <span className="text-base leading-none">{MEDALS[i]}</span>
                          ) : (
                            <span className="text-xs text-[#8B949E] tabular-nums font-mono">{i + 1}</span>
                          )}
                        </td>

                        {/* Flag + Name */}
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-base leading-none flex-shrink-0">{teamFlagEmoji(player.team)}</span>
                            <div className="min-w-0">
                              <span className={`text-sm font-semibold truncate block ${isGold ? 'text-[#F0A500]' : 'text-[#E6EDF3]'}`}>
                                {name}
                              </span>
                              <span className="text-[10px] text-[#8B949E] truncate block lg:hidden">{player.team}</span>
                            </div>
                          </div>
                        </td>

                        {/* Team (desktop-only column) */}
                        <td className="px-3 py-2.5 text-[#8B949E] text-xs hidden lg:table-cell max-w-[110px]">
                          <span className="truncate block">{player.team}</span>
                        </td>

                        {/* Stat 1 (xG/90 or xAG/90) */}
                        <td className="px-3 py-2.5 text-right text-xs text-[#E6EDF3] tabular-nums">
                          {(stat1 ?? 0).toFixed(2)}
                        </td>

                        {/* Stat 2 (Gls/90 or Ast/90) */}
                        <td className="px-3 py-2.5 text-right text-xs text-[#E6EDF3] tabular-nums">
                          {(stat2 ?? 0).toFixed(2)}
                        </td>

                        {/* Rating */}
                        <td className="px-3 py-2.5 text-right text-xs text-[#8B949E] tabular-nums hidden md:table-cell">
                          {player.fc26_ovr}
                        </td>

                        {/* Composite score */}
                        <td className="px-3 py-2.5 text-right tabular-nums font-bold text-sm" style={{ color: isGold ? '#F0A500' : '#E6EDF3' }}>
                          {player.composite_score.toFixed(2)}
                        </td>

                        {/* Group difficulty dot */}
                        <td className="px-3 py-2.5 text-center">
                          <div className="group relative flex justify-center">
                            <span className="h-2.5 w-2.5 rounded-full inline-block" style={{ backgroundColor: dotColor }} />
                            <span className="pointer-events-none absolute bottom-full mb-1 hidden group-hover:block whitespace-nowrap bg-[#21262D] border border-[#30363D] text-[10px] text-[#E6EDF3] px-2 py-1 rounded-lg z-10">
                              {dotLabel}
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Mobile cards ── */}
            <div className="sm:hidden space-y-2">
              {list.map((player, i) => {
                const name = cleanName(player.player_name)
                const { color: dotColor, label: dotLabel } = groupDot(player.opponent_factor, language)
                const isGold = i === 0
                const stat1 = tab === 'goals' ? player.xg_per90 : player.xag_per90
                const stat2 = tab === 'goals' ? player.gls_per90 : player.ast_per90

                return (
                  <div
                    key={i}
                    className={`bg-[#161B22] border rounded-xl p-3 ${isGold ? 'border-[#F0A500]/40' : 'border-[#30363D]'}`}
                  >
                    {/* Top row: rank + flag + name + score */}
                    <div className="flex items-center gap-2.5">
                      <span className={`text-base font-bold w-7 text-center flex-shrink-0 ${isGold ? 'text-[#F0A500]' : 'text-[#8B949E]'}`}>
                        {MEDALS[i] ?? `${i + 1}`}
                      </span>
                      <span className="text-xl leading-none flex-shrink-0">{teamFlagEmoji(player.team)}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${isGold ? 'text-[#F0A500]' : 'text-[#E6EDF3]'}`}>{name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-[#8B949E]">{player.team}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-base font-extrabold tabular-nums ${isGold ? 'text-[#F0A500]' : 'text-[#E6EDF3]'}`}>
                          {player.composite_score.toFixed(2)}
                        </p>
                        <div className="flex items-center justify-end gap-1">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: dotColor }} />
                          <span className="text-[9px] text-[#8B949E]">{dotLabel}</span>
                        </div>
                      </div>
                    </div>

                    {/* Mini bar chart */}
                    <div className="mt-2.5 space-y-1">
                      {[
                        { label: tab === 'goals' ? t.xg : t.xag, value: stat1 ?? 0, max: 1.5, color: '#F0A500' },
                        { label: tab === 'goals' ? t.gls : t.ast, value: stat2 ?? 0, max: 1.2, color: '#58A6FF' },
                        { label: t.fc26, value: player.fc26_ovr, max: 100, color: '#2EA043' },
                      ].map(({ label: bLabel, value, max, color: bColor }) => (
                        <div key={bLabel} className="flex items-center gap-2">
                          <span className="text-[9px] text-[#8B949E] w-14 flex-shrink-0">{bLabel}</span>
                          <div className="flex-1 h-1.5 rounded-full bg-[#30363D] overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${Math.min(100, (value / max) * 100)}%`, backgroundColor: bColor }}
                            />
                          </div>
                          <span className="text-[9px] text-[#8B949E] tabular-nums w-8 text-right">
                            {value < 10 ? value.toFixed(2) : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* ── Methodology note ── */}
            <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4">
              <p className="text-xs font-bold text-[#8B949E] mb-1">{t.methodTitle}</p>
              <p className="text-xs text-[#8B949E]/70 leading-relaxed">{t.method}</p>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
