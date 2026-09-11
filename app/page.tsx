'use client'

import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { useLanguage } from '@/hooks/useLanguage'

const labels = {
  EN: {
    hero_title: 'AI-Powered Football Predictions',
    hero_subtitle: 'Match outcomes and fantasy recommendations, powered by Ennovera',
    hero_badge: 'Powered by AI',
    pl_title: 'Premier League AI',
    pl_desc: 'AI-powered match predictions for every Premier League fixture',
    pl_cta: 'Explore Predictions',
    fantasy_title: 'Fantasy AI',
    fantasy_desc: 'Your AI Fantasy Manager — squad, transfers, captain and chip recommendations',
    fantasy_cta: 'Open Fantasy',
    fantasy_beta: 'Beta',
    laliga_title: 'La Liga AI',
    laliga_desc: 'Coming Soon',
    laliga_badge: 'Coming Soon',
  },
  KU: {
    hero_title: 'پێشبینی وەرزشی بە هوشی دەستکرد',
    hero_subtitle: 'ئەنجامی یاری و ئامۆژگاری فانتازی، بە هێزی ئینۆڤێرا',
    hero_badge: 'زیرەکی دەستکرد',
    pl_title: 'پرێمیەر لیگ AI',
    pl_desc: 'پێشبینی یاری بە هوشی دەستکرد بۆ هەموو یارییەکانی پرێمیەر لیگ',
    pl_cta: 'پێشبینیەکان ببینە',
    fantasy_title: 'فانتازی AI',
    fantasy_desc: 'بەڕێوەبەری فانتازیت بە هوشی دەستکرد — تیم، گۆڕانکاری، کاپتن و ئامۆژگاری چیپ',
    fantasy_cta: 'کردنەوەی فانتازی',
    fantasy_beta: 'تاقیکردنەوە',
    laliga_title: 'لا لیگا AI',
    laliga_desc: 'بەمزوانە',
    laliga_badge: 'بەمزوانە',
  },
}

// Fantasy AI is marked Beta until Antigravity confirms the /api/v1/fpl/* endpoints are
// live with fresh 2026-27 data — see PROGRESS.md for status.
const FANTASY_LIVE_DATA_CONFIRMED = false

function ProductCard({
  title,
  description,
  cta,
  href,
  status,
  icon,
}: {
  title: string
  description: string
  cta?: string
  href?: string
  status?: { label: string; tone: 'beta' | 'soon' }
  icon: string
}) {
  const isDisabled = !href

  const inner = (
    <div
      className={`relative h-full bg-[#161B22] border rounded-2xl p-6 flex flex-col gap-4 transition-all ${
        isDisabled
          ? 'border-[#30363D]/50 opacity-50 cursor-not-allowed'
          : 'border-[#30363D] hover:border-[#F0A500]/50 hover:-translate-y-0.5'
      }`}
    >
      {status && (
        <span
          className={`absolute top-4 right-4 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
            status.tone === 'beta'
              ? 'text-[#F0A500] bg-[#F0A500]/10 border-[#F0A500]/30'
              : 'text-[#8B949E] bg-[#30363D]/40 border-[#30363D]'
          }`}
        >
          {status.label}
        </span>
      )}
      <span className="text-4xl">{icon}</span>
      <div className="space-y-1.5 flex-1">
        <h3 className="text-lg font-bold text-[#E6EDF3]">{title}</h3>
        <p className="text-sm text-[#8B949E] leading-relaxed">{description}</p>
      </div>
      {cta && (
        <span
          className={`inline-flex items-center gap-1.5 text-sm font-semibold ${
            isDisabled ? 'text-[#8B949E]' : 'text-[#F0A500]'
          }`}
        >
          {cta}
          {!isDisabled && (
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
              <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
            </svg>
          )}
        </span>
      )}
    </div>
  )

  if (isDisabled) return inner
  return <Link href={href}>{inner}</Link>
}

export default function HomePage() {
  const { language, changeLanguage } = useLanguage()
  const t = labels[language]

  return (
    <div className="min-h-screen bg-[#0D1117]">
      <Navbar language={language} onLanguageChange={changeLanguage} />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-16">
        {/* ── Hero ── */}
        <section className="relative text-center py-16 sm:py-20 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <div className="h-[400px] w-[600px] rounded-full bg-[#F0A500]/5 blur-3xl" />
          </div>

          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#F0A500]/30 bg-[#F0A500]/10 px-4 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#F0A500] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#F0A500]" />
            </span>
            <span className="text-xs font-semibold text-[#F0A500]">{t.hero_badge}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-[#E6EDF3] tracking-tight leading-tight max-w-4xl mx-auto">
            {language === 'EN' ? (
              <><span className="text-[#F0A500]">Ennovera</span> AI</>
            ) : (
              <><span className="text-[#F0A500]">ئینۆڤێرا</span> AI</>
            )}
          </h1>

          <p className="mt-6 text-base sm:text-lg text-[#8B949E] max-w-2xl mx-auto leading-relaxed">
            {t.hero_subtitle}
          </p>
        </section>

        {/* ── Product cards ── */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <ProductCard
            icon="⚽"
            title={t.pl_title}
            description={t.pl_desc}
            cta={t.pl_cta}
            href="/premier-league"
          />
          <ProductCard
            icon="🎯"
            title={t.fantasy_title}
            description={t.fantasy_desc}
            cta={t.fantasy_cta}
            href="/fantasy"
            status={!FANTASY_LIVE_DATA_CONFIRMED ? { label: t.fantasy_beta, tone: 'beta' } : undefined}
          />
          <ProductCard
            icon="🇪🇸"
            title={t.laliga_title}
            description={t.laliga_desc}
            status={{ label: t.laliga_badge, tone: 'soon' }}
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-[#30363D] bg-[#0D1117]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-[#F0A500]">
                <span className="text-xs font-bold text-[#0D1117]">I</span>
              </div>
              <span className="text-sm font-semibold text-[#E6EDF3]">
                {language === 'KU' ? 'ئینۆڤێرا' : 'Ennovera'}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-[#8B949E]">
              <a href="/about" className="hover:text-[#E6EDF3] transition-colors">
                {language === 'KU' ? 'دەربارە' : 'About'}
              </a>
              <span>·</span>
              <span>
                {language === 'KU'
                  ? 'هەموو حوقوقەکان پارێزراون © ٢٠٢٦ Ennovera'
                  : '© 2026 Ennovera · AI predictions for entertainment purposes.'}
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
