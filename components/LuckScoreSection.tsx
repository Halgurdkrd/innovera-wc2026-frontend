'use client'

import type { LuckScore } from '@/types'
import type { Language } from './Navbar'

interface LuckScoreSectionProps {
  scores: LuckScore[]
  language: Language
}

const labels = {
  EN: {
    title: "Yesterday's Luck Scores",
    luckiest: 'Luckiest Teams',
    unluckiest: 'Unluckiest Teams',
    luckScore: 'Luck Score',
  },
  KU: {
    title: 'خەمەکانی دوێنێ',
    luckiest: 'تیمە بە بەختەکان',
    unluckiest: 'بێ بەختترین تیمەکان',
    luckScore: 'خەمە',
  },
}

function ScoreCard({ score, rank, isLucky }: { score: LuckScore; rank: number; isLucky: boolean }) {
  const color = isLucky ? '#2EA043' : '#F85149'
  const sign = isLucky ? '+' : ''

  return (
    <div className="flex items-center gap-3 bg-[#0D1117] border border-[#30363D] rounded-lg p-3 hover:border-[#F0A500]/30 transition-colors">
      <span
        className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold flex-shrink-0"
        style={{ backgroundColor: color + '20', color }}
      >
        {rank}
      </span>
      <span className="text-xl flex-shrink-0">{score.team_flag || '🏳️'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#E6EDF3] truncate">{score.team_name}</p>
        <p className="text-xs text-[#8B949E] capitalize">{score.result}</p>
      </div>
      <span
        className="text-sm font-bold flex-shrink-0"
        style={{ color }}
      >
        {sign}{score.luck_score.toFixed(1)}
      </span>
    </div>
  )
}

export default function LuckScoreSection({ scores, language }: LuckScoreSectionProps) {
  const t = labels[language]

  const sorted = [...scores].sort((a, b) => b.luck_score - a.luck_score)
  const luckiest = sorted.slice(0, 3)
  const unluckiest = [...scores].sort((a, b) => a.luck_score - b.luck_score).slice(0, 3)

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-[#E6EDF3]">{t.title}</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Luckiest */}
        <div className="bg-[#161B22] border border-[#2EA043]/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🍀</span>
            <h3 className="text-sm font-semibold text-[#2EA043]">{t.luckiest}</h3>
          </div>
          {luckiest.length > 0 ? (
            luckiest.map((s, i) => (
              <ScoreCard key={s.id} score={s} rank={i + 1} isLucky={true} />
            ))
          ) : (
            <p className="text-sm text-[#8B949E] text-center py-4">
              {language === 'KU' ? 'داتا بەردەست نیە' : 'No data available'}
            </p>
          )}
        </div>

        {/* Unluckiest */}
        <div className="bg-[#161B22] border border-[#F85149]/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">😬</span>
            <h3 className="text-sm font-semibold text-[#F85149]">{t.unluckiest}</h3>
          </div>
          {unluckiest.length > 0 ? (
            unluckiest.map((s, i) => (
              <ScoreCard key={s.id} score={s} rank={i + 1} isLucky={false} />
            ))
          ) : (
            <p className="text-sm text-[#8B949E] text-center py-4">
              {language === 'KU' ? 'داتا بەردەست نیە' : 'No data available'}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
