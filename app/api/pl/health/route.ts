import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Internal pipeline health (see backend app/services/pl_health_service.py). No static fallback on purpose:
// a made-up "all clear" while the backend is down would defeat the page's only job.
function upstreamBase(): string {
  return (process.env.BACKEND_INTERNAL_URL || process.env.VPS_BACKEND_URL || 'http://72.62.35.32').trim().replace(/\/+$/, '')
}

export async function GET() {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(upstreamBase() + '/api/v1/pl/health', { signal: controller.signal, cache: 'no-store' })
    clearTimeout(timeoutId)
    if (res.ok) return NextResponse.json(await res.json(), { headers: { 'Cache-Control': 'no-store' } })
    return NextResponse.json({ status: 'unreachable', alerts: [`Backend answered HTTP ${res.status}`] }, { status: 502 })
  } catch {
    return NextResponse.json({ status: 'unreachable', alerts: ['Backend did not answer'] }, { status: 502 })
  }
}
