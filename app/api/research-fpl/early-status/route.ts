import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Proxies to app/routers/research_fpl.py's /early-status -- whether an
// EARLY_FORECAST_SUBJECT_TO_UPDATE gameweek exists (e.g. GW5 while GW4
// is still the registered final pair). See ../status (forecast-artifact
// availability) and ../live-status (official-results completion) for the
// other two distinct status concepts this page tracks.
function upstreamBase(): string {
  return (process.env.BACKEND_INTERNAL_URL || process.env.VPS_BACKEND_URL || 'http://72.62.35.32').trim().replace(/\/+$/, '')
}

export async function GET() {
  const upstreamUrl = upstreamBase() + '/api/v1/research-fpl/early-status'
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2500)
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
