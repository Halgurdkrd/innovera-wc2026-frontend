import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Proxies to the verified M3_SHRUNK/V0_CONTROL research adapter
// (app/routers/research_fpl.py). Unlike the existing FPL-03 proxy routes,
// this has NO static-JSON fallback on purpose: silently substituting a
// fabricated/stale result for "the backend is unreachable" would violate
// the explicit instruction not to invent unavailable data.
function upstreamBase(): string {
  // Matches the existing FPL-03 proxy routes' production fallback exactly
  // (e.g. app/api/fpl/captain/recommended/route.ts) -- 72.62.35.32 with no
  // port reaches the VPS's Nginx on 80, which is what actually routes to
  // the backend process in production. A bare '127.0.0.1:8000' default
  // would only ever resolve from Vercel's own container, never the VPS, so
  // it must never be the production fallback here. Set BACKEND_INTERNAL_URL
  // in .env.local for local dev against a same-machine backend instead.
  return (process.env.BACKEND_INTERNAL_URL || process.env.VPS_BACKEND_URL || 'http://72.62.35.32').trim().replace(/\/+$/, '')
}

export async function GET() {
  const upstreamUrl = upstreamBase() + '/api/v1/research-fpl/status'
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
    return NextResponse.json({ status: 'NOT_AVAILABLE', reason: `Upstream returned HTTP ${res.status}` }, { status: 200 })
  } catch (err) {
    return NextResponse.json({ status: 'NOT_AVAILABLE', reason: 'Research API unreachable.' }, { status: 200 })
  }
}
