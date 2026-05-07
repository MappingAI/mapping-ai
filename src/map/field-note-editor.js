import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Mention from '@tiptap/extension-mention'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import tippy from 'tippy.js'

const MENTION_STYLE_ID = 'field-note-mention-styles'
function ensureMentionStyles() {
  if (document.getElementById(MENTION_STYLE_ID)) return
  const style = document.createElement('style')
  style.id = MENTION_STYLE_ID
  style.textContent = `
.tiptap-mention-list { background: var(--bg-panel, #fff); border: 1px solid var(--line, #ddd); border-radius: 6px; box-shadow: 0 4px 14px rgba(0,0,0,0.12); max-height: 240px; overflow-y: auto; z-index: 10000; min-width: 280px; max-width: 400px; padding: 4px 0; }
.mention-item { display: flex; align-items: center; gap: 8px; padding: 8px 12px; cursor: pointer; font-family: var(--mono, monospace); font-size: 12px; line-height: 1.4; }
.mention-item.active, .mention-item:hover { background: var(--bg-page, #f0f0f0); }
.mention-type { text-transform: uppercase; font-size: 9px; letter-spacing: 0.05em; padding: 2px 6px; border-radius: 3px; background: #e8f0fe; color: #2563eb; flex-shrink: 0; font-weight: 500; white-space: nowrap; }
.mention-label { font-weight: 600; color: var(--text-1, #1a1a1a); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; flex-shrink: 1; }
.mention-detail { color: var(--text-3, #888); font-size: 11px; margin-left: auto; flex-shrink: 0; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mention-empty { padding: 8px 12px; color: var(--text-3, #888); font-size: 12px; font-family: var(--mono, monospace); }
.tiptap-mention { color: var(--accent, #2563eb); font-weight: 500; }
`
  document.head.appendChild(style)
}

function searchEntitiesForMention(query) {
  if (!query || query.length < 1) return []
  if (typeof window.searchEntities === 'function') {
    const results = window.searchEntities(query)
    return [
      ...(results.people || []).map((p) => ({
        id: `person-${p.id}`,
        entityType: 'person',
        entityId: p.id,
        label: p.name,
        detail: p.title || p.category || '',
      })),
      ...(results.organizations || []).map((o) => ({
        id: `org-${o.id}`,
        entityType: 'organization',
        entityId: o.id,
        label: o.name,
        detail: o.category || '',
      })),
      ...(results.resources || []).map((r) => ({
        id: `resource-${r.id}`,
        entityType: 'resource',
        entityId: r.id,
        label: r.title || r.name,
        detail: r.resource_type || r.category || '',
      })),
    ]
  }
  return []
}

function esc(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function updateList(container, items, command) {
  container.innerHTML =
    items.length === 0
      ? '<div class="mention-empty">Keep typing to find people &amp; orgs...</div>'
      : items
          .map(
            (item, i) => `
        <div class="mention-item ${i === 0 ? 'active' : ''}"
             data-index="${i}">
          <span class="mention-type">${{ person: 'Person', organization: 'Org', resource: 'Resource' }[item.entityType] || esc(item.entityType)}</span>
          <span class="mention-label">${esc(item.label)}</span>
          <span class="mention-detail">${esc(item.detail)}</span>
        </div>
      `,
          )
          .join('')

  container.querySelectorAll('.mention-item').forEach((el) => {
    el.addEventListener('mouseenter', () => {
      container.querySelector('.mention-item.active')?.classList.remove('active')
      el.classList.add('active')
    })
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.index, 10)
      if (items[idx]) command(items[idx])
    })
  })
}

function makeSuggestion() {
  return {
    items: ({ query }) => searchEntitiesForMention(query),
    render: () => {
      let popup = null
      let component = null
      function cleanup() {
        if (popup) {
          ;(Array.isArray(popup) ? popup : [popup]).forEach((p) => {
            try {
              p.destroy()
            } catch (_e) {
              /* ignore destroy errors */
            }
          })
          popup = null
        }
        if (component?.parentNode) component.remove()
        component = null
      }
      return {
        onStart: (props) => {
          cleanup()
          component = document.createElement('div')
          component.className = 'tiptap-mention-list'
          updateList(component, props.items, props.command)
          const result = tippy(document.body, {
            getReferenceClientRect: props.clientRect,
            appendTo: () => document.body,
            content: component,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
            theme: 'mention',
            onHidden: (instance) => instance.destroy(),
          })
          popup = Array.isArray(result) ? result : [result]
        },
        onUpdate: (props) => {
          if (!component) return
          updateList(component, props.items, props.command)
          if (popup?.[0]) popup[0].setProps({ getReferenceClientRect: props.clientRect })
        },
        onKeyDown: (props) => {
          if (!component) return false
          if (props.event.key === 'Escape') {
            cleanup()
            return true
          }
          const items = component.querySelectorAll('.mention-item')
          const active = component.querySelector('.mention-item.active')
          if (props.event.key === 'ArrowDown') {
            const next = active ? active.nextElementSibling : items[0]
            if (next?.classList.contains('mention-item')) {
              active?.classList.remove('active')
              next.classList.add('active')
            }
            return true
          }
          if (props.event.key === 'ArrowUp') {
            const prev = active?.previousElementSibling
            if (prev?.classList.contains('mention-item')) {
              active.classList.remove('active')
              prev.classList.add('active')
            }
            return true
          }
          if (props.event.key === 'Enter') {
            const selected = component.querySelector('.mention-item.active')
            if (selected) {
              selected.click()
              cleanup()
            }
            return true
          }
          return false
        },
        onExit: () => cleanup(),
      }
    },
  }
}

export function createFieldNoteEditor(container) {
  ensureMentionStyles()
  const editor = new Editor({
    element: container,
    extensions: [
      StarterKit.configure({ heading: false, codeBlock: false, horizontalRule: false }),
      Link.configure({ openOnClick: false, HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' } }),
      Placeholder.configure({ placeholder: 'Add a correction, source, or context. Type @ to mention entities.' }),
      Mention.configure({
        HTMLAttributes: { class: 'tiptap-mention' },
        suggestion: { ...makeSuggestion(), allowSpaces: true },
        renderText: ({ node }) => `@${node.attrs.label}`,
      }),
    ],
    content: '',
  })

  const toolbar = document.createElement('div')
  toolbar.className = 'tiptap-toolbar'
  toolbar.innerHTML = [
    ['bold', 'B', 'Bold'],
    ['italic', 'I', 'Italic'],
    ['bulletList', '•', 'Bullet list'],
    ['orderedList', '1.', 'Numbered list'],
  ]
    .map(([cmd, label, title]) => `<button type="button" data-cmd="${cmd}" title="${title}">${label}</button>`)
    .join('')
  container.prepend(toolbar)
  toolbar.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      const cmd = btn.dataset.cmd
      if (cmd === 'bold') editor.chain().focus().toggleBold().run()
      else if (cmd === 'italic') editor.chain().focus().toggleItalic().run()
      else if (cmd === 'bulletList') editor.chain().focus().toggleBulletList().run()
      else if (cmd === 'orderedList') editor.chain().focus().toggleOrderedList().run()
    })
  })

  return editor
}
