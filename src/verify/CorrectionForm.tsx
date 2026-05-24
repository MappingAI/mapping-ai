import { useState, useCallback, useEffect, useMemo } from 'react'
import { FIELD_OPTIONS } from './field-options'
import { TipTapEditor } from '../components/TipTapEditor'
import { searchEntities as searchAPI } from '../lib/api'

const BTN = 'font-mono text-[11px] uppercase tracking-wider px-3 py-1.5 rounded cursor-pointer border transition-colors'
const LABEL = 'font-mono text-[10px] uppercase tracking-wider text-[#888] mb-1'

interface Props {
  correctionType: 'field' | 'claim' | 'edge' | 'notes'
  fieldName?: string
  claimId?: string
  edgeId?: number
  originalValue: string
  fieldOptions: readonly string[] | string[]
  isMultiSelect?: boolean
  maxTags?: number
  onSubmit: (correction: Record<string, unknown>) => void
  onCancel: () => void
  isSubmitting: boolean
  existingCorrection?: Record<string, unknown> | null
}

function getErrorTypesForContext(correctionType: string): readonly string[] {
  switch (correctionType) {
    case 'edge':
      return FIELD_OPTIONS.errorTypesEdge
    case 'claim':
      return FIELD_OPTIONS.errorTypesClaim
    case 'notes':
      return FIELD_OPTIONS.errorTypesNotes
    default:
      return FIELD_OPTIONS.errorTypesField
  }
}

