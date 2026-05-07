import { useCallback } from 'react'
import { getVoterId } from '../shared/field-feedback-utils'

interface Props {
  entityId: number
  field: string
  entityName?: string
  fieldLabel?: string
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function FieldNoteButton({ entityId, field, entityName, fieldLabel }: Props) {
  const openModal = useCallback(() => {
    const existing = document.querySelector('.field-note-modal')
    if (existing) existing.remove()

    const label = fieldLabel || field.replace(/_/g, ' ')
    const name = entityName || 'this entity'

    const modal = document.createElement('div')
    modal.className = 'field-note-modal'
    modal.innerHTML =
      '<div class="field-note-modal-card">' +
      `<div class="field-note-modal-header"><span>Note on <strong>${escHtml(label)}</strong> — ${escHtml(name)}</span><button class="field-note-modal-close">&times;</button></div>` +
      '<div class="field-note-modal-hint">Type @ to mention people, orgs, or resources. Use toolbar for formatting. Cmd+Enter to submit.</div>' +
      '<div class="field-note-editor-wrap"><div class="field-note-tiptap"></div></div>' +
      '<div class="field-note-modal-footer"><button class="field-note-submit">Submit</button></div>' +
      '</div>'
    document.body.appendChild(modal)

    const editorContainer = modal.querySelector('.field-note-tiptap') as HTMLElement
    const submitBtn = modal.querySelector('.field-note-submit') as HTMLButtonElement
    const closeBtn = modal.querySelector('.field-note-modal-close') as HTMLButtonElement
    let tiptapEditor: {
      getText: () => string
      getHTML: () => string
      state: {
        doc: { descendants: (cb: (node: { type: { name: string }; attrs: Record<string, unknown> }) => void) => void }
      }
      destroy: () => void
    } | null = null

    const escHandler = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') close()
    }
    function close() {
      document.removeEventListener('keydown', escHandler)
      if (tiptapEditor) tiptapEditor.destroy()
      modal.remove()
    }
    closeBtn.addEventListener('click', close)
    modal.addEventListener('click', (ev) => {
      if (ev.target === modal) close()
    })
    document.addEventListener('keydown', escHandler)

    function getEditorContent() {
      if (tiptapEditor) {
        const text = tiptapEditor.getText().trim()
        const html = tiptapEditor.getHTML()
        const mentions: Array<{ type: unknown; id: unknown; label: unknown }> = []
        tiptapEditor.state.doc.descendants((node) => {
          if (node.type.name === 'mention') {
            mentions.push({
              type: node.attrs.entityType || node.attrs['data-entity-type'],
              id: node.attrs.entityId || node.attrs['data-entity-id'],
              label: node.attrs.label,
            })
          }
        })
        return { text, html, mentions }
      }
      const ta = modal.querySelector('textarea') as HTMLTextAreaElement | null
      return { text: ta ? ta.value.trim() : '', html: null, mentions: [] }
    }

    function doSubmit() {
      const { text, html, mentions } = getEditorContent()
      if (!text) return
      submitBtn.disabled = true
      fetch('/api/field-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityId,
          fieldName: field,
          note: text,
          noteHtml: html,
          noteMentions: mentions.length > 0 ? mentions : undefined,
          voterId: getVoterId(),
        }),
      })
        .then((r) => {
          if (r.ok) close()
          else submitBtn.disabled = false
        })
        .catch(() => {
          submitBtn.disabled = false
        })
    }

    submitBtn.addEventListener('click', (ev) => {
      ev.stopPropagation()
      doSubmit()
    })

    import('../map/field-note-editor.js')
      .then(({ createFieldNoteEditor }: { createFieldNoteEditor: (el: HTMLElement) => typeof tiptapEditor }) => {
        tiptapEditor = createFieldNoteEditor(editorContainer)
        setTimeout(() => {
          const pm = editorContainer.querySelector('.ProseMirror') as HTMLElement | null
          if (pm) {
            pm.focus()
            pm.addEventListener('keydown', (ev: KeyboardEvent) => {
              if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) {
                ev.preventDefault()
                doSubmit()
              }
            })
          }
        }, 50)
      })
      .catch(() => {
        editorContainer.innerHTML =
          '<textarea class="field-note-textarea" placeholder="Add a correction, source, or context..." rows="3"></textarea>'
        const ta = editorContainer.querySelector('textarea') as HTMLTextAreaElement
        ta.focus()
        ta.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) {
            ev.preventDefault()
            doSubmit()
          }
        })
      })
  }, [entityId, field, entityName, fieldLabel])

  return (
    <button className="field-note-btn" title="Add a note or correction" onClick={openModal}>
      &#x270E;
    </button>
  )
}
