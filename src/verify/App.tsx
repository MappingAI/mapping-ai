import { useState, useCallback } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { VerifyQueue } from './VerifyQueue'
import { EntityReview } from './EntityReview'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

const API_BASE = '/api'

export async function verifyFetch<T>(path: string, verifyKey: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'X-Verify-Key': verifyKey, ...init?.headers },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

function AuthGate({ onAuth }: { onAuth: (key: string) => void }) {
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const tryAuth = async () => {
    if (!key.trim()) return
    setLoading(true)
    setError('')
    try {
      await verifyFetch('/verify?action=auth', key)
      onAuth(key)
    } catch {
      setError('Invalid verification key')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-[400px] mx-auto mt-24 px-6">
      <h1 className="text-2xl italic mb-2" style={{ fontFamily: "'EB Garamond', Georgia, serif" }}>
        Entity Verification
      </h1>
      <p className="text-sm text-[#555] mb-4">Enter your reviewer key to begin</p>
      <input
        type="password"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && tryAuth()}
        placeholder="Verification key..."
        className="w-full px-3 py-2 font-mono text-[13px] border border-[#ddd] rounded mb-2"
      />
      {error && <p className="text-red-600 text-[12px] font-mono mb-2">{error}</p>}
      <button
        onClick={tryAuth}
        disabled={loading}
        className="w-full font-mono text-[11px] uppercase tracking-wider px-3 py-1.5 rounded cursor-pointer border bg-[#1a1a1a] text-white border-[#1a1a1a] hover:bg-[#333] transition-colors"
      >
        {loading ? 'Authenticating...' : 'Authenticate'}
      </button>
    </div>
  )
}

function VerifyDashboard({ verifyKey }: { verifyKey: string }) {
  const [selectedEntityId, setSelectedEntityId] = useState<number | null>(null)

  const handleSelect = useCallback((id: number) => {
    setSelectedEntityId(id)
  }, [])

  return (
    <div className="flex h-screen">
      <VerifyQueue verifyKey={verifyKey} selectedId={selectedEntityId} onSelect={handleSelect} />
      <div className="flex-1 overflow-y-auto bg-white">
        {selectedEntityId ? (
          <EntityReview
            verifyKey={verifyKey}
            entityId={selectedEntityId}
            onReviewSubmitted={() => {
              window.scrollTo(0, 0)
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-[#888] font-mono text-sm">
            Select an entity from the queue to begin review
          </div>
        )}
      </div>
    </div>
  )
}

export function App() {
  const [verifyKey, setVerifyKey] = useState<string | null>(() => {
    return sessionStorage.getItem('verifyKey')
  })

  const handleAuth = useCallback((key: string) => {
    sessionStorage.setItem('verifyKey', key)
    setVerifyKey(key)
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      {verifyKey ? <VerifyDashboard verifyKey={verifyKey} /> : <AuthGate onAuth={handleAuth} />}
    </QueryClientProvider>
  )
}
