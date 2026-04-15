import { useState, useCallback } from 'react'
import { useForm, type UseFormReturn } from 'react-hook-form'
import { DropdownProvider } from '../contexts/DropdownContext'
import { PillToggle } from './PillToggle'
import type { Entity } from '../types/entity'

export type FormType = 'person' | 'organization' | 'resource'

const TABS: { type: FormType; label: string }[] = [
  { type: 'person', label: 'Add a Person' },
  { type: 'organization', label: 'Add an Organization' },
  { type: 'resource', label: 'Add a Resource' },
]

const RELATIONSHIP_OPTIONS = [
  { value: 'self', label: 'I am this person' },
  { value: 'connector', label: 'I am connected' },
  { value: 'external', label: 'Someone I know of' },
]

/** State for update mode (editing an existing entity). */
export interface UpdateContext {
  entityId: number
  entityData: Partial<Entity>
}

interface ContributeFormProps {
  className?: string
}

/**
 * Main form container with tab switching, relationship pills, and auto-save.
 *
 * Architecture:
 * - 3 separate useForm instances (one per form type)
 * - All 3 forms stay mounted (display:none on inactive) to preserve TipTap state
 * - Each form has its own updateEntityId for update mode
 * - switchToFormInUpdateMode enables cross-form navigation (author "edit" → person tab)
 */
export function ContributeForm({ className = '' }: ContributeFormProps) {
  const [activeTab, setActiveTab] = useState<FormType>('person')

  // Per-form update mode state
  const [updateContexts, setUpdateContexts] = useState<Record<FormType, UpdateContext | null>>({
    person: null,
    organization: null,
    resource: null,
  })

  // Three separate form instances
  const personForm = useForm<Record<string, unknown>>({ defaultValues: {} })
  const orgForm = useForm<Record<string, unknown>>({ defaultValues: {} })
  const resourceForm = useForm<Record<string, unknown>>({ defaultValues: {} })

  const forms: Record<FormType, UseFormReturn<Record<string, unknown>>> = {
    person: personForm,
    organization: orgForm,
    resource: resourceForm,
  }

  // Cross-form navigation: switch tab and enter update mode
  // Exposed to DuplicateDetection and OrgSearch "edit" links (wired in Unit 17)
  const switchToFormInUpdateMode = useCallback(
    (formType: FormType, entityData: Partial<Entity>) => {
      setActiveTab(formType)
      setUpdateContexts((prev) => ({
        ...prev,
        [formType]: { entityId: entityData.id!, entityData },
      }))
      // Prefill the target form with entity data
      const form = forms[formType]
      form.reset(entityData as Record<string, unknown>)
    },
    [forms],
  )

  // Cancel update mode for a specific form
  const cancelUpdate = useCallback(
    (formType: FormType) => {
      setUpdateContexts((prev) => ({ ...prev, [formType]: null }))
      forms[formType].reset({})
    },
    [forms],
  )

  // Clear form and draft
  const clearForm = useCallback(
    (formType: FormType) => {
      forms[formType].reset({})
      setUpdateContexts((prev) => ({ ...prev, [formType]: null }))
    },
    [forms],
  )

  return (
    <DropdownProvider>
      <div className={className}>
        {/* Form tabs */}
        <div className="flex gap-2 mb-6">
          {TABS.map(({ type, label }) => (
            <button
              key={type}
              type="button"
              onClick={() => setActiveTab(type)}
              className={`px-4 py-2 font-mono text-[11px] uppercase tracking-wider border rounded cursor-pointer transition-colors ${
                type === activeTab
                  ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]'
                  : 'bg-white text-[#555] border-[#ccc] hover:border-[#999]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Person Form */}
        <div style={{ display: activeTab === 'person' ? 'block' : 'none' }}>
          <FormHeader
            formType="person"
            form={personForm}
            updateContext={updateContexts.person}
            onCancelUpdate={() => cancelUpdate('person')}
            onClear={() => clearForm('person')}
          />
          {/* PersonForm fields will be composed here in Unit 17 */}
          <div className="text-[13px] font-mono text-[#888] p-4 border border-dashed border-[#ddd] rounded">
            Person form fields (Unit 17)
          </div>
        </div>

        {/* Organization Form */}
        <div style={{ display: activeTab === 'organization' ? 'block' : 'none' }}>
          <FormHeader
            formType="organization"
            form={orgForm}
            updateContext={updateContexts.organization}
            onCancelUpdate={() => cancelUpdate('organization')}
            onClear={() => clearForm('organization')}
          />
          <div className="text-[13px] font-mono text-[#888] p-4 border border-dashed border-[#ddd] rounded">
            Organization form fields (Unit 17)
          </div>
        </div>

        {/* Resource Form */}
        <div style={{ display: activeTab === 'resource' ? 'block' : 'none' }}>
          <FormHeader
            formType="resource"
            form={resourceForm}
            updateContext={updateContexts.resource}
            onCancelUpdate={() => cancelUpdate('resource')}
            onClear={() => clearForm('resource')}
          />
          <div className="text-[13px] font-mono text-[#888] p-4 border border-dashed border-[#ddd] rounded">
            Resource form fields (Unit 17)
          </div>
        </div>
      </div>
    </DropdownProvider>
  )
}

/** Form header with pill toggle, clear link, and update banner. */
function FormHeader({
  formType,
  form,
  updateContext,
  onCancelUpdate,
  onClear,
}: {
  formType: FormType
  form: UseFormReturn<Record<string, unknown>>
  updateContext: UpdateContext | null
  onCancelUpdate: () => void
  onClear: () => void
}) {
  const showPills = formType === 'person'

  return (
    <div className="mb-4">
      {/* Update banner */}
      {updateContext && (
        <div className="flex items-center justify-between px-4 py-2.5 mb-4 bg-amber-50 border border-amber-200 rounded text-[13px]">
          <span>
            Updating <strong>{updateContext.entityData.name}</strong> — adjust
            any fields and submit
          </span>
          <button
            type="button"
            onClick={onCancelUpdate}
            className="text-[12px] font-mono text-amber-700 hover:text-amber-900 underline"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Pill toggle + clear link */}
      <div className="flex items-center justify-between gap-4">
        {showPills ? (
          <PillToggle
            value={(form.watch('submitterRelationship') as string) ?? ''}
            onChange={(v) => form.setValue('submitterRelationship', v)}
            options={RELATIONSHIP_OPTIONS}
          />
        ) : (
          <div /> // Spacer
        )}
        <button
          type="button"
          onClick={onClear}
          className="text-[12px] font-mono text-[#888] hover:text-[#1a1a1a] cursor-pointer"
        >
          Clear form
        </button>
      </div>
    </div>
  )
}
