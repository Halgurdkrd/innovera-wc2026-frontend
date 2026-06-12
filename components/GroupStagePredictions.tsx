'use client'

import Link from 'next/link'
import type { TournamentGroup, TournamentGroupTeam, GroupStanding } from '@/types'
import type { Language } from './Navbar'
import { SkGroupCard } from './SkeletonCard'

// ── Fallback: all 48 WC2026 teams — always visible, even when API is down ──────
// qualify_prob 0.5 = equal chance pre-tournament (top 2 of 4 advance)

const FALLBACK_GROUPS: TournamentGroup[] = [
  { group: 'A', teams: [
    { team: 'Mexico',         flag: '🇲🇽', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'South Korea',    flag: '🇰🇷', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'South Africa',   flag: '🇿🇦', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Czech Republic', flag: '🇨🇿', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
  ]},
  { group: 'B', teams: [
    { team: 'Canada',              flag: '🇨🇦', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Switzerland',         flag: '🇨🇭', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Qatar',               flag: '🇶🇦', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Bosnia-Herzegovina',  flag: '🇧🇦', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
  ]},
  { group: 'C', teams: [
    { team: 'Brazil',   flag: '🇧🇷', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Morocco',  flag: '🇲🇦', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Scotland', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Haiti',    flag: '🇭🇹', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
  ]},
  { group: 'D', teams: [
    { team: 'USA',       flag: '🇺🇸', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Paraguay',  flag: '🇵🇾', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Australia', flag: '🇦🇺', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Turkey',    flag: '🇹🇷', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
  ]},
  { group: 'E', teams: [
    { team: 'Germany',        flag: '🇩🇪', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Curaçao',        flag: '🇨🇼', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: "Côte d'Ivoire",  flag: '🇨🇮', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Ecuador',        flag: '🇪🇨', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
  ]},
  { group: 'F', teams: [
    { team: 'Netherlands', flag: '🇳🇱', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Japan',       flag: '🇯🇵', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Tunisia',     flag: '🇹🇳', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Sweden',      flag: '🇸🇪', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
  ]},
  { group: 'G', teams: [
    { team: 'Belgium',     flag: '🇧🇪', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Egypt',       flag: '🇪🇬', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Iran',        flag: '🇮🇷', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'New Zealand', flag: '🇳🇿', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
  ]},
  { group: 'H', teams: [
    { team: 'Spain',        flag: '🇪🇸', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Cabo Verde',   flag: '🇨🇻', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Saudi Arabia', flag: '🇸🇦', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Uruguay',      flag: '🇺🇾', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
  ]},
  { group: 'I', teams: [
    { team: 'France',  flag: '🇫🇷', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Senegal', flag: '🇸🇳', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Norway',  flag: '🇳🇴', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Iraq',    flag: '🇮🇶', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
  ]},
  { group: 'J', teams: [
    { team: 'Argentina', flag: '🇦🇷', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Algeria',   flag: '🇩🇿', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Austria',   flag: '🇦🇹', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Jordan',    flag: '🇯🇴', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
  ]},
  { group: 'K', teams: [
    { team: 'Portugal',   flag: '🇵🇹', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Colombia',   flag: '🇨🇴', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Uzbekistan', flag: '🇺🇿', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Congo DR',   flag: '🇨🇩', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
  ]},
  { group: 'L', teams: [
    { team: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Croatia', flag: '🇭🇷', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Ghana',   flag: '🇬🇭', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
    { team: 'Panama',  flag: '🇵🇦', predicted_pts: 0, predicted_gd: 0, predicted_gf: 0, qualify_prob: 0.5 },
  ]},
]

const FALLBACK_BY_GROUP: Record<string, TournamentGroupTeam[]> = {}
for (const g of FALLBACK_GROUPS) FALLBACK_BY_GROUP[g.group] = g.teams

interface Props {
  groups: TournamentGroup[]
  stageAppearances?: Record<string, Record<string, number>>
  standings: GroupStanding[]
  loading: boolean
  language: Language
  qualifyDiff?: Record<string, number>
}

const labels = {
  EN: {
    rank: '#',
    team: 'Team',
    pts: 'Exp.Pts',
    gd: 'Exp.GD',
    gf: 'xGF',
    qualify: 'Qualify',
    advanceAI: 'Expected standings across simulations',
    noData: 'Tournament simulation not available yet',
    aiTag: 'AI',
    groupLabel: (g: string) => `Group ${g}`,
  },
  KU: {
    rank: '#',
    team: 'تیم',
    pts: 'خاڵ',
    gd: 'جیاوازی',
    gf: 'گۆل',
    qualify: 'بەشداری',
    advanceAI: 'چاوەڕوانکراوی شێوەکاری',
    noData: 'شبیهسازی تورنووان هێشتا بەردەست نیە',
    aiTag: 'AI',
    groupLabel: (g: string) => `گروپ ${g}`,
  },
}

function QualDelta({ delta }: { delta: number }) {
  const absPct = Math.round(Math.abs(delta * 100))
  if (absPct < 1) return null
  return (
    <span className={`text-[9px] font-bold ml-0.5 ${delta > 0 ? 'text-[#2EA043]' : 'text-[#F85149]'}`}>
      {delta > 0 ? '↑' : '↓'}{absPct}%
    </span>
  )
}

function QualProb({ prob, delta }: { prob: number; delta?: number }) {
  const pct = Math.round(prob * 100)
  const cls =
    pct >= 70 ? 'text-[#2EA043] bg-[#2EA043]/10 border-[#2EA043]/30'
    : pct >= 40 ? 'text-[#F0A500] bg-[#F0A500]/10 border-[#F0A500]/30'
    : 'text-[#F85149] bg-[#F85149]/10 border-[#F85149]/30'
  return (
    <span className="inline-flex items-center">
      <span className={`text-[10px] font-bold border rounded px-1.5 py-0.5 tabular-nums ${cls}`}>
        {pct}%
      </span>
      {delta != null && <QualDelta delta={delta} />}
    </span>
  )
}

// ── Group card: simulation prediction ────────────────────────────────────────

function AiGroupCard({
  groupName,
  aiTeams,
  qualifyDiff,
  t,
}: {
  groupName: string
  aiTeams: TournamentGroupTeam[]
  qualifyDiff?: Record<string, number>
  t: typeof labels['EN']
}) {
  // Sort by expected_rank (Supabase average) when available, fall back to predicted_pts
  const sorted = [...aiTeams].sort((a, b) => {
    if (a.expected_rank != null && b.expected_rank != null) return a.expected_rank - b.expected_rank
    return b.predicted_pts - a.predicted_pts || b.predicted_gd - a.predicted_gd || b.predicted_gf - a.predicted_gf
  })
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
                      <Link href={`/team/${encodeURIComponent(team.team)}`} className={`font-medium truncate max-w-[90px] hover:text-[#F0A500] transition-colors ${isTop2 ? 'text-[#E6EDF3]' : 'text-[#8B949E]'}`}>
                        {team.team}
                      </Link>
                      {team.qualified && (
                        <span className="text-[9px] text-[#2EA043] font-bold">Q</span>
                      )}
                    </div>
                  </td>
                  <td className={`px-3 py-2.5 text-center font-extrabold ${isTop2 ? 'text-[#E6EDF3]' : 'text-[#8B949E]'}`}>
                    {Number(team.predicted_pts).toFixed(1)}
                  </td>
                  <td className="px-3 py-2.5 text-center text-[#8B949E]">
                    {team.predicted_gd > 0 ? '+' : ''}{Number(team.predicted_gd).toFixed(1)}
                  </td>
                  <td className="px-3 py-2.5 text-center text-[#8B949E]">{Number(team.predicted_gf).toFixed(1)}</td>
                  <td className="px-3 py-2.5 text-center">
                    <QualProb prob={team.qualify_prob} delta={qualifyDiff?.[team.team]} />
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

export default function GroupStagePredictions({ groups, stageAppearances, standings, loading, language, qualifyDiff }: Props) {
  const t = labels[language]

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {Array.from({ length: 4 }).map((_, i) => <SkGroupCard key={i} rows={4} />)}
        </div>
        <p className="text-center text-xs text-[#8B949E]">
          {language === 'KU' ? 'پێشبینییەکانی ئەی ئای بارئەکرێت…' : 'AI predictions loading…'}
        </p>
      </div>
    )
  }

  // Build team name → Supabase standing (for avg_points / expected_rank)
  const standingsMap: Record<string, GroupStanding> = {}
  for (const row of standings) standingsMap[row.team_name] = row

  // Build group name → AI teams map (from API)
  const apiByGroup: Record<string, TournamentGroupTeam[]> = {}
  for (const g of groups) {
    apiByGroup[g.group] = g.teams
  }

  // Merge: FALLBACK_GROUPS is always the source of truth for team names + flags.
  // Priority for pts/gd: Supabase avg_points > simulation API avg_pts > single-run pts > 0
  // expected_rank from Supabase controls sort order in AiGroupCard.
  const aiByGroup: Record<string, TournamentGroupTeam[]> = {}
  for (const fb of FALLBACK_GROUPS) {
    const apiTeams = apiByGroup[fb.group] ?? []
    const apiStatsByTeam: Record<string, TournamentGroupTeam> = {}
    for (const t of apiTeams) apiStatsByTeam[t.team] = t
    aiByGroup[fb.group] = fb.teams.map((fbTeam) => {
      const saProb = stageAppearances?.[fbTeam.team]?.R32
      const apiStats = apiStatsByTeam[fbTeam.team]
      const sbRow = standingsMap[fbTeam.team]
      return {
        ...fbTeam,
        ...(apiStats ?? {}),
        predicted_pts: apiStats?.predicted_pts || sbRow?.avg_points || 0,
        predicted_gd:  apiStats?.predicted_gd  || sbRow?.avg_gd    || 0,
        predicted_gf:  apiStats?.predicted_gf  || sbRow?.avg_gf    || 0,
        expected_rank: apiStats?.expected_rank ?? sbRow?.expected_rank,
        qualify_prob: saProb != null ? saProb : (apiStats?.qualify_prob ?? 0.5),
        team: fbTeam.team,
        flag: fbTeam.flag,
      }
    })
  }

  const allGroups = Object.keys(aiByGroup).sort()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {allGroups.map((groupName) => (
        <AiGroupCard
          key={groupName}
          groupName={groupName}
          aiTeams={aiByGroup[groupName] ?? []}
          qualifyDiff={qualifyDiff}
          t={t}
        />
      ))}
    </div>
  )
}
