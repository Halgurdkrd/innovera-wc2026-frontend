'use client'

import type { LuckScore } from '@/types'
import type { Language } from './Navbar'
import { teamFlagUrl } from '@/lib/flags'

interface LuckScoreSectionProps {
  scores: LuckScore[]
  language: Language
}

const labels = {
  EN: {
    title: "Luck Scores",
    luckiest: 'Luckiest Teams',
    unluckiest: 'Unluckiest Teams',
    luckScore: 'Luck Score',
  },
  KU: {
    title: 'خەمەکانی بەخت',
    luckiest: 'تیمە بە بەختەکان',
    unluckiest: 'بێ بەختترین تیمەکان',
    luckScore: 'خەمە',
  },
}

const KU_DIGITS = '٠١٢٣٤٥٦٧٨٩'
function toKuDigits(s: string): string {
  return s.replace(/\d/g, d => KU_DIGITS[parseInt(d)])
}

function luckDesc(score: LuckScore, language: Language): string {
  const goals = score.actual_goals ?? 0
  const xg = score.xg_total ?? 0
  const label = score.luck_label?.toLowerCase() ?? ''
  const isLucky = label === 'lucky' || (score.luck_rating ?? 0) > 1
  const isUnlucky = label === 'unlucky' || (score.luck_rating ?? 0) < -1

  if (language === 'KU') {
    if (isLucky)
      return toKuDigits(`${goals} گۆڵی تۆمار کرد لە ${xg.toFixed(1)} چاوەڕوانکراو — تەواوکاری باش`)
    if (isUnlucky)
      return toKuDigits(`دەرفەتی بەرامبەر بە ${xg.toFixed(1)} گۆڵ دروست کرد بەڵام تەنها ${goals}ی تۆمار کرد`)
    return toKuDigits(`${goals} گۆڵی تۆمار کرد لە ${xg.toFixed(1)} چاوەڕوانکراو — ئەنجامی شایستە`)
  }
  if (isLucky)
    return `Scored ${goals} goals from just ${xg.toFixed(1)} expected — clinical finishing`
  if (isUnlucky)
    return `Created chances worth ${xg.toFixed(1)} goals but only scored ${goals}`
  return `Scored ${goals} from ${xg.toFixed(1)} expected — fair result`
}

function ScoreCard({ score, rank, isLucky, language }: { score: LuckScore; rank: number; isLucky: boolean; language: Language }) {
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
      <img src={teamFlagUrl(score.team_name)} alt={score.team_name} className="h-6 w-auto rounded-sm flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#E6EDF3] truncate">{score.team_name}</p>
        <p className="text-[11px] text-[#8B949E] leading-snug" dir={language === 'KU' ? 'rtl' : undefined}>{luckDesc(score, language)}</p>
      </div>
      <span
        className="text-sm font-bold flex-shrink-0"
        style={{ color }}
      >
        {sign}{(score.luck_rating ?? 0).toFixed(1)}
      </span>
    </div>
  )
}

export default function LuckScoreSection({ scores, language }: LuckScoreSectionProps) {
  const t = labels[language]

  const sorted = [...scores].sort((a, b) => (b.luck_rating ?? 0) - (a.luck_rating ?? 0))
  const luckiest = sorted.slice(0, 3)
  const unluckiest = [...scores].sort((a, b) => (a.luck_rating ?? 0) - (b.luck_rating ?? 0)).slice(0, 3)

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
              <ScoreCard key={s.id} score={s} rank={i + 1} isLucky={true} language={language} />
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
              <ScoreCard key={s.id} score={s} rank={i + 1} isLucky={false} language={language} />
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
