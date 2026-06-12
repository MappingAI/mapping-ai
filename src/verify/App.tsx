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
    </div>
  )
}
