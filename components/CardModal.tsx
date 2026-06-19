'use client'

import { useState } from 'react'
import { tr } from '@/lib/translations'
import type { Language } from '@/lib/translations'

interface CardModalProps {
  imageUrl: string
  onClose: () => void
  language: Language
}

export default function CardModal({ imageUrl, onClose, language }: CardModalProps) {
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    try {
      // Fetch as blob to force download even for cross-origin URLs
      const res = await fetch(imageUrl)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'innovera-prediction-card.png'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // Fallback: open in new tab
      window.open(imageUrl, '_blank', 'noopener,noreferrer')
    } finally {
      setDownloading(false)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Ennovera World Cup Prediction',
          url: imageUrl,
        })
        return
      } catch {
        // User cancelled or share failed — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(imageUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Clipboard also unavailable — do nothing
    }
  }

  return (
    <div
      className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#161B22] border border-[#30363D] rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Card image */}
        <div className="border-b border-[#30363D]">
          <img
            src={imageUrl}
            alt="Prediction card"
            className="w-full h-auto block"
          />
        </div>

        {/* Actions */}
        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            <button
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-2 bg-[#F0A500] hover:bg-[#D4920A] text-[#0D1117] font-semibold py-2.5 px-4 rounded-lg text-sm transition-colors"
            >
              {copied ? (
                <><span>✓</span> {tr('share_copied', language)}</>
              ) : (
                <><span>📤</span> {tr('btn_share', language)}</>
              )}
            </button>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex-1 flex items-center justify-center gap-2 bg-[#21262D] border border-[#30363D] hover:border-[#F0A500]/50 text-[#E6EDF3] font-semibold py-2.5 px-4 rounded-lg text-sm transition-colors disabled:opacity-60"
            >
              <span>⬇️</span>
              {tr('btn_download', language)}
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full text-sm text-[#8B949E] hover:text-[#E6EDF3] transition-colors py-1.5"
          >
            {tr('btn_close', language)}
          </button>
        </div>
      </div>
    </div>
  )
}
