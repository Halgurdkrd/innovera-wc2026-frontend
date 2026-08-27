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

export function PitchVisualization({
  formation,
  startingXI,
  bench,
  language = 'EN',
}: PitchVisualizationProps) {
  // Group starters by position
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
      <div className="relative w-full rounded-2xl overflow-hidden border border-[#238636]/40 bg-gradient-to-b from-[#0e3a1f] via-[#124d29] to-[#0a2e18] shadow-2xl p-4 sm:p-6 min-h-[480px] flex flex-col justify-between">
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
              <div className="truncate font-semibold text-xs text-[#E6EDF3]" title={player.name}>
                {player.web_name || player.name}
              </div>
              <div className="text-[11px] text-[#8B949E] truncate">{player.club}</div>
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

        {/* Kit Jersey Graphic */}
        <div
          className={`h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center border-2 shadow-md ${
            isCap
              ? 'bg-[#F0A500]/20 border-[#F0A500] text-[#F0A500]'
              : 'bg-[#161B22]/90 border-white/60 text-white'
          }`}
        >
          <svg className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-8-3z" />
          </svg>
        </div>
      </div>

      {/* Name and Metric Plate */}
      <div className="mt-1 w-full bg-[#0D1117]/90 backdrop-blur-sm border border-white/20 rounded px-1 py-0.5 text-center shadow">
        <div className="text-[10px] sm:text-xs font-bold text-[#E6EDF3] truncate" title={player.name}>
          {player.web_name || player.name}
        </div>
        <div className="text-[9px] sm:text-[10px] font-extrabold text-[#3FB950]">
          {player.expected_points.toFixed(1)} xP
        </div>
      </div>
    </div>
  )
}
export default PitchVisualization
