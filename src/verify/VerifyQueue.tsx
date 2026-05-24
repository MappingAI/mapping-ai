import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { verifyFetch } from './App'

interface QueueEntity {
  id: number
  name: string
  entity_type: string
  category: string | null
  primary_org: string | null
  claim_count: number
  edge_count: number
  review_verdict: string | null
  reviewed_at: string | null
}

interface Props {
  verifyKey: string
  selectedId: number | null
  onSelect: (id: number) => void
}

export function VerifyQueue({ verifyKey, selectedId, onSelect }: Props) {
  const [search, setSearch] = useState('')
  const [showReviewed, setShowReviewed] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['verify-queue'],
    queryFn: () => verifyFetch<{ entities: QueueEntity[] }>('/verify?action=queue', verifyKey),
  })

  const entities = data?.entities || []

  const filtered = useMemo(() => {
    let list = entities
    if (!showReviewed) {
      list = list.filter((e) => !e.review_verdict)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((e) => e.name.toLowerCase().includes(q) || (e.category || '').toLowerCase().includes(q))
    }
    return list
  }, [entities, search, showReviewed])

  const orgs = filtered.filter((e) => e.entity_type === 'organization')
  const people = filtered.filter((e) => e.entity_type === 'person')

  const reviewedCount = entities.filter((e) => e.review_verdict).length
  const totalCount = entities.length

  return (
    <div className="w-[300px] min-w-[300px] h-screen flex flex-col border-r border-[#e0e0e0] bg-[#fafafa]">
      <div className="p-3 border-b border-[#e0e0e0]">
        <h2 className="text-lg italic mb-2" style={{ fontFamily: "'EB Garamond', Georgia, serif" }}>
          Verification Queue
        </h2>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search entities..."
          className="w-full px-2 py-1.5 font-mono text-[12px] border border-[#ddd] rounded mb-2"
        />
        <label className="flex items-center gap-1.5 font-mono text-[11px] text-[#666] cursor-pointer">
          <input
            type="checkbox"
            checked={showReviewed}
            onChange={(e) => setShowReviewed(e.target.checked)}
            className="rounded"
          />
          Show reviewed
        </label>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && <div className="p-4 text-center font-mono text-[12px] text-[#888]">Loading...</div>}

        {orgs.length > 0 && (
          <div>
            <div className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[#888] bg-[#f0f0f0] border-b border-[#e0e0e0]">
              Organizations ({orgs.length})
            </div>
            {orgs.map((e) => (
              <EntityRow key={e.id} entity={e} selected={e.id === selectedId} onSelect={onSelect} />
            ))}
          </div>
        )}

        {people.length > 0 && (
          <div>
            <div className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[#888] bg-[#f0f0f0] border-b border-[#e0e0e0]">
              People ({people.length})
            </div>
            {people.map((e) => (
              <EntityRow key={e.id} entity={e} selected={e.id === selectedId} onSelect={onSelect} />
            ))}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-[#e0e0e0] font-mono text-[11px] text-[#666]">
        {reviewedCount} of {totalCount} reviewed
      </div>
    </div>
  )
}

function EntityRow({
  entity,
  selected,
  onSelect,
}: {
  entity: QueueEntity
  selected: boolean
  onSelect: (id: number) => void
}) {
  const verdictIcon = entity.review_verdict ? (entity.review_verdict === 'confirmed' ? '✓' : '✗') : '·'
  const verdictColor = entity.review_verdict
    ? entity.review_verdict === 'confirmed'
      ? 'text-emerald-600'
      : 'text-amber-600'
    : 'text-[#bbb]'

  return (
    <button
      onClick={() => onSelect(entity.id)}
      className={`w-full text-left px-3 py-2 border-b border-[#eee] hover:bg-[#f0f0f0] transition-colors ${
        selected ? 'bg-[#e8e8e8]' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        <span className={`font-mono text-[14px] mt-0.5 ${verdictColor}`}>{verdictIcon}</span>
        <div className="min-w-0">
          <div className="font-mono text-[12px] text-[#1a1a1a] truncate">{entity.name}</div>
          <div className="font-mono text-[10px] text-[#888] truncate">
            {entity.category || entity.entity_type}
            {entity.edge_count > 0 && ` · ${entity.edge_count} edges`}
            {entity.claim_count > 0 && ` · ${entity.claim_count} claims`}
          </div>
        </div>
      </div>
    </button>
  )
}
