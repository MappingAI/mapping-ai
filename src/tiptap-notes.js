/**
 * TipTap Notes Editor with @mentions
 * Bundled by esbuild into assets/js/tiptap-notes.js
 */
import { Editor, Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Mention from '@tiptap/extension-mention';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import tippy from 'tippy.js';

// Custom extension for Cmd+K link shortcut
const LinkShortcut = Extension.create({
  name: 'linkShortcut',
  addKeyboardShortcuts() {
    return {
      'Mod-k': ({ editor }) => {
        // Find the toolbar associated with this editor
        const editorEl = editor.options.element;
        const toolbar = editorEl?.previousElementSibling;
        if (toolbar?.classList.contains('tiptap-toolbar')) {
          showLinkPopover(editor, toolbar);
        }
        return true;
      },
    };
  },
});

// Use the parent page's searchEntities if available (preloaded cache), else fall back to API
function searchEntitiesForMention(query) {
  if (!query || query.length < 1) return [];
  // Try parent page's cached search (instant)
  if (typeof window.searchEntities === 'function') {
    const results = window.searchEntities(query);
    return [
      ...(results.people || []).map(p => ({ id: `person-${p.id}`, entityType: 'person', entityId: p.id, label: p.name, detail: p.title || p.category || '' })),
      ...(results.organizations || []).map(o => ({ id: `org-${o.id}`, entityType: 'organization', entityId: o.id, label: o.name, detail: o.category || '' })),
      ...(results.resources || []).map(r => ({ id: `resource-${r.id}`, entityType: 'resource', entityId: r.id, label: r.title, detail: r.resource_type || r.category || '' })),
    ];
  }
  // Fallback: nothing available yet
  return [];
}

// Make searchEntities globally accessible for TipTap
window._tiptapSearch = searchEntitiesForMention;

// Create suggestion popup
function suggestion() {
  return {
    items: ({ query }) => {
      return searchEntitiesForMention(query);
    },
    render: () => {
      let popup = null;
      let component = null;

      function cleanup() {
        if (popup) {
          // tippy() returns an array — destroy all instances
          if (Array.isArray(popup)) {
            popup.forEach(p => { try { p.destroy(); } catch(e) {} });
          } else if (popup.destroy) {
            try { popup.destroy(); } catch(e) {}
          }
          popup = null;
        }
        if (component && component.parentNode) {
          component.remove();
        }
        component = null;
      }

      return {
        onStart: (props) => {
          cleanup(); // destroy any leftover popup
          component = document.createElement('div');
          component.className = 'tiptap-mention-list';
          updateList(component, props.items, props.command);

          const result = tippy(document.body, {
            getReferenceClientRect: props.clientRect,
            appendTo: () => document.body,
            content: component,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
            theme: 'mention',
            onHidden: (instance) => { instance.destroy(); },
          });
          popup = Array.isArray(result) ? result : [result];
        },
        onUpdate: (props) => {
          if (!component) return;
          updateList(component, props.items, props.command);
          if (popup && popup[0]) {
            popup[0].setProps({ getReferenceClientRect: props.clientRect });
          }
        },
        onKeyDown: (props) => {
          if (!component) return false;
          if (props.event.key === 'Escape') {
            cleanup();
            return true;
          }
          const items = component.querySelectorAll('.mention-item');
          const active = component.querySelector('.mention-item.active');
          if (props.event.key === 'ArrowDown') {
            const next = active ? active.nextElementSibling : items[0];
            if (next && next.classList.contains('mention-item')) {
              active?.classList.remove('active'); next.classList.add('active');
            }
            return true;
          }
          if (props.event.key === 'ArrowUp') {
            const prev = active?.previousElementSibling;
            if (prev && prev.classList.contains('mention-item')) {
              active.classList.remove('active'); prev.classList.add('active');
            }
            return true;
          }
          if (props.event.key === 'Enter') {
            const selected = component.querySelector('.mention-item.active');
            if (selected) { selected.click(); cleanup(); }
            return true;
          }
          return false;
        },
        onExit: () => {
          cleanup();
        },
      };
    },
  };
}

function updateList(container, items, command) {
  container.innerHTML = items.length === 0
    ? '<div class="mention-empty">Keep typing to find people &amp; orgs...</div>'
    : items.map((item, i) => `
        <div class="mention-item ${i === 0 ? 'active' : ''}"
             data-index="${i}"
             data-id="${item.id}"
             data-entity-type="${item.entityType}"
             data-entity-id="${item.entityId}"
             data-label="${item.label}">
          <span class="mention-type">${item.entityType}</span>
          <span class="mention-label">${item.label}</span>
          <span class="mention-detail">${item.detail}</span>
        </div>
      `).join('');

  container.querySelectorAll('.mention-item').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.index);
      const item = items[idx];
      // Insert mention directly
      command({ ...item, id: item.id, label: item.label, relationshipType: 'mentioned' });
    });
    el.addEventListener('mouseenter', () => {
      container.querySelector('.mention-item.active')?.classList.remove('active');
      el.classList.add('active');
    });
  });
}

