'use client'

import type { GroupStanding } from '@/types'
import type { Language } from './Navbar'
import Link from 'next/link'

interface GroupStandingsPreviewProps {
  standings: GroupStanding[]
  language: Language
}

const labels = {
  EN: {
    title: 'Group Standings',
    viewAll: 'View All 12 Groups',
    pos: '#',
    team: 'Team',
    p: 'P',
    w: 'W',
    d: 'D',
    l: 'L',
    pts: 'Pts',
  },
  KU: {
    title: 'پلەبەندی گروپەکان',
    viewAll: 'هەموو ١٢ گروپەکان',
    pos: '#',
    team: 'تیم',
    p: 'پ',
    w: 'ب',
    d: 'ی',
    l: 'د',
    pts: 'خاڵ',
  },
}

function GroupTable({ groupName, rows, t, language }: {
  groupName: string
  rows: GroupStanding[]
  t: typeof labels['EN']
  language: Language
}) {
  return (
    <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#30363D] bg-[#0D1117]/50">
        <h3 className="text-sm font-bold text-[#F0A500]">
          {language === 'KU' ? 'گروپ' : 'Group'} {groupName}
        </h3>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[#8B949E] border-b border-[#30363D]/50">
            <th className="px-3 py-2 text-left w-6">{t.pos}</th>
            <th className="px-3 py-2 text-left">{t.team}</th>
            <th className="px-3 py-2 text-center">{t.p}</th>
            <th className="px-3 py-2 text-center">{t.w}</th>
            <th className="px-3 py-2 text-center">{t.d}</th>
            <th className="px-3 py-2 text-center">{t.l}</th>
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
              <td className="px-3 py-2.5 text-[#8B949E]">{row.position}</td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-1.5">
                  <span>{row.team_flag || '🏳️'}</span>
                  <span className="text-[#E6EDF3] font-medium truncate max-w-[80px]">{row.team_name}</span>
                </div>
              </td>
              <td className="px-3 py-2.5 text-center text-[#8B949E]">{row.played}</td>
              <td className="px-3 py-2.5 text-center text-[#2EA043]">{row.won}</td>
              <td className="px-3 py-2.5 text-center text-[#8B949E]">{row.drawn}</td>
              <td className="px-3 py-2.5 text-center text-[#F85149]">{row.lost}</td>
              <td className="px-3 py-2.5 text-center font-bold text-[#E6EDF3]">{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function GroupStandingsPreview({ standings, language }: GroupStandingsPreviewProps) {
  const t = labels[language]

  const groups = standings.reduce<Record<string, GroupStanding[]>>((acc, row) => {
    if (!acc[row.group_name]) acc[row.group_name] = []
    acc[row.group_name].push(row)
    return acc
  }, {})

  const groupNames = Object.keys(groups).slice(0, 4)

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#E6EDF3]">{t.title}</h2>
        <Link
          href="/explore?tab=group_stage"
          className="text-sm text-[#F0A500] hover:text-[#D4920A] font-medium transition-colors"
        >
          {t.viewAll} →
        </Link>
      </div>

      {groupNames.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {groupNames.map((name) => (
            <GroupTable
              key={name}
              groupName={name}
              rows={groups[name].sort((a, b) => a.position - b.position)}
              t={t}
              language={language}
            />
          ))}
        </div>
      ) : (
        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-8 text-center text-[#8B949E]">
          {language === 'KU' ? 'پلەبەندی بەردەست نیە' : 'Standings not available yet'}
        </div>
      )}
    </section>
  )
}
