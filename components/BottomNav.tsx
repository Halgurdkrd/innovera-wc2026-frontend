'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLanguage } from '@/hooks/useLanguage'

const tabs = [
  {
    href: '/',
    labelEN: 'Home',
    labelKU: 'سەرەتا',
    exact: true,
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
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
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
  {
    href: '/h2h',
    labelEN: 'H2H',
    labelKU: 'H2H',
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
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    href: '/leaderboard',
    labelEN: 'Leaders',
    labelKU: 'پێشکەوتوان',
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
        <path d="M6 9H4.5a2.5 2.5 0 000 5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 010 5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
        <path d="M18 2H6v7a6 6 0 0012 0V2z" />
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
