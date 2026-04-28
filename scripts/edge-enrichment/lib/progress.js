/**
 * Progress tracking for edge enrichment scripts
 * Follows Anushree's pattern from enrich-claims.js
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '../../../data/edge-enrichment')

export function loadProgress(scriptName) {
  const progressPath = path.join(DATA_DIR, `${scriptName}-progress.json`)
  try {
    return JSON.parse(fs.readFileSync(progressPath, 'utf-8'))
  } catch {
    return { completed: [] }
  }
}

export function saveProgress(scriptName, progress) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
  const progressPath = path.join(DATA_DIR, `${scriptName}-progress.json`)
  fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2) + '\n')
}

/**
 * Create a stable key for an edge that survives edge.id changes
 * Uses (source_id, target_id, edge_type) as natural key
 */
export function edgeKey(edge) {
  return `${edge.source_id}_${edge.target_id}_${edge.edge_type}`
}
