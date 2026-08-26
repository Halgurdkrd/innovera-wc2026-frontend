'use client'

import Navbar from '@/components/Navbar'
import { useLanguage } from '@/hooks/useLanguage'

const L = {
  EN: {
    title: 'Fantasy AI',
    subtitle: 'Your AI Fantasy Manager — squad, transfers, captain and chip recommendations',
    beta: 'Beta',
    comingSoon: 'Fantasy AI is in beta — predictions updating for 2026-27 season. Check back soon.',
  },
  KU: {
    title: 'فانتازی AI',
    subtitle: 'بەڕێوەبەری فانتازیت بە هوشی دەستکرد — تیم، گۆڕانکاری، کاپتن و ئامۆژگاری چیپ',
    beta: 'تاقیکردنەوە',
    comingSoon: 'فانتازی AI لە دۆخی تاقیکردنەوەدایە — پێشبینیەکان بۆ وەرزی ٢٠٢٦-٢٧ نوێ دەکرێنەوە. دووبارە سەردان بکە.',
  },
}

export default function FantasyPage() {
  const { language, changeLanguage } = useLanguage()
  const t = L[language]

  return (
    <div className="min-h-screen bg-[#0D1117]">
      <Navbar language={language} onLanguageChange={changeLanguage} />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-6 pb-24 md:pb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-extrabold text-[#E6EDF3]">{t.title}</h1>
          <span className="text-[10px] font-bold text-[#F0A500] bg-[#F0A500]/10 border border-[#F0A500]/30 px-2 py-0.5 rounded-full">
            {t.beta}
          </span>
        </div>
        <p className="text-sm text-[#8B949E] -mt-4">{t.subtitle}</p>

        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-12 text-center">
          <span className="text-4xl">🎯</span>
          <p className="mt-4 text-[#8B949E]">{t.comingSoon}</p>
        </div>
      </main>
    </div>
  )
}
