import { useCallback } from 'react'
import { openFieldNoteModal } from '../shared/field-note-modal'

interface Props {
  entityId: number
  field: string
  entityName?: string
  fieldLabel?: string
}

export function FieldNoteButton({ entityId, field, entityName, fieldLabel }: Props) {
  const handleClick = useCallback(() => {
    openFieldNoteModal({ entityId, field, entityName, fieldLabel })
  }, [entityId, field, entityName, fieldLabel])

  return (
    <button className="field-note-btn" title="Add a note or correction" onClick={handleClick}>
      &#x270E;
    </button>
  )
}
