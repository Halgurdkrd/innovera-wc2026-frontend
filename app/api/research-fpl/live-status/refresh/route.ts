import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Proxies the "Refresh now" action to app/routers/research_fpl.py's
// POST /live-status/refresh. Bounded timeout matched to the backend
// route's own internal timeouts (bootstrap refresh + event/live fetch);
// on any failure this just reports TEMPORARILY_UNAVAILABLE -- the
// backend's own refresh_and_persist() already guarantees it never
// corrupts or loses the last good snapshot on a failed attempt.
function upstreamBase(): string {
  return (process.env.BACKEND_INTERNAL_URL || process.env.VPS_BACKEND_URL || 'http://72.62.35.32').trim().replace(/\/+$/, '')
}

export async function POST() {
  const upstreamUrl = upstreamBase() + '/api/v1/research-fpl/live-status/refresh'
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)
    const res = await fetch(upstreamUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal, cache: 'no-store' })
    clearTimeout(timeoutId)
    if (res.ok) {
      return NextResponse.json(await res.json())
    }
    return NextResponse.json({ status: 'TEMPORARILY_UNAVAILABLE', reason: `Upstream returned HTTP ${res.status}` }, { status: 200 })
  } catch (err) {
    return NextResponse.json({ status: 'TEMPORARILY_UNAVAILABLE', reason: 'Research API unreachable.' }, { status: 200 })
  }
}
