'use client'

import type { Team } from '@/types'
import type { Language } from './Navbar'

interface TeamCardProps {
  team: Team
  language: Language
  onClick: (team: Team) => void
}

const formColor = (r: string) =>
  r === 'W' ? '#2EA043' : r === 'L' ? '#F85149' : '#8B949E'

export default function TeamCard({ team, language, onClick }: TeamCardProps) {
  return (
    <button
      onClick={() => onClick(team)}
      className="w-full text-left bg-[#161B22] border border-[#30363D] rounded-xl p-4 hover:border-[#F0A500]/50 hover:bg-[#1C2128] transition-all group space-y-3"
    >
      {/* Flag + name */}
      <div className="flex items-center gap-3">
        <span className="text-3xl group-hover:scale-110 transition-transform">
          {team.flag || '🏳️'}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#E6EDF3] truncate leading-tight">{team.name}</p>
          {team.group_name && (
            <span className="text-xs text-[#8B949E]">
              {language === 'KU' ? 'گروپ' : 'Group'} {team.group_name}
            </span>
          )}
        </div>
        {team.position && (
          <span className="text-xs font-bold text-[#8B949E] flex-shrink-0">
            #{team.position}
          </span>
        )}
      </div>

      {/* Points / form row */}
      <div className="flex items-center justify-between">
        {team.points !== undefined && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-[#8B949E]">{language === 'KU' ? 'خاڵ' : 'Pts'}</span>
            <span className="text-sm font-bold text-[#F0A500]">{team.points}</span>
          </div>
        )}
        {team.last_results && team.last_results.length > 0 && (
          <div className="flex gap-1">
            {team.last_results.slice(0, 3).map((r, i) => (
              <span
                key={i}
                className="inline-flex h-4 w-4 items-center justify-center rounded text-[9px] font-bold"
                style={{ color: formColor(r), backgroundColor: formColor(r) + '25' }}
              >
                {r}
              </span>
            ))}
          </div>
        )}
        {team.confederation && (
          <span className="text-[10px] text-[#8B949E] bg-[#0D1117] border border-[#30363D] px-1.5 py-0.5 rounded">
            {team.confederation}
          </span>
        )}
      </div>
    </button>
  )
}
