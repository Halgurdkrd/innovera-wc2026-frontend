'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { tr } from '@/lib/translations'
import type { Language } from '@/lib/translations'

// Re-export so existing imports (`import Navbar, { type Language }`) keep working
export type { Language } from '@/lib/translations'

interface NavbarProps {
  language: Language
  onLanguageChange: (lang: Language) => void
}

export default function Navbar({ language, onLanguageChange }: NavbarProps) {
  const { user, loading, openAuthModal, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const displayName =
    (user?.user_metadata?.name as string | undefined) ??
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email?.split('@')[0] ??
    'User'

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-[#30363D] bg-[#0D1117]/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F0A500] flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                <circle cx="12" cy="12" r="10" fill="#0D1117" />
                <path
                  d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"
                  stroke="#F0A500"
                  strokeWidth="1.5"
                />
                <path
                  d="M12 7l1.5 4.5H18l-3.75 2.72 1.43 4.4L12 15.95l-3.68 2.67 1.43-4.4L6 11.5h4.5L12 7z"
                  fill="#F0A500"
                />
              </svg>
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-base font-extrabold tracking-tight text-[#E6EDF3] group-hover:text-[#F0A500] transition-colors">
                {language === 'KU'
                  ? <span className="text-[#F0A500]">ئینۆڤێرا پێشبینیکەر</span>
                  : <>Ennovera <span className="text-[#F0A500]">Predictor</span></>
                }
              </span>
              <span className="hidden sm:block text-[10px] text-[#8B949E] font-medium tracking-wide">
                {language === 'KU' ? 'جامی جیهانی FIFA ٢٠٢٦' : 'FIFA World Cup 2026'}
              </span>
            </div>
          </Link>

          {/* Nav links — desktop */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-sm text-[#8B949E] hover:text-[#E6EDF3] transition-colors">
              {tr('nav_home', language)}
            </Link>
            <Link href="/explore" className="text-sm text-[#8B949E] hover:text-[#E6EDF3] transition-colors">
              {tr('nav_explore', language)}
            </Link>
            <Link href="/scorers" className="text-sm text-[#8B949E] hover:text-[#E6EDF3] transition-colors">
              {language === 'KU' ? 'گۆڵکارەکان' : 'Scorers'}
            </Link>
            <Link href="/h2h" className="text-sm text-[#8B949E] hover:text-[#E6EDF3] transition-colors">
              {language === 'KU' ? 'هەڵبژاردنی تیم' : 'H2H'}
            </Link>
            <Link href="/leaderboard" className="text-sm text-[#8B949E] hover:text-[#E6EDF3] transition-colors">
              {tr('nav_leaderboard', language)}
            </Link>
            {user && (
              <Link href="/my-predictions" className="text-sm text-[#8B949E] hover:text-[#E6EDF3] transition-colors">
                {language === 'KU' ? 'پێشبینییەکانم' : 'My Predictions'}
              </Link>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Language toggle */}
            <div className="flex items-center rounded-lg border border-[#30363D] bg-[#161B22] p-0.5">
              {(['EN', 'KU'] as Language[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => onLanguageChange(lang)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-200 ${
                    language === lang
                      ? 'bg-[#F0A500] text-[#0D1117]'
                      : 'text-[#8B949E] hover:text-[#E6EDF3]'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>

            {/* Auth area */}
            {loading ? (
              <div className="h-8 w-8 rounded-full bg-[#161B22] border border-[#30363D] animate-pulse" />
            ) : user ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-lg border border-[#30363D] bg-[#161B22] px-2.5 py-1.5 hover:border-[#F0A500]/50 transition-all"
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="h-6 w-6 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-[#F0A500] flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-[#0D1117]">
                        {displayName[0]?.toUpperCase() ?? 'U'}
                      </span>
                    </div>
                  )}
                  <span className="hidden sm:block text-xs font-semibold text-[#E6EDF3] max-w-[100px] truncate">
                    {displayName}
                  </span>
                  <svg
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    className={`h-3 w-3 text-[#8B949E] transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  >
                    <path d="M4.427 7.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 7H4.604a.25.25 0 00-.177.427z" />
                  </svg>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-[#161B22] border border-[#30363D] rounded-xl shadow-xl py-1 z-50">
                    <div className="px-3 py-2 border-b border-[#30363D]">
                      <p className="text-xs font-semibold text-[#E6EDF3] truncate">{displayName}</p>
                      <p className="text-[10px] text-[#8B949E] truncate">{user.email}</p>
                    </div>
                    <Link
                      href="/my-predictions"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#21262D] transition-colors"
                    >
                      <span>⭐</span>
                      {language === 'KU' ? 'پێشبینییەکانم' : 'My Predictions'}
                    </Link>
                    <Link
                      href="/leaderboard"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#21262D] transition-colors"
                    >
                      <span>🏆</span>
                      {tr('nav_leaderboard', language)}
                    </Link>
                    <button
                      onClick={() => { signOut(); setMenuOpen(false) }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#F85149] hover:bg-[#F85149]/10 transition-colors"
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                        <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z" clipRule="evenodd" />
                        <path fillRule="evenodd" d="M19 10a.75.75 0 00-.75-.75H8.704l1.048-.943a.75.75 0 10-1.004-1.114l-2.5 2.25a.75.75 0 000 1.114l2.5 2.25a.75.75 0 101.004-1.114l-1.048-.943h9.546A.75.75 0 0019 10z" clipRule="evenodd" />
                      </svg>
                      {tr('nav_sign_out', language)}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => openAuthModal(language)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#F0A500] px-4 py-2 text-sm font-semibold text-[#0D1117] hover:bg-[#D4920A] transition-colors"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                  <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z" clipRule="evenodd" />
                  <path fillRule="evenodd" d="M6 10a.75.75 0 01.75-.75h9.546l-1.048-.943a.75.75 0 111.004-1.114l2.5 2.25a.75.75 0 010 1.114l-2.5 2.25a.75.75 0 11-1.004-1.114l1.048-.943H6.75A.75.75 0 016 10z" clipRule="evenodd" />
                </svg>
                {tr('nav_login', language)}
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
