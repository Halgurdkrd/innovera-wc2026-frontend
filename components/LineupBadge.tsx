'use client'

import type { LineupInfo } from '@/types'

interface Props {
  lineupInfo: LineupInfo | null | undefined
  homeTeam: string
  awayTeam: string
  language: 'EN' | 'KU'
}

export default function LineupBadge({ lineupInfo, homeTeam, awayTeam, language }: Props) {
  if (!lineupInfo?.lineup_used) return null

  const isKU = language === 'KU'

  // Build a map from player name → detail for quick lookup
  const detailMap = Object.fromEntries(
    (lineupInfo.missing_details ?? []).map(d => [d.player, d])
  )

  function renderMissing(team: string, players: string[]) {
    if (players.length === 0) return null
    return (
      <div className="flex items-start gap-1.5 text-xs text-[#F0A500]/80">
        <span className="mt-0.5 flex-shrink-0">⚠️</span>
        <span>
          <span className="font-semibold text-[#E6EDF3]">{team}</span>
          {' '}{isKU ? 'نییە' : 'missing'}{': '}
          {players.map((player, i) => {
            const detail = detailMap[player]
            return (
              <span key={player}>
                {i > 0 && ', '}
                {player.replace(/^(GK|DF|MF|FW)\s+/i, '')}
                {detail && detail.data_source !== 'default' && (
                  <span className="text-[#8B949E] ml-1">
                    ({detail.xg_per90.toFixed(2)} xG/90)
                  </span>
                )}
              </span>
            )
          })}
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 mt-3">
      {/* Gold "Updated with lineups" badge */}
      <div className="inline-flex items-center gap-1.5 bg-[#F0A500]/10 border border-[#F0A500]/40 rounded-full px-3 py-1 text-xs text-[#F0A500] w-fit">
        <span>⚡</span>
        <span>
          {isKU
            ? 'نوێکرایەوە بە ئامادەکانی دیاریکراو'
            : 'Updated with confirmed lineups'}
        </span>
      </div>

      {/* Missing player warnings */}
      {renderMissing(homeTeam, lineupInfo.home_missing)}
      {renderMissing(awayTeam, lineupInfo.away_missing)}
    </div>
  )
}
