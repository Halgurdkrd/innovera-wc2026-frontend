// Framework-free bounded background poller for release-status. The React hook
// (hooks/useReleasePolling.ts) is a thin wrapper; all scheduling rules live
// here so they can be tested with fake timers under node.
//
// Rules: adaptive cadence (see nextPollDelayMs), stop once results are
// finalized, pause while the document is hidden and refresh once when it
// becomes visible again, exponential backoff (capped) on errors, abort the
// in-flight request on stop, never two overlapping fetches.

import {
  isAvailableReleaseStatus,
  nextPollDelayMs,
  pollStateFromStatus,
  releaseSignature,
  type ReleaseStatusResponse,
} from './releaseStatus'

export interface ReleasePollerDeps {
  // Must reject (or resolve a non-AVAILABLE payload) on failure.
  fetchStatus: (signal: AbortSignal) => Promise<ReleaseStatusResponse>
  onStatus: (status: ReleaseStatusResponse) => void
  // Fired when the displayed identity (release id / results revision /
  // manifest hash / results state) changed versus the previous good status.
  onChange?: (next: ReleaseStatusResponse, prev: ReleaseStatusResponse) => void
  onError?: (err: unknown, consecutiveErrors: number) => void
  isHidden?: () => boolean
  now?: () => number
  setTimer?: (fn: () => void, ms: number) => unknown
  clearTimer?: (handle: unknown) => void
}

export class ReleasePoller {
  private deps: Required<Pick<ReleasePollerDeps, 'now' | 'setTimer' | 'clearTimer' | 'isHidden'>> & ReleasePollerDeps
  private timer: unknown = null
  private controller: AbortController | null = null
  private stopped = true
  private finished = false
  private errors = 0
  private last: ReleaseStatusResponse | null = null

  constructor(deps: ReleasePollerDeps) {
    this.deps = {
      ...deps,
      now: deps.now ?? (() => Date.now()),
      setTimer: deps.setTimer ?? ((fn, ms) => setTimeout(fn, ms)),
      clearTimer: deps.clearTimer ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>)),
      isHidden: deps.isHidden ?? (() => false),
    }
  }

  get consecutiveErrors(): number { return this.errors }
  get isFinished(): boolean { return this.finished }
  get isInFlight(): boolean { return this.controller !== null }

  start(): void {
    if (!this.stopped) return
    this.stopped = false
    this.finished = false
    this.errors = 0
    if (this.deps.isHidden()) return // first fetch happens on becoming visible
    void this.tick()
  }

  stop(): void {
    this.stopped = true
    this.clearTimerIfAny()
    this.controller?.abort()
    this.controller = null
  }

  // Document became visible/hidden.
  setHidden(hidden: boolean): void {
    if (this.stopped) return
    if (hidden) {
      this.clearTimerIfAny()
      // Detach immediately so a fetch that has not settled yet can never
      // block the refresh performed when the document becomes visible.
      this.controller?.abort()
      this.controller = null
      return
    }
    // Refresh once on becoming visible (unless already finalized).
    if (!this.finished) void this.tick()
  }

  // Manual refresh (e.g. after "Refresh now"); ignored while a fetch is in flight.
  refreshNow(): void {
    if (this.stopped || this.finished) return
    void this.tick()
  }

  private clearTimerIfAny(): void {
    if (this.timer !== null) {
      this.deps.clearTimer(this.timer)
      this.timer = null
    }
  }

  private schedule(): void {
    this.clearTimerIfAny()
    if (this.stopped || this.deps.isHidden()) return
    const state = pollStateFromStatus(this.last, this.deps.now(), this.errors)
    // Never had a good status (first load failed): retry on the fast
    // cadence with backoff rather than waiting the 10-minute idle interval.
    if (!this.last) state.resultsStatus = 'IN_PROGRESS'
    const delay = nextPollDelayMs(state)
    if (delay === null) {
      this.finished = true
      return
    }
    this.timer = this.deps.setTimer(() => { this.timer = null; void this.tick() }, delay)
  }

  private async tick(): Promise<void> {
    if (this.stopped || this.controller !== null) return
    this.clearTimerIfAny()
    const controller = new AbortController()
    this.controller = controller
    try {
      const res = await this.deps.fetchStatus(controller.signal)
      if (this.stopped || controller.signal.aborted) return
      if (!isAvailableReleaseStatus(res)) throw new Error(`release-status ${(res as { status?: string } | null)?.status ?? 'unavailable'}`)
      const prev = this.last
      this.errors = 0
      this.last = res
      this.deps.onStatus(res)
      if (prev && releaseSignature(prev) !== releaseSignature(res)) this.deps.onChange?.(res, prev)
    } catch (err) {
      if (this.stopped || controller.signal.aborted) return
      this.errors += 1
      this.deps.onError?.(err, this.errors)
    } finally {
      if (this.controller === controller) this.controller = null
      // Schedule only from a completed (non-aborted) attempt.
      if (!this.stopped && !controller.signal.aborted) this.schedule()
    }
  }
}
