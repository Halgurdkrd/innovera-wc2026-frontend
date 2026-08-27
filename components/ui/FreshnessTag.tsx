'use client'

import React from 'react'

interface FreshnessTagProps {
  generatedAt?: string
  label?: string
  className?: string
}

export function FreshnessTag({ generatedAt, label = 'Updated', className = '' }: FreshnessTagProps) {
  if (!generatedAt) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs text-[#8B949E] ${className}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-[#8B949E]" />
        <span>Live</span>
      </span>
    )
  }

  let formattedTime = 'recently'
  let isStale = false

  try {
    const genDate = new Date(generatedAt)
    const now = new Date()
    const diffMs = now.getTime() - genDate.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMinutes < 5) {
      formattedTime = 'just now'
    } else if (diffMinutes < 60) {
      formattedTime = `${diffMinutes}m ago`
    } else if (diffHours < 24) {
      formattedTime = `${diffHours}h ago`
    } else {
      formattedTime = `${diffDays}d ago`
      isStale = true
    }
  } catch {
    formattedTime = 'recently'
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full border ${
        isStale
          ? 'bg-[#F0A500]/10 border-[#F0A500]/30 text-[#F0A500]'
          : 'bg-[#238636]/10 border-[#238636]/30 text-[#3FB950]'
      } ${className}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full animate-pulse ${
          isStale ? 'bg-[#F0A500]' : 'bg-[#3FB950]'
        }`}
      />
      <span>
        {label} {formattedTime}
      </span>
    </span>
  )
}
