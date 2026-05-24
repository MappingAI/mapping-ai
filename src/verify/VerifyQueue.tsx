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

type Tab = 'queue' | 'reviewed'

const TAB_BASE =
  'flex-1 font-mono text-[11px] uppercase tracking-wider py-2 text-center cursor-pointer transition-colors'
const TAB_ACTIVE = `${TAB_BASE} text-[#1a1a1a] border-b-2 border-[#1a1a1a]`
const TAB_INACTIVE = `${TAB_BASE} text-[#999] border-b border-[#e0e0e0] hover:text-[#555]`

export function VerifyQueue({ verifyKey, selectedId, onSelect }: Props) {
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<Tab>('queue')

  const { data, isLoading } = useQuery({
    queryKey: ['verify-queue'],
    queryFn: () => verifyFetch<{ entities: QueueEntity[] }>('/verify?action=queue', verifyKey),
  })

  const entities = data?.entities || []

  const filtered = useMemo(() => {
    let list = entities
    if (tab === 'queue') {
      list = list.filter((e) => !e.review_verdict)
    } else {
      list = list.filter((e) => e.review_verdict)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((e) => e.name.toLowerCase().includes(q) || (e.category || '').toLowerCase().includes(q))
    }
    return list
  }, [entities, search, tab])

  const orgs = filtered.filter((e) => e.entity_type === 'organization')
  const people = filtered.filter((e) => e.entity_type === 'person')

  const reviewedCount = entities.filter((e) => e.review_verdict).length
  const totalCount = entities.length

  return (
    <div className="w-[300px] min-w-[300px] h-screen flex flex-col border-r border-[#e0e0e0] bg-[#fafafa]">
      <div className="p-3 pb-0 border-b border-[#e0e0e0]">
        <h2 className="text-lg italic mb-2" style={{ fontFamily: "'EB Garamond', Georgia, serif" }}>
          Verification
        </h2>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search entities..."
          className="w-full px-2 py-1.5 font-mono text-[12px] border border-[#ddd] rounded mb-2"
        />
        <div className="flex">
          <button onClick={() => setTab('queue')} className={tab === 'queue' ? TAB_ACTIVE : TAB_INACTIVE}>
            Queue ({totalCount - reviewedCount})
          </button>
          <button onClick={() => setTab('reviewed')} className={tab === 'reviewed' ? TAB_ACTIVE : TAB_INACTIVE}>
            Reviewed ({reviewedCount})
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && <div className="p-4 text-center font-mono text-[12px] text-[#888]">Loading...</div>}

        {!isLoading && filtered.length === 0 && (
          <div className="p-4 text-center font-mono text-[12px] text-[#999] italic">
            {tab === 'reviewed' ? 'No entities reviewed yet' : 'All entities reviewed'}
          </div>
        )}

        {orgs.length > 0 && (
          <div>
            <div className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[#888] bg-[#f0f0f0] border-b border-[#e0e0e0]">
              Organizations ({orgs.length})
            </div>
            {orgs.map((e) => (
              <EntityRow
                key={e.id}
                entity={e}
                selected={e.id === selectedId}
                onSelect={onSelect}
                showVerdict={tab === 'reviewed'}
              />
            ))}
          </div>
        )}

        {people.length > 0 && (
          <div>
            <div className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[#888] bg-[#f0f0f0] border-b border-[#e0e0e0]">
              People ({people.length})
            </div>
            {people.map((e) => (
              <EntityRow
                key={e.id}
                entity={e}
                selected={e.id === selectedId}
                onSelect={onSelect}
                showVerdict={tab === 'reviewed'}
              />
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
  showVerdict,
}: {
  entity: QueueEntity
  selected: boolean
  onSelect: (id: number) => void
  showVerdict: boolean
}) {
  return (
    <button
      onClick={() => onSelect(entity.id)}
      className={`w-full text-left px-3 py-2 border-b border-[#eee] hover:bg-[#f0f0f0] transition-colors ${
        selected ? 'bg-[#e8e8e8]' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        {showVerdict && (
          <span
            className={`font-mono text-[14px] mt-0.5 ${
              entity.review_verdict === 'confirmed'
                ? 'text-emerald-600'
                : entity.review_verdict === 'flagged'
                  ? 'text-red-400'
                  : 'text-amber-600'
            }`}
          >
            {entity.review_verdict === 'confirmed' ? '✓' : entity.review_verdict === 'flagged' ? '?' : '✗'}
          </span>
        )}
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
