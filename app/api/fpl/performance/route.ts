import { NextResponse } from 'next/server'
import { FPLLiveSyncService } from '@/lib/services/fplLiveSync'
import fallbackData from '@/lib/data/fpl_performance.json'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const data = await FPLLiveSyncService.getPerformanceData()
    return NextResponse.json(data)
  } catch (err) {
    console.error('[Performance API] Live sync error, using canonical baseline:', err)
    return NextResponse.json(fallbackData)
  }
}
