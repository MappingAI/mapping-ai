import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import { usePasswordGate } from '../hooks/usePasswordGate'

export function PasswordGate({ children }: { children: React.ReactNode }) {
  const gate = usePasswordGate()
  const [password, setPassword] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (gate.isPromptOpen) inputRef.current?.focus()
  }, [gate.isPromptOpen])

  if (gate.isUnlocked) return <>{children}</>

  const handleSubmit = async () => {
    const ok = await gate.tryUnlock(password)
    if (!ok) setPassword('')
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <>
      {children}

      {/* Lock overlay — blocks interaction, click to open prompt */}
      <div
        onClick={gate.openPrompt}
        className="fixed left-0 right-0 bottom-0 z-[500] cursor-pointer"
        style={{ top: 48 }}
      />

      {/* Password prompt modal */}
      {gate.isPromptOpen && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) gate.closePrompt()
          }}
        >
          <div className="bg-white rounded-lg px-8 py-6 max-w-[380px] w-[90%] shadow-2xl">
            <h2 className="font-mono text-[13px] uppercase tracking-wider mb-3">
              Enter Password
            </h2>
            <p className="text-sm leading-relaxed text-[#555] mb-4">
              This tool is in a pre-launch beta. Enter the password to access
              the contribution form.
            </p>
            <input
              ref={inputRef}
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={gate.isLockedOut}
              className="w-full px-3 py-2.5 font-mono text-[13px] border border-[#ddd] rounded mb-2 box-border disabled:opacity-50"
            />
            {gate.error && (
              <div className="text-red-600 text-xs font-mono mb-2">
                {gate.error}
              </div>
            )}
            <button
              onClick={handleSubmit}
              disabled={gate.isLockedOut}
              className="font-mono text-[11px] uppercase tracking-wider px-6 py-2.5 bg-[#1a1a1a] text-white border-none rounded cursor-pointer w-full disabled:opacity-50"
            >
              Submit
            </button>
          </div>
        </div>
      )}
    </>
  )
}
