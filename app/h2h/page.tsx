'use client'

import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import H2HIcon from '@/components/H2HIcon'
import { useLanguage } from '@/hooks/useLanguage'

const L = {
  EN: {
    back: '← Back',
    title: 'H2H Challenge',
    subtitle: 'Head-to-Head · Premier League 2026-27',
    comingSoonBadge: '⏳ Coming soon for the Premier League',
    comingSoonSub: 'Pick a club each gameweek — last one standing wins. We\'re rebuilding this for the new season.',
  },
  KU: {
    back: '← گەڕانەوە',
    title: 'چالەنجی H2H',
    subtitle: 'چالەنجی سەر بەسەر · پرێمیەر لیگ ٢٠٢٦-٢٧',
    comingSoonBadge: '⏳ بەمزوانە بۆ پرێمیەر لیگ',
    comingSoonSub: 'هەر هەفتەیەک باشگەیەک هەڵبژێرە — کۆتا کەسایەتی دەبەرێت. ئێمە ئەمە بۆ وەرزی نوێ دروستدەکەینەوە.',
  },
}

export default function H2HPage() {
  const router = useRouter()
  const { language, changeLanguage } = useLanguage()
  const tx = L[language]

  return (
    <div className="min-h-screen bg-slate-900 text-white pb-20">
      <Navbar language={language} onLanguageChange={changeLanguage} />
      <div className="max-w-2xl mx-auto px-4 py-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-400 mb-4 hover:text-white transition-colors"
        >
          {tx.back}
        </button>
      </div>

      <div className="bg-gradient-to-b from-slate-800 to-slate-900 px-4 pt-6 pb-8 text-center">
        <div className="flex justify-center mb-3">
          <H2HIcon size={48} />
        </div>
        <h1 className="text-3xl font-bold mb-2">{tx.title}</h1>
        <p className="text-gray-400">{tx.subtitle}</p>
      </div>

      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-yellow-500/10 border border-yellow-500 rounded-2xl p-5 text-center">
          <div className="text-yellow-400 font-bold text-lg mb-1">{tx.comingSoonBadge}</div>
          <div className="text-gray-300 text-sm">{tx.comingSoonSub}</div>
        </div>
      </div>
    </div>
  )
}
