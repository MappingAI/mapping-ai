interface SuccessMessageProps {
  formType: 'person' | 'organization' | 'resource'
  isUpdate: boolean
  onSubmitAnother: () => void
}

const TYPE_LABELS: Record<string, string> = {
  person: 'person',
  organization: 'organization',
  resource: 'resource',
}

/**
 * Post-submission success overlay.
 * Shows a thank-you message with type-specific copy and a
 * "Submit another" button to reset the form.
 */
export function SuccessMessage({ formType, isUpdate, onSubmitAnother }: SuccessMessageProps) {
  const typeLabel = TYPE_LABELS[formType] || formType

  return (
    <div className="w-full py-16 px-6 flex flex-col items-center justify-center text-center">
      <h2
        className="text-[28px] tracking-[-0.02em] text-[#1a1a1a] mb-4"
        style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
      >
        Thank you!
      </h2>
      <p className="font-mono text-[13px] text-[#555] leading-relaxed max-w-[400px] mb-8">
        {isUpdate
          ? `Your update to this ${typeLabel} has been submitted. We'll review the changes shortly.`
          : `Your ${typeLabel} submission has been received. We'll review it and add it to the map soon.`}
      </p>
      <button
        type="button"
        onClick={onSubmitAnother}
        className="px-5 py-2.5 font-mono text-[13px] bg-[#1a1a1a] text-white border border-[#1a1a1a] rounded cursor-pointer transition-colors hover:bg-[#333]"
      >
        Submit another
      </button>
    </div>
  )
}
