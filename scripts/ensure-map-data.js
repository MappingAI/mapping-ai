// Ensures map-data.json exists before `npm run dev` starts.
// If missing and DATABASE_URL is set, generate it from the DB.
// If missing and no DB creds, print a hint and continue (Vite/dev-server still boot).
import fs from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import 'dotenv/config'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const target = resolve(root, 'map-data.json')

if (fs.existsSync(target)) process.exit(0)

if (!process.env.DATABASE_URL) {
  console.log('[ensure-map-data] map-data.json missing and DATABASE_URL not set.')
  console.log('[ensure-map-data] Pages will load but the map will be empty.')
  console.log('[ensure-map-data] To populate: either download from production')
  console.log('                   (curl -o map-data.json https://mapping-ai.org/map-data.json)')
  console.log('                   or add DATABASE_URL to .env and re-run.')
  process.exit(0)
}

console.log('[ensure-map-data] map-data.json missing — generating from database...')
const result = spawnSync('node', ['scripts/export-map-data.js'], {
  cwd: root,
  stdio: 'inherit',
})
process.exit(result.status ?? 1)
