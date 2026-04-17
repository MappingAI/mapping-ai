import { useState, useCallback, useEffect, useRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { createPortal } from 'react-dom'
import { CustomSelect, buildOptions } from '../components/CustomSelect'
import { TipTapEditor, type MentionData } from '../components/TipTapEditor'
import { useSubmitEntity, useAddPendingEntity } from '../hooks/useSubmitEntity'
import { useEntityCache } from '../hooks/useEntityCache'
import { fuzzySearch } from '../lib/search'
import type { SubmitRequest } from '../types/api'

const ORG_CATEGORIES = [
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
]

const STANCE_OPTIONS = [
  'Accelerate',
  'Light-touch',
  'Targeted',
  'Moderate',
  'Restrictive',
  'Precautionary',
  'Nationalize',
  'Mixed/unclear',
  'Other',
]

interface OrgCreationPanelProps {
  isOpen: boolean
  onClose: () => void
  onOrgCreated: (org: { id: number; name: string; category?: string | null }) => void
  initialName: string
  triggerType: 'primary' | 'parent' | 'affiliated'
}

interface OrgFormValues {
  name: string
  category: string
  website: string
  location: string
  fundingModel: string
  regulatoryStance: string
  twitter: string
  bluesky: string
  notesHtml: string
  notesMentions: string
}

/**
 * Slide-in side panel for creating a new organization without leaving
 * the person/resource form. Renders as a React portal at document.body.
 *
 * INCEPTION GUARD: Components inside this panel receive allowOrgCreation={false}
 * to prevent recursive panel opening.
 */
export function OrgCreationPanel({
  isOpen,
  onClose,
  onOrgCreated,
  initialName,
  triggerType: _triggerType,
}: OrgCreationPanelProps) {
  void _triggerType // Used by parent to determine which field to update after creation
  const [showExpanded, setShowExpanded] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const { control, handleSubmit, reset, setValue } = useForm<OrgFormValues>({
    defaultValues: {
      name: initialName,
      category: '',
      website: '',
      location: '',
      fundingModel: '',
      regulatoryStance: '',
      twitter: '',
      bluesky: '',
      notesHtml: '',
      notesMentions: '[]',
    },
  })

  const submitMutation = useSubmitEntity()
  const addPendingEntity = useAddPendingEntity()
  const { cache } = useEntityCache()

  // Reset form when panel opens with new name
  useEffect(() => {
    if (isOpen) {
      reset({
        name: initialName,
        category: '',
        website: '',
        location: '',
        fundingModel: '',
        regulatoryStance: '',
        twitter: '',
        bluesky: '',
        notesHtml: '',
        notesMentions: '[]',
      })
      setShowExpanded(false)
      setShowSuccess(false)
    }
  }, [isOpen, initialName, reset])

  // Entity search for TipTap @mentions (inception guard: no org creation from within panel)
  const searchEntities = useCallback(
    (query: string) => {
      if (!cache || !query) return []
      return fuzzySearch(cache.entities, query).map((r) => ({
        id: `${r.entity_type}-${r.id}`,
        entityType: r.entity_type,
        entityId: r.id,
        label: r.name,
        detail: r.category ?? '',
      }))
    },
    [cache],
  )

  const onSubmit = useCallback(
    async (values: OrgFormValues) => {
      const data: Record<string, unknown> = {
        name: values.name,
        category: values.category,
        website: values.website,
        location: values.location,
        fundingModel: values.fundingModel,
        regulatoryStance: values.regulatoryStance,
        twitter: values.twitter,
        bluesky: values.bluesky,
        notesHtml: values.notesHtml,
        notesMentions: values.notesMentions,
      }

      const request: SubmitRequest = {
        type: 'organization',
        timestamp: new Date().toISOString(),
        data,
        _hp: '',
      }

      try {
        const result = await submitMutation.mutateAsync(request)
        // Optimistically add to entity cache
        addPendingEntity({
          id: result.submissionId,
          entity_type: 'organization',
          name: values.name,
          category: values.category || null,
        })
        // Show success overlay
        setShowSuccess(true)
        setTimeout(() => {
          onOrgCreated({
            id: result.submissionId,
            name: values.name,
            category: values.category || null,
          })
          onClose()
        }, 1500)
      } catch {
        // Error handled by mutation state
      }
    },
    [submitMutation, addPendingEntity, onOrgCreated, onClose],
  )

  if (!isOpen) return null

  return createPortal(
    <>
      {/* Background overlay */}
      <div className="fixed inset-0 z-[200] bg-black/20" onClick={onClose} />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed top-0 right-0 bottom-0 z-[201] w-[460px] max-[768px]:w-screen bg-white shadow-2xl overflow-y-auto"
      >
        {/* Success overlay */}
        {showSuccess && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/95">
            <div className="text-center">
              <div className="text-2xl mb-2">&#10003;</div>
              <div className="font-mono text-sm uppercase tracking-wider">
                Organization submitted
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#eee]">
          <h2 className="font-mono text-[13px] uppercase tracking-wider">Add New Organization</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[#888] hover:text-[#1a1a1a] text-lg leading-none"
          >
            &times;
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-[#555] mb-1">
              Organization Name *
            </label>
            <Controller
              name="name"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <input
                  {...field}
                  className="w-full px-3 py-2 font-mono text-[13px] border border-[#ddd] rounded"
                  required
                />
              )}
            />
          </div>

          {/* Category */}
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-[#555] mb-1">
              Category
            </label>
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <CustomSelect
                  options={buildOptions(ORG_CATEGORIES)}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Select category..."
                />
              )}
            />
          </div>

          {/* Website */}
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-[#555] mb-1">
              Website
            </label>
            <Controller
              name="website"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="url"
                  placeholder="https://..."
                  className="w-full px-3 py-2 font-mono text-[13px] border border-[#ddd] rounded"
                />
              )}
            />
          </div>

          {/* Location (simple text for panel — full LocationSearch in main form) */}
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-[#555] mb-1">
              Location
            </label>
            <Controller
              name="location"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  placeholder="City, State, Country"
                  className="w-full px-3 py-2 font-mono text-[13px] border border-[#ddd] rounded"
                />
              )}
            />
          </div>

          {/* Expandable section */}
          <button
            type="button"
            onClick={() => setShowExpanded(!showExpanded)}
            className="text-[12px] font-mono text-[#2563eb] hover:underline"
          >
            {showExpanded ? '− Hide extra fields' : '+ Add more details'}
          </button>

          {showExpanded && (
            <div className="space-y-4 pt-2">
              {/* Funding Model */}
              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-[#555] mb-1">
                  Funding Model
                </label>
                <Controller
                  name="fundingModel"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      placeholder="e.g., VC-backed, government-funded, nonprofit"
                      className="w-full px-3 py-2 font-mono text-[13px] border border-[#ddd] rounded"
                    />
                  )}
                />
              </div>

              {/* Regulatory Stance */}
              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-[#555] mb-1">
                  Regulatory Stance
                </label>
                <Controller
                  name="regulatoryStance"
                  control={control}
                  render={({ field }) => (
                    <CustomSelect
                      options={buildOptions(STANCE_OPTIONS)}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select stance..."
                    />
                  )}
                />
              </div>

              {/* Twitter */}
              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-[#555] mb-1">
                  Twitter/X
                </label>
                <Controller
                  name="twitter"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      placeholder="@handle"
                      className="w-full px-3 py-2 font-mono text-[13px] border border-[#ddd] rounded"
                    />
                  )}
                />
              </div>

              {/* Bluesky */}
              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-[#555] mb-1">
                  Bluesky
                </label>
                <Controller
                  name="bluesky"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      placeholder="@handle.bsky.social"
                      className="w-full px-3 py-2 font-mono text-[13px] border border-[#ddd] rounded"
                    />
                  )}
                />
              </div>

              {/* Notes with TipTap */}
              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-[#555] mb-1">
                  Notes
                </label>
                <TipTapEditor
                  placeholder="Add notes about this organization..."
                  searchEntities={searchEntities}
                  onUpdate={(html: string, mentions: MentionData[]) => {
                    setValue('notesHtml', html)
                    setValue('notesMentions', JSON.stringify(mentions))
                  }}
                />
              </div>
            </div>
          )}

          {/* Submit button */}
          <div className="pt-2">
            {submitMutation.isError && (
              <div className="text-red-600 text-[12px] font-mono mb-2">
                {submitMutation.error?.message ?? 'Submission failed'}
              </div>
            )}
            <button
              type="submit"
              disabled={submitMutation.isPending}
              className="w-full py-2.5 font-mono text-[11px] uppercase tracking-wider bg-[#1a1a1a] text-white rounded cursor-pointer disabled:opacity-50"
            >
              {submitMutation.isPending ? 'Submitting...' : 'Submit Organization'}
            </button>
          </div>
        </form>
      </div>
    </>,
    document.body,
  )
}
