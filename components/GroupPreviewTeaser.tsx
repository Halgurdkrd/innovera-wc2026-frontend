'use client'

import Link from 'next/link'
import { Sk } from '@/components/SkeletonCard'

// ── Static data ───────────────────────────────────────────────────────────────

const GROUPS: Record<string, { team: string; flag: string }[]> = {
  A: [{team:'Mexico',flag:'🇲🇽'},{team:'South Korea',flag:'🇰🇷'},{team:'South Africa',flag:'🇿🇦'},{team:'Czech Republic',flag:'🇨🇿'}],
  B: [{team:'Canada',flag:'🇨🇦'},{team:'Switzerland',flag:'🇨🇭'},{team:'Qatar',flag:'🇶🇦'},{team:'Bosnia-Herzegovina',flag:'🇧🇦'}],
  C: [{team:'Brazil',flag:'🇧🇷'},{team:'Morocco',flag:'🇲🇦'},{team:'Scotland',flag:'🏴󠁧󠁢󠁳󠁣󠁴󠁿'},{team:'Haiti',flag:'🇭🇹'}],
  D: [{team:'USA',flag:'🇺🇸'},{team:'Paraguay',flag:'🇵🇾'},{team:'Australia',flag:'🇦🇺'},{team:'Turkey',flag:'🇹🇷'}],
  E: [{team:'Germany',flag:'🇩🇪'},{team:'Curaçao',flag:'🇨🇼'},{team:"Côte d'Ivoire",flag:'🇨🇮'},{team:'Ecuador',flag:'🇪🇨'}],
  F: [{team:'Netherlands',flag:'🇳🇱'},{team:'Japan',flag:'🇯🇵'},{team:'Tunisia',flag:'🇹🇳'},{team:'Sweden',flag:'🇸🇪'}],
  G: [{team:'Belgium',flag:'🇧🇪'},{team:'Egypt',flag:'🇪🇬'},{team:'Iran',flag:'🇮🇷'},{team:'New Zealand',flag:'🇳🇿'}],
  H: [{team:'Spain',flag:'🇪🇸'},{team:'Cabo Verde',flag:'🇨🇻'},{team:'Saudi Arabia',flag:'🇸🇦'},{team:'Uruguay',flag:'🇺🇾'}],
  I: [{team:'France',flag:'🇫🇷'},{team:'Senegal',flag:'🇸🇳'},{team:'Norway',flag:'🇳🇴'},{team:'Iraq',flag:'🇮🇶'}],
  J: [{team:'Argentina',flag:'🇦🇷'},{team:'Algeria',flag:'🇩🇿'},{team:'Austria',flag:'🇦🇹'},{team:'Jordan',flag:'🇯🇴'}],
  K: [{team:'Portugal',flag:'🇵🇹'},{team:'Colombia',flag:'🇨🇴'},{team:'Uzbekistan',flag:'🇺🇿'},{team:'Congo DR',flag:'🇨🇩'}],
  L: [{team:'England',flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿'},{team:'Croatia',flag:'🇭🇷'},{team:'Ghana',flag:'🇬🇭'},{team:'Panama',flag:'🇵🇦'}],
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  stageAppearances?: Record<string, Record<string, number>>
  language: 'EN' | 'KU'
  loading?: boolean
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function GroupPreviewTeaser({ stageAppearances, language, loading = false }: Props) {
  const title = language === 'KU' ? 'پێشبینی قۆناغی گروپەکان' : 'Group Stage Preview'
  const viewAll = language === 'KU' ? 'هەموو گروپەکان ببینە' : 'View All Groups'
  const groupLabel = language === 'KU' ? 'گروپ' : 'Group'
  const qualifyLabel = language === 'KU' ? 'پێشکەوتن' : 'Qualify'

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#E6EDF3]">{title}</h2>
        <Link
          href="/explore?tab=group_stage"
          className="text-sm text-[#F0A500] hover:text-[#D4920A] font-medium transition-colors"
        >
          {viewAll} →
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        {Object.entries(GROUPS).map(([group, teams]) => {
          // Sort by qualify probability descending
          const enriched = teams
            .map(t => ({ ...t, prob: stageAppearances?.[t.team]?.R32 ?? null }))
            .sort((a, b) => (b.prob ?? 0) - (a.prob ?? 0))

          return (
            <Link
              key={group}
              href="/explore?tab=group_stage"
              className="block bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden hover:border-[#F0A500]/40 transition-colors"
            >
              {/* Header */}
              <div className="px-3 py-2 border-b border-[#30363D] flex items-center justify-between">
                <span className="text-xs font-bold text-[#F0A500]">{groupLabel} {group}</span>
                {loading && <Sk className="h-3 w-8 rounded" />}
              </div>

              {/* Team rows */}
              <div className="px-3 py-2 space-y-1.5">
                {enriched.map(({ team, flag, prob }, idx) => {
                  const pct = prob != null ? Math.round(prob * 100) : null
                  const isTop2 = idx < 2 && pct != null && pct >= 25
                  return (
                    <div key={team} className="flex items-center gap-1.5">
                      <span className="text-sm flex-shrink-0">{flag}</span>
                      <span className={`text-[10px] font-medium truncate flex-1 ${isTop2 ? 'text-[#E6EDF3]' : 'text-[#8B949E]'}`}>
                        {team}
                      </span>
                      {loading ? (
                        <Sk className="h-2 w-8 rounded-full flex-shrink-0" />
                      ) : pct != null ? (
                        <span className={`text-[9px] font-bold flex-shrink-0 tabular-nums ${
                          isTop2 ? 'text-[#F0A500]' : 'text-[#8B949E]/60'
                        }`}>
                          {pct}%
                        </span>
                      ) : (
                        <span className="text-[9px] text-[#30363D] flex-shrink-0">—%</span>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Footer */}
              <div className="px-3 py-1.5 border-t border-[#30363D]/50">
                <span className="text-[9px] text-[#8B949E]">↑ {qualifyLabel} top 2</span>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
