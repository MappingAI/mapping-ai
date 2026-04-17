import { useCallback } from 'react'
import { Controller, type UseFormReturn } from 'react-hook-form'
import { CustomSelect, buildOptions } from '../components/CustomSelect'
import { TipTapEditor, type MentionData } from '../components/TipTapEditor'
import { DuplicateDetection } from '../components/DuplicateDetection'
import { InfoTooltip } from '../components/InfoTooltip'
import { OrgSearch } from './OrgSearch'
import { LocationSearch } from './LocationSearch'
import { TwitterSearch } from './TwitterSearch'
import { BlueskySearch } from './BlueskySearch'
import { useEntityCache } from '../hooks/useEntityCache'
import { useSubmitEntity } from '../hooks/useSubmitEntity'
import { fuzzySearch } from '../lib/search'
import { searchEntities as searchAPI } from '../lib/api'
import type { UpdateContext } from './ContributeForm'
import type { Tag } from '../components/TagInput'

interface OrganizationFormProps {
  form: UseFormReturn<Record<string, unknown>>
  updateContext: UpdateContext | null
  onOrgPanelOpen?: (name: string, triggerType: 'primary' | 'affiliated') => void
  onEnterUpdateMode?: (entityData: Record<string, unknown>) => void
  onSubmitSuccess?: () => void
}

const CATEGORY_OPTIONS = buildOptions([
  'Frontier Lab',
  'AI Safety/Alignment',
  'Think Tank/Policy Org',
  'Government/Agency',
  'Academic',
  'VC/Capital/Philanthropy',
  'Labor/Civil Society',
  'Ethics/Bias/Rights',
  'Media/Journalism',
  'Political Campaign/PAC',
  'AI Infrastructure & Compute',
  'Deployers & Platforms',
])

const FUNDING_MODEL_OPTIONS = buildOptions([
  'Venture-backed',
  'Revenue-generating',
  'Government-funded',
  'Philanthropic',
  'Membership',
  'Mixed',
  'Public benefit',
  'Self-funded',
  'Other',
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

const LABEL_CLASS = 'font-mono text-[11px] uppercase tracking-wider text-[#555]'
const INPUT_CLASS =
  'w-full px-3 py-2 font-mono text-[13px] border border-[#ddd] rounded bg-white outline-none transition-colors hover:border-[#999] focus:border-[#2563eb]'

export function OrganizationForm({ form, updateContext, onOrgPanelOpen, onEnterUpdateMode, onSubmitSuccess }: OrganizationFormProps) {
  const { register, control, watch, handleSubmit, formState: { errors } } = form
  const { cache } = useEntityCache()
  const submitEntity = useSubmitEntity()
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

  const onSubmit = handleSubmit((data) => {
    const { _hp, ...fields } = data
    submitEntity.mutate(
      {
        type: 'organization',
        timestamp: new Date().toISOString(),
        data: {
          ...fields,
          entityId: updateContext?.entityId ?? undefined,
        },
        _hp: (_hp as string) ?? '',
      },
      { onSuccess: () => onSubmitSuccess?.() },
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
          placeholder="Organization name"
        />
        {errors.name && (
          <span className="text-[11px] font-mono text-red-500 mt-0.5">
            {errors.name.message as string}
          </span>
        )}
        {!updateContext && (
          <DuplicateDetection
            query={(watch('name') as string) ?? ''}
            entityType="organization"
            onViewExisting={(entity) => window.open(`/map?search=${encodeURIComponent(entity.name)}`, '_blank')}
            onUpdateExisting={(entity) => onEnterUpdateMode?.({ id: entity.id, name: entity.name, category: entity.category })}
          />
        )}
      </div>

      {/* Category */}
      <div className="col-span-2">
        <label className={LABEL_CLASS}>Category</label>
        <Controller
          name="category"
          control={control}
          render={({ field }) => (
            <CustomSelect
              options={CATEGORY_OPTIONS}
              value={(field.value as string) ?? ''}
              onChange={field.onChange}
              placeholder="Select category..."
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

      {/* Parent Org */}
      <div className="col-span-2">
        <label className={LABEL_CLASS}>Parent Organization</label>
        <Controller
          name="parentOrg"
          control={control}
          render={({ field }) => (
            <OrgSearch
              value={(field.value as string) ?? ''}
              orgId={(watch('parentOrgId') as number | null) ?? null}
              onChange={(name, id) => {
                field.onChange(name)
                form.setValue('parentOrgId', id)
              }}
              onCreateOrg={onOrgPanelOpen ? (name) => onOrgPanelOpen(name, 'primary') : undefined}
              placeholder="Search parent organization..."
            />
          )}
        />
      </div>

      {/* Location — with Remote option */}
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
              showRemote
              remoteChecked={(watch('locationRemote') as boolean) ?? false}
              onRemoteChange={(checked) => form.setValue('locationRemote', checked)}
            />
          )}
        />
      </div>

      {/* Funding Model */}
      <div className="col-span-2">
        <label className={LABEL_CLASS}>Funding Model</label>
        <Controller
          name="fundingModel"
          control={control}
          render={({ field }) => (
            <CustomSelect
              options={FUNDING_MODEL_OPTIONS}
              value={(field.value as string) ?? ''}
              onChange={field.onChange}
              placeholder="Select funding model..."
            />
          )}
        />
      </div>

      {/* Regulatory Stance */}
      <div className="col-span-2">
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

      {/* Notes (TipTap) */}
      <div className="col-span-2">
        <label className={LABEL_CLASS}>
          Notes
          <InfoTooltip width={280}>
            <strong>What to include:</strong><br />
            {'• Mission, strategy & key programs'}<br />
            {'• Key people & leadership'}<br />
            {'• Funding sources or organizational ties'}<br />
            {'• Policy positions & public statements'}<br />
            {'• Recent relevant activity or controversies'}<br /><br />
            <strong>Use @mentions</strong> to create bidirectional links between entities.
          </InfoTooltip>
        </label>
        <Controller
          name="notesHtml"
          control={control}
          render={({ field }) => (
            <TipTapEditor
              content={(field.value as string) ?? ''}
              searchEntities={searchEntities}
              placeholder="Add notes about this organization — mission, key people, funding, policy positions. Use @ to mention people & orgs."
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
              ? 'Update Organization'
              : 'Submit Organization'}
        </button>
      </div>
    </form>
  )
}
