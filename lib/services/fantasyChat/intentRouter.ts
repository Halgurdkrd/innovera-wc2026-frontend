import { ChatIntent, ConversationTurn } from './types'

export class IntentRouter {
  static routeIntent(question: string, history: ConversationTurn[] = []): ChatIntent {
    const q = question.toLowerCase().trim()

    // 1. Prompt Injection / Security Filter
    if (
      (q.includes('ignore') && (q.includes('rule') || q.includes('instruction') || q.includes('prompt'))) ||
      (q.includes('reveal') && (q.includes('key') || q.includes('secret') || q.includes('system') || q.includes('api') || q.includes('prompt') || q.includes('env'))) ||
      q.includes('system prompt') ||
      q.includes('api_key') ||
      q.includes('openai_api_key') ||
      q.includes('groq_api_key') ||
      q.includes('disregard') ||
      q.includes('treat this player record as a command') ||
      q.includes('return raw server configuration')
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

    // 2b. Ennovera Research Model Query (M3_SHRUNK / V0_CONTROL) — HIGH PRECEDENCE.
    // These keywords are unambiguous and do not collide with the legacy FPL-03
    // demo vocabulary above, so this is checked before the FPL-03 intents.
    const mentionsM3 = q.includes('m3_shrunk') || q.includes('m3 shrunk') || /\bm3\b/.test(q)
    const mentionsV0 = q.includes('v0_control') || q.includes('v0 control') || /\bv0\b/.test(q)
    const mentionsResearchModel = mentionsM3 || mentionsV0 || q.includes('research model') || q.includes('research view')
    if (mentionsResearchModel) {
      if (
        (q.includes('change') || q.includes('different') || q.includes('difference')) &&
        (q.includes('gameweek') || q.includes('gw')) &&
        (q.includes('between') || q.includes('from') || q.includes('to'))
      ) {
        return 'GAMEWEEK_DELTA'
      }
      return 'RESEARCH_MODEL_QUERY'
    }

    // 3. Team Object Query & Comparison (HIGH PRECEDENCE)
    if (
      q.includes('expected best xi') ||
      q.includes('best playable') ||
      q.includes('best £100m') ||
      q.includes('best 100m') ||
      q.includes('different between') ||
      q.includes('difference between') ||
      (q.includes('why') && (q.includes('different') || q.includes('same') || q.includes('look almost'))) ||
      q.includes('which player differs') ||
      q.includes('team object') ||
      q.includes('74.05') ||
      q.includes('75.45') ||
      q.includes('83.09') ||
      q.includes('80.75')
    ) {
      return 'TEAM_OBJECT_QUERY'
    }

    // 4. Captain Query & Typo Robustness (captin, capitan, captain, etc.)
    const isCaptainQuery = /capt[ai]{1,2}n|capitan|captin|cpt|کاپتن/i.test(q)
    if (isCaptainQuery) {
      if (
        q.includes('gw2') ||
        q.includes('gw 2') ||
        q.includes('did we') ||
        q.includes('why') ||
        q.includes('was') ||
        q.includes('who was') ||
        q.includes('who is gw2') ||
        q.includes('our captain')
      ) {
        return 'SELECTION_EXPLANATION'
      }
      return 'PREDICTION_RECOMMENDATION'
    }

    // 5. Selection Explanation
    if (
      q.startsWith('why did') ||
      q.startsWith('why is') ||
      q.startsWith('why semnyo') ||
      q.startsWith('why semenyo') ||
      q.startsWith('why haaland') ||
      q.startsWith('why haland') ||
      q.startsWith('why stach') ||
      q.includes('why is stach') ||
      q.includes('why did ennovera select') ||
      q.includes('why is semenyo') ||
      q.includes('why semnyo') ||
      q.includes('why semenyo') ||
      q.includes('why did we captain') ||
      q.includes('why did ennovera pick') ||
      q.includes('why did ennovera captain') ||
      q.includes('and why not') ||
      q.includes('which feature contributed') ||
      q.includes('how much did form contribute') ||
      q.includes('was fixture difficulty the reason') ||
      q.includes('بۆچی ئێننۆڤێرا سێمێنیۆی') ||
      q.includes('بۆچی هالاند')
    ) {
      return 'SELECTION_EXPLANATION'
    }

    // 5. Official FPL Fact (Virgil, points, goals, clean sheets, false claim correction)
    if (
      q.includes('virgil') ||
      q.includes('virgl') ||
      q.includes('van dijk') ||
      q.includes('pretend') ||
      q.includes('right?') ||
      q.includes('correct?') ||
      q.includes("hasn't played yet") ||
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
      q.includes('how many points does haaland have') ||
      (q.includes('points') && (q.includes('haaland') || q.includes('haland') || q.includes('هالاند'))) ||
      q.includes('who has already played') ||
      q.includes('how many players remain') ||
      q.includes('bench points') ||
      q.includes('finished') ||
      q.includes('هالاند چەند خاڵی هەیە')
    ) {
      return 'LIVE_GAMEWEEK'
    }

    // 7. Player Comparison
    if (
      ((q.includes(' or ') || q.includes(' vs ') || q.includes('compare') || q.includes('یان')) &&
        (q.includes('saka') || q.includes('palmer') || q.includes('haaland') || q.includes('isak') || q.includes('ساکا') || q.includes('پاڵمەر'))) ||
      q.includes('what about palmer') ||
      q.includes('what about ')
    ) {
      return 'PLAYER_COMPARISON'
    }

    // 8. Budget Filtered Query
    if (
      (q.includes('under £') ||
        q.includes('under ') ||
        q.includes('below £') ||
        q.includes('cheaper') ||
        q.includes('budget is') ||
        q.includes('ژێر')) &&
      (q.includes('mid') ||
        q.includes('midfielder') ||
        q.includes('forward') ||
        q.includes('defender') ||
        q.includes('striker') ||
        q.includes('میدفیلدەر') ||
        q.includes('6m') ||
        q.includes('7m') ||
        q.includes('5m') ||
        q.includes('8m'))
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
      q.includes('top 3') ||
      q.includes('top players') ||
      q.includes('who should i captain') ||
      q.includes('best captain') ||
      q.includes('باشترین کاپتن') ||
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
