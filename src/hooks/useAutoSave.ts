import { useEffect, useRef, useCallback } from 'react'
import type { UseFormReturn } from 'react-hook-form'

const STORAGE_KEY = 'mappingai_form_draft_v2'
const OLD_STORAGE_KEY = 'mappingai_form_draft'
const DEBOUNCE_MS = 500

interface DraftData {
  version: 2
  activeTab: string
  forms: Record<string, Record<string, unknown>>
}

/**
 * Auto-save form state to localStorage with 500ms debounce.
 *
 * Uses a new key (mappingai_form_draft_v2) to avoid collisions with the
 * old inline auto-save during coexistence. On first mount, migrates from
 * the old key if present.
 *
 * IMPORTANT: Set `enabled=false` during coexistence (Units 5-16).
 * Enable only at Unit 17 cutover when the inline script is removed.
 */
export function useAutoSave(
  forms: Record<string, UseFormReturn<Record<string, unknown>>>,
  activeTab: string,
  enabled = false,
) {
  const suppressRef = useRef(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // One-time migration from old format
  useEffect(() => {
    if (!enabled) return
    try {
      const oldDraft = localStorage.getItem(OLD_STORAGE_KEY)
      if (oldDraft && !localStorage.getItem(STORAGE_KEY)) {
        const parsed = JSON.parse(oldDraft)
        // Best-effort migration: wrap old format in v2 structure
        const migrated: DraftData = {
          version: 2,
          activeTab: parsed.activeForm || 'person',
          forms: {},
        }
        for (const formType of ['person', 'organization', 'resource']) {
          if (parsed[formType]) {
            migrated.forms[formType] = parsed[formType]
          }
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated))
        localStorage.removeItem(OLD_STORAGE_KEY)
      }
    } catch {
      // Migration is best-effort
    }
  }, [enabled])

  // Save function
  const save = useCallback(() => {
    if (!enabled || suppressRef.current) return

    try {
      const data: DraftData = {
        version: 2,
        activeTab,
        forms: {},
      }

      for (const [formType, form] of Object.entries(forms)) {
        data.forms[formType] = form.getValues()
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // localStorage full or unavailable — silent fail
    }
  }, [forms, activeTab, enabled])

  // Debounced save on form changes
  useEffect(() => {
    if (!enabled) return

    const subscriptions = Object.values(forms).map((form) =>
      form.watch(() => {
        clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(save, DEBOUNCE_MS)
      }),
    )

    return () => {
      clearTimeout(debounceRef.current)
      subscriptions.forEach((sub) => sub.unsubscribe())
    }
  }, [forms, save, enabled])

  // Restore function
  const restore = useCallback((): { activeTab: string; restoredCount: number } | null => {
    if (!enabled) return null

    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return null

      const data: DraftData = JSON.parse(raw)
      if (data.version !== 2) return null

      let restoredCount = 0
      for (const [formType, values] of Object.entries(data.forms)) {
        const form = forms[formType]
        if (form && values && Object.keys(values).length > 0) {
          form.reset(values)
          restoredCount += Object.keys(values).length
        }
      }

      return restoredCount > 0 ? { activeTab: data.activeTab, restoredCount } : null
    } catch {
      return null
    }
  }, [forms, enabled])

  // Clear function
  const clearDraft = useCallback((formType?: string) => {
    suppressRef.current = true
    try {
      if (formType) {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) {
          const data: DraftData = JSON.parse(raw)
          delete data.forms[formType]
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
        }
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch {
      // Silent fail
    }
    // Re-enable saves after a tick
    setTimeout(() => {
      suppressRef.current = false
    }, 100)
  }, [])

  return { save, restore, clearDraft }
}
