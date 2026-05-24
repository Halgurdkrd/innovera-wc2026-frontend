'use client'

import type { TeamMomentum } from '@/types'
import type { Language } from './Navbar'

interface MomentumBarProps {
  momentum: TeamMomentum
  language: Language
}

const trendConfig = {
  rising:  { icon: '🔺', label: { EN: 'Rising',  KU: 'بەرزبوونەوە' }, color: '#2EA043' },
  falling: { icon: '🔻', label: { EN: 'Falling', KU: 'کەمبوونەوە'  }, color: '#F85149' },
  stable:  { icon: '➡️', label: { EN: 'Stable',  KU: 'جێگیر'       }, color: '#F0A500' },
}

const formColor = (r: string) => {
  if (r === 'W') return '#2EA043'
  if (r === 'L') return '#F85149'
  return '#8B949E'
}

export default function MomentumBar({ momentum, language }: MomentumBarProps) {
  const cfg = trendConfig[momentum.trend]

  return (
    <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4 flex flex-col gap-4">
      {/* Team header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{momentum.team_flag || '🏳️'}</span>
          <span className="text-sm font-semibold text-[#E6EDF3]">{momentum.team}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-base">{cfg.icon}</span>
          <span className="text-xs font-semibold" style={{ color: cfg.color }}>
            {cfg.label[language]}
          </span>
        </div>
      </div>

      {/* Score bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-[#8B949E]">
          <span>{language === 'KU' ? 'خەمەی مۆمێنتەم' : 'Momentum Score'}</span>
          <span className="font-bold text-[#E6EDF3]">{momentum.score}/100</span>
        </div>
        <div className="h-3 rounded-full bg-[#0D1117] border border-[#30363D] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${momentum.score}%`,
              background: `linear-gradient(90deg, ${cfg.color}80, ${cfg.color})`,
            }}
          />
        </div>
      </div>

      {/* Recent form dots */}
      {momentum.recent_form && momentum.recent_form.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#8B949E]">
            {language === 'KU' ? 'ئەنجامەکانی دواتر' : 'Recent'}
          </span>
          <div className="flex gap-1">
            {momentum.recent_form.slice(0, 5).map((r, i) => (
              <span
                key={i}
                className="inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold"
                style={{ color: formColor(r), backgroundColor: formColor(r) + '25', border: `1px solid ${formColor(r)}40` }}
              >
                {r}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
