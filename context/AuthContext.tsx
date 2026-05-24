'use client'

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Language } from '@/components/Navbar'

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  showAuthModal: boolean
  modalLanguage: Language
  openAuthModal: (lang?: Language) => void
  closeAuthModal: () => void
  signInWithGoogle: () => Promise<void>
  signInWithFacebook: () => Promise<void>
  signOut: () => Promise<void>
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  showAuthModal: false,
  modalLanguage: 'EN',
  openAuthModal: () => {},
  closeAuthModal: () => {},
  signInWithGoogle: async () => {},
  signInWithFacebook: async () => {},
  signOut: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function upsertUserProfile(user: User) {
  const { data: existing } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (!existing) {
    const username =
      (user.user_metadata?.name as string | undefined) ??
      (user.user_metadata?.full_name as string | undefined) ??
      user.email?.split('@')[0] ??
      'Predictor'
    const avatar_url = (user.user_metadata?.avatar_url as string | undefined) ?? null

    await supabase.from('user_profiles').insert({
      id: user.id,
      username,
      avatar_url,
      total_points: 0,
      weekly_points: 0,
      beat_ai_count: 0,
      streak: 0,
    })
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [modalLanguage, setModalLanguage] = useState<Language>('EN')
  const initialised = useRef(false)

  useEffect(() => {
    // Restore existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      setUser(session?.user ?? null)

      if (event === 'SIGNED_IN' && session?.user) {
        if (!initialised.current) {
          initialised.current = true
          await upsertUserProfile(session.user)
        }
        setShowAuthModal(false)
      }

      if (event === 'SIGNED_OUT') {
        initialised.current = false
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const openAuthModal = (lang: Language = 'EN') => {
    setModalLanguage(lang)
    setShowAuthModal(true)
  }

  const closeAuthModal = () => setShowAuthModal(false)

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    })
  }

  const signInWithFacebook = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    })
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        showAuthModal,
        modalLanguage,
        openAuthModal,
        closeAuthModal,
        signInWithGoogle,
        signInWithFacebook,
        signOut,
      }}
    >
      {children}
      {showAuthModal && (
        <AuthModalPortal language={modalLanguage} onClose={closeAuthModal} />
      )}
    </AuthContext.Provider>
  )
}

// ── Auth Modal (rendered inside provider) ─────────────────────────────────────

const modalLabels = {
  EN: {
    title: 'Sign in to Innovera Predictor',
    subtitle: 'Save predictions · Climb the leaderboard · Compete with AI',
    google: 'Continue with Google',
    facebook: 'Continue with Facebook',
    note: 'All match data and predictions remain visible without an account.',
    terms: 'By continuing you agree to our Terms of Service.',
    close: 'Close',
  },
  KU: {
    title: 'چوونەژوورەوە بۆ ئینۆڤێرا پێشبینیکەر',
    subtitle: 'پێشبینیەکانت بپارێزە · لە پلەبەندی بەرزبە · دژ بە AI بپێوێ',
    google: 'بەردەوامبوون بە Google',
    facebook: 'بەردەوامبوون بە Facebook',
    note: 'هەموو داتاو پێشبینیەکان بەبێ ئەکاونت دەبینرێن.',
    terms: 'بەردەوامبوون بەواتای ڕازیبوون بە مەرجەکانی خزمەتگوزارییە.',
    close: 'داخستن',
  },
}

function AuthModalPortal({
  language,
  onClose,
}: {
  language: Language
  onClose: () => void
}) {
  const { signInWithGoogle, signInWithFacebook } = useAuth()
  const t = modalLabels[language]

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#161B22] border border-[#30363D] rounded-2xl max-w-sm w-full p-6 space-y-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Logo + title */}
        <div className="text-center space-y-3">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F0A500] mx-auto shadow-lg shadow-[#F0A500]/30">
            <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden="true">
              <circle cx="12" cy="12" r="10" fill="#0D1117" />
              <path d="M12 7l1.5 4.5H18l-3.75 2.72 1.43 4.4L12 15.95l-3.68 2.67 1.43-4.4L6 11.5h4.5L12 7z" fill="#F0A500" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-[#E6EDF3]">{t.title}</h2>
          <p className="text-sm text-[#8B949E]">{t.subtitle}</p>
        </div>

        {/* OAuth buttons */}
        <div className="space-y-3">
          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center gap-3 bg-white hover:bg-gray-100 text-gray-900 font-semibold py-3 px-4 rounded-xl transition-colors text-sm"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 flex-shrink-0" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            {t.google}
          </button>

          <button
            onClick={signInWithFacebook}
            className="w-full flex items-center gap-3 bg-[#1877F2] hover:bg-[#166FE5] text-white font-semibold py-3 px-4 rounded-xl transition-colors text-sm"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 flex-shrink-0 fill-white" aria-hidden="true">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            {t.facebook}
          </button>
        </div>

        {/* Divider note */}
        <div className="space-y-2 text-center">
          <p className="text-xs text-[#8B949E]">{t.note}</p>
          <p className="text-[10px] text-[#30363D]">{t.terms}</p>
        </div>

        <button
          onClick={onClose}
          className="w-full text-sm text-[#8B949E] hover:text-[#E6EDF3] transition-colors py-1"
        >
          {t.close}
        </button>
      </div>
    </div>
  )
}
