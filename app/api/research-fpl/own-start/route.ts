import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function upstreamBase(): string {
  return (process.env.BACKEND_INTERNAL_URL || process.env.VPS_BACKEND_URL || 'http://127.0.0.1:8000').trim().replace(/\/+$/, '')
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const gw = searchParams.get('gw') || '1'
  const model = searchParams.get('model') || 'M3_SHRUNK'
  const upstreamUrl = `${upstreamBase()}/api/v1/research-fpl/gameweek/${gw}/own-start?model=${encodeURIComponent(model)}`

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2500)
    const res = await fetch(upstreamUrl, { headers: { 'Content-Type': 'application/json' }, signal: controller.signal })
    clearTimeout(timeoutId)
    if (res.ok) {
      return NextResponse.json(await res.json())
    }
    return NextResponse.json({ status: 'NOT_AVAILABLE', reason: `Upstream returned HTTP ${res.status}`, model, gameweek: Number(gw) }, { status: 200 })
  } catch (err) {
    return NextResponse.json({ status: 'NOT_AVAILABLE', reason: 'Research API unreachable.', model, gameweek: Number(gw) }, { status: 200 })
  }
}
