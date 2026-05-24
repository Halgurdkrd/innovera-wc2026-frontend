'use client'

import type { ShapReason } from '@/types'
import type { Language } from './Navbar'

interface ShapCardProps {
  reason: ShapReason
  language: Language
}

const directionConfig = {
  positive: { arrow: '↑', color: '#2EA043', bg: '#2EA04315', border: '#2EA04340' },
  negative: { arrow: '↓', color: '#F85149', bg: '#F8514915', border: '#F8514940' },
  neutral:  { arrow: '→', color: '#8B949E', bg: '#8B949E15', border: '#8B949E40' },
}

const teamLabel = (team: 'home' | 'away', lang: Language) =>
  lang === 'KU'
    ? team === 'home' ? 'ماڵ' : 'دەرەوە'
    : team === 'home' ? 'Home' : 'Away'

export default function ShapCard({ reason, language }: ShapCardProps) {
  const cfg = directionConfig[reason.direction]
  const impact = Math.min(100, Math.abs(reason.value) * 100)

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3 border"
      style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#E6EDF3] leading-snug">{reason.factor}</p>
          {reason.description && (
            <p className="mt-0.5 text-xs text-[#8B949E] leading-snug">{reason.description}</p>
          )}
        </div>
        {/* Arrow badge */}
        <span
          className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-lg text-lg font-black"
          style={{ color: cfg.color, backgroundColor: cfg.color + '25' }}
        >
          {cfg.arrow}
        </span>
      </div>

      {/* Impact bar */}
      <div className="space-y-1">
        <div className="h-1.5 rounded-full bg-[#30363D] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${impact}%`, backgroundColor: cfg.color }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium" style={{ color: cfg.color }}>
            {reason.direction === 'positive' ? (language === 'KU' ? 'باشترین' : 'Favourable') :
             reason.direction === 'negative' ? (language === 'KU' ? 'خراپ' : 'Unfavourable') :
             (language === 'KU' ? 'بێ کاریگەری' : 'Neutral')}
          </span>
          <span className="text-[10px] text-[#8B949E]">
            {teamLabel(reason.team, language)} · {(Math.abs(reason.value) * 100).toFixed(0)}pt
          </span>
        </div>
      </div>
    </div>
  )
}
