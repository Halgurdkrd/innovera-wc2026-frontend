'use client'

import { useState } from 'react'
import type { Language } from '@/lib/translations'

export interface PitchPlayer {
  id: string
  name: string
  club: string
  position: 'GK' | 'DEF' | 'MID' | 'FWD'
  expected_points: number | null
  is_captain?: boolean
  is_vice_captain?: boolean
  price?: number
  expected_minutes?: number | null
  p_start?: number
  haul_probability?: number
}

export interface PitchVisualizationProps {
  formation: string
  startingXI: PitchPlayer[]
  bench: PitchPlayer[]
  language?: Language
}

// ── Placeholder squad — shown until the FPL API is live. Not real recommendations. ──
const MOCK_FORMATION = '4-3-3'
const MOCK_STARTING_XI: PitchPlayer[] = [
  { id: 'gk1', name: 'Alisson', club: 'LIV', position: 'GK', expected_points: 4.2, price: 5.5, expected_minutes: 90, p_start: 0.95 },
  { id: 'def1', name: 'Trent Alexander-Arnold', club: 'LIV', position: 'DEF', expected_points: 5.8, price: 7.0, expected_minutes: 90, p_start: 0.9 },
  { id: 'def2', name: 'William Saliba', club: 'ARS', position: 'DEF', expected_points: 5.1, price: 6.0, expected_minutes: 90, p_start: 0.92 },
  { id: 'def3', name: 'Gabriel Magalhães', club: 'ARS', position: 'DEF', expected_points: 4.9, price: 5.8, expected_minutes: 90, p_start: 0.9 },
  { id: 'def4', name: 'Pedro Porro', club: 'TOT', position: 'DEF', expected_points: 4.4, price: 5.5, expected_minutes: 85, p_start: 0.85 },
  { id: 'mid1', name: 'Mohamed Salah', club: 'LIV', position: 'MID', expected_points: 8.1, is_captain: true, price: 13.5, expected_minutes: 90, p_start: 0.97, haul_probability: 0.42 },
  { id: 'mid2', name: 'Bukayo Saka', club: 'ARS', position: 'MID', expected_points: 6.9, is_vice_captain: true, price: 10.0, expected_minutes: 88, p_start: 0.93, haul_probability: 0.31 },
  { id: 'mid3', name: 'Cole Palmer', club: 'CHE', position: 'MID', expected_points: 6.4, price: 11.0, expected_minutes: null, p_start: 0.88, haul_probability: 0.28 },
  { id: 'fwd1', name: 'Erling Haaland', club: 'MCI', position: 'FWD', expected_points: 7.6, price: 15.0, expected_minutes: 90, p_start: 0.96, haul_probability: 0.39 },
  { id: 'fwd2', name: 'Alexander Isak', club: 'NEW', position: 'FWD', expected_points: 6.2, price: 9.0, expected_minutes: 85, p_start: 0.89, haul_probability: 0.26 },
  { id: 'fwd3', name: 'Ollie Watkins', club: 'AVL', position: 'FWD', expected_points: null, price: 9.0, expected_minutes: 80, p_start: 0.8 },
]
const MOCK_BENCH: PitchPlayer[] = [
  { id: 'gk2', name: 'Jordan Pickford', club: 'EVE', position: 'GK', expected_points: 3.5, price: 5.0 },
  { id: 'def5', name: 'Ezri Konsa', club: 'AVL', position: 'DEF', expected_points: 3.2, price: 4.5 },
  { id: 'mid4', name: 'Anthony Gordon', club: 'NEW', position: 'MID', expected_points: 3.8, price: 6.5 },
  { id: 'fwd4', name: 'Yoane Wissa', club: 'BRE', position: 'FWD', expected_points: 3.1, price: 6.0 },
]

const L = {
  EN: {
    detailTitle: 'Player Detail',
    price: 'Price', minutes: 'Exp. Minutes', pStart: 'P(Start)', haul: 'Haul Probability',
    xp: 'xP', bench: 'Bench', close: 'Close', na: '—',
  },
  KU: {
    detailTitle: 'وردەکاری یاریزان',
    price: 'نرخ', minutes: 'خولەکی چاوەڕوانکراو', pStart: 'ئەگەری یاریکردن', haul: 'ئەگەری خاڵی بەرز',
    xp: 'xP', bench: 'بەنچ', close: 'داخستن', na: '—',
  },
}

