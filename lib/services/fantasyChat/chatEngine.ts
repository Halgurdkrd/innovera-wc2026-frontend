import { FantasyChatRequest, FantasyChatResponse, DataSourceType, ReferencedPlayer } from './types'
import { IntentRouter } from './intentRouter'
import { GameweekContextEngine } from './gameweekContextEngine'
import { EntityResolver } from './entityResolver'
import { OfficialFplService } from './officialFplService'
import { EnnoveraPredictionService } from './ennoveraPredictionService'
import { TeamObjectService } from './teamObjectService'
import { FantasyRulesService } from './fantasyRulesService'
import { FANTASY_SYSTEM_PROMPT } from './systemPrompt'
import { buildResearchGroundedAnswer } from './researchGroundingService'

function normalizeNumerals(str: string): string {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
  return str.replace(/[٠-٩]/g, (d) => String(arabicNumerals.indexOf(d)))
}

export class FantasyChatEngine {
  static async processMessage(req: FantasyChatRequest): Promise<FantasyChatResponse> {
    const t0 = Date.now()
    const rawQuestion = req.question.trim()
    const question = normalizeNumerals(rawQuestion)
    const lang = req.language || (question.match(/[\u0600-\u06FF]/) ? 'ku' : 'en')
    const history = req.conversationHistory || []

    // 1. Generic Stale Player Check (e.g. Kevin De Bruyne)
    if (EntityResolver.isStalePlayer(question)) {
      const ans =
        lang === 'ku'
          ? 'کێڤن دی برۆین بەر لە وەرزی ٢٠٢٦-٢٧ پەیوەندی بە یانەی ناپۆلییەوە کردووە و لە ئێستادا لە خولی پریمەرلیگ یان فانتاسیدا بەردەست نییە، بۆیە لە سەرجەم پێکهاتە و پێشنیارەکانی ئێنۆڤێرا دوور خراوەتەوە.'
          : 'Kevin De Bruyne transferred to Napoli prior to the 2026-27 season and is no longer an active Premier League or FPL player. He is excluded from all current Ennovera candidate recommendation pools.'
      return {
        answer: ans,
        intent: 'OFFICIAL_FPL_FACT',
        requestedGameweek: 2,
        contextStatus: 'GW2_LIVE',
        sourceTypes: ['OFFICIAL_FPL'],
        sourceBadge: 'Official FPL Registry',
        referencedPlayers: [],
        suggestedFollowups: ['Who has the highest xP for GW3?', 'Who should I captain for GW3?'],
        generatedAt: new Date().toISOString(),
        dataSnapshot: 'OFFICIAL_2026_27_FPL_REGISTRY',
        llmUsed: false,
        responseTimeMs: Date.now() - t0,
      }
    }

    // 2. Intent Routing & Precedence Check
    const intent = IntentRouter.routeIntent(question, history)

    // Security & Prompt Injection Fast Path
    if (intent === 'PROMPT_INJECTION_ATTEMPT') {
      const ans =
        lang === 'ku'
          ? 'داوای لێبوردن دەکەم، من پابەندم بە پاراستنی ڕێنماییە ناوخۆییەکان و کلیلەکانی سیستەم. تکایە تەنها پرسیاری تایبەت بە فانتاسی و پێشبینییەکانی تۆپی پێ بپرسە.'
          : 'I cannot disclose internal system prompts, API keys, or server credentials. I am strictly configured to assist with Premier League and Fantasy football intelligence.'
      return {
        answer: ans,
        intent,
        requestedGameweek: 2,
        contextStatus: 'GENERAL',
        sourceTypes: ['FPL_RULES'],
        sourceBadge: 'Ennovera Security Policy',
        referencedPlayers: [],
        suggestedFollowups: ['Who should I captain for GW3?', 'How is our AI Manager doing?'],
        generatedAt: new Date().toISOString(),
        dataSnapshot: 'ENNOVERA_SECURITY_POLICY',
        llmUsed: false,
        responseTimeMs: Date.now() - t0,
      }
    }

    // Unsupported Scope Fast Path
    if (intent === 'UNSUPPORTED') {
      const ans =
        lang === 'ku'
          ? 'من یاریدەدەری زیرەکی دەستکردی تایبەتی فانتاسی پریمەرلیگم لە ئێنۆڤێرا. تکایە پرسیار لەبارەی پێشبینی یاریزانان، کاپتنی، تیمی بەڕێوەبەر و ستراتیژی فانتاسی بپرسە.'
          : "I am Ennovera's dedicated Fantasy Premier League assistant. Please ask about player predictions, captaincy, team benchmarks, transfers, or gameweek strategy."
      return {
        answer: ans,
        intent,
        requestedGameweek: 2,
        contextStatus: 'GENERAL',
        sourceTypes: ['FPL_RULES'],
        sourceBadge: 'Ennovera Scope Boundary',
        referencedPlayers: [],
        suggestedFollowups: ['Who has the highest xP for GW3?', 'Compare Saka vs Palmer'],
        generatedAt: new Date().toISOString(),
        dataSnapshot: 'ENNOVERA_SCOPE_BOUNDARY',
        llmUsed: false,
        responseTimeMs: Date.now() - t0,
      }
    }

    // 2b. M3-only Fantasy page context: the caller is the main /fantasy page
    // (now M3-only), so every question is answered from the verified research
    // artifact API using the page's selected model/GW/object as the default
    // context -- never the legacy FPL-03 demo grounding below. An explicit
    // model/GW/object mention in the question still overrides (handled inside
    // buildResearchGroundedAnswer), and the answer is never handed to the LLM
    // for numeric synthesis.
    if (req.pageContext) {
      return buildResearchGroundedAnswer(question, intent, lang, history, req.pageContext)
    }

    // No pageContext (e.g. the homepage's shared assistant, or a direct
    // API caller) -- fantasy-domain questions (selection/ranking/
    // forecast/object-comparison) still route to the current, real
    // research-grounded engine rather than the legacy hardcoded GW2/GW3
    // demo branches below. buildResearchGroundedAnswer resolves "which
    // gameweek" itself (latest registered forecast when nothing else says
    // otherwise) -- it does not require pageContext to answer correctly.
    // Genuinely non-fantasy or gameweek-agnostic intents (methodology
    // explanations, official-fact corrections, live-score narration, FPL
    // rules) are intentionally left on the legacy path below. PLAYER_
    // COMPARISON and BUDGET_QUERY are ALSO intentionally excluded here --
    // buildResearchGroundedAnswer has no multi-player-comparison branch
    // (two names in one question would misfire into its ambiguous-mention
    // clarification) and no price-filter parsing (a "£7m" constraint
    // would be silently dropped), so the legacy path's dedicated handling
    // for those two remains correct without pageContext.
    const FANTASY_DOMAIN_INTENTS: typeof intent[] = [
      'RESEARCH_MODEL_QUERY', 'GAMEWEEK_DELTA', 'TEAM_OBJECT_QUERY',
      'SELECTION_EXPLANATION', 'PREDICTION_RECOMMENDATION',
    ]
    if (FANTASY_DOMAIN_INTENTS.includes(intent)) {
      return buildResearchGroundedAnswer(question, intent, lang, history)
    }

    // 3. Resolve Context & Entities
    const gwContext = GameweekContextEngine.resolveContext(question, req.requestedGameweek, history)
    let referencedPlayers = EntityResolver.resolvePlayers(question)

    // Handle Follow-up entities if referencedPlayers has only 1 player or is follow-up
    if (history.length > 0) {
      for (let i = history.length - 1; i >= 0; i--) {
        const priorPlayers = EntityResolver.resolvePlayers(history[i].content)
        for (const pp of priorPlayers) {
          if (!referencedPlayers.some((p) => p.id === pp.id)) {
            referencedPlayers.push(pp)
          }
        }
      }
    }

    // 4. Retrieve Grounded Structured Domain Data
    const gw2Objects = TeamObjectService.getGW2Objects()
    const gw3Objects = TeamObjectService.getGW3Objects()
    const captainForecastGW2 = EnnoveraPredictionService.getCaptainForecast(2)
    const captainForecastGW3 = EnnoveraPredictionService.getCaptainForecast(3)

    let topBudgetPlayers: ReferencedPlayer[] = []
    if (intent === 'BUDGET_QUERY' || intent === 'PREDICTION_RECOMMENDATION') {
      let pos = gwContext.inheritedPosition || 'MID'
      const qLower = question.toLowerCase()
      if (qLower.includes('def') || qLower.includes('بەرگریکار')) pos = 'DEF'
      if (qLower.includes('fwd') || qLower.includes('forward') || qLower.includes('striker') || qLower.includes('هێرشبەر')) pos = 'FWD'
      if (qLower.includes('gk') || qLower.includes('keeper') || qLower.includes('گۆڵپارێز')) pos = 'GK'

      let maxP = 7.0
      const priceMatch = question.match(/£?(\d+(\.\d+)?)/)
      if (priceMatch) {
        maxP = parseFloat(priceMatch[1])
      }

      topBudgetPlayers = EnnoveraPredictionService.getTopPlayers({
        position: pos,
        maxPrice: maxP,
        gameweek: gwContext.requestedGameweek,
        limit: 5,
      })
    }

    // Build Structured Retrieval Context for LLM
    const structuredContext = {
      requestedGameweek: gwContext.requestedGameweek,
      currentActiveGameweek: gwContext.currentActiveGameweek,
      isLiveGameweek: gwContext.isLive,
      statusLabel: gwContext.statusLabel,
      referencedPlayers: referencedPlayers.map((p) => ({
        id: p.id,
        name: p.name,
        webName: p.webName,
        club: p.club,
        position: p.position,
        price: p.price,
        predictedXp: p.predictedXp,
        actualPointsGW2: p.actualPoints,
        minutesGW2: p.minutes,
        matchStatusGW2: p.matchStatus,
      })),
      gw2AI_Manager: {
        expectedPoints: gw2Objects.aiManagerTeam.expectedPoints,
        liveScore: gw2Objects.aiManagerTeam.liveScore,
        startersFinished: gw2Objects.aiManagerTeam.startersFinished,
        startersRemaining: gw2Objects.aiManagerTeam.startersRemaining,
        captain: gw2Objects.aiManagerTeam.captain,
      },
      gw2BestPlayable100m: {
        expectedPoints: gw2Objects.bestPlayable100m.expectedPoints,
        realizedPoints: gw2Objects.bestPlayable100m.realizedPoints,
        comparisonWithManager: gw2Objects.bestPlayable100m.comparisonWithManager,
      },
      gw2ExpectedBestXI: {
        expectedPoints: gw2Objects.expectedBestXi.expectedPoints,
        realizedPoints: gw2Objects.expectedBestXi.realizedPoints,
      },
      gw3ExpectedBestXI: {
        expectedPoints: gw3Objects.expectedBestXi.expectedPoints,
        likelyRange: gw3Objects.expectedBestXi.likelyRange,
        upsideP80: gw3Objects.expectedBestXi.upsideP80,
      },
      gw3CaptainForecast: captainForecastGW3,
      topBudgetPlayers: topBudgetPlayers.map((p) => ({
        name: p.name,
        club: p.club,
        position: p.position,
        price: p.price,
        predictedXp: p.predictedXp,
      })),
    }

    // 5. Try Real Grounded LLM Generation (Groq / OpenRouter)
    let llmAnswer: string | null = null
    let llmProvider: string | undefined = undefined

    const groqKey = process.env.GROQ_API_KEY
    if (groqKey && groqKey.trim()) {
      try {
        const messages = [
          { role: 'system', content: `${FANTASY_SYSTEM_PROMPT}\n\nRETRIEVED TRUSTED CONTEXT (JSON):\n${JSON.stringify(structuredContext, null, 2)}` },
          ...history.slice(-4).map((h) => ({ role: h.role, content: h.content })),
          { role: 'user', content: rawQuestion },
        ]

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 6000)

        const groqResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            // 'llama-3.3-70b-versatile' was removed from this Groq account's
            // available models (confirmed via a direct API call returning
            // HTTP 404 model_not_found), which silently broke this entire
            // LLM path -- every chat answer was falling back to the
            // deterministic synthesis below without anyone noticing, since
            // that fallback is designed to look like a normal answer.
            model: 'openai/gpt-oss-120b',
            messages,
            temperature: 0.2,
            max_tokens: 350,
          }),
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        if (groqResp.ok) {
          const gData = await groqResp.json()
          llmAnswer = gData.choices?.[0]?.message?.content?.trim() || null
          if (llmAnswer) {
            llmProvider = 'Groq (openai/gpt-oss-120b)'
          }
        }
      } catch (e) {
        // Fallback to deterministic synthesis
      }
    }

    // 6. High-Precision Grounded Synthesis Layer
    let answer = llmAnswer || ''
    let sourceTypes: DataSourceType[] = ['ENNOVERA_FROZEN']
    let sourceBadge = `GW${gwContext.requestedGameweek} • Frozen Pre-Deadline`
    let followups: string[] = []

    const q = question.toLowerCase()

    if (!answer) {
      if (intent === 'TEAM_OBJECT_QUERY') {
        if (q.includes('expected best xi')) {
          answer =
            lang === 'ku'
              ? 'Expected Best XI بریتییە لە بەرزترین پێکهاتەی یاسایی ١١ یاریزانی بۆ گەڕەکە لە ڕووی xP بەبێ مەرجی بوودجەی ١٠٠ ملیۆن بۆ تەواوی ١٥ یاریزانەکە (GW2 = 77.41 xP, GW3 = 83.09 xP).'
              : 'Expected Best XI is the theoretical highest-xP legal 11-player starting XI benchmark under formation and max-3-per-club rules, unconstrained by the £100m 15-player squad limit (GW2: 77.41 xP; GW3: 83.09 xP).'
          sourceBadge = 'Ennovera Benchmark Methodology'
          followups = ['What is Best Playable £100m?', 'Why is Best £100m different from AI Manager?']
        } else if (q.includes('best playable') && !q.includes('different') && !q.includes('differ') && !q.includes('same') && !q.includes('look')) {
          answer =
            lang === 'ku'
              ? 'Best Playable £100m بریتییە لە باشترین پێکهاتەی نوێی یاسایی ١٥ یاریزانی بە بوودجەی کەمتر یان یەکسان بە ١٠٠ ملیۆن، کە لە GW2 دا ٧٥.٤٥ xP پێشبینی کراوە.'
              : 'Best Playable £100m is an independently optimized fresh 15-player squad costing ≤£100m with optimal starting XI and captain (GW2: 75.45 xP; GW3: 80.75 xP).'
          sourceBadge = 'Ennovera Benchmark Methodology'
          followups = ['Which player differs between Manager and Best £100m?', 'What is Expected Best XI?']
        } else {
          answer =
            lang === 'ku'
              ? 'جیاوازی سەرەکی: لە GW2 Best £100m دا سێمێنیۆ (٦.٣٧ xP) لە سەرەکییە و ستاخ لە یەدەگە (کۆی ٧٥.٤٥ xP). لە AI Manager دا ستاخ لە سەرەکییە بۆ پاراستنی گواستنەوەی بێ بەرامبەر (کۆی ٧٤.٠٥ xP).'
              : 'Between GW2 AI Manager (74.05 xP) and Best £100m (75.45 xP), 10/11 starters and 14/15 squad members are shared. The key starting XI difference: Semenyo starts in Best £100m (+1.07 xP over Stach), while Stach starts in AI Manager to bank a Free Transfer for GW3.'
          sourceTypes = ['ENNOVERA_FROZEN', 'DERIVED_COMPUTATION']
          sourceBadge = 'Ennovera Team Object Comparison'
          followups = ['Why did Ennovera select Semenyo instead of Stach?', 'How is our AI Manager doing?']
        }
      } else if (intent === 'SELECTION_EXPLANATION') {
        if (q.includes('semenyo') || q.includes('semnyo') || q.includes('stach') || q.includes('سێمێنیۆ')) {
          answer =
            lang === 'ku'
              ? 'ئێنۆڤێرا لە GW2 Best £100m دا سێمێنیۆی (٦.٣٧ xP) هەڵبژارد لەبری ستاخ (٥.٣٠ xP). هۆکارەکەی دەگەڕێتەوە بۆ بەرزتری خاڵی پێشبینیکراو بە قازانجی +١.٠٧ xP لە پێکهاتەی بێ سنووردا. لە AI Manager دا ستاخ لە سەرەکی مابووەوە بۆ پاراستنی گواستنەوە (Roll FT) بۆ گەڕی سێیەم.'
              : 'In GW2 Best Playable £100m, Ennovera selected Antoine Semenyo (6.37 xP) over Anton Stach (5.30 xP), generating a +1.07 xP gain in midfield. In the AI Manager Team, Stach started to preserve 1 rolled Free Transfer for the GW3 fixture swing.'
          sourceTypes = ['ENNOVERA_FROZEN', 'DERIVED_COMPUTATION']
          sourceBadge = 'GW2 • Team Optimization Constraint'
          followups = ['Compare our Manager Team with Best £100m', 'How many points does Semenyo have?']
        } else if (
          q.includes('haaland') ||
          q.includes('haland') ||
          q.includes('captain') ||
          q.includes('captin') ||
          q.includes('capitan') ||
          q.includes('cpt') ||
          q.includes('هالاند') ||
          q.includes('کاپتن')
        ) {
          answer =
            lang === 'ku'
              ? 'ئێنۆڤێرا لە GW2 دا ئێرلینگ هالاندی کردە کاپتن بە ٧.٩٠ xP پێشبینیکراو. هالاند لە یارییە ڕاستەقینەکەدا ١٣ خاڵی هێنا کە بە کاپتنی بووە ٢٦ خاڵ (جێگری کاپتن: کۆڵ پاڵمەر بوو بە ٧ خاڵ).'
              : 'For GW2, Ennovera selected Erling Haaland (Man City) as captain based on a model-leading 7.90 pre-deadline base xP. He delivered 13 raw points (26 captain points with the 2x multiplier). Vice-captain: Cole Palmer (7 raw pts).'
          sourceTypes = ['ENNOVERA_FROZEN', 'OFFICIAL_FPL']
          sourceBadge = 'Ennovera + Official FPL Live'
          followups = ['Who is the recommended captain for GW3?', 'How is our AI Manager doing?']
        } else {
          answer = `Ennovera's frozen optimization selects players based on objective central expected points (xP) subject to official FPL formation, budget, and squad continuity rules.`
        }
      } else if (intent === 'OFFICIAL_FPL_FACT') {
        if (q.includes('gakpo') || q.includes('pretend') || (q.includes('20') && q.includes('point'))) {
          answer =
            lang === 'ku'
              ? 'بەپێی ئاماری فەرمی گەڕی ٢ی FPL، کۆدی گاکپۆ بە دروستی ٥ خاڵی بەدەستهێنا (نەک ٢٠ خاڵ) لە یاری لیڤەرپوول بەرامبەر نۆتینگهام فۆرێست (٦٨ خولەک یاری کرد، ١ پاسی گۆڵ، ٢ گۆڵی لێکرا).'
              : 'In authentic official Event 2 data, Cody Gakpo scored exactly 5 points (not 20 points) for Liverpool against Nottingham Forest (played 68 mins, 1 assist, 2 goals conceded).'
          sourceTypes = ['OFFICIAL_FPL']
          sourceBadge = 'Official FPL Live Data'
          followups = ['What were Virgil van Dijk points?', 'How many points does Haaland have?']
        } else if (q.includes('virgil') || q.includes('virgl') || q.includes('van dijk') || q.includes('ڤان دایک') || q.includes('ڤێرجیل')) {
          answer =
            lang === 'ku'
              ? 'ڤێرجیل ڤان دایک لە یاری گەڕی ٢ی لیڤەرپوول بەرامبەر نۆتینگهام فۆرێست ٩٠ خولەک یاری کرد. لیڤەرپوول ٢ گۆڵی لێکرا (-١ خاڵ)، بۆیە بە کۆی ١ خاڵی فەرمی یارییەکەی تەواو کرد.'
              : 'Virgil van Dijk played 90 minutes for Liverpool in GW2 against Nottingham Forest. Conceding 2 goals resulted in no clean sheet (0 pts) and a -1 goal concession penalty, giving an official total of 1 FPL point.'
          sourceTypes = ['OFFICIAL_FPL']
          sourceBadge = 'Official FPL Live Data'
          followups = ['How many points does Haaland have?', 'Who has the highest xP for GW3?']
        } else if (q.includes('highest-scoring') || q.includes('highest scoring defender')) {
          answer =
            lang === 'ku'
              ? 'کۆنستانتینۆس تزۆلاکیس (Hull City) بە ١٠ خاڵ لە GW2 دا لە بەرزترین پلەی گۆڵپارێز و بەرگریکاراندایە (کلین شیت + ٣ خاڵی بۆنس).'
              : 'Konstantinos Tzolakis (Hull City, GK) scored 10 official points in GW2 with a clean sheet and 3 bonus points, ranking among the top defensive returns so far.'
          sourceTypes = ['OFFICIAL_FPL']
          sourceBadge = 'Official FPL Live'
          followups = ['How is our AI Manager doing?', 'Who has the highest xP for GW3?']
        } else {
          answer = `Official FPL player records are synchronized directly from Premier League servers.`
        }
      } else if (intent === 'LIVE_GAMEWEEK') {
        if ((q.includes('haaland') || q.includes('haland') || q.includes('هالاند')) && (q.includes('points') || q.includes('point') || q.includes('خاڵ') || q.includes('how did') || q.includes('right now'))) {
          answer =
            lang === 'ku'
              ? 'ئێرلینگ هالاند ٩٠ خولەک یاری کرد بەرامبەر کریستال پالاس، ٢ گۆڵ و ٣ خاڵی بۆنسی تۆمارکرد، و بە ١٣ خاڵی فەرمی یارییەکەی تەواو کرد (٢٦ خاڵ وەک کاپتنی تیمی ئێمە).'
              : 'Erling Haaland played 90 minutes against Crystal Palace, scoring 2 goals with 3 bonus points to finish on 13 official FPL points (26 points as our 2x captain).'
          sourceTypes = ['OFFICIAL_FPL']
          sourceBadge = 'Official FPL Live'
          followups = ['What was Haaland predicted to score?', 'How many points does our AI Manager have?']
        } else if (q.includes('remain') || q.includes('finished') || q.includes('played')) {
          answer =
            lang === 'ku'
              ? 'لە تیمی سەرەکی AI Manager دا ٥ یاریزان یارییەکەیان تەواو کردووە (هالاند، ئیساک، گاکپۆ، ئێڤانیلسۆن، تزۆلاکیس) و ٦ یاریزان یارییەکەیان ماوە (پاڵمەر، ساکا، وایت، دی کویپەر، کایۆدێ، ستاخ).'
              : 'In our GW2 AI Manager starting XI, 5 players have finished their fixtures (Haaland 13, Isak 8, Gakpo 5, Evanilson 5, Tzolakis 10) and 6 players remain to play (Palmer, Saka, White, De Cuyper, Kayode, Stach).'
          sourceTypes = ['OFFICIAL_FPL', 'ENNOVERA_LIVE_MANAGER']
          sourceBadge = 'GW2 • Live Official State'
          followups = ['How many points does our AI Manager have?', 'Why did we captain Haaland?']
        } else {
          answer =
            lang === 'ku'
              ? 'تیمی AI Manager ئێستا ٥٤ خاڵی ڕاستەوخۆی کۆکردۆتەوە (٤١ خاڵی دەستپێک + ١٣ خاڵی زیادەی کاپتن). پێشبینی پێش دەستپێکردن ٧٤.٠٥ xP بوو. ٥ یاریزان تەواو بوون و ٦ یاریزان ماون.'
              : 'Our GW2 AI Manager Team currently has 54 official live points (41 raw starters + 13 captain extra bonus), tracking toward a pre-deadline forecast of 74.05 xP. 5 starters have completed their matches and 6 remain.'
          sourceTypes = ['ENNOVERA_LIVE_MANAGER', 'OFFICIAL_FPL']
          sourceBadge = 'GW2 • Live Official State'
          followups = ['Who has already played?', 'Why are Manager and Best £100m different?']
        }
      } else if (intent === 'BUDGET_QUERY') {
        const pos = gwContext.inheritedPosition || 'MID'
        const posName = pos === 'MID' ? 'midfielder (MID)' : pos === 'DEF' ? 'defender (DEF)' : pos === 'FWD' ? 'forward (FWD)' : 'goalkeeper (GK)'
        const posKuName = pos === 'MID' ? 'میدفیلدەر' : pos === 'DEF' ? 'بەرگریکار' : pos === 'FWD' ? 'هێرشبەر' : 'گۆڵپارێز'
        const topList = topBudgetPlayers
          .map((p, i) => `${i + 1}. ${p.name} (${p.club}, £${p.price.toFixed(1)}m) — ${p.predictedXp?.toFixed(2)} xP`)
          .join('\n')

        answer =
          lang === 'ku'
            ? `باشترین یاریزانانی ${posKuName} بۆ گەڕی ${gwContext.requestedGameweek}:\n${topList}`
            : `Ennovera's top-ranked ${posName} options under £7m for GW${gwContext.requestedGameweek} are:\n${topList}`
        sourceBadge = `GW${gwContext.requestedGameweek} • Budget Optimization`
        followups = [`Compare the top two`, 'Who is the best captain for GW3?']
      } else if (intent === 'PLAYER_COMPARISON' && referencedPlayers.length >= 2) {
        const p1 = referencedPlayers[0]
        const p2 = referencedPlayers[1]
        // Kurdish-script aliases for key players in comparison responses
        const kuNames: Record<number, string> = {
          12: 'ساکا', 154: 'پاڵمەر', 411: 'هالاند', 367: 'گاکپۆ',
          379: 'ئیساک', 397: 'سێمێنیۆ', 335: 'ستاخ', 356: 'ڤان دایک',
          10: 'وایت', 426: 'برۆنۆ', 398: 'فۆدن', 399: 'چێرکی',
        }
        const kn1 = lang === 'ku' ? (kuNames[p1.id] || p1.name) : p1.name
        const kn2 = lang === 'ku' ? (kuNames[p2.id] || p2.name) : p2.name
        answer =
          lang === 'ku'
            ? `بەراوردی ${kn1} و ${kn2}:\n• ${kn1} (${p1.club}, £${p1.price.toFixed(1)}m): ${p1.predictedXp?.toFixed(2)} xP\n• ${kn2} (${p2.club}, £${p2.price.toFixed(1)}m): ${p2.predictedXp?.toFixed(2)} xP\nئێنۆڤێرا پێشبینی دەکات ${(p1.predictedXp || 0) > (p2.predictedXp || 0) ? kn1 : kn2} ئاستی بەرزتر بێت بە جیاوازی ${Math.abs((p1.predictedXp || 0) - (p2.predictedXp || 0)).toFixed(2)} xP.`
            : `Comparison of ${p1.name} vs ${p2.name}:\n• ${p1.name} (${p1.club}, £${p1.price.toFixed(1)}m): ${p1.predictedXp?.toFixed(2)} xP\n• ${p2.name} (${p2.club}, £${p2.price.toFixed(1)}m): ${p2.predictedXp?.toFixed(2)} xP\nEnnovera projects ${(p1.predictedXp || 0) > (p2.predictedXp || 0) ? p1.name : p2.name} with the higher expected return (+${Math.abs((p1.predictedXp || 0) - (p2.predictedXp || 0)).toFixed(2)} xP).`
        sourceBadge = `GW${gwContext.requestedGameweek} • Player Comparison`
        followups = [`Who should I captain between ${p1.webName} and ${p2.webName}?`, 'Who has the highest xP for GW3?']
      } else if (intent === 'PLAYER_COMPARISON' && referencedPlayers.length === 1) {
        const p = referencedPlayers[0]
        answer =
          lang === 'ku'
            ? `${p.name} (${p.club}, £${p.price.toFixed(1)}m) خاوەنی ${p.predictedXp?.toFixed(2)} xP یە بۆ گەڕی ٣، کە بژاردەیەکی زۆر بەهێزە.`
            : `${p.name} (${p.club}, £${p.price.toFixed(1)}m) has an expected score of ${p.predictedXp?.toFixed(2)} xP for GW3.`
        sourceBadge = `GW${gwContext.requestedGameweek} • Player Comparison`
        followups = ['Who has the highest xP for GW3?', 'Who should I captain for GW3?']
      } else if (intent === 'METHODOLOGY_QUERY') {
        if (q.includes('p80') || q.includes('p90') || q.includes('likely range')) {
          answer =
            lang === 'ku'
              ? 'P80 (Upside Score) و P90 خاڵەکانی سەدی ٨٠ و ٩٠ی ئەگەری مۆدێلەکەن، کە نیشانی دەدەن ئەگەر یاریزانێک یارییەکی زۆر باش بکات دەتوانێت چەند خاڵ بەدەست بهێنێت. Likely Range ڕێژەی ٥٠٪ی ناوەڕاستی ئەگەرەکانە [P25, P75].'
              : 'P80 (80th percentile) and P90 (90th percentile) represent high-upside score potentials under favorable match conditions. The Likely Range [P25, P75] encompasses the central 50% probability distribution mass.'
          sourceBadge = 'Ennovera Hybrid Methodology'
          followups = ['What is Expected Best XI?', 'Who has the highest xP for GW3?']
        } else {
          answer =
            lang === 'ku'
              ? 'xP بریتییە لە تێکڕای چاوەڕوانکراوی بیرکاری (Mean Expectation). ئەنجامە ڕاستەقینەکان بەهۆی گۆڵ، پاسی گۆڵ و بۆنس دەتوانن بگەنە ڕێژەی سەرەوەی ئەگەرەکان (P80/P90).'
              : 'Expected points (xP) represents the mathematical mean of a score probability distribution. Individual match outcomes with goals, assists, or bonus hauls naturally reach upside percentiles (P80/P90), exceeding the mean expectation.'
          sourceBadge = 'Ennovera Hybrid Methodology'
          followups = ['What is Expected Best XI?', 'Who should I captain for GW3?']
        }
      } else {
        // Prediction / Captain Default
        if (q.includes('predicted to score') || (q.includes('predicted') && (q.includes('haaland') || q.includes('هالاند')))) {
          answer =
            lang === 'ku'
              ? 'بۆ گەڕی ٢ (GW2)، ئێرلینگ هالاند پێشبینی ٧.٩٠ xP ی بۆ کرابوو، کە لە یارییە فەرمییەکەدا ١٣ خاڵی هێنا. بۆ گەڕی ٣ (GW3)، پێشبینی ١١.٧٧ xP ی بۆ کراوە.'
              : 'For GW2, Erling Haaland was projected at 7.90 base xP against Crystal Palace (realizing 13 actual points). For the upcoming GW3, he is projected at 11.77 xP against Brighton.'
          sourceBadge = 'GW2 & GW3 • Model Projections'
          followups = ['Who should I captain for GW3?', 'How is our AI Manager doing?']
        } else if (q.includes('captain') || q.includes('who should i captain') || q.includes('کاپتن')) {
          if (gwContext.requestedGameweek === 2) {
            answer =
              lang === 'ku'
                ? 'بۆ GW2، ئێنۆڤێرا ئێرلینگ هالاندی کردە کاپتن بە ٧.٩٠ xP، کە لە یارییە ڕاستەقینەکەدا ١٣ خاڵی هێنا (٢٦ خاڵ بە کاپتنی).'
                : 'For GW2, Ennovera selected Erling Haaland as captain (7.90 projected xP), realizing 13 official points (26 pts with 2x multiplier).'
          } else {
            answer =
              lang === 'ku'
                ? 'بۆ گەڕی ٣، ئێنۆڤێرا ئێرلینگ هالاند (Man City) پێشنیار دەکات وەک کاپتن بە ١١.٧٧ xP (٢٣.٥٤ خاڵی کاپتنی) و ئەگەری هاتی ٥٨٪. جێگری کاپتن: ئەنتوان سێمێنیۆ (٧.٩٩ xP).'
                : 'For GW3, Ennovera recommends Erling Haaland (Man City) as captain with 11.77 base xP (23.54 captain xP) and a 58% haul probability. Top vice-captain: Antoine Semenyo (7.99 xP).'
          }
          sourceBadge = `GW${gwContext.requestedGameweek} • Captain Model`
          followups = ['Saka or Palmer for GW3?', 'Best midfielder under £7m next Gameweek?']
        } else if (q.includes('highest xp') || q.includes('who has the highest xp') || q.includes('highest gw3 xp') || q.includes('بەرزترین xp')) {
          answer =
            lang === 'ku'
              ? 'بۆ گەڕی ٣، ئێرلینگ هالاند (Man City) بەرزترین xP ی هەیە بە ١١.٧٧ xP، بەدوایدا کۆڵ پاڵمەر (٨.٤٥ xP) و ئەنتوان سێمێنیۆ (٧.٩٩ xP).'
              : 'For GW3, Erling Haaland (Man City) holds the highest projected score at 11.77 xP, followed by Cole Palmer (8.45 xP) and Antoine Semenyo (7.99 xP).'
          sourceBadge = 'GW3 • Ennovera Model Frontier'
          followups = ['Who should I captain for GW3?', 'Best midfielder under £7m next Gameweek?']
        } else {
          answer =
            lang === 'ku'
              ? 'ئێنۆڤێرا لە ڕێگەی مۆدێلی ئەگەری و پێشبینی پێش دەستپێکردنی یارییەکان ڕێنمایی ورد دەدات بۆ گواستنەوە، کاپتنی و هەڵبژاردنی یاریزانان.'
              : 'Ennovera provides probabilistic Fantasy Premier League intelligence, combining frozen pre-deadline expected points with authentic match realizations.'
          followups = ['Who should I captain for GW3?', 'How is our AI Manager doing?']
        }
      }
    }

    // Every answer on this legacy path is grounded in the fixed 2026-27
    // GW2/GW3 demo snapshot (see systemPrompt.ts rule 9), never a live feed.
    // The deterministic fallback text below was written before that data
    // was understood to be presentable as "current" -- append one honest
    // trailing line for the advice-giving intents specifically, since those
    // are the ones most likely to be mistaken for a live recommendation.
    // The LLM path already carries this instruction in its own system
    // prompt, so it is not double-appended there.
    const adviceIntents: typeof intent[] = ['PREDICTION_RECOMMENDATION', 'SELECTION_EXPLANATION', 'TEAM_OBJECT_QUERY', 'METHODOLOGY_QUERY', 'BUDGET_QUERY', 'PLAYER_COMPARISON']
    if (!llmAnswer && adviceIntents.includes(intent)) {
      answer += lang === 'ku'
        ? '\n\n(تێبینی: ئەمە نمونەیەکی جێگیری وەرزی ٢٠٢٦-٢٧ گەڕی ٢/٣ یە، نەک داتای ڕاستەقینەی ئێستا.)'
        : '\n\n(Note: this is a fixed 2026-27 season GW2/GW3 demo snapshot, not a live current-gameweek feed.)'
    }

    return {
      answer,
      intent,
      requestedGameweek: gwContext.requestedGameweek,
      contextStatus: gwContext.statusLabel,
      sourceTypes,
      sourceBadge,
      referencedPlayers: referencedPlayers.length > 0 ? referencedPlayers : topBudgetPlayers.slice(0, 3),
      suggestedFollowups: followups.length > 0 ? followups : ['Who should I captain for GW3?', 'How is our AI Manager doing?'],
      generatedAt: new Date().toISOString(),
      dataSnapshot: gwContext.snapshotType,
      isHistoricalDemoSnapshot: true,
      demoSnapshotLabel: 'Fixed 2026-27 season GW2/GW3 demo snapshot (FPL-03)',
      llmUsed: !!llmAnswer,
      llmProvider,
      responseTimeMs: Date.now() - t0,
    }
  }
}
