import { useState, useCallback, useRef, useEffect } from 'react'
import { useForm, type UseFormReturn } from 'react-hook-form'
import { DropdownProvider } from '../contexts/DropdownContext'
import { useAutoSave } from '../hooks/useAutoSave'
import { PillToggle } from './PillToggle'
import { PersonForm } from './PersonForm'
import { OrganizationForm } from './OrganizationForm'
import { ResourceForm } from './ResourceForm'
import { OrgCreationPanel } from './OrgCreationPanel'
import { ExampleSubmission } from './ExampleSubmission'
import { ExistingEntitySidebar } from '../components/ExistingEntitySidebar'
import { SuccessMessage } from './SuccessMessage'
import type { Entity } from '../types/entity'
import type { FuzzySearchResult } from '../types/api'

export type FormType = 'person' | 'organization' | 'resource'

const TABS: { type: FormType; label: string }[] = [
  { type: 'person', label: 'Add a Person' },
  { type: 'organization', label: 'Add an Organization' },
  { type: 'resource', label: 'Add a Resource' },
]

const RELATIONSHIP_OPTIONS: Record<FormType, { value: string; label: string }[]> = {
  person: [
    { value: 'self', label: 'I am this person' },
    { value: 'connector', label: 'I am connected' },
    { value: 'external', label: 'Someone I know of' },
  ],
  organization: [
    { value: 'self', label: 'I am part of this org' },
    { value: 'connector', label: 'I am connected' },
    { value: 'external', label: 'An org I know of' },
  ],
  resource: [
    { value: 'self', label: 'I am a creator' },
    { value: 'external', label: 'A resource I found' },
  ],
}

