'use client'

export interface ErrorStateProps {
  message: string
  onRetry?: () => void
  retryLabel?: string
  icon?: string
}

export default function ErrorState({
  message,
  onRetry,
  retryLabel = 'Retry',
  icon = '⚠️',
}: ErrorStateProps) {
  return (
    <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-8 text-center space-y-3">
      <span className="text-4xl block">{icon}</span>
      <p className="text-[#8B949E]">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm font-semibold text-[#F0A500] hover:underline"
        >
          {retryLabel}
        </button>
      )}
    </div>
  )
}