// Inline link popover (replaces browser prompt)
function showLinkPopover(editor, toolbar) {
  // Remove existing popover
  toolbar.querySelector('.link-popover')?.remove();

  if (editor.isActive('link')) {
    // Already has a link — show edit/remove popover
    const currentUrl = editor.getAttributes('link').href || '';
    const popover = document.createElement('div');
    popover.className = 'link-popover';
    popover.innerHTML = `
      <input type="url" value="${currentUrl}" placeholder="https://...">
      <button class="primary" data-action="save">Save</button>
      <button class="remove" data-action="remove">Remove</button>
      <button data-action="cancel">Cancel</button>
    `;
    setupPopoverEvents(popover, editor);
    toolbar.style.position = 'relative';
    toolbar.appendChild(popover);
    popover.querySelector('input').focus();
    popover.querySelector('input').select();
  } else {
    // No link — show add popover
    const popover = document.createElement('div');
    popover.className = 'link-popover';
    popover.innerHTML = `
      <input type="url" placeholder="https://example.com" value="">
      <button class="primary" data-action="save">Add link</button>
      <button data-action="cancel">Cancel</button>
    `;
    setupPopoverEvents(popover, editor);
    toolbar.style.position = 'relative';
    toolbar.appendChild(popover);
    const input = popover.querySelector('input');
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }
}

function setupPopoverEvents(popover, editor) {
  const input = popover.querySelector('input');
  popover.querySelector('[data-action="save"]').addEventListener('click', () => {
    const url = input.value.trim();
    if (url) {
      editor.chain().focus().setLink({ href: url, target: '_blank' }).run();
    }
    popover.remove();
  });
  popover.querySelector('[data-action="cancel"]')?.addEventListener('click', () => {
    editor.chain().focus().run();
    popover.remove();
  });
  popover.querySelector('[data-action="remove"]')?.addEventListener('click', () => {
    editor.chain().focus().unsetLink().run();
    popover.remove();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      popover.querySelector('[data-action="save"]').click();
    }
    if (e.key === 'Escape') {
      popover.querySelector('[data-action="cancel"]')?.click();
    }
  });
  // Close on outside click
  setTimeout(() => {
    const handler = (e) => {
      if (!popover.contains(e.target)) { popover.remove(); document.removeEventListener('mousedown', handler); }
    };
    document.addEventListener('mousedown', handler);
  }, 10);
}

// Floating link bubble when clicking on a link in the editor
function setupLinkClickHandler(editor, container, toolbar) {
  let linkBubble = null;

  function removeBubble() {
    if (linkBubble) { linkBubble.remove(); linkBubble = null; }
  }

  container.addEventListener('click', (e) => {
    removeBubble();
    const linkEl = e.target.closest('a');
    if (!linkEl) return;

    const href = linkEl.getAttribute('href') || '';
    e.preventDefault();

    // Cmd+click or Ctrl+click opens directly in new tab
    if (e.metaKey || e.ctrlKey) {
      window.open(href, '_blank', 'noopener');
      return;
    }

    const rect = linkEl.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    linkBubble = document.createElement('div');
    linkBubble.className = 'link-bubble';
    linkBubble.innerHTML = `
      <a href="${href}" target="_blank" rel="noopener" class="link-bubble-url">${href.length > 40 ? href.slice(0, 40) + '...' : href}</a>
      <button data-action="open" title="Open in new tab">Open ↗</button>
      <button data-action="edit" title="Edit link">Edit</button>
      <button data-action="remove" title="Remove link">Remove</button>
    `;

    // Position below the clicked link
    linkBubble.style.position = 'absolute';
    linkBubble.style.left = (rect.left - containerRect.left) + 'px';
    linkBubble.style.top = (rect.bottom - containerRect.top + 4) + 'px';
    container.style.position = 'relative';
    container.appendChild(linkBubble);

    linkBubble.querySelector('[data-action="open"]').addEventListener('click', () => {
      window.open(href, '_blank', 'noopener');
      removeBubble();
    });
    linkBubble.querySelector('[data-action="edit"]').addEventListener('click', () => {
      removeBubble();
      // Place cursor on the link text then show popover
      showLinkPopover(editor, toolbar);
    });

    linkBubble.querySelector('[data-action="remove"]').addEventListener('click', () => {
      editor.chain().focus().unsetLink().run();
      removeBubble();
    });

    // Close on outside click
    setTimeout(() => {
      const handler = (ev) => {
        if (!linkBubble?.contains(ev.target)) { removeBubble(); document.removeEventListener('mousedown', handler); }
      };
      document.addEventListener('mousedown', handler);
    }, 10);
  });

  // Clean up on editor content changes
  editor.on('selectionUpdate', removeBubble);
}

