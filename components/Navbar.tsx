'use client'

import Link from 'next/link'

const translations = {
  EN: {
    login: 'Login',
    predictions: 'Predictions',
    standings: 'Standings',
    tagline: 'WC 2026',
  },
  KU: {
    login: 'چوونەژوورەوە',
    predictions: 'پێشبینیەکان',
    standings: 'پلەبەندی',
    tagline: 'جامی جیهان ٢٠٢٦',
  },
}

export type Language = 'EN' | 'KU'

interface NavbarProps {
  language: Language
  onLanguageChange: (lang: Language) => void
}

export default function Navbar({ language, onLanguageChange }: NavbarProps) {
  const t = translations[language]

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-[#30363D] bg-[#0D1117]/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F0A500]">
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
            <span className="text-lg font-bold tracking-tight text-[#E6EDF3] group-hover:text-[#F0A500] transition-colors">
              Innovera
            </span>
            <span className="hidden sm:inline-block text-xs font-medium text-[#8B949E] bg-[#161B22] border border-[#30363D] px-2 py-0.5 rounded-full">
              {t.tagline}
            </span>
          </Link>

          {/* Nav links — desktop */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-sm text-[#8B949E] hover:text-[#E6EDF3] transition-colors">
              {t.predictions}
            </Link>
            <Link href="/standings" className="text-sm text-[#8B949E] hover:text-[#E6EDF3] transition-colors">
              {t.standings}
            </Link>
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

            {/* Login button */}
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#F0A500] px-4 py-2 text-sm font-semibold text-[#0D1117] hover:bg-[#D4920A] transition-colors"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z"
                  clipRule="evenodd"
                />
                <path
                  fillRule="evenodd"
                  d="M6 10a.75.75 0 01.75-.75h9.546l-1.048-.943a.75.75 0 111.004-1.114l2.5 2.25a.75.75 0 010 1.114l-2.5 2.25a.75.75 0 11-1.004-1.114l1.048-.943H6.75A.75.75 0 016 10z"
                  clipRule="evenodd"
                />
              </svg>
              {t.login}
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
