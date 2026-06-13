'use client'

import { useState, useEffect } from 'react'
import type { BracketSlot } from '@/types'
import type { Language } from './Navbar'

interface BracketProps {
  slots: BracketSlot[]
  language: Language
}

const ROUNDS_EN = ['Round of 32', 'Round of 16', 'Quarter-Finals', 'Semi-Finals', 'Final']
const ROUNDS_KU = ['دۆری ٣٢', 'دۆری ١٦', 'چارەک فینال', 'نیوە فینال', 'فینال']

function SlotCard({ slot, language }: { slot: BracketSlot; language: Language }) {
  const isDone = slot.winner !== undefined
  const [displayDate, setDisplayDate] = useState('')
  useEffect(() => {
    if (!slot.match_date) return
    let s = slot.match_date.replace(' ', 'T')
    if (!s.endsWith('Z') && !s.includes('+')) s += 'Z'
    const d = new Date(s)
    if (!isNaN(d.getTime())) {
      setDisplayDate(d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }))
    }
  }, [slot.match_date])

  return (
    <div
      className={`bg-[#0D1117] border rounded-lg overflow-hidden w-36 flex-shrink-0 ${
        isDone ? 'border-[#F0A500]/40' : 'border-[#30363D]'
      }`}
    >
      {/* Team A */}
      <div
        className={`flex items-center gap-2 px-2.5 py-1.5 border-b border-[#30363D] ${
          slot.winner === slot.team_a ? 'bg-[#F0A500]/10' : ''
        }`}
      >
        <span className="text-sm">{slot.team_a ? '🏳️' : ''}</span>
        <span className={`text-xs font-medium truncate flex-1 ${
          slot.winner === slot.team_a ? 'text-[#F0A500]' : 'text-[#E6EDF3]'
        }`}>
          {slot.team_a ?? (language === 'KU' ? 'دیارنیە' : 'TBD')}
        </span>
        {slot.score_a !== undefined && (
          <span className={`text-xs font-bold ${slot.winner === slot.team_a ? 'text-[#F0A500]' : 'text-[#8B949E]'}`}>
            {slot.score_a}
          </span>
        )}
      </div>
      {/* Team B */}
      <div
        className={`flex items-center gap-2 px-2.5 py-1.5 ${
          slot.winner === slot.team_b ? 'bg-[#F0A500]/10' : ''
        }`}
      >
        <span className="text-sm">{slot.team_b ? '🏳️' : ''}</span>
        <span className={`text-xs font-medium truncate flex-1 ${
          slot.winner === slot.team_b ? 'text-[#F0A500]' : 'text-[#E6EDF3]'
        }`}>
          {slot.team_b ?? (language === 'KU' ? 'دیارنیە' : 'TBD')}
        </span>
        {slot.score_b !== undefined && (
          <span className={`text-xs font-bold ${slot.winner === slot.team_b ? 'text-[#F0A500]' : 'text-[#8B949E]'}`}>
            {slot.score_b}
          </span>
        )}
      </div>
      {/* Date */}
      {slot.match_date && displayDate && (
        <div className="px-2.5 py-1 bg-[#161B22] border-t border-[#30363D]">
          <span className="text-[9px] text-[#8B949E]">
            {displayDate}
          </span>
        </div>
      )}
    </div>
  )
}

function TbdSlot({ language }: { language: Language }) {
  return (
    <div className="bg-[#0D1117] border border-[#30363D]/50 border-dashed rounded-lg w-36 flex-shrink-0">
      <div className="flex items-center gap-2 px-2.5 py-1.5 border-b border-[#30363D]/50">
        <span className="text-xs text-[#30363D] flex-1">{language === 'KU' ? 'دیارنیە' : 'TBD'}</span>
      </div>
      <div className="flex items-center gap-2 px-2.5 py-1.5">
        <span className="text-xs text-[#30363D] flex-1">{language === 'KU' ? 'دیارنیە' : 'TBD'}</span>
      </div>
    </div>
  )
}

const SLOT_COUNTS: Record<string, number> = {
  'Round of 32': 16,
  'Round of 16': 8,
  'Quarter-Finals': 4,
  'Semi-Finals': 2,
  'Final': 1,
}

export default function Bracket({ slots, language }: BracketProps) {
  const rounds = language === 'KU' ? ROUNDS_KU : ROUNDS_EN
  const roundsEn = ROUNDS_EN

  const slotsByRound = slots.reduce<Record<string, BracketSlot[]>>((acc, s) => {
    if (!acc[s.round]) acc[s.round] = []
    acc[s.round].push(s)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* Notice banner */}
      <div className="flex items-center gap-3 bg-[#F0A500]/10 border border-[#F0A500]/30 rounded-xl px-4 py-3">
        <span className="text-xl">🏆</span>
        <p className="text-sm text-[#F0A500] font-medium">
          {language === 'KU'
            ? 'قۆناغی کووتایی کاتێک تیمەکان پێشبچن دیار دەبێت'
            : 'Knockout bracket will populate once group stage teams qualify'}
        </p>
      </div>

      {/* Bracket scroll area */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-8 min-w-max">
          {roundsEn.map((roundEn, ri) => {
            const displayRound = rounds[ri]
            const roundSlots = slotsByRound[roundEn] ?? []
            const needed = SLOT_COUNTS[roundEn] ?? 1
            const tbdCount = Math.max(0, needed - roundSlots.length)

            return (
              <div key={roundEn} className="flex flex-col gap-3">
                {/* Round label */}
                <div className="text-center">
                  <span className="text-xs font-bold text-[#F0A500] bg-[#F0A500]/10 border border-[#F0A500]/30 px-3 py-1 rounded-full">
                    {displayRound}
                  </span>
                </div>

                {/* Spacer to vertically centre slots within round */}
                <div className="flex flex-col justify-around gap-3" style={{ minHeight: `${needed * 72}px` }}>
                  {roundSlots.map((slot) => (
                    <SlotCard key={slot.id} slot={slot} language={language} />
                  ))}
                  {Array.from({ length: tbdCount }).map((_, i) => (
                    <TbdSlot key={`tbd-${i}`} language={language} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
