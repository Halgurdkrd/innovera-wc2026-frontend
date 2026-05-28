'use client'

import type { Language } from './Navbar'
import { SkProbRow } from './SkeletonCard'

interface Props {
  winnerProbs: Record<string, number>
  flagMap?: Record<string, string>
  language: Language
  topN?: number
  loading?: boolean
}

const labels = {
  EN: {
    title: 'Tournament Win Probability',
    subtitle: 'Based on 500 simulations · Updates after each match',
  },
  KU: {
    title: 'ئەگەری بردنەوەی نازناوەکە',
    subtitle: 'لەسەر بنەمای ٥٠٠ شێوەکاری · دواتر نوێ دەبێتەوە',
  },
}

export default function WinnerProbsList({ winnerProbs, flagMap, language, topN = 8, loading = false }: Props) {
  const t = labels[language]

  if (loading) {
    return (
      <section className="space-y-4">
        <div>
          <div className="animate-pulse bg-[#21262D] rounded h-6 w-56" />
          <div className="animate-pulse bg-[#21262D] rounded h-3 w-48 mt-2" />
        </div>
        <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden divide-y divide-[#30363D]/40">
          {Array.from({ length: 8 }).map((_, i) => <SkProbRow key={i} />)}
        </div>
        <p className="text-center text-xs text-[#8B949E]">
          {language === 'KU' ? 'پێشبینییەکانی ئەی ئای بارئەکرێت…' : 'AI predictions loading…'}
        </p>
      </section>
    )
  }

  const sorted = Object.entries(winnerProbs)
    .sort(([, a], [, b]) => b - a)
    .slice(0, topN)

  if (sorted.length === 0) return null

  const maxProb = sorted[0][1]

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-[#E6EDF3]">{t.title}</h2>
        <p className="mt-1 text-xs text-[#8B949E]">{t.subtitle}</p>
      </div>

      <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
        <div className="divide-y divide-[#30363D]/40">
          {sorted.map(([team, prob], idx) => {
            const pct = (prob * 100).toFixed(1)
            const barWidth = maxProb > 0 ? (prob / maxProb) * 100 : 0
            const flag = flagMap?.[team] ?? '🏳️'
            const isTop = idx === 0

            return (
              <div key={team} className="flex items-center gap-3 px-4 py-3">
                {/* Rank */}
                <span className={`text-xs font-bold w-4 text-right flex-shrink-0 ${
                  isTop ? 'text-[#F0A500]' : 'text-[#30363D]'
                }`}>
                  {idx + 1}
                </span>

                {/* Flag */}
                <span className="text-lg flex-shrink-0 leading-none">{flag}</span>

                {/* Team name */}
                <span className={`text-sm font-semibold flex-shrink-0 w-28 truncate ${
                  isTop ? 'text-[#E6EDF3]' : 'text-[#8B949E]'
                }`}>
                  {team}
                </span>

                {/* Bar */}
                <div className="flex-1 h-2 rounded-full bg-[#30363D] overflow-hidden min-w-0">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${barWidth}%`,
                      background: isTop ? '#F0A500' : 'rgba(240,165,0,0.55)',
                    }}
                  />
                </div>

                {/* Percentage */}
                <span className="text-xs font-bold text-[#F0A500] tabular-nums w-12 text-right flex-shrink-0">
                  {pct}%
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
