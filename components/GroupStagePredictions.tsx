'use client'

import type { TournamentGroup, TournamentGroupTeam, GroupStanding } from '@/types'
import type { Language } from './Navbar'

// ── Fallback: all 48 WC2026 teams — always visible, even when API is down ──────
// qualify_prob 0.5 = equal chance pre-tournament (top 2 of 4 advance)

const FALLBACK_GROUPS: TournamentGroup[] = [
  { group: 'A', teams: [
    { team: 'USA',     flag: '🇺🇸', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Panama',  flag: '🇵🇦', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Albania', flag: '🇦🇱', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Ukraine', flag: '🇺🇦', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
  ]},
  { group: 'B', teams: [
    { team: 'Mexico',    flag: '🇲🇽', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Jamaica',   flag: '🇯🇲', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Venezuela', flag: '🇻🇪', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Ecuador',   flag: '🇪🇨', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
  ]},
  { group: 'C', teams: [
    { team: 'Canada',   flag: '🇨🇦', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Honduras', flag: '🇭🇳', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Morocco',  flag: '🇲🇦', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Portugal', flag: '🇵🇹', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
  ]},
  { group: 'D', teams: [
    { team: 'Spain',       flag: '🇪🇸', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Japan',       flag: '🇯🇵', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Congo DR',    flag: '🇨🇩', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'New Zealand', flag: '🇳🇿', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
  ]},
  { group: 'E', teams: [
    { team: 'Germany',   flag: '🇩🇪', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Australia', flag: '🇦🇺', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Argentina', flag: '🇦🇷', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Chile',     flag: '🇨🇱', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
  ]},
  { group: 'F', teams: [
    { team: 'France',   flag: '🇫🇷', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Algeria',  flag: '🇩🇿', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Nigeria',  flag: '🇳🇬', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Paraguay', flag: '🇵🇾', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
  ]},
  { group: 'G', teams: [
    { team: 'England',  flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Serbia',   flag: '🇷🇸', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Cameroon', flag: '🇨🇲', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Senegal',  flag: '🇸🇳', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
  ]},
  { group: 'H', teams: [
    { team: 'Netherlands',  flag: '🇳🇱', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Finland',      flag: '🇫🇮', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Saudi Arabia', flag: '🇸🇦', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Peru',         flag: '🇵🇪', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
  ]},
  { group: 'I', teams: [
    { team: 'Brazil',      flag: '🇧🇷', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Uruguay',     flag: '🇺🇾', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Colombia',    flag: '🇨🇴', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'South Korea', flag: '🇰🇷', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
  ]},
  { group: 'J', teams: [
    { team: 'Belgium',  flag: '🇧🇪', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Egypt',    flag: '🇪🇬', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Qatar',    flag: '🇶🇦', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Slovakia', flag: '🇸🇰', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
  ]},
  { group: 'K', teams: [
    { team: 'Croatia', flag: '🇭🇷', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Iran',    flag: '🇮🇷', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Poland',  flag: '🇵🇱', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Tunisia', flag: '🇹🇳', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
  ]},
  { group: 'L', teams: [
    { team: 'Italy',       flag: '🇮🇹', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Turkey',      flag: '🇹🇷', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Slovenia',    flag: '🇸🇮', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Switzerland', flag: '🇨🇭', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
  ]},
]

const FALLBACK_BY_GROUP: Record<string, TournamentGroupTeam[]> = {}
for (const g of FALLBACK_GROUPS) FALLBACK_BY_GROUP[g.group] = g.teams

interface Props {
  groups: TournamentGroup[]
  standings: GroupStanding[]
  loading: boolean
  language: Language
}

const labels = {
  EN: {
    rank: '#',
    team: 'Team',
    pts: 'Pts',
    gd: 'GD',
    gf: 'GF',
    qualify: 'Qualify',
    advanceAI: 'Top 2 advance · AI prediction',
    advanceReal: 'Top 2 advance · Live standings',
    noData: 'Tournament simulation not available yet',
    aiTag: 'AI',
    liveTag: 'Live',
    groupLabel: (g: string) => `Group ${g}`,
  },
  KU: {
    rank: '#',
    team: 'تیم',
    pts: 'خاڵ',
    gd: 'جیاوازی',
    gf: 'گۆل',
    qualify: 'بەشداری',
    advanceAI: 'سەرووی ٢ بەرزدەبنەوە · پێشبینی AI',
    advanceReal: 'سەرووی ٢ بەرزدەبنەوە · پلەبەندی بەکردەوە',
    noData: 'شبیهسازی تورنووان هێشتا بەردەست نیە',
    aiTag: 'AI',
    liveTag: 'بەکردەوە',
    groupLabel: (g: string) => `گروپ ${g}`,
  },
}

function QualProb({ prob }: { prob: number }) {
  const pct = Math.round(prob * 100)
  const cls =
    pct >= 70 ? 'text-[#2EA043] bg-[#2EA043]/10 border-[#2EA043]/30'
    : pct >= 40 ? 'text-[#F0A500] bg-[#F0A500]/10 border-[#F0A500]/30'
    : 'text-[#F85149] bg-[#F85149]/10 border-[#F85149]/30'
  return (
    <span className={`text-[10px] font-bold border rounded px-1.5 py-0.5 tabular-nums ${cls}`}>
      {pct}%
    </span>
  )
}

// ── Group card: real standings (with AI qualify%) ─────────────────────────────

function RealGroupCard({
  groupName,
  rows,
  aiTeams,
  t,
}: {
  groupName: string
  rows: GroupStanding[]
  aiTeams: TournamentGroupTeam[]
  t: typeof labels['EN']
}) {
  const sorted = [...rows].sort(
    (a, b) => b.points - a.points || b.goal_difference - a.goal_difference || b.goals_for - a.goals_for
  )
  return (
    <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#30363D] flex items-center justify-between">
        <h3 className="text-sm font-bold text-[#F0A500]">{t.groupLabel(groupName)}</h3>
        <span className="text-[10px] bg-[#2EA043]/10 text-[#2EA043] border border-[#2EA043]/30 rounded px-1.5 py-0.5 font-semibold">
          {t.liveTag}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[360px]">
          <thead>
            <tr className="text-[#8B949E] border-b border-[#30363D]/50">
              <th className="px-3 py-2 text-left w-6">{t.rank}</th>
              <th className="px-3 py-2 text-left">{t.team}</th>
              <th className="px-3 py-2 text-center font-bold text-[#E6EDF3]">{t.pts}</th>
              <th className="px-3 py-2 text-center">{t.gd}</th>
              <th className="px-3 py-2 text-center">{t.gf}</th>
              <th className="px-3 py-2 text-center">{t.qualify}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, idx) => {
              const isTop2 = idx < 2
              const aiTeam = aiTeams.find((t) => t.team === row.team_name)
              return (
                <tr
                  key={row.id}
                  className={`border-b border-[#30363D]/30 hover:bg-[#0D1117]/40 transition-colors ${
                    isTop2 ? 'border-l-2 border-l-[#F0A500]' : ''
                  } ${row.lost > 0 && row.points === 0 && row.played === 3 ? 'opacity-50' : ''}`}
                >
                  <td className={`px-3 py-2.5 font-bold ${isTop2 ? 'text-[#F0A500]' : 'text-[#8B949E]'}`}>
                    {idx + 1}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span>{row.team_flag || '🏳️'}</span>
                      <span className={`font-medium truncate max-w-[90px] ${isTop2 ? 'text-[#E6EDF3]' : 'text-[#8B949E]'}`}>
                        {row.team_name}
                      </span>
                    </div>
                  </td>
                  <td className={`px-3 py-2.5 text-center font-extrabold ${isTop2 ? 'text-[#E6EDF3]' : 'text-[#8B949E]'}`}>
                    {row.points}
                  </td>
                  <td className="px-3 py-2.5 text-center text-[#8B949E]">
                    {row.goal_difference > 0 ? '+' : ''}{row.goal_difference}
                  </td>
                  <td className="px-3 py-2.5 text-center text-[#8B949E]">{row.goals_for}</td>
                  <td className="px-3 py-2.5 text-center">
                    {aiTeam ? <QualProb prob={aiTeam.qualify_prob} /> : <span className="text-[#30363D]">—</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 border-t border-[#30363D]/50 flex items-center gap-2">
        <div className="h-3 w-1 rounded-full bg-[#F0A500]" />
        <span className="text-[10px] text-[#8B949E]">{t.advanceReal}</span>
      </div>
    </div>
  )
}

// ── Group card: AI-only prediction ────────────────────────────────────────────

function AiGroupCard({
  groupName,
  aiTeams,
  t,
}: {
  groupName: string
  aiTeams: TournamentGroupTeam[]
  t: typeof labels['EN']
}) {
  const sorted = [...aiTeams].sort(
    (a, b) => b.predicted_pts - a.predicted_pts || b.predicted_gd - a.predicted_gd || b.predicted_gf - a.predicted_gf
  )
  return (
    <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#30363D] flex items-center justify-between">
        <h3 className="text-sm font-bold text-[#F0A500]">{t.groupLabel(groupName)}</h3>
        <span className="text-[10px] bg-[#58A6FF]/10 text-[#58A6FF] border border-[#58A6FF]/30 rounded px-1.5 py-0.5 font-semibold">
          {t.aiTag}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[360px]">
          <thead>
            <tr className="text-[#8B949E] border-b border-[#30363D]/50">
              <th className="px-3 py-2 text-left w-6">{t.rank}</th>
              <th className="px-3 py-2 text-left">{t.team}</th>
              <th className="px-3 py-2 text-center font-bold text-[#E6EDF3]">{t.pts}</th>
              <th className="px-3 py-2 text-center">{t.gd}</th>
              <th className="px-3 py-2 text-center">{t.gf}</th>
              <th className="px-3 py-2 text-center">{t.qualify}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((team, idx) => {
              const isTop2 = idx < 2
              return (
                <tr
                  key={team.team}
                  className={`border-b border-[#30363D]/30 hover:bg-[#0D1117]/40 transition-colors ${
                    isTop2 ? 'border-l-2 border-l-[#F0A500]' : ''
                  } ${team.eliminated ? 'opacity-40' : ''}`}
                >
                  <td className={`px-3 py-2.5 font-bold ${isTop2 ? 'text-[#F0A500]' : 'text-[#8B949E]'}`}>
                    {idx + 1}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span>{team.flag || '🏳️'}</span>
                      <span className={`font-medium truncate max-w-[90px] ${isTop2 ? 'text-[#E6EDF3]' : 'text-[#8B949E]'}`}>
                        {team.team}
                      </span>
                      {team.qualified && (
                        <span className="text-[9px] text-[#2EA043] font-bold">Q</span>
                      )}
                    </div>
                  </td>
                  <td className={`px-3 py-2.5 text-center font-extrabold ${isTop2 ? 'text-[#E6EDF3]' : 'text-[#8B949E]'}`}>
                    {team.predicted_pts}
                  </td>
                  <td className="px-3 py-2.5 text-center text-[#8B949E]">
                    {team.predicted_gd > 0 ? '+' : ''}{team.predicted_gd}
                  </td>
                  <td className="px-3 py-2.5 text-center text-[#8B949E]">{team.predicted_gf}</td>
                  <td className="px-3 py-2.5 text-center">
                    <QualProb prob={team.qualify_prob} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 border-t border-[#30363D]/50 flex items-center gap-2">
        <div className="h-3 w-1 rounded-full bg-[#F0A500]" />
        <span className="text-[10px] text-[#8B949E]">{t.advanceAI}</span>
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function GroupStagePredictions({ groups, standings, loading, language }: Props) {
  const t = labels[language]

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-52 rounded-xl bg-[#161B22] border border-[#30363D] animate-pulse" />
        ))}
      </div>
    )
  }

  // Build group name → real standings rows map
  const realByGroup: Record<string, GroupStanding[]> = {}
  for (const row of standings) {
    if (!realByGroup[row.group_name]) realByGroup[row.group_name] = []
    realByGroup[row.group_name].push(row)
  }

  // Build group name → AI teams map (from API)
  const apiByGroup: Record<string, TournamentGroupTeam[]> = {}
  for (const g of groups) {
    apiByGroup[g.group] = g.teams
  }

  // Merge: use API teams only when they have non-empty names; otherwise use fallback.
  // This guarantees team names are always visible even when the API is down or returns empty data.
  const aiByGroup: Record<string, TournamentGroupTeam[]> = {}
  for (const fb of FALLBACK_GROUPS) {
    const apiTeams = apiByGroup[fb.group] ?? []
    const apiHasNames = apiTeams.length > 0 && apiTeams.some(t => t.team && t.team.trim() !== '')
    aiByGroup[fb.group] = apiHasNames ? apiTeams : fb.teams
  }

  // Always render all 12 groups A–L (fallback guarantees they exist)
  const allGroups = Array.from(
    new Set([...Object.keys(realByGroup), ...Object.keys(aiByGroup)])
  ).sort()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {allGroups.map((groupName) => {
        const realRows = realByGroup[groupName] ?? []
        const aiTeams = aiByGroup[groupName] ?? []
        const hasRealGames = realRows.some((r) => r.played > 0)

        return hasRealGames ? (
          <RealGroupCard key={groupName} groupName={groupName} rows={realRows} aiTeams={aiTeams} t={t} />
        ) : (
          <AiGroupCard key={groupName} groupName={groupName} aiTeams={aiTeams} t={t} />
        )
      })}
    </div>
  )
}
