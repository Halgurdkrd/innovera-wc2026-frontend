import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function upstreamBase(): string {
  // See app/api/research-fpl/status/route.ts for why the fallback matches
  // the existing FPL-03 proxy pattern (72.62.35.32, no port) rather than a
  // localhost default that would only work from a same-machine backend.
  return (process.env.BACKEND_INTERNAL_URL || process.env.VPS_BACKEND_URL || 'http://72.62.35.32').trim().replace(/\/+$/, '')
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const gw = searchParams.get('gw') || '1'
  const object = searchParams.get('object') || 'OWN_START'
  const upstreamUrl = `${upstreamBase()}/api/v1/research-fpl/gameweek/${gw}/compare?object=${encodeURIComponent(object)}`

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2500)
    // cache: 'no-store' is required, not just belt-and-braces alongside
    // `dynamic = 'force-dynamic'` -- Next.js's on-disk fetch cache was
    // observed to survive across `next dev` restarts and serve a stale
    // artifact bundle even with the route marked dynamic.
    const res = await fetch(upstreamUrl, { headers: { 'Content-Type': 'application/json' }, signal: controller.signal, cache: 'no-store' })
    clearTimeout(timeoutId)
    if (res.ok) {
      return NextResponse.json(await res.json())
    }
    return NextResponse.json({ status: 'TEMPORARILY_UNAVAILABLE', reason: `Upstream returned HTTP ${res.status}` }, { status: 200 })
  } catch (err) {
    return NextResponse.json({ status: 'TEMPORARILY_UNAVAILABLE', reason: 'Research API unreachable.' }, { status: 200 })
  }
}
