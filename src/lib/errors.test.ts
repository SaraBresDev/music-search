import { describe, it, expect } from 'vitest'
import { WikimediaHttpError } from '@/api/wikidata/wikimediaHttp'
import { getErrorMessage } from '@/lib/errors'

describe('getErrorMessage', () => {
  it('maps TimeoutError DOMException', () => {
    const err = new DOMException('Aborted', 'TimeoutError')
    const msg = getErrorMessage(err, 'fallback')
    expect(msg).not.toBe('fallback')
    expect(msg.toLowerCase()).toContain('too long')
  })

  it('maps WikimediaHttpError 5xx', () => {
    const err = new WikimediaHttpError('HTTP 503', 503, 'https://example.test')
    expect(getErrorMessage(err, 'fallback')).toContain('problem')
  })

  it('uses Error message when present', () => {
    expect(getErrorMessage(new Error('hello'), 'fallback')).toBe('hello')
  })

  it('uses fallback for unknown', () => {
    expect(getErrorMessage(null, 'fallback')).toBe('fallback')
  })
})
