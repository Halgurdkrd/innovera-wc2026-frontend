'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { useLanguage } from '@/hooks/useLanguage'
import { API_BASE } from '@/lib/api'
import { Sk } from '@/components/SkeletonCard'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Player {
  number?: number
  name: string
  club?: string
  position: 'GK' | 'DF' | 'MF' | 'FW'
  is_captain?: boolean
  flag?: string
  is_starter?: boolean
}

interface SquadResponse {
  team_name: string
  team_flag?: string
  players: Player[]
}

// ── Static data ───────────────────────────────────────────────────────────────

const FLAG_MAP: Record<string, string> = {
  Mexico: '🇲🇽', 'South Korea': '🇰🇷', 'South Africa': '🇿🇦', 'Czech Republic': '🇨🇿',
  Canada: '🇨🇦', Switzerland: '🇨🇭', Qatar: '🇶🇦', 'Bosnia-Herzegovina': '🇧🇦',
  Brazil: '🇧🇷', Morocco: '🇲🇦', Scotland: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', Haiti: '🇭🇹',
  USA: '🇺🇸', Paraguay: '🇵🇾', Australia: '🇦🇺', Turkey: '🇹🇷',
  Germany: '🇩🇪', Curaçao: '🇨🇼', "Côte d'Ivoire": '🇨🇮', Ecuador: '🇪🇨',
  Netherlands: '🇳🇱', Japan: '🇯🇵', Tunisia: '🇹🇳', Sweden: '🇸🇪',
  Belgium: '🇧🇪', Egypt: '🇪🇬', Iran: '🇮🇷', 'New Zealand': '🇳🇿',
  Spain: '🇪🇸', 'Cabo Verde': '🇨🇻', 'Saudi Arabia': '🇸🇦', Uruguay: '🇺🇾',
  France: '🇫🇷', Senegal: '🇸🇳', Norway: '🇳🇴', Iraq: '🇮🇶',
  Argentina: '🇦🇷', Algeria: '🇩🇿', Austria: '🇦🇹', Jordan: '🇯🇴',
  Portugal: '🇵🇹', Colombia: '🇨🇴', Uzbekistan: '🇺🇿', 'Congo DR': '🇨🇩',
  England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', Croatia: '🇭🇷', Ghana: '🇬🇭', Panama: '🇵🇦',
}

const POS_CONFIG = {
  GK: { label: 'Goalkeepers', labelKU: 'دەروازەوانەکان', color: '#58A6FF', bg: '#58A6FF15' },
  DF: { label: 'Defenders',   labelKU: 'بەرگرەکان',      color: '#2EA043', bg: '#2EA04315' },
  MF: { label: 'Midfielders', labelKU: 'ناوەندیەکان',    color: '#F0A500', bg: '#F0A50015' },
  FW: { label: 'Forwards',    labelKU: 'ئێڕەشکارەکان',   color: '#F85149', bg: '#F8514915' },
} as const

const POSITIONS: (keyof typeof POS_CONFIG)[] = ['GK', 'DF', 'MF', 'FW']

// ── Labels ────────────────────────────────────────────────────────────────────

