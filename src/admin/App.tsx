import { useState, useMemo } from 'react'
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Navigation } from '../components/Navigation'

const API_BASE = '/api'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } })

// ── Helpers ──

async function adminFetch<T>(path: string, adminKey: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey, ...init?.headers },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

const LABEL = 'font-mono text-[10px] uppercase tracking-wider text-[#888] mb-1'
const BTN = 'font-mono text-[11px] uppercase tracking-wider px-3 py-1.5 rounded cursor-pointer border transition-colors'
const BTN_PRIMARY = `${BTN} bg-[#1a1a1a] text-white border-[#1a1a1a] hover:bg-[#333]`
const BTN_OUTLINE = `${BTN} bg-white text-[#555] border-[#ccc] hover:border-[#999]`
const BTN_GREEN = `${BTN} bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700`
const BTN_RED = `${BTN} bg-red-600 text-white border-red-600 hover:bg-red-700`
const BADGE_APPROVED =
  'font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800'
const BADGE_PENDING = 'font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-800'
const BADGE_REJECTED = 'font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-red-100 text-red-800'

function statusBadge(status: string) {
  if (status === 'approved') return <span className={BADGE_APPROVED}>Approved</span>
  if (status === 'pending') return <span className={BADGE_PENDING}>Pending</span>
  if (status === 'rejected') return <span className={BADGE_REJECTED}>Rejected</span>
  return <span className={BADGE_PENDING}>{status}</span>
}

// ── Auth Gate ──

function AuthGate({ onAuth }: { onAuth: (key: string) => void }) {
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const tryAuth = async () => {
    if (!key) return
    setLoading(true)
    setError('')
    try {
      await adminFetch('/admin?action=pending', key)
      onAuth(key)
    } catch {
      setError('Invalid admin key')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-[400px] mx-auto mt-24 px-6">
      <h1 className="text-2xl italic mb-2" style={{ fontFamily: "'EB Garamond', Georgia, serif" }}>
        Database Admin
      </h1>
      <p className="text-sm text-[#555] mb-4">Enter admin key to continue</p>
      <input
        type="password"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && tryAuth()}
        placeholder="Admin key..."
        className="w-full px-3 py-2 font-mono text-[13px] border border-[#ddd] rounded mb-2"
      />
      {error && <p className="text-red-600 text-[12px] font-mono mb-2">{error}</p>}
      <button onClick={tryAuth} disabled={loading} className={BTN_PRIMARY + ' w-full'}>
        {loading ? 'Authenticating...' : 'Authenticate'}
      </button>
    </div>
  )
}

// ── Dashboard Tab ──

interface AdminStats {
  approved: Record<string, number>
  pending: Record<string, number>
  pending_new_submissions: number
  pending_edit_submissions: number
  edges: number
}

function DashboardTab({ adminKey, onSwitchTab }: { adminKey: string; onSwitchTab: (tab: string) => void }) {
  const { data, isPending, error } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: () => adminFetch('/admin?action=stats', adminKey),
  })

  if (isPending) return <p className="text-center py-8 font-mono text-[12px] text-[#888]">Loading stats...</p>
  if (error) return <p className="text-center py-8 text-red-600 font-mono text-[12px]">Failed to load stats</p>

  const stats = data!
  const totalPending = stats.pending_new_submissions + stats.pending_edit_submissions
  return (
    <div>
      <p className={LABEL}>Approved Entities</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'People', value: stats.approved?.person ?? 0 },
          { label: 'Organizations', value: stats.approved?.organization ?? 0 },
          { label: 'Resources', value: stats.approved?.resource ?? 0 },
          { label: 'Edges', value: stats.edges ?? 0 },
        ].map((s) => (
          <div key={s.label} className="bg-[#f8f7f5] rounded p-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-[#888]">{s.label}</div>
            <div className="text-xl font-serif mt-1">{s.value}</div>
          </div>
        ))}
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-6">
        <span className="font-mono text-[11px]">
          {totalPending} pending ({stats.pending_new_submissions} new, {stats.pending_edit_submissions} edits)
        </span>
        <button
          onClick={() => onSwitchTab('pending')}
          className="ml-3 text-[12px] font-mono text-[#2563eb] hover:underline"
        >
          Review →
        </button>
      </div>
      <p className={LABEL}>Quick Actions</p>
      <div className="flex gap-2 flex-wrap mt-2">
        <button className={BTN_OUTLINE} onClick={() => onSwitchTab('pending')}>
          Review Pending
        </button>
        <button className={BTN_OUTLINE} onClick={() => onSwitchTab('entities')}>
          Browse Entities
        </button>
      </div>
    </div>
  )
}

