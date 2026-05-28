'use client'

import { useState, useMemo, useCallback } from 'react'
import type {
  TournamentSimulation,
  TournamentBracketMatch,
  BracketSlot,
  UserBracketMatchResult,
  UserBracketResponse,
} from '@/types'
import type { Language } from './Navbar'
import WinnerProbsList from './WinnerProbsList'

// ── Constants ─────────────────────────────────────────────────────────────────

const ROUND_ORDER = ['Round of 32', 'Round of 16', 'Quarter-Finals', 'Semi-Finals', 'Final']
const ROUNDS_KU   = ['دۆری ٣٢', 'دۆری ١٦', 'چارەک فینال', 'نیوە فینال', 'فینال']
const SLOT_COUNTS: Record<string, number> = {
  'Round of 32': 16, 'Round of 16': 8, 'Quarter-Finals': 4, 'Semi-Finals': 2, 'Final': 1,
}

// ── Labels ────────────────────────────────────────────────────────────────────

const labels = {
  EN: {
    champion: 'Predicted Champion',
    winChance: 'Win probability',
    submitBracket: 'Submit My Bracket',
    bracketNote: 'Bracket fills as group-stage teams qualify · Real results shown in gold · AI predictions in blue',
    aiPredicts: 'AI predicts',
    toWin: 'to win',
    actualResult: 'Actual result',
    tbd: 'TBD',
    close: 'Close',
    myBracket: 'My Bracket',
    pickWinner: 'Pick the winner',
    next: 'Next Round →',
    back: '← Back',
    submitFinal: 'Submit Bracket',
    submitting: 'Submitting…',
    yourScore: 'Your Score',
    roundOf: (r: string) => r,
    correct: '✓',
    incorrect: '✗',
    pending: '—',
    submitted: 'Bracket submitted!',
    comparisonTitle: 'My Bracket vs AI',
    vs: 'vs',
    noR32: 'Bracket matchups not yet available — submit after group stage.',
    locked: 'Tournament has started — bracket locked',
    loading: 'Loading bracket…',
    noData: 'Bracket not available yet',
    roundComplete: (r: string) => `${r} complete`,
  },
  KU: {
    champion: 'چەمپیۆنی پێشبینی',
    winChance: 'ئەگەری بردنەوە',
    submitBracket: 'بریکەتم بنێرە',
    bracketNote: 'بریکەت دیار دەبێت کاتێک تیمەکانی قۆناغی گروپ پێشبچن · ئەنجامی ڕاستەقینە بە زێڕ · پێشبینی AI بە شین',
    aiPredicts: 'AI پێشبینی دەکات',
    toWin: 'ببێتە بەرینەر',
    actualResult: 'ئەنجامی ڕاستەقینە',
    tbd: 'دیارنیە',
    close: 'داخستن',
    myBracket: 'بریکەتی من',
    pickWinner: 'بەرینەر هەڵبژێرە',
    next: '← دواتر',
    back: 'گەڕانەوە →',
    submitFinal: 'بریکەت بنێرە',
    submitting: 'ناردن…',
    yourScore: 'خاڵەکانت',
    roundOf: (r: string) => ROUNDS_KU[ROUND_ORDER.indexOf(r)] ?? r,
    correct: '✓',
    incorrect: '✗',
    pending: '—',
    submitted: 'بریکەت نێردرا!',
    comparisonTitle: 'بریکەتی من دژ بە AI',
    vs: 'دژ بە',
    noR32: 'یارییەکانی بریکەت هێشتا دیار نیە — دوای قۆناغی گروپ بنێرە.',
    locked: 'تورنووان دەستی پێکردووە — بریکەت داخراوە',
    loading: 'بریکەت بارکردن…',
    noData: 'بریکەت هێشتا بەردەست نیە',
    roundComplete: (r: string) => `${ROUNDS_KU[ROUND_ORDER.indexOf(r)] ?? r} تەواو بوو`,
  },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mergeWithReal(sim: TournamentBracketMatch[], real: BracketSlot[]): TournamentBracketMatch[] {
  return sim.map((s) => {
    const r = real.find((x) => x.round === s.round && x.slot_number === s.slot_number)
    if (!r) return s
    return {
      ...s,
      team_a: r.team_a ?? s.team_a,
      team_a_flag: r.team_a_flag ?? s.team_a_flag,
      team_b: r.team_b ?? s.team_b,
      team_b_flag: r.team_b_flag ?? s.team_b_flag,
      score_a: r.score_a,
      score_b: r.score_b,
      actual_winner: r.winner,
      match_date: r.match_date ?? s.match_date,
    }
  })
}

function buildFlagMap(matches: TournamentBracketMatch[]): Record<string, string> {
  const m: Record<string, string> = {}
  for (const s of matches) {
    if (s.team_a && s.team_a_flag) m[s.team_a] = s.team_a_flag
    if (s.team_b && s.team_b_flag) m[s.team_b] = s.team_b_flag
  }
  return m
}

type RoundPicks = Record<number, string>   // slot_number → winner team
type AllPicks   = Record<string, RoundPicks> // round → RoundPicks

function buildUserRound(
  roundIdx: number,
  simBracket: TournamentBracketMatch[],
  picks: AllPicks,
  flagMap: Record<string, string>
): TournamentBracketMatch[] {
  const round = ROUND_ORDER[roundIdx]

  if (roundIdx === 0) {
    const r32 = simBracket.filter((m) => m.round === 'Round of 32')
    return Array.from({ length: 16 }, (_, i) => {
      const slot = i + 1
      return r32.find((m) => m.slot_number === slot) ?? { round, slot_number: slot }
    })
  }

  const prevRound = ROUND_ORDER[roundIdx - 1]
  const prevPicks = picks[prevRound] ?? {}
  const prevMatches = buildUserRound(roundIdx - 1, simBracket, picks, flagMap)
  const count = SLOT_COUNTS[round]

  return Array.from({ length: count }, (_, i) => {
    const slot = i + 1
    const teamA = prevPicks[2 * i + 1]
    const teamB = prevPicks[2 * i + 2]
    const aiMatch = simBracket.find((m) => m.round === round && m.slot_number === slot)
    // Recover flags from previousround matches
    const prevA = prevMatches.find((m) => m.slot_number === 2 * i + 1)
    const prevB = prevMatches.find((m) => m.slot_number === 2 * i + 2)
    const flagA = teamA ? (flagMap[teamA] ?? (prevA?.team_a === teamA ? prevA?.team_a_flag : prevA?.team_b_flag)) : undefined
    const flagB = teamB ? (flagMap[teamB] ?? (prevB?.team_a === teamB ? prevB?.team_a_flag : prevB?.team_b_flag)) : undefined
    return {
      round,
      slot_number: slot,
      team_a: teamA,
      team_a_flag: flagA,
      team_b: teamB,
      team_b_flag: flagB,
      win_prob_a: aiMatch?.win_prob_a,
      win_prob_b: aiMatch?.win_prob_b,
      predicted_winner: aiMatch?.predicted_winner,
      actual_winner: aiMatch?.actual_winner,
    }
  })
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ChampionCard({ champion, t }: {
  champion: { team: string; flag?: string; probability: number }
  t: typeof labels['EN']
}) {
  const pct = Math.round(champion.probability * 100)
  return (
    <div className="bg-gradient-to-r from-[#F0A500]/10 to-[#F0A500]/5 border border-[#F0A500]/40 rounded-2xl p-5 flex items-center gap-5">
      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-[#F0A500]/20 border border-[#F0A500]/40">
        <span className="text-3xl">🏆</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-[#F0A500] uppercase tracking-wider">{t.champion}</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-lg">{champion.flag || '🏳️'}</span>
          <span className="text-xl font-extrabold text-[#E6EDF3] truncate">{champion.team}</span>
        </div>
        <div className="mt-2 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#8B949E]">{t.winChance}</span>
            <span className="text-xs font-bold text-[#F0A500]">{pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-[#0D1117] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#F0A500] transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function PredictSlotCard({ match, t, onClick }: {
  match: TournamentBracketMatch
  t: typeof labels['EN']
  onClick: (m: TournamentBracketMatch) => void
}) {
  const isPlayed = !!match.actual_winner
  const hasTeams = !!(match.team_a || match.team_b)
  const winA = isPlayed ? match.actual_winner === match.team_a : match.predicted_winner === match.team_a
  const winB = isPlayed ? match.actual_winner === match.team_b : match.predicted_winner === match.team_b
  const probA = match.win_prob_a != null ? Math.round(match.win_prob_a * 100) : null
  const probB = match.win_prob_b != null ? Math.round(match.win_prob_b * 100) : null

  if (!hasTeams) {
    return (
      <div className="bg-[#0D1117] border border-dashed border-[#30363D]/50 rounded-lg w-44 flex-shrink-0">
        <div className="flex items-center px-3 py-2 border-b border-dashed border-[#30363D]/50">
          <span className="text-xs text-[#30363D]">{t.tbd}</span>
        </div>
        <div className="flex items-center px-3 py-2">
          <span className="text-xs text-[#30363D]">{t.tbd}</span>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => onClick(match)}
      className={`text-left bg-[#0D1117] border rounded-lg w-44 flex-shrink-0 overflow-hidden hover:border-[#F0A500]/60 hover:shadow-sm hover:shadow-[#F0A500]/10 transition-all ${
        isPlayed
          ? 'border-[#F0A500]/40'
          : match.predicted_winner
          ? 'border-[#58A6FF]/30 border-dashed'
          : 'border-[#30363D]'
      }`}
    >
      {/* Team A */}
      <div className={`flex items-center gap-2 px-2.5 py-2 border-b border-[#30363D] ${
        isPlayed && winA ? 'bg-[#F0A500]/10' : !isPlayed && winA ? 'bg-[#58A6FF]/5' : ''
      }`}>
        <span className="text-sm flex-shrink-0">{match.team_a_flag || '🏳️'}</span>
        <span className={`text-xs font-medium truncate flex-1 ${
          isPlayed && winA ? 'text-[#F0A500] font-bold'
          : !isPlayed && winA ? 'text-[#58A6FF]'
          : 'text-[#8B949E]'
        }`}>
          {match.team_a ?? t.tbd}
        </span>
        {probA !== null && !isPlayed && (
          <span className="text-[9px] text-[#30363D] font-mono flex-shrink-0">{probA}%</span>
        )}
        {isPlayed && match.score_a !== undefined && (
          <span className={`text-xs font-bold flex-shrink-0 ${winA ? 'text-[#F0A500]' : 'text-[#8B949E]'}`}>
            {match.score_a}
          </span>
        )}
      </div>

      {/* Team B */}
      <div className={`flex items-center gap-2 px-2.5 py-2 ${
        isPlayed && winB ? 'bg-[#F0A500]/10' : !isPlayed && winB ? 'bg-[#58A6FF]/5' : ''
      }`}>
        <span className="text-sm flex-shrink-0">{match.team_b_flag || '🏳️'}</span>
        <span className={`text-xs font-medium truncate flex-1 ${
          isPlayed && winB ? 'text-[#F0A500] font-bold'
          : !isPlayed && winB ? 'text-[#58A6FF]'
          : 'text-[#8B949E]'
        }`}>
          {match.team_b ?? t.tbd}
        </span>
        {probB !== null && !isPlayed && (
          <span className="text-[9px] text-[#30363D] font-mono flex-shrink-0">{probB}%</span>
        )}
        {isPlayed && match.score_b !== undefined && (
          <span className={`text-xs font-bold flex-shrink-0 ${winB ? 'text-[#F0A500]' : 'text-[#8B949E]'}`}>
            {match.score_b}
          </span>
        )}
      </div>
    </button>
  )
}

function MatchModal({ match, t, onClose }: {
  match: TournamentBracketMatch
  t: typeof labels['EN']
  onClose: () => void
}) {
  const isPlayed = !!match.actual_winner
  const probA = match.win_prob_a != null ? Math.round(match.win_prob_a * 100) : 50
  const probB = match.win_prob_b != null ? Math.round(match.win_prob_b * 100) : 50

  const teams = [
    { name: match.team_a, flag: match.team_a_flag, prob: probA },
    { name: match.team_b, flag: match.team_b_flag, prob: probB },
  ]

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#161B22] border border-[#30363D] rounded-2xl max-w-sm w-full p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Round badge */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#F0A500] bg-[#F0A500]/10 border border-[#F0A500]/30 px-3 py-1 rounded-full">
            {t.roundOf(match.round)}
          </span>
          <button
            onClick={onClose}
            className="text-[#8B949E] hover:text-[#E6EDF3] transition-colors w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#30363D]"
          >
            ✕
          </button>
        </div>

        {/* Win-prob bars */}
        <div className="space-y-3">
          {teams.map(({ name, flag, prob }) => {
            const isWinner = match.actual_winner === name || (!isPlayed && match.predicted_winner === name)
            return (
              <div key={name ?? 'tbd'} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{flag || '🏳️'}</span>
                    <span className={`text-sm font-semibold ${isWinner ? 'text-[#E6EDF3]' : 'text-[#8B949E]'}`}>
                      {name ?? t.tbd}
                    </span>
                  </div>
                  <span className="text-xs tabular-nums text-[#8B949E]">{prob}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#0D1117] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isPlayed && match.actual_winner === name ? 'bg-[#F0A500]'
                      : !isPlayed && match.predicted_winner === name ? 'bg-[#58A6FF]'
                      : 'bg-[#30363D]'
                    }`}
                    style={{ width: `${prob}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* AI prediction */}
        {match.predicted_winner && (
          <div className="flex items-center gap-2 bg-[#58A6FF]/10 border border-[#58A6FF]/30 rounded-xl px-3 py-2.5">
            <span className="text-base">🤖</span>
            <p className="text-xs text-[#58A6FF]">
              {t.aiPredicts} <span className="font-bold">{match.predicted_winner}</span> {t.toWin}
            </p>
          </div>
        )}

        {/* Actual result */}
        {isPlayed && (
          <div className="flex items-center gap-2 bg-[#F0A500]/10 border border-[#F0A500]/30 rounded-xl px-3 py-2.5">
            <span className="text-base">🏆</span>
            <p className="text-xs text-[#F0A500] font-medium">
              {t.actualResult}:{' '}
              <span className="font-bold">{match.actual_winner}</span>
              {match.score_a !== undefined && ` (${match.score_a}–${match.score_b})`}
            </p>
          </div>
        )}

        {match.match_date && (
          <p className="text-[10px] text-[#30363D]">
            {new Date(match.match_date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
          </p>
        )}

        <button
          onClick={onClose}
          className="w-full bg-[#21262D] hover:bg-[#30363D] text-[#E6EDF3] text-sm font-medium py-2.5 rounded-lg transition-colors"
        >
          {t.close}
        </button>
      </div>
    </div>
  )
}

// ── User Bracket Form ─────────────────────────────────────────────────────────

function ComparisonView({ result, t }: {
  result: UserBracketResponse
  t: typeof labels['EN']
}) {
  const byRound = result.bracket.reduce<Record<string, UserBracketMatchResult[]>>((acc, m) => {
    if (!acc[m.round]) acc[m.round] = []
    acc[m.round].push(m)
    return acc
  }, {})

  const scorePct = result.max_score > 0 ? Math.round((result.score / result.max_score) * 100) : 0

  return (
    <div className="space-y-5">
      {/* Score card */}
      <div className="bg-[#F0A500]/10 border border-[#F0A500]/30 rounded-2xl p-4 text-center">
        <p className="text-xs font-semibold text-[#F0A500] uppercase tracking-wider">{t.yourScore}</p>
        <p className="text-4xl font-extrabold text-[#F0A500] mt-1">{result.score}</p>
        <p className="text-sm text-[#8B949E]">/ {result.max_score}</p>
        <div className="mt-3 h-2 rounded-full bg-[#0D1117] overflow-hidden max-w-xs mx-auto">
          <div
            className="h-full rounded-full bg-[#F0A500] transition-all duration-700"
            style={{ width: `${scorePct}%` }}
          />
        </div>
      </div>

      {/* Round-by-round comparison */}
      {ROUND_ORDER.map((round) => {
        const matches = byRound[round]
        if (!matches?.length) return null
        return (
          <div key={round} className="space-y-2">
            <h4 className="text-xs font-bold text-[#8B949E] uppercase tracking-wider">{t.roundOf(round)}</h4>
            {matches.map((m) => {
              const userStatus = m.actual_result == null ? 'pending'
                : m.user_correct ? 'correct' : 'incorrect'
              const aiStatus = m.actual_result == null ? 'pending'
                : m.ai_prediction === m.actual_result ? 'correct' : 'incorrect'
              const badge = (s: string) =>
                s === 'correct' ? `text-[#2EA043] font-bold` : s === 'incorrect' ? `text-[#F85149]` : `text-[#30363D]`
              const icon = (s: string) =>
                s === 'correct' ? t.correct : s === 'incorrect' ? t.incorrect : t.pending

              return (
                <div
                  key={`${round}-${m.slot_number}`}
                  className="bg-[#0D1117] border border-[#30363D] rounded-lg px-3 py-2.5 grid grid-cols-3 gap-2 text-xs"
                >
                  <div>
                    <p className="text-[#30363D] text-[10px] mb-0.5">{t.myBracket}</p>
                    <p className="text-[#E6EDF3] font-medium truncate">{m.user_pick ?? t.tbd}</p>
                    <span className={badge(userStatus)}>{icon(userStatus)}</span>
                  </div>
                  <div className="text-center">
                    <p className="text-[#30363D] text-[10px] mb-0.5">{t.vs}</p>
                    <p className="text-[#8B949E] text-[10px] truncate">{m.team_a ?? '?'}</p>
                    <p className="text-[#8B949E] text-[10px] truncate">{m.team_b ?? '?'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[#30363D] text-[10px] mb-0.5">AI</p>
                    <p className="text-[#58A6FF] font-medium truncate">{m.ai_prediction ?? t.tbd}</p>
                    <span className={badge(aiStatus)}>{icon(aiStatus)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

function UserBracketForm({ simBracket, flagMap, tournamentStarted, onClose, language }: {
  simBracket: TournamentBracketMatch[]
  flagMap: Record<string, string>
  tournamentStarted: boolean
  onClose: () => void
  language: Language
}) {
  const t = labels[language]
  const [picks, setPicks] = useState<AllPicks>({})
  const [roundIdx, setRoundIdx] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<UserBracketResponse | null>(null)

  const currentRound = ROUND_ORDER[roundIdx]
  const currentMatches = useMemo(
    () => buildUserRound(roundIdx, simBracket, picks, flagMap),
    [roundIdx, simBracket, picks, flagMap]
  )

  const currentPicks = picks[currentRound] ?? {}
  const roundComplete = currentMatches.every((m) => currentPicks[m.slot_number])
  const isLastRound = roundIdx === ROUND_ORDER.length - 1

  const handlePick = useCallback((slotNumber: number, team: string) => {
    setPicks((prev) => ({
      ...prev,
      [currentRound]: { ...(prev[currentRound] ?? {}), [slotNumber]: team },
    }))
  }, [currentRound])

  const handleSubmit = async () => {
    setSubmitting(true)
    const allPicksList = ROUND_ORDER.flatMap((round) =>
      Object.entries(picks[round] ?? {}).map(([slot, winner]) => ({
        round,
        slot_number: Number(slot),
        winner,
      }))
    )
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL
      const res = await fetch(`${apiUrl}/simulate/user-bracket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ picks: allPicksList }),
      })
      if (res.ok) {
        setResult(await res.json())
      }
    } catch {
      // graceful — show what we have
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#161B22] border border-[#30363D] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#30363D] flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-[#E6EDF3]">{t.myBracket}</h2>
            {result == null && (
              <p className="text-xs text-[#8B949E] mt-0.5">
                {t.roundOf(currentRound)} · {Object.keys(currentPicks).length}/{currentMatches.length}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-[#8B949E] hover:text-[#E6EDF3] w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#30363D] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
          {tournamentStarted && !result && (
            <div className="bg-[#F85149]/10 border border-[#F85149]/30 rounded-xl px-4 py-2.5 text-xs text-[#F85149]">
              {t.locked}
            </div>
          )}

          {simBracket.filter(m => m.round === 'Round of 32').length === 0 && !result && (
            <div className="bg-[#161B22] rounded-xl p-6 text-center">
              <span className="text-3xl">⏳</span>
              <p className="mt-2 text-sm text-[#8B949E]">{t.noR32}</p>
            </div>
          )}

          {result ? (
            <ComparisonView result={result} t={t} />
          ) : (
            <div className="space-y-2">
              {currentMatches.map((match) => {
                const picked = currentPicks[match.slot_number]
                const hasTeams = match.team_a || match.team_b
                return (
                  <div
                    key={match.slot_number}
                    className="bg-[#0D1117] border border-[#30363D] rounded-xl overflow-hidden"
                  >
                    <div className="px-3 py-1.5 border-b border-[#30363D]/50 flex items-center justify-between">
                      <span className="text-[10px] text-[#8B949E] font-medium">
                        {t.roundOf(currentRound)} — #{match.slot_number}
                      </span>
                      {picked && (
                        <span className="text-[10px] text-[#2EA043] font-bold">✓</span>
                      )}
                    </div>
                    {hasTeams ? (
                      <div className="grid grid-cols-2 divide-x divide-[#30363D]">
                        {[
                          { team: match.team_a, flag: match.team_a_flag },
                          { team: match.team_b, flag: match.team_b_flag },
                        ].map(({ team, flag }) => (
                          <button
                            key={team ?? 'tbd'}
                            disabled={!team || tournamentStarted}
                            onClick={() => team && handlePick(match.slot_number, team)}
                            className={`flex items-center gap-2 px-3 py-2.5 text-left transition-all ${
                              picked === team
                                ? 'bg-[#F0A500]/15 text-[#F0A500]'
                                : team
                                ? 'text-[#8B949E] hover:bg-[#21262D] hover:text-[#E6EDF3]'
                                : 'text-[#30363D] cursor-default'
                            }`}
                          >
                            <span className="text-base flex-shrink-0">{flag || '🏳️'}</span>
                            <span className="text-xs font-semibold truncate">{team ?? t.tbd}</span>
                            {picked === team && <span className="ml-auto text-[10px]">✓</span>}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#30363D] px-3 py-2.5">{t.tbd}</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer nav */}
        {!result && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-[#30363D] flex-shrink-0 gap-3">
            <button
              onClick={() => setRoundIdx((i) => Math.max(0, i - 1))}
              disabled={roundIdx === 0}
              className="text-sm text-[#8B949E] hover:text-[#E6EDF3] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              {t.back}
            </button>

            {isLastRound ? (
              <button
                onClick={handleSubmit}
                disabled={!roundComplete || submitting || tournamentStarted}
                className="flex-1 bg-[#F0A500] hover:bg-[#D4920A] disabled:opacity-50 disabled:cursor-not-allowed text-[#0D1117] font-bold py-2.5 rounded-xl text-sm transition-colors"
              >
                {submitting ? t.submitting : t.submitFinal}
              </button>
            ) : (
              <button
                onClick={() => setRoundIdx((i) => Math.min(ROUND_ORDER.length - 1, i + 1))}
                disabled={!roundComplete}
                className="flex-1 bg-[#F0A500] hover:bg-[#D4920A] disabled:opacity-40 disabled:cursor-not-allowed text-[#0D1117] font-bold py-2.5 rounded-xl text-sm transition-colors"
              >
                {t.next}
              </button>
            )}
          </div>
        )}

        {/* Round progress dots */}
        {!result && (
          <div className="flex items-center justify-center gap-1.5 pb-4 flex-shrink-0">
            {ROUND_ORDER.map((_, i) => (
              <button
                key={i}
                onClick={() => setRoundIdx(i)}
                className={`rounded-full transition-all ${
                  i === roundIdx
                    ? 'h-2 w-5 bg-[#F0A500]'
                    : i < roundIdx
                    ? 'h-2 w-2 bg-[#2EA043]'
                    : 'h-2 w-2 bg-[#30363D]'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

interface Props {
  simulation: TournamentSimulation | null
  realSlots: BracketSlot[]
  loading: boolean
  language: Language
}

export default function BracketPredictions({ simulation, realSlots, loading, language }: Props) {
  const t = labels[language]
  const [selectedMatch, setSelectedMatch] = useState<TournamentBracketMatch | null>(null)
  const [showUserBracket, setShowUserBracket] = useState(false)

  const champion = simulation?.predicted_champion

  // Stable reference so useMemo doesn't re-run every render when bracket is undefined
  const simBracket = useMemo(() => simulation?.bracket ?? [], [simulation?.bracket])

  // Merge AI predictions with real Supabase data
  const mergedBracket = useMemo(
    () => (simBracket.length ? mergeWithReal(simBracket, realSlots) : []),
    [simBracket, realSlots]
  )

  const flagMap = useMemo(() => buildFlagMap(mergedBracket), [mergedBracket])

  // Tournament started = any real match played
  const tournamentStarted = realSlots.some((s) => !!s.winner)

  const slotsByRound = useMemo(
    () =>
      mergedBracket.reduce<Record<string, TournamentBracketMatch[]>>((acc, m) => {
        if (!acc[m.round]) acc[m.round] = []
        acc[m.round].push(m)
        return acc
      }, {}),
    [mergedBracket]
  )

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-24 rounded-2xl bg-[#161B22] border border-[#30363D] animate-pulse" />
        <div className="h-48 rounded-xl bg-[#161B22] border border-[#30363D] animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Predicted Champion */}
      {champion && <ChampionCard champion={champion} t={t} />}

      {/* Tournament win probabilities ranked list */}
      {simulation?.winner_probs && Object.keys(simulation.winner_probs).length > 0 && (
        <WinnerProbsList
          winnerProbs={simulation.winner_probs}
          flagMap={simulation.flag_map ?? flagMap}
          language={language}
        />
      )}

      {/* Legend + submit button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-xs text-[#8B949E]">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-4 rounded-full bg-[#F0A500] inline-block" />
            {language === 'KU' ? 'ئەنجامی ڕاستەقینە' : 'Real result'}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-4 rounded-full bg-[#58A6FF] inline-block" />
            {language === 'KU' ? 'پێشبینی AI' : 'AI prediction'}
          </span>
        </div>
        <button
          onClick={() => setShowUserBracket(true)}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            tournamentStarted
              ? 'bg-[#21262D] text-[#8B949E] border border-[#30363D] cursor-not-allowed opacity-60'
              : 'bg-[#F0A500] text-[#0D1117] hover:bg-[#D4920A] shadow-md shadow-[#F0A500]/20'
          }`}
        >
          <span>🏆</span>
          {t.submitBracket}
        </button>
      </div>

      {/* Bracket scroll area */}
      {mergedBracket.length === 0 && realSlots.length === 0 ? (
        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-12 text-center">
          <span className="text-4xl">🏟️</span>
          <p className="mt-3 text-[#8B949E]">{t.noData}</p>
        </div>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-6 min-w-max py-2">
            {ROUND_ORDER.map((round, ri) => {
              const displayRound = language === 'KU' ? ROUNDS_KU[ri] : round
              const roundSlots = slotsByRound[round] ?? []
              const needed = SLOT_COUNTS[round]

              // Pad with TBD slots
              const display: (TournamentBracketMatch | null)[] = [
                ...roundSlots.sort((a, b) => a.slot_number - b.slot_number),
                ...Array.from({ length: Math.max(0, needed - roundSlots.length) }, () => null),
              ]

              return (
                <div key={round} className="flex flex-col gap-0">
                  {/* Round label */}
                  <div className="text-center mb-3">
                    <span className="text-xs font-bold text-[#F0A500] bg-[#F0A500]/10 border border-[#F0A500]/30 px-3 py-1 rounded-full whitespace-nowrap">
                      {displayRound}
                    </span>
                  </div>

                  {/* Slots vertically distributed */}
                  <div
                    className="flex flex-col justify-around gap-3"
                    style={{ minHeight: `${needed * 68}px` }}
                  >
                    {display.map((slot, i) =>
                      slot ? (
                        <PredictSlotCard
                          key={slot.slot_number}
                          match={slot}
                          t={t}
                          onClick={setSelectedMatch}
                        />
                      ) : (
                        <div
                          key={`tbd-${i}`}
                          className="bg-[#0D1117] border border-dashed border-[#30363D]/50 rounded-lg w-44 flex-shrink-0"
                        >
                          <div className="flex items-center px-3 py-2 border-b border-dashed border-[#30363D]/50">
                            <span className="text-xs text-[#30363D]">{t.tbd}</span>
                          </div>
                          <div className="flex items-center px-3 py-2">
                            <span className="text-xs text-[#30363D]">{t.tbd}</span>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Info note */}
      <p className="text-xs text-[#8B949E] text-center">{t.bracketNote}</p>

      {/* Match detail modal */}
      {selectedMatch && (
        <MatchModal match={selectedMatch} t={t} onClose={() => setSelectedMatch(null)} />
      )}

      {/* User bracket form modal */}
      {showUserBracket && (
        <UserBracketForm
          simBracket={mergedBracket}
          flagMap={flagMap}
          tournamentStarted={tournamentStarted}
          onClose={() => setShowUserBracket(false)}
          language={language}
        />
      )}
    </div>
  )
}
