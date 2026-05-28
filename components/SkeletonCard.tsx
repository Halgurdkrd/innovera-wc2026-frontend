'use client'

/** Single animated pulse block. Width/height set via className. */
export function Sk({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-[#21262D] rounded ${className}`} />
}

/** A full skeleton group-standings card (title bar + N data rows). */
export function SkGroupCard({ rows = 4 }: { rows?: number }) {
  return (
    <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#30363D] flex items-center justify-between">
        <Sk className="h-3.5 w-16" />
        <Sk className="h-5 w-8 rounded-full" />
      </div>
      {/* Rows */}
      <div className="divide-y divide-[#30363D]/30">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-2 px-3 py-2.5">
            <Sk className="h-3 w-3 rounded-full flex-shrink-0" />
            <Sk className="h-4 w-4 rounded flex-shrink-0" />
            <Sk className="h-3 flex-1" />
            <Sk className="h-3 w-6" />
            <Sk className="h-3 w-6" />
            <Sk className="h-3 w-6" />
            <Sk className="h-5 w-9 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** A single skeleton row for WinnerProbsList. */
export function SkProbRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Sk className="h-3 w-3 rounded-full flex-shrink-0" />
      <Sk className="h-6 w-6 rounded-full flex-shrink-0" />
      <Sk className="h-3 w-24 flex-shrink-0" />
      <Sk className="h-2 flex-1 rounded-full" />
      <Sk className="h-3 w-10 flex-shrink-0" />
    </div>
  )
}
