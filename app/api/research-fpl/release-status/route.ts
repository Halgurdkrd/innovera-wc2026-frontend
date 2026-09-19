import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Proxies to app/routers/research_fpl.py's /release-status -- the single
// source for BOTH independent facts about a gameweek's published release:
// the FORECAST status (EARLY / FINAL_FROZEN / NONE, never changes when
// matches start) and the RESULTS status (NOT_STARTED / IN_PROGRESS /
// PROVISIONAL / FINAL / NOT_TRACKED), plus release identity
// (release_id/manifest_hash/results revision) used by the page's bounded
// background refresh to detect a swapped or updated release. `gw` is
// optional (backend resolves the active gameweek when absent).
// See ../status for the upstreamBase() fallback rationale (matches it).
function upstreamBase(): string {
  return (process.env.BACKEND_INTERNAL_URL || process.env.VPS_BACKEND_URL || 'http://72.62.35.32').trim().replace(/\/+$/, '')
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const gw = searchParams.get('gw')
  const qs = gw && /^\d{1,2}$/.test(gw) ? `?gw=${gw}` : ''
  const upstreamUrl = upstreamBase() + '/api/v1/research-fpl/release-status' + qs
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2500)
    const res = await fetch(upstreamUrl, { headers: { 'Content-Type': 'application/json' }, signal: controller.signal, cache: 'no-store' })
    clearTimeout(timeoutId)
    if (res.ok) {
      return NextResponse.json(await res.json())
    }
    return NextResponse.json({ status: 'TEMPORARILY_UNAVAILABLE', reason: `Upstream returned HTTP ${res.status}` }, { status: 200 })
  } catch {
    return NextResponse.json({ status: 'TEMPORARILY_UNAVAILABLE', reason: 'Research API unreachable.' }, { status: 200 })
  }
}
