'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useLanguage } from '@/hooks/useLanguage'

const WA_NUMBER = '9647742740404'
const WA_BASE   = `https://wa.me/${WA_NUMBER}`
const TEL       = `tel:+${WA_NUMBER}`

// ── Icons ─────────────────────────────────────────────────────────────────────

function WhatsAppIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={`${className} flex-shrink-0`} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.63A2 2 0 012 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92z" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
    </svg>
  )
}

// ── Modal overlay (click-outside + Escape to close) ───────────────────────────

function ModalOverlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#161B22] border border-[#30363D] rounded-2xl w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

type Modal = 'none' | 'feedback' | 'contact'

export default function WhatsAppFooter() {
  const { language } = useLanguage()
  const isKU = language === 'KU'
  const [modal, setModal] = useState<Modal>('none')
  const [feedbackText, setFeedbackText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const closeModal = useCallback(() => {
    setModal('none')
    setFeedbackText('')
  }, [])

  // Auto-focus textarea when feedback modal opens
  useEffect(() => {
    if (modal === 'feedback') {
      const id = setTimeout(() => textareaRef.current?.focus(), 60)
      return () => clearTimeout(id)
    }
  }, [modal])

  const sendFeedback = () => {
    const text = feedbackText.trim()
    if (!text) return
    window.open(`${WA_BASE}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
    closeModal()
  }

  return (
    <>
      {/* ── Footer bar — thin single-line text strip, scrolls with content ── */}
      <footer className="border-t border-[#30363D]/50 bg-[#0D1117] px-4 py-2">
        <div className="mx-auto max-w-7xl flex items-center justify-center gap-3 text-[11px] text-[#8B949E]">
          <span className="flex items-center gap-1">
            <WhatsAppIcon className="h-3 w-3" />
            <span className="text-[#4ade80] tabular-nums">07742740404</span>
          </span>
          <span aria-hidden="true">·</span>
          <button
            onClick={() => setModal('contact')}
            className="hover:text-[#4ade80] transition-colors"
          >
            {isKU ? 'پەیوەندی' : 'Contact Us'}
          </button>
          <span aria-hidden="true">·</span>
          <button
            onClick={() => setModal('feedback')}
            className="hover:text-[#4ade80] transition-colors"
          >
            {isKU ? 'ڕەخنە و پێشنیار' : 'Feedback'}
          </button>
        </div>
      </footer>

      {/* ── Feedback modal ── */}
      {modal === 'feedback' && (
        <ModalOverlay onClose={closeModal}>
          <div className="p-5 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#E6EDF3]">
                {isKU ? 'ڕەخنە و پێشنیار بنێرە' : 'Send Feedback'}
              </h2>
              <button
                onClick={closeModal}
                className="text-[#8B949E] hover:text-[#E6EDF3] transition-colors p-0.5 rounded"
                aria-label="Close"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={feedbackText}
              onChange={e => setFeedbackText(e.target.value)}
              rows={5}
              placeholder={isKU
                ? 'پێشنیار یان ڕەخنەکەت بنووسە…'
                : 'Write your feedback here…'}
              className="w-full bg-[#0D1117] border border-[#30363D] focus:border-[#F0A500]/50 rounded-xl p-3 text-sm text-[#E6EDF3] placeholder-[#8B949E] resize-none outline-none transition-colors"
            />

            {/* Actions */}
            <div className="flex gap-2 justify-end">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm font-semibold text-[#8B949E] bg-[#0D1117] border border-[#30363D] rounded-xl hover:text-[#E6EDF3] transition-colors"
              >
                {isKU ? 'پاشگەزبوونەوە' : 'Cancel'}
              </button>
              <button
                onClick={sendFeedback}
                disabled={!feedbackText.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-[#0D1117] bg-[#F0A500] rounded-xl hover:bg-[#D4920A] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <WhatsAppIcon />
                {isKU ? 'بنێرە' : 'Send'}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ── Contact modal ── */}
      {modal === 'contact' && (
        <ModalOverlay onClose={closeModal}>
          <div className="p-5 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#E6EDF3]">
                {isKU ? 'پەیوەندیمان پێوە بکە' : 'Contact Us'}
              </h2>
              <button
                onClick={closeModal}
                className="text-[#8B949E] hover:text-[#E6EDF3] transition-colors p-0.5 rounded"
                aria-label="Close"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Contact options */}
            <div className="space-y-3">
              {/* Phone call */}
              <a
                href={TEL}
                className="flex items-center gap-3 bg-[#0D1117] border border-[#30363D] hover:border-[#F0A500]/40 rounded-xl p-4 transition-colors group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F0A500]/10 text-[#F0A500] flex-shrink-0">
                  <PhoneIcon />
                </div>
                <div>
                  <p className="text-xs text-[#8B949E] font-medium">
                    {isKU ? '📞 تەلەفۆن' : '📞 Phone call'}
                  </p>
                  <p className="text-base font-bold text-[#E6EDF3] group-hover:text-[#F0A500] transition-colors tabular-nums">
                    07742740404
                  </p>
                </div>
                <div className="ml-auto text-[#8B949E] group-hover:text-[#F0A500] transition-colors">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                    <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                  </svg>
                </div>
              </a>

              {/* WhatsApp */}
              <a
                href={WA_BASE}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-[#0D1117] border border-[#30363D] hover:border-[#4ade80]/40 rounded-xl p-4 transition-colors group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#4ade80]/10 text-[#4ade80] flex-shrink-0">
                  <WhatsAppIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-[#8B949E] font-medium">
                    {isKU ? '💬 واتساپ' : '💬 WhatsApp'}
                  </p>
                  <p className="text-base font-bold text-[#E6EDF3] group-hover:text-[#4ade80] transition-colors tabular-nums">
                    07742740404
                  </p>
                </div>
                <div className="ml-auto text-[#8B949E] group-hover:text-[#4ade80] transition-colors">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                    <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                  </svg>
                </div>
              </a>
            </div>

            <button
              onClick={closeModal}
              className="w-full py-2 text-sm font-semibold text-[#8B949E] bg-[#0D1117] border border-[#30363D] rounded-xl hover:text-[#E6EDF3] transition-colors"
            >
              {isKU ? 'داخستن' : 'Close'}
            </button>
          </div>
        </ModalOverlay>
      )}
    </>
  )
}
