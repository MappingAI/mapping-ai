import { useCallback } from 'react'
import { Controller, type UseFormReturn } from 'react-hook-form'
import { CustomSelect, buildOptions } from '../components/CustomSelect'
import { TagInput, type Tag, type TagSearchResult } from '../components/TagInput'
import { TipTapEditor, type MentionData } from '../components/TipTapEditor'
import { InfoTooltip } from '../components/InfoTooltip'
import { OrgSearch } from './OrgSearch'
import { LocationSearch } from './LocationSearch'
import { TwitterSearch } from './TwitterSearch'
import { BlueskySearch } from './BlueskySearch'
import { DuplicateDetection } from '../components/DuplicateDetection'
import { useEntityCache } from '../hooks/useEntityCache'
import { useSubmitEntity, useAddPendingEntity } from '../hooks/useSubmitEntity'
import { fuzzySearch } from '../lib/search'
import { searchEntities as searchAPI } from '../lib/api'
import type { FuzzySearchResult } from '../types/api'
import type { UpdateContext } from './ContributeForm'

interface PersonFormProps {
  form: UseFormReturn<Record<string, unknown>>
  updateContext: UpdateContext | null
  onOrgPanelOpen: (name: string, triggerType: 'primary' | 'affiliated') => void
  onViewExisting?: (entity: FuzzySearchResult) => void
  onEnterUpdateMode?: (entityData: Record<string, unknown>) => void
  onSubmitSuccess?: () => void
}

const ROLE_OPTIONS = buildOptions([
  'Executive',
  'Researcher',
  'Policymaker',
  'Investor',
  'Organizer',
  'Journalist',
  'Academic',
  'Cultural figure',
])

const STANCE_OPTIONS = buildOptions([
  'Accelerate',
  'Light-touch',
  'Targeted',
  'Moderate',
  'Restrictive',
  'Precautionary',
  'Nationalize',
  'Mixed/unclear',
  'Other',
])

const EVIDENCE_OPTIONS = buildOptions([
  'Explicitly stated',
  'Inferred',
  'Unknown',
])

const TIMELINE_OPTIONS = buildOptions([
  'Already here',
  '2-3 years',
  '5-10 years',
  '10-25 years',
  '25+ years or never',
  'Ill-defined',
  'Unknown',
])

const RISK_OPTIONS = buildOptions([
  'Overstated',
  'Manageable',
  'Serious',
  'Catastrophic',
  'Existential',
  'Mixed/nuanced',
  'Unknown',
])

const KEY_CONCERNS = [
  'Labor displacement',
  'Economic inequality',
  'Power concentration',
  'Democratic erosion',
  'Cybersecurity',
  'Misinformation',
  'Environmental',
  'Weapons',
  'Loss of control',
  'Copyright/IP',
  'Existential risk',
]

const INFLUENCE_TYPES = [
  'Decision-maker',
  'Advisor/strategist',
  'Researcher/analyst',
  'Funder/investor',
  'Builder',
  'Organizer/advocate',
  'Narrator',
  'Implementer',
  'Connector/convener',
]

const LABEL_CLASS = 'font-mono text-[11px] uppercase tracking-wider text-[#555]'
const INPUT_CLASS =
  'w-full px-3 py-2 font-mono text-[13px] border border-[#ddd] rounded bg-white outline-none transition-colors hover:border-[#999] focus:border-[#2563eb]'

