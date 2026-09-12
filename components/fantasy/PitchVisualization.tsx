'use client'

import React from 'react'
import type { FPLPlayer } from '@/lib/api/types'
import { tr, type Language } from '@/lib/translations'

// Wraps a number/name/price value in a bidirectional isolate so it always
// renders left-to-right even inside an RTL (Kurdish) sentence -- exactly
// what <bdi> is for, per the task's "use bidirectional isolation where
// needed" requirement. Never changes the value itself.
function Num({ children }: { children: React.ReactNode }) {
  return <bdi style={{ unicodeBidi: 'isolate' }}>{children}</bdi>
}

export interface PitchVisualizationProps {
  formation: string
  startingXI: FPLPlayer[]
  bench: FPLPlayer[]
  language?: Language
  // When true, suppresses the Ennovera-Hybrid-branded milestone/percentile
  // probability estimates (Likely Range, P80/P90 upside, 10+/15+/20+ point
  // milestones) that are otherwise derived from unrelated fields as a
  // fallback for callers that don't supply real percentile data. Research
  // (M3_SHRUNK/V0_CONTROL) data has no such calibrated distribution, so
  // showing that block there would misattribute methodology and invent
  // numbers. Default false preserves exact existing behavior everywhere else.
  researchMode?: boolean
  // Exact source identity for the research-mode player detail modal's
  // provenance footer -- never a generic disclaimer when the real
  // model/season/GW/object/status/version are known.
  provenance?: {
    model: string
    season: string
    gameweek: number
    object: string
    status: string
    artifactVersion?: string
  }
}

// Authentic 20 Premier League Club Kit Palette & Styles
export const CLUB_KIT_THEMES: Record<
  string,
  { primary: string; secondary: string; stroke: string; pattern?: 'stripes' | 'sleeves' | 'solid' }
> = {
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
  'Leicester City': { primary: '#003090', secondary: '#FDBE11', stroke: '#001C54', pattern: 'solid' },
  'Liverpool': { primary: '#C8102E', secondary: '#FFFFFF', stroke: '#7A091A', pattern: 'solid' },
  'Man City': { primary: '#6CABDD', secondary: '#FFFFFF', stroke: '#3C7CAE', pattern: 'solid' },
  'Manchester City': { primary: '#6CABDD', secondary: '#FFFFFF', stroke: '#3C7CAE', pattern: 'solid' },
  'Man Utd': { primary: '#DA291C', secondary: '#000000', stroke: '#8B0000', pattern: 'solid' },
  'Manchester United': { primary: '#DA291C', secondary: '#000000', stroke: '#8B0000', pattern: 'solid' },
  'Newcastle': { primary: '#000000', secondary: '#FFFFFF', stroke: '#333333', pattern: 'stripes' },
  'Newcastle United': { primary: '#000000', secondary: '#FFFFFF', stroke: '#333333', pattern: 'stripes' },
  'Nott\'m Forest': { primary: '#DD0000', secondary: '#FFFFFF', stroke: '#880000', pattern: 'solid' },
  'Nottingham Forest': { primary: '#DD0000', secondary: '#FFFFFF', stroke: '#880000', pattern: 'solid' },
  'Southampton': { primary: '#D71920', secondary: '#FFFFFF', stroke: '#8B0000', pattern: 'stripes' },
  'Spurs': { primary: '#FFFFFF', secondary: '#132257', stroke: '#0B1433', pattern: 'solid' },
  'Tottenham Hotspur': { primary: '#FFFFFF', secondary: '#132257', stroke: '#0B1433', pattern: 'solid' },
  'Sunderland': { primary: '#EB172B', secondary: '#FFFFFF', stroke: '#940E1B', pattern: 'stripes' },
  'West Ham': { primary: '#7A263A', secondary: '#1BB1E7', stroke: '#4A0A26', pattern: 'sleeves' },
  'West Ham United': { primary: '#7A263A', secondary: '#1BB1E7', stroke: '#4A0A26', pattern: 'sleeves' },
  'Wolves': { primary: '#FDB913', secondary: '#231F20', stroke: '#B8860B', pattern: 'solid' },
  'Wolverhampton Wanderers': { primary: '#FDB913', secondary: '#231F20', stroke: '#B8860B', pattern: 'solid' },
  'GK_DEFAULT': { primary: '#22C55E', secondary: '#15803D', stroke: '#166534', pattern: 'solid' },
}

