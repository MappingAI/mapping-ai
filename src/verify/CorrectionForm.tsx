import { useState } from 'react'
import { FIELD_OPTIONS } from './field-options'

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
}: Props) {
  const [errorType, setErrorType] = useState<string | null>(null)
  const [correctedValue, setCorrectedValue] = useState('')
  const [correctionNote, setCorrectionNote] = useState('')

  const handleSubmit = () => {
    onSubmit({
      fieldName: fieldName || null,
      claimId: claimId || null,
      edgeId: edgeId || null,
      errorType,
      originalValue,
      correctedValue: correctedValue || null,
      correctionNote: correctionNote || null,
    })
  }

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
          {title}
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

      {/* Error type pills */}
      <div className="mb-4">
        <div className={LABEL}>Error Type</div>
        <div className="flex flex-wrap gap-1.5">
          {FIELD_OPTIONS.errorTypes.map((type) => (
            <button
              key={type}
              onClick={() => setErrorType(errorType === type ? null : type)}
              className={`font-mono text-[10px] px-2 py-1 rounded border transition-colors cursor-pointer ${
                errorType === type
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-white text-[#555] border-[#ccc] hover:border-red-400'
              }`}
            >
              {type.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

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

      {/* Corrected value for claims (free text since claims can be anything) */}
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

      {/* Correction note (always shown) */}
      <div className="mb-4">
        <div className={LABEL}>
          {correctionType === 'notes'
            ? 'Explain what is wrong and what it should say'
            : correctionType === 'claim'
              ? 'Explain why this is incorrect'
              : 'Notes (optional)'}
        </div>
        <textarea
          value={correctionNote}
          onChange={(e) => setCorrectionNote(e.target.value)}
          placeholder={
            correctionType === 'notes'
              ? 'Describe what is incorrect in the notes and what the correct information is...'
              : correctionType === 'claim'
                ? 'Why is this claim wrong? What does the source actually say?...'
                : 'Any additional context about this correction...'
          }
          rows={correctionType === 'notes' || correctionType === 'claim' ? 4 : 3}
          className="w-full px-2 py-1.5 font-mono text-[12px] border border-[#ddd] rounded resize-y"
        />
      </div>

      {/* Submit */}
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={`${BTN} bg-[#1a1a1a] text-white border-[#1a1a1a] hover:bg-[#333]`}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Correction'}
        </button>
        <button onClick={onCancel} className={`${BTN} bg-white text-[#555] border-[#ccc] hover:border-[#999]`}>
          Cancel
        </button>
      </div>
    </div>
  )
}