export function PersonForm({ form, updateContext, onOrgPanelOpen, onViewExisting, onEnterUpdateMode, onSubmitSuccess }: PersonFormProps) {
  const { register, control, watch, handleSubmit, formState: { errors } } = form
  const { cache } = useEntityCache()
  const submitEntity = useSubmitEntity()
  const addPendingEntity = useAddPendingEntity()

  const primaryRole = watch('category') as string | undefined
  const regulatoryStance = watch('regulatoryStance') as string | undefined
  const showStanceDetail = regulatoryStance === 'Other' || regulatoryStance === 'Mixed/unclear' || regulatoryStance === 'Mixed/nuanced'

  // TipTap @mention search — local cache + pending API
  const searchEntities = useCallback(
    async (query: string) => {
      if (!query) return []
      const local = cache
        ? fuzzySearch(cache.entities, query, undefined, 8).map((r) => ({
            id: String(r.id),
            entityType: r.entity_type,
            entityId: r.id,
            label: r.name,
            detail: r.category ?? r.primary_org ?? '',
          }))
        : []
      if (query.length >= 2) {
        try {
          const pending = await searchAPI(query, undefined, 'pending')
          const seenIds = new Set(local.map((r) => r.id))
          for (const p of pending) {
            if (!seenIds.has(String(p.id))) {
              local.push({
                id: String(p.id),
                entityType: p.entity_type,
                entityId: p.id,
                label: p.name,
                detail: `${p.category ?? ''} (pending)`.trim(),
              })
            }
          }
        } catch { /* local results still work */ }
      }
      return local
    },
    [cache],
  )

  // Org search for affiliated orgs (TagInput) — local cache + pending API
  const searchOrgs = useCallback(
    async (query: string): Promise<TagSearchResult[]> => {
      if (!query) return []
      const local: TagSearchResult[] = cache
        ? fuzzySearch(cache.entities, query, 'organization', 10).map((r) => ({
            id: r.id,
            label: r.name,
            detail: r.category ?? undefined,
            isPending: r.isPending,
          }))
        : []
      if (query.length >= 2) {
        try {
          const pending = await searchAPI(query, 'organization', 'pending')
          const seenIds = new Set(local.map((r) => r.id))
          for (const p of pending) {
            if (!seenIds.has(p.id)) {
              local.push({
                id: p.id,
                label: p.name,
                detail: p.category ?? undefined,
                isPending: true,
              })
            }
          }
        } catch { /* local results still work */ }
      }
      return local
    },
    [cache],
  )

  const onSubmit = handleSubmit((data) => {
    const { _hp, ...fields } = data
    submitEntity.mutate(
      {
        type: 'person',
        timestamp: new Date().toISOString(),
        data: {
          ...fields,
          entityId: updateContext?.entityId ?? undefined,
        },
        _hp: (_hp as string) ?? '',
      },
      {
        onSuccess: (result) => {
          addPendingEntity({
            id: result.submissionId,
            entity_type: 'person',
            name: (fields.name as string) ?? '',
            category: (fields.category as string) ?? null,
            title: (fields.title as string) ?? null,
            primary_org: (fields.primaryOrg as string) ?? null,
            location: Array.isArray(fields.location) ? fields.location.map((t: { label: string }) => t.label).join(', ') : null,
          })
          onSubmitSuccess?.()
        },
      },
    )
  })

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-2 gap-4">
      {/* Honeypot — hidden from humans, visible to bots */}
      <input {...register('_hp')} type="text" tabIndex={-1} autoComplete="off" className="absolute -left-[9999px]" />

      {/* Name */}
      <div className="col-span-2">
        <label className={LABEL_CLASS}>
          Name <span className="text-red-500">*</span>
        </label>
        <input
          {...register('name', { required: 'Name is required' })}
          readOnly={updateContext != null}
          className={`${INPUT_CLASS} ${updateContext ? 'bg-[#f5f5f5] cursor-not-allowed' : ''}`}
          placeholder="Full name"
        />
        {errors.name && (
          <span className="text-[11px] font-mono text-red-500 mt-0.5">
            {errors.name.message as string}
          </span>
        )}
        {!updateContext && (
          <DuplicateDetection
            query={(watch('name') as string) ?? ''}
            entityType="person"
            onViewExisting={(entity) => onViewExisting?.(entity)}
            onUpdateExisting={(entity) => {
              const full = cache?.byId.get(entity.id)
              onEnterUpdateMode?.(full ? { ...full } : { id: entity.id, name: entity.name, category: entity.category, title: entity.title, primary_org: entity.primary_org })
              onViewExisting?.(entity)
            }}
          />
        )}
      </div>

      {/* Primary Role */}
      <div>
        <label className={LABEL_CLASS}>Primary Role</label>
        <Controller
          name="category"
          control={control}
          render={({ field }) => (
            <CustomSelect
              options={ROLE_OPTIONS}
              value={(field.value as string) ?? ''}
              onChange={field.onChange}
              placeholder="Select role..."
            />
          )}
        />
      </div>

      {/* Other roles/tags — shown only when primary role is selected */}
      {primaryRole && (
        <div>
          <label className={LABEL_CLASS}>Other Roles / Tags</label>
          <input
            {...register('otherCategories')}
            className={INPUT_CLASS}
            placeholder="e.g. Researcher, Advisor"
          />
        </div>
      )}

      {/* Title */}
      <div className="col-span-2">
        <label className={LABEL_CLASS}>Title</label>
        <input
          {...register('title')}
          className={INPUT_CLASS}
          placeholder="e.g. CEO, Professor of AI Policy"
        />
      </div>

      {/* Primary Org */}
      <div className="col-span-2">
        <label className={LABEL_CLASS}>Primary Organization</label>
        <Controller
          name="primaryOrg"
          control={control}
          render={({ field }) => (
            <OrgSearch
              value={(field.value as string) ?? ''}
              orgId={(watch('primaryOrgId') as number | null) ?? null}
              onChange={(name, id) => {
                field.onChange(name)
                form.setValue('primaryOrgId', id)
              }}
              onCreateOrg={(name) => onOrgPanelOpen(name, 'primary')}
              placeholder="Search organizations..."
            />
          )}
        />
      </div>

      {/* Affiliated Orgs */}
      <div className="col-span-2">
        <label className={LABEL_CLASS}>Affiliated Organizations</label>
        <Controller
          name="affiliatedOrgIds"
          control={control}
          defaultValue={[]}
          render={({ field }) => (
            <TagInput
              tags={(field.value as Tag[]) ?? []}
              onTagsChange={field.onChange}
              searchFn={searchOrgs}
              placeholder="Search orgs to add..."
              renderTrailingOption={(query) =>
                query.length >= 1 ? (
                  <div
                    onMouseDown={(e) => {
                      e.preventDefault()
                      onOrgPanelOpen(query, 'affiliated')
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 cursor-pointer text-[12px] font-mono border-t border-[#eee] text-[#2563eb] hover:bg-[#f0f0f0]"
                  >
                    <svg
                      className="w-3 h-3 flex-shrink-0"
                      viewBox="0 0 12 12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M6 2v8M2 6h8" />
                    </svg>
                    <span>
                      Add &apos;{query.length > 30 ? query.slice(0, 30) + '...' : query}&apos; as
                      new org...
                    </span>
                  </div>
                ) : null
              }
            />
          )}
        />
      </div>

      {/* Location */}
      <div className="col-span-2">
        <label className={LABEL_CLASS}>Location</label>
        <Controller
          name="location"
          control={control}
          defaultValue={[]}
          render={({ field }) => (
            <LocationSearch
              tags={(field.value as Tag[]) ?? []}
              onTagsChange={field.onChange}
            />
          )}
        />
      </div>

      {/* Regulatory Stance */}
      <div>
        <label className={LABEL_CLASS}>Regulatory Stance</label>
        <Controller
          name="regulatoryStance"
          control={control}
          render={({ field }) => (
            <CustomSelect
              options={STANCE_OPTIONS}
              value={(field.value as string) ?? ''}
              onChange={field.onChange}
              placeholder="Select stance..."
            />
          )}
        />
        {showStanceDetail && (
          <textarea
            {...register('regulatoryStanceDetail')}
            className={`${INPUT_CLASS} mt-2 min-h-[60px] resize-y`}
            placeholder="Please elaborate on their regulatory stance..."
          />
        )}
      </div>

      {/* How publicly stated? */}
      <div>
        <label className={LABEL_CLASS}>How Publicly Stated?</label>
        <Controller
          name="evidenceSource"
          control={control}
          render={({ field }) => (
            <CustomSelect
              options={EVIDENCE_OPTIONS}
              value={(field.value as string) ?? ''}
              onChange={field.onChange}
              placeholder="Select..."
            />
          )}
        />
      </div>

      {/* AGI Timeline */}
      <div>
        <label className={LABEL_CLASS}>
          AGI Timeline
          <InfoTooltip>
            Artificial General Intelligence—AI that matches or exceeds human-level reasoning across domains. Definitions vary widely.{' '}
            <a href="https://en.wikipedia.org/wiki/Artificial_general_intelligence" target="_blank" rel="noopener noreferrer">Learn more</a>
          </InfoTooltip>
        </label>
        <Controller
          name="agiTimeline"
          control={control}
          render={({ field }) => (
            <CustomSelect
              options={TIMELINE_OPTIONS}
              value={(field.value as string) ?? ''}
              onChange={field.onChange}
              placeholder="Select timeline..."
            />
          )}
        />
      </div>

      {/* AI Risk Level */}
      <div>
        <label className={LABEL_CLASS}>AI Risk Level</label>
        <Controller
          name="aiRiskLevel"
          control={control}
          render={({ field }) => (
            <CustomSelect
              options={RISK_OPTIONS}
              value={(field.value as string) ?? ''}
              onChange={field.onChange}
              placeholder="Select risk level..."
            />
          )}
        />
      </div>

      {/* Key Concerns — checkbox group, max 3 */}
      <div className="col-span-2">
        <label className={LABEL_CLASS}>Key Concerns (max 3)</label>
        <Controller
          name="keyConcerns"
          control={control}
          defaultValue={[]}
          render={({ field }) => {
            const selected = (field.value as string[]) ?? []
            const atLimit = selected.length >= 3
            return (
              <div className="flex flex-wrap gap-2 mt-1">
                {KEY_CONCERNS.map((concern) => {
                  const isChecked = selected.includes(concern)
                  const isDisabledVisually = atLimit && !isChecked
                  return (
                    <label
                      key={concern}
                      className={`inline-flex items-center gap-1.5 px-2 py-1 text-[12px] font-mono border rounded cursor-pointer transition-colors select-none ${
                        isChecked
                          ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]'
                          : 'bg-white text-[#555] border-[#ddd] hover:border-[#999]'
                      } ${isDisabledVisually ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            field.onChange(selected.filter((c) => c !== concern))
                          } else if (!atLimit) {
                            field.onChange([...selected, concern])
                          }
                        }}
                      />
                      {concern}
                    </label>
                  )
                })}
              </div>
            )
          }}
        />
      </div>

      {/* Influence Type — checkbox group, no limit */}
      <div className="col-span-2">
        <label className={LABEL_CLASS}>Influence Type</label>
        <Controller
          name="influenceType"
          control={control}
          defaultValue={[]}
          render={({ field }) => {
            const selected = (field.value as string[]) ?? []
            return (
              <div className="flex flex-wrap gap-2 mt-1">
                {INFLUENCE_TYPES.map((type) => {
                  const isChecked = selected.includes(type)
                  return (
                    <label
                      key={type}
                      className={`inline-flex items-center gap-1.5 px-2 py-1 text-[12px] font-mono border rounded cursor-pointer transition-colors select-none ${
                        isChecked
                          ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]'
                          : 'bg-white text-[#555] border-[#ddd] hover:border-[#999]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            field.onChange(selected.filter((t) => t !== type))
                          } else {
                            field.onChange([...selected, type])
                          }
                        }}
                      />
                      {type}
                    </label>
                  )
                })}
              </div>
            )
          }}
        />
      </div>

      {/* Twitter/X */}
      <div>
        <label className={LABEL_CLASS}>Twitter / X</label>
        <Controller
          name="twitter"
          control={control}
          render={({ field }) => (
            <TwitterSearch
              value={(field.value as string) ?? ''}
              onChange={field.onChange}
            />
          )}
        />
      </div>

      {/* Bluesky */}
      <div>
        <label className={LABEL_CLASS}>Bluesky</label>
        <Controller
          name="bluesky"
          control={control}
          render={({ field }) => (
            <BlueskySearch
              value={(field.value as string) ?? ''}
              onChange={field.onChange}
            />
          )}
        />
      </div>

      {/* Website */}
      <div className="col-span-2">
        <label className={LABEL_CLASS}>Website</label>
        <input
          {...register('website')}
          className={INPUT_CLASS}
          placeholder="https://..."
        />
      </div>

      {/* Notes (TipTap) */}
      <div className="col-span-2">
        <label className={LABEL_CLASS}>
          Notes
          <InfoTooltip width={300}>
            <strong>What to include:</strong><br />
            {'• Key policy positions & public statements'}<br />
            {'• Relationships to other stakeholders'}<br />
            {'• Funding sources or organizational ties'}<br />
            {'• Career background & notable projects'}<br />
            {'• Recent relevant activity or controversies'}<br /><br />
            <strong>Use @mentions</strong> (like Notion or Obsidian) to create bidirectional links:<br />
            <em>
              {'"Previously at '}
              <span className="bg-[#e8f0fe] rounded px-0.5 text-[#2563eb] font-medium">@Google DeepMind</span>
              {' before joining '}
              <span className="bg-[#e8f0fe] rounded px-0.5 text-[#2563eb] font-medium">@Anthropic</span>
              {'."'}
            </em><br /><br />
            These links help us map connections between people, orgs, and resources.
          </InfoTooltip>
        </label>
        <Controller
          name="notesHtml"
          control={control}
          render={({ field }) => (
            <TipTapEditor
              content={(field.value as string) ?? ''}
              searchEntities={searchEntities}
              placeholder="Add notes about this person — policy positions, relationships, funding, career history. Use @ to mention other people & orgs."
              onUpdate={(html: string, mentions: MentionData[]) => {
                field.onChange(html)
                form.setValue('notesMentions', mentions)
              }}
            />
          )}
        />
      </div>

      {/* Email */}
      <div className="col-span-2">
        <label className={LABEL_CLASS}>Your Email</label>
        <input
          {...register('submitterEmail', {
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: 'Please enter a valid email address',
            },
          })}
          type="email"
          className={INPUT_CLASS}
          placeholder="your@email.com"
        />
        {errors.submitterEmail && (
          <span className="text-[11px] font-mono text-red-500 mt-0.5">
            {errors.submitterEmail.message as string}
          </span>
        )}
        <span className="text-[12px] font-mono text-[#888] mt-0.5 block">
          Your email will not be displayed publicly. It&apos;s used only if we need to contact you about your submission.
        </span>
      </div>

      {/* Submit */}
      <div className="col-span-2">
        <button
          type="submit"
          disabled={submitEntity.isPending}
          className="w-full px-6 py-3 font-mono text-[13px] uppercase tracking-wider bg-[#1a1a1a] text-white border-none rounded cursor-pointer transition-colors hover:bg-[#333] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitEntity.isPending
            ? 'Submitting...'
            : updateContext
              ? 'Update Person'
              : 'Submit Person'}
        </button>
      </div>
    </form>
  )
}
