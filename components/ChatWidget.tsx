'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useLanguage } from '@/hooks/useLanguage'
import { API_BASE } from '@/lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChatMsg {
  id: string
  role: 'user' | 'ai'
  text: string
  time: string
  loading?: boolean
  error?: boolean
}

type Lang = 'EN' | 'KU'

// ── Static data ───────────────────────────────────────────────────────────────

const SUGGESTIONS: Record<Lang, string[]> = {
  EN: [
    'Who will win the World Cup?',
    'Tell me about Group I',
    'How will France perform?',
    "What are Morocco's chances?",
    'Who is the favorite to win?',
    "Tell me about Iraq's group",
    'Which teams qualify from Group A?',
    'Who has the best defense?',
    'Tell me about Norway',
    'What does AI predict for Spain?',
  ],
  KU: [
    'کێ جامی جیهانی دەبات؟',
    'لەبارەی گروپی I زانیاریم پێ بدە',
    'فەرەنسا چۆن دەیبێت؟',
    'مەغریب چەند دەرفەتی هەیە؟',
    'کێ درەفەتی زیاترە بۆ بردنەوە؟',
    'لەبارەی گروپی عێراق زانیاریم پێ بدە',
    'کام تیمەکان بە یەکەمی سەردەکەوێت لە گروپی A',
    'کامیان باشترین بەرگریە؟',
    'لەبارەی نەرویج زانیاریم پێ بدە',
    '‏AI چی پێشبینی دەکات بۆ ئیسپانیا؟',
  ],
}

const WELCOME: Record<Lang, string> = {
  EN: "👋 Hi! I'm Ennovera's AI assistant for the 2026 World Cup. Ask me anything about teams, predictions, or the tournament!",
  KU: '👋 سڵاو! من یارمەتیدەری زیرەکی دەستکردی ئینۆڤێرام بۆ جامی جیهانی ٢٠٢٦. هەر شتێک لەبارەی تیمەکان، پێشبینییەکان بپرسە!',
}

const COPY: Record<Lang, {
  title: string; online: string; placeholder: string
  sleepErr: string; netErr: string; emptyErr: string
}> = {
  EN: {
    title: 'Ennovera AI Assistant',
    online: 'Online',
    placeholder: 'Ask about the World Cup…',
    sleepErr: '⏳ The AI is waking up — please try again in a moment.',
    netErr: '🔌 Connection error. Check your internet.',
    emptyErr: "I didn't understand that. Try one of the suggested questions below.",
  },
  KU: {
    title: 'یارمەتیدەری AI ئینۆڤێرا',
    online: 'ئۆنلاین',
    placeholder: 'لەبارەی جامی جیهان بپرسە…',
    sleepErr: '⏳ AI بە ئاگا دێتەوە، تکایە چەند خولەکێکی تر دووبارە هەوڵ بدەرەوە.',
    netErr: '🔌 کێشەی پەیوەندی. ئینتەرنێتەکەت بپشکنە.',
    emptyErr: 'تێگەیشتم نەبوو. یەکێک لە پرسیارە پێشنیارکراوەکان بکارببە.',
  },
}

const MAX_MSGS = 50
const TIMEOUT_MS = 30_000

function fmtTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function pick3(pool: string[]): string[] {
  const arr = [...pool]
  const out: string[] = []
  while (out.length < 3 && arr.length) {
    const i = Math.floor(Math.random() * arr.length)
    out.push(arr.splice(i, 1)[0])
  }
  return out
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LoadingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 150, 300].map(d => (
        <span
          key={d}
          className="inline-block h-2 w-2 rounded-full bg-[#8B949E] animate-bounce"
          style={{ animationDelay: `${d}ms` }}
        />
      ))}
    </div>
  )
}

// ── Main widget ───────────────────────────────────────────────────────────────

