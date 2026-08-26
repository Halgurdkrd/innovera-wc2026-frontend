'use client'

import Link from 'next/link'

export interface EmptyStateAction {
  label: string
  href?: string
  onClick?: () => void
}

export interface EmptyStateProps {
  message: string
  icon?: string
  action?: EmptyStateAction
}

export default function EmptyState({ message, icon = '⚽', action }: EmptyStateProps) {
  return (
    <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-12 text-center space-y-4">
      <span className="text-4xl block">{icon}</span>
      <p className="text-[#8B949E]">{message}</p>
      {action && (
        action.href ? (
          <Link
            href={action.href}
            className="inline-flex items-center gap-2 bg-[#F0A500] hover:bg-[#D4920A] text-[#0D1117] font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors"
          >
            {action.label} →
          </Link>
        ) : (
          <button
            onClick={action.onClick}
            className="text-sm font-semibold text-[#F0A500] hover:underline"
          >
            {action.label}
          </button>
        )
      )}
    </div>
  )
}
