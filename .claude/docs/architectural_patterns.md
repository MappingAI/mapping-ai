# Architectural Patterns

Patterns and conventions observed across the codebase.

## 1. Data Attribute Pattern

HTML elements use `data-*` attributes to link UI components with behavior.

**Examples:**
- `index.html:65-66` — Toggle buttons use `data-form="person"` / `data-form="organization"`
- `index.html:69,132` — Forms use `data-type="person"` / `data-type="organization"`
- `script.js:7,14` — JavaScript reads these via `dataset.form` and `dataset.type`

**Convention:** UI state is driven by matching `data-form` on toggles to `data-type` on forms.

## 2. Active Class Toggle Pattern

Visibility and state are controlled by adding/removing the `.active` class.

**Examples:**
- `styles.css:163-175` — Forms hidden by default, `.form.active` displays as grid
- `styles.css:156-160` — Toggle buttons styled differently when `.active`
- `script.js:9-16` — Click handler toggles active class on buttons and forms

**Convention:** Never use inline styles for show/hide. Always toggle `.active` class.

## 3. CSS Grid for Forms

Forms use CSS Grid with two columns, with `.full` class for full-width fields.

**Examples:**
- `styles.css:163-175` — Form grid definition: `grid-template-columns: 1fr 1fr`
- `styles.css:183-185` — `.field.full` spans both columns: `grid-column: 1 / -1`
- `index.html:121-128` — Notes and email fields use `class="field full"`

**Convention:** Form fields are 2-column by default. Add `full` class for wide fields (textarea, email).

## 4. Serverless API Pattern

Form submissions POST to `/api/submit`, which writes to GitHub.

**Flow:**
1. `script.js:47-51` — Client POSTs JSON to `/api/submit`
2. `api/submit.js:16` — Server extracts `{ type, timestamp, data }`
3. `api/submit.js:42-43` — Routes to `submissions/people/` or `submissions/organizations/`
4. `api/submit.js:56-72` — Creates file via GitHub Contents API

**Convention:** Submissions are individual JSON files, not appended to a single file. Filename format: `{sanitized-name}-{timestamp-id}.json`

## 5. Environment-Based Configuration

Secrets stored in Vercel environment variables, with sensible defaults.

**Examples:**
- `api/submit.js:23-25` — `GITHUB_TOKEN`, `GITHUB_REPO`, `GITHUB_BRANCH`
- `api/submit.js:24` — Default repo fallback: `'sophiajwang/mapping-ai'`

**Convention:** Never hardcode tokens. Use `process.env` with fallbacks for non-sensitive values only.

## 6. Responsive Layout Pattern

Fixed sidebar on desktop, stacked layout on mobile via media queries.

**Examples:**
- `styles.css:38-43` — Sidebar fixed at `top: 40px; left: 40px`
- `styles.css:52-57` — Main content offset: `margin-left: 300px`
- `styles.css:59-71` — `@media (max-width: 900px)` makes sidebar relative, removes margin

**Convention:** Mobile breakpoint at 900px for sidebar collapse, 640px for form single-column.

## 7. Submission Metadata Pattern

All submissions include a `_meta` object with tracking info.

**Example:**
- `api/submit.js:46-53` — Adds `_meta: { submittedAt, type, status: 'pending' }`

**Convention:** User-submitted data at top level, system metadata in `_meta`. Status always starts as `'pending'` for review workflow.

## 8. Form State Management

Button state managed during async submission to prevent double-submit.

**Example:**
- `script.js:28-31` — Disable button, change text to "Submitting..."
- `script.js:61-64` — `finally` block restores button state regardless of outcome

**Convention:** Always disable submit button during async operations. Use `finally` for cleanup.
