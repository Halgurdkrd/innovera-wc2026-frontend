import { ChatIntent } from './types'

export class IntentRouter {
  static routeIntent(question: string): ChatIntent {
    const q = question.toLowerCase().trim()

    // 1. Prompt Injection / Security Filter
    if (
      (q.includes('ignore') && (q.includes('rule') || q.includes('instruction') || q.includes('prompt'))) ||
      (q.includes('reveal') && (q.includes('key') || q.includes('secret') || q.includes('system') || q.includes('api'))) ||
      q.includes('system prompt') ||
      q.includes('api_key') ||
      q.includes('disregard')
    ) {
      return 'PROMPT_INJECTION_ATTEMPT'
    }

    // 2. Off-topic / Unsupported Filter
    if (
      q.includes('python') ||
      q.includes('javascript') ||
      q.includes('write code') ||
      q.includes('mars') ||
      q.includes('politics') ||
      q.includes('medical') ||
      q.includes('weather')
    ) {
      return 'UNSUPPORTED'
    }

    // 3. Team Object Query & Comparison (HIGH PRECEDENCE)
    if (
      q.includes('expected best xi') ||
      q.includes('best playable') ||
      q.includes('best £100m') ||
      q.includes('best 100m') ||
      q.includes('different between') ||
      q.includes('difference between') ||
      (q.includes('why is') && q.includes('different')) ||
      q.includes('which player differs') ||
      q.includes('team object') ||
      q.includes('74.05') ||
      q.includes('75.45')
    ) {
      return 'TEAM_OBJECT_QUERY'
    }

    // 4. Selection Explanation
    if (
      q.startsWith('why did') ||
      q.startsWith('why is') ||
      q.includes('why is stach') ||
      q.includes('why did ennovera select') ||
      q.includes('why is semenyo') ||
      q.includes('why did we captain') ||
      q.includes('why did ennovera pick') ||
      q.includes('why did ennovera captain')
    ) {
      return 'SELECTION_EXPLANATION'
    }

    // 5. Official FPL Fact (Virgil, points, goals, clean sheets, false claim correction)
    if (
      q.includes('virgil') ||
      q.includes('van dijk') ||
      q.includes('pretend') ||
      q.includes('highest-scoring fpl defender') ||
      q.includes('highest scoring defender') ||
      q.includes('current price') ||
      q.includes('how many goals') ||
      q.includes('has saka played') ||
      q.includes('official fpl')
    ) {
      return 'OFFICIAL_FPL_FACT'
    }

    // 6. Live Gameweek Score & Match State
    if (
      q.includes('how many points does our ai manager') ||
      q.includes('manager score') ||
      q.includes('live score') ||
      q.includes('how is our ai manager doing') ||
      q.includes('how did haaland do') ||
      q.includes('how many points does haaland have right now') ||
      q.includes('who has already played') ||
      q.includes('how many players remain') ||
      q.includes('bench points') ||
      q.includes('finished')
    ) {
      return 'LIVE_GAMEWEEK'
    }

    // 7. Player Comparison
    if (
      (q.includes(' or ') && (q.includes('saka') || q.includes('palmer') || q.includes('haaland') || q.includes('isak'))) ||
      q.includes(' vs ') ||
      q.includes('compare ')
    ) {
      return 'PLAYER_COMPARISON'
    }

    // 8. Budget Filtered Query
    if (
      (q.includes('under £') || q.includes('under ') || q.includes('below £') || q.includes('cheaper') || q.includes('budget')) &&
      (q.includes('midfielder') || q.includes('forward') || q.includes('defender') || q.includes('striker'))
    ) {
      return 'BUDGET_QUERY'
    }

    // 9. Methodology & Terms
    if (
      q.includes('what is xp') ||
      q.includes('what does xp mean') ||
      q.includes('what is likely range') ||
      q.includes('what does p80 mean') ||
      q.includes('what is p80') ||
      q.includes('what does p90 mean') ||
      q.includes('why can actual score exceed') ||
      q.includes('what model')
    ) {
      return 'METHODOLOGY_QUERY'
    }

    // 10. Prediction & Ranking Recommendation (Default)
    if (
      q.includes('highest xp') ||
      q.includes('top five') ||
      q.includes('top 5') ||
      q.includes('who should i captain') ||
      q.includes('best captain') ||
      q.includes('best midfielder') ||
      q.includes('best defender') ||
      q.includes('best forward') ||
      q.includes('differential') ||
      q.includes('haul probability') ||
      q.includes('predicted to score') ||
      q.includes('predicted') ||
      q.includes('forecast')
    ) {
      return 'PREDICTION_RECOMMENDATION'
    }

    // 11. General FPL Rules
    if (
      q.includes('free transfer') ||
      q.includes('wildcard') ||
      q.includes('triple captain') ||
      q.includes('bench boost') ||
      q.includes('autosub') ||
      q.includes('fpl rule')
    ) {
      return 'GENERAL_FPL_RULE_QUERY'
    }

    return 'PREDICTION_RECOMMENDATION'
  }
}
