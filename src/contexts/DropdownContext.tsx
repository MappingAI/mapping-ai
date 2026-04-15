import { createContext, useContext, useCallback, useRef } from 'react'

interface DropdownContextValue {
  /** Register this dropdown as open; closes any previously open dropdown. */
  openDropdown: (id: string) => void
  /** Close the specified dropdown (no-op if a different one is open). */
  closeDropdown: (id: string) => void
  /** Subscribe to be notified when your dropdown should close. Returns unsubscribe fn. */
  subscribe: (id: string, onClose: () => void) => () => void
}

const DropdownContext = createContext<DropdownContextValue | null>(null)

export function DropdownProvider({ children }: { children: React.ReactNode }) {
  const listenersRef = useRef(new Map<string, () => void>())
  const activeRef = useRef<string | null>(null)

  const openDropdown = useCallback((id: string) => {
    // Close the currently open dropdown (if different)
    if (activeRef.current && activeRef.current !== id) {
      listenersRef.current.get(activeRef.current)?.()
    }
    activeRef.current = id
  }, [])

  const closeDropdown = useCallback((id: string) => {
    if (activeRef.current === id) {
      activeRef.current = null
    }
  }, [])

  const subscribe = useCallback((id: string, onClose: () => void) => {
    listenersRef.current.set(id, onClose)
    return () => {
      listenersRef.current.delete(id)
      if (activeRef.current === id) activeRef.current = null
    }
  }, [])

  return (
    <DropdownContext.Provider value={{ openDropdown, closeDropdown, subscribe }}>
      {children}
    </DropdownContext.Provider>
  )
}

export function useDropdownContext() {
  return useContext(DropdownContext)
}
