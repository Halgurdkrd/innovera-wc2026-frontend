'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { Language } from '@/lib/translations'
import type { FantasyChatResponse, ReferencedPlayer } from '@/lib/services/fantasyChat/types'

interface ChatMessage {
  id: string
  role: 'user' | 'ai'
  text: string
  time: string
  sourceBadge?: string
  referencedPlayers?: ReferencedPlayer[]
  suggestedFollowups?: string[]
  loading?: boolean
  error?: boolean
  // Deterministic, structurally-driven notices -- rendered from these
  // fields directly, never inferred from what the LLM's prose says, so a
  // model that forgets to mention its own vintage/status never leaves the
  // user without the disclosure.
  isHistoricalDemoSnapshot?: boolean
  demoSnapshotLabel?: string
  researchModel?: 'M3_SHRUNK' | 'V0_CONTROL'
  researchGameweek?: number
  researchArtifactStatus?: string
}

const SUGGESTIONS = {
  EN: [
    'How is our AI Manager doing?',
    'Who has already played in GW2?',
    'Why did Ennovera captain Haaland?',
    'Why is Best £100m different from AI Manager?',
    'Which player differs between them?',
    'Who has the highest xP for GW3?',
    'Who should I captain for GW3?',
    'Best midfielder under £7m next Gameweek?',
    'Saka or Palmer for GW3?',
    'What does P80 mean?',
  ],
  KU: [
    'تیمی AI Manager ئێستا چۆنە؟',
    'کێ یارییەکەی تەواو کردووە لە GW2؟',
    'بۆچی هالاند کرا بە کاپتن؟',
    'جیاوازی نێوان Manager و Best £100m چییە؟',
    'کێ بەرزترین xP ی هەیە بۆ GW3؟',
    'کێ بکەمە کاپتن بۆ گەڕی ٣؟',
    'باشترین یاریزانی ناوەند بە کەمتر لە £7m؟',
    'بەراوردی ساکا و پاڵمەر بۆ GW3',
  ],
}

const COPY = {
  EN: {
    title: 'ASK ENNOVERA',
    subtitle: 'Fantasy Football Intelligence',
    intro: 'Ask about player predictions, captaincy, transfers, FPL statistics, Ennovera selections and Gameweek strategy.',
    placeholder: 'Ask Ennovera anything about Fantasy…',
    send: 'Send',
    online: 'Online • Hybrid Intelligence',
    suggested: 'Suggested Questions',
    disclaimer: 'Ennovera combines frozen expected points with authentic match realizations.',
  },
  KU: {
    title: 'پرسیار لە ئینۆڤێرا بکە',
    subtitle: 'زانیاری و پێشبینی وردی فانتاسی',
    intro: 'پرسیار لەبارەی پێشبینی یاریزانان، کاپتنی، گواستنەوە، ئامارەکانی فانتاسی و ستراتیژی گەڕەکان بپرسە.',
    placeholder: 'پرسیار لەبارەی فانتاسی بنووسە…',
    send: 'ناردن',
    online: 'ئۆنلاین • زیرەکی هایبرید',
    suggested: 'پرسیارە پێشنیارکراوەکان',
    disclaimer: 'ئینۆڤێرا پێشبینی نەگۆڕ و ئەنجامە فەرمییەکان پێکەوە گرێ دەدات.',
  },
}

function fmtTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function AskEnnoveraChat({
  language = 'EN',
  onSelectPlayer,
  pageContext,
}: {
  language?: Language
  onSelectPlayer?: (player: ReferencedPlayer) => void
  // When set (the main M3-only /fantasy page), every chat answer defaults
  // to this model/GW/tab instead of legacy FPL-03 grounding.
  pageContext?: { model: 'M3_SHRUNK' | 'V0_CONTROL'; gameweek: number; object: string }
}) {
  const t = COPY[language === 'KU' ? 'KU' : 'EN']
  const langKey = language === 'KU' ? 'KU' : 'EN'
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Welcome message on first open
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'ai',
          text: t.intro,
          time: fmtTime(),
          sourceBadge: 'Ennovera Football Intelligence',
          suggestedFollowups: SUGGESTIONS[langKey].slice(0, 4),
        },
      ])
    }
  }, [messages.length, t.intro, langKey])

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      inputRef.current?.focus()
    }
  }, [isOpen, messages])

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isLoading) return

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        text: trimmed,
        time: fmtTime(),
      }

      const loadingId = `loading-${Date.now()}`
      const loadingMsg: ChatMessage = {
        id: loadingId,
        role: 'ai',
        text: '',
        time: fmtTime(),
        loading: true,
      }

      setMessages((prev) => [...prev, userMsg, loadingMsg])
      setInput('')
      setIsLoading(true)

      const historyToSend = messages
        .filter((m) => !m.loading && !m.error && m.text.trim())
        .slice(-6)
        .map((m) => ({
          role: (m.role === 'ai' ? 'assistant' : 'user') as 'assistant' | 'user',
          content: m.text,
        }))

      try {
        const res = await fetch('/api/fpl/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: trimmed,
            language: language === 'KU' ? 'ku' : 'en',
            conversationHistory: historyToSend,
            pageContext,
          }),
        })

        if (res.ok) {
          const data: FantasyChatResponse = await res.json()
          setMessages((prev) => [
            ...prev.filter((m) => m.id !== loadingId),
            {
              id: `ai-${Date.now()}`,
              role: 'ai',
              text: data.answer,
              time: fmtTime(),
              sourceBadge: data.sourceBadge,
              referencedPlayers: data.referencedPlayers,
              suggestedFollowups: data.suggestedFollowups,
              isHistoricalDemoSnapshot: data.isHistoricalDemoSnapshot,
              demoSnapshotLabel: data.demoSnapshotLabel,
              researchModel: data.researchModel,
              researchGameweek: data.researchGameweek,
              researchArtifactStatus: data.researchArtifactStatus,
            },
          ])
        } else {
          setMessages((prev) => [
            ...prev.filter((m) => m.id !== loadingId),
            {
              id: `error-${Date.now()}`,
              role: 'ai',
              text: 'Connection temporarily interrupted. Please try again.',
              time: fmtTime(),
              error: true,
            },
          ])
        }
      } catch (err) {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== loadingId),
          {
            id: `error-${Date.now()}`,
            role: 'ai',
            text: 'Unable to reach the Fantasy intelligence service. Please check connection.',
            time: fmtTime(),
            error: true,
          },
        ])
      } finally {
        setIsLoading(false)
      }
    },
    [isLoading, language, messages, pageContext]
  )

  return (
    <>
      {/* Floating Action Button -- lifted above the mobile BottomNav (fixed,
          60px + safe-area, z-50) with a higher z-index so it is never
          hidden behind it; reverts to the original corner position on
          desktop (md:) where BottomNav does not render at all. */}
      <div
        className="fixed z-[60] right-4 md:right-6 bottom-[calc(60px+env(safe-area-inset-bottom)+16px)] md:bottom-6"
      >
        <button
          onClick={() => setIsOpen((v) => !v)}
          className="flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-[#58A6FF] to-[#3FB950] text-[#0D1117] font-black text-sm rounded-full shadow-2xl hover:scale-105 transition-all active:scale-95 border-2 border-white/20"
          aria-label="Open Ask Ennovera Chat"
        >
          <span className="text-lg">🤖</span>
          <span>ASK ENNOVERA</span>
          <span className="h-2 w-2 rounded-full bg-[#0D1117] animate-ping" />
        </button>
      </div>

      {/* Slide-over Chat Modal Drawer -- z-[60] (above BottomNav's z-50) so
          it fully covers the bottom navigation while open rather than
          fighting it for stacking order or DOM-order tie-breaks. Height
          uses dvh (dynamic viewport height), which shrinks correctly when
          the mobile on-screen keyboard opens, unlike vh; bottom offset
          clears the BottomNav + safe-area on mobile, reverting to a plain
          corner drawer on desktop. */}
      <div
        ref={panelRef}
        className={`fixed z-[60] transition-all duration-300 ease-out right-4 left-4 sm:left-auto sm:w-[420px] bottom-[calc(60px+env(safe-area-inset-bottom)+8px)] md:bottom-4 max-h-[min(640px,85dvh)] h-[min(640px,72dvh)] md:h-[640px] flex flex-col bg-[#161B22] border border-[#58A6FF]/40 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden ${
          isOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-6 pointer-events-none'
        }`}
      >
        {/* Chat Header */}
        <div className="bg-gradient-to-r from-[#161B22] via-[#1c222c] to-[#161B22] p-4 border-b border-[#30363D] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#58A6FF] to-[#3FB950] text-[#0D1117] font-black text-lg flex items-center justify-center shadow">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-[#E6EDF3] tracking-wide">{t.title}</h3>
                <span
                  className="text-[9px] px-1.5 py-0.2 bg-[#3FB950]/20 text-[#3FB950] border border-[#3FB950]/40 rounded font-black"
                  title="Chat connectivity status -- not the freshness of any historical or forecast data shown in answers"
                >
                  CONNECTED
                </span>
              </div>
              <p className="text-[10px] text-[#8B949E]">{t.subtitle}</p>
            </div>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="h-8 w-8 rounded-lg bg-[#0D1117] text-[#8B949E] hover:text-[#E6EDF3] border border-[#30363D] flex items-center justify-center font-bold text-sm"
          >
            ✕
          </button>
        </div>

        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-base leading-relaxed scrollbar-thin scrollbar-thumb-[#30363D]">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl p-3.5 space-y-2 shadow-md leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#58A6FF] text-[#0D1117] font-semibold rounded-br-none'
                    : msg.error
                    ? 'bg-[#F85149]/15 border border-[#F85149]/30 text-[#F85149] rounded-bl-none'
                    : 'bg-[#0D1117] border border-[#30363D] text-[#E6EDF3] rounded-bl-none'
                }`}
              >
                {msg.loading ? (
                  <div className="flex items-center gap-1.5 py-1 text-[#58A6FF]">
                    <span className="h-2 w-2 rounded-full bg-[#58A6FF] animate-bounce" />
                    <span className="h-2 w-2 rounded-full bg-[#58A6FF] animate-bounce [animation-delay:150ms]" />
                    <span className="h-2 w-2 rounded-full bg-[#58A6FF] animate-bounce [animation-delay:300ms]" />
                    <span className="text-[11px] text-[#8B949E] ml-1">Analyzing Ennovera models…</span>
                  </div>
                ) : (
                  <>
                    <div className="whitespace-pre-wrap">{msg.text}</div>

                    {/* Deterministic historical-demo notice -- rendered from
                        structured response fields, never left to the LLM's
                        own prose to (re)state correctly. */}
                    {msg.isHistoricalDemoSnapshot && (
                      <div className="mt-1.5 px-2 py-1 rounded bg-[#F0A500]/10 border border-[#F0A500]/30 text-[10px] text-[#F0A500] font-semibold">
                        Historical demo: this answer uses the archived {msg.demoSnapshotLabel || 'GW2/GW3 snapshot'}, not a current recommendation.
                      </div>
                    )}

                    {/* Deterministic research-model context banner -- same
                        principle: model/GW/status come from the API
                        response, not from parsing the answer text. */}
                    {msg.researchModel && (
                      <div className="mt-1.5 px-2 py-1 rounded bg-[#58A6FF]/10 border border-[#58A6FF]/30 text-[10px] text-[#58A6FF] font-semibold">
                        Research answer: {msg.researchModel} • GW{msg.researchGameweek ?? '—'} • {msg.researchArtifactStatus || 'STATUS_UNKNOWN'}
                      </div>
                    )}

                    {/* Source Badge */}
                    {msg.sourceBadge && (
                      <div className="pt-1.5 border-t border-[#30363D]/40 flex items-center justify-between text-[9px] text-[#8B949E]">
                        <span className="px-1.5 py-0.5 bg-[#161B22] border border-[#30363D] rounded font-bold text-[#58A6FF]">
                          {msg.sourceBadge}
                        </span>
                        <span>{msg.time}</span>
                      </div>
                    )}

                    {/* Referenced Players Chips */}
                    {msg.referencedPlayers && msg.referencedPlayers.length > 0 && (
                      <div className="pt-1.5 flex flex-wrap gap-1.5">
                        {msg.referencedPlayers.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => onSelectPlayer?.(p)}
                            className="px-2 py-0.5 rounded bg-[#161B22] hover:bg-[#58A6FF]/20 border border-[#58A6FF]/40 text-[#58A6FF] font-bold text-[10px] flex items-center gap-1 transition-all"
                          >
                            <span>👤 {p.webName || p.name}</span>
                            <span className="text-[9px] text-[#8B949E]">{p.priceUnavailable ? 'Price unavailable' : `£${p.price.toFixed(1)}m`}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Follow-up Question Chips */}
              {msg.suggestedFollowups && msg.suggestedFollowups.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5 max-w-[90%]">
                  {msg.suggestedFollowups.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => sendMessage(s)}
                      className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[#161B22] hover:bg-[#58A6FF]/20 border border-[#30363D] hover:border-[#58A6FF]/50 text-[#8B949E] hover:text-[#58A6FF] transition-all text-left"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            sendMessage(input)
          }}
          className="p-3 bg-[#0D1117] border-t border-[#30363D] flex items-center gap-2"
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t.placeholder}
            disabled={isLoading}
            // text-base (16px): below 16px, iOS Safari auto-zooms the whole
            // page on focus, which is part of what made the input/send
            // button feel obstructed once the keyboard opened.
            className="flex-1 min-w-0 bg-[#161B22] border border-[#30363D] focus:border-[#58A6FF] rounded-xl px-3.5 py-2.5 text-base text-[#E6EDF3] placeholder-[#8B949E] focus:outline-none transition-all"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2.5 bg-[#58A6FF] hover:bg-[#58A6FF]/90 disabled:opacity-40 text-[#0D1117] font-black text-sm rounded-xl shadow transition-all shrink-0"
          >
            {t.send}
          </button>
        </form>
      </div>
    </>
  )
}
