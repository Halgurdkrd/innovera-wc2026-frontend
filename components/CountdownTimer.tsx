'use client'

import { useEffect, useState } from 'react'

// ── Shared constants exported for use in other components ─────────────────────
export const KICKOFF_UTC = new Date('2026-06-11T18:00:00Z') // first match kick-off
export const LOCK_UTC    = new Date('2026-06-11T00:00:00Z') // pick lock midnight
export const isTournamentStarted = () => Date.now() >= KICKOFF_UTC.getTime()
export const isPickLocked        = () => Date.now() >= LOCK_UTC.getTime()

// ── Component ─────────────────────────────────────────────────────────────────

interface Props { language: 'EN' | 'KU' }

const L = {
  EN: {
    heading: 'FIFA WORLD CUP 2026 BEGINS IN',
    days: 'DAYS', hours: 'HOURS', mins: 'MINS', secs: 'SECS',
    begun: '🏆 THE TOURNAMENT HAS BEGUN!',
    begunSub: 'Make your match predictions now',
    chips: ['🌍 48 Teams', '🏟️ 3 Countries', '⚽ 104 Matches'],
  },
  KU: {
    heading: 'جامی جیهانی فیفا ٢٠٢٦ دەستپێدەکات لە',
    days: 'ڕۆژ', hours: 'کاتژمێر', mins: 'خولەک', secs: 'چرکە',
    begun: '🏆 تورنامێنتەکە دەستیپێکرد!',
    begunSub: 'ئێستا پێشبینییەکانت بکە',
    chips: ['🌍 ٤٨ تیم', '🏟️ ٣ وڵات', '⚽ ١٠٤ یاری'],
  },
}

const pad = (n: number) => String(n).padStart(2, '0')

export default function CountdownTimer({ language }: Props) {
  const t = L[language]
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 })
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const update = () => {
      const diff = KICKOFF_UTC.getTime() - Date.now()
      if (diff <= 0) { setStarted(true); return }
      setTimeLeft({
        d: Math.floor(diff / 864e5),
        h: Math.floor((diff % 864e5) / 36e5),
        m: Math.floor((diff % 36e5) / 6e4),
        s: Math.floor((diff % 6e4) / 1e3),
      })
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])

  if (started) {
    return (
      <div className="bg-[#161B22] border-t-4 border-t-[#F0A500] border border-[#30363D] rounded-2xl p-8 text-center space-y-2">
        <p className="text-2xl font-extrabold text-[#F0A500]">{t.begun}</p>
        <p className="text-sm text-[#8B949E]">{t.begunSub}</p>
      </div>
    )
  }

  const boxes = [
    { value: timeLeft.d, label: t.days },
    { value: timeLeft.h, label: t.hours },
    { value: timeLeft.m, label: t.mins },
    { value: timeLeft.s, label: t.secs },
  ]

  return (
    <div className="bg-[#161B22] border-t-4 border-t-[#F0A500] border border-[#30363D] rounded-2xl p-5 sm:p-7 space-y-5">
      <p className="text-center text-[10px] font-bold text-[#F0A500] tracking-[0.15em] uppercase">
        {t.heading}
      </p>

      {/* Countdown boxes */}
      <div className="flex items-center justify-center gap-1.5 sm:gap-3">
        {boxes.map(({ value, label }, i) => (
          <div key={label} className="flex items-center gap-1.5 sm:gap-3">
            <div className="flex flex-col items-center">
              <div className="bg-[#0D1117] border border-[#30363D] rounded-xl px-2.5 py-1.5 sm:px-5 sm:py-3 min-w-[52px] sm:min-w-[72px] text-center">
                <span className="text-3xl sm:text-5xl font-extrabold text-[#E6EDF3] tabular-nums leading-none block">
                  {pad(value)}
                </span>
              </div>
              <span className="text-[9px] sm:text-[10px] font-bold text-[#8B949E] mt-1.5 tracking-wider">
                {label}
              </span>
            </div>
            {i < 3 && (
              <span className="text-2xl sm:text-3xl font-bold text-[#F0A500] pb-5 leading-none">:</span>
            )}
          </div>
        ))}
      </div>

      {/* Info chips */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {t.chips.map((chip) => (
          <span key={chip} className="text-xs text-[#8B949E] bg-[#0D1117] border border-[#30363D] px-3 py-1.5 rounded-full">
            {chip}
          </span>
        ))}
      </div>
    </div>
  )
}
