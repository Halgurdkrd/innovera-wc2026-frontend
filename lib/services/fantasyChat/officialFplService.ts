import { ReferencedPlayer } from './types'

export class OfficialFplService {
  private static cachedElements: Map<number, ReferencedPlayer> = new Map()
  private static lastFetch = 0

  static async initRegistry(): Promise<void> {
    if (this.cachedElements.size > 0 && Date.now() - this.lastFetch < 60000) {
      return
    }

    this.cachedElements.clear()

    // Canonical active 2026-27 players with position, prices and GW3 xP
    const canonicalPool: ReferencedPlayer[] = [
      { id: 411, name: 'Erling Haaland', webName: 'Haaland', club: 'Man City', position: 'FWD', price: 15.0, predictedXp: 11.77, actualPoints: 13, minutes: 90, matchStatus: 'FT', isCaptain: true },
      { id: 154, name: 'Cole Palmer', webName: 'Palmer', club: 'Chelsea', position: 'MID', price: 10.5, predictedXp: 8.45, actualPoints: 0, minutes: null, matchStatus: 'NOT_STARTED', isViceCaptain: true },
      { id: 397, name: 'Antoine Semenyo', webName: 'Semenyo', club: 'Man City', position: 'MID', price: 5.5, predictedXp: 7.99, actualPoints: 0, minutes: null, matchStatus: 'NOT_STARTED' },
      { id: 399, name: 'Rayan Cherki', webName: 'Cherki', club: 'Man City', position: 'MID', price: 6.5, predictedXp: 7.35, actualPoints: 0, minutes: null, matchStatus: 'NOT_STARTED' },
      { id: 379, name: 'Alexander Isak', webName: 'Isak', club: 'Liverpool', position: 'FWD', price: 8.5, predictedXp: 7.25, actualPoints: 8, minutes: 90, matchStatus: 'FT' },
      { id: 12, name: 'Bukayo Saka', webName: 'Saka', club: 'Arsenal', position: 'MID', price: 10.0, predictedXp: 7.10, actualPoints: 0, minutes: null, matchStatus: 'NOT_STARTED' },
      { id: 426, name: 'Bruno Fernandes', webName: 'Bruno Fernandes', club: 'Man Utd', position: 'MID', price: 8.5, predictedXp: 6.85, actualPoints: 0, minutes: null, matchStatus: 'NOT_STARTED' },
      { id: 366, name: 'Florian Wirtz', webName: 'Wirtz', club: 'Liverpool', position: 'MID', price: 8.5, predictedXp: 6.18, actualPoints: 0, minutes: null, matchStatus: 'NOT_STARTED' },
      { id: 367, name: 'Cody Gakpo', webName: 'Gakpo', club: 'Liverpool', position: 'MID', price: 7.5, predictedXp: 5.80, actualPoints: 5, minutes: 68, matchStatus: 'FT' },
      { id: 79, name: 'Evanilson', webName: 'Evanilson', club: 'Bournemouth', position: 'FWD', price: 6.0, predictedXp: 5.40, actualPoints: 5, minutes: 78, matchStatus: 'FT' },
      { id: 335, name: 'Anton Stach', webName: 'Stach', club: 'Leeds', position: 'MID', price: 5.5, predictedXp: 5.10, actualPoints: 0, minutes: null, matchStatus: 'NOT_STARTED' },
      { id: 572, name: 'Konstantinos Tzolakis', webName: 'Tzolakis', club: 'Hull City', position: 'GK', price: 4.5, predictedXp: 4.60, actualPoints: 10, minutes: 90, matchStatus: 'FT' },
      { id: 4, name: 'Gabriel Magalhães', webName: 'Gabriel', club: 'Arsenal', position: 'DEF', price: 6.0, predictedXp: 4.80, actualPoints: 0, minutes: null, matchStatus: 'NOT_STARTED' },
      { id: 10, name: 'Ben White', webName: 'White', club: 'Arsenal', position: 'DEF', price: 6.5, predictedXp: 4.65, actualPoints: 0, minutes: null, matchStatus: 'NOT_STARTED' },
      { id: 356, name: 'Virgil van Dijk', webName: 'Virgil', club: 'Liverpool', position: 'DEF', price: 6.5, predictedXp: 4.51, actualPoints: 1, minutes: 90, matchStatus: 'FT' },
      { id: 115, name: 'Maxim De Cuyper', webName: 'De Cuyper', club: 'Brighton', position: 'DEF', price: 4.5, predictedXp: 4.20, actualPoints: 0, minutes: null, matchStatus: 'NOT_STARTED' },
      { id: 88, name: 'Michael Kayode', webName: 'Kayode', club: 'Brentford', position: 'DEF', price: 4.5, predictedXp: 3.90, actualPoints: 0, minutes: null, matchStatus: 'NOT_STARTED' },
      { id: 254, name: 'Antonee Robinson', webName: 'Robinson', club: 'Fulham', position: 'DEF', price: 4.5, predictedXp: 3.80, actualPoints: 2, minutes: 90, matchStatus: 'FT' },
      { id: 565, name: 'Ibrahim Sangaré', webName: 'Sangaré', club: 'Nott\'m Forest', position: 'MID', price: 4.5, predictedXp: 3.40, actualPoints: 3, minutes: 90, matchStatus: 'FT' },
      { id: 586, name: 'Nampalys Mendy', webName: 'Mendy', club: 'Leicester', position: 'MID', price: 4.5, predictedXp: 2.90, actualPoints: 1, minutes: 22, matchStatus: 'FT' },
      { id: 111, name: 'Jason Steele', webName: 'Steele', club: 'Brighton', position: 'GK', price: 4.0, predictedXp: 2.50, actualPoints: 0, minutes: null, matchStatus: 'NOT_STARTED' },
      { id: 350, name: 'Alisson Becker', webName: 'Alisson', club: 'Liverpool', position: 'GK', price: 5.5, predictedXp: 4.40, actualPoints: 2, minutes: 90, matchStatus: 'FT' },
    ]

    for (const p of canonicalPool) {
      this.cachedElements.set(p.id, p)
    }

    this.lastFetch = Date.now()
  }

  static async getPlayerById(id: number): Promise<ReferencedPlayer | null> {
    await this.initRegistry()
    return this.cachedElements.get(id) || null
  }

  static async getAllActivePlayers(): Promise<ReferencedPlayer[]> {
    await this.initRegistry()
    return Array.from(this.cachedElements.values())
  }
}
