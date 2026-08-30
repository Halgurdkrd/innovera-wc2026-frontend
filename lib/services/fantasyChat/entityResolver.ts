import { OfficialFplService } from './officialFplService'
import { ReferencedPlayer } from './types'

export class EntityResolver {
  private static playerAliases: Record<string, number> = {
    'haaland': 411,
    'haland': 411,
    'erling': 411,
    'erling haaland': 411,
    'saka': 12,
    'bukayo': 12,
    'bukayo saka': 12,
    'palmer': 154,
    'cole palmer': 154,
    'gakpo': 367,
    'cody gakpo': 367,
    'isak': 379,
    'alexander isak': 379,
    'semenyo': 397,
    'semnyo': 397,
    'antoine semenyo': 397,
    'stach': 335,
    'anton stach': 335,
    'evanilson': 79,
    'tzolakis': 572,
    'konstantinos tzolakis': 572,
    'white': 10,
    'ben white': 10,
    'benjamin white': 10,
    'de cuyper': 115,
    'maxim de cuyper': 115,
    'kayode': 88,
    'michael kayode': 88,
    'sangare': 565,
    'sangaré': 565,
    'ibrahim sangare': 565,
    'ibrahim sangaré': 565,
    'robinson': 254,
    'antonee robinson': 254,
    'mendy': 586,
    'nampalys mendy': 586,
    'steele': 111,
    'jason steele': 111,
    'alisson': 350,
    'alisson becker': 350,
    'gabriel': 4,
    'gabriel magalhaes': 4,
    'gabriel magalhães': 4,
    'bruno': 426,
    'bruno fernandes': 426,
    'b.fernandes': 426,
    'virgil': 356,
    'virgl': 356,
    'van dijk': 356,
    'vvd': 356,
    'virgil van dijk': 356,
    'saliba': 6,
    'william saliba': 6,
    'raya': 1,
    'david raya': 1,
    'rice': 13,
    'declan rice': 13,
    'mbeumo': 427,
    'bryan mbeumo': 427,
    'cherki': 399,
    'rayan cherki': 399,
    'wirtz': 366,
    'florian wirtz': 366,
    'watkins': 55,
    'ollie watkins': 55,
    'foden': 398,
    'phil foden': 398,
  }

  // Kurdish transliterations mapping
  private static kurdishPlayerMap: Record<string, number> = {
    'هالاند': 411,
    'پاڵمەر': 154,
    'پاڵمێر': 154,
    'ساکا': 12,
    'سێمێنیۆ': 397,
    'سیمینیۆ': 397,
    'ستاخ': 335,
    'گاکپۆ': 367,
    'ئیساک': 379,
    'ڤان دایک': 356,
    'ڤێرجیل': 356,
    'تزۆلاکیس': 572,
    'ئێڤانیلسۆن': 79,
    'برۆنۆ': 426,
    'ڤێرتز': 366,
    'چێرکی': 399,
  }

  private static stalePlayerNames = [
    'de bruyne',
    'kevin de bruyne',
    'kdb',
    'دی برۆین',
    'کێڤن دی برۆین',
  ]

  static isStalePlayer(query: string): boolean {
    const q = query.toLowerCase().trim()
    return this.stalePlayerNames.some((s) => q.includes(s))
  }

  static resolvePlayers(text: string): ReferencedPlayer[] {
    const normalized = text.toLowerCase()
    const foundIds = new Set<number>()

    // Check English aliases with boundary / typo matching
    for (const [alias, id] of Object.entries(this.playerAliases)) {
      if (normalized.includes(alias)) {
        foundIds.add(id)
      }
    }

    // Check Kurdish transliterations
    for (const [kuName, id] of Object.entries(this.kurdishPlayerMap)) {
      if (text.includes(kuName)) {
        foundIds.add(id)
      }
    }

    const resolved: ReferencedPlayer[] = []
    const idList = Array.from(foundIds)
    for (const id of idList) {
      const p = OfficialFplService.getPlayerById(id)
      if (p) {
        resolved.push(p)
      }
    }

    return resolved
  }
}
