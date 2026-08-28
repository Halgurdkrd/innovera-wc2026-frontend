'use client'

import React from 'react'
import type { FPLPlayer } from '@/lib/api/types'
import type { Language } from '@/lib/translations'

export interface PitchVisualizationProps {
  formation: string
  startingXI: FPLPlayer[]
  bench: FPLPlayer[]
  language?: Language
}

// Authentic 20 Premier League Club Kit Palette & Styles
export const CLUB_KIT_THEMES: Record<string, { primary: string; secondary: string; stroke: string; pattern?: 'stripes' | 'sleeves' | 'solid' }> = {
  'Arsenal': { primary: '#EF0107', secondary: '#FFFFFF', stroke: '#9B0000', pattern: 'sleeves' },
  'Aston Villa': { primary: '#670E36', secondary: '#95BFE5', stroke: '#4A0A26', pattern: 'sleeves' },
  'Bournemouth': { primary: '#DA291C', secondary: '#000000', stroke: '#8B0000', pattern: 'stripes' },
  'Brentford': { primary: '#E30613', secondary: '#FFFFFF', stroke: '#990000', pattern: 'stripes' },
  'Brighton': { primary: '#0057B8', secondary: '#FFFFFF', stroke: '#003B80', pattern: 'stripes' },
  'Brighton and Hove Albion': { primary: '#0057B8', secondary: '#FFFFFF', stroke: '#003B80', pattern: 'stripes' },
  'Chelsea': { primary: '#034694', secondary: '#FFFFFF', stroke: '#022855', pattern: 'solid' },
  'Coventry City': { primary: '#53A4DA', secondary: '#FFFFFF', stroke: '#2B709E', pattern: 'solid' },
  'Crystal Palace': { primary: '#1B458F', secondary: '#C4122E', stroke: '#0F2752', pattern: 'stripes' },
  'Everton': { primary: '#003399', secondary: '#FFFFFF', stroke: '#001F5C', pattern: 'solid' },
  'Fulham': { primary: '#FFFFFF', secondary: '#000000', stroke: '#D1D5DB', pattern: 'solid' },
  'Hull City': { primary: '#F3A228', secondary: '#000000', stroke: '#B26F0A', pattern: 'stripes' },
  'Ipswich Town': { primary: '#004488', secondary: '#FFFFFF', stroke: '#002B57', pattern: 'solid' },
  'Leeds': { primary: '#FFFFFF', secondary: '#1D428A', stroke: '#FFCD00', pattern: 'solid' },
  'Leeds United': { primary: '#FFFFFF', secondary: '#1D428A', stroke: '#FFCD00', pattern: 'solid' },
  'Liverpool': { primary: '#C8102E', secondary: '#FFFFFF', stroke: '#7A091A', pattern: 'solid' },
  'Man City': { primary: '#6CABDD', secondary: '#FFFFFF', stroke: '#3C7CAE', pattern: 'solid' },
  'Manchester City': { primary: '#6CABDD', secondary: '#FFFFFF', stroke: '#3C7CAE', pattern: 'solid' },
  'Man Utd': { primary: '#DA291C', secondary: '#000000', stroke: '#8B0000', pattern: 'solid' },
  'Manchester United': { primary: '#DA291C', secondary: '#000000', stroke: '#8B0000', pattern: 'solid' },
  'Newcastle': { primary: '#000000', secondary: '#FFFFFF', stroke: '#333333', pattern: 'stripes' },
  'Newcastle United': { primary: '#000000', secondary: '#FFFFFF', stroke: '#333333', pattern: 'stripes' },
  'Nott\'m Forest': { primary: '#DD0000', secondary: '#FFFFFF', stroke: '#880000', pattern: 'solid' },
  'Nottingham Forest': { primary: '#DD0000', secondary: '#FFFFFF', stroke: '#880000', pattern: 'solid' },
  'Spurs': { primary: '#FFFFFF', secondary: '#132257', stroke: '#0B1433', pattern: 'solid' },
  'Tottenham Hotspur': { primary: '#FFFFFF', secondary: '#132257', stroke: '#0B1433', pattern: 'solid' },
  'Sunderland': { primary: '#EB172B', secondary: '#FFFFFF', stroke: '#940E1B', pattern: 'stripes' },
  'GK_DEFAULT': { primary: '#22C55E', secondary: '#15803D', stroke: '#166534', pattern: 'solid' }
}

