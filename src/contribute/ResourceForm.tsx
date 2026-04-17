import { useCallback } from 'react'
import { Controller, type UseFormReturn } from 'react-hook-form'
import { CustomSelect, buildOptions } from '../components/CustomSelect'
import { TipTapEditor, type MentionData } from '../components/TipTapEditor'
import { DuplicateDetection } from '../components/DuplicateDetection'
import { InfoTooltip } from '../components/InfoTooltip'
import { TagInput, type Tag, type TagSearchResult } from '../components/TagInput'
import { OrgSearch } from './OrgSearch'
import { useEntityCache } from '../hooks/useEntityCache'
import { useSubmitEntity, useAddPendingEntity } from '../hooks/useSubmitEntity'
import { fuzzySearch } from '../lib/search'
import { searchEntities as searchAPI } from '../lib/api'
import type { FuzzySearchResult } from '../types/api'
import type { UpdateContext } from './ContributeForm'

interface ResourceFormProps {
  form: UseFormReturn<Record<string, unknown>>
  updateContext: UpdateContext | null
  onOrgPanelOpen?: (name: string, triggerType: 'primary' | 'affiliated') => void
  onSwitchToPersonTab?: () => void
  onViewExisting?: (entity: FuzzySearchResult) => void
  onEnterUpdateMode?: (entityData: Record<string, unknown>) => void
  onSubmitSuccess?: () => void
}

const TYPE_OPTIONS = buildOptions([
  'Essay',
  'Book',
  'Report',
  'Podcast',
  'Video',
  'Website',
  'Academic Paper',
  'News Article',
  'Substack/Newsletter',
])

const LABEL_CLASS = 'font-mono text-[11px] uppercase tracking-wider text-[#555]'
const INPUT_CLASS =
  'w-full px-3 py-2 font-mono text-[13px] border border-[#ddd] rounded bg-white outline-none transition-colors hover:border-[#999] focus:border-[#2563eb]'

