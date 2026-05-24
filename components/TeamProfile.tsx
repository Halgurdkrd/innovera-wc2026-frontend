'use client'

import type { Team } from '@/types'
import type { Language } from './Navbar'

interface TeamProfileProps {
  team: Team
  language: Language
  onClose: () => void
}

const formColor = (r: string) =>
  r === 'W' ? '#2EA043' : r === 'L' ? '#F85149' : '#8B949E'

const formLabel = (r: string, lang: Language) => {
  if (lang === 'KU') return r === 'W' ? 'بردی' : r === 'L' ? 'دژی' : 'یەکسان'
  return r === 'W' ? 'Win' : r === 'L' ? 'Loss' : 'Draw'
}

const labels = {
  EN: {
    close: '✕ Close',
    group: 'Group',
    confederation: 'Confederation',
    played: 'Played',
    won: 'Won',
    drawn: 'Drawn',
    lost: 'Lost',
    pts: 'Points',
    gf: 'GF',
    ga: 'GA',
    gd: 'GD',
    luckAvg: 'Avg Luck Score',
    momentum: 'Momentum',
    recentForm: 'Recent Form',
    squadInfo: 'Squad Info',
    noStats: 'No stats available yet',
  },
  KU: {
    close: '✕ داخستن',
    group: 'گروپ',
    confederation: 'کۆنفیدراسیۆن',
    played: 'یاری',
    won: 'بردن',
    drawn: 'یەکسان',
    lost: 'بازین',
    pts: 'خاڵ',
    gf: 'گۆلی دراو',
    ga: 'گۆلی وەرگیراو',
    gd: 'جیاوازی',
    luckAvg: 'تێکڕای خەمەی بەخت',
    momentum: 'مۆمێنتەم',
    recentForm: 'فۆڕمی دوایین',
    squadInfo: 'زانیاری دەستە',
    noStats: 'ئامارەکان بەردەست نین',
  },
}

export default function TeamProfile({ team, language, onClose }: TeamProfileProps) {
  const t = labels[language]

  const stats = [
    { label: t.played, value: team.played ?? '—' },
    { label: t.won,    value: team.won    ?? '—', color: '#2EA043' },
    { label: t.drawn,  value: team.drawn  ?? '—', color: '#8B949E' },
    { label: t.lost,   value: team.lost   ?? '—', color: '#F85149' },
    { label: t.pts,    value: team.points ?? '—', color: '#F0A500' },
    { label: t.gf,     value: team.goals_for       ?? '—' },
    { label: t.ga,     value: team.goals_against   ?? '—' },
    { label: t.gd,     value: team.goal_difference ?? '—' },
  ]

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      {/* Panel */}
      <div
        className="w-full max-w-lg bg-[#161B22] border border-[#30363D] rounded-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-5xl">{team.flag || '🏳️'}</span>
            <div>
              <h2 className="text-xl font-bold text-[#E6EDF3]">{team.name}</h2>
              <div className="flex flex-wrap gap-2 mt-1">
                {team.group_name && (
                  <span className="text-xs bg-[#F0A500]/10 border border-[#F0A500]/30 text-[#F0A500] px-2 py-0.5 rounded-full font-medium">
                    {t.group} {team.group_name}
                  </span>
                )}
                {team.confederation && (
                  <span className="text-xs bg-[#0D1117] border border-[#30363D] text-[#8B949E] px-2 py-0.5 rounded-full">
                    {team.confederation}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-[#8B949E] hover:text-[#F85149] bg-[#0D1117] border border-[#30363D] px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
          >
            {t.close}
          </button>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-2">
          {stats.map(({ label, value, color }) => (
            <div key={label} className="bg-[#0D1117] border border-[#30363D] rounded-lg p-2.5 text-center">
              <p className="text-xs text-[#8B949E] mb-1 leading-tight">{label}</p>
              <p className="text-base font-bold" style={{ color: color ?? '#E6EDF3' }}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Luck + Momentum */}
        {(team.luck_avg !== undefined || team.momentum_score !== undefined) && (
          <div className="grid grid-cols-2 gap-3">
            {team.luck_avg !== undefined && (
              <div className="bg-[#0D1117] border border-[#30363D] rounded-xl p-4 text-center">
                <p className="text-xs text-[#8B949E] mb-1">{t.luckAvg}</p>
                <p
                  className="text-2xl font-extrabold"
                  style={{ color: team.luck_avg >= 0 ? '#2EA043' : '#F85149' }}
                >
                  {team.luck_avg > 0 ? '+' : ''}{team.luck_avg.toFixed(1)}
                </p>
              </div>
            )}
            {team.momentum_score !== undefined && (
              <div className="bg-[#0D1117] border border-[#30363D] rounded-xl p-4 text-center">
                <p className="text-xs text-[#8B949E] mb-1">{t.momentum}</p>
                <p className="text-2xl font-extrabold text-[#F0A500]">{team.momentum_score}</p>
                <div className="mt-2 h-1.5 rounded-full bg-[#30363D] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#F0A500]"
                    style={{ width: `${team.momentum_score}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recent form */}
        {team.last_results && team.last_results.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-[#E6EDF3]">{t.recentForm}</h3>
            <div className="flex gap-2">
              {team.last_results.map((r, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold"
                    style={{ color: formColor(r), backgroundColor: formColor(r) + '25', border: `1px solid ${formColor(r)}40` }}
                  >
                    {r}
                  </span>
                  <span className="text-[9px] text-[#8B949E]">{formLabel(r, language)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Squad info */}
        {team.squad_info && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-[#E6EDF3]">{t.squadInfo}</h3>
            <p className="text-sm text-[#8B949E] leading-relaxed">{team.squad_info}</p>
          </div>
        )}
      </div>
    </div>
  )
}