const L = {
  EN: {
    back: '← Back',
    squad: 'Squad',
    noData: 'Squad data not yet available.',
    noDataSub: 'Player data will be published closer to the tournament.',
    players: 'players',
    captain: 'Captain',
    viewFixtures: 'View Fixtures →',
  },
  KU: {
    back: '← گەڕانەوە',
    squad: 'تیم',
    noData: 'داتای تیم هێشتا بەردەست نیە.',
    noDataSub: 'داتای لاعبان نزیکتر لە تورنامێنتەکە بڵاودەبێتەوە.',
    players: 'لاعب',
    captain: 'کاپتن',
    viewFixtures: 'بینینی یارییەکان →',
  },
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PlayerRow({ player, isKU }: { player: Player; isKU: boolean }) {
  const cfg = POS_CONFIG[player.position]
  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${player.is_starter ? 'border border-[#F0A500]/30 bg-[#F0A500]/5' : ''}`}>
      {/* Jersey number */}
      <span className="text-xs font-bold tabular-nums w-5 text-right flex-shrink-0 text-[#8B949E]">
        {player.number ?? '—'}
      </span>

      {/* Position badge */}
      <span
        className="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 leading-none"
        style={{ color: cfg.color, backgroundColor: cfg.bg }}
      >
        {player.position}
      </span>

      {/* Name + captain */}
      <div className="flex-1 min-w-0">
        <span className={`text-sm font-semibold truncate ${player.is_starter ? 'text-[#F0A500]' : 'text-[#E6EDF3]'}`}>
          {player.name}
        </span>
        {player.is_captain && (
          <span className="ml-1.5 text-[10px] font-bold text-[#F0A500] bg-[#F0A500]/10 px-1 py-0.5 rounded">©</span>
        )}
      </div>

      {/* Club */}
      {player.club && (
        <span className="text-[10px] text-[#8B949E] truncate max-w-[90px] flex-shrink-0">{player.club}</span>
      )}

      {/* Starter indicator */}
      {player.is_starter && (
        <span className="text-[9px] font-bold text-[#F0A500] flex-shrink-0">XI</span>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SquadPage() {
  const { language, changeLanguage } = useLanguage()
  const router = useRouter()
  const routeParams = useParams()
  const teamName = decodeURIComponent(routeParams.team_name as string)
  const t = L[language]
  const isKU = language === 'KU'

  const [squad, setSquad] = useState<SquadResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const flag = FLAG_MAP[teamName] ?? '🏳️'

  useEffect(() => {
    if (!teamName) return
    const ctrl = new AbortController()
    ;(async () => {
      try {
        const res = await fetch(`${API_BASE}/squads/${encodeURIComponent(teamName)}`, { signal: ctrl.signal })
        if (res.ok) {
          setSquad(await res.json())
        } else {
          setNotFound(true)
        }
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    })()
    return () => ctrl.abort()
  }, [teamName])

  const grouped = POSITIONS.reduce<Record<string, Player[]>>((acc, pos) => {
    acc[pos] = (squad?.players ?? []).filter(p => p.position === pos)
    return acc
  }, { GK: [], DF: [], MF: [], FW: [] })

  return (
    <div className="min-h-screen bg-[#0D1117]">
      <Navbar language={language} onLanguageChange={changeLanguage} />

      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">

        {/* Back */}
        <button onClick={() => router.back()} className="text-sm text-[#8B949E] hover:text-[#F0A500] transition-colors">
          {t.back}
        </button>

        {/* Header */}
        <div className="flex items-center gap-4">
          <span className="text-5xl leading-none">{flag}</span>
          <div>
            <h1 className="text-2xl font-extrabold text-[#E6EDF3]">{teamName}</h1>
            <p className="text-sm text-[#8B949E]">
              {loading ? '…' : notFound ? t.noData : `${squad?.players?.length ?? 0} ${t.players}`}
            </p>
          </div>
          <Link
            href={`/team/${encodeURIComponent(teamName)}`}
            className="ml-auto text-xs text-[#F0A500] hover:underline"
          >
            {t.viewFixtures}
          </Link>
        </div>

        {/* Loading */}
        {loading && (
          <div className="space-y-4">
            {POSITIONS.map(pos => (
              <div key={pos} className="space-y-2">
                <Sk className="h-5 w-32" />
                {Array.from({ length: pos === 'GK' ? 2 : pos === 'DF' ? 5 : pos === 'MF' ? 5 : 4 }).map((_, i) => (
                  <Sk key={i} className="h-10 w-full rounded-lg" />
                ))}
              </div>
            ))}
          </div>
        )}

        {/* No data */}
        {!loading && notFound && (
          <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-10 text-center space-y-2">
            <span className="text-4xl">👥</span>
            <p className="text-[#8B949E]">{t.noData}</p>
            <p className="text-xs text-[#8B949E]/60">{t.noDataSub}</p>
          </div>
        )}

        {/* Squad groups */}
        {!loading && !notFound && squad && (
          <div className="space-y-5">
            {POSITIONS.map(pos => {
              const players = grouped[pos]
              if (players.length === 0) return null
              const cfg = POS_CONFIG[pos]
              return (
                <section key={pos} className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
                  {/* Group header */}
                  <div className="px-4 py-2.5 border-b border-[#30363D] flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ color: cfg.color, backgroundColor: cfg.bg }}>
                      {pos}
                    </span>
                    <span className="text-sm font-semibold text-[#E6EDF3]">
                      {isKU ? cfg.labelKU : cfg.label}
                    </span>
                    <span className="text-xs text-[#8B949E] ml-auto">{players.length}</span>
                  </div>

                  {/* Players */}
                  <div className="px-2 py-1.5 space-y-0.5">
                    {players
                      .sort((a, b) => (a.number ?? 99) - (b.number ?? 99))
                      .map((p, i) => <PlayerRow key={i} player={p} isKU={isKU} />)
                    }
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