export function CorrectionForm({
  correctionType,
  fieldName,
  claimId,
  edgeId,
  originalValue,
  fieldOptions,
  isMultiSelect,
  onSubmit,
  onCancel,
  isSubmitting,
  existingCorrection,
}: Props) {
  const existing = existingCorrection || null
  const draftKey = useMemo(
    () => `verify-draft-${correctionType}-${fieldName || claimId || edgeId || 'notes'}`,
    [correctionType, fieldName, claimId, edgeId],
  )

  const savedDraft = useMemo(() => {
    if (existing) return null
    try {
      const raw = localStorage.getItem(draftKey)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }, [draftKey, existing])

  const existingErrorTypes =
    existing?.error_type || savedDraft?.errorTypes || ''
      ? String(existing?.error_type || savedDraft?.errorTypes || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : []

  const [selectedErrors, setSelectedErrors] = useState<Set<string>>(new Set(existingErrorTypes))
  const [otherError, setOtherError] = useState(savedDraft?.otherError || '')
  const [correctedValue, setCorrectedValue] = useState(
    existing?.corrected_value ? String(existing.corrected_value) : savedDraft?.correctedValue || '',
  )
  const [correctionNote, setCorrectionNote] = useState(
    existing?.correction_note ? String(existing.correction_note) : savedDraft?.correctionNote || '',
  )
  const [correctionNoteHtml, setCorrectionNoteHtml] = useState(
    existing?.correction_note_html ? String(existing.correction_note_html) : savedDraft?.correctionNoteHtml || '',
  )
  const [draftSaved, setDraftSaved] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      const draft = {
        errorTypes: [...selectedErrors].join(', '),
        otherError,
        correctedValue,
        correctionNote,
        correctionNoteHtml,
      }
      if (correctionNote || correctedValue || selectedErrors.size > 0) {
        localStorage.setItem(draftKey, JSON.stringify(draft))
        setDraftSaved(true)
        setTimeout(() => setDraftSaved(false), 1000)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [selectedErrors, otherError, correctedValue, correctionNote, correctionNoteHtml, draftKey])

  const searchEntities = useCallback(async (query: string) => {
    if (!query || query.length < 2) return []
    const results = await searchAPI(query)
    return results.map((r) => ({
      id: String(r.id),
      entityType: r.entity_type,
      entityId: r.id,
      label: r.name,
      detail: r.category ?? r.primary_org ?? '',
    }))
  }, [])

  const toggleError = (type: string) => {
    setSelectedErrors((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  const handleSubmit = () => {
    const allErrors = [...selectedErrors]
    if (otherError.trim()) allErrors.push(otherError.trim())

    localStorage.removeItem(draftKey)
    onSubmit({
      fieldName: fieldName || null,
      claimId: claimId || null,
      edgeId: edgeId || null,
      errorType: allErrors.length > 0 ? allErrors.join(', ') : null,
      originalValue,
      correctedValue: correctedValue || null,
      correctionNote: correctionNote || null,
      correctionNoteHtml: correctionNoteHtml || null,
    })
  }

  const contextErrors = getErrorTypesForContext(correctionType)
  const edgeTypeOptions = FIELD_OPTIONS.edgeTypes

  const title =
    correctionType === 'field'
      ? `Correct: ${fieldName?.replace(/_/g, ' ')}`
      : correctionType === 'claim'
        ? 'Correct Claim'
        : correctionType === 'edge'
          ? 'Correct Edge'
          : 'Correct Notes'

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg" style={{ fontFamily: "'EB Garamond', Georgia, serif" }}>
          {existing ? `Edit: ${title}` : title}
        </h3>
        <button onClick={onCancel} className="text-[#888] hover:text-[#333] text-xl leading-none">
          &times;
        </button>
      </div>

      {/* Original value */}
      <div className="mb-4">
        <div className={LABEL}>Current Value</div>
        <div className="font-mono text-[13px] text-[#555] p-2 bg-[#f8f8f8] rounded whitespace-pre-wrap">
          {originalValue}
        </div>
      </div>

      {/* Error type pills (multi-select) */}
      <div className="mb-4">
        <div className={LABEL}>Error Type (select all that apply)</div>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {contextErrors.map((type) => (
            <button
              key={type}
              onClick={() => toggleError(type)}
              className={`font-mono text-[10px] px-2 py-1 rounded border transition-colors cursor-pointer ${
                selectedErrors.has(type)
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-white text-[#555] border-[#ccc] hover:border-red-400'
              }`}
            >
              {type.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={otherError}
          onChange={(e) => setOtherError(e.target.value)}
          placeholder="Other error type..."
          className="w-full px-2 py-1.5 font-mono text-[12px] border border-[#ddd] rounded"
        />
      </div>

      {/* Corrected value (free-text fields like website, location, title) */}
      {correctionType === 'field' && fieldOptions.length === 0 && (
        <div className="mb-4">
          <div className={LABEL}>Corrected Value</div>
          <input
            type="text"
            value={correctedValue}
            onChange={(e) => setCorrectedValue(e.target.value)}
            placeholder="Enter the correct value..."
            className="w-full px-2 py-1.5 font-mono text-[12px] border border-[#ddd] rounded"
          />
        </div>
      )}

      {/* Corrected value (structured fields with enum options) */}
      {correctionType === 'field' && fieldOptions.length > 0 && !isMultiSelect && (
        <div className="mb-4">
          <div className={LABEL}>Corrected Value</div>
          <select
            value={correctedValue}
            onChange={(e) => setCorrectedValue(e.target.value)}
            className="w-full px-2 py-1.5 font-mono text-[12px] border border-[#ddd] rounded bg-white"
          >
            <option value="">Select correct value...</option>
            {fieldOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Corrected value (multi-select fields) */}
      {correctionType === 'field' && fieldOptions.length > 0 && isMultiSelect && (
        <div className="mb-4">
          <div className={LABEL}>Corrected Values (comma-separated)</div>
          <select
            multiple
            value={correctedValue
              .split(',')
              .map((s: string) => s.trim())
              .filter(Boolean)}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, (o) => o.value)
              setCorrectedValue(selected.join(', '))
            }}
            className="w-full px-2 py-1.5 font-mono text-[12px] border border-[#ddd] rounded bg-white min-h-[100px]"
          >
            {fieldOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Corrected value for claims */}
      {correctionType === 'claim' && (
        <div className="mb-4">
          <div className={LABEL}>What should the correct value be?</div>
          <textarea
            value={correctedValue}
            onChange={(e) => setCorrectedValue(e.target.value)}
            placeholder="Enter the correct stance, score, definition, or other value..."
            rows={2}
            className="w-full px-2 py-1.5 font-mono text-[12px] border border-[#ddd] rounded resize-y"
          />
        </div>
      )}

      {/* Corrected edge type */}
      {correctionType === 'edge' && (
        <div className="mb-4">
          <div className={LABEL}>Corrected Edge Type</div>
          <select
            value={correctedValue}
            onChange={(e) => setCorrectedValue(e.target.value)}
            className="w-full px-2 py-1.5 font-mono text-[12px] border border-[#ddd] rounded bg-white"
          >
            <option value="">Select correct type...</option>
            <option value="DELETE">Edge should be removed</option>
            {edgeTypeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Correction note with TipTap */}
      <div className="mb-4">
        <div className={LABEL}>
          {correctionType === 'notes'
            ? 'Explain what is wrong and what it should say'
            : correctionType === 'claim'
              ? 'Explain why this is incorrect'
              : 'Notes (optional)'}
        </div>
        <div className="border border-[#ddd] rounded overflow-hidden">
          <TipTapEditor
            content={correctionNoteHtml || correctionNote}
            placeholder={
              correctionType === 'notes'
                ? 'Describe what is incorrect and what the correct information is. Use @mentions to reference entities.'
                : correctionType === 'claim'
                  ? 'Why is this claim wrong? Use @mentions to reference entities.'
                  : 'Any additional context. Use @mentions to reference entities.'
            }
            searchEntities={searchEntities}
            onUpdate={(html) => {
              setCorrectionNoteHtml(html)
              const tempDiv = document.createElement('div')
              tempDiv.innerHTML = html
              setCorrectionNote(tempDiv.textContent || '')
            }}
            className="min-h-[80px] text-[13px]"
          />
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={`${BTN} bg-[#1a1a1a] text-white border-[#1a1a1a] hover:bg-[#333]`}
        >
          {isSubmitting ? 'Submitting...' : existing ? 'Update Correction' : 'Submit Correction'}
        </button>
        <button onClick={onCancel} className={`${BTN} bg-white text-[#555] border-[#ccc] hover:border-[#999]`}>
          Cancel
        </button>
        {draftSaved && <span className="font-mono text-[10px] text-[#999]">Draft saved</span>}
      </div>
      {savedDraft && !existing && <p className="mt-2 font-mono text-[10px] text-[#999]">Restored from saved draft.</p>}
    </div>
  )
}