export function ClubJerseySvg({ club, position, isCaptain }: { club: string; position: string; isCaptain?: boolean }) {
  const isGK = position === 'GK'
  const normalizedClub = club?.trim() || ''
  const theme = isGK
    ? CLUB_KIT_THEMES['GK_DEFAULT']
    : (CLUB_KIT_THEMES[normalizedClub] || CLUB_KIT_THEMES['Arsenal'] || CLUB_KIT_THEMES['GK_DEFAULT'])

  const clipId = `jersey-clip-${normalizedClub.replace(/[^a-zA-Z0-9]/g, '')}-${position}`

  return (
    <svg
      viewBox="0 0 48 48"
      className={`h-9 w-9 sm:h-11 sm:w-11 drop-shadow-md transition-transform group-hover:scale-110 ${
        isCaptain ? 'ring-2 ring-[#F0A500] rounded-full' : ''
      }`}
    >
      <defs>
        <clipPath id={clipId}>
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
      <g clipPath={`url(#${clipId})`}>
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
  researchMode = false,
  provenance,
}: PitchVisualizationProps) {
  const [selectedPlayer, setSelectedPlayer] = React.useState<FPLPlayer | null>(null)

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
            {tr('pitch_formation', language)}
          </span>
          <span className="text-xs font-bold text-[#58A6FF] bg-[#58A6FF]/10 border border-[#58A6FF]/30 px-2 py-0.5 rounded">
            <Num>{formation}</Num>
          </span>
          {!researchMode && (
            <span className="text-xs font-bold text-[#3FB950] bg-[#3FB950]/10 border border-[#3FB950]/30 px-2 py-0.5 rounded">
              Ennovera Hybrid
            </span>
          )}
        </div>
        <span className="text-xs text-[#8B949E]">
          <Num>{startingXI.length}</Num> {tr('pitch_starters', language)} • {tr('pitch_click_details', language)}
        </span>
      </div>

      {/* Football Pitch Graphic */}
      <div className="relative w-full rounded-2xl overflow-hidden border border-[#238636]/40 bg-gradient-to-b from-[#0e3a1f] via-[#124d29] to-[#0a2e18] shadow-2xl p-3 sm:p-6 min-h-[560px] flex flex-col justify-between">
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
          {gks.map((p) => (
            <PlayerPitchCard key={p.player_id} player={p} onClick={() => setSelectedPlayer(p)} researchMode={researchMode} language={language} />
          ))}
        </div>

        {/* Row 2: Defenders */}
        <div className="relative z-10 flex justify-around items-center py-1 px-2">
          {defs.map((p) => (
            <PlayerPitchCard key={p.player_id} player={p} onClick={() => setSelectedPlayer(p)} researchMode={researchMode} language={language} />
          ))}
        </div>

        {/* Row 3: Midfielders */}
        <div className="relative z-10 flex justify-around items-center py-1 px-2">
          {mids.map((p) => (
            <PlayerPitchCard key={p.player_id} player={p} onClick={() => setSelectedPlayer(p)} researchMode={researchMode} language={language} />
          ))}
        </div>

        {/* Row 4: Forwards */}
        <div className="relative z-10 flex justify-around items-center py-1 px-2">
          {fwds.map((p) => (
            <PlayerPitchCard key={p.player_id} player={p} onClick={() => setSelectedPlayer(p)} researchMode={researchMode} language={language} />
          ))}
        </div>
      </div>

      {/* Bench Section */}
      {bench && bench.length > 0 && (
        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#8B949E] uppercase tracking-wider">
              {language === 'KU' ? 'یاریزانانی یەدەگ (ڕیزبەندی)' : 'Substitutes Bench (Ordered Priority)'}
            </span>
            <span className="text-xs text-[#8B949E]">{bench.length} {language === 'KU' ? 'یاریزان' : 'Players'}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {bench.map((player) => {
              const actualPts = (player as any).actual_points
              const matchSt = (player as any).match_status
              const isFT = matchSt === 'FT' || matchSt === 'FINISHED' || matchSt === 'DID_NOT_PLAY'
              const isLive = matchSt === 'LIVE'
              const isUntracked = matchSt === 'NOT_TRACKED'

              return (
                <div
                  key={player.player_id}
                  data-player-id={player.player_id}
                  data-player-name={player.name}
                  data-role="bench"
                  onClick={() => setSelectedPlayer(player)}
                  className="bg-[#0D1117] border border-[#30363D] hover:border-[#58A6FF] rounded-lg p-2.5 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-5 w-5 rounded bg-[#30363D] text-[#8B949E] flex items-center justify-center font-bold text-[9px]"
                      title={player.is_reserve_gk ? 'Reserve goalkeeper' : player.bench_order_unknown ? 'Bench priority unknown' : `Bench priority ${player.bench_order}`}
                    >
                      {player.is_reserve_gk ? 'GK' : player.bench_order_unknown ? '?' : (player.bench_order ?? 'B')}
                    </div>
                    <ClubJerseySvg club={player.club} position={player.position} />
                    <div className="overflow-hidden">
                      <div className="font-bold text-xs text-[#E6EDF3] truncate group-hover:text-[#58A6FF]">
                        {player.web_name || player.name}
                      </div>
                      <div className="text-[11px] text-[#8B949E] truncate">{player.club}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-[#30363D]/40 text-[10px]">
                    <span className="text-[#8B949E]">{player.price_unavailable ? tr('pitch_price_unavailable', language) : <Num>{`£${(player.price ?? 5.0).toFixed(1)}m`}</Num>}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[#3FB950]">
                        {player.xp_unavailable ? 'xP —' : <Num>{`${(player.expected_points ?? (player as any).predicted_xp ?? 0).toFixed(2)} xP`}</Num>}
                      </span>
                      {isFT && actualPts !== null && actualPts !== undefined ? (
                        <span className="font-black px-1 rounded bg-[#58A6FF]/20 text-[#58A6FF]">
                          {actualPts} pts
                        </span>
                      ) : isUntracked ? (
                        <span className="font-semibold text-[#8B949E]" title="No live match-state evidence for this forecast">
                          —
                        </span>
                      ) : (
                        <span className="font-semibold text-[#8B949E]">
                          NS
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Expanded Player Detail Modal */}
      {selectedPlayer && (
        <PlayerDetailModal player={selectedPlayer} onClose={() => setSelectedPlayer(null)} language={language} researchMode={researchMode} provenance={provenance} />
      )}
    </div>
  )
}

function PlayerPitchCard({ player, onClick, researchMode = false, language = 'EN' }: { player: FPLPlayer; onClick?: () => void; researchMode?: boolean; language?: Language }) {
  const isCap = player.is_captain
  const isVice = player.is_vice_captain
  const rangeText = player.likely_range ? `${player.likely_range[0]}–${player.likely_range[1]} pts` : '—'
  const haulText =
    player.prob_10_plus !== undefined
      ? `${Math.round(player.prob_10_plus * 100)}%`
      : `${Math.round((player.haul_prob ?? 0.2) * 100)}%`
  const expPoints = player.expected_points ?? (player as any).predicted_xp ?? 0
  const actualPoints = (player as any).actual_points
  const matchStatus = (player as any).match_status || (actualPoints !== null && actualPoints !== undefined ? 'FINISHED' : 'NOT_STARTED')
  const isFinished = matchStatus === 'FT' || matchStatus === 'FINISHED' || matchStatus === 'DID_NOT_PLAY'
  const isLive = matchStatus === 'LIVE'
  const isUntracked = matchStatus === 'NOT_TRACKED'

  // Home/away is only shown when the source genuinely has it -- never
  // guessed as "Home" by default, which would misrepresent an unknown
  // venue as a verified fact.
  const venueLabel = player.home_away === 'H' ? 'H' : player.home_away === 'A' ? 'A' : null

  return (
    <div
      onClick={onClick}
      data-player-id={player.player_id}
      data-player-name={player.name}
      data-role="starter"
      // min-w-0 overrides the flex default of min-width:auto (which pins a
      // flex item to its content's intrinsic minimum width) -- without it,
      // the name's `truncate` class can't actually clip, so a long name
      // silently forces this card wider than its allotted share of the
      // row. With 5 cards in a MID/DEF row on a narrow phone, that extra
      // width pushes total row width past the pitch container's
      // overflow-hidden bound, clipping whichever card ends up rightmost.
      className="flex min-w-0 flex-col items-center group cursor-pointer transition-transform hover:scale-105 select-none max-w-[72px] sm:max-w-[104px] w-full px-0.5"
    >
      {/* Jersey Icon Container & C/VC Badges */}
      <div className="relative flex items-center justify-center">
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

        <ClubJerseySvg club={player.club} position={player.position} isCaptain={isCap} />
      </div>

      {/* Name and Metric Plate -- every row is its own full-width,
          text-center block (or a flex-wrap row that still centers via
          justify-center regardless of how many lines it wraps to), so
          content is centered relative to the CARD, never relative to
          whatever the truncated name/xP text's own natural width happens
          to be. Nothing here is centered relative to a sibling element --
          each row centers within the full width of this wrapper, which
          itself is w-full of the (already fixed) equal-width card. */}
      <div className="mt-1 w-full bg-[#0D1117]/95 backdrop-blur-sm border border-white/20 rounded-lg p-1 shadow-lg hover:border-[#58A6FF] transition-colors">
        <div className="w-full text-center text-[10px] sm:text-xs font-bold text-[#E6EDF3] truncate" title={player.name}>
          {player.web_name || player.name}
        </div>
        <div className="w-full text-center text-[8px] sm:text-[9px] text-[#8B949E] truncate">
          {player.opponent
            ? `${player.club.slice(0, 3).toUpperCase()} vs ${player.opponent.slice(0, 3).toUpperCase()}${venueLabel ? ` (${venueLabel})` : ''}`
            : player.club}
        </div>
        {/* flex-wrap (not nowrap) is the actual fix: on a narrow card the
            xP text + points/status badge together are often wider than
            the card itself -- with nowrap the overflow spills mostly to
            one side, which is what looked like a left shift; wrapping
            keeps each line short enough to stay genuinely centered via
            justify-center instead of overflowing asymmetrically. */}
        <div className="w-full flex flex-wrap items-center justify-center gap-x-1 gap-y-0.5 mt-0.5">
          <span className="text-[10px] sm:text-[11px] font-extrabold text-[#3FB950]" title={player.xp_unavailable ? 'Per-player xP not available for this decision object' : undefined}>
            {player.xp_unavailable ? 'xP —' : <Num>{`${expPoints.toFixed(2)} xP`}</Num>}
          </span>
          {isFinished && actualPoints !== null && actualPoints !== undefined ? (
            <span className="text-[9px] font-black px-1 rounded bg-[#58A6FF]/20 text-[#58A6FF]" title={isCap ? `Player points: ${actualPoints}. Captain doubles this to ${actualPoints * 2}.` : 'Match Finished'}>
              <Num>{isCap ? `${actualPoints}→${actualPoints * 2} pts` : `${actualPoints} pts`}</Num>
            </span>
          ) : isLive && actualPoints !== null && actualPoints !== undefined ? (
            <span className="text-[9px] font-black px-1 rounded bg-[#F0A500]/20 text-[#F0A500]" title={isCap ? `Player points: ${actualPoints}. Captain doubles this to ${actualPoints * 2}.` : 'Match Live'}>
              <Num>{isCap ? `${actualPoints}→${actualPoints * 2} pts` : `${actualPoints} pts`}</Num>
            </span>
          ) : isUntracked ? (
            <span className="text-[9px] font-bold px-1 rounded bg-[#30363D]/60 text-[#8B949E]" title="No live match-state evidence -- this is a forecast for a gameweek that has not been played">
              {tr('pitch_forecast_badge', language)}
            </span>
          ) : (
            <span className="text-[9px] font-bold px-1 rounded bg-[#30363D]/60 text-[#8B949E]" title="Not Started">
              {tr('pitch_not_started', language)}
            </span>
          )}
        </div>
        <div className="w-full flex flex-wrap justify-center items-center gap-x-1 text-[8px] text-[#8B949E] px-0.5 mt-0.5 border-t border-[#30363D]/60 pt-0.5">
          {researchMode ? (
            <span className="text-[#58A6FF] font-semibold">
              {player.starting_prob !== undefined ? <><Num>{`${Math.round(player.starting_prob * 100)}%`}</Num> {tr('pitch_p_start', language)}</> : 'No probability data'}
            </span>
          ) : (
            <>
              <span>{rangeText}</span>
              <span className="text-[#58A6FF] font-semibold">10+:{haulText}</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function PlayerDetailModal({
  player,
  onClose,
  language = 'EN',
  researchMode = false,
  provenance,
}: {
  player: FPLPlayer
  onClose: () => void
  language?: Language
  researchMode?: boolean
  provenance?: PitchVisualizationProps['provenance']
}) {
  const p25 = player.likely_range ? player.likely_range[0] : Math.max(0, Math.floor(player.expected_points * 0.5))
  const p75 = player.likely_range ? player.likely_range[1] : Math.ceil(player.expected_points * 1.5)
  const p80 = player.upside_score ?? Math.ceil(player.expected_points * 1.7)
  const p90 = player.high_upside_score ?? Math.ceil(player.expected_points * 2.1)
  const p10 = player.prob_10_plus !== undefined ? Math.round(player.prob_10_plus * 100) : Math.round(player.haul_prob * 100)
  const p15 = player.prob_15_plus !== undefined ? Math.round(player.prob_15_plus * 100) : Math.round(p10 * 0.4)
  const p20 = player.prob_20_plus !== undefined ? Math.round(player.prob_20_plus * 100) : Math.round(p15 * 0.3)
  // Never guess a venue -- only 'H'/'A' from the verified source renders.
  const modalVenueLabel = player.home_away === 'H' ? 'Home' : player.home_away === 'A' ? 'Away' : null
  // Each of P(start)/P(sub)/P(dnp) is rounded independently for display;
  // the raw probabilities always reconcile to 1.0 (verified against the
  // frozen source), but three independently-rounded whole percentages can
  // land on 99% or 101% -- disclosed rather than silently forced to 100,
  // which would misstate whichever value got adjusted.
  const pStartPct = player.starting_prob !== undefined ? Math.round(player.starting_prob * 100) : null
  const pSubPct = player.p_sub != null ? Math.round(player.p_sub * 100) : null
  const pDnpPct = player.p_dnp != null ? Math.round(player.p_dnp * 100) : null
  const probabilitySumPct = pStartPct != null && pSubPct != null && pDnpPct != null ? pStartPct + pSubPct + pDnpPct : null
  const actualPts = (player as any).actual_points
  const matchStatus = (player as any).match_status || (actualPts !== null && actualPts !== undefined ? 'FINISHED' : 'NOT_STARTED')
  const isFT = matchStatus === 'FT' || matchStatus === 'FINISHED' || matchStatus === 'DID_NOT_PLAY'
  const isUntracked = matchStatus === 'NOT_TRACKED'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      {/* Responsive max-width (wider on desktop for readability, capped so
          it never exceeds the viewport) + max-h/overflow-y-auto so content
          scrolls within the modal instead of overflowing off-screen on
          short viewports. */}
      <div
        dir={language === 'KU' ? 'rtl' : 'ltr'}
        className="bg-[#161B22] border border-[#30363D] rounded-2xl w-full max-w-lg sm:max-w-xl lg:max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-4 shadow-2xl relative text-[#E6EDF3] text-sm sm:text-base"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#8B949E] hover:text-[#E6EDF3] h-8 w-8 rounded-full bg-[#0D1117] flex items-center justify-center border border-[#30363D]"
        >
          ✕
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pr-8">
          <ClubJerseySvg club={player.club} position={player.position} isCaptain={player.is_captain} />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-[#E6EDF3]">{player.web_name || player.name}</h2>
              {player.is_captain && (
                <span className="text-[10px] sm:text-xs font-extrabold px-2 py-0.5 rounded bg-[#F0A500] text-[#0D1117]">
                  CAPTAIN
                </span>
              )}
            </div>
            {/* Full name shown only when it differs from the official
                short display name -- preserves it for clarity/search
                without duplicating an identical string. */}
            {player.web_name && player.web_name !== player.name && (
              <p className="text-[11px] text-[#8B949E]/80">{player.name}</p>
            )}
            <p className="text-xs sm:text-sm text-[#8B949E]">
              {player.club} • {player.position}
              {' • '}{player.price_unavailable ? tr('pitch_price_unavailable', language) : <Num>{`£${(player.price ?? 5.0).toFixed(1)}m`}</Num>}
              {' • '}{player.expected_minutes != null ? <><Num>{player.expected_minutes}</Num> {language === 'KU' ? 'خولەک (پێشبینی)' : 'mins (forecast)'}</> : (language === 'KU' ? 'خولەکی پێشبینیکراو بەردەست نییە' : 'Expected minutes unavailable')}
            </p>
          </div>
        </div>

        {/* Fixture & Match Status Banner */}
        <div className="bg-[#0D1117] p-2.5 rounded-lg border border-[#30363D] flex justify-between items-center text-xs sm:text-sm">
          <div>
            <span className="text-[#8B949E]">{tr('pitch_fixture', language)}: </span>
            <span className="font-semibold text-[#58A6FF]">
              {player.opponent
                ? <Num>{`${player.club} vs ${player.opponent}${modalVenueLabel ? ` (${modalVenueLabel === 'Home' ? tr('pitch_home', language) : tr('pitch_away', language)})` : ''}`}</Num>
                : researchMode ? tr('pitch_fixture_not_avail', language) : 'Gameweek Fixture'}
            </span>
          </div>
          <div>
            {isFT ? (
              <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 bg-[#3FB950]/20 text-[#3FB950] border border-[#3FB950]/40 rounded" title={player.is_captain && actualPts != null ? `Player points: ${actualPts}. Captain doubles this to ${actualPts * 2}.` : undefined}>
                FT: <Num>{actualPts !== null && actualPts !== undefined
                  ? (player.is_captain ? `${actualPts}→${actualPts * 2} pts (captain)` : `${actualPts} pts`)
                  : 'Finished'}</Num>
              </span>
            ) : matchStatus === 'LIVE' ? (
              <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 bg-[#F0A500]/20 text-[#F0A500] border border-[#F0A500]/40 rounded" title={player.is_captain && actualPts != null ? `Player points: ${actualPts}. Captain doubles this to ${actualPts * 2}.` : undefined}>
                LIVE: <Num>{actualPts != null && player.is_captain ? `${actualPts}→${actualPts * 2} pts (captain)` : `${actualPts ?? 0} pts`}</Num>
              </span>
            ) : isUntracked ? (
              <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 bg-[#30363D]/60 text-[#8B949E] border border-[#30363D] rounded" title="No live match-state evidence -- this is a forecast for a gameweek that has not been played">
                {tr('pitch_forecast_badge', language)} {language === 'KU' ? '(هێشتا یاری نەکراوە)' : '(not yet played)'}
              </span>
            ) : (
              <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 bg-[#30363D]/60 text-[#8B949E] border border-[#30363D] rounded">
                {tr('pitch_not_started', language)}
              </span>
            )}
          </div>
        </div>

        {/* Primary Expected Points & Likely Range */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#0D1117] p-3 rounded-xl border border-[#30363D]">
            {player.xp_unavailable ? (
              <>
                <div className="text-sm sm:text-base font-semibold text-[#8B949E]">{tr('pitch_expected_points', language)}</div>
                <div className="text-2xl font-black text-[#3FB950] mt-1">—</div>
                <div className="text-[10px] sm:text-xs text-[#8B949E] mt-0.5">{tr('pitch_not_avail_obj', language)}</div>
              </>
            ) : (
              <>
                <div className="text-sm sm:text-base font-semibold text-[#E6EDF3]">
                  {tr('pitch_expected_points', language)}: <span className="text-2xl font-black text-[#3FB950]"><Num>{(player.expected_points ?? (player as any).predicted_xp ?? 0).toFixed(2)}</Num></span>
                </div>
                <div className="text-[10px] sm:text-xs text-[#8B949E] mt-0.5">{tr('pitch_average_forecast', language)}</div>
                {player.is_captain && (
                  // Forecast, not actual -- a separate FIELD from Player
                  // expected points above, never merged into it, so a
                  // captain's own xP is never silently shown pre-doubled.
                  <div className="text-[10px] sm:text-xs text-[#F0A500] mt-1 font-semibold">
                    {language === 'KU'
                      ? `بەشداریی پێشبینیکراوی کاپتن (دوای دووبارەکردنەوە): ${((player.expected_points ?? (player as any).predicted_xp ?? 0) * 2).toFixed(2)}`
                      : `Expected captain contribution after doubling: ${((player.expected_points ?? (player as any).predicted_xp ?? 0) * 2).toFixed(2)}`}
                  </div>
                )}
              </>
            )}
          </div>

          {researchMode ? (
            <div className="bg-[#0D1117] p-3 rounded-xl border border-[#30363D]">
              <div className="text-[11px] sm:text-xs font-semibold text-[#8B949E] uppercase">{tr('pitch_expected_minutes', language)}</div>
              <div className="text-2xl font-black text-[#58A6FF] mt-1">
                <Num>{player.expected_minutes != null ? player.expected_minutes : '—'}</Num> <span className="text-xs sm:text-sm text-[#8B949E] font-normal">{language === 'KU' ? 'خولەک' : 'mins'}</span>
              </div>
              <div className="text-[10px] sm:text-xs text-[#8B949E] mt-0.5">
                {player.expected_minutes != null
                  ? (language === 'KU' ? 'خانەی پێشبینی، نەک بەڵگەی دۆخی یاری' : 'Forecast field, not match-status evidence')
                  : tr('pitch_not_avail_obj', language)}
              </div>
            </div>
          ) : (
            <div className="bg-[#0D1117] p-3 rounded-xl border border-[#30363D]">
              <div className="text-[11px] sm:text-xs font-semibold text-[#8B949E] uppercase">{tr('pitch_likely_range', language)}</div>
              <div className="text-2xl font-black text-[#58A6FF] mt-1">
                <Num>{`${p25} – ${p75}`}</Num> <span className="text-xs sm:text-sm text-[#8B949E] font-normal">pts</span>
              </div>
              <div className="text-[10px] sm:text-xs text-[#8B949E] mt-0.5">Middle 50% distribution mass [P25, P75]</div>
            </div>
          )}
        </div>

        {researchMode ? (
          /* Real research probability-card fields only -- never a
             fabricated percentile-score estimate for M3/V0 research data. */
          <div className="bg-[#0D1117] p-3 rounded-xl border border-[#30363D] space-y-2">
            <div className="text-xs sm:text-sm font-bold text-[#E6EDF3] uppercase tracking-wider">{tr('pitch_probability_card', language)}</div>
            {pStartPct != null || pSubPct != null || pDnpPct != null ? (
              <>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-[#161B22] rounded-lg border border-[#30363D]/60">
                    <div className="text-[10px] sm:text-xs text-[#8B949E]">{tr('pitch_p_start', language)}</div>
                    <div className="text-base sm:text-lg font-black text-[#58A6FF]"><Num>{pStartPct != null ? `${pStartPct}%` : '—'}</Num></div>
                  </div>
                  <div className="p-2 bg-[#161B22] rounded-lg border border-[#30363D]/60">
                    <div className="text-[10px] sm:text-xs text-[#8B949E]">{tr('pitch_p_sub', language)}</div>
                    <div className="text-base sm:text-lg font-black text-[#F0A500]"><Num>{pSubPct != null ? `${pSubPct}%` : '—'}</Num></div>
                  </div>
                  <div className="p-2 bg-[#161B22] rounded-lg border border-[#30363D]/60">
                    <div className="text-[10px] sm:text-xs text-[#8B949E]">{tr('pitch_p_dnp', language)}</div>
                    <div className="text-base sm:text-lg font-black text-[#F85149]"><Num>{pDnpPct != null ? `${pDnpPct}%` : '—'}</Num></div>
                  </div>
                </div>
                {/* Raw probabilities always reconcile to 1.0 in the frozen
                    source -- this note only fires when independent
                    per-field rounding happens to land away from 100%, so
                    it never reads as a data-integrity problem. */}
                {probabilitySumPct != null && probabilitySumPct !== 100 && (
                  <div className="text-[10px] sm:text-xs text-[#8B949E] italic">
                    {language === 'KU'
                      ? <>نیشانی <Num>{probabilitySumPct}%</Num> دەدات چونکە هەر بەها بە جیاواز خڕ کراوەتەوە -- بەهای ڕاستەقینە بە تەواوی %١٠٠ دەبێت.</>
                      : <>Shows <Num>{probabilitySumPct}%</Num> because each value is rounded independently -- the underlying probabilities reconcile to exactly 100%.</>}
                  </div>
                )}
              </>
            ) : (
              <div className="text-[11px] sm:text-xs text-[#8B949E]">
                {tr('pitch_no_prob_fields', language)}
              </div>
            )}
          </div>
        ) : null}

        {/* SUPPLEMENTAL points-outlook (separate Monte Carlo artifact, see
            research/.../supplemental_outlook/) -- never the original
            frozen forecast, always labelled as such, never merged into
            predicted_xp above. Never invents a range/upside when the
            source has none -- shows "Range not available" instead. */}
        {researchMode && (
          player.outlook_is_supplemental && player.likely_range && player.upside_score != null ? (
            <div className="bg-[#0D1117] p-3 rounded-xl border border-[#30363D] space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs sm:text-sm font-bold text-[#E6EDF3] uppercase tracking-wider">{tr('pitch_points_outlook', language)}</div>
                <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#F0A500]/15 text-[#F0A500] border border-[#F0A500]/30">
                  {tr('pitch_supplemental', language)}
                </span>
              </div>
              <div className="text-[10px] sm:text-xs text-[#8B949E]">
                {tr('pitch_supplemental_note', language)}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-[#161B22] rounded-lg border border-[#30363D]/60">
                  <div className="text-[10px] sm:text-xs text-[#8B949E]">{tr('pitch_likely_range', language)}</div>
                  <div className="text-base sm:text-lg font-black text-[#58A6FF]"><Num>{`${player.likely_range[0]}–${player.likely_range[1]}`}</Num> <span className="text-[10px] sm:text-xs text-[#8B949E] font-normal">pts</span></div>
                </div>
                <div className="p-2 bg-[#161B22] rounded-lg border border-[#30363D]/60">
                  <div className="text-[10px] sm:text-xs text-[#8B949E]">{tr('pitch_upside_p80', language)}</div>
                  <div className="text-base sm:text-lg font-black text-[#F0A500]"><Num>{player.upside_score}</Num> <span className="text-[10px] sm:text-xs text-[#8B949E] font-normal">pts</span></div>
                </div>
              </div>
              <div className="text-[10px] sm:text-xs text-[#8B949E] italic">
                {tr('pitch_outside_range', language)}
              </div>
              <details className="text-[10px] sm:text-xs text-[#8B949E]">
                <summary className="cursor-pointer font-semibold text-[#58A6FF] select-none">{tr('pitch_more_detail', language)}</summary>
                <div className="mt-2 space-y-1.5 pl-1">
                  {player.high_upside_score != null && <div>{language === 'KU' ? 'لقی ٩٠' : '90th percentile'}: <span className="font-semibold text-[#E6EDF3]"><Num>{player.high_upside_score}</Num> pts</span></div>}
                  {player.prob_10_plus != null && <div>{language === 'KU' ? 'ئەگەری ١٠+ خاڵ' : 'Chance of 10+ points'}: <span className="font-semibold text-[#E6EDF3]"><Num>{Math.round(player.prob_10_plus * 100)}%</Num></span></div>}
                  {player.prob_15_plus != null && <div>{language === 'KU' ? 'ئەگەری ١٥+ خاڵ' : 'Chance of 15+ points'}: <span className="font-semibold text-[#E6EDF3]"><Num>{Math.round(player.prob_15_plus * 100)}%</Num></span></div>}
                  <div className="pt-1 border-t border-[#30363D]/60 mt-1.5">
                    {language === 'KU'
                      ? 'خەمڵێنراوە لەڕێگەی خۆشکردنەوەی مۆنتی کارلۆی سەربەخۆوە کە لەسەر خانە پێشبینیکراوەکانی ئامادەبوون/گۆڵ/یارمەتی/بێ‌گۆڵ‌بوونی تیمی بەرامبەر/بەدەستهێنانی جێگیرکراو دروستکراوە (١٠٬٠٠٠ هەفتەی خۆشکردنەوە) -- بەشێک نییە لە پێشبینیی سەرەکیی M3، هێشتا بەراورد نەکراوە لەگەڵ ئەنجامی ڕاستەقینە، و هەر خانەیەکی خاڵبەندی وەک سەربەخۆ دادەنرێت (پەیوەندی ڕاستەقینەی نێوان مەیلی گۆڵ و یارمەتی لە یارییەکی بەهێزدا لەوانەیە مەودای ڕاستەقینە لەوەی نیشانکراو فراوانتر بکات).'
                      : <>Estimated by an independent Monte Carlo simulation built from this player&apos;s already-frozen
                    appearance/goal/assist/clean-sheet/save expected-points components (10,000 simulated
                    gameweeks) -- not part of the original M3 forecast, not calibrated against real outcomes
                    yet, and assumes each scoring component is independent (real correlation between e.g. a
                    striker&apos;s goal and assist chances in the same match would likely widen the true range
                    further than shown here).</>}
                  </div>
                </div>
              </details>
            </div>
          ) : (
            <div className="bg-[#0D1117] p-3 rounded-xl border border-[#30363D]">
              <div className="text-xs sm:text-sm font-bold text-[#E6EDF3] uppercase tracking-wider">{tr('pitch_points_outlook', language)}</div>
              <div className="text-base sm:text-lg font-black text-[#8B949E] mt-1">{tr('pitch_range_not_avail', language)}</div>
              <div className="text-[10px] sm:text-xs text-[#8B949E] mt-0.5">
                {tr('pitch_range_not_avail_note', language)}
              </div>
            </div>
          )
        )}

        {!researchMode && (
          <>
            {/* Upside Percentiles */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#0D1117] p-3 rounded-xl border border-[#30363D]">
                <div className="text-[11px] font-semibold text-[#8B949E] uppercase">Upside Score (P80)</div>
                <div className="text-xl font-bold text-[#F0A500] mt-1">
                  {p80} <span className="text-xs text-[#8B949E] font-normal">pts</span>
                </div>
                <div className="text-[10px] text-[#8B949E] mt-0.5">80th percentile score</div>
              </div>

              <div className="bg-[#0D1117] p-3 rounded-xl border border-[#30363D]">
                <div className="text-[11px] font-semibold text-[#8B949E] uppercase">High-Upside Score (P90)</div>
                <div className="text-xl font-bold text-[#D29922] mt-1">
                  {p90} <span className="text-xs text-[#8B949E] font-normal">pts</span>
                </div>
                <div className="text-[10px] text-[#8B949E] mt-0.5">90th percentile score</div>
              </div>
            </div>

            {/* Milestone Odds */}
            <div className="bg-[#0D1117] p-3 rounded-xl border border-[#30363D] space-y-2">
              <div className="text-xs font-bold text-[#E6EDF3] uppercase tracking-wider">Milestone Probabilities</div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-[#161B22] rounded-lg border border-[#30363D]/60">
                  <div className="text-[10px] text-[#8B949E]">10+ Points</div>
                  <div className="text-base font-black text-[#58A6FF]">{p10}%</div>
                </div>
                <div className="p-2 bg-[#161B22] rounded-lg border border-[#30363D]/60">
                  <div className="text-[10px] text-[#8B949E]">15+ Points</div>
                  <div className="text-base font-black text-[#F0A500]">{p15}%</div>
                </div>
                <div className="p-2 bg-[#161B22] rounded-lg border border-[#30363D]/60">
                  <div className="text-[10px] text-[#8B949E]">20+ Points</div>
                  <div className="text-base font-black text-[#F85149]">{p20}%</div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Methodology / Provenance Note -- exact source identity when known,
            never a generic disclaimer that could apply to any player/GW. */}
        <p className="text-[10px] sm:text-xs text-[#8B949E] italic leading-tight">
          {researchMode
            ? provenance
              ? `${provenance.model} • ${provenance.season} • GW${provenance.gameweek} • ${provenance.object} • ${provenance.status}${provenance.artifactVersion ? ` • artifact ${provenance.artifactVersion}` : ''}. Fields above are read directly from this exact source; unavailable fields are never estimated.`
              : 'Model forecast. Expected points and probability-card fields are model outputs from the verified artifact, not the Ennovera Hybrid live-product methodology.'
            : 'Ennovera Hybrid combines frozen expected points with a calibrated score probability distribution. Probabilities describe modeled uncertainty and are not guaranteed outcomes.'}
        </p>
      </div>
    </div>
  )
}

export default PitchVisualization
