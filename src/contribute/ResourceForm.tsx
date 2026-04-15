import { useCallback } from 'react'
import { Controller, type UseFormReturn } from 'react-hook-form'
import { CustomSelect, buildOptions } from '../components/CustomSelect'
import { TipTapEditor, type MentionData } from '../components/TipTapEditor'
import { OrgSearch } from './OrgSearch'
import { useEntityCache } from '../hooks/useEntityCache'
import { useSubmitEntity } from '../hooks/useSubmitEntity'
import { fuzzySearch } from '../lib/search'
import type { UpdateContext } from './ContributeForm'

interface ResourceFormProps {
  form: UseFormReturn<Record<string, unknown>>
  updateContext: UpdateContext | null
}

const CATEGORY_OPTIONS = buildOptions([
  'Policy document',
  'Academic paper',
  'News article',
  'Book',
  'Report',
  'Blog post',
  'Podcast',
  'Video',
  'Dataset',
  'Tool/software',
  'Other',
])

const TYPE_OPTIONS = buildOptions([
  'Legislative',
  'Executive order',
  'Agency guidance',
  'Treaty/international',
  'Think tank report',
  'Industry publication',
  'Academic study',
  'Investigative',
  'Opinion/editorial',
  'Transcript',
  'Other',
])

const LABEL_CLASS = 'font-mono text-[11px] uppercase tracking-wider text-[#555]'
const INPUT_CLASS =
  'w-full px-3 py-2 font-mono text-[13px] border border-[#ddd] rounded bg-white outline-none transition-colors hover:border-[#999] focus:border-[#2563eb]'

export function ResourceForm({ form, updateContext }: ResourceFormProps) {
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
      type: 'resource',
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
      {/* Title */}
      <div className="col-span-2">
        <label className={LABEL_CLASS}>
          Title <span className="text-red-500">*</span>
        </label>
        <input
          {...register('resourceTitle', { required: 'Title is required' })}
          readOnly={updateContext != null}
          className={`${INPUT_CLASS} ${updateContext ? 'bg-[#f5f5f5] cursor-not-allowed' : ''}`}
          placeholder="Resource title"
        />
        {errors.resourceTitle && (
          <span className="text-[11px] font-mono text-red-500 mt-0.5">
            {errors.resourceTitle.message as string}
          </span>
        )}
      </div>

      {/* Category */}
      <div>
        <label className={LABEL_CLASS}>Category</label>
        <Controller
          name="resourceCategory"
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

      {/* Type */}
      <div>
        <label className={LABEL_CLASS}>Type</label>
        <Controller
          name="resourceType"
          control={control}
          render={({ field }) => (
            <CustomSelect
              options={TYPE_OPTIONS}
              value={(field.value as string) ?? ''}
              onChange={field.onChange}
              placeholder="Select type..."
            />
          )}
        />
      </div>

      {/* Author */}
      <div className="col-span-2">
        <label className={LABEL_CLASS}>Author</label>
        <input
          {...register('resourceAuthor')}
          className={INPUT_CLASS}
          placeholder="Author name"
        />
      </div>

      {/* Organization */}
      <div className="col-span-2">
        <label className={LABEL_CLASS}>Organization</label>
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
              placeholder="Search affiliated organization..."
            />
          )}
        />
      </div>

      {/* Year */}
      <div>
        <label className={LABEL_CLASS}>Year</label>
        <input
          {...register('resourceYear')}
          className={INPUT_CLASS}
          placeholder="e.g. 2025"
        />
      </div>

      {/* URL */}
      <div>
        <label className={LABEL_CLASS}>URL</label>
        <input
          {...register('resourceUrl')}
          type="url"
          className={INPUT_CLASS}
          placeholder="https://..."
        />
      </div>

      {/* Key Argument */}
      <div className="col-span-2">
        <label className={LABEL_CLASS}>Key Argument</label>
        <textarea
          {...register('resourceKeyArgument')}
          className={`${INPUT_CLASS} min-h-[80px] resize-y`}
          placeholder="What is the main argument or finding of this resource?"
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
              placeholder="Add notes about this resource — context, impact, related work. Use @ to mention people & orgs."
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
              ? 'Update Resource'
              : 'Submit Resource'}
        </button>
      </div>
    </form>
  )
}
