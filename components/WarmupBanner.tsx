'use client'

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'innovera_warmup_dismissed'

export default function WarmupBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true)
    }
  }, [])

  if (!visible) return null

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  return (
    <div className="bg-[#161B22] border-b border-[#F0A500]/25 px-4 py-3 relative z-40">
      <div className="mx-auto max-w-7xl flex items-start gap-3">
        <span className="text-[#F0A500] flex-shrink-0 text-base mt-0.5" aria-hidden="true">⚡</span>
        <div className="flex-1 min-w-0 space-y-0.5">
          <p className="text-xs text-[#8B949E] leading-relaxed">
            <span className="font-semibold text-[#E6EDF3]">First load may take 1–2 minutes</span>
            {' '}while the AI model warms up. Skeleton cards will fill in as data arrives.
          </p>
          <p className="text-xs text-[#8B949E] leading-relaxed" dir="rtl">
            <span className="font-semibold text-[#E6EDF3]">بارکردنی یەکەم کات ١–٢ خولەک دووای خۆی دەبێت</span>
            {' '}بۆ گەرمکردنەوەی مۆدێلی ئەی ئای. داتا بەم زووانەیە دەگاتەوە.
          </p>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#30363D] transition-colors text-xs"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
