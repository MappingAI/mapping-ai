import { describe, it, expect } from 'vitest'

describe('Vitest smoke test', () => {
  it('runs tests in jsdom environment', () => {
    expect(document).toBeDefined()
    expect(window).toBeDefined()
  })

  it('supports TypeScript', () => {
    const value = 42
    expect(value).toBe(42)
  })
})
