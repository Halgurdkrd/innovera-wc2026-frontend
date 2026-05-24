'use client'

import type { GroupStanding } from '@/types'
import type { Language } from './Navbar'

interface FullStandingsProps {
  standings: GroupStanding[]
  language: Language
}

const labels = {
  EN: { pos: '#', team: 'Team', p: 'P', w: 'W', d: 'D', l: 'L', gf: 'GF', ga: 'GA', gd: 'GD', pts: 'Pts', group: 'Group', advance: 'Advance (top 2)' },
  KU: { pos: '#', team: 'تیم', p: 'یاری', w: 'بردن', d: 'یەکسان', l: 'بازین', gf: 'گۆلی دراو', ga: 'گۆلی وەرگیراو', gd: 'جیاوازی', pts: 'خاڵ', group: 'گروپ', advance: 'بەرزبوون (سەرووی ٢)' },
}

function GroupTable({ groupName, rows, t }: {
  groupName: string
  rows: GroupStanding[]
  t: typeof labels['EN']
}) {
  return (
    <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#30363D] flex items-center justify-between">
        <h3 className="text-sm font-bold text-[#F0A500]">Group {groupName}</h3>
        <span className="text-[10px] text-[#8B949E]">{t.advance}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[400px]">
          <thead>
            <tr className="text-[#8B949E] border-b border-[#30363D]/50">
              <th className="px-3 py-2 text-left w-6">{t.pos}</th>
              <th className="px-3 py-2 text-left">{t.team}</th>
              <th className="px-3 py-2 text-center">{t.p}</th>
              <th className="px-3 py-2 text-center">{t.w}</th>
              <th className="px-3 py-2 text-center">{t.d}</th>
              <th className="px-3 py-2 text-center">{t.l}</th>
              <th className="px-3 py-2 text-center">{t.gf}</th>
              <th className="px-3 py-2 text-center">{t.ga}</th>
              <th className="px-3 py-2 text-center">{t.gd}</th>
              <th className="px-3 py-2 text-center font-bold text-[#E6EDF3]">{t.pts}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={row.id}
                className={`border-b border-[#30363D]/30 hover:bg-[#0D1117]/40 transition-colors ${
                  idx < 2 ? 'border-l-2 border-l-[#2EA043]' : ''
                }`}
              >
                <td className="px-3 py-2.5 text-[#8B949E] font-medium">{row.position}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span>{row.team_flag || '🏳️'}</span>
                    <span className="text-[#E6EDF3] font-medium truncate max-w-[100px]">{row.team_name}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-center text-[#8B949E]">{row.played}</td>
                <td className="px-3 py-2.5 text-center text-[#2EA043] font-semibold">{row.won}</td>
                <td className="px-3 py-2.5 text-center text-[#8B949E]">{row.drawn}</td>
                <td className="px-3 py-2.5 text-center text-[#F85149]">{row.lost}</td>
                <td className="px-3 py-2.5 text-center text-[#8B949E]">{row.goals_for}</td>
                <td className="px-3 py-2.5 text-center text-[#8B949E]">{row.goals_against}</td>
                <td className="px-3 py-2.5 text-center text-[#8B949E]">
                  {row.goal_difference > 0 ? '+' : ''}{row.goal_difference}
                </td>
                <td className="px-3 py-2.5 text-center font-extrabold text-[#E6EDF3]">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Legend */}
      <div className="px-4 py-2 border-t border-[#30363D]/50 flex items-center gap-2">
        <div className="h-3 w-1 rounded-full bg-[#2EA043]" />
        <span className="text-[10px] text-[#8B949E]">
          {t.advance}
        </span>
      </div>
    </div>
  )
}

export default function FullStandings({ standings, language }: FullStandingsProps) {
  const t = labels[language]

  const groups = standings.reduce<Record<string, GroupStanding[]>>((acc, row) => {
    if (!acc[row.group_name]) acc[row.group_name] = []
    acc[row.group_name].push(row)
    return acc
  }, {})

  const groupNames = Object.keys(groups).sort()

  if (groupNames.length === 0) {
    return (
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-12 text-center">
        <span className="text-4xl">📊</span>
        <p className="mt-3 text-[#8B949E]">
          {language === 'KU' ? 'پلەبەندی بەردەست نیە' : 'Standings not available yet'}
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {groupNames.map((name) => (
        <GroupTable
          key={name}
          groupName={name}
          rows={groups[name].sort((a, b) => a.position - b.position)}
          t={t}
        />
      ))}
    </div>
  )
}
