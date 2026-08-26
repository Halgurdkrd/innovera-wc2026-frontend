'use client'

import Navbar from '@/components/Navbar'
import { useLanguage } from '@/hooks/useLanguage'

const L = {
  EN: {
    title: 'Premier League AI',
    subtitle: 'AI-powered match predictions for every Premier League fixture',
    comingSoon: 'Fixture predictions are being connected — check back soon.',
  },
  KU: {
    title: 'پرێمیەر لیگ AI',
    subtitle: 'پێشبینی یاری بە هوشی دەستکرد بۆ هەموو یارییەکانی پرێمیەر لیگ',
    comingSoon: 'پێشبینی یارییەکان بەمزوانە پەیوەست دەکرێت — دووبارە سەردان بکە.',
  },
}

export default function PremierLeaguePage() {
  const { language, changeLanguage } = useLanguage()
  const t = L[language]

  return (
    <div className="min-h-screen bg-[#0D1117]">
      <Navbar language={language} onLanguageChange={changeLanguage} />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-6 pb-24 md:pb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-[#E6EDF3]">{t.title}</h1>
          <p className="text-sm text-[#8B949E] mt-1">{t.subtitle}</p>
        </div>

        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-12 text-center">
          <span className="text-4xl">⚽</span>
          <p className="mt-4 text-[#8B949E]">{t.comingSoon}</p>
        </div>
      </main>
    </div>
  )
}
