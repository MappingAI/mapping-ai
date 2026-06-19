import { useState } from 'react'
import { PERSON_FIELDS, ORG_FIELDS, ERROR_TYPES_FIELD } from './field-options'
import type { Task, FlagCorrection } from './api'

interface Props {
  task: Task
  onVote: (vote: 1 | -1 | 0, correction?: FlagCorrection) => void
  isSubmitting: boolean
}

const LABEL = 'font-mono text-[10px] uppercase tracking-wider text-[#888]'
const BTN = 'font-mono text-[11px] uppercase tracking-wider px-4 py-2 rounded border cursor-pointer transition-colors'

function getFieldDef(entityType: string, fieldName: string) {
  const list = entityType === 'person' ? PERSON_FIELDS : ORG_FIELDS
  return list.find((f) => f.key === fieldName)
}

function humanizeField(fieldName: string): string {
  return fieldName
    .replace(/^belief_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function VerifyTask({ task, onVote, isSubmitting }: Props) {
  const [showFlag, setShowFlag] = useState(false)
  const [selectedError, setSelectedError] = useState<string | null>(null)
  const [correctedValue, setCorrectedValue] = useState('')

  const fieldDef = getFieldDef(task.entityType, task.fieldName)
  const fieldLabel = fieldDef?.label ?? humanizeField(task.fieldName)

  const handleConfirm = () => {
    setShowFlag(false)
    onVote(1)
  }

  const handleSkip = () => {
    setShowFlag(false)
    onVote(0)
  }

  const handleFlagToggle = () => {
    setShowFlag((s) => !s)
    setSelectedError(null)
    setCorrectedValue('')
  }

  const handleSubmitFlag = () => {
    if (!selectedError) return
    onVote(-1, { errorType: selectedError, correctedValue })
  }

  return (
    <div className="max-w-lg w-full mx-auto">
      {/* Entity header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-[10px] uppercase tracking-wider text-white bg-[#555] px-1.5 py-0.5 rounded">
            {task.entityType}
          </span>
          {task.category && <span className="font-mono text-[10px] text-[#888]">{task.category}</span>}
        </div>
        <h2
          className="text-[28px] leading-tight text-[#1a1a1a] mb-0.5"
          style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
        >
          {task.name}
        </h2>
        {task.primaryOrg && <p className="font-mono text-[12px] text-[#888]">{task.primaryOrg}</p>}
      </div>

      {/* Field + value */}
      <div className="border-t border-b border-[#e0e0e0] py-6 mb-6">
        <p className={`${LABEL} mb-2`}>{fieldLabel}</p>
        <p className="text-[22px] text-[#1a1a1a] leading-snug" style={{ fontFamily: "'EB Garamond', Georgia, serif" }}>
          {task.fieldValue}
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={handleConfirm}
          disabled={isSubmitting}
          className={`${BTN} bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 disabled:opacity-50`}
        >
          ✓ Confirm
        </button>
        <button
          onClick={handleFlagToggle}
          disabled={isSubmitting}
          className={`${BTN} ${
            showFlag
              ? 'bg-red-600 text-white border-red-600'
              : 'bg-white text-red-600 border-red-300 hover:border-red-500'
          } disabled:opacity-50`}
        >
          ✗ Flag
        </button>
        <button
          onClick={handleSkip}
          disabled={isSubmitting}
          className={`${BTN} bg-white text-[#888] border-[#ccc] hover:border-[#999] disabled:opacity-50`}
        >
          → Skip
        </button>
      </div>

      {/* Flag expand */}
      {showFlag && (
        <div className="border border-red-200 rounded-lg p-4 bg-red-50">
          <p className={`${LABEL} mb-2`}>What's wrong?</p>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {ERROR_TYPES_FIELD.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedError(selectedError === type ? null : type)}
                className={`font-mono text-[10px] px-2.5 py-1 rounded border cursor-pointer transition-colors ${
                  selectedError === type
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white text-[#555] border-[#ccc] hover:border-red-400'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Corrected value */}
          <p className={`${LABEL} mb-1`}>
            {fieldDef?.options && fieldDef.multiSelect
              ? 'Corrected values (optional, select all that apply)'
              : 'Corrected value (optional)'}
          </p>
          {fieldDef?.options && fieldDef.multiSelect ? (
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
              className="w-full px-2 py-1.5 font-mono text-[12px] border border-[#ddd] rounded bg-white mb-3 min-h-[100px]"
            >
              {fieldDef.options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : fieldDef?.options ? (
            <select
              value={correctedValue}
              onChange={(e) => setCorrectedValue(e.target.value)}
              className="w-full px-2 py-1.5 font-mono text-[12px] border border-[#ddd] rounded bg-white mb-3"
            >
              <option value="">Select correct value...</option>
              {fieldDef.options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={correctedValue}
              onChange={(e) => setCorrectedValue(e.target.value)}
              placeholder="What should it say?"
              className="w-full px-2 py-1.5 font-mono text-[12px] border border-[#ddd] rounded mb-3"
            />
          )}

          <button
            onClick={handleSubmitFlag}
            disabled={!selectedError || isSubmitting}
            className={`${BTN} bg-red-600 text-white border-red-600 hover:bg-red-700 disabled:opacity-40`}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Flag'}
          </button>
        </div>
      )}
    </div>
  )
}
