import { useCallback, useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Mention from '@tiptap/extension-mention'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import tippy, { type Instance as TippyInstance } from 'tippy.js'

export interface MentionData {
  id: string
  entityType: string
  entityId: number
  label: string
  relationshipType: string
}

interface MentionItem {
  id: string
  entityType: string
  entityId: number
  label: string
  detail: string
}

interface TipTapEditorProps {
  content?: string
  placeholder?: string
  searchEntities: (query: string) => MentionItem[] | Promise<MentionItem[]>
  onUpdate?: (html: string, mentions: MentionData[]) => void
  disabled?: boolean
  className?: string
}

/** Extract mention data from the editor's JSON content. */
function extractMentions(editor: ReturnType<typeof useEditor>): MentionData[] {
  if (!editor) return []
  const mentions: MentionData[] = []
  editor.state.doc.descendants((node) => {
    if (node.type.name === 'mention' && node.attrs) {
      mentions.push({
        id: node.attrs.id as string,
        entityType: node.attrs.entityType as string,
        entityId: node.attrs.entityId as number,
        label: node.attrs.label as string,
        relationshipType: (node.attrs.relationshipType as string) || 'mentioned',
      })
    }
  })
  return mentions
}

/** Create the mention suggestion plugin config. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createSuggestion(searchFn: (query: string) => MentionItem[] | Promise<MentionItem[]>): any {
  return {
    items: ({ query }: { query: string }) => searchFn(query),
    render: () => {
      let popup: TippyInstance[] | null = null
      let component: HTMLDivElement | null = null

      function cleanup() {
        popup?.forEach((p) => { try { p.destroy() } catch { /* ignore */ } })
        popup = null
        component?.remove()
        component = null
      }

      function updateList(
        container: HTMLDivElement,
        items: MentionItem[],
        command: (item: Record<string, unknown>) => void,
      ) {
        const TYPE_LABELS: Record<string, string> = {
          person: 'Person',
          organization: 'Org',
          resource: 'Resource',
        }
        container.innerHTML =
          items.length === 0
            ? '<div class="mention-empty">Keep typing to find people & orgs...</div>'
            : items
                .map(
                  (item, i) => `
                <div class="mention-item ${i === 0 ? 'active' : ''}"
                     data-index="${i}">
                  <span class="mention-type">${TYPE_LABELS[item.entityType] ?? item.entityType}</span>
                  <span class="mention-label">${item.label}</span>
                  <span class="mention-detail">${item.detail}</span>
                </div>`,
                )
                .join('')

        container.querySelectorAll<HTMLElement>('.mention-item').forEach((el) => {
          el.addEventListener('click', () => {
            const idx = parseInt(el.dataset.index ?? '0')
            const item = items[idx]
            if (item) command({ ...item, label: item.label, relationshipType: 'mentioned' })
          })
          el.addEventListener('mouseenter', () => {
            container.querySelector('.mention-item.active')?.classList.remove('active')
            el.classList.add('active')
          })
        })
      }

      return {
        onStart: (props: { clientRect: (() => DOMRect | null) | null | undefined; items: MentionItem[]; command: (item: Record<string, unknown>) => void }) => {
          cleanup()
          component = document.createElement('div')
          component.className = 'tiptap-mention-list'
          updateList(component, props.items, props.command)

          const result = tippy(document.body as Element, {
            getReferenceClientRect: (props.clientRect as (() => DOMRect)) ?? undefined,
            appendTo: () => document.body,
            content: component,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
          })
          popup = Array.isArray(result) ? result : [result]
        },
        onUpdate: (props: { clientRect: (() => DOMRect | null) | null | undefined; items: MentionItem[]; command: (item: Record<string, unknown>) => void }) => {
          if (!component) return
          updateList(component, props.items, props.command)
          popup?.[0]?.setProps({ getReferenceClientRect: (props.clientRect as (() => DOMRect)) ?? undefined })
        },
        onKeyDown: (props: { event: KeyboardEvent }) => {
          if (!component) return false
          if (props.event.key === 'Escape') { cleanup(); return true }

          const items = component.querySelectorAll<HTMLElement>('.mention-item')
          const active = component.querySelector<HTMLElement>('.mention-item.active')

          if (props.event.key === 'ArrowDown') {
            const next = active ? active.nextElementSibling as HTMLElement | null : items[0]
            if (next?.classList.contains('mention-item')) {
              active?.classList.remove('active')
              next.classList.add('active')
            }
            return true
          }
          if (props.event.key === 'ArrowUp') {
            const prev = active?.previousElementSibling as HTMLElement | null
            if (prev?.classList.contains('mention-item')) {
              active?.classList.remove('active')
              prev.classList.add('active')
            }
            return true
          }
          if (props.event.key === 'Enter') {
            active?.click()
            return true
          }
          return false
        },
        onExit: () => cleanup(),
      }
    },
  }
}