// ── Pending Tab ──

interface Submission {
  id: number
  entity_type: string
  name: string
  submitter_email?: string
  submitter_relationship?: string
  status: string
  llm_review?: { quality?: number; flags?: string[]; notes?: string }
  [key: string]: unknown
}

function PendingTab({ adminKey }: { adminKey: string }) {
  const qc = useQueryClient()
  const { data: pending, isPending } = useQuery<Submission[]>({
    queryKey: ['admin-pending'],
    queryFn: async () => {
      const res = await adminFetch<{ submissions: Submission[] }>('/admin?action=pending', adminKey)
      return res.submissions
    },
  })

  const approveMut = useMutation({
    mutationFn: (id: number) =>
      adminFetch('/admin', adminKey, {
        method: 'POST',
        body: JSON.stringify({ action: 'approve', submission_id: id }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-pending'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
    },
  })

  const rejectMut = useMutation({
    mutationFn: ({ id, notes }: { id: number; notes: string }) =>
      adminFetch('/admin', adminKey, {
        method: 'POST',
        body: JSON.stringify({ action: 'reject', submission_id: id, resolution_notes: notes }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-pending'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
    },
  })

  if (isPending) return <p className="text-center py-8 font-mono text-[12px] text-[#888]">Loading pending...</p>

  const items = Array.isArray(pending) ? pending : []
  if (items.length === 0)
    return <p className="text-center py-8 font-mono text-[12px] text-[#888]">No pending submissions.</p>

  return (
    <div className="space-y-3">
      {items.map((sub) => (
        <PendingCard
          key={sub.id}
          submission={sub}
          onApprove={() => approveMut.mutate(sub.id)}
          onReject={(notes) => rejectMut.mutate({ id: sub.id, notes })}
        />
      ))}
    </div>
  )
}

function PendingCard({
  submission: sub,
  onApprove,
  onReject,
}: {
  submission: Submission
  onApprove: () => void
  onReject: (notes: string) => void
}) {
  const [rejectNotes, setRejectNotes] = useState('')
  const [showReject, setShowReject] = useState(false)

  return (
    <div className="border border-[#ddd] rounded p-4">
      <div className="flex justify-between items-start mb-2">
        <div>
          <span className="font-semibold">{sub.name || '(unnamed)'}</span>
          <span className="ml-2 font-mono text-[10px] uppercase text-[#888]">{sub.entity_type}</span>
          {sub.submitter_relationship === 'self' && (
            <span className="ml-2 text-[10px] font-mono px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded">Self</span>
          )}
        </div>
        {sub.llm_review?.quality != null && (
          <span className="font-mono text-[11px] text-[#888]">LLM: {sub.llm_review.quality}/5</span>
        )}
      </div>
      {sub.submitter_email && (
        <p className="font-mono text-[11px] text-[#888] mb-2">
          {sub.submitter_email} · {sub.submitter_relationship}
        </p>
      )}
      <div className="flex gap-2 items-center mt-3 pt-3 border-t border-[#eee]">
        <button onClick={onApprove} className={BTN_GREEN + ' text-[10px]'}>
          Approve
        </button>
        <button onClick={() => setShowReject(!showReject)} className={BTN_RED + ' text-[10px]'}>
          Reject
        </button>
      </div>
      {showReject && (
        <div className="flex gap-2 mt-2">
          <input
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            placeholder="Rejection reason..."
            className="flex-1 px-2 py-1 text-[13px] border border-[#ddd] rounded font-serif"
          />
          <button onClick={() => onReject(rejectNotes)} className={BTN_RED + ' text-[10px]'}>
            Confirm
          </button>
        </div>
      )}
    </div>
  )
}

// ── Entities Tab ──

interface EntityRow {
  id: number
  entity_type: string
  name: string
  category?: string
  status: string
  title?: string
  primary_org?: string
  submission_count?: number
}

function EntitiesTab({ adminKey }: { adminKey: string }) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [sortCol, setSortCol] = useState<string>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [editingId, setEditingId] = useState<number | null>(null)

  const { data, isPending } = useQuery<{ entities: EntityRow[] }>({
    queryKey: ['admin-entities'],
    queryFn: async () => {
      const res = await adminFetch<{ data: EntityRow[]; total: number }>('/admin?action=all', adminKey)
      return { entities: res.data }
    },
  })

  const entities = useMemo(() => {
    let list = data?.entities ?? (Array.isArray(data) ? (data as EntityRow[]) : [])

    // Filter by type
    if (typeFilter !== 'all') list = list.filter((e) => e.entity_type === typeFilter)

    // Filter by search
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((e) => e.name?.toLowerCase().includes(q) || e.category?.toLowerCase().includes(q))
    }

    // Sort
    list = [...list].sort((a, b) => {
      const aVal = String((a as unknown as Record<string, unknown>)[sortCol] ?? '')
      const bVal = String((b as unknown as Record<string, unknown>)[sortCol] ?? '')
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    })

    return list
  }, [data, typeFilter, search, sortCol, sortDir])

  const toggleSort = (col: string) => {
    if (sortCol === col) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  if (isPending) return <p className="text-center py-8 font-mono text-[12px] text-[#888]">Loading...</p>

  const cols = [
    { key: 'name', label: 'Name' },
    { key: 'entity_type', label: 'Type' },
    { key: 'category', label: 'Category' },
    { key: 'status', label: 'Status' },
  ]

  return (
    <div>
      {/* Toolbar */}
      <div className="flex gap-3 items-center mb-3 flex-wrap">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="flex-1 min-w-[200px] px-3 py-2 font-serif text-[15px] border border-[#bbb] rounded"
        />
        {['all', 'person', 'organization', 'resource'].map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`${BTN} text-[10px] ${typeFilter === t ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]' : 'bg-white text-[#555] border-[#ccc]'}`}
          >
            {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1) + 's'}
          </button>
        ))}
      </div>

      <p className="font-mono text-[11px] text-[#888] mb-2">{entities.length} entities</p>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[14px]">
          <thead>
            <tr>
              {cols.map((c) => (
                <th
                  key={c.key}
                  onClick={() => toggleSort(c.key)}
                  className="font-mono text-[10px] uppercase tracking-wider text-[#888] text-left px-3 py-2 border-b border-[#bbb] cursor-pointer hover:text-[#555] whitespace-nowrap select-none"
                >
                  {c.label} {sortCol === c.key && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entities.map((e) => (
              <tr
                key={e.id}
                onClick={() => setEditingId(e.id)}
                className="cursor-pointer hover:bg-[#f8f7f5] transition-colors"
              >
                <td className="px-3 py-2 border-b border-[#eee] font-medium">{e.name}</td>
                <td className="px-3 py-2 border-b border-[#eee] font-mono text-[11px] text-[#888] uppercase">
                  {e.entity_type}
                </td>
                <td className="px-3 py-2 border-b border-[#eee] text-[13px] text-[#555]">{e.category}</td>
                <td className="px-3 py-2 border-b border-[#eee]">{statusBadge(e.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingId && <EditModal entityId={editingId} adminKey={adminKey} onClose={() => setEditingId(null)} />}
    </div>
  )
}

// ── Edit Modal ──

function EditModal({ entityId, adminKey, onClose }: { entityId: number; adminKey: string; onClose: () => void }) {
  const qc = useQueryClient()
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [loaded, setLoaded] = useState(false)

  const qcLocal = useQueryClient()
  // Use already-fetched entity list from cache instead of re-fetching
  const { data: entity } = useQuery<Record<string, unknown>>({
    queryKey: ['admin-entity', entityId],
    queryFn: () => {
      const cached = qcLocal.getQueryData<{ entities: Record<string, unknown>[] }>(['admin-entities'])
      const found = cached?.entities?.find((e) => e.id === entityId)
      if (found) return found
      // Fallback: if not in cache, fetch from API
      return adminFetch<{ data: Record<string, unknown>[] }>('/admin?action=all', adminKey).then(
        (res) => res.data?.find((e) => e.id === entityId) ?? {},
      )
    },
  })

  // Initialize form data from entity
  if (entity && !loaded) {
    const initial: Record<string, string> = {}
    for (const [k, v] of Object.entries(entity)) {
      if (typeof v === 'string' || typeof v === 'number') initial[k] = String(v)
    }
    setFormData(initial)
    setLoaded(true)
  }

  const updateMut = useMutation({
    mutationFn: (data: Record<string, string>) =>
      adminFetch('/admin', adminKey, {
        method: 'POST',
        body: JSON.stringify({ action: 'update_entity', entity_id: entityId, data }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-entities'] })
      onClose()
    },
  })

  const deleteMut = useMutation({
    mutationFn: () =>
      adminFetch('/admin', adminKey, {
        method: 'POST',
        body: JSON.stringify({ action: 'delete', entity_id: entityId }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-entities'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
      onClose()
    },
  })

  const handleSave = () => updateMut.mutate(formData)
  const handleDelete = () => {
    if (confirm(`Delete entity #${entityId}? This cannot be undone.`)) deleteMut.mutate()
  }

  const updateField = (key: string, value: string) => setFormData((prev) => ({ ...prev, [key]: value }))

  const editableFields = [
    'name',
    'category',
    'title',
    'primary_org',
    'website',
    'location',
    'twitter',
    'bluesky',
    'funding_model',
    'notes',
  ]

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg p-6 max-w-[600px] w-full max-h-[85vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl italic font-serif">Edit Entity #{entityId}</h2>
          <button onClick={onClose} className="text-[#888] hover:text-[#1a1a1a] text-lg">
            &times;
          </button>
        </div>

        {!loaded ? (
          <p className="font-mono text-[12px] text-[#888]">Loading...</p>
        ) : (
          <div className="space-y-3">
            {editableFields.map((field) => (
              <div key={field}>
                <label className={LABEL}>{field.replace(/_/g, ' ')}</label>
                {field === 'notes' ? (
                  <textarea
                    value={formData[field] ?? ''}
                    onChange={(e) => updateField(field, e.target.value)}
                    className="w-full px-3 py-2 font-serif text-[15px] border border-[#bbb] rounded min-h-[80px] resize-y"
                  />
                ) : (
                  <input
                    value={formData[field] ?? ''}
                    onChange={(e) => updateField(field, e.target.value)}
                    className="w-full px-3 py-2 font-serif text-[15px] border border-[#bbb] rounded"
                  />
                )}
              </div>
            ))}

            <div className="flex gap-2 justify-end mt-4 pt-3 border-t border-[#eee]">
              <button onClick={handleDelete} className={BTN_RED}>
                Delete
              </button>
              <button onClick={onClose} className={BTN_OUTLINE}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={updateMut.isPending} className={BTN_PRIMARY}>
                {updateMut.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
            {updateMut.isError && <p className="text-red-600 text-[12px] font-mono">Save failed</p>}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Admin App ──

type Tab = 'dashboard' | 'pending' | 'merge' | 'entities'

function AdminDashboard({ adminKey }: { adminKey: string }) {
  const [tab, setTab] = useState<Tab>('dashboard')

  const tabs: { key: Tab; label: string }[] = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'pending', label: 'Pending Queue' },
    { key: 'entities', label: 'All Entities' },
  ]

  return (
    <div className="max-w-[1100px] mx-auto px-6 pt-16 pb-12">
      <p className="font-mono text-[11px] uppercase tracking-wider text-[#888] mb-1">Internal</p>
      <h1 className="text-2xl italic mb-4" style={{ fontFamily: "'EB Garamond', Georgia, serif" }}>
        Database Admin
      </h1>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-[#ddd] pb-0">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 font-mono text-[11px] uppercase tracking-wider border-b-2 transition-colors ${
              tab === t.key ? 'border-[#1a1a1a] text-[#1a1a1a]' : 'border-transparent text-[#888] hover:text-[#555]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'dashboard' && <DashboardTab adminKey={adminKey} onSwitchTab={(t) => setTab(t as Tab)} />}
      {tab === 'pending' && <PendingTab adminKey={adminKey} />}
      {tab === 'entities' && <EntitiesTab adminKey={adminKey} />}
    </div>
  )
}

export function App() {
  const [adminKey, setAdminKey] = useState<string | null>(null)

  return (
    <QueryClientProvider client={queryClient}>
      <Navigation />
      {adminKey ? <AdminDashboard adminKey={adminKey} /> : <AuthGate onAuth={setAdminKey} />}
    </QueryClientProvider>
  )
}
