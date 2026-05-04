/**
 * Convert a string to a URL-safe kebab-case slug.
 * Handles unicode: NFD-normalizes, strips combining marks, lowercases,
 * replaces non-alphanumeric runs with single hyphens, trims hyphens.
 */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Generate a unique slug for an entity, appending -2, -3, etc. for collisions.
 * Falls back to "entity-{id}" when the name produces an empty slug.
 */
export function generateEntitySlug(
  name: string | null | undefined,
  entityType: string,
  existingSlugs: Set<string>,
  entityId?: number,
): string {
  const base = name ? slugify(name) : ''
  const fallback = entityId ? `entity-${entityId}` : `entity-${entityType}-${Date.now()}`
  const candidate = base || fallback

  if (!existingSlugs.has(candidate)) return candidate

  let suffix = 2
  while (existingSlugs.has(`${candidate}-${suffix}`)) suffix++
  return `${candidate}-${suffix}`
}