function PlayerChip({
  player, lang, onClick,
}: { player: PitchPlayer; lang: 'EN' | 'KU'; onClick: () => void }) {
  const t = L[lang]
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 w-16 sm:w-20 group"
    >
      <div className="relative flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-[#161B22] border-2 border-[#F0A500]/60 group-hover:border-[#F0A500] transition-colors shadow-lg">
        <span className="text-[10px] sm:text-xs font-bold text-[#E6EDF3]">{player.club}</span>
        {player.is_captain && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#F0A500] text-[9px] font-extrabold text-[#0D1117] border border-[#0D1117]">
            C
          </span>
        )}
        {player.is_vice_captain && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#8B949E] text-[9px] font-extrabold text-[#0D1117] border border-[#0D1117]">
            V
          </span>
        )}
      </div>
      <span className="text-[9px] sm:text-[10px] font-semibold text-white text-center leading-tight truncate w-full drop-shadow">
        {player.name.split(' ').slice(-1)[0]}
      </span>
      <span className="text-[9px] sm:text-[10px] font-bold text-[#F0A500] bg-[#0D1117]/70 px-1.5 rounded-full leading-tight">
        {player.expected_points == null ? t.na : player.expected_points.toFixed(1)}
      </span>
    </button>
  )
}

function DetailPanel({
  player, lang, onClose,
}: { player: PitchPlayer; lang: 'EN' | 'KU'; onClose: () => void }) {
  const t = L[lang]
  const rows: { label: string; value: string }[] = [
    { label: t.xp, value: player.expected_points == null ? t.na : player.expected_points.toFixed(1) },
    { label: t.price, value: player.price != null ? `£${player.price.toFixed(1)}m` : t.na },
    { label: t.minutes, value: player.expected_minutes != null ? String(player.expected_minutes) : t.na },
    { label: t.pStart, value: player.p_start != null ? `${Math.round(player.p_start * 100)}%` : t.na },
    { label: t.haul, value: player.haul_probability != null ? `${Math.round(player.haul_probability * 100)}%` : t.na },
  ]
  return (
    <div className="bg-[#161B22] border border-[#F0A500]/30 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-[#E6EDF3]">{player.name}</p>
          <p className="text-xs text-[#8B949E]">{player.club} · {player.position}</p>
        </div>
        <button onClick={onClose} className="text-xs text-[#8B949E] hover:text-[#F0A500] transition-colors">
          {t.close} ✕
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {rows.map(r => (
          <div key={r.label} className="bg-[#0D1117] border border-[#30363D] rounded-lg px-3 py-2">
            <p className="text-[10px] text-[#8B949E]">{r.label}</p>
            <p className="text-sm font-bold text-[#E6EDF3]">{r.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function PitchVisualization({
  formation = MOCK_FORMATION,
  startingXI = MOCK_STARTING_XI,
  bench = MOCK_BENCH,
  language = 'EN',
}: Partial<PitchVisualizationProps>) {
  const lang = (language ?? 'EN') as 'EN' | 'KU'
  const t = L[lang]
  const [selected, setSelected] = useState<PitchPlayer | null>(null)

  const byPos = (pos: PitchPlayer['position']) => startingXI.filter(p => p.position === pos)
  const positionOrder: PitchPlayer['position'][] = ['FWD', 'MID', 'DEF', 'GK']
  const rows = positionOrder
    .map(pos => ({ pos, players: byPos(pos) }))
    .filter(r => r.players.length > 0)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-[#8B949E] uppercase tracking-wider">{formation}</span>
      </div>

      {/* ── Pitch ── */}
      <div className="relative w-full aspect-[3/4] sm:aspect-[4/3] rounded-2xl overflow-hidden border border-[#30363D]">
        <svg
          viewBox="0 0 300 400"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <rect width="300" height="400" fill="#1a5c2e" />
          {Array.from({ length: 8 }).map((_, i) => (
            <rect key={i} x="0" y={i * 50} width="300" height="50" fill={i % 2 === 0 ? '#1e6633' : '#1a5c2e'} />
          ))}
          <rect x="4" y="4" width="292" height="392" fill="none" stroke="#ffffff55" strokeWidth="2" />
          <line x1="4" y1="200" x2="296" y2="200" stroke="#ffffff55" strokeWidth="2" />
          <circle cx="150" cy="200" r="35" fill="none" stroke="#ffffff55" strokeWidth="2" />
          <rect x="70" y="4" width="160" height="55" fill="none" stroke="#ffffff55" strokeWidth="2" />
          <rect x="70" y="341" width="160" height="55" fill="none" stroke="#ffffff55" strokeWidth="2" />
        </svg>

        <div className="absolute inset-0 flex flex-col justify-around py-4 px-2">
          {rows.map(row => (
            <div key={row.pos} className="flex items-start justify-evenly">
              {row.players.map(p => (
                <PlayerChip key={p.id} player={p} lang={lang} onClick={() => setSelected(p)} />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Bench ── */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-[#8B949E] uppercase tracking-wider">{t.bench}</p>
        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-3 flex items-start justify-evenly">
          {bench.map((p, i) => (
            <div key={p.id} className="flex flex-col items-center gap-1 w-16 sm:w-20">
              <span className="text-[9px] text-[#8B949E] font-bold">{i + 1}</span>
              <PlayerChip player={p} lang={lang} onClick={() => setSelected(p)} />
            </div>
          ))}
        </div>
      </div>

      {selected && <DetailPanel player={selected} lang={lang} onClose={() => setSelected(null)} />}
    </div>
  )
}

export { MOCK_FORMATION, MOCK_STARTING_XI, MOCK_BENCH }
