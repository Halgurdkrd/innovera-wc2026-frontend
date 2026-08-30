import { ConversationTurn } from './types'

export interface GameweekContext {
  requestedGameweek: number
  currentActiveGameweek: number
  nextGameweek: number
  isLive: boolean
  isCompleted: boolean
  isUpcoming: boolean
  inheritedPosition?: 'GK' | 'DEF' | 'MID' | 'FWD'
  inheritedBudget?: number
  snapshotType: 'FROZEN_PREDEADLINE' | 'LIVE_OFFICIAL' | 'HISTORICAL_FINAL'
  statusLabel: 'GW2_LIVE' | 'GW3_UPCOMING' | 'GW1_COMPLETED' | 'GENERAL'
}

export class GameweekContextEngine {
  static CURRENT_ACTIVE_GW = 2
  static NEXT_GW = 3

  static resolveContext(
    question: string,
    explicitGW?: number,
    history: ConversationTurn[] = []
  ): GameweekContext {
    const q = question.toLowerCase()
    let reqGW = explicitGW

    // Check context from question
    if (!reqGW) {
      if (q.includes('gw1') || q.includes('gameweek 1') || q.includes('week 1') || q.includes('last week') || q.includes('historical')) {
        reqGW = 1
      } else if (
        q.includes('gw3') ||
        q.includes('gameweek 3') ||
        q.includes('week 3') ||
        q.includes('next week') ||
        q.includes('next gw') ||
        q.includes('upcoming') ||
        q.includes('transfer') ||
        q.includes('داهاتوو') ||
        q.includes('گەیمویکی داهاتوو')
      ) {
        reqGW = 3
      } else if (
        q.includes('gw2') ||
        q.includes('gameweek 2') ||
        q.includes('week 2') ||
        q.includes('this week') ||
        q.includes('this gw') ||
        q.includes('ئەم گەیمویکە') ||
        q.includes('live') ||
        q.includes('current') ||
        q.includes('right now') ||
        q.includes('so far')
      ) {
        reqGW = 2
      } else {
        // Multi-turn check from history
        let historyGW: number | undefined
        for (let i = history.length - 1; i >= 0; i--) {
          const h = history[i].content.toLowerCase()
          if (h.includes('gw3') || h.includes('next gw') || h.includes('next week') || h.includes('داهاتوو')) {
            historyGW = 3
            break
          } else if (h.includes('gw2') || h.includes('this gw') || h.includes('live')) {
            historyGW = 2
            break
          }
        }

        if (historyGW) {
          reqGW = historyGW
        } else {
          // Defaults: Captain / Transfer / Planning / Budget queries default to GW3; live/points default to GW2
          if (
            q.includes('captain') ||
            q.includes('کاپتن') ||
            q.includes('buy') ||
            q.includes('pick') ||
            q.includes('best') ||
            q.includes('باشترین') ||
            q.includes('under') ||
            q.includes('ژێر')
          ) {
            reqGW = 3
          } else {
            reqGW = 2
          }
        }
      }
    }

    // Context Inheritance for follow-up budget/position queries
    let inheritedPosition: 'GK' | 'DEF' | 'MID' | 'FWD' | undefined
    let inheritedBudget: number | undefined

    if (q.includes('mid') || q.includes('midfield') || q.includes('میدفیلدەر') || q.includes('ناوەند')) {
      inheritedPosition = 'MID'
    } else if (q.includes('def') || q.includes('defender') || q.includes('بەرگریکار')) {
      inheritedPosition = 'DEF'
    } else if (q.includes('fwd') || q.includes('forward') || q.includes('striker') || q.includes('هێرشبەر')) {
      inheritedPosition = 'FWD'
    } else if (q.includes('gk') || q.includes('keeper') || q.includes('گۆڵپارێز')) {
      inheritedPosition = 'GK'
    } else {
      // Check prior assistant or user turn for position
      for (let i = history.length - 1; i >= 0; i--) {
        const h = history[i].content.toLowerCase()
        if (h.includes('mid') || h.includes('midfield') || h.includes('میدفیلدەر')) {
          inheritedPosition = 'MID'
          break
        } else if (h.includes('def') || h.includes('defender')) {
          inheritedPosition = 'DEF'
          break
        } else if (h.includes('fwd') || h.includes('forward')) {
          inheritedPosition = 'FWD'
          break
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

    const statusLabel =
      reqGW === 2 ? 'GW2_LIVE' : reqGW === 3 ? 'GW3_UPCOMING' : reqGW === 1 ? 'GW1_COMPLETED' : 'GENERAL'

    return {
      requestedGameweek: reqGW,
      currentActiveGameweek: currentActive,
      nextGameweek: nextGW,
      isLive,
      isCompleted,
      isUpcoming,
      inheritedPosition,
      inheritedBudget,
      snapshotType,
      statusLabel,
    }
  }
}