export default function ChatWidget() {
  const { language } = useLanguage()
  const [chatLang, setChatLang] = useState<Lang>('EN')
  const [isOpen, setIsOpen] = useState(false)
  const [hasOpened, setHasOpened] = useState(false)
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  // Sync chat language with app language on mount
  useEffect(() => { setChatLang(language as Lang) }, [language])

  // Check if chat was opened before (for red dot)
  useEffect(() => {
    setHasOpened(localStorage.getItem('innovera_chat_opened') === '1')
  }, [])

  // Welcome message + suggestions on first open
  useEffect(() => {
    if (!isOpen || messages.length > 0) return
    setMessages([{ id: 'welcome', role: 'ai', text: WELCOME[chatLang], time: fmtTime() }])
    setSuggestions(pick3(SUGGESTIONS[chatLang]))
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  const handleOpen = () => {
    setIsOpen(v => !v)
    if (!hasOpened) {
      setHasOpened(true)
      localStorage.setItem('innovera_chat_opened', '1')
    }
  }

  const handleLangToggle = (lang: Lang) => {
    setChatLang(lang)
    // Reset to welcome in new language
    setMessages([{ id: 'welcome-' + lang, role: 'ai', text: WELCOME[lang], time: fmtTime() }])
    setSuggestions(pick3(SUGGESTIONS[lang]))
  }

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return

    const userMsg: ChatMsg = { id: Date.now() + 'u', role: 'user', text: trimmed, time: fmtTime() }
    const loadingId = Date.now() + 'l'
    const loadingMsg: ChatMsg = { id: String(loadingId), role: 'ai', text: '', time: fmtTime(), loading: true }

    setMessages(prev => [...prev, userMsg, loadingMsg].slice(-MAX_MSGS))
    setInput('')
    setSuggestions([])
    setIsLoading(true)

    const controller = new AbortController()
    const tid = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      const apiUrl = API_BASE
      const res = await fetch(`${apiUrl}/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmed, language: chatLang === 'EN' ? 'en' : 'ku' }),
        signal: controller.signal,
      })
      clearTimeout(tid)

      const c = COPY[chatLang]
      let aiText = c.emptyErr
      if (res.ok) {
        const data = await res.json()
        aiText = data.answer || data.response || c.emptyErr
      } else {
        aiText = c.netErr
      }

      setMessages(prev => [
        ...prev.filter(m => m.id !== String(loadingId)),
        { id: Date.now() + 'a', role: 'ai' as const, text: aiText, time: fmtTime() },
      ].slice(-MAX_MSGS))
      setSuggestions(pick3(SUGGESTIONS[chatLang]))
    } catch (err) {
      clearTimeout(tid)
      const c = COPY[chatLang]
      const isAbort = (err as Error).name === 'AbortError'
      setMessages(prev => [
        ...prev.filter(m => m.id !== String(loadingId)),
        { id: Date.now() + 'e', role: 'ai' as const, text: isAbort ? c.sleepErr : c.netErr, time: fmtTime(), error: true },
      ].slice(-MAX_MSGS))
      setSuggestions(pick3(SUGGESTIONS[chatLang]))
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, chatLang])

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); sendMessage(input) }
  const handleSuggestion = (q: string) => sendMessage(q)

  const c = COPY[chatLang]
  const charCount = input.length

  return (
    <>
      {/* ── Chat panel ──────────────────────────────────────────────────────── */}
      <div
        ref={panelRef}
        role="dialog"
        aria-label={c.title}
        className={`fixed z-50 transition-all duration-300 ease-out
          bottom-[148px] right-4 left-4
          md:left-auto md:w-[380px]
          ${isOpen
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-4 pointer-events-none'
          }`}
      >
        <div className="flex flex-col bg-[#161B22] border border-[#30363D] rounded-2xl shadow-2xl shadow-black/50"
          style={{ height: 'min(65vh, 500px)' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#0D1117] border-b border-[#30363D] rounded-t-2xl flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">⚽</span>
              <div>
                <p className="text-sm font-bold text-[#E6EDF3] leading-tight">{c.title}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#2EA043] inline-block" />
                  <span className="text-[10px] text-[#2EA043]">{c.online}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Language toggle */}
              <div className="flex items-center bg-[#161B22] border border-[#30363D] rounded-lg p-0.5">
                {(['EN', 'KU'] as Lang[]).map(l => (
                  <button
                    key={l}
                    onClick={() => handleLangToggle(l)}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${
                      chatLang === l ? 'bg-[#F0A500] text-[#0D1117]' : 'text-[#8B949E]'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close chat"
                className="h-7 w-7 flex items-center justify-center rounded-lg text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#30363D] transition-colors text-xs"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
            {messages.map(msg => (
              <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  dir={chatLang === 'KU' ? 'rtl' : 'ltr'}
                  className={`max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#F0A500] text-[#0D1117] rounded-2xl rounded-br-sm font-medium'
                      : `bg-[#21262D] text-[#E6EDF3] rounded-2xl rounded-bl-sm ${msg.error ? 'border border-[#F85149]/30' : ''}`
                  }`}>
                  {msg.loading ? <LoadingDots /> : msg.text}
                </div>
                {!msg.loading && (
                  <span className="text-[9px] text-[#8B949E] mt-1 px-1">{msg.time}</span>
                )}
              </div>
            ))}

            {/* Suggested questions */}
            {suggestions.length > 0 && !isLoading && (
              <div className="flex flex-wrap gap-2 pt-1">
                {suggestions.map(q => (
                  <button
                    key={q}
                    dir={chatLang === 'KU' ? 'rtl' : 'ltr'}
                    onClick={() => handleSuggestion(q)}
                    className="text-[11px] text-[#E6EDF3] bg-[#21262D] border border-[#30363D] hover:border-[#F0A500]/60 hover:text-[#F0A500] rounded-2xl px-3 py-1.5 transition-colors text-left"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 px-3 py-3 border-t border-[#30363D] flex-shrink-0"
          >
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                dir="auto"
                value={input}
                onChange={e => setInput(e.target.value.slice(0, 200))}
                placeholder={c.placeholder}
                disabled={isLoading}
                className="w-full bg-[#21262D] border border-[#30363D] rounded-3xl px-4 py-2.5 text-sm text-[#E6EDF3] placeholder-[#8B949E] focus:border-[#F0A500] focus:outline-none disabled:opacity-50 transition-colors pr-14"
              />
              {charCount > 150 && (
                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] tabular-nums ${charCount >= 200 ? 'text-[#F85149]' : 'text-[#8B949E]'}`}>
                  {200 - charCount}
                </span>
              )}
            </div>
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className={`h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                input.trim() && !isLoading
                  ? 'bg-[#F0A500] hover:bg-[#D4920A] shadow-md shadow-[#F0A500]/20'
                  : 'bg-[#30363D] cursor-not-allowed'
              }`}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 ${input.trim() && !isLoading ? 'text-[#0D1117]' : 'text-[#8B949E]'}`}>
                <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
              </svg>
            </button>
          </form>
        </div>
      </div>

      {/* ── Floating button ──────────────────────────────────────────────────── */}
      <button
        ref={btnRef}
        onClick={handleOpen}
        aria-label={isOpen ? 'Close chat' : 'Open AI chat assistant'}
        className="fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full bg-[#F0A500] hover:bg-[#D4920A] flex items-center justify-center transition-all duration-200 active:scale-95"
        style={{ boxShadow: '0 4px 12px rgba(240,165,0,0.4)' }}
      >
        {isOpen ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" className="h-5 w-5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="white" className="h-6 w-6">
            <path fillRule="evenodd" d="M4.804 21.644A6.707 6.707 0 006 21.75a6.721 6.721 0 003.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 01-.814 1.686.75.75 0 00.44 1.223 15.53 15.53 0 003-.89z" clipRule="evenodd" />
          </svg>
        )}
        {/* Red dot badge */}
        {!hasOpened && !isOpen && (
          <span className="absolute top-0.5 right-0.5 h-3.5 w-3.5 rounded-full bg-[#F85149] border-2 border-[#0D1117]" />
        )}
      </button>
    </>
  )
}
