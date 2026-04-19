import { describe, it, expect } from 'vitest'
import { getCorsHeaders } from '../../../api/cors'

function eventWithOrigin(origin: string | undefined) {
  return { headers: origin ? { origin } : {} }
}

describe('getCorsHeaders', () => {
  it('echoes back prod origin', () => {
    const headers = getCorsHeaders(eventWithOrigin('https://mapping-ai.org'))
    expect(headers['Access-Control-Allow-Origin']).toBe('https://mapping-ai.org')
    expect(headers['Vary']).toBe('Origin')
  })

  it('echoes back Cloudflare Pages prod alias', () => {
    const headers = getCorsHeaders(eventWithOrigin('https://mapping-ai.pages.dev'))
    expect(headers['Access-Control-Allow-Origin']).toBe('https://mapping-ai.pages.dev')
  })

  it('echoes back Cloudflare Pages preview URL', () => {
    const preview = 'https://abc123-def.mapping-ai.pages.dev'
    const headers = getCorsHeaders(eventWithOrigin(preview))
    expect(headers['Access-Control-Allow-Origin']).toBe(preview)
  })

  it('echoes back S3 bucket direct domain', () => {
    const s3 = 'https://mapping-ai-website-561047280976.s3.eu-west-2.amazonaws.com'
    const headers = getCorsHeaders(eventWithOrigin(s3))
    expect(headers['Access-Control-Allow-Origin']).toBe(s3)
  })

  it('echoes back CloudFront default domain', () => {
    const cf = 'https://d3fo5mm9fktie3.cloudfront.net'
    const headers = getCorsHeaders(eventWithOrigin(cf))
    expect(headers['Access-Control-Allow-Origin']).toBe(cf)
  })

  it('omits origin header for unknown host', () => {
    const headers = getCorsHeaders(eventWithOrigin('https://evil.example.com'))
    expect(headers['Access-Control-Allow-Origin']).toBeUndefined()
  })

  it('does not treat pages.dev suffix alone as valid', () => {
    // Attacker-controlled origin that ends in pages.dev but isn't ours.
    const headers = getCorsHeaders(eventWithOrigin('https://evil.pages.dev'))
    expect(headers['Access-Control-Allow-Origin']).toBeUndefined()
  })

  it('omits origin header when no Origin sent (e.g. curl)', () => {
    const headers = getCorsHeaders(eventWithOrigin(undefined))
    expect(headers['Access-Control-Allow-Origin']).toBeUndefined()
  })

  it('sets methods and headers from options', () => {
    const headers = getCorsHeaders(eventWithOrigin('https://mapping-ai.org'), {
      methods: 'GET, POST, OPTIONS',
      headers: 'Content-Type, X-Admin-Key',
    })
    expect(headers['Access-Control-Allow-Methods']).toBe('GET, POST, OPTIONS')
    expect(headers['Access-Control-Allow-Headers']).toBe('Content-Type, X-Admin-Key')
  })
})
