import { NextResponse } from 'next/server'
import fallbackData from '@/lib/data/pl_table.json'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const qs = searchParams.toString() ? '?' + searchParams.toString() : ''
  const upstreamHost = (process.env.BACKEND_INTERNAL_URL || process.env.VPS_BACKEND_URL || 'http://72.62.35.32').trim().replace(/\/+$/, '')
  const upstreamUrl = upstreamHost + '/api/v1/pl/table' + qs

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2500)
    const res = await fetch(upstreamUrl, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (res.ok) {
      const data = await res.json()
      return NextResponse.json(data)
    }
  } catch (err) {
    // Upstream unavailable or timed out -> serve canonical 2026-27 data
  }

  return NextResponse.json(fallbackData)
}