/**
 * React TipTap rich text editor with @mentions.
 * Features: bold/italic/strike/lists/blockquote, @mention entity search,
 * link insertion, placeholder text.
 */
export function TipTapEditor({
  content = '',
  placeholder = 'Add notes...',
  searchEntities,
  onUpdate,
  disabled = false,
  className = '',
}: TipTapEditorProps) {
  const [linkUrl, setLinkUrl] = useState('')
  const [showLinkPopover, setShowLinkPopover] = useState(false)
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate
  const searchEntitiesRef = useRef(searchEntities)
  searchEntitiesRef.current = searchEntities

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder }),
      Mention.configure({
        HTMLAttributes: { class: 'mention' },
        suggestion: createSuggestion((q) => searchEntitiesRef.current(q)),
      }),
    ],
    content,
    editable: !disabled,
    immediatelyRender: true,
    onUpdate: ({ editor: e }) => {
      const html = e.getHTML()
      const mentions = extractMentions(e)
      onUpdateRef.current?.(html, mentions)
    },
  })

  // Cmd+K for link
  useEffect(() => {
    if (!editor) return
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        const currentHref = editor.getAttributes('link').href as string | undefined
        setLinkUrl(currentHref ?? '')
        setShowLinkPopover(true)
      }
    }
    const el = editor.view?.dom
    el?.addEventListener('keydown', handler as EventListener)
    return () => el?.removeEventListener('keydown', handler as EventListener)
  }, [editor])

  const applyLink = useCallback(() => {
    if (!editor) return
    if (linkUrl) {
      const url = linkUrl.match(/^https?:\/\//) ? linkUrl : `https://${linkUrl}`
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    } else {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    }
    setShowLinkPopover(false)
    setLinkUrl('')
  }, [editor, linkUrl])

  if (!editor) return null

  return (
    <div className={`border border-[#ddd] rounded overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1 bg-[#fafafa] border-b border-[#eee] relative">
        <ToolbarButton
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          label="Bold"
        >
          B
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          label="Italic"
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          label="Bullet list"
        >
          •
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          label="Numbered list"
        >
          1.
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('link')}
          onClick={() => {
            const currentHref = editor.getAttributes('link').href as string | undefined
            setLinkUrl(currentHref ?? '')
            setShowLinkPopover(!showLinkPopover)
          }}
          label="Link"
        >
          🔗
        </ToolbarButton>

        {/* Link popover */}
        {showLinkPopover && (
          <div className="absolute top-full left-0 mt-1 z-50 flex items-center gap-1 bg-white border border-[#ddd] rounded shadow-lg px-2 py-1.5">
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') applyLink(); if (e.key === 'Escape') setShowLinkPopover(false) }}
              placeholder="https://..."
              className="px-2 py-1 text-[12px] font-mono border border-[#eee] rounded w-[200px]"
              autoFocus
            />
            <button
              onClick={applyLink}
              className="px-2 py-1 text-[11px] font-mono bg-[#1a1a1a] text-white rounded"
            >
              {linkUrl ? 'Save' : 'Remove'}
            </button>
            <button
              onClick={() => setShowLinkPopover(false)}
              className="px-2 py-1 text-[11px] font-mono text-[#888] hover:text-[#1a1a1a]"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Editor content */}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none px-3 py-2 min-h-[100px] font-serif text-[14px] leading-relaxed [&_.mention]:text-[#2563eb] [&_.mention]:font-semibold [&_.mention]:cursor-default [&_.ProseMirror]:outline-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-[#aaa] [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0"
      />
    </div>
  )
}

function ToolbarButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`px-1.5 py-0.5 text-[12px] font-mono rounded transition-colors ${
        active ? 'bg-[#e0e0e0] text-[#1a1a1a]' : 'text-[#888] hover:text-[#1a1a1a] hover:bg-[#f0f0f0]'
      }`}
    >
      {children}
    </button>
  )
}