const EMPTY_FORM: Record<string, unknown> = {
  name: '',
  category: '',
  title: '',
  primaryOrg: '',
  primaryOrgId: null,
  location: [],
  affiliatedOrgIds: [],
  keyConcerns: [],
  influenceType: [],
  regulatoryStance: '',
  evidenceSource: '',
  agiTimeline: '',
  aiRiskLevel: '',
  regulatoryStanceDetail: '',
  twitter: '',
  bluesky: '',
  website: '',
  fundingModel: '',
  notesHtml: '',
  notesMentions: [],
  submitterEmail: '',
  submitterRelationship: '',
  resourceTitle: '',
  resourceType: '',
  resourceAuthor: '',
  resourceAuthors: [],
  resourceUrl: '',
  resourceYear: '',
  resourceKeyArgument: '',
  _hp: '',
}

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

  // Per-form clear counter — incrementing forces a remount to reset TipTap editors
  const [clearKeys, setClearKeys] = useState<Record<FormType, number>>({
    person: 0,
    organization: 0,
    resource: 0,
  })

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

  // Stable ref to avoid recreating callbacks on every render
  const formsRef = useRef({ person: personForm, organization: orgForm, resource: resourceForm })
  formsRef.current = { person: personForm, organization: orgForm, resource: resourceForm }

  // Auto-save to localStorage (500ms debounce)
  const autoSaveForms = useRef({
    person: personForm,
    organization: orgForm,
    resource: resourceForm,
  })
  const { restore, clearDraft } = useAutoSave(autoSaveForms.current, activeTab, true)

  // Restore draft on mount
  const restoredRef = useRef(false)
  useEffect(() => {
    if (restoredRef.current) return
    restoredRef.current = true
    const result = restore()
    if (result && result.restoredCount > 0) {
      setActiveTab(result.activeTab as FormType)
    }
  }, [restore])

  // Cross-form navigation: switch tab and enter update mode
  const switchToFormInUpdateMode = useCallback(
    (formType: FormType, entityData: Partial<Entity>) => {
      setActiveTab(formType)
      setUpdateContexts((prev) => ({
        ...prev,
        [formType]: { entityId: entityData.id!, entityData },
      }))
      // Transform entity fields: snake_case → camelCase, strings → arrays
      const formData: Record<string, unknown> = { ...entityData }

      // Map snake_case DB fields to camelCase form fields
      if (formData.regulatory_stance) formData.regulatoryStance = formData.regulatory_stance
      if (formData.regulatory_stance_detail)
        formData.regulatoryStanceDetail = formData.regulatory_stance_detail
      if (formData.evidence_source) formData.evidenceSource = formData.evidence_source
      if (formData.agi_timeline) formData.agiTimeline = formData.agi_timeline
      if (formData.ai_risk_level) formData.aiRiskLevel = formData.ai_risk_level
      if (formData.primary_org) formData.primaryOrg = formData.primary_org
      if (formData.funding_model) formData.fundingModel = formData.funding_model
      if (formData.notes_html) formData.notesHtml = formData.notes_html

      // Location: single string → one Tag
      if (typeof formData.location === 'string' && formData.location) {
        formData.location = [{ id: formData.location, label: formData.location }]
      } else if (!Array.isArray(formData.location)) {
        formData.location = []
      }

      // Comma-separated strings → arrays
      if (typeof formData.influence_type === 'string' && formData.influence_type) {
        formData.influenceType = formData.influence_type.split(',').map((s: string) => s.trim())
      }
      if (typeof formData.threat_models === 'string' && formData.threat_models) {
        formData.keyConcerns = formData.threat_models.split(',').map((s: string) => s.trim())
      }
      if (!Array.isArray(formData.affiliatedOrgIds)) {
        formData.affiliatedOrgIds = []
      }
      formsRef.current[formType].reset(formData)
    },
    [],
  )

  // Cancel update mode for a specific form
  const cancelUpdate = useCallback((formType: FormType) => {
    setUpdateContexts((prev) => ({ ...prev, [formType]: null }))
    formsRef.current[formType].reset({})
  }, [])

  // Clear form and draft
  const clearForm = useCallback(
    (formType: FormType) => {
      clearDraft(formType)
      formsRef.current[formType].reset({ ...EMPTY_FORM })
      setUpdateContexts((prev) => ({ ...prev, [formType]: null }))
      setSuccessType(null)
      setClearKeys((prev) => ({ ...prev, [formType]: prev[formType] + 1 }))
    },
    [clearDraft],
  )

  // Org creation panel state
  const [orgPanelOpen, setOrgPanelOpen] = useState(false)
  const [orgPanelName, setOrgPanelName] = useState('')
  const [orgPanelTrigger, setOrgPanelTrigger] = useState<'primary' | 'parent' | 'affiliated'>(
    'primary',
  )

  const openOrgPanel = useCallback(
    (name: string, triggerType: 'primary' | 'parent' | 'affiliated') => {
      setOrgPanelName(name)
      setOrgPanelTrigger(triggerType)
      setOrgPanelOpen(true)
    },
    [],
  )

  // Existing entity sidebar state
  const [viewEntity, setViewEntity] = useState<{
    entity: FuzzySearchResult
    type: FormType
  } | null>(null)
  // Remember last viewed entity per form so the update banner can re-open it
  const lastViewedRef = useRef<Record<FormType, FuzzySearchResult | null>>({
    person: null,
    organization: null,
    resource: null,
  })
  const showEntitySidebar = useCallback((entity: FuzzySearchResult, type: FormType) => {
    lastViewedRef.current[type] = entity
    setViewEntity({ entity, type })
  }, [])

  // Success state
  const [successType, setSuccessType] = useState<FormType | null>(null)
  const [successIsUpdate, setSuccessIsUpdate] = useState(false)

  const handleSubmitSuccess = useCallback(
    (formType: FormType) => {
      setUpdateContexts((prev) => {
        setSuccessIsUpdate(!!prev[formType])
        return { ...prev, [formType]: null }
      })
      setSuccessType(formType)
      clearDraft(formType)
      formsRef.current[formType].reset({ ...EMPTY_FORM })
      // Bump clear key so TipTap editors reset on next render
      setClearKeys((prev) => ({ ...prev, [formType]: prev[formType] + 1 }))
    },
    [clearDraft],
  )

  // Show success message
  if (successType) {
    return (
      <SuccessMessage
        formType={successType}
        isUpdate={successIsUpdate}
        onSubmitAnother={() => setSuccessType(null)}
      />
    )
  }

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

        {/* Example submission */}
        <ExampleSubmission activeTab={activeTab} />

        {/* Person Form */}
        <div style={{ display: activeTab === 'person' ? 'block' : 'none' }}>
          <FormHeader
            formType="person"
            form={personForm}
            updateContext={updateContexts.person}
            onCancelUpdate={() => cancelUpdate('person')}
            onViewExisting={
              updateContexts.person && lastViewedRef.current.person
                ? () => showEntitySidebar(lastViewedRef.current.person!, 'person')
                : undefined
            }
            onClear={() => clearForm('person')}
          />
          <PersonForm
            key={`person-${clearKeys.person}`}
            form={personForm}
            updateContext={updateContexts.person}
            onOrgPanelOpen={openOrgPanel}
            onViewExisting={(entity) => showEntitySidebar(entity, 'person')}
            onEnterUpdateMode={(data) =>
              switchToFormInUpdateMode('person', data as Partial<Entity>)
            }
            onSubmitSuccess={() => handleSubmitSuccess('person')}
          />
        </div>

        {/* Organization Form */}
        <div style={{ display: activeTab === 'organization' ? 'block' : 'none' }}>
          <FormHeader
            formType="organization"
            form={orgForm}
            updateContext={updateContexts.organization}
            onCancelUpdate={() => cancelUpdate('organization')}
            onViewExisting={
              updateContexts.organization && lastViewedRef.current.organization
                ? () => showEntitySidebar(lastViewedRef.current.organization!, 'organization')
                : undefined
            }
            onClear={() => clearForm('organization')}
          />
          <OrganizationForm
            key={`org-${clearKeys.organization}`}
            form={orgForm}
            updateContext={updateContexts.organization}
            onOrgPanelOpen={openOrgPanel}
            onViewExisting={(entity) => showEntitySidebar(entity, 'organization')}
            onEnterUpdateMode={(data) =>
              switchToFormInUpdateMode('organization', data as Partial<Entity>)
            }
            onSubmitSuccess={() => handleSubmitSuccess('organization')}
          />
        </div>

        {/* Resource Form */}
        <div style={{ display: activeTab === 'resource' ? 'block' : 'none' }}>
          <FormHeader
            formType="resource"
            form={resourceForm}
            updateContext={updateContexts.resource}
            onCancelUpdate={() => cancelUpdate('resource')}
            onViewExisting={
              updateContexts.resource && lastViewedRef.current.resource
                ? () => showEntitySidebar(lastViewedRef.current.resource!, 'resource')
                : undefined
            }
            onClear={() => clearForm('resource')}
          />
          <ResourceForm
            key={`resource-${clearKeys.resource}`}
            form={resourceForm}
            updateContext={updateContexts.resource}
            onOrgPanelOpen={openOrgPanel}
            onSwitchToPersonTab={() => setActiveTab('person')}
            onViewExisting={(entity) => showEntitySidebar(entity, 'resource')}
            onEnterUpdateMode={(data) =>
              switchToFormInUpdateMode('resource', data as Partial<Entity>)
            }
            onSubmitSuccess={() => handleSubmitSuccess('resource')}
          />
        </div>

        {/* Existing Entity Sidebar */}
        {viewEntity && (
          <ExistingEntitySidebar
            entity={viewEntity.entity}
            entityType={viewEntity.type}
            onClose={() => setViewEntity(null)}
          />
        )}

        {/* Org Creation Panel */}
        <OrgCreationPanel
          isOpen={orgPanelOpen}
          onClose={() => setOrgPanelOpen(false)}
          onOrgCreated={(org) => {
            setOrgPanelOpen(false)
            // Auto-link the new org back to the field that triggered the panel
            const form = formsRef.current[activeTab]
            if (orgPanelTrigger === 'primary') {
              form.setValue('primaryOrg', org.name)
              form.setValue('primaryOrgId', org.id)
            } else if (orgPanelTrigger === 'parent') {
              form.setValue('parentOrg', org.name)
              form.setValue('parentOrgId', org.id)
            } else if (orgPanelTrigger === 'affiliated') {
              const current =
                (form.getValues('affiliatedOrgIds') as {
                  id: number | string
                  label: string
                }[]) ?? []
              form.setValue('affiliatedOrgIds', [...current, { id: org.id, label: org.name }])
            }
          }}
          initialName={orgPanelName}
          triggerType={orgPanelTrigger}
        />
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
  onViewExisting,
  onClear,
}: {
  formType: FormType
  form: UseFormReturn<Record<string, unknown>>
  updateContext: UpdateContext | null
  onCancelUpdate: () => void
  onViewExisting?: () => void
  onClear: () => void
}) {
  return (
    <div className="mb-4">
      {/* Update banner */}
      {updateContext && (
        <div className="flex items-center justify-between px-4 py-2.5 mb-4 bg-amber-50 border border-amber-200 rounded text-[13px]">
          <span>
            Updating <strong>{updateContext.entityData.name}</strong> — adjust any fields and submit
          </span>
          <div className="flex items-center gap-3">
            {onViewExisting && (
              <button
                type="button"
                onClick={onViewExisting}
                className="text-[12px] font-mono text-[#2563eb] hover:text-[#1d4ed8] underline"
              >
                View existing
              </button>
            )}
            <button
              type="button"
              onClick={onCancelUpdate}
              className="text-[12px] font-mono text-amber-700 hover:text-amber-900 underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Pill toggle + clear link */}
      <label className="font-mono text-[11px] uppercase tracking-wider text-[#555] mb-1 block">
        Who are you adding?
      </label>
      <div className="flex items-center justify-between gap-4">
        <PillToggle
          value={(form.watch('submitterRelationship') as string) ?? ''}
          onChange={(v) => form.setValue('submitterRelationship', v)}
          options={RELATIONSHIP_OPTIONS[formType]}
        />
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