// Create toolbar element
function createToolbar(editor, container) {
  const toolbar = document.createElement('div');
  toolbar.className = 'tiptap-toolbar';

  const buttons = [
    { label: 'B', command: () => editor.chain().focus().toggleBold().run(), active: () => editor.isActive('bold'), title: 'Bold' },
    { label: 'I', command: () => editor.chain().focus().toggleItalic().run(), active: () => editor.isActive('italic'), title: 'Italic', style: 'font-style:italic;' },
    { label: '—', command: () => editor.chain().focus().toggleStrike().run(), active: () => editor.isActive('strike'), title: 'Strikethrough' },
    { type: 'sep' },
    { label: '•', command: () => editor.chain().focus().toggleBulletList().run(), active: () => editor.isActive('bulletList'), title: 'Bullet list' },
    { label: '1.', command: () => editor.chain().focus().toggleOrderedList().run(), active: () => editor.isActive('orderedList'), title: 'Numbered list' },
    { type: 'sep' },
    { label: '🔗', command: () => showLinkPopover(editor, toolbar), active: () => editor.isActive('link'), title: 'Link (Cmd+K)' },
  ];

  buttons.forEach(btn => {
    if (btn.type === 'sep') {
      const sep = document.createElement('span');
      sep.className = 'tiptap-toolbar-sep';
      toolbar.appendChild(sep);
      return;
    }
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'tiptap-toolbar-btn';
    el.innerHTML = btn.label;
    el.title = btn.title;
    if (btn.style) el.setAttribute('style', btn.style);
    el.addEventListener('click', (e) => { e.preventDefault(); btn.command(); });
    toolbar.appendChild(el);
  });

  // Update active states on editor changes
  editor.on('selectionUpdate', () => {
    toolbar.querySelectorAll('.tiptap-toolbar-btn').forEach((el, i) => {
      const btn = buttons.filter(b => !b.type)[i];
      if (btn) el.classList.toggle('active', btn.active());
    });
  });
  editor.on('update', () => {
    toolbar.querySelectorAll('.tiptap-toolbar-btn').forEach((el, i) => {
      const btn = buttons.filter(b => !b.type)[i];
      if (btn) el.classList.toggle('active', btn.active());
    });
  });

  container.parentNode.insertBefore(toolbar, container);
  return toolbar;
}

// Initialize TipTap on all .tiptap-notes containers
function initTipTapEditors() {
  document.querySelectorAll('.tiptap-notes').forEach(container => {
    const hiddenHtml = container.parentElement.querySelector('input[name="notesHtml"]');
    const hiddenMentions = container.parentElement.querySelector('input[name="notesMentions"]');
    const plainTextarea = container.parentElement.querySelector('textarea[name="notes"]');

    const editor = new Editor({
      element: container,
      extensions: [
        StarterKit.configure({
          heading: false,
          codeBlock: false,
          horizontalRule: false,
        }),
        Link.configure({
          openOnClick: false,
          HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
        }),
        LinkShortcut,
        Placeholder.configure({
          placeholder: 'Add notes... Type @ to mention people, orgs, or resources',
        }),
        Mention.configure({
          HTMLAttributes: { class: 'tiptap-mention' },
          suggestion: suggestion(),
          renderText: ({ node }) => `@${node.attrs.label}`,
        }),
      ],
      content: '',
      onUpdate: ({ editor }) => {
        // Update hidden fields
        if (hiddenHtml) hiddenHtml.value = editor.getHTML();
        if (plainTextarea) plainTextarea.value = editor.getText();

        // Extract mentions
        if (hiddenMentions) {
          const mentions = [];
          editor.state.doc.descendants((node) => {
            if (node.type.name === 'mention') {
              mentions.push({
                type: node.attrs['data-entity-type'] || node.attrs.entityType,
                id: node.attrs['data-entity-id'] || node.attrs.entityId,
                label: node.attrs.label,
                relationship: node.attrs.relationshipType || 'mentioned',
              });
            }
          });
          hiddenMentions.value = JSON.stringify(mentions);
        }
      },
    });

    const toolbar = createToolbar(editor, container);
    setupLinkClickHandler(editor, container, toolbar);
    container._editor = editor;
  });
}

// Auto-init on DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTipTapEditors);
} else {
  initTipTapEditors();
}

// Export for manual init
window.initTipTapEditors = initTipTapEditors;
