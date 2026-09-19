'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ReleasePoller } from '@/lib/fantasy/releasePoller'
import type { ReleaseStatusResponse } from '@/lib/fantasy/releaseStatus'

// Re-exported so callers/tests can find the cadence rule next to the hook.
export { nextPollDelayMs } from '@/lib/fantasy/releaseStatus'

async function fetchReleaseStatus(gw: number, signal: AbortSignal): Promise<ReleaseStatusResponse> {
  const res = await fetch(`/api/research-fpl/release-status?gw=${gw}`, { cache: 'no-store', signal })
  if (!res.ok) throw new Error(`release-status HTTP ${res.status}`)
  return res.json()
}

export interface UseReleasePollingOptions {
  gw: number
  enabled?: boolean
  // Displayed identity changed (release swap / new results revision / new
  // bundle). Called AFTER the hook state has been updated.
  onChange?: (next: ReleaseStatusResponse, prev: ReleaseStatusResponse) => void
}

export interface UseReleasePollingResult {
  status: ReleaseStatusResponse | null
  error: boolean
  refreshNow: () => void
}

// Bounded background refresh of GET /release-status?gw=. Cadence/backoff/
// visibility handling live in the framework-free ReleasePoller (tested under
// node); this hook only wires it to React lifecycle and document visibility.
export function useReleasePolling({ gw, enabled = true, onChange }: UseReleasePollingOptions): UseReleasePollingResult {
  const [status, setStatus] = useState<ReleaseStatusResponse | null>(null)
  const [error, setError] = useState(false)
  const pollerRef = useRef<ReleasePoller | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    setStatus(null)
    setError(false)
    if (!enabled) return
    const poller = new ReleasePoller({
      fetchStatus: (signal) => fetchReleaseStatus(gw, signal),
      onStatus: (s) => { setStatus(s); setError(false) },
      onChange: (next, prev) => onChangeRef.current?.(next, prev),
      onError: () => setError(true),
      isHidden: () => typeof document !== 'undefined' && document.visibilityState === 'hidden',
    })
    pollerRef.current = poller
    const onVisibility = () => poller.setHidden(document.visibilityState === 'hidden')
    document.addEventListener('visibilitychange', onVisibility)
    poller.start()
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      poller.stop() // aborts any in-flight request
      if (pollerRef.current === poller) pollerRef.current = null
    }
  }, [gw, enabled])

  const refreshNow = useCallback(() => pollerRef.current?.refreshNow(), [])
  return { status, error, refreshNow }
}
