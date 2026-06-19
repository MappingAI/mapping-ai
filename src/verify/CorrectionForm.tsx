import { useState, useCallback, useEffect, useMemo } from 'react'
import { ERROR_TYPES_FIELD, ERROR_TYPES_NOTES } from './field-options'
import { TipTapEditor, type MentionData } from '../components/TipTapEditor'
import { searchEntities as searchAPI } from '../lib/api'

const BTN = 'font-mono text-[11px] uppercase tracking-wider px-3 py-1.5 rounded cursor-pointer border transition-colors'
const LABEL = 'block font-mono text-[10px] uppercase tracking-wider text-[#888] mb-1'

export interface CorrectionPayload {
  fieldName: string | null
  errorType: string | null
  originalValue: string
  correctedValue: string | null
  correctionNote: string | null
  correctionNoteHtml: string | null
}

interface Props {
  correctionType: 'field' | 'notes'
  fieldName?: string
  originalValue: string
  fieldOptions: readonly string[]
  isMultiSelect?: boolean
  onSubmit: (payload: CorrectionPayload) => void
  onCancel: () => void
  isSubmitting: boolean
  existingCorrection?: {
    id: number
    error_type: string | null
    corrected_value: string | null
    correction_note: string | null
    correction_note_html: string | null
  } | null
}

function getErrorTypes(correctionType: 'field' | 'notes'): readonly string[] {
  return correctionType === 'notes' ? ERROR_TYPES_NOTES : ERROR_TYPES_FIELD
}

export function CorrectionForm({
  correctionType,
  fieldName,
  originalValue,
  fieldOptions,
  isMultiSelect,
  onSubmit,
  onCancel,
  isSubmitting,
  existingCorrection,
}: Props) {
  const existing = existingCorrection ?? null

  const draftKey = useMemo(() => `verify-draft-${correctionType}-${fieldName || 'notes'}`, [correctionType, fieldName])

  const savedDraft = useMemo(() => {
    if (existing) return null
    try {
      const raw = localStorage.getItem(draftKey)
      return raw ? (JSON.parse(raw) as Record<string, string>) : null
    } catch {
      return null
    }
  }, [draftKey, existing])

  const initErrors = existing?.error_type
    ? existing.error_type
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : (savedDraft?.errorTypes
        ?.split(',')
        .map((s: string) => s.trim())
        .filter(Boolean) ?? [])

  const [selectedErrors, setSelectedErrors] = useState<Set<string>>(new Set(initErrors))
  const [correctedValue, setCorrectedValue] = useState(existing?.corrected_value ?? savedDraft?.correctedValue ?? '')
  const [correctionNote, setCorrectionNote] = useState(existing?.correction_note ?? savedDraft?.correctionNote ?? '')
  const [correctionNoteHtml, setCorrectionNoteHtml] = useState(
    existing?.correction_note_html ?? savedDraft?.correctionNoteHtml ?? '',
  )
  const [draftSaved, setDraftSaved] = useState(false)

  // Autosave draft every 500ms
  useEffect(() => {
    const timer = setTimeout(() => {
      if (correctionNote || correctedValue || selectedErrors.size > 0) {
        localStorage.setItem(
          draftKey,
          JSON.stringify({
            errorTypes: [...selectedErrors].join(', '),
            correctedValue,
            correctionNote,
            correctionNoteHtml,
          }),
        )
        setDraftSaved(true)
        setTimeout(() => setDraftSaved(false), 1000)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [selectedErrors, correctedValue, correctionNote, correctionNoteHtml, draftKey])

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
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }

  const handleSubmit = () => {
    localStorage.removeItem(draftKey)
    onSubmit({
      fieldName: fieldName ?? null,
      errorType: selectedErrors.size > 0 ? [...selectedErrors].join(', ') : null,
      originalValue,
      correctedValue: correctedValue || null,
      correctionNote: correctionNote || null,
      correctionNoteHtml: correctionNoteHtml || null,
    })
  }

  const title = correctionType === 'notes' ? 'Correct Notes' : `Correct: ${(fieldName ?? '').replace(/_/g, ' ')}`
  const contextErrors = getErrorTypes(correctionType)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg italic" style={{ fontFamily: "'EB Garamond', Georgia, serif" }}>
          {existing ? `Edit: ${title}` : title}
        </h3>
        <button onClick={onCancel} className="text-[#888] hover:text-[#333] text-xl leading-none cursor-pointer">
          &times;
        </button>
      </div>

      {/* Current value */}
      <div className="mb-4">
        <span className={LABEL}>Current Value</span>
        <div className="font-mono text-[12px] text-[#555] p-2 bg-[#f8f8f8] rounded whitespace-pre-wrap">
          {originalValue || '(empty)'}
        </div>
      </div>

      {/* Error type pills */}
      <div className="mb-4">
        <span className={LABEL}>Error Type (select all that apply)</span>
        <div className="flex flex-wrap gap-1.5">
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
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Corrected value: free text */}
      {fieldOptions.length === 0 && (
        <div className="mb-4">
          <span className={LABEL}>Corrected Value</span>
          <input
            type="text"
            value={correctedValue}
            onChange={(e) => setCorrectedValue(e.target.value)}
            placeholder="Enter the correct value..."
            className="w-full px-2 py-1.5 font-mono text-[12px] border border-[#ddd] rounded"
          />
        </div>
      )}

      {/* Corrected value: single select */}
      {fieldOptions.length > 0 && !isMultiSelect && (
        <div className="mb-4">
          <span className={LABEL}>Corrected Value</span>
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

      {/* Corrected value: multi select */}
      {fieldOptions.length > 0 && isMultiSelect && (
        <div className="mb-4">
          <span className={LABEL}>Corrected Values</span>
          <select
            multiple
            value={correctedValue
              .split(',')
              .map((s) => s.trim())
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

      {/* Notes with TipTap */}
      <div className="mb-4">
        <span className={LABEL}>
          {correctionType === 'notes' ? 'Explain what is wrong and what it should say' : 'Notes (optional)'}
        </span>
        <div className="border border-[#ddd] rounded overflow-hidden">
          <TipTapEditor
            content={correctionNoteHtml || correctionNote}
            placeholder="Any additional context. Use @mentions to reference entities."
            searchEntities={searchEntities}
            onUpdate={(html: string, _mentions: MentionData[]) => {
              setCorrectionNoteHtml(html)
              const tmp = document.createElement('div')
              tmp.innerHTML = html
              setCorrectionNote(tmp.textContent || '')
            }}
          />
        </div>
      </div>

      {/* Actions */}
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
        {draftSaved && <span className="font-mono text-[10px] text-[#aaa]">Draft saved</span>}
      </div>
      {savedDraft && !existing && <p className="mt-2 font-mono text-[10px] text-[#aaa]">Restored from saved draft.</p>}
    </div>
  )
}
