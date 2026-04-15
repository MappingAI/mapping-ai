import { useCallback } from 'react'
import { Controller, type UseFormReturn } from 'react-hook-form'
import { CustomSelect, buildOptions } from '../components/CustomSelect'
import { TipTapEditor, type MentionData } from '../components/TipTapEditor'
import { OrgSearch } from './OrgSearch'
import { LocationSearch } from './LocationSearch'
import { useEntityCache } from '../hooks/useEntityCache'
import { useSubmitEntity } from '../hooks/useSubmitEntity'
import { fuzzySearch } from '../lib/search'
import type { UpdateContext } from './ContributeForm'
import type { Tag } from '../components/TagInput'

interface OrganizationFormProps {
  form: UseFormReturn<Record<string, unknown>>
  updateContext: UpdateContext | null
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

export function OrganizationForm({ form, updateContext }: OrganizationFormProps) {
  const { register, control, watch, handleSubmit, formState: { errors } } = form
  const { cache } = useEntityCache()
  const submitEntity = useSubmitEntity()

  // TipTap @mention search
  const searchEntities = useCallback(
    (query: string) => {
      if (!cache) return []
      const results = fuzzySearch(cache.entities, query, undefined, 8)
      return results.map((r) => ({
        id: String(r.id),
        entityType: r.entity_type,
        entityId: r.id,
        label: r.name,
        detail: r.category ?? r.primary_org ?? '',
      }))
    },
    [cache],
  )

  const onSubmit = handleSubmit((data) => {
    submitEntity.mutate({
      type: 'organization',
      timestamp: new Date().toISOString(),
      data: {
        ...data,
        entityId: updateContext?.entityId ?? undefined,
      },
      _hp: '',
    })
  })

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-2 gap-4">
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
        <input
          {...register('fundingModel')}
          className={INPUT_CLASS}
          placeholder="e.g. Venture-backed, Non-profit, Government-funded"
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
      </div>

      {/* Notes (TipTap) */}
      <div className="col-span-2">
        <label className={LABEL_CLASS}>Notes</label>
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
