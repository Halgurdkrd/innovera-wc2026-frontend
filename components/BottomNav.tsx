'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLanguage } from '@/hooks/useLanguage'

// Home ('/', labelled "Predictions" elsewhere) and Leaders ('/leaderboard')
// temporarily hidden from navigation (routes/pages untouched, still
// reachable directly) -- only Premier League, Fantasy, Explore remain,
// in that order, matching the desktop Navbar.
const tabs = [
  {
    href: '/premier-league',
    labelEN: 'PL',
    labelKU: 'پرێمیەر',
    exact: false,
    icon: (active: boolean) => (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke={active ? '#F0A500' : '#8B949E'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6"
        aria-hidden="true"
      >
        <path d="M12 2l8 3v6c0 5.55-3.84 10.74-8 12-4.16-1.26-8-6.45-8-12V5l8-3z" />
      </svg>
    ),
  },
  {
    href: '/fantasy',
    labelEN: 'Fantasy',
    labelKU: 'فانتازی',
    exact: false,
    icon: (active: boolean) => (
      <svg
        viewBox="0 0 24 24"
        fill={active ? '#F0A500' : 'none'}
        stroke={active ? '#F0A500' : '#8B949E'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6"
        aria-hidden="true"
      >
        <polygon points="12 2 15.09 8.63 22 9.24 16.9 13.97 18.18 20.6 12 17.27 5.82 20.6 7.1 13.97 2 9.24 8.91 8.63 12 2" />
      </svg>
    ),
  },
  {
    href: '/explore',
    labelEN: 'Explore',
    labelKU: 'گەڕان',
    exact: false,
    icon: (active: boolean) => (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke={active ? '#F0A500' : '#8B949E'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
]

export default function BottomNav() {
  const pathname = usePathname()
  const { language } = useLanguage()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#161B22] border-t border-[#30363D]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex h-[60px]">
        {tabs.map((tab) => {
          const isActive = tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 transition-opacity active:opacity-70"
            >
              {tab.icon(isActive)}
              <span
                className={`text-[10px] font-semibold transition-colors ${
                  isActive ? 'text-[#F0A500]' : 'text-[#8B949E]'
                }`}
              >
                {language === 'KU' ? tab.labelKU : tab.labelEN}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
