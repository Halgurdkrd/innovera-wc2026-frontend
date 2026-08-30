import { NextResponse } from 'next/server'
import { FantasyChatEngine } from '@/lib/services/fantasyChat/chatEngine'
import type { FantasyChatRequest } from '@/lib/services/fantasyChat/types'

export const dynamic = 'force-dynamic'

// In-memory rate limiting map (IP -> timestamp array)
const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const timestamps = rateLimitMap.get(ip) || []
  const validTimestamps = timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS)
  const maxReqs = ip === '127.0.0.1' || ip === '::1' || ip === 'localhost' ? 200 : MAX_REQUESTS_PER_WINDOW

  if (validTimestamps.length >= maxReqs) {
    return true
  }

  validTimestamps.push(now)
  rateLimitMap.set(ip, validTimestamps)
  return false
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1'

    if (isRateLimited(ip)) {
      return NextResponse.json(
        {
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please wait a moment before sending another message.',
        },
        { status: 429 }
      )
    }

    const body: FantasyChatRequest = await request.json()

    if (!body || !body.question || typeof body.question !== 'string' || body.question.trim().length === 0) {
      return NextResponse.json(
        {
          error: 'INVALID_REQUEST',
          message: 'Question is required.',
        },
        { status: 400 }
      )
    }

    // Process message with FantasyChatEngine
    const response = await FantasyChatEngine.processMessage(body)
    return NextResponse.json(response)
  } catch (err: any) {
    console.error('[Fantasy Chat API Error]:', err)
    return NextResponse.json(
      {
        answer: 'Sorry, I encountered an issue processing your request right now. Please try again.',
        intent: 'UNSUPPORTED',
        requestedGameweek: 2,
        contextStatus: 'GW2_LIVE',
        sourceTypes: ['ENNOVERA_FROZEN'],
        sourceBadge: 'System Recovery',
        referencedPlayers: [],
        suggestedFollowups: ['Who has the highest xP for GW3?', 'How is our AI Manager doing?'],
        generatedAt: new Date().toISOString(),
        dataSnapshot: 'ERROR_RECOVERY',
      },
      { status: 200 }
    )
  }
}
