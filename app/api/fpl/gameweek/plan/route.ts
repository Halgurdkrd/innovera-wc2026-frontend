import { NextResponse } from 'next/server'
import { FPLLiveSyncService } from '@/lib/services/fplLiveSync'
import fallbackData from '@/lib/data/fpl_gameweek_plan.json'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const data = await FPLLiveSyncService.getGameweekPlan(2)
    return NextResponse.json(data)
  } catch (err) {
    console.error('[Gameweek Plan API] Live sync error, using canonical baseline:', err)
    return NextResponse.json(fallbackData)
  }
}
