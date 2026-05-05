# Slug rename with old-link redirects

Status: deferred
Priority: low (admin renames are uncommon)

## Problem

When an admin renames an entity (e.g., "John Smith" to "Jane Doe"), the slug stays `john-smith`. The deep link `/map/person/john-smith` still works but is misleading. There is no way to update the slug, and no redirect from old slugs to new ones.

## Proposed approach

Add an `old_slugs TEXT[]` array column to the entity table. When an entity is renamed:

1. Move the current slug into `old_slugs`
2. Generate a new slug from the updated name
3. Update the entity row with the new slug

Resolution in engine.js checks the primary `slug` field first, then falls back to scanning `old_slugs` across all entities of that type.

### Schema change

```sql
ALTER TABLE entity ADD COLUMN IF NOT EXISTS old_slugs TEXT[] DEFAULT '{}';
```

### admin.ts changes (update_entity action)

When the `name` field is in the update payload:

```js
if (data.name && data.name !== currentEntity.name) {
  // Move current slug to old_slugs
  await sql.query(
    `UPDATE entity SET old_slugs = array_append(COALESCE(old_slugs, '{}'), slug) WHERE id = $1 AND slug IS NOT NULL`,
    [entity_id],
  )
  // Generate new slug
  const existingRows = await sql.query(`SELECT slug FROM entity WHERE entity_type = $1 AND slug IS NOT NULL`, [
    currentEntity.entity_type,
  ])
  const existingSlugs = new Set(existingRows.map((r) => r.slug))
  const newSlug = generateEntitySlug(data.name, currentEntity.entity_type, existingSlugs, entity_id)
  data.slug = newSlug
}
```

### engine.js changes (resolveDeepLink)

Add a fallback lookup after slugMap miss:

```js
// If slug not found in primary slugMap, check old_slugs
if (!entity) {
  entity = allEntities.find((e) => e.old_slugs && e.old_slugs.includes(slugValue))
}
```

### export-map.ts changes

Include `old_slugs` in the frontend entity shape (or keep it in detail-only data to avoid bloating the skeleton).

## Scope

~30 lines across admin.ts, engine.js, export-map.ts, and migrate.js. The `old_slugs` array grows unboundedly but entity renames are rare enough that this is not a practical concern.

## Why deferred

Admin renames are uncommon. The current behavior (old slug stays valid, just misleading) is acceptable. The old slug never breaks, which is arguably better than redirecting (shared links keep working exactly as they were). Implement when slug accuracy becomes important for SEO or external integrations.
