import { localizeNum } from '@/lib/numbers'
import type { Language } from '@/lib/translations'

export interface ProbabilityBarProps {
  homeProb: number
  drawProb: number
  awayProb: number
  /** Optional team name shown next to the home %, e.g. match-detail view */
  homeLabel?: string
  /** Optional team name shown next to the away % */
  awayLabel?: string
  /** Defaults to "Draw" / Kurdish translation */
  drawLabel?: string
  language?: Language
  /** 'sm' = compact (MatchCard), 'lg' = detail view with more spacing */
  size?: 'sm' | 'lg'
}

export default function ProbabilityBar({
  homeProb,
  drawProb,
  awayProb,
  homeLabel,
  awayLabel,
  drawLabel,
  language = 'EN',
  size = 'sm',
}: ProbabilityBarProps) {
  const n = (v: string | number) => localizeNum(v, language)
  const draw = drawLabel ?? (language === 'KU' ? 'یەکسان' : 'Draw')
  const barHeight = size === 'lg' ? 'h-3' : 'h-2'
  const gap = size === 'lg' ? 'space-y-2' : 'space-y-1.5'
  const textSize = size === 'lg' ? 'text-xs' : 'text-[10px]'
  const duration = size === 'lg' ? 'duration-1000' : 'duration-700'

  return (
    <div className={gap}>
      <div className={`flex gap-0.5 ${barHeight} rounded-full overflow-hidden`}>
        <div
          className={`bg-[#2EA043] rounded-l-full transition-all ${duration}`}
          style={{ width: `${homeProb}%` }}
        />
        <div
          className={`bg-[#8B949E] transition-all ${duration}`}
          style={{ width: `${drawProb}%` }}
        />
        <div
          className={`bg-[#F85149] rounded-r-full transition-all ${duration}`}
          style={{ width: `${awayProb}%` }}
        />
      </div>
      <div className={`flex justify-between ${textSize} text-[#8B949E]`}>
        <span className="text-[#2EA043] font-semibold">
          {homeLabel ? `${homeLabel} ` : ''}{n(Math.round(homeProb))}%
        </span>
        <span className="flex-shrink-0 mx-1">{draw} {n(Math.round(drawProb))}%</span>
        <span className="text-[#F85149] font-semibold">
          {n(Math.round(awayProb))}%{awayLabel ? ` ${awayLabel}` : ''}
        </span>
      </div>
    </div>
  )
}