export function ClubJerseySvg({ club, position, isCaptain }: { club: string; position: string; isCaptain?: boolean }) {
  const isGK = position === 'GK'
  const theme = isGK ? CLUB_KIT_THEMES['GK_DEFAULT'] : (CLUB_KIT_THEMES[club] || CLUB_KIT_THEMES['Chelsea'])

  return (
    <svg
      viewBox="0 0 48 48"
      className={`h-9 w-9 sm:h-11 sm:w-11 drop-shadow-md transition-transform group-hover:scale-110 ${
        isCaptain ? 'ring-2 ring-[#F0A500] rounded-full' : ''
      }`}
    >
      <defs>
        <clipPath id={`jersey-clip-${club.replace(/\s+/g, '')}-${position}`}>
          <path d="M16 4 L9 13 L13 18 L16 15 L16 44 L32 44 L32 15 L35 18 L39 13 L32 4 C28 9 20 9 16 4 Z" />
        </clipPath>
      </defs>

      {/* Base Jersey Shape */}
      <path
        d="M16 4 L9 13 L13 18 L16 15 L16 44 L32 44 L32 15 L35 18 L39 13 L32 4 C28 9 20 9 16 4 Z"
        fill={theme.primary}
        stroke={theme.stroke}
        strokeWidth="1.5"
      />

      {/* Pattern Layers */}
      <g clipPath={`url(#jersey-clip-${club.replace(/\s+/g, '')}-${position})`}>
        {theme.pattern === 'sleeves' && (
          <>
            {/* Left Sleeve */}
            <polygon points="9,13 16,4 16,15 13,18" fill={theme.secondary} />
            {/* Right Sleeve */}
            <polygon points="39,13 32,4 32,15 35,18" fill={theme.secondary} />
          </>
        )}

        {theme.pattern === 'stripes' && (
          <>
            <rect x="18" y="4" width="3" height="40" fill={theme.secondary} />
            <rect x="24" y="4" width="3" height="40" fill={theme.secondary} />
            <rect x="30" y="4" width="3" height="40" fill={theme.secondary} />
          </>
        )}
      </g>

      {/* Collar Detail */}
      <path d="M20 4 C22 8 26 8 28 4" fill="none" stroke={theme.secondary} strokeWidth="1.5" />
    </svg>
  )
}

