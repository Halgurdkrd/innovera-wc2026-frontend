import { ReferencedPlayer } from './types'
import allPlayersData from '@/lib/data/fpl_player_registry.json'
import performanceData from '@/lib/data/fpl_performance.json'

export class OfficialFplService {
  private static playerMap: Map<number, any> = new Map()
  private static isInitialized = false

  static init(): void {
    if (this.isInitialized) return
    this.playerMap.clear()
    for (const p of (allPlayersData as any[])) {
      this.playerMap.set(p.id, p)
    }
    this.isInitialized = true
  }

  static getPlayerById(id: number): ReferencedPlayer | null {
    this.init()
    const p = this.playerMap.get(id)
    if (!p) return null
    return {
      id: p.id,
      name: p.name,
      webName: p.web_name || p.name,
      club: p.club,
      position: p.position as any,
      price: p.price,
      predictedXp: p.gw3_xp || p.gw2_xp,
      actualPoints: p.actual_points_gw2,
      minutes: p.minutes_gw2,
      matchStatus: p.match_status_gw2 as any,
      isCaptain: p.id === 411,
      isViceCaptain: p.id === 154,
    }
  }

  static getAllActivePlayers(): ReferencedPlayer[] {
    this.init()
    const list: ReferencedPlayer[] = []
    const rawList = Array.from(this.playerMap.values())
    for (const p of rawList) {
      list.push({
        id: p.id,
        name: p.name,
        webName: p.web_name || p.name,
        club: p.club,
        position: p.position as any,
        price: p.price,
        predictedXp: p.gw3_xp || p.gw2_xp,
        actualPoints: p.actual_points_gw2,
        minutes: p.minutes_gw2,
        matchStatus: p.match_status_gw2 as any,
        isCaptain: p.id === 411,
        isViceCaptain: p.id === 154,
      })
    }
    return list
  }
}
