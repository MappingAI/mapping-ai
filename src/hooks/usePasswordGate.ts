import { useState, useCallback, useEffect, useRef } from 'react'

const STORAGE_KEY = 'siteUnlocked'
const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 30_000

/** Hash a string with SHA-256 and return the hex digest. */
async function sha256(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input)
  const buf = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

interface PasswordGateState {
  isUnlocked: boolean
  isPromptOpen: boolean
  error: string | null
  isLockedOut: boolean
  lockoutRemaining: number
  openPrompt: () => void
  closePrompt: () => void
  tryUnlock: (password: string) => Promise<boolean>
}

export function usePasswordGate(): PasswordGateState {
  const siteHash = import.meta.env.VITE_SITE_PASSWORD_HASH ?? ''
  const isDevMode = !siteHash || siteHash === '__SITE_PASSWORD_HASH__'

  const [isUnlocked, setIsUnlocked] = useState(
    () => isDevMode || localStorage.getItem(STORAGE_KEY) === '1',
  )
  const [isPromptOpen, setIsPromptOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Brute-force protection via sessionStorage
  const attemptsRef = useRef(
    parseInt(sessionStorage.getItem('gateAttempts') ?? '0', 10),
  )
  const lockedUntilRef = useRef(
    parseInt(sessionStorage.getItem('gateLockUntil') ?? '0', 10),
  )
  const [isLockedOut, setIsLockedOut] = useState(
    () => Date.now() < lockedUntilRef.current,
  )
  const [lockoutRemaining, setLockoutRemaining] = useState(0)

  // Countdown timer for lockout
  useEffect(() => {
    if (!isLockedOut) return
    const tick = () => {
      const remaining = Math.ceil(
        (lockedUntilRef.current - Date.now()) / 1000,
      )
      if (remaining <= 0) {
        setIsLockedOut(false)
        setLockoutRemaining(0)
        setError(null)
      } else {
        setLockoutRemaining(remaining)
        setError(`Too many attempts. Try again in ${remaining}s.`)
      }
    }
    tick()
    const id = setInterval(tick, 500)
    return () => clearInterval(id)
  }, [isLockedOut])

  const openPrompt = useCallback(() => setIsPromptOpen(true), [])
  const closePrompt = useCallback(() => setIsPromptOpen(false), [])

  const tryUnlock = useCallback(
    async (password: string): Promise<boolean> => {
      if (isLockedOut || !password) return false

      const hashHex = await sha256(password)
      if (hashHex === siteHash) {
        sessionStorage.removeItem('gateAttempts')
        sessionStorage.removeItem('gateLockUntil')
        localStorage.setItem(STORAGE_KEY, '1')
        setIsUnlocked(true)
        setIsPromptOpen(false)
        setError(null)
        return true
      }

      // Wrong password
      attemptsRef.current++
      sessionStorage.setItem('gateAttempts', String(attemptsRef.current))

      if (attemptsRef.current >= MAX_ATTEMPTS) {
        lockedUntilRef.current = Date.now() + LOCKOUT_MS
        sessionStorage.setItem(
          'gateLockUntil',
          String(lockedUntilRef.current),
        )
        setIsLockedOut(true)
      } else {
        const remaining = MAX_ATTEMPTS - attemptsRef.current
        setError(
          `Incorrect password (${remaining} attempt${remaining === 1 ? '' : 's'} remaining)`,
        )
      }
      return false
    },
    [isLockedOut, siteHash],
  )

  return {
    isUnlocked,
    isPromptOpen,
    error,
    isLockedOut,
    lockoutRemaining,
    openPrompt,
    closePrompt,
    tryUnlock,
  }
}
