export interface GameweekContext {
  requestedGameweek: number
  currentActiveGameweek: number
  nextGameweek: number
  isLive: boolean
  isCompleted: boolean
  isUpcoming: boolean
  snapshotType: 'FROZEN_PREDEADLINE' | 'LIVE_OFFICIAL' | 'HISTORICAL_FINAL'
  statusLabel: 'GW2_LIVE' | 'GW3_UPCOMING' | 'GW1_COMPLETED' | 'GENERAL'
}

export class GameweekContextEngine {
  static CURRENT_ACTIVE_GW = 2
  static NEXT_GW = 3

  static resolveContext(question: string, explicitGW?: number): GameweekContext {
    const q = question.toLowerCase()
    let reqGW = explicitGW

    if (!reqGW) {
      if (q.includes('gw1') || q.includes('gameweek 1') || q.includes('week 1') || q.includes('last week') || q.includes('historical')) {
        reqGW = 1
      } else if (q.includes('gw3') || q.includes('gameweek 3') || q.includes('week 3') || q.includes('next week') || q.includes('upcoming') || q.includes('transfer') || q.includes('next gameweek')) {
        reqGW = 3
      } else if (q.includes('gw2') || q.includes('gameweek 2') || q.includes('week 2') || q.includes('this week') || q.includes('live') || q.includes('current') || q.includes('right now') || q.includes('so far')) {
        reqGW = 2
      } else {
        // Default heuristics:
        // Live/actual queries -> GW2
        // Forward planning/captain/transfers -> GW3
        if (q.includes('captain') || q.includes('buy') || q.includes('pick') || q.includes('best') || q.includes('under') || q.includes('below')) {
          reqGW = 3
        } else {
          reqGW = 2
        }
      }
    }

    const currentActive = this.CURRENT_ACTIVE_GW
    const nextGW = this.NEXT_GW

    const isLive = reqGW === currentActive
    const isCompleted = reqGW < currentActive
    const isUpcoming = reqGW > currentActive

    const snapshotType = isCompleted
      ? 'HISTORICAL_FINAL'
      : isLive
      ? 'LIVE_OFFICIAL'
      : 'FROZEN_PREDEADLINE'

    const statusLabel = reqGW === 2 ? 'GW2_LIVE' : reqGW === 3 ? 'GW3_UPCOMING' : reqGW === 1 ? 'GW1_COMPLETED' : 'GENERAL'

    return {
      requestedGameweek: reqGW,
      currentActiveGameweek: currentActive,
      nextGameweek: nextGW,
      isLive,
      isCompleted,
      isUpcoming,
      snapshotType,
      statusLabel,
    }
  }
}