export function ResourceForm({
  form,
  updateContext,
  onOrgPanelOpen,
  onSwitchToPersonTab,
  onViewExisting,
  onEnterUpdateMode,
  onSubmitSuccess,
}: ResourceFormProps) {
  const {
    register,
    control,
    watch,
    handleSubmit,
    formState: { errors },
  } = form
  const { cache } = useEntityCache()
  const submitEntity = useSubmitEntity()
  const addPendingEntity = useAddPendingEntity()

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
        } catch {
          /* local results still work */
        }
      }
      return local
    },
    [cache],
  )

  // Author search — searches existing people
  const searchPeople = useCallback(
    async (query: string): Promise<TagSearchResult[]> => {
      if (!query) return []
      const local: TagSearchResult[] = cache
        ? fuzzySearch(cache.entities, query, 'person', 10).map((r) => ({
            id: r.id,
            label: r.name,
            detail: r.title ?? r.category ?? undefined,
          }))
        : []
      if (query.length >= 2) {
        try {
          const pending = await searchAPI(query, 'person', 'pending')
          const seenIds = new Set(local.map((r) => r.id))
          for (const p of pending) {
            if (!seenIds.has(p.id)) {
              local.push({
                id: p.id,
                label: p.name,
                detail: p.title ?? p.category ?? undefined,
                isPending: true,
              })
            }
          }
        } catch {
          /* local results still work */
        }
      }
      return local
    },
    [cache],
  )

  const onSubmit = handleSubmit((data) => {
    const { _hp, ...fields } = data
    // Serialize arrays: resourceAuthors (Tag[]) → author string, notesMentions → JSON string
    const authors = fields.resourceAuthors as { label: string }[] | undefined
    const apiData: Record<string, unknown> = {
      ...fields,
      author: Array.isArray(authors)
        ? authors.map((t) => t.label).join(', ')
        : (fields.resourceAuthor ?? null),
      notesMentions: Array.isArray(fields.notesMentions)
        ? JSON.stringify(fields.notesMentions)
        : (fields.notesMentions ?? null),
      // Map resource field names to what the API expects
      name: fields.resourceTitle ?? null,
      title: fields.resourceTitle ?? null,
      category: fields.resourceType ?? null,
      url: fields.resourceUrl ?? null,
      year: fields.resourceYear ?? null,
      keyArgument: fields.resourceKeyArgument ?? null,
      entityId: updateContext?.entityId ?? undefined,
    }
    submitEntity.mutate(
      {
        type: 'resource',
        timestamp: new Date().toISOString(),
        data: apiData,
        _hp: (_hp as string) ?? '',
      },
      {
        onSuccess: (result) => {
          addPendingEntity({
            id: result.submissionId,
            entity_type: 'resource',
            name: (fields.resourceTitle as string) ?? '',
            category: (fields.resourceType as string) ?? null,
          })
          onSubmitSuccess?.()
        },
      },
    )
  })

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-2 gap-4">
      {/* Honeypot — hidden from humans, visible to bots */}
      <input
        {...register('_hp')}
        type="text"
        tabIndex={-1}
        autoComplete="off"
        className="absolute -left-[9999px]"
      />

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
            {errors.resourceTitle.message!}
          </span>
        )}
        {!updateContext && (
          <DuplicateDetection
            query={(watch('resourceTitle') as string) ?? ''}
            entityType="resource"
            onViewExisting={(entity) => onViewExisting?.(entity)}
            onUpdateExisting={(entity) => {
              const full = entity.isPending ? null : cache?.byId.get(entity.id)
              onEnterUpdateMode?.(
                full
                  ? { ...full }
                  : { id: entity.id, name: entity.name, resourceTitle: entity.name },
              )
              onViewExisting?.(entity)
            }}
          />
        )}
      </div>

      {/* Type */}
      <div className="col-span-2">
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

      {/* Author(s) */}
      <div className="col-span-2">
        <label className={LABEL_CLASS}>Author(s)</label>
        <Controller
          name="resourceAuthors"
          control={control}
          defaultValue={[]}
          render={({ field }) => (
            <TagInput
              tags={(field.value as Tag[]) ?? []}
              onTagsChange={field.onChange}
              searchFn={searchPeople}
              placeholder="Search people..."
            />
          )}
        />
        {onSwitchToPersonTab && (
          <button
            type="button"
            onClick={onSwitchToPersonTab}
            className="mt-1 text-[11px] font-mono text-[#2563eb] hover:text-[#1d4ed8] hover:underline bg-transparent border-none cursor-pointer p-0"
          >
            Not found? Add this person
          </button>
        )}
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
              onCreateOrg={onOrgPanelOpen ? (name) => onOrgPanelOpen(name, 'primary') : undefined}
              placeholder="Search affiliated organization..."
            />
          )}
        />
      </div>

      {/* Year */}
      <div>
        <label className={LABEL_CLASS}>Year</label>
        <input {...register('resourceYear')} className={INPUT_CLASS} placeholder="e.g. 2025" />
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
        <label className={LABEL_CLASS}>
          Notes
          <InfoTooltip width={280}>
            <strong>What to include:</strong>
            <br />
            {'• Context, impact & significance'}
            <br />
            {'• Related work & responses'}
            <br />
            {'• Key takeaways or controversies'}
            <br />
            <br />
            <strong>Use @mentions</strong> to link related people, orgs, and resources.
          </InfoTooltip>
        </label>
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
            {errors.submitterEmail.message!}
          </span>
        )}
        <span className="text-[12px] font-mono text-[#888] mt-0.5 block">
          Your email will not be displayed publicly. It&apos;s used only if we need to contact you
          about your submission.
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
              ? 'Update Resource'
              : 'Submit Resource'}
        </button>
        {submitEntity.isError && (
          <p className="text-[12px] font-mono text-red-600 mt-2">
            {(submitEntity.error as { body?: { error?: string } })?.body?.error ??
              'Submission failed. Please try again.'}
          </p>
        )}
      </div>
    </form>
  )
}
