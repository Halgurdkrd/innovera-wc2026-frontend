import rulesData from '@/lib/data/fpl_rules.json'

export class FantasyRulesService {
  static getRules() {
    return rulesData
  }

  static answerRuleQuestion(question: string, lang: 'en' | 'ku' = 'en'): string | null {
    const q = question.toLowerCase()

    if (q.includes('free transfer') || q.includes('how many transfer') || q.includes('banked transfer') || q.includes('transfer hit')) {
      if (lang === 'ku') {
        return 'لە فانتاسیدا، لە هەر گەڕێکدا ١ گواستنەوەی بێ بەرامبەر وەردەگریت. دەتوانیت تا ٥ گواستنەوە کۆبکەیتەوە. هەر گواستنەوەیەکی زیادە ٤ خاڵ لە کۆی گشتیت کەم دەکاتەوە.'
      }
      return 'In FPL 2026-27, managers receive 1 free transfer per gameweek and can bank up to 5 free transfers. Each additional transfer costs a 4-point deduction (hit).'
    }

    if (q.includes('wildcard') || q.includes('free hit') || q.includes('triple captain') || q.includes('bench boost') || q.includes('chip')) {
      if (lang === 'ku') {
        return 'چیپە بەردەستەکانی وەرزی ٢٠٢٦-٢٧: Wildcard (٢ جار، یەکەم پێش گەڕی ٢٠، دووەم دوای گەڕی ٢٠)، Free Hit (٢ جار)، Bench Boost (٢ جار)، و Triple Captain (٢ جار). لە هەر گەڕێکدا تەنها ١ چیپ کارا دەکرێت.'
      }
      return 'FPL 2026-27 provides two sets of chips across the season: Wildcard (GW1-19 & GW20-38), Free Hit (GW1-19 & GW20-38), Bench Boost (GW1-19 & GW20-38), and Triple Captain (GW1-19 & GW20-38). Only one chip may be active per gameweek.'
    }

    if (q.includes('captain') || q.includes('vice captain') || q.includes('captaincy')) {
      if (lang === 'ku') {
        return 'کاپتن خاڵەکانی دوو هێندە دەبێت (2x). ئەگەر کاپتن هیچ خولەکێک یاری نەکات، جێگری کاپتن دەبێتە کاپتن و خاڵەکانی دوو هێندە دەبێت.'
      }
      return "Your captain's score is doubled (2x). If your captain plays 0 minutes, the vice-captain automatically inherits the 2x multiplier."
    }

    if (q.includes('autosub') || q.includes('bench') || q.includes('substitution')) {
      if (lang === 'ku') {
        return 'ئەگەر یاریزانێکی سەرەکی یاری نەکات (٠ خولەک)، یاریزانی یەدەگ بەپێی ڕیزبەندی شوێنی دەگرێتەوە، بە مەرجێک یاسای پێکهاتە (لانیکەم ٣ بەرگریکار، ٢ ناوەند، ١ هێرشبەر) نەشکێت.'
      }
      return 'Automatic substitutions activate at the end of the gameweek if a starting player plays 0 minutes. Bench players replace them in priority order (Bench 1 -> 2 -> 3), provided valid formation constraints (min 3 DEF, 2 MID, 1 FWD) are maintained.'
    }

    if (q.includes('clean sheet') || q.includes('scoring') || q.includes('points')) {
      if (lang === 'ku') {
        return 'خاڵەکانی کلین شیت: گۆڵپارێز و بەرگریکار = ٤ خاڵ، ناوەند = ١ خاڵ (بە مەرجی یاری کردنی ٦٠ خولەک یان زیاتر). گۆڵ: گۆڵپارێز/بەرگریکار = ٦ خاڵ، ناوەند = ٥ خاڵ، هێرشبەر = ٤ خاڵ.'
      }
      return 'Clean sheet points (60+ mins played): Goalkeepers & Defenders earn 4 pts; Midfielders earn 1 pt. Goals scored: GK/DEF = 6 pts, MID = 5 pts, FWD = 4 pts. Assists award 3 pts across all positions.'
    }

    return null
  }
}
