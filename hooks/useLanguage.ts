'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Language } from '@/lib/translations'

const STORAGE_KEY = 'innovera_language'

export function useLanguage() {
  const [language, setLanguage] = useState<Language>('EN')

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'EN' || stored === 'KU') {
      setLanguage(stored)
    }
  }, [])

  const changeLanguage = useCallback((lang: Language) => {
    setLanguage(lang)
    localStorage.setItem(STORAGE_KEY, lang)
  }, [])

  return { language, changeLanguage }
}
