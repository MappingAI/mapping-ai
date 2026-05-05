const MAX_SLUG_LENGTH = 240

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-$/, '')
}

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
