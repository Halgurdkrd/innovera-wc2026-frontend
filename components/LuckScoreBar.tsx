'use client'

import { useEffect, useState } from 'react'
import type { Language } from './Navbar'
import { localizeNum } from '@/lib/numbers'

interface LuckScoreBarProps {
  score: number    // –10 … +10
  label?: 'Lucky' | 'Deserved' | 'Unlucky'
  language: Language
}

const labelConfig = {
  Lucky:    { color: '#2EA043', ku: 'خۆشبەختانە' },
  Deserved: { color: '#F0A500', ku: 'شایەنی'      },
  Unlucky:  { color: '#F85149', ku: 'بەدبەختانە'  },
}

export default function LuckScoreBar({ score, label, language }: LuckScoreBarProps) {
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100)
    return () => clearTimeout(t)
  }, [])

  const clampedScore = Math.max(-10, Math.min(10, score))
  // Map –10…+10 → 0…100%
  const pct = ((clampedScore + 10) / 20) * 100
  const positive = clampedScore >= 0
  const color = positive ? '#2EA043' : '#F85149'
  const resolvedLabel = label ?? (clampedScore > 1 ? 'Lucky' : clampedScore < -1 ? 'Unlucky' : 'Deserved')
  const cfg = labelConfig[resolvedLabel]

  return (
    <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#E6EDF3]">
          {language === 'KU' ? 'خەمەی بەخت' : 'Luck Score'}
        </h3>
        <span
          className="text-sm font-extrabold px-3 py-1 rounded-full"
          style={{ color: cfg.color, backgroundColor: cfg.color + '20', border: `1px solid ${cfg.color}40` }}
        >
          {language === 'KU' ? cfg.ku : resolvedLabel}
        </span>
      </div>

      {/* Bar */}
      <div className="relative h-6 rounded-full bg-[#0D1117] border border-[#30363D] overflow-hidden">
        {/* Centre line */}
        <div className="absolute left-1/2 top-0 h-full w-px bg-[#30363D] z-10" />

        {/* Fill */}
        <div
          className="absolute top-0 h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            left: positive ? '50%' : `${pct}%`,
            width: animated ? `${Math.abs(pct - 50)}%` : '0%',
            backgroundColor: color,
            opacity: 0.85,
          }}
        />

        {/* Needle */}
        <div
          className="absolute top-0 h-full w-1 rounded-full transition-all duration-1000 ease-out"
          style={{
            left: animated ? `calc(${pct}% - 2px)` : 'calc(50% - 2px)',
            backgroundColor: color,
            boxShadow: `0 0 8px ${color}`,
          }}
        />
      </div>

      {/* Scale labels */}
      <div className="flex justify-between text-[10px] text-[#8B949E]">
        <span>–10 {language === 'KU' ? 'بەدبەخت' : 'Unlucky'}</span>
        <span className="text-base font-extrabold" style={{ color }}>
          {clampedScore > 0 ? '+' : ''}{localizeNum(clampedScore.toFixed(1), language)}
        </span>
        <span>+10 {language === 'KU' ? 'خۆشبەخت' : 'Lucky'}</span>
      </div>
    </div>
  )
}
