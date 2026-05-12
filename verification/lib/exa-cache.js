/**
 * Shared Exa Search Cache
 *
 * Provides 24-hour TTL caching for Exa search results.
 * Used by both beliefs-1-opus and beliefs-3-agent pipelines.
 *
 * Cache location: verification/results/exa-cache/
 */

import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CACHE_DIR = path.join(__dirname, '../results/exa-cache')
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true })
}

/**
 * Generate a cache key from a query string
 */
export function cacheKey(query) {
  return crypto.createHash('sha256').update(query).digest('hex').slice(0, 16)
}

/**
 * Get cached results for a query (if fresh)
 * @param {string} query - The search query
 * @returns {object|null} - Cached results or null if not found/expired
 */
export function getCache(query) {
  const cachePath = path.join(CACHE_DIR, cacheKey(query) + '.json')
  try {
    const cached = JSON.parse(fs.readFileSync(cachePath, 'utf-8'))
    const age = Date.now() - new Date(cached._cached_at).getTime()
    if (age < CACHE_TTL_MS) {
      return cached.results
    }
    // Cache expired, delete it
    fs.unlinkSync(cachePath)
  } catch {
    // File doesn't exist or parse error
  }
  return null
}

/**
 * Store results in cache
 * @param {string} query - The search query
 * @param {object} results - The Exa search results to cache
 */
export function setCache(query, results) {
  const cachePath = path.join(CACHE_DIR, cacheKey(query) + '.json')
  fs.writeFileSync(
    cachePath,
    JSON.stringify({
      _cached_at: new Date().toISOString(),
      query,
      results,
    }),
  )
}

/**
 * Check if a query has fresh cached results
 * @param {string} query - The search query
 * @returns {boolean}
 */
export function hasCache(query) {
  return getCache(query) !== null
}

/**
 * Clear all cached results
 */
export function clearCache() {
  const files = fs.readdirSync(CACHE_DIR).filter((f) => f.endsWith('.json'))
  for (const file of files) {
    fs.unlinkSync(path.join(CACHE_DIR, file))
  }
  return files.length
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  const files = fs.readdirSync(CACHE_DIR).filter((f) => f.endsWith('.json'))
  let fresh = 0
  let expired = 0
  let totalSize = 0

  for (const file of files) {
    const filePath = path.join(CACHE_DIR, file)
    const stat = fs.statSync(filePath)
    totalSize += stat.size

    try {
      const cached = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      const age = Date.now() - new Date(cached._cached_at).getTime()
      if (age < CACHE_TTL_MS) {
        fresh++
      } else {
        expired++
      }
    } catch {
      expired++
    }
  }

  return {
    total: files.length,
    fresh,
    expired,
    totalSizeKB: Math.round(totalSize / 1024),
  }
}

export default {
  cacheKey,
  getCache,
  setCache,
  hasCache,
  clearCache,
  getCacheStats,
  CACHE_DIR,
  CACHE_TTL_MS,
}
