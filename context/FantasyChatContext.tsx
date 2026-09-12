'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export interface FantasyPageContextValue {
  model: 'M3_SHRUNK' | 'V0_CONTROL'
  gameweek: number
  object: string
}

interface FantasyChatContextShape {
  fantasyContext: FantasyPageContextValue | null
  setFantasyContext: (value: FantasyPageContextValue | null) => void
}

const FantasyChatContext = createContext<FantasyChatContextShape>({
  fantasyContext: null,
  setFantasyContext: () => {},
})

// Lets the single, site-wide Ask Ennovera assistant know the Fantasy
// page's currently selected gameweek/decision object -- WITHOUT the
// assistant needing to be mounted inside the Fantasy page's own component
// tree. The Fantasy page writes into this context whenever its selected
// gw/tab changes (and clears it on unmount, so navigating away never
// leaves stale Fantasy context fabricated on an unrelated page); every
// other route simply never sets it, so the assistant answers Fantasy
// questions using the latest registered forecast instead.
export function FantasyChatContextProvider({ children }: { children: ReactNode }) {
  const [fantasyContext, setFantasyContextState] = useState<FantasyPageContextValue | null>(null)
  const setFantasyContext = useCallback((value: FantasyPageContextValue | null) => {
    setFantasyContextState(value)
  }, [])
  return (
    <FantasyChatContext.Provider value={{ fantasyContext, setFantasyContext }}>
      {children}
    </FantasyChatContext.Provider>
  )
}

export function useFantasyChatContext() {
  return useContext(FantasyChatContext)
}
