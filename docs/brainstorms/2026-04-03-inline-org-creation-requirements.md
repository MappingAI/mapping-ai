---
date: 2026-04-03
topic: inline-org-creation
---

# Inline Org Creation Side Panel

## Problem Frame

Contributors filling out person or org forms frequently need to link a parent org or affiliated org that doesn't exist in the database yet. Currently, "Can't find it? Add this org" switches to the full org form tab, losing the user's in-progress draft context. This breaks the link-as-you-go workflow: submit an org, then go back and link it to the person you were adding.

## Requirements

- R1. **"Add [query] as new org..." dropdown option**: When the org search dropdown has no exact match, show "Add '[query]' as new org..." as the last option in the dropdown. Appears in all org search fields (primary org, parent org, affiliated orgs) on all form tabs.

- R2. **Slide-in side panel**: Clicking the "Add new org" option opens a right-side panel (matching the map page's existing contribute sidebar pattern — fixed position, 440px / 50vw, slide from right). The original form stays visible and scrollable on the left. The user's draft is preserved via the existing localStorage auto-save.

- R3. **Panel form structure**: The side panel contains an org form with:
  - **Essential fields visible by default**: Name (pre-filled from the search query), Category, Website, Location
  - **"Add more details" expandable section**: All remaining org fields (funding model, regulatory stance, evidence source, AGI timeline, AI risk, key concerns, influence type, social handles, notes with TipTap @mentions)
  - Subtle context note at top: "Adding [parent org / affiliated org] for [Entity Name]" in small mono text

- R4. **Submission via existing API**: Panel submit button POSTs to `/submit` with `type: "organization"`, same as the main form. Returns the submission ID on success.

- R5. **Post-submit flow**: On successful submission, show brief confirmation ("Org submitted!" with the org name) for 1.5 seconds, then auto-close the panel and auto-fill the triggering field:
  - **Primary org / parent org fields**: Set the text input value to the org name and the hidden ID input to the submission ID
  - **Affiliated orgs tag input**: Add a tag for the new org with its submission ID
  - The newly submitted org will also appear in future searches with a "pending" badge (already working)

- R6. **Nesting cap at 1 level**: The side panel's own org search fields (parent org within the side panel form) do NOT show the "Add new org" dropdown option. If no match, show a subtle message: "Submit this org first, then add the parent org separately." This prevents infinite panel inception.

- R7. **Panel interactions**:
  - Close button (X) in the panel header closes without submitting
  - Clicking outside the panel does NOT close it (prevent accidental loss of panel form data)
  - ESC key closes the panel
  - Panel has its own scroll if content overflows

## Success Criteria

- Contributor can add a person, create a missing affiliated org in the side panel, and have it auto-linked — all without leaving the person form or losing their draft
- The newly created org appears with "pending" badge in the org search dropdown when searched
- No form data is lost when opening or closing the side panel
- Works on both desktop and tablet (mobile can fall back to full-page form switch)

## Scope Boundaries

- No nested side panels (1 level max)
- Side panel is org-only (no person or resource creation from side panel)
- No draft saving for the side panel form itself (it's a quick-add flow; if closed, data is lost)
- Mobile (< 768px): fall back to the current full-page form switch behavior instead of side panel
- TipTap @mentions in the side panel notes field work if the bundle is already loaded (no separate load)

## Key Decisions

- **Side panel over modal**: Panel keeps the original form visible for context. Modals would obscure the form and feel like navigating away.
- **Essentials + expandable over full form**: Reduces cognitive load for the common case (just need name + category). Power users can expand for full detail.
- **Auto-close with brief confirmation**: Balances speed (auto-close) with reassurance (seeing the org name confirmed). 1.5s is enough to read but not enough to frustrate.
- **Pre-fill name from search query**: Reduces re-typing. The user already typed the org name in the search field.
- **Cap nesting at 1**: Simplest solution to the inception problem. Deep nesting is rare and can be handled via separate submissions.

## Outstanding Questions

### Deferred to Planning

- [Affects R2][Technical] Should the side panel be a second `<form>` element in the same page, or an iframe loading a stripped-down version of the contribute page? Iframe is simpler (reuses existing form) but harder to auto-fill the parent form on submit.
- [Affects R3][Technical] How to initialize TipTap in the side panel without conflicting with the main form's TipTap instances.
- [Affects R5][Technical] How to pass the submission ID back to the triggering field — the `/submit` API returns `submissionId` in the response, but the auto-fill needs to set a hidden input with either the submission ID or a special "pending:ID" format that the main form's submit handler can interpret.

## Next Steps

→ `/ce:plan` for structured implementation planning
