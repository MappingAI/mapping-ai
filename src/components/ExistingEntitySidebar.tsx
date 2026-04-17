import DOMPurify from 'dompurify'
import { useEntityCache } from '../hooks/useEntityCache'
import type { FuzzySearchResult } from '../types/api'
import type { Entity } from '../types/entity'

const CATEGORY_COLORS: Record<string, string> = {
  'Frontier Lab': '#d4644a', 'AI Infrastructure & Compute': '#6366F1', 'Deployers & Platforms': '#EC4899',
  'AI Safety/Alignment': '#2d8a6e', 'AI Safety': '#2d8a6e',
  'Think Tank/Policy Org': '#5b82bf', 'Government/Agency': '#7c5cbf',
  'Academic': '#d4a44a', 'VC/Capital/Philanthropy': '#1a8a8a',
  'Labor/Civil Society': '#d4885a', 'Media/Journalism': '#8b6914',
  'Ethics/Bias/Rights': '#e07020', 'Political Campaign/PAC': '#8b5cf6',
  'Executive': '#d4644a', 'Researcher': '#2d8a6e', 'Policymaker': '#9955cc',
  'Investor': '#1a8a8a', 'Organizer': '#d4885a', 'Journalist': '#8b6914',
  'Cultural figure': '#EC4899',
}

interface ExistingEntitySidebarProps {
  entity: FuzzySearchResult | null
  entityType: 'person' | 'organization' | 'resource'
  onClose: () => void
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="mb-2.5">
      <label className="block font-mono text-[9px] uppercase tracking-wider text-[#888] mb-0.5">{label}</label>
      <span className="font-serif text-[14px] text-[#1a1a1a]">{value}</span>
    </div>
  )
}

function HtmlField({ label, html }: { label: string; html: string | null | undefined }) {
  if (!html) return null
  return (
    <div className="mb-2.5">
      <label className="block font-mono text-[9px] uppercase tracking-wider text-[#888] mb-0.5">{label}</label>
      <div
        className="font-serif text-[13px] text-[#1a1a1a] leading-relaxed [&_.mention]:text-[#2563eb] [&_.mention]:font-semibold [&_a]:text-[#2563eb] [&_a:hover]:underline"
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
      />
    </div>
  )
}

export function ExistingEntitySidebar({ entity, entityType, onClose }: ExistingEntitySidebarProps) {
  const { cache } = useEntityCache()
  if (!entity) return null

  // Look up full entity from cache — skip for pending entities (submission IDs collide with entity IDs)
  const full: Partial<Entity> = entity.isPending ? entity : (cache?.byId.get(entity.id) ?? entity)
  const catColor = CATEGORY_COLORS[entity.category ?? ''] ?? '#6a7080'

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed top-12 right-0 bottom-0 w-[320px] max-w-full bg-[#fafafa] border-l border-[#ddd] z-50 p-5 overflow-y-auto shadow-lg animate-[slideIn_0.25s_ease]">
        <button
          onClick={onClose}
          className="absolute top-2 right-3 font-mono text-[10px] tracking-wider text-[#888] border border-[#ddd] rounded px-2 py-0.5 bg-transparent cursor-pointer hover:border-[#999] hover:text-[#1a1a1a]"
        >
          Close
        </button>

        <h3 className="font-serif text-[18px] font-medium mb-1 pr-12">
          {entityType === 'resource' ? (full.title ?? full.name) : full.name}
        </h3>
        <div className="font-mono text-[9px] uppercase tracking-wider text-[#888] mb-3">
          {entityType} — already in database
        </div>

        {full.category && (
          <span
            className="inline-block px-2 py-0.5 rounded font-mono text-[10px] mb-3"
            style={{ background: `${catColor}22`, color: catColor }}
          >
            {full.category}
          </span>
        )}

        {entityType === 'person' && (
          <>
            <Field label="Title" value={full.title} />
            <Field label="Primary Organization" value={full.primary_org} />
            <Field label="Location" value={full.location} />
            <Field label="Regulatory Stance" value={full.regulatory_stance} />
            <Field label="AGI Timeline" value={full.agi_timeline} />
            <Field label="AI Risk Level" value={full.ai_risk_level} />
            <Field label="Influence Type" value={full.influence_type} />
            <Field label="Twitter/X" value={full.twitter} />
            <Field label="Bluesky" value={full.bluesky} />
            <Field label="Website" value={full.website} />
          </>
        )}
        {entityType === 'organization' && (
          <>
            <Field label="Website" value={full.website} />
            <Field label="Location" value={full.location} />
            <Field label="Funding Model" value={full.funding_model} />
            <Field label="Regulatory Stance" value={full.regulatory_stance} />
            <Field label="Twitter/X" value={full.twitter} />
            <Field label="Bluesky" value={full.bluesky} />
          </>
        )}
        {entityType === 'resource' && (
          <>
            <Field label="Author" value={full.author} />
            <Field label="Type" value={full.resource_type} />
            <Field label="URL" value={full.url} />
            <Field label="Year" value={full.year} />
            <Field label="Key Argument" value={full.key_argument} />
          </>
        )}

        <HtmlField label="Notes" html={full.notes} />

        {entity.isPending && (
          <div className="font-mono text-[10px] px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded mt-2 mb-2">
            Pending review
          </div>
        )}

        <div className="font-mono text-[10px] text-[#2563eb] bg-[#f0f4ff] p-3 rounded mt-4 leading-relaxed">
          Please review the existing info above. Your submission will add new information and any conflicting details will be stored for review.
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  )
}
