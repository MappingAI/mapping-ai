---
title: Inline org panel rich field parity and post-submit suggestion bug
date: "2026-04-04"
category: ui-bugs
module: contribute-forms
problem_type: ui_bug
component: frontend_stimulus
symptoms:
  - "Side panel used plain inputs instead of rich form components matching main org form"
  - "Post-submit 'Add as new org' suggestion reappeared immediately via MutationObserver"
  - "TipTap initTipTapEditors() created duplicate editors when called multiple times"
root_cause: logic_error
resolution_type: code_fix
severity: medium
tags:
  - inline-org-panel
  - tiptap
  - form-parity
  - mutation-observer
  - geocoding
  - bluesky-search
---

# Inline org panel rich field parity and post-submit suggestion bug

## Problem

The inline org creation side panel in `contribute.html` used plain HTML inputs while the main org form had rich interactive components (geocoding location search, Bluesky handle search, TipTap rich text editor with @mentions). Additionally, after submitting a new org via the panel, the "Add 'X' as new org..." suggestion would immediately reappear because a MutationObserver kept re-adding it.

## Symptoms

- Side panel location field was a plain `<input>` instead of multi-city tag input with geocoding autocomplete
- Bluesky field had no live handle search from the Bluesky API
- Notes field was a plain `<textarea>` with no rich text formatting, toolbar, or @mention support
- Dropdowns lacked helper text descriptions and info tooltips present in the main form
- After submitting an org, clicking away and refocusing showed the "Add 'OrgName' as new org..." suggestion for an org that was just created

## What Didn't Work

For the post-submit bug, simply clearing `resultsDiv.innerHTML` after submission was insufficient. The MutationObserver watching the results div for `childList` changes fires in response to the clearing itself, and since the input still contained text, the observer's callback would re-add the suggestion link.

## Solution

### Rich component initialization in the panel IIFE

**Location search** — replaced plain input with tag-input-wrapper containing Photon/OSM geocoding:

```html
<!-- Before -->
<input type="text" id="panel-org-location" placeholder="City, State/Country">

<!-- After -->
<div class="tag-input-wrapper location-tags" id="panel-location-tags">
  <input type="text" class="tag-input location-search" id="panel-org-location"
         placeholder="Search cities..." autocomplete="off">
  <div class="org-search-results location-results"></div>
</div>
<input type="hidden" id="panel-org-location-hidden">
```

JS: Photon API fetch with 150ms debounce, tag creation/removal, arrow key navigation, hidden input with comma-separated values.

**Bluesky** — added `bsky-search` class and Bluesky API typeahead with 150ms debounce and result dropdown.

**TipTap** — added `.tiptap-notes` container with hidden inputs for notesHtml/notesMentions. Called `window.initTipTapEditors()` on panel open. Added skip-initialized guard in `src/tiptap-notes.js`:

```javascript
// Before — no guard, duplicate editors on repeated calls
containers.forEach(container => {
  const editor = new Editor({ ... });
});

// After — skip already-initialized containers
containers.forEach(container => {
  if (container._editor) return;
  const editor = new Editor({ ... });
  container._editor = editor;
});
```

### Post-submit suggestion persistence fix

```javascript
// After successful panel submission — mark input as linked:
textInput.value = name;
textInput.dataset.linkedOrgId = String(submissionId);
textInput.blur();  // prevent focus-triggered re-rendering

// In the MutationObserver — early return if already linked:
const observer = new MutationObserver(() => {
  if (input.dataset.linkedOrgId) return;  // don't re-suggest
  // ... existing suggestion logic
});

// Clear marker when user starts typing again:
input.addEventListener('input', () => {
  delete input.dataset.linkedOrgId;
});
```

## Why This Works

**Rich fields:** The panel's IIFE scope isolates its event listeners from the main form. `initTipTapEditors()` discovers the new `.tiptap-notes` container on panel open. The `container._editor` guard prevents duplicate ProseMirror instances across repeated open/close cycles.

**Post-submit bug:** The root cause was a feedback loop — MutationObserver fires on DOM changes, checks `input.value` (still has the org name), and re-adds the suggestion. `dataset.linkedOrgId` breaks this loop with an explicit "already resolved" signal. Blurring prevents focus-triggered search from re-firing. Clearing the flag on `input` event restores normal behavior if the user changes the org. (auto memory [claude]: debounce at 150ms for external APIs like Bluesky and Photon was already the established pattern)

## Prevention

- **Idempotent initialization guards:** Any `init*()` function that may be called multiple times should check for prior initialization (like the `container._editor` pattern). Critical for editors and event listeners that create stateful objects.
- **MutationObserver discipline:** When an observer watches a container that your own code also mutates, include a "settled state" check (data attribute flags) at the top of the callback rather than inferring state from DOM content.
- **Post-action blur:** After programmatically setting an input's value as a completed action result, call `input.blur()` to prevent focus-based handlers from treating it as new user input.
- **Component reuse:** When side panels need the same rich inputs as the main form, extract shared initialization into named functions to ensure parity by construction.

## Related Issues

- `docs/brainstorms/2026-04-03-inline-org-creation-requirements.md` — the requirements spec that preceded this implementation (R1-R7). Outstanding Questions section (R2, R3, R5) are now resolved by commits `b223137` and `deedfba`.
