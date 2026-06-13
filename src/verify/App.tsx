import { useState, useEffect } from 'react'
import { VerifyQueue } from './VerifyQueue'
import { EntityReview } from './EntityReview'
import { MethodologyGuide } from './MethodologyGuide'
import { TaskSession } from './TaskSession'

type Mode = 'task' | 'browse'

const TAB_BASE = 'font-mono text-[11px] uppercase tracking-wider px-4 py-2 cursor-pointer transition-colors border-b-2'
const TAB_ACTIVE = `${TAB_BASE} text-[#1a1a1a] border-[#1a1a1a]`
const TAB_INACTIVE = `${TAB_BASE} text-[#aaa] border-transparent hover:text-[#555]`

export function App() {
  const [selectedEntityId, setSelectedEntityId] = useState<number | null>(() => {
    const param = new URLSearchParams(window.location.search).get('entity')
    return param ? parseInt(param, 10) : null
  })
  const [mode, setMode] = useState<Mode>(() =>
    new URLSearchParams(window.location.search).has('entity') ? 'browse' : 'task',
  )
  const [showGuide, setShowGuide] = useState(false)
  const [showWelcome, setShowWelcome] = useState(true)

  // Keep URL in sync with selected entity for shareable deep-links
  useEffect(() => {
    const url = new URL(window.location.href)
    if (mode === 'browse' && selectedEntityId) {
      url.searchParams.set('entity', String(selectedEntityId))
    } else {
      url.searchParams.delete('entity')
    }
    window.history.replaceState(null, '', url.toString())
  }, [mode, selectedEntityId])

  const switchToTask = () => {
    setMode('task')
    setSelectedEntityId(null)
  }

  const switchToBrowse = () => setMode('browse')

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">
      {/* Mode tab bar */}
      <div className="flex items-center border-b border-[#e0e0e0] px-6 shrink-0">
        <button onClick={switchToTask} className={mode === 'task' ? TAB_ACTIVE : TAB_INACTIVE}>
          Verify
        </button>
        <button onClick={switchToBrowse} className={mode === 'browse' ? TAB_ACTIVE : TAB_INACTIVE}>
          Browse
        </button>
        <div className="ml-auto">
          <button
            onClick={() => setShowGuide(true)}
            className="font-mono text-[10px] uppercase tracking-wider text-[#aaa] hover:text-[#1a1a1a] cursor-pointer transition-colors py-2"
          >
            Guide →
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {mode === 'task' ? (
          <div className="h-full overflow-y-auto">
            <TaskSession onSwitchToBrowse={switchToBrowse} />
          </div>
        ) : (
          <div className="flex h-full overflow-hidden">
            <VerifyQueue
              selectedId={selectedEntityId}
              onSelect={setSelectedEntityId}
              onShowGuide={() => setShowGuide(true)}
            />
            <div className="flex-1 overflow-y-auto">
              {selectedEntityId ? (
                <EntityReview key={selectedEntityId} entityId={selectedEntityId} onReviewed={() => {}} />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="font-mono text-[12px] text-[#aaa]">Select an entity to review in depth</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showGuide && <MethodologyGuide onClose={() => setShowGuide(false)} />}

      {showWelcome && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 max-w-md w-[90%] shadow-xl max-h-[85vh] overflow-y-auto">
            <h2 className="font-mono text-[13px] uppercase tracking-widest mb-3">Welcome to Verification</h2>
            <p
              className="text-[15px] leading-relaxed mb-4"
              style={{ fontFamily: "'EB Garamond', Georgia, serif", color: '#555' }}
            >
              Help improve the accuracy of the AI policy map by checking entity data — one field at a time.
            </p>
            <div className="flex flex-col gap-2 mb-5">
              {(
                [
                  [
                    'Each card shows one field',
                    'A single fact about a person or org — their category, title, stance on AI regulation, etc.',
                  ],
                  [
                    'Three actions',
                    "Confirm it looks right (✓), flag it as wrong (✗), or skip if you're not sure (→).",
                  ],
                  [
                    'Flags help the most',
                    'If something is wrong, select the error type and optionally enter the correct value.',
                  ],
                  ['Browse mode', 'Switch to Browse to do a full review of a specific entity across all its fields.'],
                ] as [string, string][]
              ).map(([title, desc]) => (
                <div key={title} className="text-[13px] leading-snug" style={{ color: '#555' }}>
                  <strong style={{ color: '#1a1a1a' }}>{title}:</strong> {desc}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowWelcome(false)}
                className="font-mono text-[11px] uppercase tracking-wider px-6 py-2 bg-[#1a1a1a] text-white rounded cursor-pointer hover:opacity-85 transition-opacity"
              >
                Got it
              </button>
              <button
                onClick={() => {
                  setShowWelcome(false)
                  setShowGuide(true)
                }}
                className="font-mono text-[10px] uppercase tracking-wider text-[#2563eb] cursor-pointer"
              >
                Read full guide →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