export function PitchVisualization({
  formation,
  startingXI,
  bench,
  language = 'EN',
}: PitchVisualizationProps) {
  const gks = startingXI.filter((p) => p.position === 'GK')
  const defs = startingXI.filter((p) => p.position === 'DEF')
  const mids = startingXI.filter((p) => p.position === 'MID')
  const fwds = startingXI.filter((p) => p.position === 'FWD')

  return (
    <div className="w-full space-y-4">
      {/* Formation Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider">
            {language === 'KU' ? 'پێکهاتە' : 'Formation'}
          </span>
          <span className="text-xs font-bold text-[#58A6FF] bg-[#58A6FF]/10 border border-[#58A6FF]/30 px-2 py-0.5 rounded">
            {formation}
          </span>
        </div>
        <span className="text-xs text-[#8B949E]">
          {startingXI.length} {language === 'KU' ? 'یاریزانی سەرەکی' : 'Starters'}
        </span>
      </div>

      {/* Football Pitch Graphic */}
      <div className="relative w-full rounded-2xl overflow-hidden border border-[#238636]/40 bg-gradient-to-b from-[#0e3a1f] via-[#124d29] to-[#0a2e18] shadow-2xl p-4 sm:p-6 min-h-[500px] flex flex-col justify-between">
        {/* Pitch Turf Lines & Markings */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute inset-x-4 inset-y-4 border border-white/40 rounded-xl" />
          <div className="absolute top-1/2 inset-x-4 border-t border-white/40 -translate-y-1/2" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-28 w-28 rounded-full border border-white/40" />
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-48 h-20 border-b border-x border-white/40 rounded-b-lg" />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-48 h-20 border-t border-x border-white/40 rounded-t-lg" />
        </div>

        {/* Row 1: Goalkeeper */}
        <div className="relative z-10 flex justify-center items-center py-1">
          {gks.map((player) => (
            <PlayerPitchCard key={player.player_id} player={player} />
          ))}
        </div>

        {/* Row 2: Defenders */}
        <div className="relative z-10 flex justify-around items-center py-1 gap-1 sm:gap-2">
          {defs.map((player) => (
            <PlayerPitchCard key={player.player_id} player={player} />
          ))}
        </div>

        {/* Row 3: Midfielders */}
        <div className="relative z-10 flex justify-around items-center py-1 gap-1 sm:gap-2">
          {mids.map((player) => (
            <PlayerPitchCard key={player.player_id} player={player} />
          ))}
        </div>

        {/* Row 4: Forwards */}
        <div className="relative z-10 flex justify-around items-center py-1 gap-1 sm:gap-2">
          {fwds.map((player) => (
            <PlayerPitchCard key={player.player_id} player={player} />
          ))}
        </div>
      </div>

      {/* Bench Section */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-[#30363D]/60 pb-2">
          <span className="text-xs font-bold text-[#E6EDF3] uppercase tracking-wider">
            {language === 'KU' ? 'یاریزانانی یەدەگ' : 'Bench'}
          </span>
          <span className="text-xs text-[#8B949E]">
            {bench.length} {language === 'KU' ? 'یەدەگ' : 'Substitutes'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {bench.map((player, idx) => (
            <div
              key={player.player_id}
              className="bg-[#0D1117] border border-[#30363D] rounded-lg p-2.5 flex flex-col justify-between hover:border-[#8B949E]/40 transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-[#8B949E] bg-[#30363D]/50 px-1.5 py-0.5 rounded">
                  #{player.bench_order ?? idx + 1}
                </span>
                <span className="text-[10px] font-semibold text-[#58A6FF]">{player.position}</span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <ClubJerseySvg club={player.club} position={player.position} />
                <div className="min-w-0">
                  <div className="truncate font-semibold text-xs text-[#E6EDF3]" title={player.name}>
                    {player.web_name || player.name}
                  </div>
                  <div className="text-[11px] text-[#8B949E] truncate">{player.club}</div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2 pt-1 border-t border-[#30363D]/40">
                <span className="text-[10px] text-[#8B949E]">£{player.price.toFixed(1)}m</span>
                <span className="text-xs font-bold text-[#3FB950]">{player.expected_points.toFixed(1)} xP</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function PlayerPitchCard({ player }: { player: FPLPlayer }) {
  const isCap = player.is_captain
  const isVice = player.is_vice_captain

  return (
    <div className="flex flex-col items-center group cursor-pointer transition-transform hover:scale-105 select-none max-w-[76px] sm:max-w-[96px] w-full">
      {/* Jersey Icon Container & C/VC Badges */}
      <div className="relative flex items-center justify-center">
        {/* Captain / Vice Captain Badge */}
        {isCap && (
          <span
            className="absolute -top-1.5 -right-1.5 z-20 h-5 w-5 rounded-full bg-[#F0A500] text-[#0D1117] font-black text-[11px] flex items-center justify-center shadow-lg border border-black/40"
            title="Captain (2x Points)"
          >
            C
          </span>
        )}
        {isVice && !isCap && (
          <span
            className="absolute -top-1.5 -right-1.5 z-20 h-5 w-5 rounded-full bg-[#E6EDF3] text-[#0D1117] font-black text-[11px] flex items-center justify-center shadow-lg border border-black/40"
            title="Vice-Captain"
          >
            V
          </span>
        )}

        {/* Authentic Club Kit Silhouette */}
        <ClubJerseySvg club={player.club} position={player.position} isCaptain={isCap} />
      </div>

      {/* Name and Metric Plate */}
      <div className="mt-1 w-full bg-[#0D1117]/90 backdrop-blur-sm border border-white/20 rounded px-1 py-0.5 text-center shadow">
        <div className="text-[10px] sm:text-xs font-bold text-[#E6EDF3] truncate" title={player.name}>
          {player.web_name || player.name}
        </div>
        <div className="text-[8px] sm:text-[9px] text-[#8B949E] truncate">
          {player.opponent ? `${player.club.slice(0, 3).toUpperCase()} • ${player.opponent.slice(0, 3).toUpperCase()} (${player.home_away || 'H'})` : player.club}
        </div>
        <div className="text-[9px] sm:text-[10px] font-extrabold text-[#3FB950]">
          {player.expected_points.toFixed(1)} xP
        </div>
      </div>
    </div>
  )
}

export default PitchVisualization
