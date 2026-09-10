import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Proxies to the verified M3_SHRUNK/V0_CONTROL research adapter
// (app/routers/research_fpl.py). Unlike the existing FPL-03 proxy routes,
// this has NO static-JSON fallback on purpose: silently substituting a
// fabricated/stale result for "the backend is unreachable" would violate
// the explicit instruction not to invent unavailable data.
function upstreamBase(): string {
  return (process.env.BACKEND_INTERNAL_URL || process.env.VPS_BACKEND_URL || 'http://127.0.0.1:8000').trim().replace(/\/+$/, '')
}

export async function GET() {
  const upstreamUrl = upstreamBase() + '/api/v1/research-fpl/status'
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2500)
    const res = await fetch(upstreamUrl, { headers: { 'Content-Type': 'application/json' }, signal: controller.signal })
    clearTimeout(timeoutId)
    if (res.ok) {
      return NextResponse.json(await res.json())
    }
    return NextResponse.json({ status: 'NOT_AVAILABLE', reason: `Upstream returned HTTP ${res.status}` }, { status: 200 })
  } catch (err) {
    return NextResponse.json({ status: 'NOT_AVAILABLE', reason: 'Research API unreachable.' }, { status: 200 })
  }
}
